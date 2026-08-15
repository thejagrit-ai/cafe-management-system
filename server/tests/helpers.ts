import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { hashPassword } from '../src/utils/helpers';
import { Role } from '@prisma/client';

export const api = () => request(app);

export const CREDENTIALS = {
  admin: { email: 'admin@test.local', password: 'admin12345' },
  staff: { email: 'staff@test.local', password: 'staff12345' },
  customer: { email: 'customer@test.local', password: 'customer12345' },
} as const;

/** Creates an admin, a staff member (with Employee) and a customer (with Customer). */
export async function createUsers() {
  const [adminHash, staffHash, customerHash] = await Promise.all([
    hashPassword(CREDENTIALS.admin.password),
    hashPassword(CREDENTIALS.staff.password),
    hashPassword(CREDENTIALS.customer.password),
  ]);

  const admin = await prisma.user.create({
    data: { email: CREDENTIALS.admin.email, passwordHash: adminHash, role: Role.ADMIN },
  });

  const staffUser = await prisma.user.create({
    data: { email: CREDENTIALS.staff.email, passwordHash: staffHash, role: Role.STAFF },
  });
  const employee = await prisma.employee.create({
    data: { userId: staffUser.id, firstName: 'Sam', lastName: 'Staff', position: 'Barista' },
  });

  const customerUser = await prisma.user.create({
    data: { email: CREDENTIALS.customer.email, passwordHash: customerHash, role: Role.CUSTOMER },
  });
  const customer = await prisma.customer.create({
    data: { userId: customerUser.id, firstName: 'Casey', lastName: 'Customer' },
  });

  return { admin, staffUser, employee, customerUser, customer };
}

/** Logs in and returns the bearer token. */
export async function tokenFor(who: keyof typeof CREDENTIALS): Promise<string> {
  const res = await api().post('/api/auth/login').send(CREDENTIALS[who]);
  if (res.status !== 200) {
    throw new Error(`login failed for ${who}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data.tokens.accessToken;
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * A category, an ingredient, a product, and a recipe binding the product to the
 * ingredient — the minimum needed to exercise recipe-driven stock deduction.
 */
export async function createCatalog(options?: {
  currentStock?: number;
  minStock?: number;
  quantityPerUnit?: number;
  price?: number;
}) {
  const {
    currentStock = 1000,
    minStock = 100,
    quantityPerUnit = 18,
    price = 4.5,
  } = options ?? {};

  const category = await prisma.category.create({
    data: { name: 'Hot Coffee', sortOrder: 1 },
  });

  const ingredient = await prisma.ingredient.create({
    data: {
      name: 'Coffee Beans',
      sku: `SKU-${Math.random().toString(36).slice(2, 10)}`,
      unit: 'grams',
      currentStock,
      minStock,
      maxStock: 10_000,
      costPerUnit: 0.05,
    },
  });

  const product = await prisma.product.create({
    data: { name: 'Cappuccino', price, categoryId: category.id },
  });

  const recipe = await prisma.recipe.create({
    data: {
      productId: product.id,
      instructions: 'Pull espresso, steam milk',
      servings: 1,
      ingredients: {
        create: [{ ingredientId: ingredient.id, quantity: quantityPerUnit, unit: 'grams' }],
      },
    },
  });

  return { category, ingredient, product, recipe, quantityPerUnit };
}

export async function createSettings(overrides?: {
  taxRate?: number;
  deliveryFee?: number;
  allowOutOfStockOrders?: boolean;
}) {
  return prisma.businessSettings.create({
    data: {
      taxRate: overrides?.taxRate ?? 10,
      deliveryFee: overrides?.deliveryFee ?? 5,
      allowOutOfStockOrders: overrides?.allowOutOfStockOrders ?? false,
      currency: 'USD',
    },
  });
}

export async function stockOf(ingredientId: string): Promise<number> {
  const row = await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredientId } });
  return Number(row.currentStock);
}
