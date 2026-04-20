import { useAssets } from './hooks/useAssets';
import { usePrices } from './hooks/usePrices';
import AssetCard from './components/AssetCard';

function App() {
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: prices, dataUpdatedAt } = usePrices();

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
            if (!price) return null;
            return <AssetCard key={asset.id} asset={asset} price={price} />;
          })}
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
    </>
  );
}

export default App;
