import { api } from './client';

/** Mirrors the BusinessSettings model in prisma/schema.prisma. */
export interface BusinessSettings {
  id: string;
  taxRate: number;
  deliveryFee: number;
  allowOutOfStockOrders: boolean;
  currency: string;
  openingTime: string | null;
  closingTime: string | null;
}

export const settingsApi = {
  get: () => api.get<BusinessSettings>('/settings'),

  update: (data: Partial<BusinessSettings>) => api.put<BusinessSettings>('/settings', data),
};