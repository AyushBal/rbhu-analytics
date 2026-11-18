import type { Server as HttpServer, IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { WebSocket, WebSocketServer } from 'ws';
import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { verifyToken } from '../middleware/auth';

export interface ShipmentStatusChanged {
  event: 'shipment_status_changed';
  shipmentId: string;
  status: string;
  trackingNumber?: string;
  previousStatus?: string;
  timestamp?: string;
}

const CHANNEL = 'rbhu:events';
const HEARTBEAT_MS = 30_000;

/**
 * Fan-out hub for real-time notifications.
 *
 *  - Single instance: publish() broadcasts straight to local sockets.
 *  - Scaled out (REDIS_URL set): publish() goes through Redis pub/sub and every instance
 *    broadcasts to *its own* sockets, so clients get the event regardless of which node
 *    handled the HTTP request or which node they are connected to.
 */
class NotificationHub {
  private wss?: WebSocketServer;
  private pub?: Redis;
  private sub?: Redis;
  private heartbeat?: NodeJS.Timeout;

  attach(server: HttpServer) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', async (req: IncomingMessage, socket: Duplex, head) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname !== '/ws') return socket.destroy();
      try {
        const user = await verifyToken(url.searchParams.get('token') ?? '');
        this.wss!.handleUpgrade(req, socket, head, (ws) => {
          (ws as WebSocket & { alive?: boolean }).alive = true;
          ws.on('pong', () => ((ws as WebSocket & { alive?: boolean }).alive = true));
          ws.on('error', (err) => logger.warn({ err }, 'ws client error'));
          ws.send(JSON.stringify({ event: 'connected', user: user.email }));
          logger.info({ user: user.email, clients: this.wss!.clients.size }, 'ws client connected');
        });
      } catch {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
      }
    });

    // Drop dead connections (e.g. client lost network without a close frame)
    this.heartbeat = setInterval(() => {
      this.wss?.clients.forEach((ws) => {
        const c = ws as WebSocket & { alive?: boolean };
        if (c.alive === false) return ws.terminate();
        c.alive = false;
        ws.ping();
      });
    }, HEARTBEAT_MS);

    if (env.REDIS_URL) {
      this.pub = new Redis(env.REDIS_URL);
      this.sub = new Redis(env.REDIS_URL);
      this.sub.subscribe(CHANNEL).catch((err) => logger.error({ err }, 'redis subscribe failed'));
      this.sub.on('message', (_c, msg) => this.broadcastLocal(msg));
      logger.info('WebSocket fan-out via Redis pub/sub');
    } else {
      logger.info('WebSocket fan-out in-process (set REDIS_URL to scale horizontally)');
    }
  }

  async publish(evt: ShipmentStatusChanged) {
    const msg = JSON.stringify(evt);
    if (this.pub) await this.pub.publish(CHANNEL, msg);
    else this.broadcastLocal(msg);
  }

  private broadcastLocal(msg: string) {
    this.wss?.clients.forEach((ws) => ws.readyState === WebSocket.OPEN && ws.send(msg));
  }

  get clientCount() { return this.wss?.clients.size ?? 0; }

  async close() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.wss?.clients.forEach((c) => c.close(1001, 'server shutting down'));
    this.wss?.close();
    await Promise.allSettled([this.pub?.quit(), this.sub?.quit()]);
  }
}

export const notificationHub = new NotificationHub();
