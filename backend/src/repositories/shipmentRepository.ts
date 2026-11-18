import { Prisma, ShipmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { ListShipmentsQuery } from '../schemas';

const live = { deletedAt: null } as const;
const withCustomer = { customer: { select: { id: true, name: true, company: true } } } as const;

export const shipmentRepository = {
  async list(q: ListShipmentsQuery) {
    const where: Prisma.ShipmentWhereInput = {
      ...live,
      ...(q.status && { status: q.status }),
      ...(q.customerId && { customerId: q.customerId }),
      ...(q.search && {
        OR: [
          { trackingNumber: { contains: q.search, mode: 'insensitive' } },
          { origin: { contains: q.search, mode: 'insensitive' } },
          { destination: { contains: q.search, mode: 'insensitive' } },
        ],
      }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.shipment.findMany({ where, include: withCustomer, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      prisma.shipment.count({ where }),
    ]);
    return { items, total };
  },
  findById: (id: string) =>
    prisma.shipment.findFirst({ where: { id, ...live }, include: { ...withCustomer, events: { orderBy: { createdAt: 'asc' } } } }),
  findByTracking: (trackingNumber: string) =>
    prisma.shipment.findFirst({ where: { trackingNumber: { equals: trackingNumber, mode: 'insensitive' }, ...live }, include: withCustomer }),
  /** Creates the shipment and its first history event atomically. */
  create: (data: { trackingNumber: string; customerId: string; origin: string; destination: string; status: ShipmentStatus }, actor: string) =>
    prisma.shipment.create({
      data: { ...data, createdBy: actor, updatedBy: actor, events: { create: { toStatus: data.status, changedBy: actor } } },
      include: withCustomer,
    }),
  /** Updates status and appends history atomically. */
  updateStatus: (id: string, from: ShipmentStatus, to: ShipmentStatus, actor: string) =>
    prisma.shipment.update({
      where: { id },
      data: { status: to, updatedBy: actor, events: { create: { fromStatus: from, toStatus: to, changedBy: actor } } },
      include: withCustomer,
    }),
  count: () => prisma.shipment.count({ where: live }),
  async statusDistribution() {
    const rows = await prisma.shipment.groupBy({ by: ['status'], where: live, _count: { _all: true } });
    return rows.map((r) => ({ status: r.status, count: r._count._all }));
  },
};
