import { z } from 'zod';
import { booleanQueryParam } from './common';

export const createIngredientSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    sku: z.string().min(1, 'SKU is required').max(50),
    unit: z.string().min(1, 'Unit is required').max(20),
    currentStock: z.number().default(0),
    minStock: z.number().default(0),
    maxStock: z.number().default(0),
    costPerUnit: z.number().positive('Cost per unit must be positive'),
    supplierId: z.string().cuid().optional(),
    isActive: z.boolean().default(true),
  }),
});

export const updateIngredientSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    sku: z.string().min(1).max(50).optional(),
    unit: z.string().min(1).max(20).optional(),
    currentStock: z.number().optional(),
    minStock: z.number().optional(),
    maxStock: z.number().optional(),
    costPerUnit: z.number().positive().optional(),
    supplierId: z.string().cuid().optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const ingredientQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    isActive: booleanQueryParam,
    lowStock: booleanQueryParam,
  }),
});

export const stockAdjustmentSchema = z.object({
  body: z.object({
    type: z.enum(['RECEIVED', 'ADDED', 'DEDUCTED', 'ADJUSTMENT', 'WASTE', 'DAMAGED']),
    quantity: z.number().positive('Quantity must be positive'),
    unitCost: z.number().positive().optional(),
    notes: z.string().optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});