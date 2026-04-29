import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Search, TrendingUp, Clock, Newspaper, ArrowLeft } from 'lucide-react';
import { createAsset, searchSymbols, lookupCurrency, type CreateAssetPayload, type SearchResult } from '../api/assets';
import { createWidget, type CreateWidgetPayload } from '../api/widgets';
import { getNewsCatalog } from '../api/news';
import { apiClient } from '../api/client';
import type { Widget, WidgetType, NewsFeedCatalogEntry } from '../api/types';

interface AddWidgetModalProps {
  open: boolean;
  onClose: () => void;
  widgets: Widget[];
}

type Step = 'pick-type' | 'config-asset' | 'config-time' | 'config-news';

function feedDisplayName(entry: NewsFeedCatalogEntry): string {
  const topic = entry.topic.charAt(0).toUpperCase() + entry.topic.slice(1);
  const country = entry.country ? ` (${entry.country.toUpperCase()})` : '';
  return `${entry.source_name} ${topic}${country}`;
}

function tzDisplayName(tz: string): string {
  return tz.split('/').pop()?.replace(/_/g, ' ') || tz;
}

const fetchTimezones = async (): Promise<string[]> => {
  const { data } = await apiClient.get<string[]>('/timezones');
  return data;
};

const GRID_COLS = 6;

function findFreePosition(widgets: Widget[], w: number, h: number): { x: number; y: number } {
  const occupied = new Set<string>();
  for (const widget of widgets) {
    for (let dx = 0; dx < widget.layout_w; dx++) {
      for (let dy = 0; dy < widget.layout_h; dy++) {
        occupied.add(`${widget.layout_x + dx},${widget.layout_y + dy}`);
      }
    }
  }

  for (let y = 0; ; y++) {
    for (let x = 0; x <= GRID_COLS - w; x++) {
      let fits = true;
      for (let dx = 0; dx < w && fits; dx++) {
        for (let dy = 0; dy < h && fits; dy++) {
          if (occupied.has(`${x + dx},${y + dy}`)) fits = false;
        }
      }
      if (fits) return { x, y };
    }
  }
}

