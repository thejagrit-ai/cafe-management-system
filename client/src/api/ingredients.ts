import { api } from './client';
import type { Ingredient, Supplier, PaginationParams } from '../types';

export interface IngredientQueryParams extends PaginationParams {
  status?: boolean;
  lowStock?: boolean;
}

export interface StockAdjustmentData {
  type: 'STOCK_RECEIVED' | 'STOCK_ADDED' | 'STOCK_DEDUCTED' | 'MANUAL_ADJUSTMENT' | 'WASTE' | 'DAMAGED';
  quantity: number;
  unitCost?: number;
  notes?: string;
}

export const ingredientsApi = {
  getAll: (params?: IngredientQueryParams) => api.get<Ingredient[]>('/ingredients', params),

  getById: (id: string) => api.get<Ingredient>(`/ingredients/${id}`),

  getLowStock: () => api.get<Ingredient[]>('/ingredients/low-stock'),

  getTransactions: (id: string, params?: PaginationParams) =>
    api.get(`/ingredients/${id}/transactions`, params),

  create: (data: Partial<Ingredient>) => api.post<Ingredient>('/ingredients', data),

  update: (id: string, data: Partial<Ingredient>) => api.put<Ingredient>(`/ingredients/${id}`, data),

  adjustStock: (id: string, data: StockAdjustmentData) => api.post<Ingredient>(`/ingredients/${id}/adjust-stock`, data),
};

export const suppliersApi = {
  getAll: (params?: PaginationParams) => api.get<Supplier[]>('/suppliers', params),

  getActive: () => api.get<Supplier[]>('/suppliers/active'),

  getById: (id: string) => api.get<Supplier>(`/suppliers/${id}`),

  create: (data: Partial<Supplier>) => api.post<Supplier>('/suppliers', data),

  update: (id: string, data: Partial<Supplier>) => api.put<Supplier>(`/suppliers/${id}`, data),
};