import { apiClient } from './client';
import type { User, TokenResponse } from './types';

export interface RegisterPayload {
  email: string;
  password: string;
  birth_date?: string;
  invite_code: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const login = async (payload: LoginPayload): Promise<TokenResponse> => {
  const { data } = await apiClient.post<TokenResponse>('/auth/login', payload);
  return data;
};

export const register = async (payload: RegisterPayload): Promise<TokenResponse> => {
  const { data } = await apiClient.post<TokenResponse>('/auth/register', payload);
  return data;
};

export const refreshToken = async (): Promise<TokenResponse> => {
  const { data } = await apiClient.post<TokenResponse>('/auth/refresh');
  return data;
};

export const logout = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};

export const getMe = async (): Promise<User> => {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
};
