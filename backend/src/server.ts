import http from 'http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { createApp } from './app';
import { notificationHub } from './ws/notificationHub';

const server = http.createServer(createApp());
notificationHub.attach(server);

server.listen(env.PORT, () => {
  logger.info(`API listening on :${env.PORT}  (docs: /docs, ws: /ws, env: ${env.NODE_ENV}, auth: ${env.AUTH_MODE})`);
});

// Graceful shutdown: stop accepting, close sockets, drain DB pool (important on App Service restarts / slot swaps)
async function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  server.close();
  await notificationHub.close();
  await prisma.$disconnect();
  process.exit(0);
}
['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => void shutdown(sig)));
process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandledRejection'));
