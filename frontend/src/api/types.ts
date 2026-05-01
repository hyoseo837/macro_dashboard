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

export type WidgetType = 'asset' | 'time' | 'news';

export interface Widget {
  id: number;
  type: WidgetType;
  config: Record<string, unknown>;
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

export interface NewsWidgetConfig {
  feed_id?: string;
  label: string;
  mode?: 'single' | 'topic' | 'overall';
  topic?: string;
}

export interface NewsFeedCatalogEntry {
  feed_key: string;
  source_name: string;
  topic: string;
  country: string | null;
}

export interface NewsArticle {
  id: number;
  title: string;
  url: string;
  source_name: string;
  published_at: string | null;
  fetched_at: string;
}

export interface ClusteredArticles {
  cluster_id: number | null;
  cluster_label: string | null;
  summary: string | null;
  articles: NewsArticle[];
}

export interface LayoutItem {
  id: number;
  layout_x: number;
  layout_y: number;
  layout_w: number;
  layout_h: number;
}

export interface User {
  id: number;
  email: string;
  birth_date: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
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
  day_high: number | null;
  day_low: number | null;
  volume: number | null;
}
