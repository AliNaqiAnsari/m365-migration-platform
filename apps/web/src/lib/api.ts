import { useAuthStore } from '@/stores/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: Record<string, unknown>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const { accessToken, refreshToken, setTokens, logout } =
      useAuthStore.getState();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (accessToken) {
      (headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
    }

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle token refresh on 401
    if (response.status === 401 && refreshToken) {
      const refreshResponse = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshResponse.ok) {
        const { data } = await refreshResponse.json();
        setTokens(data.accessToken, data.refreshToken);

        // Retry original request
        (headers as Record<string, string>).Authorization = `Bearer ${data.accessToken}`;
        response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers,
        });
      } else {
        logout();
        throw new Error('Session expired');
      }
    }

    const result: ApiResponse<T> = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || 'An error occurred');
    }

    return result.data as T;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_URL);

// API helper functions
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{
      accessToken?: string;
      refreshToken?: string;
      requireMfa?: boolean;
      tempToken?: string;
      user?: {
        id: string;
        email: string;
        name: string | null;
        role: string;
        organizationId: string;
        organization: { id: string; name: string; slug: string };
      };
    }>('/api/v1/auth/login', { email, password }),

  register: (data: {
    email: string;
    password: string;
    name: string;
    organizationName: string;
  }) =>
    api.post<{
      accessToken: string;
      refreshToken: string;
      user: unknown;
    }>('/api/v1/auth/register', data),

  verifyMfa: (tempToken: string, code: string) =>
    api.post<{
      accessToken: string;
      refreshToken: string;
      user: unknown;
    }>('/api/v1/auth/mfa/verify', { tempToken, code }),

  logout: () => api.post('/api/v1/auth/logout'),

  getMe: () =>
    api.get<{
      id: string;
      email: string;
      name: string | null;
      role: string;
      organizationId: string;
      organization: { id: string; name: string; slug: string };
    }>('/api/v1/auth/me'),
};

export const tenantsApi = {
  list: () => api.get<unknown[]>('/api/v1/tenants'),
  get: (id: string) => api.get<unknown>(`/api/v1/tenants/${id}`),
  getAuthUrl: (type: 'source' | 'destination') =>
    api.get<{ authUrl: string }>(`/api/v1/tenants/connect/microsoft?type=${type}`),
  disconnect: (id: string) => api.post(`/api/v1/tenants/${id}/disconnect`),
  delete: (id: string) => api.delete(`/api/v1/tenants/${id}`),
  sync: (id: string) => api.post(`/api/v1/tenants/${id}/sync`),
};

export const migrationsApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<{
      data: unknown[];
      meta: { total: number; page: number; limit: number };
    }>(
      `/api/v1/migrations${params ? `?${new URLSearchParams(params as Record<string, string>)}` : ''}`,
    ),
  get: (id: string) => api.get<unknown>(`/api/v1/migrations/${id}`),
  create: (data: unknown) => api.post<unknown>('/api/v1/migrations', data),
  start: (id: string) => api.post(`/api/v1/migrations/${id}/start`),
  pause: (id: string) => api.post(`/api/v1/migrations/${id}/pause`),
  resume: (id: string) => api.post(`/api/v1/migrations/${id}/resume`),
  cancel: (id: string) => api.post(`/api/v1/migrations/${id}/cancel`),
  delete: (id: string) => api.delete(`/api/v1/migrations/${id}`),
  getTasks: (id: string) => api.get<unknown[]>(`/api/v1/migrations/${id}/tasks`),
  getErrors: (id: string) =>
    api.get<{ data: unknown[]; meta: unknown }>(`/api/v1/migrations/${id}/errors`),
};

export const backupsApi = {
  list: () => api.get<unknown[]>('/api/v1/backups'),
  get: (id: string) => api.get<unknown>(`/api/v1/backups/${id}`),
  create: (data: unknown) => api.post<unknown>('/api/v1/backups', data),
  delete: (id: string) => api.delete(`/api/v1/backups/${id}`),
};

export const billingApi = {
  getInfo: () => api.get<unknown>('/api/v1/billing'),
  calculate: (data: { workloads: string[]; userCount: number; siteCount?: number }) =>
    api.post<unknown>('/api/v1/billing/calculate', data),
  createCheckout: (data: unknown) =>
    api.post<{ checkoutUrl: string }>('/api/v1/billing/checkout/migration', data),
};

export const organizationsApi = {
  getCurrent: () => api.get<unknown>('/api/v1/organizations/current'),
  update: (data: unknown) => api.patch<unknown>('/api/v1/organizations/current', data),
  getStats: () => api.get<unknown>('/api/v1/organizations/current/stats'),
};
