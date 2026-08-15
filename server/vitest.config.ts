import { defineConfig } from 'vitest/config';

// Point the whole test run at a dedicated database BEFORE any src module loads.
// src/config/index.ts calls dotenv.config(), and dotenv does not overwrite
// variables that are already set, so assigning here wins over server/.env and
// the development database is never touched.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/cafe_management_test?schema=public';

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-only-secret-do-not-use-in-production';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    setupFiles: ['tests/setup.ts'],
    // Worker threads get a fresh process env; pass the same values through.
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: 'test',
      JWT_SECRET: process.env.JWT_SECRET,
    },
    // These are integration tests against one Postgres database. Running files
    // in parallel would let one file's truncation wipe another's fixtures.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/types/**'],
    },
  },
});
