import { apiClient } from './client';
import type { PriceSnapshot } from './types';

export const getPrices = async (): Promise<PriceSnapshot[]> => {
  const { data } = await apiClient.get<PriceSnapshot[]>('/prices');
  return data;
};
