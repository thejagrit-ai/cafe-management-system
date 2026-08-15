import { z } from 'zod';

export const createRecipeSchema = z.object({
  body: z.object({
    productId: z.string().cuid('Invalid product ID'),
    instructions: z.string().optional(),
    prepTime: z.number().int().nonnegative().default(0),
    cookTime: z.number().int().nonnegative().default(0),
    servings: z.number().int().positive().default(1),
    ingredients: z.array(z.object({
      ingredientId: z.string().cuid('Invalid ingredient ID'),
      quantity: z.number().positive('Quantity must be positive'),
      unit: z.string().min(1, 'Unit is required').max(20),
      notes: z.string().optional(),
    })).min(1, 'At least one ingredient is required'),
  }),
});

export const updateRecipeSchema = z.object({
  body: z.object({
    instructions: z.string().optional(),
    prepTime: z.number().int().nonnegative().optional(),
    cookTime: z.number().int().nonnegative().optional(),
    servings: z.number().int().positive().optional(),
    ingredients: z.array(z.object({
      ingredientId: z.string().cuid(),
      quantity: z.number().positive(),
      unit: z.string().min(1).max(20),
      notes: z.string().optional(),
    })).optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const recipeQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
  }),
});