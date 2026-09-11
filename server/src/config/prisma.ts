import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Cached in every environment, production included. Locally this survives
// tsx's hot reload; on a serverless platform (Vercel) each warm invocation
// re-enters this module, and a fresh PrismaClient per request would open a new
// pool every time and exhaust the database's connection limit within minutes.
globalForPrisma.prisma = prisma;

export default prisma;
