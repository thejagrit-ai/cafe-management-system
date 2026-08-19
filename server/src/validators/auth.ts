import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    phone: z.string().optional(),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    phone: z.string().optional(),
    dateOfBirth: z.string().datetime().optional(),
  }),
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid ID format'),
  }),
});

/**
 * Param validators for routes whose placeholder is not called `id`.
 *
 * Applying `idParamSchema` to `/category/:categoryId` or `/order/:orderId`
 * looked right but rejected every request with "params.id: Required", because
 * the param that exists is named differently — those two endpoints answered
 * 400 unconditionally.
 */
export const categoryIdParamSchema = z.object({
  params: z.object({
    categoryId: z.string().cuid('Invalid ID format'),
  }),
});

export const orderIdParamSchema = z.object({
  params: z.object({
    orderId: z.string().cuid('Invalid ID format'),
  }),
});