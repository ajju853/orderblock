import React, { useState, useEffect } from 'react';
import { Layers, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

interface MTFProps {
  activeSymbol: string;
}

export const MTFMatrix: React.FC<MTFProps> = ({ activeSymbol }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMTF = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/analysis/mtf?symbol=${encodeURIComponent(activeSymbol)}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load MTF:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMTF();
  }, [activeSymbol]);

  if (loading || !data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw size={24} className="pulse-dot" style={{ margin: '0 auto 12px' }} />
        <div>Calculating multi-timeframe alignment across 5m, 15m, 1h, 1d...</div>
      </div>
    );
  }

  const isBull = data.overall_bias.includes('BULL');
  const isBear = data.overall_bias.includes('BEAR');

  return (
    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 20,
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Layers size={22} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', fontWeight: 700 }}>
              Multi-Timeframe (MTF) Alignment Matrix
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Institutional confluence analysis combining higher timeframe structural trend with lower timeframe order block execution.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MTF CONFLUENCE SCORE</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
              {data.confluence_score} / 100
            </div>
          </div>
          <span
            className={`zone-badge ${isBull ? 'bullish' : isBear ? 'bearish' : ''}`}
            style={{ fontSize: '0.85rem', padding: '6px 14px' }}
          >
            {data.overall_bias}
          </span>
        </div>
      </div>

      {/* Grid of Timeframe Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
        {Object.entries(data.timeframe_breakdown || {}).map(([tf, val]: [string, any]) => {
          const tfBull = val.trend === 'BULLISH';
          const tfBear = val.trend === 'BEARISH';
          return (
            <div
              key={tf}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                borderTop: `3px solid ${tfBull ? 'var(--bullish)' : tfBear ? 'var(--bearish)' : 'var(--text-muted)'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>{tf}</span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: tfBull ? 'var(--bullish)' : tfBear ? 'var(--bearish)' : 'var(--text-muted)',
                  }}
                >
                  {tfBull ? <ArrowUpRight size={14} /> : tfBear ? <ArrowDownRight size={14} /> : null}
                  {val.trend}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Score:</span>
                  <span style={{ fontWeight: 600 }}>{val.score}/100</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Bullish OBs:</span>
                  <span style={{ color: 'var(--bullish)', fontWeight: 600 }}>{val.active_bullish_obs} zones</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Bearish OBs:</span>
                  <span style={{ color: 'var(--bearish)', fontWeight: 600 }}>{val.active_bearish_obs} zones</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>History:</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{val.candles_count} bars</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* High-Confluence POI Overlaps */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 18 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }}>
          High-Probability Overlapping Points of Interest (POIs)
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
          Zones where multiple timeframes align at the exact same price levels. Institutional orders cluster here.
        </p>

        {data.confluence_zones && data.confluence_zones.length > 0 ? (
          <table className="scanner-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Zone Type</th>
                <th>Overlap Price Range</th>
                <th>Timeframes Aligned</th>
                <th>Strength Rating</th>
              </tr>
            </thead>
            <tbody>
              {data.confluence_zones.map((z: any, idx: number) => {
                const isB = z.type === 'bullish';
                return (
                  <tr key={idx}>
                    <td>
                      <span className={`zone-badge ${isB ? 'bullish' : 'bearish'}`}>
                        {z.type.toUpperCase()} OB
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      ₹{z.overlap_low} - ₹{z.overlap_high}
                    </td>
                    <td>
                      <span style={{ display: 'flex', gap: 6 }}>
                        {z.tfs.map((t: string) => (
                          <span key={t} className="toggle-chip active" style={{ fontSize: '0.72rem' }}>
                            {t}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td>
                      <span className="lifecycle-badge fresh">{z.strength}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '12px 0' }}>
            No multi-timeframe zone overlaps detected currently. Timeframes are evaluating independent levels.
          </div>
        )}
      </div>
    </div>
  );
};
