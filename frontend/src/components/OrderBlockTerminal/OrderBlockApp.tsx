import React, { useState, useEffect } from 'react';
import { MarketFlowChart } from './MarketFlowChart';
import { RankedCardsColumn, type SetupCardItem } from './RankedCardsColumn';
import { ZoneInspectorModal } from './ZoneInspectorModal';
import { RefreshCw, Activity } from 'lucide-react';

interface OrderBlockAppProps {
  onOpenFullChart: (symbol: string) => void;
  theme: 'light' | 'dark';
}

export const OrderBlockApp: React.FC<OrderBlockAppProps> = ({
  onOpenFullChart,
  theme,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSetup, setSelectedSetup] = useState<SetupCardItem | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  const fetchTerminalData = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://127.0.0.1:8000/api/v1/orderblock/terminal');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.bear_setups && json.bear_setups.length > 0) {
          const defaultItem = json.bear_setups[0]; // INFY
          setSelectedSetup(defaultItem);
        }
      }
    } catch (e) {
      console.error('Failed to fetch order block terminal data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerminalData();
  }, []);

  const handleSelectStock = (symbol: string) => {
    if (!data) return;
    const all = [...(data.bull_setups || []), ...(data.bear_setups || [])];
    const match = all.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
    if (match) {
      setSelectedSetup(match);
      setIsInspectorOpen(true);
    }
  };

  const handleSelectSetup = (setup: SetupCardItem) => {
    setSelectedSetup(setup);
    setIsInspectorOpen(true);
  };

  if (loading && !data) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--ob-text-muted)',
        fontFamily: 'var(--font-mono)'
      }}>
        <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--ob-bull)', marginBottom: '12px' }} />
        <p>Scanning F&amp;O Universe for Live Order Blocks &amp; Liquidity...</p>
      </div>
    );
  }

  return (
    <div className="ob-terminal-content">
      {/* Telemetry Summary Strip */}
      {data?.market_summary && (
        <div className="ob-telemetry-strip">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)'
              }} />
              <strong style={{ color: 'var(--ob-text)' }}>NSE F&amp;O ORDER BLOCK TERMINAL</strong>
              <span style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                backgroundColor: 'var(--ob-card-hover)',
                color: 'var(--ob-text-muted)'
              }}>
                {data.market_summary.session_time}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--ob-text-muted)' }}>
              <span>NIFTY 50: <strong style={{ color: 'var(--ob-text)' }}>{data.market_summary.nifty_spot.toLocaleString()}</strong> ({data.market_summary.nifty_change})</span>
              <span>·</span>
              <span>Bullish Count: <strong style={{ color: 'var(--ob-bull)' }}>{data.market_summary.bullish_count}</strong></span>
              <span>·</span>
              <span>Bearish Count: <strong style={{ color: 'var(--ob-bear)' }}>{data.market_summary.bearish_count}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {selectedSetup && (
              <button
                onClick={() => setIsInspectorOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--ob-border)',
                  backgroundColor: 'var(--ob-card-hover)',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: selectedSetup.badge === 'BULL' ? 'var(--ob-bull)' : 'var(--ob-bear)',
                  cursor: 'pointer'
                }}
              >
                <Activity size={12} />
                <span>Inspect Zone: {selectedSetup.symbol}</span>
              </button>
            )}

            <button
              onClick={fetchTerminalData}
              style={{
                background: 'transparent',
                border: '1px solid var(--ob-border)',
                padding: '5px 8px',
                borderRadius: '6px',
                color: 'var(--ob-text-muted)',
                cursor: 'pointer'
              }}
              title="Refresh Market Board"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      )}

      {/* Main Grid Workspace: Left Flow Pane (~62%) and Right Ranked Pane (~38%) */}
      <div className="ob-grid-workspace">
        <MarketFlowChart
          trajectories={data?.trajectories || []}
          compositeCurve={data?.market_composite_curve || []}
          sectors={data?.sectors || []}
          timePoints={data?.time_points || []}
          selectedSymbol={selectedSetup?.symbol || null}
          onSelectStock={handleSelectStock}
          theme={theme}
        />

        <RankedCardsColumn
          bullSetups={data?.bull_setups || []}
          bearSetups={data?.bear_setups || []}
          selectedSymbol={selectedSetup?.symbol || null}
          onSelectSetup={handleSelectSetup}
          theme={theme}
        />
      </div>

      {/* Center Floating Zone Inspector Popover Modal */}
      {isInspectorOpen && selectedSetup && (
        <ZoneInspectorModal
          setup={selectedSetup}
          onClose={() => setIsInspectorOpen(false)}
          onOpenFullChart={onOpenFullChart}
          theme={theme}
        />
      )}
    </div>
  );
};
