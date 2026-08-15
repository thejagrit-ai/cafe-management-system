import { execSync } from 'node:child_process';

/**
 * Applies migrations to the dedicated test database once per run.
 * `prisma migrate deploy` creates the database if it does not exist yet.
 *
 * Tests must never point at the development database: the per-test truncation
 * in setup.ts would destroy real data, so the database name is checked first.
 */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set for the test run');
  }

  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!/test/i.test(dbName)) {
    throw new Error(
      `Refusing to run tests against database "${dbName}": its name must contain "test".`
    );
  }

  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url },
  });
}
