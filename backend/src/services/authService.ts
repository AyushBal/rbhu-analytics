import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../lib/errors';
import { prisma } from '../lib/prisma';

// Compared against when the user doesn't exist so response time doesn't reveal valid emails.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export const authService = {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new UnauthorizedError('Invalid email or password');
    const token = jwt.sign({ email: user.email, name: user.name, role: user.role }, env.JWT_SECRET, {
      subject: user.id,
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  },
};
