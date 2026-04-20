import { apiClient } from './client';
import type { Asset } from './types';

export const getAssets = async (): Promise<Asset[]> => {
  const { data } = await apiClient.get<Asset[]>('/assets');
  return data;
};
