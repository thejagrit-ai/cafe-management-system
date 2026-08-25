import { describe, it, expect, beforeEach } from 'vitest';
import { api, auth, createUsers, createCatalog, createSettings, tokenFor } from './helpers';

/**
 * Both of these routes name their parameter `productId`, but were wired to
 * `idParamSchema`, which requires `params.id`. The mismatch made them answer
 * `400 {"params.id": ["Required"]}` on every request, so the recipe lookup and
 * the pre-order stock check were unreachable no matter what was passed.
 *
 * The same mistake had already been found and fixed for `/category/:categoryId`
 * and `/order/:orderId`; these two were missed.
 */
describe('recipe lookups by product', () => {
  let adminToken: string;

  beforeEach(async () => {
    await createUsers();
    await createSettings();
    adminToken = await tokenFor('admin');
  });

  describe('GET /api/recipes/product/:productId', () => {
    it('returns the recipe attached to a product', async () => {
      const { product, ingredient, quantityPerUnit } = await createCatalog();

      const res = await api().get(`/api/recipes/product/${product.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.productId).toBe(product.id);
      expect(res.body.data.ingredients).toHaveLength(1);
      expect(res.body.data.ingredients[0].ingredientId).toBe(ingredient.id);
      expect(Number(res.body.data.ingredients[0].quantity)).toBeCloseTo(quantityPerUnit, 3);
    });

    it('rejects an id that is not a cuid with 400', async () => {
      const res = await api().get('/api/recipes/product/not-a-cuid');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/recipes/:productId/check-stock', () => {
    it('reports a product as makeable when its ingredients are stocked', async () => {
      // 18g per drink against 1 000g on hand: five are comfortably makeable.
      const { product } = await createCatalog({ currentStock: 1000, quantityPerUnit: 18 });

      const res = await api().get(`/api/recipes/${product.id}/check-stock?quantity=5`);

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(true);
    });

    it('reports a shortfall when the ingredients cannot cover the quantity', async () => {
      // 18g per drink and only 20g on hand covers one, not ten.
      const { product } = await createCatalog({ currentStock: 20, quantityPerUnit: 18 });

      const res = await api().get(`/api/recipes/${product.id}/check-stock?quantity=10`);

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(false);
    });

    it('defaults to a quantity of one when none is given', async () => {
      const { product } = await createCatalog({ currentStock: 20, quantityPerUnit: 18 });

      const res = await api().get(`/api/recipes/${product.id}/check-stock`);

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(true);
    });

    it('rejects an id that is not a cuid with 400', async () => {
      const res = await api()
        .get('/api/recipes/not-a-cuid/check-stock')
        .set(auth(adminToken));

      expect(res.status).toBe(400);
    });
  });
});
