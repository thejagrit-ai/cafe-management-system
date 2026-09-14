import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';

export class CustomerEngagementService {
  async listFavorites(customerId: string) {
    return prisma.$queryRaw`
      SELECT f."id", f."customerId", f."productId", f."notes", f."createdAt",
             row_to_json(p.*) AS "product"
      FROM "customer_favorites" f
      JOIN "products" p ON p."id" = f."productId"
      WHERE f."customerId" = ${customerId}
      ORDER BY f."createdAt" DESC
    `;
  }

  async addFavorite(customerId: string, productId: string, notes?: string) {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new NotFoundError('Product');

    try {
      const rows = await prisma.$queryRaw`
        INSERT INTO "customer_favorites" ("id", "customerId", "productId", "notes", "createdAt")
        VALUES (${crypto.randomUUID()}, ${customerId}, ${productId}, ${notes ?? null}, NOW())
        RETURNING *
      `;
      return Array.isArray(rows) ? rows[0] : rows;
    } catch {
      throw new ConflictError('Product is already in favorites');
    }
  }

  async removeFavorite(customerId: string, productId: string) {
    await prisma.$executeRaw`
      DELETE FROM "customer_favorites"
      WHERE "customerId" = ${customerId} AND "productId" = ${productId}
    `;
  }

  async listReviews(params: { page: number; limit: number; productId?: string; customerId?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const clauses: Prisma.Sql[] = [Prisma.sql`r."isPublished" = true`];
    if (params.productId) clauses.push(Prisma.sql`r."productId" = ${params.productId}`);
    if (params.customerId) clauses.push(Prisma.sql`r."customerId" = ${params.customerId}`);
    const where = Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}`;

    const rows = await prisma.$queryRaw`
      SELECT r.*, p."name" AS "productName", c."firstName", c."lastName"
      FROM "product_reviews" r
      JOIN "products" p ON p."id" = r."productId"
      JOIN "customers" c ON c."id" = r."customerId"
      ${where}
      ORDER BY r."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const totalRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "product_reviews" r ${where}
    `;
    const total = Number(totalRows[0]?.count ?? 0);
    return { data: rows as any[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createReview(customerId: string, data: { productId: string; orderId?: string; rating: number; comment?: string }) {
    if (data.rating < 1 || data.rating > 5) throw new BadRequestError('Rating must be between 1 and 5');

    const orderItems = await prisma.orderItem.findMany({
      where: {
        productId: data.productId,
        order: {
          customerId,
          status: { in: ['DELIVERED', 'COMPLETED'] },
          ...(data.orderId ? { id: data.orderId } : {}),
        },
      },
      take: 1,
      select: { orderId: true },
    });
    if (!orderItems.length) {
      throw new BadRequestError('You can review products only after completing an order for them');
    }

    const orderId = data.orderId ?? orderItems[0].orderId;
    try {
      const rows = await prisma.$queryRaw`
        INSERT INTO "product_reviews" (
          "id", "productId", "customerId", "orderId", "rating", "comment", "isPublished", "createdAt", "updatedAt"
        )
        VALUES (
          ${crypto.randomUUID()}, ${data.productId}, ${customerId}, ${orderId}, ${data.rating},
          ${data.comment ?? null}, true, NOW(), NOW()
        )
        RETURNING *
      `;
      return Array.isArray(rows) ? rows[0] : rows;
    } catch {
      throw new ConflictError('You already reviewed this product for this order');
    }
  }

  async getReviewSummary(productId?: string) {
    const where = productId ? Prisma.sql`WHERE "productId" = ${productId} AND "isPublished" = true` : Prisma.sql`WHERE "isPublished" = true`;
    const rows = await prisma.$queryRaw<Array<{ productId: string; averageRating: number; reviewCount: number }>>`
      SELECT "productId", ROUND(AVG("rating")::numeric, 2)::float AS "averageRating", COUNT(*)::int AS "reviewCount"
      FROM "product_reviews"
      ${where}
      GROUP BY "productId"
    `;
    return rows;
  }
}

export const customerEngagementService = new CustomerEngagementService();
