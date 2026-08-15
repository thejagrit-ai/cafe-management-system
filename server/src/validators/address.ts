import { z } from 'zod';

export const createAddressSchema = z.object({
  body: z.object({
    label: z.string().min(1, 'Label is required').max(50),
    street: z.string().min(1, 'Street is required').max(200),
    city: z.string().min(1, 'City is required').max(100),
    state: z.string().min(1, 'State is required').max(100),
    postalCode: z.string().min(1, 'Postal code is required').max(20),
    country: z.string().default('USA'),
    isDefault: z.boolean().default(false),
    instructions: z.string().optional(),
  }),
});

export const updateAddressSchema = z.object({
  body: z.object({
    label: z.string().min(1).max(50).optional(),
    street: z.string().min(1).max(200).optional(),
    city: z.string().min(1).max(100).optional(),
    state: z.string().min(1).max(100).optional(),
    postalCode: z.string().min(1).max(20).optional(),
    country: z.string().optional(),
    isDefault: z.boolean().optional(),
    instructions: z.string().optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});