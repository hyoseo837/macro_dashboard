import React from 'react';
import type { Asset, PriceSnapshot } from '../api/types';
import { formatPrice } from '../lib/format';
import ChangeBadge from './ChangeBadge';
import Sparkline from './Sparkline';

interface AssetCardProps {
  asset: Asset;
  price: PriceSnapshot;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, price }) => {
  const isUp = price.change_pct >= 0;
  const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(asset.display_name);

  return (
    <div className="asset-card">
      <div className="asset-header">
        {isKorean ? (
          <div className="asset-name-kr">{asset.display_name}</div>
        ) : (
          <div className="asset-name">{asset.symbol}&nbsp;·&nbsp;{asset.display_name}</div>
        )}
      </div>

      <Sparkline data={price.sparkline} isUp={isUp} currency={asset.currency} />
      
      <div className={`price-footer ${isUp ? 'up' : 'down'}`}>
        <div className="price">
          {formatPrice(price.price, asset.currency)}
          <span className="currency">&thinsp;{asset.currency}</span>
        </div>
        <ChangeBadge value={price.change_pct} />
      </div>
    </div>
  );
};

export default AssetCard;
