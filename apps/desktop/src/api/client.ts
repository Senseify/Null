import { ApiResponse } from '@null/shared';

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('null_server_url');
    if (custom && custom.startsWith('http')) return custom;
  }
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.origin.includes('localhost:5173')) {
    return ''; // Vite proxy
  }
  return 'https://null-server-g543.onrender.com';
};
const BASE_URL = getBaseUrl();

export class ApiClient {
  private static token: string | null = null;

  static setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('null_access_token', token);
    } else {
      localStorage.removeItem('null_access_token');
    }
  }

  static getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('null_access_token');
    }
    return this.token;
  }

  static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only set Content-Type to application/json if body is not FormData
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data: ApiResponse<T> = await response.json().catch(() => ({
      success: false,
      error: `Network error (${response.status})`,
    }));

    if (!response.ok || !data.success) {
      const errorMsg = data.error || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data.data as T;
  }

  static get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static post<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
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

  static async uploadFile(file: File): Promise<{
    url: string;
    name: string;
    size: number;
    mimeType: string;
    isImage: boolean;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.post('/api/attachments/upload', formData);
  }
}
