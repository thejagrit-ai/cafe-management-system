import { z } from 'zod';

// Mirrors the BusinessSettings model exactly. The previous version accepted
// name/address/phone/email/minOrderForDelivery/timezone, none of which are
// columns, so Prisma rejected every update with an unknown-argument error.
export const updateBusinessSettingsSchema = z.object({
  body: z.object({
    taxRate: z.number().min(0).max(100).optional(),
    deliveryFee: z.number().min(0).optional(),
    allowOutOfStockOrders: z.boolean().optional(),
    currency: z.string().length(3).optional(),
    // Stored as "HH:MM" strings.
    openingTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM')
      .optional()
      .or(z.literal('')),
    closingTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM')
      .optional()
      .or(z.literal('')),
  }),
});

export const businessSettingsQuerySchema = z.object({
  query: z.object({}),
});