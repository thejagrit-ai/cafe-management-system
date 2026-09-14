import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { BadRequestError, NotFoundError } from '../utils/errors';

interface PurchaseOrderInput {
  supplierId?: string;
  expectedAt?: string;
  notes?: string;
  items: Array<{ ingredientId: string; quantity: number; unitCost?: number }>;
}

function purchaseOrderNumber() {
  return `PO-${Date.now().toString(36).toUpperCase()}`;
}

export class PurchaseOrderService {
  async findAll(params: { page: number; limit: number; status?: string; supplierId?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const clauses: Prisma.Sql[] = [];
    if (params.status) clauses.push(Prisma.sql`po."status"::text = ${params.status}`);
    if (params.supplierId) clauses.push(Prisma.sql`po."supplierId" = ${params.supplierId}`);
    const where = clauses.length ? Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}` : Prisma.empty;

    const rows = await prisma.$queryRaw<any[]>`
      SELECT po.*, s."name" AS "supplierName",
        COALESCE(
          json_agg(
            json_build_object(
              'id', poi."id",
              'ingredientId', poi."ingredientId",
              'ingredientName', i."name",
              'unit', i."unit",
              'quantity', poi."quantity",
              'unitCost', poi."unitCost",
              'receivedQuantity', poi."receivedQuantity"
            )
          ) FILTER (WHERE poi."id" IS NOT NULL),
          '[]'
        ) AS items
      FROM "purchase_orders" po
      LEFT JOIN "suppliers" s ON s."id" = po."supplierId"
      LEFT JOIN "purchase_order_items" poi ON poi."purchaseOrderId" = po."id"
      LEFT JOIN "ingredients" i ON i."id" = poi."ingredientId"
      ${where}
      GROUP BY po."id", s."name"
      ORDER BY po."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const totalRows = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "purchase_orders" po ${where}`;
    const total = Number(totalRows[0]?.count ?? 0);
    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(data: PurchaseOrderInput, userId?: string) {
    if (!data.items?.length) throw new BadRequestError('Purchase order needs at least one item');

    const id = crypto.randomUUID();
    const orderNumber = purchaseOrderNumber();

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "purchase_orders" (
          "id", "orderNumber", "supplierId", "status", "notes", "expectedAt", "createdById", "createdAt", "updatedAt"
        )
        VALUES (
          ${id}, ${orderNumber}, ${data.supplierId ?? null}, 'DRAFT', ${data.notes ?? null},
          ${data.expectedAt ? new Date(data.expectedAt) : null}, ${userId ?? null}, NOW(), NOW()
        )
      `;

      for (const item of data.items) {
        if (item.quantity <= 0) throw new BadRequestError('Purchase order quantities must be positive');
        await tx.$executeRaw`
          INSERT INTO "purchase_order_items" (
            "id", "purchaseOrderId", "ingredientId", "quantity", "unitCost", "receivedQuantity", "createdAt", "updatedAt"
          )
          VALUES (
            ${crypto.randomUUID()}, ${id}, ${item.ingredientId}, ${item.quantity}, ${item.unitCost ?? 0}, 0, NOW(), NOW()
          )
        `;
      }
    });

    return this.findById(id);
  }

  async findById(id: string) {
    const result = await this.findAll({ page: 1, limit: 1 });
    const row = result.data.find((item: any) => item.id === id);
    if (row) return row;

    const rows = await prisma.$queryRaw<any[]>`
      SELECT po.*, s."name" AS "supplierName",
        COALESCE(
          json_agg(
            json_build_object(
              'id', poi."id",
              'ingredientId', poi."ingredientId",
              'ingredientName', i."name",
              'unit', i."unit",
              'quantity', poi."quantity",
              'unitCost', poi."unitCost",
              'receivedQuantity', poi."receivedQuantity"
            )
          ) FILTER (WHERE poi."id" IS NOT NULL),
          '[]'
        ) AS items
      FROM "purchase_orders" po
      LEFT JOIN "suppliers" s ON s."id" = po."supplierId"
      LEFT JOIN "purchase_order_items" poi ON poi."purchaseOrderId" = po."id"
      LEFT JOIN "ingredients" i ON i."id" = poi."ingredientId"
      WHERE po."id" = ${id}
      GROUP BY po."id", s."name"
      LIMIT 1
    `;
    if (!rows.length) throw new NotFoundError('Purchase order');
    return rows[0];
  }

  async updateStatus(id: string, status: string) {
    const rows = await prisma.$queryRaw<any[]>`
      UPDATE "purchase_orders"
      SET "status" = ${status}::"PurchaseOrderStatus", "updatedAt" = NOW()
      WHERE "id" = ${id}
      RETURNING *
    `;
    if (!rows.length) throw new NotFoundError('Purchase order');
    return this.findById(id);
  }

  async receive(id: string, receivedItems: Array<{ itemId: string; quantity: number }>, performedById?: string) {
    if (!receivedItems.length) throw new BadRequestError('No received items supplied');

    await prisma.$transaction(async (tx) => {
      for (const received of receivedItems) {
        if (received.quantity <= 0) throw new BadRequestError('Received quantity must be positive');
        const rows = await tx.$queryRaw<any[]>`
          SELECT poi.*, i."unit"
          FROM "purchase_order_items" poi
          JOIN "ingredients" i ON i."id" = poi."ingredientId"
          WHERE poi."id" = ${received.itemId} AND poi."purchaseOrderId" = ${id}
          LIMIT 1
        `;
        const item = rows[0];
        if (!item) throw new NotFoundError('Purchase order item');

        await tx.$executeRaw`
          UPDATE "purchase_order_items"
          SET "receivedQuantity" = "receivedQuantity" + ${received.quantity}, "updatedAt" = NOW()
          WHERE "id" = ${received.itemId}
        `;
        await tx.ingredient.update({
          where: { id: item.ingredientId },
          data: { currentStock: { increment: received.quantity } },
        });
        await tx.inventoryTransaction.create({
          data: {
            ingredientId: item.ingredientId,
            type: 'RECEIVED',
            quantity: received.quantity,
            unitCost: Number(item.unitCost ?? 0),
            totalCost: received.quantity * Number(item.unitCost ?? 0),
            referenceId: id,
            referenceType: 'PURCHASE_ORDER',
            notes: `Received from purchase order`,
            performedById,
          },
        });
      }

      const remaining = await tx.$queryRaw<Array<{ open: bigint }>>`
        SELECT COUNT(*)::bigint AS open
        FROM "purchase_order_items"
        WHERE "purchaseOrderId" = ${id} AND "receivedQuantity" < "quantity"
      `;
      await tx.$executeRaw`
        UPDATE "purchase_orders"
        SET "status" = ${Number(remaining[0]?.open ?? 0) > 0 ? 'PARTIALLY_RECEIVED' : 'RECEIVED'}::"PurchaseOrderStatus",
            "updatedAt" = NOW()
        WHERE "id" = ${id}
      `;
    });

    return this.findById(id);
  }
}

export const purchaseOrderService = new PurchaseOrderService();
