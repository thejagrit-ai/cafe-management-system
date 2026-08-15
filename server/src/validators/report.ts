import { z } from 'zod';

export const reportQuerySchema = z.object({
  query: z.object({
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    groupBy: z.enum(['day', 'week', 'month']).optional(),
  }),
});

export const productReportQuerySchema = z.object({
  query: z.object({
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    limit: z.coerce.number().int().positive().max(100).default(10),
  }),
});

export const exportReportQuerySchema = z.object({
  query: z.object({
    type: z.enum(['sales', 'inventory', 'products']),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    format: z.enum(['json', 'csv']).optional(),
  }),
});