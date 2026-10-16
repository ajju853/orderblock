import React, { useState, useMemo } from 'react';

interface TrajectoryPoint {
  time: string;
  pct: number;
}

interface TrajectoryItem {
  symbol: string;
  name: string;
  sector: string;
  direction: 'BULL' | 'BEAR';
  change_pct: number;
  curve: TrajectoryPoint[];
}

interface MarketFlowChartProps {
  trajectories: TrajectoryItem[];
  compositeCurve: TrajectoryPoint[];
  sectors: { name: string; change_pct: number; sentiment: string }[];
  timePoints: string[];
  selectedSymbol: string | null;
  onSelectStock: (symbol: string) => void;
  theme: 'light' | 'dark';
}

export const MarketFlowChart: React.FC<MarketFlowChartProps> = ({
  trajectories,
  compositeCurve,
  sectors,
  timePoints,
  selectedSymbol,
  onSelectStock,
  theme,
}) => {
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);

  // SVG dimensions
  const width = 840;
  const height = 480;
  const padLeft = 85;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 35;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const minPct = -3.8;
  const maxPct = 3.2;

  const getX = (index: number) => {
    return padLeft + (index / (timePoints.length - 1)) * chartW;
  };

  const getY = (pct: number) => {
    const clamped = Math.max(minPct, Math.min(maxPct, pct));
    const normalized = (clamped - minPct) / (maxPct - minPct);
    return padTop + chartH - normalized * chartH;
  };

  const createPath = (curve: TrajectoryPoint[]) => {
    if (!curve || curve.length === 0) return '';
    return curve.reduce((acc, pt, idx) => {
      const x = getX(idx);
      const y = getY(pt.pct);
      if (idx === 0) return `M ${x} ${y}`;
      const prevPt = curve[idx - 1];
      const prevX = getX(idx - 1);
      const prevY = getY(prevPt.pct);
      const cpX1 = prevX + (x - prevX) / 2;
      const cpY1 = prevY;
      const cpX2 = prevX + (x - prevX) / 2;
      const cpY2 = y;
      return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x} ${y}`;
    }, '');
  };

  const compositePath = useMemo(() => createPath(compositeCurve), [compositeCurve]);

  const isLight = theme === 'light';
  const gridLineColor = isLight ? '#e2e8f0' : '#1e293b';
  const textColor = isLight ? '#64748b' : '#94a3b8';
  const zeroLineColor = isLight ? '#94a3b8' : '#475569';

  return (
    <div className="ob-flow-pane">
      {/* Flow Header */}
      <div className="ob-flow-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="ob-buildup-pill bull" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            ▲ BULLISH (Long Build-Up)
          </div>
          <div className="ob-buildup-pill bear" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            ▼ BEARISH (Short Build-Up)
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ob-text-muted)' }}>
          <span>MARKET X-RAY FLOW</span>
          <span>|</span>
          <span style={{ color: '#dc2626', fontWeight: 'bold' }}>SWEPT TROUGH -2.85%</span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div style={{ flex: 1, position: 'relative', width: '100%', overflow: 'hidden', padding: '6px' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%' }}
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="flowGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow"/>
              <feComposite in="SourceGraphic" in2="glow" operator="over"/>
            </filter>
          </defs>

          {/* Horizontal Level Lines */}
          {[-3.0, -2.0, -1.0, 0, 1.0, 2.0, 3.0].map((level) => {
            const y = getY(level);
            const isZero = level === 0;
            return (
              <g key={level}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke={isZero ? zeroLineColor : gridLineColor}
                  strokeWidth={isZero ? 1.5 : 0.8}
                  strokeDasharray={isZero ? '4 3' : '2 3'}
                  opacity={isZero ? 0.9 : 0.5}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="9.5"
                  fontFamily="var(--font-mono)"
                  fill={isZero ? 'var(--ob-text)' : textColor}
                  fontWeight={isZero ? '700' : '400'}
                >
                  {level > 0 ? `+${level.toFixed(1)}%` : `${level.toFixed(1)}%`}
                </text>
              </g>
            );
          })}

          {/* Vertical Time Lines */}
          {timePoints.map((tp, idx) => {
            const x = getX(idx);
            return (
              <g key={tp}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={height - padBottom}
                  stroke={gridLineColor}
                  strokeWidth={0.8}
                  strokeDasharray="2 4"
                  opacity={0.35}
                />
                <text
                  x={x}
                  y={height - padBottom + 14}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontFamily="var(--font-mono)"
                  fill={textColor}
                >
                  {tp}
                </text>
              </g>
            );
          })}

          {/* Sector Labels on Far Left Margin */}
          {sectors.map((sec, i) => {
            const yPos = padTop + 20 + i * ((chartH - 40) / sectors.length);
            return (
              <g key={sec.name} opacity={0.75}>
                <text
                  x={12}
                  y={yPos}
                  fontSize="8.5"
                  fontWeight="700"
                  fontFamily="var(--font-main)"
                  fill="var(--ob-text-muted)"
                >
                  {sec.name}
                </text>
                <text
                  x={45}
                  y={yPos}
                  fontSize="7.5"
                  fontFamily="var(--font-mono)"
                  fontWeight="600"
                  fill={sec.change_pct >= 0 ? '#10b981' : '#f43f5e'}
                >
                  {sec.change_pct >= 0 ? `+${sec.change_pct}%` : `${sec.change_pct}%`}
                </text>
              </g>
            );
          })}

          {/* Stock Trajectory Curves */}
          {trajectories.map((traj) => {
            const isHovered = hoveredSymbol === traj.symbol;
            const isSelected = selectedSymbol === traj.symbol;
            const isBull = traj.direction === 'BULL';
            const strokeColor = isBull
              ? (isSelected ? '#059669' : isHovered ? '#10b981' : isLight ? '#34d399' : '#059669')
              : (isSelected ? '#dc2626' : isHovered ? '#f43f5e' : isLight ? '#f87171' : '#e11d48');
            
            const strokeOpacity = isSelected ? 1 : isHovered ? 0.95 : (isLight ? 0.38 : 0.45);
            const strokeW = isSelected ? 3.2 : isHovered ? 2.5 : 1.2;
            const pathData = createPath(traj.curve);

            return (
              <g
                key={traj.symbol}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredSymbol(traj.symbol)}
                onMouseLeave={() => setHoveredSymbol(null)}
                onClick={() => onSelectStock(traj.symbol)}
              >
                <path
                  d={pathData}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeW}
                  strokeOpacity={strokeOpacity}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={isSelected || isHovered ? 'url(#flowGlow)' : undefined}
                />
                {traj.curve.length > 0 && (
                  <circle
                    cx={getX(traj.curve.length - 1)}
                    cy={getY(traj.curve[traj.curve.length - 1].pct)}
                    r={isSelected ? 4.5 : isHovered ? 3.5 : 2}
                    fill={strokeColor}
                  />
                )}
              </g>
            );
          })}

          {/* Market Composite Curve (Thick Deep Red Trough & Curve) */}
          <path
            d={compositePath}
            fill="none"
            stroke="#b91c1c"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.88}
          />
          {/* Trough point circle */}
          <circle cx={getX(5)} cy={getY(-2.85)} r={4} fill="#b91c1c" />
          <circle cx={getX(5)} cy={getY(-2.85)} r={8} fill="none" stroke="#b91c1c" strokeWidth={1.5} opacity={0.6} />

          {/* Hover Tooltip Card */}
          {hoveredSymbol && (() => {
            const item = trajectories.find((t) => t.symbol === hoveredSymbol);
            if (!item || !item.curve || item.curve.length === 0) return null;
            const px = getX(item.curve.length - 1);
            const py = getY(item.curve[item.curve.length - 1].pct);

            return (
              <g transform={`translate(${Math.min(px - 100, width - 180)}, ${Math.max(py - 35, padTop)})`}>
                <rect
                  width="135"
                  height="34"
                  rx="6"
                  fill="var(--ob-text)"
                  filter="drop-shadow(0 4px 6px rgba(0,0,0,0.2))"
                />
                <text x="10" y="15" fill="var(--ob-bg)" fontSize="10.5" fontWeight="bold">
                  {item.symbol}
                </text>
                <text
                  x="125"
                  y="15"
                  textAnchor="end"
                  fill={item.change_pct >= 0 ? '#10b981' : '#ef4444'}
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  fontWeight="bold"
                >
                  {item.change_pct >= 0 ? `+${item.change_pct}%` : `${item.change_pct}%`}
                </text>
                <text x="10" y="27" fill="var(--ob-text-muted)" fontSize="8">
                  {item.direction === 'BULL' ? 'LONG BUILD-UP' : 'SHORT BUILD-UP'} · Click to inspect
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Flow Footer */}
      <div className="ob-flow-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--ob-text-muted)' }}>
          <span>Leading Sector: <strong style={{ color: 'var(--ob-bull)' }}>NIFTY METAL (+1.84%)</strong></span>
          <span>Lagging Sector: <strong style={{ color: 'var(--ob-bear)' }}>NIFTY IT (-2.15%)</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', color: 'var(--ob-text-muted)' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          <span>F&amp;O UNIVERSE SCANNED LIVE (200+)</span>
        </div>
      </div>
    </div>
  );
};
