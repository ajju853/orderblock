import React from 'react';

export interface SetupCardItem {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  change_abs: number;
  badge: 'BULL' | 'BEAR';
  buildup: string;
  oi: string;
  oi_delta: string;
  zone: {
    low: number;
    high: number;
    eq: number;
    status: string;
  };
  levels: {
    r1: number;
    r2: number;
    r3?: number;
    s1: number;
    s2: number;
    liquidity: number;
  };
  risk_pct: number;
  rr_ratio: string;
  conviction: string;
  vwap: number;
  rule: string;
  sparkline: number[];
  candles?: any[];
}

interface RankedCardsColumnProps {
  bullSetups: SetupCardItem[];
  bearSetups: SetupCardItem[];
  selectedSymbol: string | null;
  onSelectSetup: (setup: SetupCardItem) => void;
  theme: 'light' | 'dark';
}

export const RankedCardsColumn: React.FC<RankedCardsColumnProps> = ({
  bullSetups,
  bearSetups,
  selectedSymbol,
  onSelectSetup,
  theme,
}) => {
  const isLight = theme === 'light';

  const renderMiniChart = (sparkline: number[], isBull: boolean) => {
    if (!sparkline || sparkline.length < 2) return null;
    const min = Math.min(...sparkline);
    const max = Math.max(...sparkline);
    const range = max - min || 1;
    const w = 110;
    const h = 32;

    const points = sparkline.map((val, idx) => {
      const x = (idx / (sparkline.length - 1)) * w;
      const y = h - ((val - min) / range) * (h - 6) - 3;
      return `${x},${y}`;
    }).join(' ');

    const strokeColor = isBull ? '#10b981' : '#ef4444';

    return (
      <svg width={w} height={h} style={{ overflow: 'visible' }}>
        <line x1="0" y1="6" x2={w} y2="6" stroke={isLight ? '#cbd5e1' : '#334155'} strokeDasharray="2 2" strokeWidth="0.8" />
        <line x1="0" y1={h - 6} x2={w} y2={h - 6} stroke={isLight ? '#cbd5e1' : '#334155'} strokeDasharray="2 2" strokeWidth="0.8" />
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {sparkline.length > 0 && (
          <circle
            cx={w}
            cy={h - ((sparkline[sparkline.length - 1] - min) / range) * (h - 6) - 3}
            r="3"
            fill={strokeColor}
          />
        )}
      </svg>
    );
  };

  const renderCard = (item: SetupCardItem) => {
    const isBull = item.badge === 'BULL';
    const isSelected = selectedSymbol === item.symbol;

    return (
      <div
        key={item.symbol}
        onClick={() => onSelectSetup(item)}
        className={`ob-setup-card ${
          isSelected
            ? isBull ? 'selected-bull' : 'selected-bear'
            : ''
        }`}
      >
        {/* Top Header Row */}
        <div className="ob-card-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Circular BULL / BEAR Badge */}
            <div className={`ob-badge-circle ${isBull ? 'bull' : 'bear'}`}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isBull ? '#10b981' : '#ef4444'
              }} />
              {item.badge}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <strong style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '-0.01em', color: 'var(--ob-text)' }}>
                {item.symbol}
              </strong>
              <span style={{
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                fontWeight: '700',
                color: isBull ? 'var(--ob-bull)' : 'var(--ob-bear)'
              }}>
                {item.change_pct >= 0 ? `+${item.change_pct}%` : `${item.change_pct}%`}
              </span>
            </div>
          </div>

          {/* Long / Short Build-Up Pill */}
          <div className={`ob-buildup-pill ${isBull ? 'bull' : 'bear'}`}>
            {item.buildup}
          </div>
        </div>

        {/* Middle Row: Zone & Mini Sparkline */}
        <div className="ob-card-mid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--ob-text-muted)' }}>
              <span>OI:</span>
              <strong style={{ color: 'var(--ob-text)' }}>{item.oi}</strong>
              <span>·</span>
              <span>Δ {item.oi_delta}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: '#d97706', fontWeight: '600' }}>ZONE:</span>
              <span style={{ fontWeight: '700', color: 'var(--ob-text)' }}>
                {item.zone.low.toLocaleString()} – {item.zone.high.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Mini Sparkline Chart */}
          <div style={{ paddingLeft: '8px' }}>
            {renderMiniChart(item.sparkline, isBull)}
          </div>
        </div>

        {/* Bottom Metric Levels Row */}
        <div className="ob-card-bottom">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>R1 <strong style={{ color: 'var(--ob-text)' }}>{item.levels.r1.toLocaleString()}</strong></span>
            <span>S1 <strong style={{ color: 'var(--ob-text)' }}>{item.levels.s1.toLocaleString()}</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>RISK <strong style={{ color: isBull ? 'var(--ob-bull)' : 'var(--ob-bear)' }}>{item.risk_pct}%</strong></span>
            <span>R:R <strong style={{ color: 'var(--ob-text)' }}>{item.rr_ratio}</strong></span>
          </div>
        </div>

        {/* Risk meter bar */}
        <div className="ob-risk-bar">
          <div
            className={`ob-risk-bar-fill ${isBull ? 'bull' : 'bear'}`}
            style={{ width: `${Math.min(100, item.risk_pct * 80)}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="ob-ranked-pane">
      {/* Bullish Setups */}
      <div>
        <div className="ob-ranked-section-title">
          <span style={{ color: 'var(--ob-bull)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            BULLISH ORDER BLOCKS ({bullSetups.length})
          </span>
          <span style={{ color: 'var(--ob-text-muted)', fontFamily: 'var(--font-mono)' }}>RANKED BY LIQUIDITY</span>
        </div>
        <div>
          {bullSetups.map((item) => renderCard(item))}
        </div>
      </div>

      {/* Bearish Setups */}
      <div style={{ paddingTop: '10px', borderTop: '1px solid var(--ob-border)' }}>
        <div className="ob-ranked-section-title">
          <span style={{ color: 'var(--ob-bear)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            BEARISH ORDER BLOCKS ({bearSetups.length})
          </span>
          <span style={{ color: 'var(--ob-text-muted)', fontFamily: 'var(--font-mono)' }}>SHORT BUILD-UPS</span>
        </div>
        <div>
          {bearSetups.map((item) => renderCard(item))}
        </div>
      </div>
    </div>
  );
};
