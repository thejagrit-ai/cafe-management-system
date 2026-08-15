import prisma from '../config/prisma';
import { BaseRepository, PaginationOptions, PaginatedResult } from './base';
import { Product, Prisma, ProductAvailability } from '@prisma/client';

export class ProductRepository extends BaseRepository<Product, Prisma.ProductCreateInput, Prisma.ProductUpdateInput, Prisma.ProductWhereInput> {
  protected model = prisma.product;

  override async findMany(options: PaginationOptions & { where?: Prisma.ProductWhereInput; include?: any }): Promise<PaginatedResult<Product>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', where } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { category: true },
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

  async findAvailable(options: PaginationOptions = {}): Promise<PaginatedResult<Product>> {
    return this.findMany({
      ...options,
      where: { availability: ProductAvailability.AVAILABLE, ...options.where },
    });
  }

  async findFeatured(limit: number = 10): Promise<Product[]> {
    return this.model.findMany({
      where: { isFeatured: true, availability: ProductAvailability.AVAILABLE },
      take: limit,
      orderBy: { sortOrder: 'asc' },
      include: { category: true },
    });
  }

  async findPopular(limit: number = 10): Promise<Product[]> {
    return this.model.findMany({
      where: { isPopular: true, availability: ProductAvailability.AVAILABLE },
      take: limit,
      orderBy: { sortOrder: 'asc' },
      include: { category: true },
    });
  }

  async findByCategory(categoryId: string, options: PaginationOptions = {}): Promise<PaginatedResult<Product>> {
    return this.findMany({
      ...options,
      where: { categoryId, ...options.where },
    });
  }

  async findWithDetails(id: string): Promise<(Product & { category: any; recipe: any }) | null> {
    return this.model.findUnique({
      where: { id },
      include: { category: true, recipe: { include: { ingredients: { include: { ingredient: true } } } } },
    });
  }

  async search(query: string, options: PaginationOptions = {}): Promise<PaginatedResult<Product>> {
    return this.findMany({
      ...options,
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
        ...options.where,
      },
    });
  }
}

export const productRepository = new ProductRepository();