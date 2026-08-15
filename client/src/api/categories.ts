import { api } from './client';
import type { Category, PaginationParams } from '../types';

export interface CategoryQueryParams extends PaginationParams {
  isActive?: boolean;
}

export const categoriesApi = {
  getAll: (params?: CategoryQueryParams) => api.get<Category[]>('/categories', params),

  getActive: () => api.get<Category[]>('/categories/active'),

  getById: (id: string) => api.get<Category>(`/categories/${id}`),

  create: (data: Partial<Category>) => api.post<Category>('/categories', data),

  update: (id: string, data: Partial<Category>) => api.put<Category>(`/categories/${id}`, data),

  delete: (id: string) => api.delete(`/categories/${id}`),
};