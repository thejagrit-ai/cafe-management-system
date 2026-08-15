import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../src/config/prisma';
import { api, auth, createUsers, createCatalog, createSettings, tokenFor } from './helpers';

describe('customers', () => {
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

  it('lists customers with order counts and lifetime spend', async () => {
    const { product } = await createCatalog({ price: 10 });

    // Two orders for the seeded customer, one of them cancelled.
    const first = await api()
      .post('/api/orders')
      .set(auth(customerToken))
      .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 1 }] });
    const second = await api()
      .post('/api/orders')
      .set(auth(customerToken))
      .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 2 }] });

    await api()
      .put(`/api/orders/${second.body.data.id}/status`)
      .set(auth(staffToken))
      .send({ status: 'CANCELLED', cancellationReason: 'test' });

    const res = await api().get('/api/customers').set(auth(adminToken));

    expect(res.status).toBe(200);
    const casey = res.body.data.find(
      (c: { firstName: string }) => c.firstName === 'Casey'
    );
    expect(casey).toBeTruthy();
    expect(casey._count.orders).toBe(2);
    // Cancelled orders are not revenue: only the $10 order counts.
    expect(Number(casey.totalSpent)).toBeCloseTo(10, 2);
    expect(first.status).toBe(201);
  });

  it('never exposes password hashes in the customer list', async () => {
    const res = await api().get('/api/customers').set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('treats a filter value containing SQL as data, not as SQL', async () => {
    // A raw-SQL implementation that interpolated this value would error or
    // return the whole table; a parameterised one simply matches nothing.
    const res = await api()
      .get("/api/customers?search=' OR 1=1 --")
      .set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);

    // The table is still intact.
    expect(await prisma.customer.count()).toBe(1);
  });

  it('paginates the customer list', async () => {
    const res = await api().get('/api/customers?page=1&limit=5').set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
  });

  it('forbids a customer from listing all customers', async () => {
    const res = await api().get('/api/customers').set(auth(customerToken));
    expect(res.status).toBe(403);
  });

  describe('search', () => {
    it('matches on first name', async () => {
      const res = await api().get('/api/customers?search=Casey').set(auth(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].firstName).toBe('Casey');
    });

    it('matches on email', async () => {
      const res = await api()
        .get('/api/customers?search=customer@test.local')
        .set(auth(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('is case-insensitive', async () => {
      const res = await api().get('/api/customers?search=casey').set(auth(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('returns nothing for a term that matches no customer', async () => {
      const res = await api()
        .get('/api/customers?search=zzz-no-such-person')
        .set(auth(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });
});
