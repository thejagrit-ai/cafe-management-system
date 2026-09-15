import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { config } from '../config';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { mailer } from '../utils/mailer';

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function giftCardCode() {
  return `GC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatGiftCardCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(value);
}

function giftCardRedeemUrl(code: string) {
  const url = new URL('/account', config.clientUrl.replace(/\/+$/, ''));
  url.searchParams.set('giftCard', code);
  return url.toString();
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

  async createGiftCard(data: {
    code?: string;
    initialValue: number;
    purchaserName?: string;
    recipientName?: string;
    recipientEmail?: string;
    message?: string;
    expiresAt?: string;
  }) {
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
    const card = Array.isArray(rows) ? rows[0] : rows;

    if (data.recipientEmail) {
      await this.sendGiftCardEmail({
        to: data.recipientEmail,
        code,
        amount: data.initialValue,
        purchaserName: data.purchaserName,
        recipientName: data.recipientName,
        message: data.message,
        expiresAt: data.expiresAt,
      }).catch((error) => {
        console.error('Could not send gift card email:', error);
      });
    }

    return card;
  }

  private async sendGiftCardEmail(data: {
    to: string;
    code: string;
    amount: number;
    purchaserName?: string;
    recipientName?: string;
    message?: string;
    expiresAt?: string;
  }) {
    const amount = formatGiftCardCurrency(data.amount);
    const purchaser = data.purchaserName?.trim() || 'Someone special';
    const recipient = data.recipientName?.trim() || 'there';
    const message = data.message?.trim() || 'Enjoy a handcrafted coffee moment at The Coffee Bean.';
    const redeemUrl = giftCardRedeemUrl(data.code);
    const expiry = data.expiresAt
      ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(data.expiresAt))
      : 'No expiry date';

    const text = [
      `Hi ${recipient},`,
      '',
      `${purchaser} sent you a ${amount} gift card for The Coffee Bean.`,
      message,
      '',
      `Gift card code: ${data.code}`,
      `Expires: ${expiry}`,
      `Redeem online: ${redeemUrl}`,
    ].join('\n');

    const safeRecipient = escapeHtml(recipient);
    const safePurchaser = escapeHtml(purchaser);
    const safeMessage = escapeHtml(message);
    const safeCode = escapeHtml(data.code);
    const safeExpiry = escapeHtml(expiry);

    await mailer.send({
      to: data.to,
      subject: `${purchaser} sent you a Coffee Bean gift card`,
      text,
      html: `
        <div style="margin:0;padding:32px;background:#f7f2ea;font-family:Inter,Arial,sans-serif;color:#271b12;">
          <div style="max-width:640px;margin:0 auto;">
            <p style="margin:0 0 14px;color:#7a5b40;font-size:13px;letter-spacing:.18em;text-transform:uppercase;">The Coffee Bean</p>
            <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:34px;line-height:1.08;color:#1f160f;">A premium coffee gift is waiting for you.</h1>
            <div style="border-radius:28px;padding:2px;background:linear-gradient(135deg,#d8b36a,#26190f 42%,#f2d58d);box-shadow:0 24px 60px rgba(39,27,18,.22);">
              <div style="border-radius:26px;padding:30px;background:radial-gradient(circle at 12% 18%,rgba(255,255,255,.25),transparent 24%),linear-gradient(135deg,#21140c,#5a3420 54%,#b88944);color:#fff;">
                <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;">
                  <div>
                    <p style="margin:0;color:#f4d796;font-size:12px;letter-spacing:.22em;text-transform:uppercase;">Digital gift card</p>
                    <p style="margin:12px 0 0;font-family:Georgia,serif;font-size:42px;line-height:1;font-weight:700;">${amount}</p>
                  </div>
                  <div style="border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:8px 13px;color:#f8e3ad;font-size:12px;">Premium</div>
                </div>
                <p style="margin:34px 0 10px;color:#f7e8c2;font-size:13px;">Gift code</p>
                <p style="margin:0;font-size:24px;letter-spacing:.12em;font-weight:800;">${safeCode}</p>
                <div style="margin-top:26px;padding-top:18px;border-top:1px solid rgba(255,255,255,.22);display:flex;justify-content:space-between;gap:18px;color:#f7e8c2;font-size:13px;">
                  <span>From ${safePurchaser}</span>
                  <span>${safeExpiry}</span>
                </div>
              </div>
            </div>
            <div style="margin-top:24px;border-radius:20px;background:#fff;padding:24px;box-shadow:0 12px 30px rgba(39,27,18,.08);">
              <p style="margin:0 0 10px;font-weight:700;">Hi ${safeRecipient},</p>
              <p style="margin:0 0 18px;color:#604934;line-height:1.7;">${safeMessage}</p>
              <a href="${redeemUrl}" style="display:inline-block;border-radius:999px;background:#7c4eee;color:#fff;padding:13px 18px;text-decoration:none;font-weight:800;font-size:13px;">Redeem online</a>
              <p style="margin:18px 0 0;color:#8a725d;font-size:12px;line-height:1.6;">Use this code in your customer wallet or share it with our staff in-store.</p>
            </div>
          </div>
        </div>
      `,
    });
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
