export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  statusCode: number;
  details?: any;
}

export interface PaginationMeta {
  page?: number;
  limit: number;
  hasMore: boolean;
  total?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}
