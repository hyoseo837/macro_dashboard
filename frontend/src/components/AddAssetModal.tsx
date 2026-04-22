import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Search } from 'lucide-react';
import { createAsset, searchSymbols, lookupCurrency, type CreateAssetPayload, type SearchResult } from '../api/assets';

interface AddAssetModalProps {
  open: boolean;
  onClose: () => void;
}

const AddAssetModal: React.FC<AddAssetModalProps> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [currency, setCurrency] = useState('');
  const [loadingCurrency, setLoadingCurrency] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const mutation = useMutation({
    mutationFn: (payload: CreateAssetPayload) => createAsset(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['prices'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to add asset');
    },
  });

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelected(null);
      setDisplayName('');
      setCurrency('');
      setError('');
      setShowDropdown(false);
      setLoadingCurrency(false);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim() || selected) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchSymbols(query.trim());
        setResults(res);
        setShowDropdown(res.length > 0);
      } catch {
        setResults([]);
        setShowDropdown(false);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, selected]);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  const handleSelect = async (result: SearchResult) => {
    setSelected(result);
    setQuery(result.symbol);
    setDisplayName(result.name);
    setShowDropdown(false);
    setError('');
    setCurrency('');
    setLoadingCurrency(true);
    try {
      const cur = await lookupCurrency(result.symbol);
      setCurrency(cur);
    } catch {
      setCurrency('USD');
    } finally {
      setLoadingCurrency(false);
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (selected) {
      setSelected(null);
      setDisplayName('');
      setCurrency('');
    }
  };

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setError('Select a symbol from the search results');
      return;
    }
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    if (!currency) {
      setError('Currency is still loading');
      return;
    }
    setError('');
    mutation.mutate({
      symbol: selected.symbol,
      display_name: displayName.trim(),
      category: selected.category,
      currency,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add Asset</span>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-label" ref={dropdownRef}>
              Symbol
              <div className="search-input-wrap">
                <Search size={14} className="search-icon" />
                <input
                  ref={inputRef}
                  className="form-input search-input"
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search Yahoo Finance..."
                  autoFocus
                />
                {searching && <span className="search-spinner" />}
              </div>
              {showDropdown && (
                <div className="autocomplete-dropdown">
                  {results.map((r) => (
                    <button
                      key={r.symbol}
                      type="button"
                      className="autocomplete-item"
                      onClick={() => handleSelect(r)}
                    >
                      <div className="autocomplete-item-left">
                        <span className="autocomplete-symbol">{r.symbol}</span>
                        <span className="autocomplete-name">{r.name}</span>
                      </div>
                      <div className="autocomplete-item-right">
                        <span className="autocomplete-tag">{r.category}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="form-label">
              Display Name
              <input
                className="form-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={selected ? selected.name : 'Select a symbol first'}
              />
            </label>

            <div className="form-row">
              <label className="form-label">
                Category
                <input className="form-input form-input-readonly" type="text" value={selected?.category ?? ''} readOnly />
              </label>
              <label className="form-label">
                Currency
                <input
                  className="form-input form-input-readonly"
                  type="text"
                  value={loadingCurrency ? 'Loading...' : currency}
                  readOnly
                />
              </label>
            </div>

            {error && <div className="form-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending || !selected || loadingCurrency}>
              {mutation.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAssetModal;
