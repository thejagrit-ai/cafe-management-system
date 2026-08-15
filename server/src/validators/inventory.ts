import { z } from 'zod';

export const inventoryTransactionQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    type: z.enum(['STOCK_RECEIVED', 'STOCK_ADDED', 'STOCK_DEDUCTED', 'MANUAL_ADJUSTMENT', 'WASTE', 'DAMAGED', 'ORDER_CONSUMPTION']).optional(),
    ingredientId: z.string().cuid().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  }),
});