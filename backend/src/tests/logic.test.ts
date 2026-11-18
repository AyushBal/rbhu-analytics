import { describe, expect, it, vi } from 'vitest';

// Pure-logic tests: keep the DB client out of the picture
vi.mock('../lib/prisma', () => ({ prisma: {} }));

process.env.DATABASE_URL = 'postgresql://x:x@localhost:5432/x';
process.env.JWT_SECRET = 'test-secret-test-secret-123456';

describe('schemas', async () => {
  const s = await import('../schemas');

  it('normalises and validates customers', () => {
    const v = s.createCustomerBody.parse({ name: ' Asha ', email: 'ASHA@Example.com', company: 'Orbit' });
    expect(v).toMatchObject({ name: 'Asha', email: 'asha@example.com', status: 'Active' });
    expect(() => s.createCustomerBody.parse({ name: 'x', email: 'nope', company: 'c' })).toThrow();
  });

  it('rejects empty customer updates', () => {
    expect(() => s.updateCustomerBody.parse({})).toThrow();
  });

  it('rejects unknown shipment statuses', () => {
    expect(() => s.updateShipmentStatusBody.parse({ status: 'Teleported' })).toThrow();
  });

  it('caps chat message length', () => {
    expect(() => s.chatBody.parse({ message: 'a'.repeat(2001) })).toThrow();
  });
});

describe('shipment lifecycle', async () => {
  const { TRANSITIONS, generateTrackingNumber } = await import('../services/shipmentService');

  it('treats Delivered and Cancelled as terminal', () => {
    expect(TRANSITIONS.Delivered).toEqual([]);
    expect(TRANSITIONS.Cancelled).toEqual([]);
  });
  it('does not allow skipping back to Pending', () => {
    expect(TRANSITIONS.InTransit).not.toContain('Pending');
  });
  it('generates well-formed tracking numbers', () => {
    expect(generateTrackingNumber()).toMatch(/^RBHU-[A-F0-9]{10}$/);
  });
});
