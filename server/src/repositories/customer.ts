import prisma from '../config/prisma';
import { BaseRepository, PaginationOptions, PaginatedResult } from './base';
import { Customer, Prisma } from '@prisma/client';

export class CustomerRepository extends BaseRepository<Customer, Prisma.CustomerCreateInput, Prisma.CustomerUpdateInput, Prisma.CustomerWhereInput> {
  protected model = prisma.customer;

  /**
   * Customers with their order count and lifetime spend.
   *
   * Built with the Prisma query API rather than raw SQL: the previous raw
   * version concatenated caller-supplied filter values straight into the
   * statement (an injection vector) and referenced table and column names that
   * do not exist, so the endpoint returned 500 for every request.
   */
  async findWithStats(
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<Customer & { _count: { orders: number }; totalSpent: number }>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', where } = options;
    const skip = (page - 1) * limit;

    // Only real, orderable columns are accepted; anything else falls back so a
    // caller cannot make Prisma throw with an arbitrary field name.
    const SORTABLE = ['createdAt', 'updatedAt', 'firstName', 'lastName'] as const;
    const orderByField = (SORTABLE as readonly string[]).includes(sortBy) ? sortBy : 'createdAt';

    const [customers, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder },
        include: {
          user: { select: { id: true, email: true, isActive: true, createdAt: true } },
          _count: { select: { orders: true } },
        },
      }),
      this.model.count({ where }),
    ]);

    // Cancelled orders are excluded: they were never revenue.
    const spendRows = await prisma.order.groupBy({
      by: ['customerId'],
      where: {
        customerId: { in: customers.map((c) => c.id) },
        status: { not: 'CANCELLED' },
      },
      _sum: { total: true },
    });

    const spentByCustomer = new Map(
      spendRows.map((row) => [row.customerId, Number(row._sum.total ?? 0)])
    );

    return {
      data: customers.map((customer) => ({
        ...customer,
        totalSpent: spentByCustomer.get(customer.id) ?? 0,
      })) as (Customer & { _count: { orders: number }; totalSpent: number })[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const customerRepository = new CustomerRepository();