import prisma from '../config/prisma';
import { BaseRepository, PaginationOptions, PaginatedResult } from './base';
import { Order, OrderStatus, Prisma } from '@prisma/client';

export class OrderRepository extends BaseRepository<Order, Prisma.OrderCreateInput, Prisma.OrderUpdateInput, Prisma.OrderWhereInput> {
  protected model = prisma.order;

  /**
   * Looks an order up by its human-facing number.
   *
   * Returns the same shape as findWithDetails on purpose: this is what the
   * order-confirmation and tracking screens call, and they render the line
   * items, the customer and the delivery address. Without the includes the
   * endpoint answered 200 with those relations missing, and the page blew up
   * dereferencing them.
   */
  async findByOrderNumber(
    orderNumber: string
  ): Promise<(Order & { items: any[]; customer: any; employee: any; address: any; payments: any[] }) | null> {
    return this.model.findUnique({
      where: { orderNumber },
      include: {
        items: { include: { product: true } },
        customer: { include: { user: true } },
        employee: { include: { user: true } },
        address: true,
        payments: true,
      },
    });
  }

  async findWithDetails(id: string): Promise<(Order & { items: any[]; customer: any; employee: any; address: any; payments: any[] }) | null> {
    return this.model.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: { include: { user: true } },
        employee: { include: { user: true } },
        address: true,
        payments: true,
      },
    });
  }

  /**
   * Paginated list with the relations every list screen renders.
   *
   * The base implementation selects no relations, which left the admin order
   * table showing "Cliente en barra" for every row, the kitchen queue showing
   * a blank line where the drink names belong, and the customer's order
   * history reporting "0 items" for each visit.
   *
   * Line items are included with their product because the barista screen
   * lists what to make; the customer's user record comes along for the email
   * shown beside the name.
   */
  override async findMany(
    options: PaginationOptions & { where?: Prisma.OrderWhereInput }
  ): Promise<PaginatedResult<Order>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', where } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          items: { include: { product: true } },
          customer: { include: { user: true } },
        },
      }),
      this.model.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByCustomer(customerId: string, options: PaginationOptions = {}): Promise<PaginatedResult<Order>> {
    return this.findMany({
      ...options,
      where: { customerId, ...options.where },
    });
  }

  async findByStatus(status: OrderStatus, options: PaginationOptions = {}): Promise<PaginatedResult<Order>> {
    return this.findMany({
      ...options,
      where: { status, ...options.where },
    });
  }

  async findPendingOrders(): Promise<(Order & { items: any[]; customer: any })[]> {
    return this.model.findMany({
      where: { status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING] } },
      orderBy: { createdAt: 'asc' },
      include: { items: { include: { product: true } }, customer: true },
    });
  }

  async getTodaysStats(): Promise<{ totalOrders: number; totalRevenue: number; pendingOrders: number; completedOrders: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalOrders, totalRevenue, pendingOrders, completedOrders] = await Promise.all([
      this.model.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),
      this.model.aggregate({
        where: { createdAt: { gte: today, lt: tomorrow }, status: { not: OrderStatus.CANCELLED } },
        _sum: { total: true },
      }),
      this.model.count({
        where: { status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING] } },
      }),
      this.model.count({
        where: { status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] }, createdAt: { gte: today, lt: tomorrow } },
      }),
    ]);

    return {
      totalOrders,
      totalRevenue: Number(totalRevenue._sum.total ?? 0),
      pendingOrders,
      completedOrders,
    };
  }

  async getRevenueByDateRange(dateFrom: Date, dateTo: Date): Promise<number> {
    const result = await this.model.aggregate({
      where: { createdAt: { gte: dateFrom, lte: dateTo }, status: { not: OrderStatus.CANCELLED } },
      _sum: { total: true },
    });
    return Number(result._sum?.total ?? 0);
  }
}

export const orderRepository = new OrderRepository();