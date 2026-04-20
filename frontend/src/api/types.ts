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
