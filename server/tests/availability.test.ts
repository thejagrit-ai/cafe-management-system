import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../src/config/prisma';
import { api, auth, createUsers, createCatalog, createSettings, tokenFor } from './helpers';

/**
 * Product availability used to be a purely manual column: nothing recomputed it
 * as recipes consumed their ingredients, so the storefront kept advertising
 * drinks the bar could no longer make and the customer only found out when
 * checkout rejected the order.
 */
describe('stock-driven product availability', () => {
  let staffToken: string;
  let adminToken: string;

  async function availabilityOf(productId: string) {
    const row = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    return row.availability;
  }

  beforeEach(async () => {
    await createUsers();
    await createSettings({ taxRate: 0, deliveryFee: 0, allowOutOfStockOrders: true });
    staffToken = await tokenFor('staff');
    adminToken = await tokenFor('admin');
  });

  it('marks a product UNAVAILABLE once its ingredient is exhausted', async () => {
    // 18g per drink, 18g on hand: one order empties the hopper.
    const { product, ingredient } = await createCatalog({
      currentStock: 18,
      minStock: 0,
      quantityPerUnit: 18,
    });

    const res = await api()
      .post('/api/orders')
      .set(auth(staffToken))
      .send({
        type: 'PICKUP',
        items: [{ productId: product.id, quantity: 1 }],
        paymentMethod: 'CARD',
      });

    expect(res.status).toBe(201);

    const remaining = await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredient.id } });
    expect(Number(remaining.currentStock)).toBeCloseTo(0, 3);
    expect(await availabilityOf(product.id)).toBe('UNAVAILABLE');
  });

  it('marks a product LIMITED while only a few servings remain', async () => {
    // 18g per drink and 90g on hand leaves five servings, which is the
    // threshold at which the menu should start warning.
    const { product } = await createCatalog({
      currentStock: 108,
      minStock: 0,
      quantityPerUnit: 18,
    });

    const res = await api()
      .post('/api/orders')
      .set(auth(staffToken))
      .send({
        type: 'PICKUP',
        items: [{ productId: product.id, quantity: 1 }],
        paymentMethod: 'CARD',
      });

    expect(res.status).toBe(201);
    expect(await availabilityOf(product.id)).toBe('LIMITED');
  });

  it('leaves a well-stocked product AVAILABLE', async () => {
    const { product } = await createCatalog({
      currentStock: 5000,
      minStock: 0,
      quantityPerUnit: 18,
    });

    const res = await api()
      .post('/api/orders')
      .set(auth(staffToken))
      .send({
        type: 'PICKUP',
        items: [{ productId: product.id, quantity: 1 }],
        paymentMethod: 'CARD',
      });

    expect(res.status).toBe(201);
    expect(await availabilityOf(product.id)).toBe('AVAILABLE');
  });

  it('re-lists the product when a cancellation puts the stock back', async () => {
    const { product } = await createCatalog({
      currentStock: 18,
      minStock: 0,
      quantityPerUnit: 18,
    });

    const created = await api()
      .post('/api/orders')
      .set(auth(staffToken))
      .send({
        type: 'PICKUP',
        items: [{ productId: product.id, quantity: 1 }],
        paymentMethod: 'CARD',
      });
    expect(created.status).toBe(201);
    expect(await availabilityOf(product.id)).toBe('UNAVAILABLE');

    const cancelled = await api()
      .put(`/api/orders/${created.body.data.id}/status`)
      .set(auth(adminToken))
      .send({ status: 'CANCELLED', cancellationReason: 'Customer left' });

    expect(cancelled.status).toBe(200);
    // One serving back on the shelf is still below the "limited" threshold.
    expect(await availabilityOf(product.id)).toBe('LIMITED');
  });

  it('never overrides an availability a person set by hand', async () => {
    // Exactly one serving on hand, so the automation would normally take this
    // straight to UNAVAILABLE the moment it is ordered.
    const { product } = await createCatalog({
      currentStock: 18,
      minStock: 0,
      quantityPerUnit: 18,
    });

    // The bar insists the item stays on the menu and locks that choice.
    const locked = await api()
      .put(`/api/products/${product.id}`)
      .set(auth(adminToken))
      .send({ availability: 'AVAILABLE', availabilityLocked: true });
    expect(locked.status).toBe(200);

    const res = await api()
      .post('/api/orders')
      .set(auth(staffToken))
      .send({
        type: 'PICKUP',
        items: [{ productId: product.id, quantity: 1 }],
        paymentMethod: 'CARD',
      });

    expect(res.status).toBe(201);
    expect(await availabilityOf(product.id)).toBe('AVAILABLE');
  });

  it('marks dependent products UNAVAILABLE when an ingredient is retired', async () => {
    const { product, ingredient } = await createCatalog({
      currentStock: 5000,
      minStock: 0,
      quantityPerUnit: 18,
    });

    const res = await api()
      .put(`/api/ingredients/${ingredient.id}`)
      .set(auth(adminToken))
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(await availabilityOf(product.id)).toBe('UNAVAILABLE');
  });

  it('follows a manual stock adjustment made from the inventory screen', async () => {
    const { product, ingredient } = await createCatalog({
      currentStock: 5000,
      minStock: 0,
      quantityPerUnit: 18,
    });

    const res = await api()
      .post(`/api/ingredients/${ingredient.id}/adjust-stock`)
      .set(auth(adminToken))
      .send({ type: 'WASTE', quantity: 5000, notes: 'Spoiled batch discarded' });

    expect(res.status).toBe(200);
    expect(await availabilityOf(product.id)).toBe('UNAVAILABLE');
  });
});
