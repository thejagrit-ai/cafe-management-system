import { z } from 'zod';
import { booleanQueryParam } from './common';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    sortOrder: z.number().int().default(0),
  }),
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const categoryQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    isActive: booleanQueryParam,
  }),
});