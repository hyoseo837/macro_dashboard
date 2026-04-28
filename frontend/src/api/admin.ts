import { apiClient } from './client';

export interface InviteCode {
  id: number;
  code: string;
  created_by: number | null;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  created_at: string;
}

export interface AdminUser {
  id: number;
  email: string;
  birth_date: string | null;
  is_admin: boolean;
  created_at: string;
  widget_count: number;
}

export interface CreateInvitePayload {
  code: string;
  max_uses?: number | null;
  expires_at?: string | null;
}

export const getInviteCodes = async (): Promise<InviteCode[]> => {
  const { data } = await apiClient.get<InviteCode[]>('/admin/invite-codes');
  return data;
};

export const createInviteCode = async (payload: CreateInvitePayload): Promise<InviteCode> => {
  const { data } = await apiClient.post<InviteCode>('/admin/invite-codes', payload);
  return data;
};

export const deleteInviteCode = async (id: number): Promise<void> => {
  await apiClient.delete(`/admin/invite-codes/${id}`);
};

export const getUsers = async (): Promise<AdminUser[]> => {
  const { data } = await apiClient.get<AdminUser[]>('/admin/users');
  return data;
};
