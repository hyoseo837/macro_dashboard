import { useState } from 'react';
import { useWidgets } from './hooks/useWidgets';
import { useAssets } from './hooks/useAssets';
import { usePrices } from './hooks/usePrices';
import WidgetGrid from './components/WidgetGrid';
import { Settings, Lock } from 'lucide-react';

function App() {
  const { data: widgets, isLoading: widgetsLoading } = useWidgets();
  const [editMode, setEditMode] = useState(false);

  useAssets();
  usePrices(60000);

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
    </>
  );
}

export default App;
