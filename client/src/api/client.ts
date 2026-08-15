const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  private setStoredTokens(accessToken?: string, refreshToken?: string) {
    if (typeof window === 'undefined') return;
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  }

  private clearStoredTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getStoredToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    };

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include',
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // Automatically capture tokens from login/register/refresh responses
      if (response.ok && data?.data?.tokens) {
        this.setStoredTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
      } else if (response.ok && data?.data?.token) {
        this.setStoredTokens(data.data.token);
      }

      if (endpoint.includes('/auth/logout')) {
        this.clearStoredTokens();
      }

      if (!response.ok) {
        // Transparent token refresh on 401 Unauthorized (unless already refreshing, checking session, or logging in)
        if (
          response.status === 401 &&
          !endpoint.includes('/auth/me') &&
          !endpoint.includes('/auth/refresh') &&
          !endpoint.includes('/auth/refresh-token') &&
          !endpoint.includes('/auth/login') &&
          !endpoint.includes('/auth/register')
        ) {
          try {
            const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
            const refreshRes = await fetch(`${this.baseUrl}/auth/refresh-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ refreshToken: refreshToken || '' }),
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              if (refreshData?.data?.tokens?.accessToken) {
                this.setStoredTokens(
                  refreshData.data.tokens.accessToken,
                  refreshData.data.tokens.refreshToken
                );
                // Retry with new token header
                headers.Authorization = `Bearer ${refreshData.data.tokens.accessToken}`;
              }

              const retryResponse = await fetch(url, { ...config, headers });
              const retryData = await retryResponse.json();

              if (!retryResponse.ok) {
                throw { status: retryResponse.status, ...retryData };
              }
              return retryData;
            } else {
              this.clearStoredTokens();
            }
          } catch (refreshErr: any) {
            this.clearStoredTokens();
            if (refreshErr?.status) throw refreshErr;
          }
        }

        throw { status: response.status, ...data };
      }

      return data;
    } catch (error: any) {
      if (error?.status) throw error;
      throw { status: 500, message: 'Network error. Please check your connection.' };
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL);