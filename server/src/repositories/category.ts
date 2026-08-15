import prisma from '../config/prisma';
import { BaseRepository, PaginationOptions, PaginatedResult } from './base';
import { Category, Prisma } from '@prisma/client';

export class CategoryRepository extends BaseRepository<Category, Prisma.CategoryCreateInput, Prisma.CategoryUpdateInput, Prisma.CategoryWhereInput> {
  protected model = prisma.category;

  async findAllActive(): Promise<Category[]> {
    return this.model.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findWithProductCount(options: PaginationOptions = {}): Promise<PaginatedResult<Category & { _count: { products: number } }>> {
    const { page = 1, limit = 10, sortBy = 'sortOrder', sortOrder = 'asc', where } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { _count: { select: { products: true } } },
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

  async getMaxDisplayOrder(): Promise<number> {
    const result = await this.model.aggregate({
      _max: { sortOrder: true },
    });
    return (result._max.sortOrder ?? 0) + 1;
  }
}

export const categoryRepository = new CategoryRepository();