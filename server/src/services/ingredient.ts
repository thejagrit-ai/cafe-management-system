import { ingredientRepository } from '../repositories/ingredient';
import { supplierRepository } from '../repositories/supplier';
import { inventoryTransactionRepository } from '../repositories/inventoryTransaction';
import { createAuditLog, getAuditDataFromRequest } from '../utils/audit';
import { NotFoundError, ConflictError } from '../utils/errors';
import { AuthenticatedRequest } from '../types';
import { InventoryTransactionType } from '@prisma/client';
import { eventHub } from '../utils/eventHub';
import prisma from '../config/prisma';

export class IngredientService {
  async create(data: { name: string; sku: string; unit: string; currentStock: number; minStock: number; maxStock: number; costPerUnit: number; supplierId?: string; isActive?: boolean }, req: AuthenticatedRequest) {
    const existingSku = await prisma.ingredient.findUnique({ where: { sku: data.sku } });
    if (existingSku) {
      throw new ConflictError('SKU already exists');
    }

    if (data.supplierId) {
      const supplier = await supplierRepository.findById(data.supplierId);
      if (!supplier) {
        throw new NotFoundError('Supplier');
      }
    }

    const ingredient = await prisma.$transaction(async (tx) => {
      const newIngredient = await tx.ingredient.create({
        data: {
          name: data.name,
          sku: data.sku,
          unit: data.unit,
          currentStock: data.currentStock,
          minStock: data.minStock,
          maxStock: data.maxStock,
          costPerUnit: data.costPerUnit,
          supplierId: data.supplierId,
          isActive: data.isActive ?? true,
        },
      });

      if (data.currentStock > 0) {
        await tx.inventoryTransaction.create({
          data: {
            ingredientId: newIngredient.id,
            type: InventoryTransactionType.RECEIVED,
            quantity: data.currentStock,
            unitCost: data.costPerUnit,
            totalCost: data.currentStock * data.costPerUnit,
            referenceType: 'INITIAL_STOCK',
            notes: 'Initial stock',
            performedById: req.user?.id,
          },
        });
      }

      await createAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Ingredient',
        entityId: newIngredient.id,
        newData: newIngredient,
        ...getAuditDataFromRequest(req),
      });

      return newIngredient;
    });

    eventHub.broadcast('INVENTORY_UPDATED', {
      id: ingredient.id,
      name: ingredient.name,
      currentStock: ingredient.currentStock,
      isLowStock: Number(ingredient.currentStock) <= Number(ingredient.minStock),
    }, ['ADMIN', 'STAFF']);

    return ingredient;
  }

  async findAll(params: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string; isActive?: boolean; lowStock?: boolean }) {
    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { sku: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.isActive !== undefined) where.isActive = params.isActive;
    if (params.lowStock) {
      where.currentStock = { lte: prisma.ingredient.fields.minStock };
    }

    return ingredientRepository.findWithSupplier({
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      where,
    });
  }

  async findById(id: string) {
    const ingredient = await ingredientRepository.findById(id);
    if (!ingredient) {
      throw new NotFoundError('Ingredient');
    }
    return ingredient;
  }

  async update(id: string, data: any, req: AuthenticatedRequest) {
    const existing = await ingredientRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Ingredient');
    }

    if (data.sku && data.sku !== existing.sku) {
      const existingSku = await prisma.ingredient.findUnique({ where: { sku: data.sku } });
      if (existingSku) {
        throw new ConflictError('SKU already exists');
      }
    }

    if (data.supplierId) {
      const supplier = await supplierRepository.findById(data.supplierId);
      if (!supplier) {
        throw new NotFoundError('Supplier');
      }
    }

    const ingredient = await prisma.$transaction(async (tx) => {
      const updated = await tx.ingredient.update({
        where: { id },
        data,
        include: { supplier: true },
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'Ingredient',
        entityId: id,
        oldData: existing,
        newData: updated,
        ...getAuditDataFromRequest(req),
      });

      return updated;
    });

    eventHub.broadcast('INVENTORY_UPDATED', {
      id: ingredient.id,
      name: ingredient.name,
      currentStock: ingredient.currentStock,
      isLowStock: Number(ingredient.currentStock) <= Number(ingredient.minStock),
    }, ['ADMIN', 'STAFF']);

    return ingredient;
  }

  async adjustStock(id: string, data: { type: InventoryTransactionType; quantity: number; unitCost?: number; notes?: string }, req: AuthenticatedRequest) {
    const ingredient = await ingredientRepository.findById(id);
    if (!ingredient) {
      throw new NotFoundError('Ingredient');
    }

    let newStock = Number(ingredient.currentStock);
    if (data.type === InventoryTransactionType.RECEIVED || data.type === InventoryTransactionType.ADDED) {
      newStock += data.quantity;
    } else if (data.type === InventoryTransactionType.DEDUCTED || data.type === InventoryTransactionType.WASTE || data.type === InventoryTransactionType.DAMAGED) {
      newStock -= data.quantity;
      if (newStock < 0) {
        throw new Error('Insufficient stock');
      }
    } else if (data.type === InventoryTransactionType.ADJUSTMENT) {
      newStock = data.quantity;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.ingredient.update({
        where: { id },
        data: { currentStock: newStock },
        include: { supplier: true },
      });

      await tx.inventoryTransaction.create({
        data: {
          ingredientId: id,
          type: data.type,
          quantity: data.quantity,
          unitCost: data.unitCost ?? Number(ingredient.costPerUnit),
          totalCost: data.quantity * (data.unitCost ?? Number(ingredient.costPerUnit)),
          notes: data.notes,
          performedById: req.user?.id,
        },
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'STOCK_ADJUSTMENT',
        entity: 'Ingredient',
        entityId: id,
        oldData: { currentStock: ingredient.currentStock },
        newData: { currentStock: updated.currentStock, adjustmentType: data.type, adjustmentQuantity: data.quantity },
        ...getAuditDataFromRequest(req),
      });

      return updated;
    });

    eventHub.broadcast('INVENTORY_UPDATED', {
      id: result.id,
      name: result.name,
      currentStock: result.currentStock,
      isLowStock: Number(result.currentStock) <= Number(result.minStock),
    }, ['ADMIN', 'STAFF']);

    return result;
  }

  async getLowStock() {
    return ingredientRepository.findLowStock();
  }

  async getTransactions(ingredientId: string, params: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; type?: string; dateFrom?: string; dateTo?: string }) {
    const where: any = { ingredientId };
    if (params.type) where.type = params.type;
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom);
      if (params.dateTo) where.createdAt.lte = new Date(params.dateTo);
    }

    return inventoryTransactionRepository.findByIngredient(ingredientId, {
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      where,
    });
  }
}

export const ingredientService = new IngredientService();