import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../src/config/prisma';
import {
  api,
  auth,
  createUsers,
  createCatalog,
  createSettings,
  tokenFor,
  stockOf,
} from './helpers';

describe('orders', () => {
  let staffToken: string;
  let customerToken: string;

  beforeEach(async () => {
    await createUsers();
    await createSettings({ taxRate: 10, deliveryFee: 5 });
    staffToken = await tokenFor('staff');
    customerToken = await tokenFor('customer');
  });

  describe('creation', () => {
    it('creates a DINE_IN order with a table number', async () => {
      const { product } = await createCatalog();

      const res = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({ type: 'DINE_IN', tableNumber: 7, items: [{ productId: product.id, quantity: 1 }] });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('DINE_IN');
      expect(res.body.data.tableNumber).toBe(7);
      expect(res.body.data.status).toBe('PENDING');
    });

    it('coerces a string table number to an integer', async () => {
      const { product } = await createCatalog();

      const res = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({
          type: 'DINE_IN',
          tableNumber: '12',
          items: [{ productId: product.id, quantity: 1 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.tableNumber).toBe(12);
    });

    it('computes totals from database prices, ignoring client-supplied amounts', async () => {
      const { product } = await createCatalog({ price: 4.5 });

      const res = await api()
        .post('/api/orders')
        .set(auth(customerToken))
        .send({
          type: 'PICKUP',
          items: [{ productId: product.id, quantity: 2 }],
          // Values a hostile client might send; all must be ignored.
          subtotal: 0.01,
          total: 0.01,
          taxAmount: 0,
        });

      expect(res.status).toBe(201);
      // 2 x 4.50 = 9.00 subtotal, 10% tax = 0.90, pickup has no delivery fee.
      expect(Number(res.body.data.subtotal)).toBeCloseTo(9.0, 2);
      expect(Number(res.body.data.taxAmount)).toBeCloseTo(0.9, 2);
      expect(Number(res.body.data.total)).toBeCloseTo(9.9, 2);
    });

    it('applies the delivery fee only to DELIVERY orders', async () => {
      const { product } = await createCatalog({ price: 10 });

      const pickup = await api()
        .post('/api/orders')
        .set(auth(customerToken))
        .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 1 }] });

      const delivery = await api()
        .post('/api/orders')
        .set(auth(customerToken))
        .send({ type: 'DELIVERY', items: [{ productId: product.id, quantity: 1 }] });

      expect(Number(pickup.body.data.deliveryFee)).toBe(0);
      expect(Number(delivery.body.data.deliveryFee)).toBeCloseTo(5, 2);
      expect(Number(delivery.body.data.total)).toBeCloseTo(
        Number(pickup.body.data.total) + 5,
        2
      );
    });

    it('stores the price at purchase time so later price changes do not alter the order', async () => {
      const { product } = await createCatalog({ price: 4.5 });

      const created = await api()
        .post('/api/orders')
        .set(auth(customerToken))
        .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 1 }] });

      await prisma.product.update({ where: { id: product.id }, data: { price: 99 } });

      const fetched = await api()
        .get(`/api/orders/${created.body.data.id}`)
        .set(auth(staffToken));

      expect(Number(fetched.body.data.items[0].unitPrice)).toBeCloseTo(4.5, 2);
      expect(Number(fetched.body.data.total)).toBeCloseTo(4.95, 2);
    });

    it('rejects an unknown product with 404', async () => {
      await createCatalog();

      const res = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({
          type: 'PICKUP',
          items: [{ productId: 'clnonexistent00000000000', quantity: 1 }],
        });

      expect(res.status).toBe(404);
    });

    it('rejects an unavailable product with 409', async () => {
      const { product } = await createCatalog();
      await prisma.product.update({
        where: { id: product.id },
        data: { availability: 'UNAVAILABLE' },
      });

      const res = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 1 }] });

      expect(res.status).toBe(409);
    });

    it('rejects an empty item list with 400', async () => {
      const res = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({ type: 'PICKUP', items: [] });

      expect(res.status).toBe(400);
    });

    it('rejects a non-positive quantity with 400', async () => {
      const { product } = await createCatalog();

      const res = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 0 }] });

      expect(res.status).toBe(400);
    });

    it('rejects an invalid order type with 400', async () => {
      const { product } = await createCatalog();

      const res = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({ type: 'TELEPORT', items: [{ productId: product.id, quantity: 1 }] });

      expect(res.status).toBe(400);
    });

    it('issues distinct order numbers across a sequential batch', async () => {
      const { product } = await createCatalog({ currentStock: 1_000_000 });

      const numbers: string[] = [];
      for (let i = 0; i < 40; i++) {
        const res = await api()
          .post('/api/orders')
          .set(auth(staffToken))
          .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 1 }] });
        expect(res.status).toBe(201);
        numbers.push(res.body.data.orderNumber);
      }

      expect(new Set(numbers).size).toBe(numbers.length);
    });

    it('issues distinct order numbers for concurrent checkouts', async () => {
      const { product } = await createCatalog({ currentStock: 1_000_000 });

      // Kept within the default Prisma connection pool: order creation runs an
      // interactive transaction, and a much wider burst exhausts the pool
      // rather than exercising order-number generation.
      const responses = await Promise.all(
        Array.from({ length: 8 }, () =>
          api()
            .post('/api/orders')
            .set(auth(staffToken))
            .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 1 }] })
        )
      );

      expect(responses.every((r) => r.status === 201)).toBe(true);
      const numbers = responses.map((r) => r.body.data.orderNumber);
      expect(new Set(numbers).size).toBe(numbers.length);
    });
  });

  describe('stock validation at creation', () => {
    it('rejects an order that exceeds available stock with 400', async () => {
      // 50g in stock, recipe needs 18g per unit -> 3 units require 54g.
      const { product } = await createCatalog({ currentStock: 50, quantityPerUnit: 18 });

      const res = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 3 }] });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/insufficient stock/i);
    });

    it('sums a shared ingredient across separate line items before checking stock', async () => {
      // 30g in stock. Two products, each needing 18g of the same ingredient.
      // Individually both fit; together they need 36g and must be rejected.
      const { category, ingredient, product } = await createCatalog({
        currentStock: 30,
        quantityPerUnit: 18,
      });

      const second = await prisma.product.create({
        data: { name: 'Latte', price: 5, categoryId: category.id },
      });
      await prisma.recipe.create({
        data: {
          productId: second.id,
          servings: 1,
          ingredients: { create: [{ ingredientId: ingredient.id, quantity: 18, unit: 'grams' }] },
        },
      });

      const res = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({
          type: 'PICKUP',
          items: [
            { productId: product.id, quantity: 1 },
            { productId: second.id, quantity: 1 },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/insufficient stock/i);
    });

    it('permits an out-of-stock order when business settings allow it', async () => {
      await prisma.businessSettings.deleteMany();
      await createSettings({ allowOutOfStockOrders: true });
      const { product } = await createCatalog({ currentStock: 1, quantityPerUnit: 18 });

      const res = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 5 }] });

      expect(res.status).toBe(201);
    });

    it('leaves no order behind when stock validation fails', async () => {
      const { product } = await createCatalog({ currentStock: 10, quantityPerUnit: 18 });

      await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 1 }] });

      expect(await prisma.order.count()).toBe(0);
      expect(await prisma.orderItem.count()).toBe(0);
    });
  });

  describe('status transitions', () => {
    async function makeOrder(productId: string, quantity = 1) {
      const res = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({ type: 'PICKUP', items: [{ productId, quantity }] });
      expect(res.status).toBe(201);
      return res.body.data;
    }

    it('advances PENDING -> CONFIRMED and stamps confirmedAt', async () => {
      const { product } = await createCatalog();
      const order = await makeOrder(product.id);

      const res = await api()
        .put(`/api/orders/${order.id}/status`)
        .set(auth(staffToken))
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CONFIRMED');
      expect(res.body.data.confirmedAt).toBeTruthy();
    });

    it('walks the full happy path to COMPLETED', async () => {
      const { product } = await createCatalog();
      const order = await makeOrder(product.id);

      for (const status of ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED']) {
        const res = await api()
          .put(`/api/orders/${order.id}/status`)
          .set(auth(staffToken))
          .send({ status });
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe(status);
      }
    });

    it('rejects a skipped transition (PENDING -> READY) with 409', async () => {
      const { product } = await createCatalog();
      const order = await makeOrder(product.id);

      const res = await api()
        .put(`/api/orders/${order.id}/status`)
        .set(auth(staffToken))
        .send({ status: 'READY' });

      expect(res.status).toBe(409);
    });

    it('rejects any transition out of a terminal status', async () => {
      const { product } = await createCatalog();
      const order = await makeOrder(product.id);

      await api()
        .put(`/api/orders/${order.id}/status`)
        .set(auth(staffToken))
        .send({ status: 'CANCELLED' });

      const res = await api()
        .put(`/api/orders/${order.id}/status`)
        .set(auth(staffToken))
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(409);
    });

    it('records the cancellation reason', async () => {
      const { product } = await createCatalog();
      const order = await makeOrder(product.id);

      const res = await api()
        .put(`/api/orders/${order.id}/status`)
        .set(auth(staffToken))
        .send({ status: 'CANCELLED', cancellationReason: 'customer changed their mind' });

      expect(res.status).toBe(200);
      expect(res.body.data.cancellationReason).toBe('customer changed their mind');
      expect(res.body.data.cancelledAt).toBeTruthy();
    });

    it('forbids a customer from driving order status', async () => {
      const { product } = await createCatalog();
      const order = await makeOrder(product.id);

      const res = await api()
        .put(`/api/orders/${order.id}/status`)
        .set(auth(customerToken))
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(403);
    });
  });

  describe('lookup by order number', () => {
    it('resolves an order by its number', async () => {
      const { product } = await createCatalog();
      const created = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 1 }] });

      const res = await api()
        .get(`/api/orders/number/${created.body.data.orderNumber}`)
        .set(auth(staffToken));

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(created.body.data.id);
    });

    it('includes the relations the confirmation screen renders', async () => {
      // Regression: this endpoint used to return a bare order with no
      // includes, so the order-confirmation page received an order with no
      // items, customer or address and crashed to a blank page.
      const { product } = await createCatalog();
      const created = await api()
        .post('/api/orders')
        .set(auth(customerToken))
        .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 2 }] });

      const res = await api()
        .get(`/api/orders/number/${created.body.data.orderNumber}`)
        .set(auth(customerToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].product.name).toBe('Cappuccino');
      expect(res.body.data.items[0].quantity).toBe(2);
      expect(res.body.data.customer).toBeTruthy();
      expect(Array.isArray(res.body.data.payments)).toBe(true);
    });

    it('returns the same shape whether fetched by id or by number', async () => {
      const { product } = await createCatalog();
      const created = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 1 }] });

      const byId = await api()
        .get(`/api/orders/${created.body.data.id}`)
        .set(auth(staffToken));
      const byNumber = await api()
        .get(`/api/orders/number/${created.body.data.orderNumber}`)
        .set(auth(staffToken));

      expect(Object.keys(byNumber.body.data).sort()).toEqual(
        Object.keys(byId.body.data).sort()
      );
    });

    it('is readable without a session so guests can track their order', async () => {
      // Guest checkout is supported, so someone who ordered without an account
      // has only the order number to track with. The number is 8 hex characters
      // of CSPRNG output, so it acts as an unguessable capability token rather
      // than an enumerable id.
      const { product } = await createCatalog();
      const created = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 1 }] });

      const res = await api().get(`/api/orders/number/${created.body.data.orderNumber}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBe(created.body.data.orderNumber);
    });

    it('still refuses a signed-in customer another customer\'s order', async () => {
      const { product } = await createCatalog();
      const created = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 1 }] });

      const res = await api()
        .get(`/api/orders/number/${created.body.data.orderNumber}`)
        .set(auth(customerToken));

      expect(res.status).toBe(403);
    });

    it("does not let a customer read another customer's order by number", async () => {
      const { product } = await createCatalog();
      const created = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 1 }] });

      const res = await api()
        .get(`/api/orders/number/${created.body.data.orderNumber}`)
        .set(auth(customerToken));

      expect(res.status).toBe(403);
    });

    it('returns 404 for an unknown order number', async () => {
      const res = await api().get('/api/orders/number/ORD-000000-DEADBEEF').set(auth(staffToken));
      expect(res.status).toBe(404);
    });
  });

  describe('customer attribution', () => {
    it("attributes a customer's order to that customer and lists it in their history", async () => {
      const { product } = await createCatalog();

      const created = await api()
        .post('/api/orders')
        .set(auth(customerToken))
        .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 1 }] });

      expect(created.status).toBe(201);
      expect(created.body.data.customerId).toBeTruthy();

      const history = await api().get('/api/orders/my-orders').set(auth(customerToken));
      expect(history.body.data.map((o: { id: string }) => o.id)).toContain(created.body.data.id);
    });

    it('ignores a customerId in the body and uses the authenticated customer', async () => {
      const { product } = await createCatalog();
      const otherUser = await prisma.user.create({
        data: { email: 'other@test.local', passwordHash: 'x', role: 'CUSTOMER' },
      });
      const otherCustomer = await prisma.customer.create({
        data: { userId: otherUser.id, firstName: 'Other', lastName: 'Person' },
      });

      const created = await api()
        .post('/api/orders')
        .set(auth(customerToken))
        .send({
          type: 'PICKUP',
          customerId: otherCustomer.id,
          items: [{ productId: product.id, quantity: 1 }],
        });

      expect(created.status).toBe(201);
      expect(created.body.data.customerId).not.toBe(otherCustomer.id);
    });
  });

  describe('access control on reads', () => {
    it("prevents a customer from reading another customer's order", async () => {
      const { product } = await createCatalog();
      const staffOrder = await api()
        .post('/api/orders')
        .set(auth(staffToken))
        .send({ type: 'PICKUP', items: [{ productId: product.id, quantity: 1 }] });

      const res = await api()
        .get(`/api/orders/${staffOrder.body.data.id}`)
        .set(auth(customerToken));

      expect(res.status).toBe(403);
    });
  });
});
