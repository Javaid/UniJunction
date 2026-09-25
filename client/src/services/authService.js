import apiClient from './apiClient';

export const register = (payload) =>
  apiClient
    .post('/auth/register', {
      email: payload.email,
      password: payload.password,
      first_name: payload.firstName,
      last_name: payload.lastName,
    })
    .then((res) => res.data);

export const login = (payload) =>
  apiClient.post('/auth/login', { email: payload.email, password: payload.password }).then((res) => res.data);

export const logout = (refreshToken) =>
  apiClient.post('/auth/logout', { refresh_token: refreshToken }).then((res) => res.data);

export const fetchCurrentUser = () => apiClient.get('/auth/me').then((res) => res.data);

export const refreshAccessToken = (refreshToken) =>
  apiClient.post('/auth/refresh', { refresh_token: refreshToken }).then((res) => res.data);
