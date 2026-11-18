import { ConflictError, NotFoundError } from '../lib/errors';
import { logger } from '../lib/logger';
import { customerRepository } from '../repositories/customerRepository';
import type { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from '../schemas';

export const customerService = {
  async list(q: ListCustomersQuery) {
    const { items, total } = await customerRepository.list(q);
    return { items, page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) };
  },
  async get(id: string) {
    const c = await customerRepository.findById(id);
    if (!c) throw new NotFoundError('Customer', id);
    return c;
  },
  async create(input: CreateCustomerInput, actor: string) {
    if (await customerRepository.findByEmail(input.email)) throw new ConflictError(`A customer with email ${input.email} already exists`);
    const created = await customerRepository.create(input, actor);
    logger.info({ customerId: created.id, actor }, 'customer created');
    return created;
  },
  async update(id: string, input: UpdateCustomerInput, actor: string) {
    await this.get(id);
    if (input.email) {
      const dup = await customerRepository.findByEmail(input.email);
      if (dup && dup.id !== id) throw new ConflictError(`A customer with email ${input.email} already exists`);
    }
    const updated = await customerRepository.update(id, input, actor);
    logger.info({ customerId: id, actor }, 'customer updated');
    return updated;
  },
  async remove(id: string, actor: string) {
    await this.get(id);
    await customerRepository.softDelete(id, actor);
    logger.info({ customerId: id, actor }, 'customer soft-deleted');
  },
};
