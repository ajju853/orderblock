import React, { useState, useEffect } from 'react';
import type { ScannerItem } from '../types';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

interface ScannerProps {
  onSelectInstrument: (symbol: string, timeframe: string) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onSelectInstrument }) => {
  const [items, setItems] = useState<ScannerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterDir, setFilterDir] = useState<'ALL' | 'BULLISH' | 'BEARISH'>('ALL');

  const fetchScan = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/scanner/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error('Failed to run scanner:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScan();
  }, []);

  const filteredItems = items.filter((item) => {
    if (filterDir === 'ALL') return true;
    return item.direction === filterDir;
  });

  return (
    <div className="scanner-container">
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', fontWeight: 700 }}>
            Market Structure & Order Block Scanner
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Real-time multi-asset scanning across Indian markets with algorithmic score ranking.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', background: 'var(--bg-card)', padding: 2, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <button
              className={`tf-btn ${filterDir === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterDir('ALL')}
            >
              All
            </button>
            <button
              className={`tf-btn ${filterDir === 'BULLISH' ? 'active' : ''}`}
              onClick={() => setFilterDir('BULLISH')}
            >
              Bullish
            </button>
            <button
              className={`tf-btn ${filterDir === 'BEARISH' ? 'active' : ''}`}
              onClick={() => setFilterDir('BEARISH')}
            >
              Bearish
            </button>
          </div>

          <button className="action-btn" onClick={fetchScan} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'pulse-dot' : ''} />
            <span>Scan Now</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="scanner-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>TF</th>
            <th>Latest Price</th>
            <th>Structure Trend</th>
            <th>Setup Score</th>
            <th>Active Zones</th>
            <th>Nearest OB Dist</th>
            <th>Scoring Rationale</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => {
            const isBull = item.direction === 'BULLISH';
            const isBear = item.direction === 'BEARISH';
            const scoreClass = item.overall_score >= 70 ? 'high' : item.overall_score >= 40 ? 'mid' : 'low';

            return (
              <tr
                key={`${item.symbol}-${item.timeframe}`}
                onClick={() => onSelectInstrument(item.symbol, item.timeframe)}
              >
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.symbol}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>NSE / CASH</div>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {item.timeframe}
                  </span>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    ₹{item.latest_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: isBull ? 'var(--bullish)' : isBear ? 'var(--bearish)' : 'var(--text-muted)',
                      background: isBull ? 'var(--bullish-bg)' : isBear ? 'var(--bearish-bg)' : 'transparent',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {isBull ? <TrendingUp size={12} /> : isBear ? <TrendingDown size={12} /> : null}
                    {item.trend}
                  </span>
                </td>
                <td>
                  <span className={`score-badge ${scoreClass}`}>{item.overall_score}/100</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6, fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--bullish)' }}>🟢 {item.active_bullish_obs} Bull</span>
                    <span style={{ color: 'var(--bearish)' }}>🔴 {item.active_bearish_obs} Bear</span>
                  </div>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {item.nearest_ob_distance_pct !== null && item.nearest_ob_distance_pct !== undefined
                      ? `${item.nearest_ob_distance_pct}%`
                      : '—'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', maxWidth: 280 }}>
                  {item.status_summary}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
