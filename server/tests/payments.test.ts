import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../src/config/prisma';
import { api, auth, createUsers, createCatalog, createSettings, tokenFor } from './helpers';

describe('payments', () => {
  let adminToken: string;
  let staffToken: string;
  let customerToken: string;

  beforeEach(async () => {
    await createUsers();
    await createSettings({ taxRate: 0, deliveryFee: 0 });
    adminToken = await tokenFor('admin');
    staffToken = await tokenFor('staff');
    customerToken = await tokenFor('customer');
  });

  async function makeOrder(price = 10) {
    const { product } = await createCatalog({ price });
    const res = await api()
      .post('/api/orders')
      .set(auth(staffToken))
      .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 1 }] });
    expect(res.status).toBe(201);
    return res.body.data;
  }

  describe('recording', () => {
    it('records a card payment against an order', async () => {
      const order = await makeOrder(10);

      const res = await api()
        .post('/api/payments')
        .set(auth(staffToken))
        .send({
          orderId: order.id,
          amount: 10,
          method: 'CARD',
          transactionId: 'txn_abc123',
        });

      expect([200, 201]).toContain(res.status);

      const saved = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
      expect(saved.method).toBe('CARD');
      expect(Number(saved.amount)).toBeCloseTo(10, 2);
      expect(saved.transactionId).toBe('txn_abc123');
    });

    it('accepts each supported payment method', async () => {
      for (const method of ['CASH', 'CARD', 'UPI', 'ONLINE'] as const) {
        const order = await makeOrder(10);
        const res = await api()
          .post('/api/payments')
          .set(auth(staffToken))
          .send({ orderId: order.id, amount: 10, method });

        expect([200, 201]).toContain(res.status);
      }
    });

    it('rejects an unsupported payment method with 400', async () => {
      const order = await makeOrder();

      const res = await api()
        .post('/api/payments')
        .set(auth(staffToken))
        .send({ orderId: order.id, amount: 10, method: 'CRYPTO' });

      expect(res.status).toBe(400);
    });

    it('rejects a non-positive amount with 400', async () => {
      const order = await makeOrder();

      const res = await api()
        .post('/api/payments')
        .set(auth(staffToken))
        .send({ orderId: order.id, amount: 0, method: 'CASH' });

      expect(res.status).toBe(400);
    });

    it('rejects a payment against an unknown order with 404', async () => {
      const res = await api()
        .post('/api/payments')
        .set(auth(staffToken))
        .send({ orderId: 'clnonexistent00000000000', amount: 10, method: 'CASH' });

      expect(res.status).toBe(404);
    });

    it('does not mark an online payment paid without confirmation', async () => {
      const order = await makeOrder(10);

      const res = await api()
        .post('/api/payments')
        .set(auth(staffToken))
        .send({ orderId: order.id, amount: 10, method: 'ONLINE' });

      expect([200, 201]).toContain(res.status);

      const saved = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
      // No payment provider has confirmed anything, so the record must not
      // claim the money arrived.
      expect(saved.status).not.toBe('PAID');
    });
  });

  describe('status', () => {
    it('moves a payment to PAID and stamps paidAt', async () => {
      const order = await makeOrder(10);
      const created = await api()
        .post('/api/payments')
        .set(auth(staffToken))
        .send({ orderId: order.id, amount: 10, method: 'CARD' });

      const paymentId = created.body.data.id;

      const res = await api()
        .put(`/api/payments/${paymentId}/status`)
        .set(auth(adminToken))
        .send({ status: 'PAID' });

      expect(res.status).toBe(200);

      const saved = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
      expect(saved.status).toBe('PAID');
      expect(saved.paidAt).toBeTruthy();
    });

    it('supports refunding a payment', async () => {
      const order = await makeOrder(10);
      const created = await api()
        .post('/api/payments')
        .set(auth(staffToken))
        .send({ orderId: order.id, amount: 10, method: 'CARD' });

      await api()
        .put(`/api/payments/${created.body.data.id}/status`)
        .set(auth(adminToken))
        .send({ status: 'PAID' });

      const res = await api()
        .put(`/api/payments/${created.body.data.id}/status`)
        .set(auth(adminToken))
        .send({ status: 'REFUNDED' });

      expect(res.status).toBe(200);
      const saved = await prisma.payment.findUniqueOrThrow({
        where: { id: created.body.data.id },
      });
      expect(saved.status).toBe('REFUNDED');
    });

    it('rejects an unknown payment status with 400', async () => {
      const order = await makeOrder(10);
      const created = await api()
        .post('/api/payments')
        .set(auth(staffToken))
        .send({ orderId: order.id, amount: 10, method: 'CARD' });

      const res = await api()
        .put(`/api/payments/${created.body.data.id}/status`)
        .set(auth(adminToken))
        .send({ status: 'SORT_OF_PAID' });

      expect(res.status).toBe(400);
    });
  });

  describe('authorization', () => {
    it('forbids a customer from recording payments', async () => {
      const order = await makeOrder();

      const res = await api()
        .post('/api/payments')
        .set(auth(customerToken))
        .send({ orderId: order.id, amount: 10, method: 'CASH' });

      expect(res.status).toBe(403);
    });

    it('forbids a customer from listing all payments', async () => {
      const res = await api().get('/api/payments').set(auth(customerToken));
      expect(res.status).toBe(403);
    });
  });
});
