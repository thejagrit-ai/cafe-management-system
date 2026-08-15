import { z } from 'zod';
import { booleanQueryParam } from './common';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().optional(),
    price: z.number().positive('Price must be positive').max(999999.99),
    imageUrl: z.string().optional().nullable().or(z.literal('')),
    categoryId: z.string().cuid('Invalid category ID'),
    availability: z.enum(['AVAILABLE', 'UNAVAILABLE', 'LIMITED']).default('AVAILABLE'),
    isFeatured: z.boolean().default(false),
    isPopular: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    price: z.number().positive().max(999999.99).optional(),
    imageUrl: z.string().optional().nullable().or(z.literal('')),
    categoryId: z.string().cuid().optional(),
    availability: z.enum(['AVAILABLE', 'UNAVAILABLE', 'LIMITED']).optional(),
    isFeatured: z.boolean().optional(),
    isPopular: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const productQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    categoryId: z.string().cuid().optional(),
    availability: z.enum(['AVAILABLE', 'UNAVAILABLE', 'LIMITED']).optional(),
    isFeatured: booleanQueryParam,
    isPopular: booleanQueryParam,
  }),
});