import { api } from './client';
import type { Payment } from '@/types';

export interface PaymentQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  method?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaymentExportRecord extends Payment {
  order?: {
    id: string;
    orderNumber: string;
    type: string;
    tableNumber?: number | null;
    total: number | string;
    customer?: {
      firstName: string;
      lastName: string;
      phone?: string | null;
      user?: {
        email: string;
      } | null;
    } | null;
  } | null;
}

export const paymentsApi = {
  getAll: (params?: PaymentQueryParams) => api.get<PaymentExportRecord[]>('/payments', params),
  exportAll: (params?: Omit<PaymentQueryParams, 'page' | 'limit'>) =>
    api.get<PaymentExportRecord[]>('/payments/export', params),
  getTotalsByMethod: (params?: { dateFrom?: string; dateTo?: string }) =>
    api.get<Record<string, number>>('/payments/totals-by-method', params),
  getByOrderId: (orderId: string) => api.get<Payment[]>(`/payments/order/${orderId}`),
  updateStatus: (id: string, status: string, transactionId?: string) =>
    api.put<Payment>(`/payments/${id}/status`, { status, transactionId }),
};
