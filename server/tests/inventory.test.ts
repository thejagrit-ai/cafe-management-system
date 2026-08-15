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

describe('inventory', () => {
  let adminToken: string;
  let staffToken: string;

  beforeEach(async () => {
    await createUsers();
    await createSettings();
    adminToken = await tokenFor('admin');
    staffToken = await tokenFor('staff');
  });

  async function makeOrder(productId: string, quantity: number) {
    const res = await api()
      .post('/api/orders')
      .set(auth(staffToken))
      .send({ type: 'PICKUP', items: [{ productId, quantity }] });
    expect(res.status).toBe(201);
    return res.body.data;
  }

  async function setStatus(orderId: string, status: string, extra: object = {}) {
    return api()
      .put(`/api/orders/${orderId}/status`)
      .set(auth(staffToken))
      .send({ status, ...extra });
  }

  describe('recipe-driven deduction', () => {
    it('deducts recipe quantities multiplied by order quantity on confirmation', async () => {
      const { product, ingredient, quantityPerUnit } = await createCatalog({
        currentStock: 1000,
        quantityPerUnit: 18,
      });
      const order = await makeOrder(product.id, 5);

      const before = await stockOf(ingredient.id);
      await setStatus(order.id, 'CONFIRMED');
      const after = await stockOf(ingredient.id);

      expect(before - after).toBeCloseTo(quantityPerUnit * 5, 3);
    });

    it('does not touch stock while the order is still PENDING', async () => {
      const { product, ingredient } = await createCatalog();
      const before = await stockOf(ingredient.id);

      await makeOrder(product.id, 3);

      expect(await stockOf(ingredient.id)).toBeCloseTo(before, 3);
    });

    it('writes an ORDER_CONSUMPTION transaction for each ingredient consumed', async () => {
      const { product, ingredient } = await createCatalog();
      const order = await makeOrder(product.id, 2);

      await setStatus(order.id, 'CONFIRMED');

      const txs = await prisma.inventoryTransaction.findMany({
        where: { referenceId: order.id, type: 'ORDER_CONSUMPTION' },
      });
      expect(txs).toHaveLength(1);
      expect(txs[0].ingredientId).toBe(ingredient.id);
      expect(Number(txs[0].quantity)).toBeCloseTo(36, 3);
      expect(txs[0].referenceType).toBe('ORDER');
    });

    it('deducts nothing for a product without a recipe', async () => {
      const { category } = await createCatalog();
      const plain = await prisma.product.create({
        data: { name: 'Bottled Water', price: 2, categoryId: category.id },
      });

      const order = await makeOrder(plain.id, 4);
      await setStatus(order.id, 'CONFIRMED');

      expect(await prisma.inventoryTransaction.count()).toBe(0);
    });

    it('deducts only once when the order advances past CONFIRMED', async () => {
      const { product, ingredient } = await createCatalog();
      const order = await makeOrder(product.id, 1);

      const before = await stockOf(ingredient.id);
      await setStatus(order.id, 'CONFIRMED');
      await setStatus(order.id, 'PREPARING');
      await setStatus(order.id, 'READY');
      const after = await stockOf(ingredient.id);

      expect(before - after).toBeCloseTo(18, 3);
    });
  });

  describe('restoration on cancellation', () => {
    it('gives stock back when a CONFIRMED order is cancelled', async () => {
      const { product, ingredient } = await createCatalog();
      const order = await makeOrder(product.id, 2);

      const before = await stockOf(ingredient.id);
      await setStatus(order.id, 'CONFIRMED');
      expect(await stockOf(ingredient.id)).toBeCloseTo(before - 36, 3);

      await setStatus(order.id, 'CANCELLED', { cancellationReason: 'test' });
      expect(await stockOf(ingredient.id)).toBeCloseTo(before, 3);
    });

    it('does not invent stock when a never-confirmed order is cancelled', async () => {
      const { product, ingredient } = await createCatalog();
      const order = await makeOrder(product.id, 2);

      const before = await stockOf(ingredient.id);
      await setStatus(order.id, 'CANCELLED', { cancellationReason: 'test' });

      expect(await stockOf(ingredient.id)).toBeCloseTo(before, 3);
      expect(await prisma.inventoryTransaction.count()).toBe(0);
    });
  });

  describe('manual stock adjustments', () => {
    it('increases stock and logs a RECEIVED transaction', async () => {
      const { ingredient } = await createCatalog({ currentStock: 100 });

      const res = await api()
        .post(`/api/ingredients/${ingredient.id}/adjust-stock`)
        .set(auth(adminToken))
        .send({ type: 'RECEIVED', quantity: 250, unitCost: 0.05, notes: 'delivery' });

      expect([200, 201]).toContain(res.status);
      expect(await stockOf(ingredient.id)).toBeCloseTo(350, 3);

      const txs = await prisma.inventoryTransaction.findMany({ where: { type: 'RECEIVED' } });
      expect(txs).toHaveLength(1);
    });

    it('decreases stock for WASTE', async () => {
      const { ingredient } = await createCatalog({ currentStock: 100 });

      await api()
        .post(`/api/ingredients/${ingredient.id}/adjust-stock`)
        .set(auth(adminToken))
        .send({ type: 'WASTE', quantity: 30, notes: 'spillage' });

      expect(await stockOf(ingredient.id)).toBeCloseTo(70, 3);
    });

    it('rejects an adjustment type outside the schema enum with 400', async () => {
      const { ingredient } = await createCatalog();

      const res = await api()
        .post(`/api/ingredients/${ingredient.id}/adjust-stock`)
        .set(auth(adminToken))
        .send({ type: 'STOCK_RECEIVED', quantity: 10 });

      expect(res.status).toBe(400);
    });

    it('rejects a negative quantity with 400', async () => {
      const { ingredient } = await createCatalog();

      const res = await api()
        .post(`/api/ingredients/${ingredient.id}/adjust-stock`)
        .set(auth(adminToken))
        .send({ type: 'RECEIVED', quantity: -5 });

      expect(res.status).toBe(400);
    });
  });

  describe('low stock detection', () => {
    it('reports an ingredient at or below its minimum', async () => {
      const { ingredient } = await createCatalog({ currentStock: 50, minStock: 100 });

      const res = await api().get('/api/ingredients/low-stock').set(auth(adminToken));

      expect(res.status).toBe(200);
      const ids = res.body.data.map((i: { id: string }) => i.id);
      expect(ids).toContain(ingredient.id);
    });

    it('omits an ingredient comfortably above its minimum', async () => {
      const { ingredient } = await createCatalog({ currentStock: 5000, minStock: 100 });

      const res = await api().get('/api/ingredients/low-stock').set(auth(adminToken));

      const ids = res.body.data.map((i: { id: string }) => i.id);
      expect(ids).not.toContain(ingredient.id);
    });

    it('flags an ingredient once consumption drives it below the minimum', async () => {
      // 110g on hand, minimum 100g. One 1-unit order consumes 18g -> 92g.
      const { product, ingredient } = await createCatalog({
        currentStock: 110,
        minStock: 100,
        quantityPerUnit: 18,
      });

      const before = await api().get('/api/ingredients/low-stock').set(auth(adminToken));
      expect(before.body.data.map((i: { id: string }) => i.id)).not.toContain(ingredient.id);

      const order = await makeOrder(product.id, 1);
      await setStatus(order.id, 'CONFIRMED');

      const after = await api().get('/api/ingredients/low-stock').set(auth(adminToken));
      expect(after.body.data.map((i: { id: string }) => i.id)).toContain(ingredient.id);
    });
  });
});
