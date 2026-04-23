export interface Asset {
  id: string;
  display_name: string;
  symbol: string;
  category: 'etf' | 'equity' | 'crypto' | 'fx' | 'commodity';
  currency: string;
}

export interface SparklinePoint {
  date: string;
  price: number;
}

export type WidgetType = 'asset' | 'time';

export interface Widget {
  id: number;
  type: WidgetType;
  config: Record<string, any>;
  layout_x: number;
  layout_y: number;
  layout_w: number;
  layout_h: number;
}

export interface AssetWidgetConfig {
  asset_id: string;
  label: string;
}

export interface TimeWidgetConfig {
  timezone: string;
  label: string;
}

export interface LayoutItem {
  id: number;
  layout_x: number;
  layout_y: number;
  layout_w: number;
  layout_h: number;
}

export interface PriceSnapshot {
  id: string;
  symbol: string;
  price: number;
  currency: string;
  change_abs: number;
  change_pct: number;
  as_of: string;
  sparkline: SparklinePoint[];
}