const AddWidgetModal: React.FC<AddWidgetModalProps> = ({ open, onClose, widgets }) => {
  const [step, setStep] = useState<Step>('pick-type');
  const queryClient = useQueryClient();

  const { data: allTimezones = [] } = useQuery({
    queryKey: ['timezones'],
    queryFn: fetchTimezones,
    staleTime: Infinity,
    enabled: open,
  });

  // ── Asset state ──
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [currency, setCurrency] = useState('');
  const [loadingCurrency, setLoadingCurrency] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Time state ──
  const [tzQuery, setTzQuery] = useState('');
  const [selectedTz, setSelectedTz] = useState('');
  const [tzLabel, setTzLabel] = useState('');
  const [clockMode, setClockMode] = useState<'analog' | 'digital'>('analog');

  // ── News state ──
  const [feedQuery, setFeedQuery] = useState('');
  const [selectedFeed, setSelectedFeed] = useState<NewsFeedCatalogEntry | null>(null);
  const [feedLabel, setFeedLabel] = useState('');

  const { data: feedCatalog = [] } = useQuery({
    queryKey: ['newsCatalog'],
    queryFn: getNewsCatalog,
    staleTime: Infinity,
    enabled: open,
  });

  const filteredFeeds = feedQuery.trim()
    ? feedCatalog.filter((f) =>
        feedDisplayName(f).toLowerCase().includes(feedQuery.toLowerCase())
      )
    : feedCatalog;

  const [error, setError] = useState('');

  const widgetMutation = useMutation({
    mutationFn: (payload: CreateWidgetPayload) => createWidget(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['prices'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create widget');
    },
  });

  const assetMutation = useMutation({
    mutationFn: (payload: CreateAssetPayload) => createAsset(payload),
    onError: (err: any) => {
      if (err.response?.status !== 409) {
        setError(err.response?.data?.detail || 'Failed to add asset');
      }
    },
  });

  useEffect(() => {
    if (open) {
      setStep('pick-type');
      setQuery('');
      setResults([]);
      setSelected(null);
      setDisplayName('');
      setCurrency('');
      setLoadingCurrency(false);
      setShowDropdown(false);
      setTzQuery('');
      setSelectedTz('');
      setTzLabel('');
      setClockMode('analog');
      setFeedQuery('');
      setSelectedFeed(null);
      setFeedLabel('');
      setError('');
    }
  }, [open]);

  // ── Asset search ──
  useEffect(() => {
    if (step !== 'config-asset' || !query.trim() || selected) {
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
  }, [query, selected, step]);

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

  const handleSelectAsset = async (result: SearchResult) => {
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

  const handleAssetQueryChange = (value: string) => {
    setQuery(value);
    if (selected) {
      setSelected(null);
      setDisplayName('');
      setCurrency('');
    }
  };

  // ── Timezone filtering ──
  const filteredTimezones = tzQuery.trim()
    ? allTimezones.filter((tz) =>
        tz.toLowerCase().includes(tzQuery.toLowerCase()) ||
        tzDisplayName(tz).toLowerCase().includes(tzQuery.toLowerCase())
      )
    : allTimezones;

  // ── Submit handlers ──
  const handleAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { setError('Select a symbol from the search results'); return; }
    if (!displayName.trim()) { setError('Display name is required'); return; }
    if (!currency) { setError('Currency is still loading'); return; }
    setError('');

    const assetId = selected.symbol.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    try {
      await assetMutation.mutateAsync({
        symbol: selected.symbol,
        display_name: selected.name,
        category: selected.category,
        currency,
      });
    } catch (err: any) {
      if (err.response?.status !== 409) return;
    }

    const pos = findFreePosition(widgets, 1, 1);
    widgetMutation.mutate({
      type: 'asset' as WidgetType,
      config: { asset_id: assetId, label: displayName.trim() },
      layout_x: pos.x,
      layout_y: pos.y,
    });
  };

  const handleTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTz) { setError('Select a timezone'); return; }
    setError('');
    const pos = findFreePosition(widgets, 1, 1);
    widgetMutation.mutate({
      type: 'time' as WidgetType,
      config: { timezone: selectedTz, label: tzLabel.trim() || tzDisplayName(selectedTz), mode: clockMode },
      layout_x: pos.x,
      layout_y: pos.y,
    });
  };

  const handleNewsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeed) { setError('Select a news feed'); return; }
    setError('');
    const pos = findFreePosition(widgets, 2, 1);
    widgetMutation.mutate({
      type: 'news' as WidgetType,
      config: { feed_id: selectedFeed.feed_key, label: feedLabel.trim() || feedDisplayName(selectedFeed) },
      layout_x: pos.x,
      layout_y: pos.y,
      layout_w: 2,
      layout_h: 1,
    });
  };

  if (!open) return null;

  const isPending = widgetMutation.isPending || assetMutation.isPending;

  if (step === 'pick-type') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <span className="modal-title">Add Widget</span>
            <button className="modal-close" onClick={onClose}><X size={16} /></button>
          </div>
          <div className="modal-body">
            <div className="type-picker">
              <button className="type-option" onClick={() => setStep('config-asset')}>
                <TrendingUp size={20} />
                <div className="type-option-text">
                  <div className="type-option-name">Asset</div>
                  <div className="type-option-desc">Track a stock, crypto, ETF, or currency</div>
                </div>
              </button>
              <button className="type-option" onClick={() => setStep('config-time')}>
                <Clock size={20} />
                <div className="type-option-text">
                  <div className="type-option-name">Time</div>
                  <div className="type-option-desc">Live clock for a timezone</div>
                </div>
              </button>
              <button className="type-option" onClick={() => setStep('config-news')}>
                <Newspaper size={20} />
                <div className="type-option-text">
                  <div className="type-option-name">News</div>
                  <div className="type-option-desc">Headlines from a news source</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'config-asset') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <button className="modal-back" onClick={() => setStep('pick-type')}><ArrowLeft size={16} /></button>
            <span className="modal-title">Add Asset Widget</span>
            <button className="modal-close" onClick={onClose}><X size={16} /></button>
          </div>
          <form onSubmit={handleAssetSubmit}>
            <div className="modal-body">
              <div className="form-label" ref={dropdownRef}>
                Symbol
                <div className="search-input-wrap">
                  <Search size={14} className="search-icon" />
                  <input
                    className="form-input search-input"
                    type="text"
                    value={query}
                    onChange={(e) => handleAssetQueryChange(e.target.value)}
                    placeholder="Search Yahoo Finance..."
                    autoFocus
                  />
                  {searching && <span className="search-spinner" />}
                </div>
                {showDropdown && (
                  <div className="autocomplete-dropdown">
                    {results.map((r) => (
                      <button key={r.symbol} type="button" className="autocomplete-item" onClick={() => handleSelectAsset(r)}>
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
                Label
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
                  <input className="form-input form-input-readonly" type="text" value={loadingCurrency ? 'Loading...' : currency} readOnly />
                </label>
              </div>

              {error && <div className="form-error">{error}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isPending || !selected || loadingCurrency}>
                {isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'config-news') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <button className="modal-back" onClick={() => setStep('pick-type')}><ArrowLeft size={16} /></button>
            <span className="modal-title">Add News Widget</span>
            <button className="modal-close" onClick={onClose}><X size={16} /></button>
          </div>
          <form onSubmit={handleNewsSubmit}>
            <div className="modal-body">
              <label className="form-label">
                News Feed
                <div className="search-input-wrap">
                  <Search size={14} className="search-icon" />
                  <input
                    className="form-input search-input"
                    type="text"
                    value={selectedFeed ? feedDisplayName(selectedFeed) : feedQuery}
                    onChange={(e) => { setFeedQuery(e.target.value); setSelectedFeed(null); setFeedLabel(''); }}
                    placeholder="Search news feeds..."
                    autoFocus
                  />
                </div>
                <div className="tz-list">
                  {filteredFeeds.map((f) => (
                    <button
                      key={f.feed_key}
                      type="button"
                      className={`tz-item ${selectedFeed?.feed_key === f.feed_key ? 'selected' : ''}`}
                      onClick={() => { setSelectedFeed(f); setFeedLabel(feedDisplayName(f)); }}
                    >
                      <span className="tz-item-name">{feedDisplayName(f)}</span>
                      <span className="tz-item-id">{f.feed_key}</span>
                    </button>
                  ))}
                  {filteredFeeds.length === 0 && (
                    <div className="tz-empty">No matching feeds</div>
                  )}
                </div>
              </label>

              <label className="form-label">
                Label
                <input
                  className="form-input"
                  type="text"
                  value={feedLabel}
                  onChange={(e) => setFeedLabel(e.target.value)}
                  placeholder={selectedFeed ? feedDisplayName(selectedFeed) : 'Select a feed first'}
                />
              </label>

              {error && <div className="form-error">{error}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isPending || !selectedFeed}>
                {isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button className="modal-back" onClick={() => setStep('pick-type')}><ArrowLeft size={16} /></button>
          <span className="modal-title">Add Time Widget</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleTimeSubmit}>
          <div className="modal-body">
            <label className="form-label">
              Timezone
              <div className="search-input-wrap">
                <Search size={14} className="search-icon" />
                <input
                  className="form-input search-input"
                  type="text"
                  value={selectedTz ? tzDisplayName(selectedTz) : tzQuery}
                  onChange={(e) => { setTzQuery(e.target.value); setSelectedTz(''); }}
                  placeholder="Search timezone..."
                  autoFocus
                />
              </div>
              <div className="tz-list">
                {filteredTimezones.map((tz) => (
                  <button
                    key={tz}
                    type="button"
                    className={`tz-item ${selectedTz === tz ? 'selected' : ''}`}
                    onClick={() => { setSelectedTz(tz); setTzLabel(tzDisplayName(tz)); }}
                  >
                    <span className="tz-item-name">{tzDisplayName(tz)}</span>
                    <span className="tz-item-id">{tz}</span>
                  </button>
                ))}
                {filteredTimezones.length === 0 && (
                  <div className="tz-empty">No matching timezones</div>
                )}
              </div>
            </label>

            <label className="form-label">
              Label
              <input
                className="form-input"
                type="text"
                value={tzLabel}
                onChange={(e) => setTzLabel(e.target.value)}
                placeholder={selectedTz ? tzDisplayName(selectedTz) : 'Select a timezone first'}
              />
            </label>

            <div className="form-label">
              Display Mode
              <div className="mode-toggle">
                <button
                  type="button"
                  className={`mode-toggle-btn ${clockMode === 'analog' ? 'active' : ''}`}
                  onClick={() => setClockMode('analog')}
                >Analog</button>
                <button
                  type="button"
                  className={`mode-toggle-btn ${clockMode === 'digital' ? 'active' : ''}`}
                  onClick={() => setClockMode('digital')}
                >Digital</button>
              </div>
            </div>

            {error && <div className="form-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isPending || !selectedTz}>
              {isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWidgetModal;
