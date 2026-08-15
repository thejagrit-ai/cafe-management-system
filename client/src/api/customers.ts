import { api } from './client';
import type { Customer, Address, PaginationParams } from '../types';

export const customersApi = {
  getAll: (params?: PaginationParams) => api.get<Customer[]>('/customers', params),

  getById: (id: string) => api.get<Customer>(`/customers/${id}`),

  updateProfile: (data: any) => api.put('/customers/me/profile', data),

  getAddresses: () => api.get<Address[]>('/customers/me/addresses'),

  createAddress: (data: any) => api.post<Address>('/customers/me/addresses', data),

  updateAddress: (id: string, data: any) => api.put<Address>(`/customers/me/addresses/${id}`, data),

  deleteAddress: (id: string) => api.delete(`/customers/me/addresses/${id}`),

  getMyOrders: (params?: PaginationParams) => api.get('/customers/me/orders', params),
};