import axios from 'axios';

import { getRefreshToken, setRefreshToken, clearRefreshToken } from './tokenStore';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * apiClient must not import the Redux store directly: store/index.js
 * registers authSlice, authSlice's thunks call authService, and
 * authService calls apiClient — a static `import { store }` here would
 * close that cycle (apiClient -> store -> authSlice -> authService ->
 * apiClient), which is exactly the kind of cycle that leaves
 * `configureStore` seeing an undefined reducer depending on which module
 * happens to load first.
 *
 * Instead, store/index.js calls `setAuthHandlers(...)` once, after the
 * store exists, wiring these three hooks to real Redux state/dispatch.
 * Until that happens, sensible no-op defaults keep this module safe to
 * import (and to unit-test) on its own.
 */
let authHandlers = {
  getAccessToken: () => null,
  onTokenRefreshed: () => {},
  onAuthFailure: () => {},
};

export const setAuthHandlers = (handlers) => {
  authHandlers = { ...authHandlers, ...handlers };
};

// Attaches the current access token, read lazily on every request.
apiClient.interceptors.request.use((config) => {
  const token = authHandlers.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const isAuthEndpoint = (url = '') =>
  url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');

// Coalesces concurrent 401s into a single in-flight refresh call, so
// several simultaneously-failing requests don't each rotate the refresh
// token and invalidate one another.
let refreshPromise = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    const shouldAttemptRefresh =
      status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint(originalRequest.url);

    if (!shouldAttemptRefresh) {
      return Promise.reject(error);
    }

    originalRequest._retry = true; // never retry the same request twice — prevents infinite loops
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      authHandlers.onAuthFailure();
      return Promise.reject(error);
    }

    try {
      if (!refreshPromise) {
        // Plain axios, not apiClient — this call must never itself go
        // through this same response interceptor.
        refreshPromise = axios
          .post(`${baseURL}/auth/refresh`, { refresh_token: refreshToken })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const { data } = await refreshPromise;
      authHandlers.onTokenRefreshed(data.access_token);
      setRefreshToken(data.refresh_token);

      originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearRefreshToken();
      authHandlers.onAuthFailure();
      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;
