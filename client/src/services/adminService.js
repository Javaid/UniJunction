import apiClient from './apiClient';

const unwrap = (promise) => promise.then((res) => res.data);

export const listUsers = (params) => unwrap(apiClient.get('/admin/users', { params }));
export const assignRole = (userId, role) => unwrap(apiClient.post(`/admin/users/${userId}/roles`, { role }));
export const removeRole = (userId, role) => unwrap(apiClient.delete(`/admin/users/${userId}/roles/${role}`));
