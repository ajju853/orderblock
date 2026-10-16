import React from 'react';
import type { OrderBlockZone, AnalysisResult } from '../types';
import { ShieldAlert, Crosshair, Sparkles, History } from 'lucide-react';

interface ZoneInspectorProps {
  selectedZone: OrderBlockZone | null;
  analysis: AnalysisResult | null;
  onSelectZone: (zone: OrderBlockZone | null) => void;
  onAskAI: (prompt: string, zoneId?: string) => void;
}

export const ZoneInspector: React.FC<ZoneInspectorProps> = ({
  selectedZone,
  analysis,
  onSelectZone,
  onAskAI,
}) => {
  if (!selectedZone) {
    const activeOBs = analysis?.order_blocks || [];
    return (
      <div className="inspector-card">
        <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-secondary)' }}>
          <Crosshair size={32} style={{ color: 'var(--accent)', marginBottom: 8 }} />
          <h4 style={{ color: 'var(--text-primary)', marginBottom: 6 }}>Select an Order Block</h4>
          <p style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
            Click any green (Bullish) or red (Bearish) zone on the chart to inspect its price bounds, source candle, and mitigation lifecycle.
          </p>
        </div>

        {activeOBs.length > 0 && (
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
              Active Zones on Chart ({activeOBs.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeOBs.map((ob) => {
                const isBull = ob.type === 'bullish';
                return (
                  <div
                    key={ob.id}
                    onClick={() => onSelectZone(ob)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: isBull ? 'var(--bullish)' : 'var(--bearish)',
                        }}
                      />
                      <span style={{ fontWeight: 600 }}>{isBull ? 'Bullish OB' : 'Bearish OB'}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                        ₹{ob.low} - ₹{ob.high}
                      </span>
                    </div>
                    <span className={`lifecycle-badge ${ob.status}`}>{ob.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  const isBull = selectedZone.type === 'bullish';

  return (
    <div className="inspector-card">
      <div className={`zone-header-card ${selectedZone.type}`}>
        <div className="zone-title-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`zone-badge ${selectedZone.type}`}>
              {selectedZone.type} Order Block
            </span>
            <span className={`lifecycle-badge ${selectedZone.status}`}>
              {selectedZone.status}
            </span>
          </div>
          <button
            onClick={() => onSelectZone(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Clear
          </button>
        </div>

        <div className="price-grid">
          <div className="metric-cell">
            <div className="label">Zone High</div>
            <div className="value">₹{selectedZone.high}</div>
          </div>
          <div className="metric-cell">
            <div className="label">Zone Low</div>
            <div className="value">₹{selectedZone.low}</div>
          </div>
          <div className="metric-cell">
            <div className="label">50% Equilibrium</div>
            <div className="value" style={{ color: 'var(--accent)' }}>
              ₹{selectedZone.eq_price}
            </div>
          </div>
          <div className="metric-cell">
            <div className="label">Displacement</div>
            <div className="value" style={{ color: isBull ? 'var(--bullish)' : 'var(--bearish)' }}>
              +{selectedZone.displacement_pct}%
            </div>
          </div>
        </div>
      </div>

      {/* Retest & Mitigation Lifecycle Status */}
      <div style={{ background: 'var(--bg-card)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
          <History size={14} />
          <span>Lifecycle Evidence & Mitigation</span>
        </div>
        <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Test Retouches:</span>
            <span style={{ fontWeight: 600 }}>{selectedZone.test_count} touches</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Source Candle:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{selectedZone.source_candle_time}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Confirmed At:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{selectedZone.detected_at}</span>
          </div>
        </div>
      </div>

      {/* Invalidation Rules Card */}
      <div style={{ background: 'rgba(255, 82, 82, 0.08)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 82, 82, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--bearish)', marginBottom: 6 }}>
          <ShieldAlert size={14} />
          <span style={{ fontWeight: 600 }}>Invalidation Barrier (Stop Loss Rule)</span>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Candle close {isBull ? `BELOW ₹${selectedZone.low}` : `ABOVE ₹${selectedZone.high}`} invalidates this institutional setup.
        </p>
      </div>

      {/* Instant AI Explain CTA */}
      <button
        className="action-btn primary"
        style={{ width: '100%', justifyContent: 'center', padding: '10px 0' }}
        onClick={() => onAskAI(`Bhai is ${selectedZone.type} order block ko explain karo aur risk kya hai?`, selectedZone.id)}
      >
        <Sparkles size={16} />
        <span>Ask Ollama to Explain This Zone</span>
      </button>
    </div>
  );
};
