import { paymentRepository } from '../repositories/payment';
import { orderRepository } from '../repositories/order';
import { createAuditLog, getAuditDataFromRequest } from '../utils/audit';
import { NotFoundError, ConflictError } from '../utils/errors';
import { AuthenticatedRequest } from '../types';
import { PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client';
import prisma from '../config/prisma';

/**
 * ONLINE payments are only settled once a payment provider confirms them, so
 * they are recorded as PENDING and promoted by `updateStatus` when that
 * confirmation arrives. The counter methods are recorded by a staff member who
 * has physically taken the money, so they are settled on creation.
 */
function initialStatusFor(method: PaymentMethod): PaymentStatus {
  return method === PaymentMethod.ONLINE ? PaymentStatus.PENDING : PaymentStatus.PAID;
}

export class PaymentService {
  async create(data: { orderId: string; amount: number; method: PaymentMethod; transactionId?: string; referenceNumber?: string }, req: AuthenticatedRequest) {
    const order = await orderRepository.findById(data.orderId);
    if (!order) {
      throw new NotFoundError('Order');
    }

    const existingPayments = await paymentRepository.findByOrderId(data.orderId);
    const totalPaid = existingPayments
      .filter(p => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    if (totalPaid + data.amount > Number(order.total)) {
      throw new ConflictError('Payment amount exceeds order total');
    }

    const status = initialStatusFor(data.method);

    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          orderId: data.orderId,
          amount: data.amount,
          method: data.method,
          status,
          transactionId: data.transactionId,
          referenceNumber: data.referenceNumber,
          paidAt: status === PaymentStatus.PAID ? new Date() : null,
        },
      });

      const allPayments = [...existingPayments, newPayment];
      const newTotalPaid = allPayments
        .filter(p => p.status === PaymentStatus.PAID)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      if (newTotalPaid >= Number(order.total)) {
        await tx.order.update({
          where: { id: data.orderId },
          data: { status: OrderStatus.COMPLETED, completedAt: new Date() },
        });
      }

      await createAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Payment',
        entityId: newPayment.id,
        newData: newPayment,
        ...getAuditDataFromRequest(req),
      });

      return newPayment;
    });

    return payment;
  }

  async findAll(params: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: PaymentStatus;
    method?: PaymentMethod;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.method) where.method = params.method;
    if (params.dateFrom || params.dateTo) {
      where.paidAt = {};
      if (params.dateFrom) where.paidAt.gte = new Date(params.dateFrom);
      if (params.dateTo) where.paidAt.lte = new Date(params.dateTo);
    }
    if (params.search) {
      where.OR = [
        { transactionId: { contains: params.search, mode: 'insensitive' } },
        { referenceNumber: { contains: params.search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              type: true,
              tableNumber: true,
              total: true,
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  user: {
                    select: {
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async exportAll(params: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: PaymentStatus;
    method?: PaymentMethod;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.method) where.method = params.method;
    if (params.dateFrom || params.dateTo) {
      where.paidAt = {};
      if (params.dateFrom) where.paidAt.gte = new Date(params.dateFrom);
      if (params.dateTo) where.paidAt.lte = new Date(params.dateTo);
    }
    if (params.search) {
      where.OR = [
        { transactionId: { contains: params.search, mode: 'insensitive' } },
        { referenceNumber: { contains: params.search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';

    return prisma.payment.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            type: true,
            tableNumber: true,
            total: true,
            customer: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findByOrderId(orderId: string) {
    return paymentRepository.findByOrderId(orderId);
  }

  /**
   * Settles, fails or refunds an existing payment. This is the hook a real
   * payment provider's webhook would call once it confirms an ONLINE payment.
   */
  async updateStatus(
    id: string,
    data: { status: PaymentStatus; transactionId?: string },
    req: AuthenticatedRequest
  ) {
    const existing = await paymentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Payment');
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: data.status,
        transactionId: data.transactionId ?? existing.transactionId,
        // Stamp the settlement time when it first becomes PAID; keep the
        // original timestamp on any later transition (e.g. a refund).
        paidAt:
          data.status === PaymentStatus.PAID ? (existing.paidAt ?? new Date()) : existing.paidAt,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE_STATUS',
      entity: 'Payment',
      entityId: id,
      oldData: { status: existing.status },
      newData: { status: updated.status },
      ...getAuditDataFromRequest(req),
    });

    return updated;
  }

  async getTotalsByMethod(dateFrom?: Date, dateTo?: Date) {
    return paymentRepository.getTotalByMethod(dateFrom, dateTo);
  }
}

export const paymentService = new PaymentService();