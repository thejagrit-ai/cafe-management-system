import { api } from './client';
import type { Order, Payment, PaginationParams } from '../types';

export interface CreateOrderData {
  type: 'DINE_IN' | 'PICKUP' | 'DELIVERY';
  tableNumber?: number;
  customerId?: string;
  items: Array<{ productId: string; quantity: number; notes?: string }>;
  notes?: string;
  addressId?: string;
}

export interface OrderQueryParams extends PaginationParams {
  status?: string;
  type?: string;
  customerId?: string;
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreatePaymentData {
  orderId: string;
  amount: number;
  method: 'CASH' | 'CARD' | 'UPI' | 'ONLINE';
  transactionId?: string;
  referenceNumber?: string;
}

export const ordersApi = {
  getAll: (params?: OrderQueryParams) => api.get<Order[]>('/orders', params),

  getById: (id: string) => api.get<Order>(`/orders/${id}`),

  getByOrderNumber: (orderNumber: string) => api.get<Order>(`/orders/number/${orderNumber}`),

  getMyOrders: (params?: PaginationParams) => api.get<Order[]>('/orders/my-orders', params),

  create: (data: CreateOrderData) => api.post<Order>('/orders', data),

  updateStatus: (id: string, data: { status: string; cancellationReason?: string }) =>
    api.put<Order>(`/orders/${id}/status`, data),

  getTodaysStats: () => api.get<{ totalOrders: number; totalRevenue: number; pendingOrders: number; completedOrders: number }>('/orders/stats/today'),

  getPendingOrders: () => api.get<Order[]>('/orders/pending'),
};

export const paymentsApi = {
  create: (data: CreatePaymentData) => api.post<Payment>('/payments', data),

  getByOrderId: (orderId: string) => api.get<Payment[]>(`/payments/order/${orderId}`),
};