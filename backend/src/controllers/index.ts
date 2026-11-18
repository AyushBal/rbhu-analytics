import type { Request, Response } from 'express';
import { authService } from '../services/authService';
import { customerService } from '../services/customerService';
import { shipmentService } from '../services/shipmentService';
import { dashboardService } from '../services/dashboardService';
import { aiService } from '../services/aiService';
import { analyzeCsv } from '../services/analyticsClient';
import { announcementService } from '../services/announcementService';
import { BadRequestError } from '../lib/errors';

const actor = (req: Request) => req.user?.email ?? 'system';
const idOf = (req: Request) => req.params.id as string;

export const authController = {
  login: async (req: Request, res: Response) => res.json(await authService.login(req.body.email, req.body.password)),
  me: async (req: Request, res: Response) => res.json({ user: req.user }),
};

export const customerController = {
  list: async (req: Request, res: Response) => res.json(await customerService.list(req.query as never)),
  get: async (req: Request, res: Response) => res.json(await customerService.get(idOf(req))),
  create: async (req: Request, res: Response) => res.status(201).json(await customerService.create(req.body, actor(req))),
  update: async (req: Request, res: Response) => res.json(await customerService.update(idOf(req), req.body, actor(req))),
  remove: async (req: Request, res: Response) => {
    await customerService.remove(idOf(req), actor(req));
    res.status(204).send();
  },
};

export const shipmentController = {
  list: async (req: Request, res: Response) => res.json(await shipmentService.list(req.query as never)),
  get: async (req: Request, res: Response) => res.json(await shipmentService.get(idOf(req))),
  create: async (req: Request, res: Response) => res.status(201).json(await shipmentService.create(req.body, actor(req))),
  updateStatus: async (req: Request, res: Response) => res.json(await shipmentService.updateStatus(idOf(req), req.body.status, actor(req))),
};

export const dashboardController = {
  stats: async (_req: Request, res: Response) => res.json(await dashboardService.stats()),
};

export const chatController = {
  send: async (req: Request, res: Response) => res.json(await aiService.chat(req.body.sessionId, req.body.message)),
  history: async (req: Request, res: Response) => res.json({ messages: await aiService.history(req.params.sessionId as string) }),
  clear: async (req: Request, res: Response) => {
    await aiService.clear(req.params.sessionId as string);
    res.status(204).send();
  },
};

export const analyticsController = {
  analyze: async (req: Request, res: Response) => {
    if (!req.file) throw new BadRequestError("Attach a CSV file in the 'file' form field");
    res.json(await analyzeCsv(req.file, req.query.png === 'true'));
  },
};

export const announcementController = {
  list: async (_req: Request, res: Response) => res.json({ items: await announcementService.list() }),
};
