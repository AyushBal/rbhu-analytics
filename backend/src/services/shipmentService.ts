import { randomBytes } from 'crypto';
import { ShipmentStatus } from '@prisma/client';
import { BadRequestError, ConflictError, NotFoundError } from '../lib/errors';
import { logger } from '../lib/logger';
import { customerRepository } from '../repositories/customerRepository';
import { shipmentRepository } from '../repositories/shipmentRepository';
import { notificationHub } from '../ws/notificationHub';
import type { CreateShipmentInput, ListShipmentsQuery } from '../schemas';

/** Allowed lifecycle moves. Delivered and Cancelled are terminal. */
export const TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  Pending: ['InTransit', 'Cancelled'],
  InTransit: ['OutForDelivery', 'Delivered', 'Cancelled'],
  OutForDelivery: ['Delivered', 'Cancelled'],
  Delivered: [],
  Cancelled: [],
};

export const generateTrackingNumber = () => `RBHU-${randomBytes(5).toString('hex').toUpperCase()}`;

export const shipmentService = {
  async list(q: ListShipmentsQuery) {
    const { items, total } = await shipmentRepository.list(q);
    return { items, page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
  },
  async get(id: string) {
    const s = await shipmentRepository.findById(id);
    if (!s) throw new NotFoundError('Shipment', id);
    return s;
  },
  async create(input: CreateShipmentInput, actor: string) {
    const customer = await customerRepository.findById(input.customerId);
    if (!customer) throw new BadRequestError('customerId does not reference an existing customer');
    if (customer.status === 'Inactive') throw new BadRequestError('Cannot create shipments for an inactive customer');

    const trackingNumber = input.trackingNumber ?? generateTrackingNumber();
    if (await shipmentRepository.findByTracking(trackingNumber)) throw new ConflictError(`Tracking number ${trackingNumber} already exists`);

    const created = await shipmentRepository.create({ ...input, trackingNumber }, actor);
    logger.info({ shipmentId: created.id, trackingNumber, actor }, 'shipment created');
    return created;
  },
  async updateStatus(id: string, to: ShipmentStatus, actor: string) {
    const current = await this.get(id);
    if (current.status === to) throw new BadRequestError(`Shipment is already ${to}`);
    if (!TRANSITIONS[current.status].includes(to)) {
      throw new BadRequestError(`Invalid status change ${current.status} → ${to}`, { allowed: TRANSITIONS[current.status] });
    }
    const updated = await shipmentRepository.updateStatus(id, current.status, to, actor);
    logger.info({ shipmentId: id, from: current.status, to, actor }, 'shipment status changed');

    // Fire-and-forget: a notification failure must never fail the business operation.
    notificationHub
      .publish({ event: 'shipment_status_changed', shipmentId: id, trackingNumber: updated.trackingNumber, status: to, previousStatus: current.status, timestamp: new Date().toISOString() })
      .catch((err) => logger.error({ err }, 'failed to publish notification'));
    return updated;
  },
};
