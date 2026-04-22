import { useState, useRef, useEffect } from 'react';
import { useAssets } from './hooks/useAssets';
import { usePrices } from './hooks/usePrices';
import AssetCard from './components/AssetCard';
import AddAssetModal from './components/AddAssetModal';
import { Plus } from 'lucide-react';

function App() {
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newAssetIds, setNewAssetIds] = useState<Set<string>>(new Set());
  const [pendingPrice, setPendingPrice] = useState(false);
  const prevAssetIdsRef = useRef<Set<string>>(new Set());

  const { data: prices, dataUpdatedAt } = usePrices(pendingPrice ? 3000 : 60000);

  useEffect(() => {
    if (!assets) return;
    const currentIds = new Set(assets.map((a) => a.id));
    const prev = prevAssetIdsRef.current;
    if (prev.size > 0) {
      const added = new Set<string>();
      currentIds.forEach((id) => { if (!prev.has(id)) added.add(id); });
      if (added.size > 0) {
        setNewAssetIds(added);
        setPendingPrice(true);
        setTimeout(() => setNewAssetIds(new Set()), 600);
      }
    }
    prevAssetIdsRef.current = currentIds;
  }, [assets]);

  useEffect(() => {
    if (!pendingPrice || !assets || !prices) return;
    const allHavePrices = assets.every((a) => prices.some((p) => p.id === a.id));
    if (allHavePrices) setPendingPrice(false);
  }, [pendingPrice, assets, prices]);

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';

  if (assetsLoading || !assets) {
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
        <div className="timestamp">
          updated {lastUpdated} &nbsp;·&nbsp; {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div className="dashboard">
        <div className="section-label">Assets</div>

        <div className="asset-grid">
          {assets.map((asset) => {
            const price = prices?.find((p) => p.id === asset.id);
            const isNew = newAssetIds.has(asset.id);
            return <AssetCard key={asset.id} asset={asset} price={price ?? null} isNew={isNew} />;
          })}
          <button className="add-asset-card" onClick={() => setAddModalOpen(true)}>
            <Plus size={24} strokeWidth={1.5} />
            <span>Add Asset</span>
          </button>
        </div>

        {/* [v2 - deferred] news section */}
        <div className="section-label" style={{ marginTop: '24px' }}>Market News [v2]</div>
        <div className="news-grid" style={{ opacity: 0.2, pointerEvents: 'none' }}>
          <div className="news-card">
            <div className="news-source">SYSTEM</div>
            <div className="news-headline">News ingestion deferred to v2</div>
            <div className="news-summary">Summarized headlines with AI are planned for the next major release.</div>
          </div>
        </div>
      </div>

      <AddAssetModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </>
  );
}

export default App;
