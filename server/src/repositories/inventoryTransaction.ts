import prisma from '../config/prisma';
import { BaseRepository, PaginationOptions, PaginatedResult } from './base';
import { InventoryTransaction, InventoryTransactionType, Prisma } from '@prisma/client';

export class InventoryTransactionRepository extends BaseRepository<InventoryTransaction, Prisma.InventoryTransactionCreateInput, Prisma.InventoryTransactionUpdateInput, Prisma.InventoryTransactionWhereInput> {
  protected model = prisma.inventoryTransaction;

  async findByIngredient(ingredientId: string, options: PaginationOptions = {}): Promise<PaginatedResult<InventoryTransaction>> {
    return this.findMany({
      ...options,
      where: { ingredientId, ...options.where },
    });
  }

  async findByType(type: InventoryTransactionType, options: PaginationOptions = {}): Promise<PaginatedResult<InventoryTransaction>> {
    return this.findMany({
      ...options,
      where: { type, ...options.where },
    });
  }

  async findByReference(referenceId: string, referenceType: string): Promise<InventoryTransaction[]> {
    return this.model.findMany({
      where: { referenceId, referenceType },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getIngredientConsumption(ingredientId: string, dateFrom: Date, dateTo: Date): Promise<number> {
    const result = await this.model.aggregate({
      where: {
        ingredientId,
        type: InventoryTransactionType.ORDER_CONSUMPTION,
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      _sum: { quantity: true },
    });
    return Number(result._sum.quantity ?? 0);
  }
}

export const inventoryTransactionRepository = new InventoryTransactionRepository();