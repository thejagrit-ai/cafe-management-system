import prisma from '../config/prisma';
import { BaseRepository, PaginationOptions, PaginatedResult } from './base';
import { Ingredient, Prisma } from '@prisma/client';

export class IngredientRepository extends BaseRepository<Ingredient, Prisma.IngredientCreateInput, Prisma.IngredientUpdateInput, Prisma.IngredientWhereInput> {
  protected model = prisma.ingredient;

  async findLowStock(): Promise<Ingredient[]> {
    return this.model.findMany({
      where: {
        isActive: true,
        currentStock: { lte: prisma.ingredient.fields.minStock },
      },
      include: { supplier: true },
    });
  }

  async findWithSupplier(options: PaginationOptions = {}): Promise<PaginatedResult<Ingredient & { supplier: any }>> {
    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc', where } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { supplier: true },
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

  async updateStock(id: string, quantity: number): Promise<Ingredient> {
    return this.model.update({
      where: { id },
      data: { currentStock: { increment: quantity } },
    });
  }

  async setStock(id: string, quantity: number): Promise<Ingredient> {
    return this.model.update({
      where: { id },
      data: { currentStock: quantity },
    });
  }
}

export const ingredientRepository = new IngredientRepository();