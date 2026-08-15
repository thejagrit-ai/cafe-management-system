import prisma from '../config/prisma';
import { NotFoundError, BadRequestError } from '../utils/errors';

export interface TierInfo {
  name: string;
  minPoints: number;
  multiplier: number;
  color: string;
  badge: string;
  perks: string[];
}

export const LOYALTY_TIERS: Record<string, TierInfo> = {
  BRONZE: {
    name: 'Bronce',
    minPoints: 0,
    multiplier: 1.0,
    color: '#CD7F32',
    badge: '🥉',
    perks: ['1 punto por cada $100 COP', 'Regalo de bienvenida'],
  },
  SILVER: {
    name: 'Plata',
    minPoints: 500,
    multiplier: 1.2,
    color: '#C0C0C0',
    badge: '🥈',
    perks: ['1.2x puntos acumulados', 'Bebida de cortesía en cumpleaños', 'Acceso a promociones exclusivas'],
  },
  GOLD: {
    name: 'Oro',
    minPoints: 1500,
    multiplier: 1.5,
    color: '#FFD700',
    badge: '🥇',
    perks: ['1.5x puntos acumulados', 'Envío a domicilio gratis', 'Prioridad en preparación de pedidos'],
  },
  PLATINUM: {
    name: 'Platino VIP',
    minPoints: 3000,
    multiplier: 2.0,
    color: '#E5E4E2',
    badge: '💎',
    perks: ['2.0x puntos acumulados', 'Envíos gratis ilimitados', 'Catas de café exclusivas', 'Atención personalizada'],
  },
};

// 1 point = $10 COP discount
export const POINT_REDEMPTION_VALUE = 10;
// Base points rate: 1 point per $100 COP
export const BASE_SPEND_PER_POINT = 100;

export class LoyaltyService {
  calculateTier(points: number): string {
    if (points >= LOYALTY_TIERS.PLATINUM.minPoints) return 'PLATINUM';
    if (points >= LOYALTY_TIERS.GOLD.minPoints) return 'GOLD';
    if (points >= LOYALTY_TIERS.SILVER.minPoints) return 'SILVER';
    return 'BRONZE';
  }

  getNextTierInfo(points: number): { nextTier: string | null; pointsNeeded: number; progressPct: number } {
    if (points < LOYALTY_TIERS.SILVER.minPoints) {
      const needed = LOYALTY_TIERS.SILVER.minPoints - points;
      const progress = Math.min(Math.round((points / LOYALTY_TIERS.SILVER.minPoints) * 100), 100);
      return { nextTier: 'Plata', pointsNeeded: needed, progressPct: progress };
    }
    if (points < LOYALTY_TIERS.GOLD.minPoints) {
      const diff = LOYALTY_TIERS.GOLD.minPoints - LOYALTY_TIERS.SILVER.minPoints;
      const current = points - LOYALTY_TIERS.SILVER.minPoints;
      const needed = LOYALTY_TIERS.GOLD.minPoints - points;
      const progress = Math.min(Math.round((current / diff) * 100), 100);
      return { nextTier: 'Oro', pointsNeeded: needed, progressPct: progress };
    }
    if (points < LOYALTY_TIERS.PLATINUM.minPoints) {
      const diff = LOYALTY_TIERS.PLATINUM.minPoints - LOYALTY_TIERS.GOLD.minPoints;
      const current = points - LOYALTY_TIERS.GOLD.minPoints;
      const needed = LOYALTY_TIERS.PLATINUM.minPoints - points;
      const progress = Math.min(Math.round((current / diff) * 100), 100);
      return { nextTier: 'Platino VIP', pointsNeeded: needed, progressPct: progress };
    }
    return { nextTier: null, pointsNeeded: 0, progressPct: 100 };
  }

  async getCustomerLoyalty(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        loyaltyTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!customer) throw new NotFoundError('Customer');

    const points = customer.loyaltyPoints;
    const tierKey = customer.loyaltyTier || this.calculateTier(points);
    const tier = LOYALTY_TIERS[tierKey] || LOYALTY_TIERS.BRONZE;
    const nextTierInfo = this.getNextTierInfo(points);

    return {
      points,
      tier: tierKey,
      tierDetails: tier,
      monetaryValue: points * POINT_REDEMPTION_VALUE,
      nextTier: nextTierInfo,
      transactions: customer.loyaltyTransactions,
      allTiers: LOYALTY_TIERS,
    };
  }

  async earnPointsForOrder(customerId: string, orderId: string, subtotal: number): Promise<number> {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return 0;

    const currentTier = LOYALTY_TIERS[customer.loyaltyTier] || LOYALTY_TIERS.BRONZE;
    const basePoints = Math.floor(subtotal / BASE_SPEND_PER_POINT);
    const totalEarned = Math.round(basePoints * currentTier.multiplier);

    if (totalEarned <= 0) return 0;

    const newBalance = customer.loyaltyPoints + totalEarned;
    const updatedTier = this.calculateTier(newBalance);

    await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: {
          loyaltyPoints: newBalance,
          loyaltyTier: updatedTier,
        },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          customerId,
          orderId,
          points: totalEarned,
          type: 'EARNED',
          description: `Puntos ganados por compra (${totalEarned} pts @ ${currentTier.name})`,
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { loyaltyPointsEarned: totalEarned },
      }),
    ]);

    return totalEarned;
  }

  async redeemPoints(customerId: string, pointsToRedeem: number, orderId?: string): Promise<number> {
    if (pointsToRedeem <= 0) return 0;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundError('Customer');

    if (customer.loyaltyPoints < pointsToRedeem) {
      throw new BadRequestError(`Saldo de puntos insuficiente. Tienes ${customer.loyaltyPoints} puntos disponibles.`);
    }

    const discountAmount = pointsToRedeem * POINT_REDEMPTION_VALUE;
    const newBalance = customer.loyaltyPoints - pointsToRedeem;
    const updatedTier = this.calculateTier(newBalance);

    await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: {
          loyaltyPoints: newBalance,
          loyaltyTier: updatedTier,
        },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          customerId,
          orderId,
          points: -pointsToRedeem,
          type: 'REDEEMED',
          description: `Redención de puntos en comanda ($${discountAmount.toLocaleString()} COP)`,
        },
      }),
    ]);

    return discountAmount;
  }

  async adjustPoints(customerId: string, points: number, reason: string): Promise<void> {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundError('Customer');

    const newBalance = Math.max(customer.loyaltyPoints + points, 0);
    const updatedTier = this.calculateTier(newBalance);

    await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: {
          loyaltyPoints: newBalance,
          loyaltyTier: updatedTier,
        },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          customerId,
          points,
          type: points > 0 ? 'BONUS' : 'ADJUSTED',
          description: reason || 'Ajuste administrativo de puntos',
        },
      }),
    ]);
  }
}

export const loyaltyService = new LoyaltyService();
