import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env';
import { UnauthorizedError } from '../lib/errors';

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { user?: AuthUser }
  }
}

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

/** Verifies a bearer token according to AUTH_MODE. Shared by HTTP middleware and the WebSocket upgrade. */
export async function verifyToken(token: string): Promise<AuthUser> {
  try {
    if (env.AUTH_MODE === 'entra') {
      jwks ??= createRemoteJWKSet(
        new URL(`https://login.microsoftonline.com/${env.ENTRA_TENANT_ID}/discovery/v2.0/keys`),
      );
      const { payload } = await jwtVerify(token, jwks, {
        audience: env.ENTRA_AUDIENCE,
        issuer: `https://login.microsoftonline.com/${env.ENTRA_TENANT_ID}/v2.0`,
      });
      return {
        sub: String(payload.oid ?? payload.sub),
        email: String(payload.preferred_username ?? payload.email ?? ''),
        name: String(payload.name ?? ''),
        role: Array.isArray(payload.roles) ? String(payload.roles[0]) : 'user',
      };
    }
    const p = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    return { sub: String(p.sub), email: p.email, name: p.name, role: p.role };
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedError();
    req.user = await verifyToken(header.slice(7));
    next();
  } catch (e) {
    next(e);
  }
};
