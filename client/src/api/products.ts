import { api } from './client';
import type { Product, PaginationParams } from '../types';

export interface ProductQueryParams extends PaginationParams {
  categoryId?: string;
  availability?: string;
  isFeatured?: boolean;
  isPopular?: boolean;
}

export const productsApi = {
  getAll: (params?: ProductQueryParams) => api.get<Product[]>('/products', params),

  getById: (id: string) => api.get<Product>(`/products/${id}`),

  getFeatured: (limit?: number) => api.get<Product[]>('/products/featured', { limit }),

  getPopular: (limit?: number) => api.get<Product[]>('/products/popular', { limit }),

  getByCategory: (categoryId: string, params?: PaginationParams) =>
    api.get<Product[]>(`/products/category/${categoryId}`, params),

  create: (data: Partial<Product>) => api.post<Product>('/products', data),

  update: (id: string, data: Partial<Product>) => api.put<Product>(`/products/${id}`, data),

  delete: (id: string) => api.delete(`/products/${id}`),
};