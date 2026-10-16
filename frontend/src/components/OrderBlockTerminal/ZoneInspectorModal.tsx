import React from 'react';
import type { SetupCardItem } from './RankedCardsColumn';
import { X, Lock, ExternalLink, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ZoneInspectorModalProps {
  setup: SetupCardItem | null;
  onClose: () => void;
  onOpenFullChart: (symbol: string) => void;
  theme: 'light' | 'dark';
}

export const ZoneInspectorModal: React.FC<ZoneInspectorModalProps> = ({
  setup,
  onClose,
  onOpenFullChart,
  theme,
}) => {
  if (!setup) return null;

  const isLight = theme === 'light';
  const isBull = setup.badge === 'BULL';

  const renderCandlestickZoneChart = () => {
    const candles = setup.candles || [];
    if (candles.length === 0) return null;

    const w = 440;
    const h = 180;
    const padX = 25;
    const padY = 20;

    const allPrices = candles.flatMap((c) => [c.high, c.low]);
    allPrices.push(setup.levels.r1, setup.levels.s1, setup.zone.high, setup.zone.low);
    if (setup.levels.r2) allPrices.push(setup.levels.r2);
    if (setup.levels.s2) allPrices.push(setup.levels.s2);

    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    const range = maxP - minP || 1;

    const getY = (price: number) => {
      return padY + (h - padY * 2) * (1 - (price - minP) / range);
    };

    const getX = (idx: number) => {
      return padX + (idx / (candles.length - 1)) * (w - padX * 2);
    };

    const zoneTop = getY(setup.zone.high);
    const zoneBottom = getY(setup.zone.low);
    const zoneHeight = Math.max(8, zoneBottom - zoneTop);
    const zoneEqY = getY(setup.zone.eq);

    return (
      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{
          width: '100%',
          height: '180px',
          borderRadius: '10px',
          backgroundColor: 'var(--ob-card-hover)',
          border: '1px solid var(--ob-border)'
        }}
      >
        <defs>
          <linearGradient id="modalZoneFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isBull ? '#10b981' : '#ef4444'} stopOpacity="0.25" />
            <stop offset="100%" stopColor={isBull ? '#10b981' : '#ef4444'} stopOpacity="0.10" />
          </linearGradient>
        </defs>

        {/* Resistance Levels */}
        {setup.levels.r2 && (
          <g>
            <line x1={padX} y1={getY(setup.levels.r2)} x2={w - padX} y2={getY(setup.levels.r2)} stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3 3" />
            <text x={padX + 4} y={getY(setup.levels.r2) - 3} fill="#f59e0b" fontSize="8" fontFamily="var(--font-mono)">R2 {setup.levels.r2.toFixed(1)}</text>
          </g>
        )}
        <line x1={padX} y1={getY(setup.levels.r1)} x2={w - padX} y2={getY(setup.levels.r1)} stroke="#f59e0b" strokeWidth="0.9" strokeDasharray="3 3" />
        <text x={padX + 4} y={getY(setup.levels.r1) - 3} fill="#f59e0b" fontSize="8" fontFamily="var(--font-mono)">R1 {setup.levels.r1.toFixed(1)}</text>

        {/* Order Block Shaded Box (Zone Z) */}
        <rect
          x={padX}
          y={zoneTop}
          width={w - padX * 2}
          height={zoneHeight}
          fill="url(#modalZoneFill)"
          stroke={isBull ? '#10b981' : '#ef4444'}
          strokeWidth="1"
          rx="2"
        />
        {/* 50% Equilibrium Dotted Line */}
        <line
          x1={padX}
          y1={zoneEqY}
          x2={w - padX}
          y2={zoneEqY}
          stroke={isBull ? '#059669' : '#dc2626'}
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <text x={w - padX - 40} y={zoneEqY - 3} fill={isBull ? '#059669' : '#dc2626'} fontSize="8" fontFamily="var(--font-mono)" fontWeight="bold">
          ZONE Z
        </text>

        {/* Support Levels */}
        <line x1={padX} y1={getY(setup.levels.s1)} x2={w - padX} y2={getY(setup.levels.s1)} stroke="#10b981" strokeWidth="0.9" strokeDasharray="3 3" />
        <text x={padX + 4} y={getY(setup.levels.s1) + 9} fill="#10b981" fontSize="8" fontFamily="var(--font-mono)">S1 {setup.levels.s1.toFixed(1)}</text>
        {setup.levels.s2 && (
          <g>
            <line x1={padX} y1={getY(setup.levels.s2)} x2={w - padX} y2={getY(setup.levels.s2)} stroke="#10b981" strokeWidth="0.8" strokeDasharray="3 3" />
            <text x={padX + 4} y={getY(setup.levels.s2) + 9} fill="#10b981" fontSize="8" fontFamily="var(--font-mono)">S2 {setup.levels.s2.toFixed(1)}</text>
          </g>
        )}

        {/* Blue VWAP Guide Line */}
        <line
          x1={padX}
          y1={getY(setup.vwap)}
          x2={w - padX}
          y2={getY(setup.vwap)}
          stroke="#3b82f6"
          strokeWidth="0.8"
          strokeDasharray="4 2"
          opacity="0.75"
        />

        {/* Candlesticks */}
        {candles.map((c, idx) => {
          const x = getX(idx);
          const candleW = Math.max(3, (w - padX * 2) / candles.length - 3);
          const isGreen = c.close >= c.open;
          const bodyTop = getY(Math.max(c.open, c.close));
          const bodyBottom = getY(Math.min(c.open, c.close));
          const bodyH = Math.max(2, bodyBottom - bodyTop);

          const wickColor = isGreen ? '#10b981' : '#ef4444';
          const bodyColor = isGreen ? '#10b981' : '#ef4444';

          return (
            <g key={idx}>
              <line
                x1={x}
                y1={getY(c.high)}
                x2={x}
                y2={getY(c.low)}
                stroke={wickColor}
                strokeWidth="1"
              />
              <rect
                x={x - candleW / 2}
                y={bodyTop}
                width={candleW}
                height={bodyH}
                fill={bodyColor}
                rx="0.5"
              />
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="ob-modal-backdrop" onClick={onClose}>
      <div className="ob-inspector-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ob-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: '800',
              backgroundColor: isBull ? 'var(--ob-bull-bg)' : 'var(--ob-bear-bg)',
              color: isBull ? 'var(--ob-bull)' : 'var(--ob-bear)'
            }}>
              {setup.symbol.slice(0, 2)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '15px', color: 'var(--ob-text)' }}>{setup.symbol}</strong>
                <span className={`ob-buildup-pill ${isBull ? 'bull' : 'bear'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                  {setup.buildup}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--ob-text-muted)' }}>{setup.name} · F&amp;O Segment</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>
                ₹{setup.price.toLocaleString()}
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: '700',
                fontFamily: 'var(--font-mono)',
                color: isBull ? 'var(--ob-bull)' : 'var(--ob-bear)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '2px'
              }}>
                {isBull ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {setup.change_pct >= 0 ? `+${setup.change_pct}%` : `${setup.change_pct}%`}
              </div>
            </div>

            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--ob-text-muted)', cursor: 'pointer', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="ob-modal-body">
          {/* Institutional Metrics Grid (2 columns x 5 rows) */}
          <div className="ob-metrics-grid">
            <div className="ob-metric-row">
              <span style={{ color: 'var(--ob-text-muted)' }}>RANK:</span>
              <strong style={{ color: 'var(--ob-text)' }}>#{setup.rank} {setup.badge} (F&amp;O)</strong>
            </div>
            <div className="ob-metric-row">
              <span style={{ color: 'var(--ob-text-muted)' }}>CONV:</span>
              <strong style={{ color: 'var(--ob-bull)' }}>{setup.conviction}</strong>
            </div>

            <div className="ob-metric-row">
              <span style={{ color: 'var(--ob-text-muted)' }}>OI:</span>
              <strong style={{ color: 'var(--ob-text)' }}>{setup.oi} ({setup.oi_delta})</strong>
            </div>
            <div className="ob-metric-row">
              <span style={{ color: 'var(--ob-text-muted)' }}>A (Flow):</span>
              <strong style={{ color: 'var(--ob-text)' }}>0.92 (High Liquidity)</strong>
            </div>

            <div className="ob-metric-row">
              <span style={{ color: 'var(--ob-text-muted)' }}>VWAP:</span>
              <strong style={{ color: '#3b82f6' }}>₹{setup.vwap.toFixed(2)}</strong>
            </div>
            <div className="ob-metric-row">
              <span style={{ color: 'var(--ob-text-muted)' }}>OD:</span>
              <strong style={{ color: 'var(--ob-text-muted)' }}>11:05:00 IST</strong>
            </div>

            <div className="ob-metric-row">
              <span style={{ color: 'var(--ob-text-muted)' }}>Z / R1:</span>
              <strong style={{ color: '#d97706' }}>{setup.zone.low.toFixed(1)} / {setup.levels.r1.toFixed(1)}</strong>
            </div>
            <div className="ob-metric-row">
              <span style={{ color: 'var(--ob-text-muted)' }}>S1 / S2:</span>
              <strong style={{ color: 'var(--ob-text)' }}>{setup.levels.s1.toFixed(1)} / {setup.levels.s2.toFixed(1)}</strong>
            </div>

            <div className="ob-metric-row">
              <span style={{ color: 'var(--ob-text-muted)' }}>R:R:</span>
              <strong style={{ color: 'var(--ob-bull)' }}>{setup.rr_ratio}</strong>
            </div>
            <div className="ob-metric-row">
              <span style={{ color: 'var(--ob-text-muted)' }}>RULE:</span>
              <strong style={{ color: isBull ? 'var(--ob-bull)' : 'var(--ob-bear)' }}>{setup.rule}</strong>
            </div>
          </div>

          {/* Mini Candlestick Zone Chart */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
              <span style={{ fontWeight: '700', color: 'var(--ob-text)' }}>
                Order Block Rejection &amp; Zone Z
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ob-text-muted)' }}>
                ZONE {setup.zone.low.toLocaleString()} – {setup.zone.high.toLocaleString()}
              </span>
            </div>
            {renderCandlestickZoneChart()}
          </div>
        </div>

        {/* Footer */}
        <div className="ob-modal-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ob-text-muted)' }}>
            <Lock size={13} style={{ color: '#7c3aed' }} />
            <span>INSTITUTIONAL ACCESS UNLOCKED</span>
          </div>

          <button
            onClick={() => onOpenFullChart(setup.symbol)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: isLight ? '#0f172a' : '#10b981',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <span>Open in Full Terminal</span>
            <ExternalLink size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
