import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../src/config/prisma';
import { api, auth, createUsers, createCatalog, tokenFor } from './helpers';

describe('products', () => {
  let adminToken: string;
  let customerToken: string;

  beforeEach(async () => {
    await createUsers();
    adminToken = await tokenFor('admin');
    customerToken = await tokenFor('customer');
  });

  describe('creation', () => {
    it('persists every supplied field, including imageUrl and sortOrder', async () => {
      const { category } = await createCatalog();

      const res = await api()
        .post('/api/products')
        .set(auth(adminToken))
        .send({
          name: 'Flat White',
          description: 'Velvety microfoam',
          price: 4.75,
          categoryId: category.id,
          imageUrl: 'https://example.com/flat-white.png',
          sortOrder: 12,
          isFeatured: true,
          isPopular: true,
          availability: 'LIMITED',
        });

      expect(res.status).toBe(201);

      const saved = await prisma.product.findUniqueOrThrow({ where: { id: res.body.data.id } });
      expect(saved.name).toBe('Flat White');
      expect(saved.imageUrl).toBe('https://example.com/flat-white.png');
      expect(saved.sortOrder).toBe(12);
      expect(saved.isFeatured).toBe(true);
      expect(saved.availability).toBe('LIMITED');
      expect(Number(saved.price)).toBeCloseTo(4.75, 2);
    });

    it('rejects an unknown category with 404', async () => {
      const res = await api()
        .post('/api/products')
        .set(auth(adminToken))
        .send({ name: 'Orphan', price: 3, categoryId: 'clnonexistent00000000000' });

      expect(res.status).toBe(404);
    });

    it('rejects a negative price with 400', async () => {
      const { category } = await createCatalog();

      const res = await api()
        .post('/api/products')
        .set(auth(adminToken))
        .send({ name: 'Free Coffee', price: -1, categoryId: category.id });

      expect(res.status).toBe(400);
    });

    it('rejects an empty name with 400', async () => {
      const { category } = await createCatalog();

      const res = await api()
        .post('/api/products')
        .set(auth(adminToken))
        .send({ name: '', price: 3, categoryId: category.id });

      expect(res.status).toBe(400);
    });

    it('rejects an availability value outside the schema enum with 400', async () => {
      const { category } = await createCatalog();

      const res = await api()
        .post('/api/products')
        .set(auth(adminToken))
        .send({ name: 'Bad Enum', price: 3, categoryId: category.id, availability: 'LOW_STOCK' });

      expect(res.status).toBe(400);
    });
  });

  describe('update', () => {
    it('applies partial changes', async () => {
      const { product } = await createCatalog();

      const res = await api()
        .put(`/api/products/${product.id}`)
        .set(auth(adminToken))
        .send({ price: 6.25, isFeatured: true });

      expect(res.status).toBe(200);

      const saved = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
      expect(Number(saved.price)).toBeCloseTo(6.25, 2);
      expect(saved.isFeatured).toBe(true);
      expect(saved.name).toBe('Cappuccino');
    });

    it('returns 404 for a product that does not exist', async () => {
      const res = await api()
        .put('/api/products/clnonexistent00000000000')
        .set(auth(adminToken))
        .send({ price: 5 });

      expect(res.status).toBe(404);
    });
  });

  describe('deletion', () => {
    it('removes a product that has no order history', async () => {
      const { category } = await createCatalog();
      const disposable = await prisma.product.create({
        data: { name: 'Discontinued', price: 1, categoryId: category.id },
      });

      const res = await api()
        .delete(`/api/products/${disposable.id}`)
        .set(auth(adminToken));

      expect(res.status).toBe(200);
      expect(await prisma.product.findUnique({ where: { id: disposable.id } })).toBeNull();
    });
  });

  describe('listing and filtering', () => {
    it('returns every product when no filter is supplied', async () => {
      const { category } = await createCatalog();
      await prisma.product.createMany({
        data: [
          { name: 'Featured One', price: 3, categoryId: category.id, isFeatured: true },
          { name: 'Popular One', price: 3, categoryId: category.id, isPopular: true },
          { name: 'Plain One', price: 3, categoryId: category.id },
        ],
      });

      const res = await api().get('/api/products?limit=100');

      expect(res.status).toBe(200);
      // 1 from createCatalog + 3 above; featured/popular items must not be hidden.
      expect(res.body.pagination.total).toBe(4);
    });

    it('filters to featured products only when asked', async () => {
      const { category } = await createCatalog();
      await prisma.product.createMany({
        data: [
          { name: 'Featured One', price: 3, categoryId: category.id, isFeatured: true },
          { name: 'Plain One', price: 3, categoryId: category.id },
        ],
      });

      const res = await api().get('/api/products?limit=100&isFeatured=true');

      expect(res.body.pagination.total).toBe(1);
      expect(res.body.data[0].name).toBe('Featured One');
    });

    it('treats isFeatured=false as an explicit filter, not as "no filter"', async () => {
      const { category } = await createCatalog();
      await prisma.product.create({
        data: { name: 'Featured One', price: 3, categoryId: category.id, isFeatured: true },
      });

      const res = await api().get('/api/products?limit=100&isFeatured=false');

      // createCatalog's Cappuccino is the only non-featured product.
      expect(res.body.pagination.total).toBe(1);
      expect(res.body.data[0].name).toBe('Cappuccino');
    });

    it('paginates', async () => {
      const { category } = await createCatalog();
      await prisma.product.createMany({
        data: Array.from({ length: 14 }, (_, i) => ({
          name: `Product ${i}`,
          price: 3,
          categoryId: category.id,
        })),
      });

      const res = await api().get('/api/products?page=2&limit=10');

      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.total).toBe(15);
      expect(res.body.data).toHaveLength(5);
    });

    it('searches by name', async () => {
      const { category } = await createCatalog();
      await prisma.product.create({
        data: { name: 'Matcha Latte', price: 5, categoryId: category.id },
      });

      const res = await api().get('/api/products?search=matcha');

      expect(res.body.pagination.total).toBe(1);
      expect(res.body.data[0].name).toBe('Matcha Latte');
    });
  });

  describe('authorization', () => {
    it('lets an anonymous visitor browse the menu', async () => {
      await createCatalog();
      const res = await api().get('/api/products');
      expect(res.status).toBe(200);
    });

    it('forbids a customer from creating a product', async () => {
      const { category } = await createCatalog();

      const res = await api()
        .post('/api/products')
        .set(auth(customerToken))
        .send({ name: 'Nope', price: 3, categoryId: category.id });

      expect(res.status).toBe(403);
    });

    it('forbids a customer from deleting a product', async () => {
      const { product } = await createCatalog();

      const res = await api().delete(`/api/products/${product.id}`).set(auth(customerToken));

      expect(res.status).toBe(403);
    });
  });
});
