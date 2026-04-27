import React from 'react';
import type { Widget } from '../api/types';
import { usePrices } from '../hooks/usePrices';
import { useAssets } from '../hooks/useAssets';
import { formatPrice } from '../lib/format';
import ChangeBadge from './ChangeBadge';
import Sparkline from './Sparkline';

interface AssetWidgetProps {
  widget: Widget;
  currentW: number;
  currentH: number;
}

type SizeVariant = 'compact' | 'wide' | 'tall' | 'full';

function getSizeVariant(w: number, h: number): SizeVariant {
  if (w >= 2 && h >= 2) return 'full';
  if (w >= 2) return 'wide';
  if (h >= 2) return 'tall';
  return 'compact';
}

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

const AssetWidget: React.FC<AssetWidgetProps> = ({ widget, currentW, currentH }) => {
  const { data: prices } = usePrices();
  const { data: assets } = useAssets();

  const assetId = widget.config.asset_id as string;
  const label = (widget.config.label as string) || assetId;
  const price = prices?.find((p) => p.id === assetId) ?? null;
  const asset = assets?.find((a) => a.id === assetId);
  const currency = asset?.currency ?? 'USD';
  const symbol = asset?.symbol ?? '';
  const isUp = price ? price.change_pct >= 0 : true;
  const variant = getSizeVariant(currentW, currentH);

  if (!price) {
    return (
      <div className="aw aw-loading">
        <span className="aw-loading-text">LOADING...</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="aw aw-compact">
        <div className="aw-header">
          <div className="aw-label">{label}</div>
          <div className="aw-symbol">{symbol}</div>
        </div>
        <div className="aw-spark-area">
          <Sparkline data={price.sparkline} isUp={isUp} currency={currency} />
        </div>
        <div className={`aw-footer ${isUp ? 'up' : 'down'}`}>
          <div className="aw-price">
            {formatPrice(price.price, currency)}
            <span className="aw-currency">&thinsp;{currency}</span>
          </div>
          <ChangeBadge value={price.change_pct} />
        </div>
      </div>
    );
  }

  if (variant === 'wide') {
    return (
      <div className="aw aw-wide">
        <div className="aw-wide-top">
          <div className="aw-wide-top-left">
            <div className="aw-label">{label}</div>
            <div className="aw-symbol">{symbol}</div>
          </div>
          <div className={`aw-wide-top-right ${isUp ? 'up' : 'down'}`}>
            <div className="aw-price">
              {formatPrice(price.price, currency)}
              <span className="aw-currency">&thinsp;{currency}</span>
            </div>
            <ChangeBadge value={price.change_pct} />
          </div>
        </div>
        <div className="aw-spark-area">
          <Sparkline data={price.sparkline} isUp={isUp} currency={currency} />
        </div>
        <div className="aw-stats-bar">
          {price.day_high != null && price.day_low != null && (
            <div className="aw-stat">
              <span className="aw-stat-label">Day</span>
              <span className="aw-stat-value">{formatPrice(price.day_low, currency)} – {formatPrice(price.day_high, currency)}</span>
            </div>
          )}
          {price.volume != null && (
            <div className="aw-stat">
              <span className="aw-stat-label">Vol</span>
              <span className="aw-stat-value">{formatVolume(price.volume)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'tall') {
    return (
      <div className="aw aw-tall">
        <div className="aw-header">
          <div className="aw-label">{label}</div>
          <div className="aw-symbol">{symbol}</div>
        </div>
        <div className="aw-spark-area aw-spark-tall">
          <Sparkline data={price.sparkline} isUp={isUp} currency={currency} />
        </div>
        <div className={`aw-footer ${isUp ? 'up' : 'down'}`}>
          <div className="aw-price">
            {formatPrice(price.price, currency)}
            <span className="aw-currency">&thinsp;{currency}</span>
          </div>
          <ChangeBadge value={price.change_pct} />
        </div>
      </div>
    );
  }

  // variant === 'full'
  return (
    <div className="aw aw-full">
      <div className="aw-full-header">
        <div>
          <div className="aw-label">{label}</div>
          <div className="aw-symbol">{symbol}</div>
        </div>
        <div className={`aw-full-price-group ${isUp ? 'up' : 'down'}`}>
          <div className="aw-price-lg">
            {formatPrice(price.price, currency)}
            <span className="aw-currency">&thinsp;{currency}</span>
          </div>
          <ChangeBadge value={price.change_pct} />
        </div>
      </div>
      <div className="aw-spark-area aw-spark-full">
        <Sparkline data={price.sparkline} isUp={isUp} currency={currency} showDateAxis />
      </div>
      <div className="aw-stats-bar">
        {price.day_high != null && price.day_low != null && (
          <div className="aw-stat">
            <span className="aw-stat-label">Day Range</span>
            <span className="aw-stat-value">{formatPrice(price.day_low, currency)} – {formatPrice(price.day_high, currency)}</span>
          </div>
        )}
        {price.volume != null && (
          <div className="aw-stat">
            <span className="aw-stat-label">Volume</span>
            <span className="aw-stat-value">{formatVolume(price.volume)}</span>
          </div>
        )}
        <div className="aw-stat">
          <span className="aw-stat-label">Prev Close</span>
          <span className="aw-stat-value">{formatPrice(price.price - price.change_abs, currency)}</span>
        </div>
      </div>
    </div>
  );
};

export default AssetWidget;
