import prisma from '../config/prisma';
import { BaseRepository, PaginationOptions, PaginatedResult } from './base';
import { Employee, Prisma } from '@prisma/client';

export class EmployeeRepository extends BaseRepository<Employee, Prisma.EmployeeCreateInput, Prisma.EmployeeUpdateInput, Prisma.EmployeeWhereInput> {
  protected model = prisma.employee;

  /**
   * The email lives on the linked User, not on Employee, and the staff table
   * renders a column for it. Without this include that column was blank for
   * every row — and searching by email worked while the result was unreadable.
   */
  override async findMany(
    options: PaginationOptions & { where?: Prisma.EmployeeWhereInput }
  ): Promise<PaginatedResult<Employee>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', where } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { user: true },
      }),
      this.model.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findActive(): Promise<Employee[]> {
    return this.model.findMany({
      where: { isActive: true },
      include: { user: true },
    });
  }
}

export const employeeRepository = new EmployeeRepository();