import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'rbhu-backend' },
  // Never write credentials or tokens to logs
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.passwordHash', '*.token'],
});
