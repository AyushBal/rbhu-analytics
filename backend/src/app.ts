import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { randomUUID } from 'crypto';
import { corsOrigins } from './config/env';
import { logger } from './lib/logger';
import { router } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { openApiSpec } from './docs/openapi';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind Azure App Service / Front Door

  // Swagger UI needs inline styles/scripts, so it gets a relaxed CSP; the API itself keeps Helmet defaults.
  app.use('/docs', helmet({ contentSecurityPolicy: false }), swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.get('/openapi.json', (_req, res) => res.json(openApiSpec));

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => (!origin || corsOrigins.includes(origin) ? cb(null, true) : cb(new Error('Origin not allowed by CORS'))),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );
  app.use(pinoHttp({ logger, genReqId: (req) => (req.headers['x-request-id'] as string) ?? randomUUID(), autoLogging: { ignore: (req) => req.url === '/api/health' } }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
