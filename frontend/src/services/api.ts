/**
 * Centralized API service layer with JWT auth headers.
 * All API calls should go through this module.
 */

const getBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_BASE_URL;
  if (!url) {
    throw new Error('VITE_API_BASE_URL is not set in environment variables');
  }
  return url;
};

const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export interface ApiError {
  detail: string;
  status: number;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errorBody = await response.json();
      if (typeof errorBody.detail === 'string') {
        detail = errorBody.detail;
      } else if (Array.isArray(errorBody.detail)) {
        // FastAPI validation errors (422) return an array of objects
        detail = errorBody.detail.map((err: any) => {
          const loc = err.loc ? err.loc.join('.') : 'unknown';
          return `${loc}: ${err.msg}`;
        }).join(', ');
      } else if (errorBody.detail) {
        detail = JSON.stringify(errorBody.detail);
      }
    } catch {
      // ignore JSON parse error
    }
    throw { detail, status: response.status } as ApiError;
  }
  return response.json() as Promise<T>;
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<T>(response);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async put<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  },

  async patch<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  },

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<T>(response);
  },
};
