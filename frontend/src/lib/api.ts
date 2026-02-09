/**
 * API клиент для работы с backend
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiError {
  detail: string;
}

/**
 * Базовый fetch с обработкой ошибок и авторизацией
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('token') 
    : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ 
      detail: 'Ошибка сервера' 
    }));
    throw new Error(error.detail);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => apiFetch<T>(endpoint, { method: 'GET' }),
  
  post: <T>(endpoint: string, data: unknown) => 
    apiFetch<T>(endpoint, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  
  put: <T>(endpoint: string, data: unknown) => 
    apiFetch<T>(endpoint, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
  
  delete: <T>(endpoint: string) => 
    apiFetch<T>(endpoint, { method: 'DELETE' }),
};
