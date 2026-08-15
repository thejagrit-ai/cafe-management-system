import { beforeEach, afterAll } from 'vitest';
import prisma from '../src/config/prisma';

// Child tables first so foreign keys never block the reset.
const TABLES_IN_DELETION_ORDER = [
  'payments',
  'order_items',
  'orders',
  'recipe_ingredients',
  'recipes',
  'inventory_transactions',
  'inventory',
  'products',
  'categories',
  'ingredients',
  'suppliers',
  'addresses',
  'customers',
  'employees',
  'refresh_tokens',
  'users',
  'business_settings',
  'audit_logs',
] as const;

/**
 * Every test starts from an empty database and builds only the fixtures it
 * needs, so no test can depend on another test's leftovers.
 */
beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES_IN_DELETION_ORDER.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
