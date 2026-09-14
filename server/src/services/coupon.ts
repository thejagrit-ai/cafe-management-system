import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';

export type CouponTypeInput = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type CouponStatusInput = 'ACTIVE' | 'PAUSED' | 'EXPIRED';

export interface CouponRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: CouponTypeInput;
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  status: CouponStatusInput;
  createdAt: Date;
  updatedAt: Date;
  redemptionCount?: number;
}

interface CouponInput {
  code: string;
  name: string;
  description?: string;
  type: CouponTypeInput;
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  startsAt?: string;
  endsAt?: string;
  status?: CouponStatusInput;
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export class CouponService {
  async findAll(params: { page: number; limit: number; search?: string; status?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const clauses: Prisma.Sql[] = [];

    if (params.search) {
      const term = `%${params.search}%`;
      clauses.push(Prisma.sql`("code" ILIKE ${term} OR "name" ILIKE ${term})`);
    }
    if (params.status) {
      clauses.push(Prisma.sql`"status"::text = ${params.status}`);
    }

    const where = clauses.length ? Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}` : Prisma.empty;
    const rows = await prisma.$queryRaw<CouponRow[]>`
      SELECT c.*, COUNT(cr."id")::int AS "redemptionCount"
      FROM "coupons" c
      LEFT JOIN "coupon_redemptions" cr ON cr."couponId" = c."id"
      ${where}
      GROUP BY c."id"
      ORDER BY c."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const totalRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "coupons" ${where}
    `;

    return { data: rows, total: Number(totalRows[0]?.count ?? 0), page, limit, totalPages: Math.ceil(Number(totalRows[0]?.count ?? 0) / limit) };
  }

  async create(data: CouponInput) {
    const code = normalizeCode(data.code);
    if (!code) throw new BadRequestError('Coupon code is required');
    if (data.type === 'PERCENTAGE' && (data.value <= 0 || data.value > 100)) {
      throw new BadRequestError('Percentage coupons must be between 1 and 100');
    }
    if (data.type === 'FIXED_AMOUNT' && data.value <= 0) {
      throw new BadRequestError('Fixed amount coupon must be greater than 0');
    }

    const exists = await prisma.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "coupons" WHERE "code" = ${code} LIMIT 1`;
    if (exists.length) throw new ConflictError('Coupon code already exists');

    const id = crypto.randomUUID();
    const rows = await prisma.$queryRaw<CouponRow[]>`
      INSERT INTO "coupons" (
        "id", "code", "name", "description", "type", "value", "minOrderAmount",
        "maxDiscount", "usageLimit", "perCustomerLimit", "startsAt", "endsAt", "status", "updatedAt"
      ) VALUES (
        ${id}, ${code}, ${data.name}, ${data.description ?? null}, ${data.type}::"CouponType",
        ${data.value}, ${data.minOrderAmount ?? 0}, ${data.maxDiscount ?? null},
        ${data.usageLimit ?? null}, ${data.perCustomerLimit ?? null},
        ${data.startsAt ? new Date(data.startsAt) : null}, ${data.endsAt ? new Date(data.endsAt) : null},
        ${(data.status ?? 'ACTIVE')}::"CouponStatus", NOW()
      )
      RETURNING *
    `;
    return rows[0];
  }

  async update(id: string, data: Partial<CouponInput>) {
    const existing = await prisma.$queryRaw<CouponRow[]>`SELECT * FROM "coupons" WHERE "id" = ${id} LIMIT 1`;
    if (!existing.length) throw new NotFoundError('Coupon');

    const next = { ...existing[0], ...data, code: data.code ? normalizeCode(data.code) : existing[0].code };
    const rows = await prisma.$queryRaw<CouponRow[]>`
      UPDATE "coupons"
      SET "code" = ${next.code},
          "name" = ${next.name},
          "description" = ${next.description ?? null},
          "type" = ${next.type}::"CouponType",
          "value" = ${Number(next.value)},
          "minOrderAmount" = ${Number(next.minOrderAmount ?? 0)},
          "maxDiscount" = ${next.maxDiscount ?? null},
          "usageLimit" = ${next.usageLimit ?? null},
          "perCustomerLimit" = ${next.perCustomerLimit ?? null},
          "startsAt" = ${next.startsAt ? new Date(next.startsAt) : null},
          "endsAt" = ${next.endsAt ? new Date(next.endsAt) : null},
          "status" = ${next.status}::"CouponStatus",
          "updatedAt" = NOW()
      WHERE "id" = ${id}
      RETURNING *
    `;
    return rows[0];
  }

  async validateForOrder(code: string, subtotal: number, customerId?: string | null, tx: Prisma.TransactionClient = prisma) {
    const couponCode = normalizeCode(code);
    const rows = await tx.$queryRaw<CouponRow[]>`
      SELECT * FROM "coupons"
      WHERE "code" = ${couponCode}
      LIMIT 1
    `;
    const coupon = rows[0];
    if (!coupon) throw new NotFoundError('Coupon');

    const now = new Date();
    if (coupon.status !== 'ACTIVE') throw new BadRequestError('Coupon is not active');
    if (coupon.startsAt && coupon.startsAt > now) throw new BadRequestError('Coupon is not active yet');
    if (coupon.endsAt && coupon.endsAt < now) throw new BadRequestError('Coupon has expired');
    if (subtotal < Number(coupon.minOrderAmount)) throw new BadRequestError(`Coupon requires an order of at least ${coupon.minOrderAmount}`);

    if (coupon.usageLimit) {
      const used = await tx.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM "coupon_redemptions" WHERE "couponId" = ${coupon.id}
      `;
      if (Number(used[0]?.count ?? 0) >= coupon.usageLimit) throw new BadRequestError('Coupon usage limit reached');
    }

    if (customerId && coupon.perCustomerLimit) {
      const used = await tx.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM "coupon_redemptions"
        WHERE "couponId" = ${coupon.id} AND "customerId" = ${customerId}
      `;
      if (Number(used[0]?.count ?? 0) >= coupon.perCustomerLimit) throw new BadRequestError('Coupon already used by this customer');
    }

    const rawDiscount = coupon.type === 'PERCENTAGE'
      ? subtotal * (Number(coupon.value) / 100)
      : Number(coupon.value);
    const cappedDiscount = coupon.maxDiscount ? Math.min(rawDiscount, Number(coupon.maxDiscount)) : rawDiscount;
    const discount = Math.min(subtotal, Math.round(cappedDiscount * 100) / 100);

    return { coupon, discount };
  }

  async redeem(tx: Prisma.TransactionClient, couponId: string, orderId: string, discount: number, customerId?: string | null) {
    const id = crypto.randomUUID();
    await tx.$executeRaw`
      INSERT INTO "coupon_redemptions" ("id", "couponId", "orderId", "customerId", "discount", "createdAt")
      VALUES (${id}, ${couponId}, ${orderId}, ${customerId ?? null}, ${discount}, NOW())
    `;
  }
}

export const couponService = new CouponService();
