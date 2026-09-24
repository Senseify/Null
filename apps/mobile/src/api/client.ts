import { ApiResponse } from '@null/shared';

// Default mobile API host (configured for production Render backend)
const MOBILE_API_URL = 'https://null-server-g543.onrender.com';

export class MobileApiClient {
  private static token: string | null = null;

  static setToken(token: string | null) {
    this.token = token;
  }

  static getToken(): string | null {
    return this.token;
  }

  static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${MOBILE_API_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { ...options, headers });
    const data = (await response.json().catch(() => ({
      success: false,
      error: `Network error (${response.status})`,
    }))) as ApiResponse<T>;

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data.data as T;
  }

  static get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static post<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  static put<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  static delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
