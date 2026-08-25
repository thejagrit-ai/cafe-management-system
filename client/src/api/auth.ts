import { api } from './client';
import type { User, LoginInput, RegisterInput, ChangePasswordInput } from '../types';

export const authApi = {
  login: (data: LoginInput) => api.post<{ user: User; tokens: { accessToken: string; refreshToken: string } }>('/auth/login', data),

  register: (data: RegisterInput) => api.post<{ user: User; tokens: { accessToken: string; refreshToken: string } }>('/auth/register', data),

  logout: () => api.post('/auth/logout'),

  getMe: () => api.get<User>('/auth/me'),

  changePassword: (data: ChangePasswordInput) => api.post('/auth/change-password', data),

  /**
   * Updates the signed-in user's own name, phone and date of birth. Works for
   * customers and employees alike; the server picks the right table.
   */
  updateProfile: (data: {
    firstName?: string
    lastName?: string
    phone?: string
    dateOfBirth?: string
  }) => api.put<User>('/auth/profile', data),

  /** Consumes the single-use link from a verification email. */
  verifyEmail: (token: string) => api.post<{ email: string }>('/auth/verify-email', { token }),

  /** Asks for a fresh verification link for the signed-in account. */
  resendVerification: () => api.post<{ sent: boolean }>('/auth/resend-verification'),

  refreshToken: (refreshToken?: string) => api.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),
};