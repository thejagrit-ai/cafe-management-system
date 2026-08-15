import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    type: z.enum(['DINE_IN', 'PICKUP', 'DELIVERY']),
    tableNumber: z.coerce.number().int().positive().optional(),
    customerId: z.string().cuid().optional(),
    items: z.array(z.object({
      productId: z.string().cuid('Invalid product ID'),
      quantity: z.number().int().positive('Quantity must be positive'),
      notes: z.string().optional(),
    })).min(1, 'At least one item is required'),
    notes: z.string().optional(),
    addressId: z.string().cuid().optional(),
    paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'ONLINE']).optional(),
    paymentDetails: z.object({
      cardNumber: z.string().optional(),
      cardHolder: z.string().optional(),
      expiry: z.string().optional(),
      transactionId: z.string().optional(),
    }).optional(),
  }),
});

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED']),
    cancellationReason: z.string().optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const orderNumberParamSchema = z.object({
  params: z.object({
    orderNumber: z.string().min(1, 'Order number is required'),
  }),
});

export const orderQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED']).optional(),
    type: z.enum(['DINE_IN', 'PICKUP', 'DELIVERY']).optional(),
    customerId: z.string().cuid().optional(),
    employeeId: z.string().cuid().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  }),
});

export const createPaymentSchema = z.object({
  body: z.object({
    orderId: z.string().cuid('Invalid order ID'),
    amount: z.number().positive('Amount must be positive'),
    method: z.enum(['CASH', 'CARD', 'UPI', 'ONLINE']),
    transactionId: z.string().optional(),
    referenceNumber: z.string().optional(),
  }),
});

export const updatePaymentStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIAL']),
    transactionId: z.string().optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const paymentQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIAL']).optional(),
    method: z.enum(['CASH', 'CARD', 'UPI', 'ONLINE']).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    search: z.string().optional(),
  }),
});

export const paymentExportQuerySchema = z.object({
  query: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIAL']).optional(),
    method: z.enum(['CASH', 'CARD', 'UPI', 'ONLINE']).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    search: z.string().optional(),
  }),
});