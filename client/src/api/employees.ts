import { api } from './client';
import type { Employee, PaginationParams } from '../types';

export interface EmployeeQueryParams extends PaginationParams {
  isActive?: boolean;
}

export const employeesApi = {
  getAll: (params?: EmployeeQueryParams) => api.get<Employee[]>('/employees', params),

  getById: (id: string) => api.get<Employee>(`/employees/${id}`),

  create: (data: any) => api.post<Employee>('/employees', data),

  update: (id: string, data: any) => api.put<Employee>(`/employees/${id}`, data),

  resetPassword: (id: string, password: string) => api.post(`/employees/${id}/reset-password`, { password }),
};