import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function giftCardCode() {
  return `GC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export class WalletService {
  async getWallet(customerId: string) {
    const rows = await prisma.$queryRaw<Array<{ balance: number }>>`
      SELECT COALESCE(SUM(CASE WHEN "type" = 'DEBIT' THEN -"amount" ELSE "amount" END), 0)::float AS balance
      FROM "wallet_transactions"
      WHERE "customerId" = ${customerId}
    `;
    const transactions = await prisma.$queryRaw`
      SELECT * FROM "wallet_transactions"
      WHERE "customerId" = ${customerId}
      ORDER BY "createdAt" DESC
      LIMIT 20
    `;
    return { balance: Number(rows[0]?.balance ?? 0), transactions };
  }

  async listGiftCards(params: { page: number; limit: number; status?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const where = params.status ? Prisma.sql`WHERE "status"::text = ${params.status}` : Prisma.empty;
    const rows = await prisma.$queryRaw`
      SELECT * FROM "gift_cards"
      ${where}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const totalRows = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "gift_cards" ${where}`;
    const total = Number(totalRows[0]?.count ?? 0);
    return { data: rows as any[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createGiftCard(data: { code?: string; initialValue: number; purchaserName?: string; recipientEmail?: string; expiresAt?: string }) {
    if (data.initialValue <= 0) throw new BadRequestError('Gift card value must be positive');
    const code = normalizeCode(data.code || giftCardCode());
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "gift_cards" WHERE "code" = ${code}`;
    if (existing.length) throw new ConflictError('Gift card code already exists');

    const rows = await prisma.$queryRaw`
      INSERT INTO "gift_cards" (
        "id", "code", "initialValue", "remainingValue", "status", "purchaserName", "recipientEmail", "expiresAt", "createdAt", "updatedAt"
      )
      VALUES (
        ${crypto.randomUUID()}, ${code}, ${data.initialValue}, ${data.initialValue}, 'ACTIVE',
        ${data.purchaserName ?? null}, ${data.recipientEmail ?? null},
        ${data.expiresAt ? new Date(data.expiresAt) : null}, NOW(), NOW()
      )
      RETURNING *
    `;
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async redeemGiftCard(customerId: string, code: string) {
    const normalized = normalizeCode(code);
    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>`
        SELECT * FROM "gift_cards" WHERE "code" = ${normalized} LIMIT 1
      `;
      const card = rows[0];
      if (!card) throw new NotFoundError('Gift card');
      if (card.status !== 'ACTIVE') throw new BadRequestError('Gift card is not active');
      if (card.expiresAt && new Date(card.expiresAt) < new Date()) throw new BadRequestError('Gift card has expired');
      const amount = Number(card.remainingValue ?? 0);
      if (amount <= 0) throw new BadRequestError('Gift card has no remaining value');

      await tx.$executeRaw`
        UPDATE "gift_cards"
        SET "remainingValue" = 0,
            "status" = 'REDEEMED',
            "redeemedByCustomerId" = ${customerId},
            "redeemedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "id" = ${card.id}
      `;
      await tx.$executeRaw`
        INSERT INTO "wallet_transactions" ("id", "customerId", "type", "amount", "source", "referenceId", "note", "createdAt")
        VALUES (${crypto.randomUUID()}, ${customerId}, 'CREDIT', ${amount}, 'GIFT_CARD', ${card.id}, ${`Redeemed gift card ${normalized}`}, NOW())
      `;

    });

    return this.getWallet(customerId);
  }
}

export const walletService = new WalletService();
