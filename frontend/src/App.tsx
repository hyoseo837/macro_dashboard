import { useState, useEffect } from 'react';
import { useWidgets } from './hooks/useWidgets';
import { useAssets } from './hooks/useAssets';
import { usePrices } from './hooks/usePrices';
import WidgetGrid from './components/WidgetGrid';
import AddWidgetModal from './components/AddWidgetModal';
import { Settings, Lock, Plus } from 'lucide-react';

function App() {
  const { data: widgets, isLoading: widgetsLoading } = useWidgets();
  const [editMode, setEditMode] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  useAssets();
  const { data: prices, refetch: refetchPrices } = usePrices(60000);

  useEffect(() => {
    const assetIds = (widgets ?? [])
      .filter((w) => w.type === 'asset')
      .map((w) => w.config.asset_id as string);
    const priceIds = new Set((prices ?? []).map((p) => p.id));
    if (assetIds.length === 0 || assetIds.every((id) => priceIds.has(id))) return;

    const id = setInterval(() => refetchPrices(), 3000);
    return () => clearInterval(id);
  }, [widgets, prices, refetchPrices]);

  const lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (widgetsLoading || !widgets) {
    return (
      <div className="flex items-center justify-center min-h-screen font-mono text-[var(--text-dim)]">
        INITIALIZING_SYSTEM...
      </div>
    );
  }

  return (
    <>
      <div className="top-strip">
        <div className="page-title"><span>///</span>Macro</div>
        <div className="top-strip-right">
          {editMode && (
            <button className="edit-mode-btn" onClick={() => setAddModalOpen(true)}>
              <Plus size={14} />
              <span>Add</span>
            </button>
          )}
          <button
            className={`edit-mode-btn ${editMode ? 'active' : ''}`}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? <Lock size={14} /> : <Settings size={14} />}
            <span>{editMode ? 'Lock' : 'Edit'}</span>
          </button>
          <div className="timestamp">
            updated {lastUpdated} &nbsp;·&nbsp; {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} &nbsp;·&nbsp; v2.0.0
          </div>
        </div>
      </div>

      <div className="dashboard">
        <WidgetGrid widgets={widgets} editMode={editMode} />
      </div>

      <AddWidgetModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </>
  );
}

export default App;
