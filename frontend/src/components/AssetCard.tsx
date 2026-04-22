import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Trash2, Pencil } from 'lucide-react';
import type { Asset, PriceSnapshot } from '../api/types';
import { deleteAsset, updateAsset } from '../api/assets';
import { formatPrice } from '../lib/format';
import ChangeBadge from './ChangeBadge';
import Sparkline from './Sparkline';

interface AssetCardProps {
  asset: Asset;
  price: PriceSnapshot | null;
  isNew?: boolean;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, price, isNew }) => {
  const isUp = price ? price.change_pct >= 0 : true;
  const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(asset.display_name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(asset.display_name);
  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteAsset(asset.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['prices'] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: (name: string) => updateAsset(asset.id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setEditing(false);
    },
  });

  const handleDelete = () => {
    setMenuOpen(false);
    setDeleting(true);
    setTimeout(() => deleteMutation.mutate(), 350);
  };

  const handleRename = () => {
    setMenuOpen(false);
    setEditValue(asset.display_name);
    setEditing(true);
  };

  const handleEditSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== asset.display_name) {
      renameMutation.mutate(trimmed);
    } else {
      setEditing(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditSubmit();
    if (e.key === 'Escape') setEditing(false);
  };

  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <div className={`asset-card ${deleting ? 'asset-card-deleting' : ''} ${isNew ? 'asset-card-new' : ''}`}>
      <div className="asset-header">
        {editing ? (
          <input
            ref={editInputRef}
            className="asset-name-edit"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={handleEditKeyDown}
          />
        ) : (
          <div className="asset-name-group">
            <div className={isKorean ? 'asset-name-kr' : 'asset-name'}>{asset.display_name}</div>
            <div className="asset-symbol">{asset.symbol}</div>
          </div>
        )}
        <div className="asset-menu" ref={menuRef}>
          <button className="asset-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="asset-menu-dropdown">
              <button className="asset-menu-item" onClick={handleRename}>
                <Pencil size={12} />
                Rename
              </button>
              <button className="asset-menu-item delete" onClick={handleDelete}>
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {price ? (
        <>
          <Sparkline data={price.sparkline} isUp={isUp} currency={asset.currency} />
          <div className={`price-footer ${isUp ? 'up' : 'down'}`}>
            <div className="price">
              {formatPrice(price.price, asset.currency)}
              <span className="currency">&thinsp;{asset.currency}</span>
            </div>
            <ChangeBadge value={price.change_pct} />
          </div>
        </>
      ) : (
        <div className="price-loading">Loading price...</div>
      )}
    </div>
  );
};

export default AssetCard;
