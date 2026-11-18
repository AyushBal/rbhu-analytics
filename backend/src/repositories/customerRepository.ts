import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from '../schemas';

const live = { deletedAt: null } as const;

export const customerRepository = {
  async list(q: ListCustomersQuery) {
    const where: Prisma.CustomerWhereInput = {
      ...live,
      ...(q.status && { status: q.status }),
      ...(q.search && {
        OR: [
          { name: { contains: q.search, mode: 'insensitive' } },
          { email: { contains: q.search, mode: 'insensitive' } },
          { company: { contains: q.search, mode: 'insensitive' } },
        ],
      }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      prisma.customer.count({ where }),
    ]);
    return { items, total };
  },
  findById: (id: string) => prisma.customer.findFirst({ where: { id, ...live } }),
  findByEmail: (email: string) =>
    prisma.customer.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, ...live } }),
  create: (data: CreateCustomerInput, actor: string) =>
    prisma.customer.create({ data: { ...data, createdBy: actor, updatedBy: actor } }),
  update: (id: string, data: UpdateCustomerInput, actor: string) =>
    prisma.customer.update({ where: { id }, data: { ...data, updatedBy: actor } }),
  softDelete: (id: string, actor: string) =>
    prisma.customer.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor, updatedBy: actor, status: 'Inactive' } }),
  count: () => prisma.customer.count({ where: live }),
};
