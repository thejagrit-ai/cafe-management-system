import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../src/config/prisma';
import { POINT_REDEMPTION_VALUE } from '../src/services/loyalty';
import { api, auth, createUsers, createCatalog, createSettings, tokenFor } from './helpers';

/**
 * The loyalty programme awarded points from the start but had no way to spend
 * them: the order discount was pinned at zero and no route ever called the
 * redemption code. These cover the path end to end.
 */
describe('loyalty redemption', () => {
  let customerToken: string;
  let staffToken: string;
  let customerId: string;

  /** Gives the signed-in customer a starting balance. */
  async function grantPoints(points: number) {
    await prisma.customer.update({
      where: { id: customerId },
      data: { loyaltyPoints: points },
    });
  }

  async function balance(): Promise<number> {
    const row = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    return row.loyaltyPoints;
  }

  beforeEach(async () => {
    const users = await createUsers();
    customerId = users.customer.id;
    await createSettings({ taxRate: 0, deliveryFee: 0 });
    customerToken = await tokenFor('customer');
    staffToken = await tokenFor('staff');
  });

  it('discounts the order by the value of the points spent', async () => {
    // 100 points at 10 each covers 1 000 of a 2 000 bill.
    const { product } = await createCatalog({ price: 1000 });
    await grantPoints(100);

    const res = await api()
      .post('/api/orders')
      .set(auth(customerToken))
      .send({
        type: 'PICKUP',
        items: [{ productId: product.id, quantity: 2 }],
        redeemPoints: 100,
        paymentMethod: 'CARD',
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.subtotal)).toBeCloseTo(2000, 2);
    expect(Number(res.body.data.discountAmount)).toBeCloseTo(100 * POINT_REDEMPTION_VALUE, 2);
    expect(Number(res.body.data.total)).toBeCloseTo(1000, 2);
  });

  it('debits the balance and records a REDEEMED transaction', async () => {
    const { product } = await createCatalog({ price: 1000 });
    await grantPoints(250);

    const res = await api()
      .post('/api/orders')
      .set(auth(customerToken))
      .send({
        type: 'PICKUP',
        items: [{ productId: product.id, quantity: 1 }],
        redeemPoints: 50,
        paymentMethod: 'CARD',
      });

    expect(res.status).toBe(201);
    expect(await balance()).toBe(200);

    const ledger = await prisma.loyaltyTransaction.findMany({ where: { customerId } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0].type).toBe('REDEEMED');
    expect(ledger[0].points).toBe(-50);
    expect(ledger[0].orderId).toBe(res.body.data.id);
  });

  it('stores the points used against the order', async () => {
    const { product } = await createCatalog({ price: 1000 });
    await grantPoints(100);

    const res = await api()
      .post('/api/orders')
      .set(auth(customerToken))
      .send({
        type: 'PICKUP',
        items: [{ productId: product.id, quantity: 1 }],
        redeemPoints: 40,
        paymentMethod: 'CARD',
      });

    const order = await prisma.order.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect(order.loyaltyPointsUsed).toBe(40);
    expect(Number(order.loyaltyDiscount)).toBeCloseTo(40 * POINT_REDEMPTION_VALUE, 2);
  });

  it('rejects spending more points than the customer holds', async () => {
    const { product } = await createCatalog({ price: 1000 });
    await grantPoints(10);

    const res = await api()
      .post('/api/orders')
      .set(auth(customerToken))
      .send({
        type: 'PICKUP',
        items: [{ productId: product.id, quantity: 1 }],
        redeemPoints: 500,
        paymentMethod: 'CARD',
      });

    expect(res.status).toBe(400);
    // Nothing may be debited by a rejected order.
    expect(await balance()).toBe(10);
    expect(await prisma.order.count()).toBe(0);
  });

  it('spends only what the bill is worth when asked to use everything', async () => {
    // A 100 bill can absorb 10 points; the other 90 must stay in the balance
    // rather than being burnt for a discount larger than the order.
    const { product } = await createCatalog({ price: 100 });
    await grantPoints(100);

    const res = await api()
      .post('/api/orders')
      .set(auth(customerToken))
      .send({
        type: 'PICKUP',
        items: [{ productId: product.id, quantity: 1 }],
        redeemPoints: 100,
        paymentMethod: 'CARD',
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.discountAmount)).toBeCloseTo(100, 2);
    expect(Number(res.body.data.total)).toBeCloseTo(0, 2);
    expect(await balance()).toBe(90);
  });

  it('earns points on the amount actually paid, not on the discounted part', async () => {
    // 2 000 subtotal, 1 000 of it paid with points. At 1 point per 100 spent
    // the customer earns on the 1 000 they funded themselves, not the full bill.
    const { product } = await createCatalog({ price: 1000 });
    await grantPoints(100);

    const created = await api()
      .post('/api/orders')
      .set(auth(customerToken))
      .send({
        type: 'PICKUP',
        items: [{ productId: product.id, quantity: 2 }],
        redeemPoints: 100,
        paymentMethod: 'CARD',
      });
    expect(created.status).toBe(201);

    const orderId = created.body.data.id;
    for (const status of ['PREPARING', 'READY', 'COMPLETED']) {
      const step = await api()
        .put(`/api/orders/${orderId}/status`)
        .set(auth(staffToken))
        .send({ status });
      expect(step.status).toBe(200);
    }

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.loyaltyPointsEarned).toBe(10);
    // 100 spent, 10 earned back.
    expect(await balance()).toBe(10);
  });

  it('leaves the balance alone when no points are offered', async () => {
    const { product } = await createCatalog({ price: 1000 });
    await grantPoints(75);

    const res = await api()
      .post('/api/orders')
      .set(auth(customerToken))
      .send({
        type: 'PICKUP',
        items: [{ productId: product.id, quantity: 1 }],
        paymentMethod: 'CARD',
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.discountAmount)).toBeCloseTo(0, 2);
    expect(await balance()).toBe(75);
  });
});
