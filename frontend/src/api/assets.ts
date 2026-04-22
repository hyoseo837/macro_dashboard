import { apiClient } from './client';
import type { Asset } from './types';

export const getAssets = async (): Promise<Asset[]> => {
  const { data } = await apiClient.get<Asset[]>('/assets');
  return data;
};

export interface SearchResult {
  symbol: string;
  name: string;
  category: string;
  exchange: string;
}

export const searchSymbols = async (q: string): Promise<SearchResult[]> => {
  const { data } = await apiClient.get<SearchResult[]>('/assets/search', { params: { q } });
  return data;
};

export const lookupCurrency = async (symbol: string): Promise<string> => {
  const { data } = await apiClient.get<{ currency: string }>('/assets/currency', { params: { symbol } });
  return data.currency;
};

export interface CreateAssetPayload {
  display_name: string;
  symbol: string;
  category: string;
  currency: string;
}

export const createAsset = async (payload: CreateAssetPayload): Promise<Asset> => {
  const { data } = await apiClient.post<Asset>('/assets', payload);
  return data;
};

export const updateAsset = async (id: string, displayName: string): Promise<Asset> => {
  const { data } = await apiClient.patch<Asset>(`/assets/${id}`, { display_name: displayName });
  return data;
};

export const deleteAsset = async (id: string): Promise<void> => {
  await apiClient.delete(`/assets/${id}`);
};
