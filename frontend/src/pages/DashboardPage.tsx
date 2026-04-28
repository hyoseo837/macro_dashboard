import { useState, useEffect } from 'react';
import { useWidgets } from '../hooks/useWidgets';
import { useAssets } from '../hooks/useAssets';
import { usePrices } from '../hooks/usePrices';
import { useAuth } from '../contexts/AuthContext';
import WidgetGrid from '../components/WidgetGrid';
import AddWidgetModal from '../components/AddWidgetModal';
import { Settings, Lock, Plus, LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { data: widgets, isLoading: widgetsLoading } = useWidgets();
  const [editMode, setEditMode] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

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
          {user?.is_admin && (
            <button className="edit-mode-btn" onClick={() => navigate('/admin')} title="Admin panel">
              <Shield size={14} />
              <span>Admin</span>
            </button>
          )}
          <button className="edit-mode-btn" onClick={handleLogout} title="Log out">
            <LogOut size={14} />
            <span>Logout</span>
          </button>
          <div className="timestamp">
            {user?.email} &nbsp;&middot;&nbsp; updated {lastUpdated} &nbsp;&middot;&nbsp; v3.0.0
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
