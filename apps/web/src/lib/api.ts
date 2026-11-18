import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// The API base URL points to NestJS backend on port 3001
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = rawApiUrl.replace(/\/$/, '');

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject the JWT token automatically
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('nexo_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

type RetriableRequest = InternalAxiosRequestConfig & { _retried?: boolean };

// Shared promise to prevent concurrent refresh requests from invalidating rotated tokens
let activeRefreshPromise: Promise<string> | null = null;

async function getRefreshedToken(): Promise<string> {
  if (!activeRefreshPromise) {
    activeRefreshPromise = (async () => {
      try {
        const refreshToken = localStorage.getItem('nexo_refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const tokens = response.data?.tokens as { accessToken: string; refreshToken: string } | undefined;
        if (!tokens?.accessToken || !tokens?.refreshToken) {
          throw new Error('Invalid refresh response from server');
        }

        localStorage.setItem('nexo_token', tokens.accessToken);
        localStorage.setItem('nexo_refresh_token', tokens.refreshToken);
        return tokens.accessToken;
      } catch (err) {
        localStorage.removeItem('nexo_token');
        localStorage.removeItem('nexo_refresh_token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('nexo:session-expired'));
        }
        throw err;
      } finally {
        activeRefreshPromise = null;
      }
    })();
  }
  return activeRefreshPromise;
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const request = error.config as RetriableRequest | undefined;
  if (
    typeof window === 'undefined' ||
    error.response?.status !== 401 ||
    !request ||
    request._retried ||
    request.url?.startsWith('/auth/')
  ) {
    return Promise.reject(error);
  }

  request._retried = true;
  try {
    const newAccessToken = await getRefreshedToken();
    request.headers.Authorization = `Bearer ${newAccessToken}`;
    return api(request);
  } catch (refreshErr) {
    return Promise.reject(refreshErr);
  }
});
