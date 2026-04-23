import { apiClient } from './client';
import type { Widget, WidgetType, LayoutItem } from './types';

export interface CreateWidgetPayload {
  type: WidgetType;
  config: Record<string, any>;
  layout_x?: number;
  layout_y?: number;
  layout_w?: number;
  layout_h?: number;
}

export const getWidgets = async (): Promise<Widget[]> => {
  const { data } = await apiClient.get<Widget[]>('/widgets');
  return data;
};

export const createWidget = async (payload: CreateWidgetPayload): Promise<Widget> => {
  const { data } = await apiClient.post<Widget>('/widgets', payload);
  return data;
};

export const updateWidget = async (id: number, payload: Partial<Omit<Widget, 'id' | 'type'>>): Promise<Widget> => {
  const { data } = await apiClient.patch<Widget>(`/widgets/${id}`, payload);
  return data;
};

export const deleteWidget = async (id: number): Promise<void> => {
  await apiClient.delete(`/widgets/${id}`);
};

export const updateLayout = async (items: LayoutItem[]): Promise<void> => {
  await apiClient.put('/widgets/layout', items);
};
