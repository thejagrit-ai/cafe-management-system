import { z } from 'zod';
import { booleanQueryParam } from './common';

export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    contactName: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
});

export const updateSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    contactName: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const supplierQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    isActive: booleanQueryParam,
  }),
});