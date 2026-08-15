import prisma from '../config/prisma';
import { BaseRepository, PaginationOptions, PaginatedResult } from './base';
import { Payment, PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';

export class PaymentRepository extends BaseRepository<Payment, Prisma.PaymentCreateInput, Prisma.PaymentUpdateInput, Prisma.PaymentWhereInput> {
  protected model = prisma.payment;

  async findByOrderId(orderId: string): Promise<Payment[]> {
    return this.model.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByStatus(status: PaymentStatus, options: PaginationOptions = {}): Promise<PaginatedResult<Payment>> {
    return this.findMany({
      ...options,
      where: { status, ...options.where },
    });
  }

  async getTotalByMethod(dateFrom?: Date, dateTo?: Date): Promise<Record<PaymentMethod, number>> {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.paidAt = {};
      if (dateFrom) where.paidAt.gte = dateFrom;
      if (dateTo) where.paidAt.lte = dateTo;
    }

    const results = await this.model.groupBy({
      by: ['method'],
      where: { status: PaymentStatus.PAID, ...where },
      _sum: { amount: true },
    });

    const totals: Record<PaymentMethod, number> = {
      CASH: 0,
      CARD: 0,
      UPI: 0,
      ONLINE: 0,
    };

    results.forEach((r) => {
      totals[r.method] = Number(r._sum.amount ?? 0);
    });

    return totals;
  }
}

export const paymentRepository = new PaymentRepository();