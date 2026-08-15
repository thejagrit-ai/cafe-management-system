import { api } from './client';
import type { User, LoginInput, RegisterInput, ChangePasswordInput } from '../types';

export const authApi = {
  login: (data: LoginInput) => api.post<{ user: User; tokens: { accessToken: string; refreshToken: string } }>('/auth/login', data),

  register: (data: RegisterInput) => api.post<{ user: User; tokens: { accessToken: string; refreshToken: string } }>('/auth/register', data),

  logout: () => api.post('/auth/logout'),

  getMe: () => api.get<User>('/auth/me'),

  changePassword: (data: ChangePasswordInput) => api.post('/auth/change-password', data),

  refreshToken: (refreshToken?: string) => api.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),
};