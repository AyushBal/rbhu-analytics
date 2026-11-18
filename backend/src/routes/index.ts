import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { asyncHandler as h } from '../lib/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as s from '../schemas';
import {
  analyticsController, announcementController, authController, chatController,
  customerController, dashboardController, shipmentController,
} from '../controllers';
import { notificationHub } from '../ws/notificationHub';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' } } });
const chatLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Slow down: too many chat requests.' } } });

export const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', wsClients: notificationHub.clientCount, uptime: process.uptime() }));

// Public
router.post('/auth/login', loginLimiter, validate({ body: s.loginBody }), h(authController.login));

// Everything below needs a valid token
router.use(authenticate);
router.get('/auth/me', h(authController.me));

router.get('/dashboard/stats', h(dashboardController.stats));

router.get('/customers', validate({ query: s.listCustomersQuery }), h(customerController.list));
router.post('/customers', validate({ body: s.createCustomerBody }), h(customerController.create));
router.get('/customers/:id', validate({ params: s.idParams }), h(customerController.get));
router.put('/customers/:id', validate({ params: s.idParams, body: s.updateCustomerBody }), h(customerController.update));
router.delete('/customers/:id', validate({ params: s.idParams }), h(customerController.remove));

router.get('/shipments', validate({ query: s.listShipmentsQuery }), h(shipmentController.list));
router.post('/shipments', validate({ body: s.createShipmentBody }), h(shipmentController.create));
router.get('/shipments/:id', validate({ params: s.idParams }), h(shipmentController.get));
router.patch('/shipments/:id/status', validate({ params: s.idParams, body: s.updateShipmentStatusBody }), h(shipmentController.updateStatus));

router.post('/chat', chatLimiter, validate({ body: s.chatBody }), h(chatController.send));
router.get('/chat/:sessionId', validate({ params: s.chatParams }), h(chatController.history));
router.delete('/chat/:sessionId', validate({ params: s.chatParams }), h(chatController.clear));

router.post('/analytics/analyze', upload.single('file'), h(analyticsController.analyze));

router.get('/announcements', h(announcementController.list));
