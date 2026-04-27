import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Search } from 'lucide-react';
import { updateWidget } from '../api/widgets';
import { apiClient } from '../api/client';
import type { Widget } from '../api/types';

interface EditWidgetModalProps {
  widget: Widget | null;
  onClose: () => void;
}

function tzDisplayName(tz: string): string {
  return tz.split('/').pop()?.replace(/_/g, ' ') || tz;
}

const fetchTimezones = async (): Promise<string[]> => {
  const { data } = await apiClient.get<string[]>('/timezones');
  return data;
};

function EditWidgetForm({ widget, onClose }: { widget: Widget; onClose: () => void }) {
  const queryClient = useQueryClient();

  const { data: allTimezones = [] } = useQuery({
    queryKey: ['timezones'],
    queryFn: fetchTimezones,
    staleTime: Infinity,
    enabled: widget.type === 'time',
  });

  const [label, setLabel] = useState((widget.config.label as string) || '');
  const [selectedTz, setSelectedTz] = useState((widget.config.timezone as string) || '');
  const [tzQuery, setTzQuery] = useState('');
  const [clockMode, setClockMode] = useState<'analog' | 'digital'>(
    ((widget.config.mode as string) || 'analog') as 'analog' | 'digital'
  );
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (config: Record<string, unknown>) => updateWidget(widget.id, { config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      onClose();
    },
    onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
      setError(err.response?.data?.detail || 'Failed to update widget');
    },
  });

  const filteredTimezones = tzQuery.trim()
    ? allTimezones.filter((tz) =>
        tz.toLowerCase().includes(tzQuery.toLowerCase()) ||
        tzDisplayName(tz).toLowerCase().includes(tzQuery.toLowerCase())
      )
    : allTimezones;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) { setError('Label is required'); return; }
    setError('');

    if (widget.type === 'asset') {
      mutation.mutate({ ...widget.config, label: label.trim() });
    } else {
      if (!selectedTz) { setError('Select a timezone'); return; }
      mutation.mutate({
        ...widget.config,
        label: label.trim(),
        timezone: selectedTz,
        mode: clockMode,
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            Edit {widget.type === 'asset' ? 'Asset' : 'Time'} Widget
          </span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label className="form-label">
              Label
              <input
                className="form-input"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Widget label"
                autoFocus
              />
            </label>

            {widget.type === 'time' && (
              <>
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
                    />
                  </div>
                  <div className="tz-list">
                    {filteredTimezones.map((tz) => (
                      <button
                        key={tz}
                        type="button"
                        className={`tz-item ${selectedTz === tz ? 'selected' : ''}`}
                        onClick={() => setSelectedTz(tz)}
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
              </>
            )}

            {error && <div className="form-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const EditWidgetModal: React.FC<EditWidgetModalProps> = ({ widget, onClose }) => {
  if (!widget) return null;
  return <EditWidgetForm key={widget.id} widget={widget} onClose={onClose} />;
};

export default EditWidgetModal;
