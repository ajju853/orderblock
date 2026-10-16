import React, { useState, useEffect } from 'react';

export const OptionsHub: React.FC<{ activeSymbol: string }> = ({ activeSymbol }) => {
  const [chainData, setChainData] = useState<any | null>(null);
  const [payoffData, setPayoffData] = useState<any | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('BULL_CALL_SPREAD');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`http://127.0.0.1:8000/api/v1/options/chain?symbol=${encodeURIComponent(activeSymbol)}`).then((r) => r.json()),
      fetch(`http://127.0.0.1:8000/api/v1/options/payoff?strategy=${selectedStrategy}&symbol=${encodeURIComponent(activeSymbol)}`).then((r) => r.json()),
    ])
      .then(([chain, payoff]) => {
        setChainData(chain);
        setPayoffData(payoff);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [activeSymbol, selectedStrategy]);

  if (loading || !chainData) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Options Analytics & Greeks...</div>;
  }

  return (
    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
      {/* KPI Top Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="metric-cell" style={{ padding: 16 }}>
          <div className="label">Spot Price</div>
          <div className="value" style={{ fontSize: '1.3rem' }}>
            ₹{chainData.spot_price}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ATM Strike: {chainData.atm_strike}</span>
        </div>

        <div className="metric-cell" style={{ padding: 16 }}>
          <div className="label">Put / Call Ratio (PCR)</div>
          <div className="value" style={{ fontSize: '1.3rem', color: chainData.pcr > 1.0 ? 'var(--bullish)' : 'var(--bearish)' }}>
            {chainData.pcr}
          </div>
          <span className={`lifecycle-badge ${chainData.pcr > 1.0 ? 'fresh' : 'invalidated'}`}>
            {chainData.pcr_sentiment}
          </span>
        </div>

        <div className="metric-cell" style={{ padding: 16 }}>
          <div className="label">Max Pain Strike</div>
          <div className="value" style={{ fontSize: '1.3rem', color: 'var(--liq)' }}>
            ₹{chainData.max_pain_strike}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Min payout for option writers</span>
        </div>

        <div className="metric-cell" style={{ padding: 16 }}>
          <div className="label">Total Open Interest (OI)</div>
          <div className="value" style={{ fontSize: '1.3rem' }}>
            {((chainData.total_call_oi + chainData.total_put_oi) / 100000).toFixed(1)}L
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Calls: {(chainData.total_call_oi / 100000).toFixed(1)}L | Puts: {(chainData.total_put_oi / 100000).toFixed(1)}L
          </span>
        </div>
      </div>

      {/* Payoff Visualizer & Strategy Selection */}
      <div style={{ background: 'var(--bg-card)', padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Strategy Payoff Diagram</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Risk profile, Breakeven levels, and Maximum Profit/Loss on Expiry.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {['BULL_CALL_SPREAD', 'IRON_CONDOR', 'LONG_STRADDLE'].map((strat) => (
              <button
                key={strat}
                className={`tf-btn ${selectedStrategy === strat ? 'active' : ''}`}
                onClick={() => setSelectedStrategy(strat)}
                style={{ fontSize: '0.75rem' }}
              >
                {strat.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {payoffData && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'center' }}>
            {/* SVG Payoff Curve */}
            <div style={{ height: 160, background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', padding: 10 }}>
              <svg width="100%" height="100%" viewBox="0 0 600 140" preserveAspectRatio="none">
                {/* Zero line */}
                <line x1="0" y1="70" x2="600" y2="70" stroke="#334155" strokeDasharray="3 3" />
                {(() => {
                  const pts = payoffData.curve || [];
                  if (pts.length < 2) return null;
                  const minP = Math.min(...pts.map((p: any) => p.payoff));
                  const maxP = Math.max(...pts.map((p: any) => p.payoff));
                  const range = Math.max(1, maxP - minP);
                  const path = pts
                    .map((p: any, i: number) => {
                      const x = (i / (pts.length - 1)) * 600;
                      const y = 140 - ((p.payoff - minP) / range) * 120 - 10;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ');
                  return <path d={path} fill="none" stroke="#00e5ff" strokeWidth="2.5" />;
                })()}
              </svg>
            </div>

            {/* Strategy Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Max Profit:</span>
                <span style={{ color: 'var(--bullish)', fontWeight: 700 }}>
                  {payoffData.max_profit > 1000 ? 'Unlimited' : `₹${payoffData.max_profit}`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Max Loss:</span>
                <span style={{ color: 'var(--bearish)', fontWeight: 700 }}>
                  ₹{payoffData.max_loss}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Breakeven:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {payoffData.breakeven?.map((b: number) => `₹${b.toFixed(0)}`).join(' / ')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Option Chain Table with Greeks */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
          Option Chain with Black-Scholes Greeks (₹)
        </div>
        <table className="scanner-table" style={{ margin: 0, textAlign: 'center' }}>
          <thead>
            <tr>
              <th colSpan={4} style={{ textAlign: 'center', background: 'rgba(0, 230, 118, 0.05)' }}>CALLS</th>
              <th style={{ textAlign: 'center', background: 'var(--bg-card)' }}>STRIKE</th>
              <th colSpan={4} style={{ textAlign: 'center', background: 'rgba(255, 82, 82, 0.05)' }}>PUTS</th>
            </tr>
            <tr>
              <th>Call OI</th>
              <th>Delta (Δ)</th>
              <th>LTP (₹)</th>
              <th>IV (%)</th>
              <th style={{ background: 'var(--bg-card)' }}>Strike Price</th>
              <th>LTP (₹)</th>
              <th>Delta (Δ)</th>
              <th>Put OI</th>
              <th>Gamma (Γ)</th>
            </tr>
          </thead>
          <tbody>
            {chainData.strikes?.map((row: any) => (
              <tr key={row.strike} style={{ background: row.is_atm ? 'rgba(99, 102, 241, 0.12)' : 'transparent' }}>
                <td style={{ color: 'var(--bullish)' }}>{row.call_oi.toLocaleString('en-IN')}</td>
                <td>{row.call_delta}</td>
                <td style={{ fontWeight: 600 }}>₹{row.call_ltp}</td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.iv.toFixed(1)}%</td>
                <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: row.is_atm ? 'var(--accent)' : '#fff' }}>
                  {row.strike} {row.is_atm && '★ ATM'}
                </td>
                <td style={{ fontWeight: 600 }}>₹{row.put_ltp}</td>
                <td>{row.put_delta}</td>
                <td style={{ color: 'var(--bearish)' }}>{row.put_oi.toLocaleString('en-IN')}</td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.gamma}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
