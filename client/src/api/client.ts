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

  /**
   * Whether this browser has ever signed in. Guests have no tokens, and firing
   * a refresh for them on every page load is pure waste — but anyone who does
   * have tokens deserves a refresh attempt before being treated as logged out.
   */
  private hasSession(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'));
  }

  /**
   * Endpoints that must never trigger a refresh: the refresh call itself, and
   * the credential endpoints where a 401 means "wrong password", not "expired".
   */
  private isRefreshExempt(endpoint: string): boolean {
    return (
      endpoint.includes('/auth/refresh') ||
      endpoint.includes('/auth/refresh-token') ||
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/register')
    );
  }

  /**
   * Single-flight refresh. The server rotates refresh tokens — each use revokes
   * the previous one — so two requests expiring together would race, the loser
   * would present an already-revoked token, and the user would be logged out
   * mid-session. Concurrent callers share one in-flight refresh instead.
   */
  private refreshInFlight: Promise<string | null> | null = null;

  private refreshTokens(): Promise<string | null> {
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = (async () => {
      try {
        const refreshToken =
          typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

        const res = await fetch(`${this.baseUrl}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ refreshToken: refreshToken || '' }),
        });

        if (!res.ok) {
          this.clearStoredTokens();
          return null;
        }

        const data = await res.json();
        const accessToken = data?.data?.tokens?.accessToken;
        if (accessToken) {
          this.setStoredTokens(accessToken, data.data.tokens.refreshToken);
          return accessToken as string;
        }
        // The refresh-token cookie may have renewed the session without
        // returning a body token; treat that as success and retry as-is.
        return '';
      } catch {
        this.clearStoredTokens();
        return null;
      } finally {
        this.refreshInFlight = null;
      }
    })();

    return this.refreshInFlight;
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
        // Transparent token refresh on 401. `/auth/me` is deliberately included
        // here: access tokens live 15 minutes while refresh tokens live 7 days,
        // so excluding it logged every signed-in user out on the first reload
        // after a quarter of an hour, despite a perfectly valid session.
        // `hasSession` keeps guests from paying for a pointless refresh.
        if (response.status === 401 && !this.isRefreshExempt(endpoint) && this.hasSession()) {
          const newToken = await this.refreshTokens();

          if (newToken !== null) {
            if (newToken) headers.Authorization = `Bearer ${newToken}`;

            const retryResponse = await fetch(url, { ...config, headers });
            const retryData = await retryResponse.json();

            if (!retryResponse.ok) {
              throw { status: retryResponse.status, ...retryData };
            }
            return retryData;
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