import React, { useState, useEffect } from 'react';
import { Activity, Compass } from 'lucide-react';

export const MarketBreadth: React.FC<{ activeSymbol: string }> = ({ activeSymbol }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/v1/market/breadth?symbol=${encodeURIComponent(activeSymbol)}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [activeSymbol]);

  if (loading || !data) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading sector heatmap & breadth...</div>;
  }

  const pd = data.premium_discount || {};
  const mb = data.market_breadth || {};
  const isDiscount = pd.current_zone === 'DISCOUNT';

  return (
    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
      {/* Top Banner: Breadth & Regime */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Market Breadth & Advance/Decline */}
        <div style={{ background: 'var(--bg-card)', padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>NSE Market Breadth</h3>
            </div>
            <span className={`lifecycle-badge ${mb.market_regime === 'RISK_ON' ? 'fresh' : 'invalidated'}`}>
              {mb.market_regime}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ADVANCE / DECLINE RATIO</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--bullish)' }}>
                {mb.advance_decline_ratio} : 1.0
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>STOCKS ABOVE 20 EMA</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                {mb.pct_above_20_ema}%
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 8, background: 'var(--bearish-bg)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
            <div
              style={{
                width: `${(mb.advances / (mb.advances + mb.declines)) * 100}%`,
                background: 'var(--bullish)',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
            <span style={{ color: 'var(--bullish)' }}>{mb.advances} Advances</span>
            <span style={{ color: 'var(--bearish)' }}>{mb.declines} Declines</span>
          </div>
        </div>

        {/* Premium vs Discount Range Gauge */}
        <div style={{ background: 'var(--bg-card)', padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Compass size={18} style={{ color: 'var(--liq)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Institutional Pricing Range</h3>
            </div>
            <span className={`lifecycle-badge ${isDiscount ? 'fresh' : 'tested'}`}>
              {pd.current_zone} ZONE
            </span>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
            {isDiscount
              ? 'Price is in DISCOUNT zone (< 50% equilibrium). Institutional Smart Money looks for accumulated Long entries.'
              : 'Price is in PREMIUM zone (> 50% equilibrium). Higher risk for new longs; favors short profit-taking.'}
          </p>

          <div style={{ background: 'var(--bg-primary)', padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
              <span>Range Low: ₹{pd.range_low}</span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>50% EQ: ₹{pd.eq}</span>
              <span>Range High: ₹{pd.range_high}</span>
            </div>
            {/* Range Bar */}
            <div style={{ height: 10, background: '#1e293b', borderRadius: 5, position: 'relative', overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  width: '50%',
                  height: '100%',
                  background: 'rgba(0, 230, 118, 0.25)',
                  borderRight: '2px dashed var(--accent)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${Math.min(100, Math.max(0, pd.percent_in_range))}%`,
                  top: 0,
                  width: 4,
                  height: '100%',
                  background: '#ffffff',
                  boxShadow: '0 0 6px #fff',
                }}
              />
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Current Price: ₹{pd.latest_close} ({pd.percent_in_range}% of range)
            </div>
          </div>
        </div>
      </div>

      {/* Sector Performance Heatmap */}
      <div style={{ background: 'var(--bg-card)', padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>
          Indian Sector Performance Heatmap
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {mb.sectors?.map((sec: any) => {
            const isPos = sec.change_pct >= 0;
            return (
              <div
                key={sec.sector}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 14,
                  borderLeft: `4px solid ${isPos ? 'var(--bullish)' : 'var(--bearish)'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{sec.sector}</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: isPos ? 'var(--bullish)' : 'var(--bearish)',
                    }}
                  >
                    {isPos ? '+' : ''}
                    {sec.change_pct}%
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>A/D: {sec.advance_decline}</span>
                  <span>Vol Anomaly: {sec.volume_anomaly}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
