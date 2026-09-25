import apiClient from './apiClient';

export const fetchHealth = async () => {
  const { data } = await apiClient.get('/health');
  return data;
};
