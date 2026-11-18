import { z } from 'zod';

export const customerStatus = z.enum(['Active', 'Inactive']);
export const shipmentStatus = z.enum(['Pending', 'InTransit', 'OutForDelivery', 'Delivered', 'Cancelled']);

const id = z.string().uuid('Must be a valid UUID');
export const idParams = z.object({ id });

const trimmed = (max: number) => z.string().trim().min(1, 'Required').max(max);

export const createCustomerBody = z.object({
  name: trimmed(120),
  email: z.string().trim().toLowerCase().email().max(254),
  company: trimmed(160),
  status: customerStatus.default('Active'),
});
export const updateCustomerBody = createCustomerBody.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'At least one field must be provided',
});

export const listCustomersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  status: customerStatus.optional(),
});

export const createShipmentBody = z.object({
  trackingNumber: z.string().trim().regex(/^[A-Za-z0-9-]{6,32}$/, '6-32 chars: letters, digits, hyphen').optional(),
  customerId: id,
  origin: trimmed(160),
  destination: trimmed(160),
  status: shipmentStatus.default('Pending'),
});
export const updateShipmentStatusBody = z.object({ status: shipmentStatus });

export const listShipmentsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: shipmentStatus.optional(),
  customerId: id.optional(),
  search: z.string().trim().max(100).optional(),
});

export const loginBody = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const chatBody = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().trim().min(1, 'Message is empty').max(2000, 'Message is too long (max 2000 characters)'),
});
export const chatParams = z.object({ sessionId: z.string().uuid() });

export type CreateCustomerInput = z.infer<typeof createCustomerBody>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerBody>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuery>;
export type CreateShipmentInput = z.infer<typeof createShipmentBody>;
export type ListShipmentsQuery = z.infer<typeof listShipmentsQuery>;
