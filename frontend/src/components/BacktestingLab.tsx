import React, { useState } from 'react';
import { Play, BarChart3, RefreshCw } from 'lucide-react';

interface BacktestTrade {
  id: string;
  direction: 'LONG' | 'SHORT';
  entry_time: string;
  exit_time: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  gross_pnl: number;
  net_pnl: number;
  fees: number;
  rr_achieved: number;
  exit_reason: string;
}

interface BacktestResult {
  strategy_name: string;
  symbol: string;
  timeframe: string;
  initial_capital: number;
  final_equity: number;
  net_return_pct: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_pct: number;
  profit_factor: number;
  max_drawdown_pct: number;
  expectancy: number;
  avg_win: number;
  avg_loss: number;
  equity_curve: { timestamp: string; equity: number; drawdown_pct: number }[];
  trades: BacktestTrade[];
  execution_assumptions: Record<string, any>;
}

export const BacktestingLab: React.FC<{ activeSymbol: string }> = ({ activeSymbol }) => {
  const [strategy, setStrategy] = useState<'OB_RETEST_ENTRY' | 'BOS_MOMENTUM_ENTRY'>('OB_RETEST_ENTRY');
  const [riskPct, setRiskPct] = useState<number>(1.0);
  const [targetRR, setTargetRR] = useState<number>(2.0);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const runBacktest = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: activeSymbol,
          timeframe: '15m',
          strategy_name: strategy,
          initial_capital: 100000.0,
          risk_per_trade_pct: riskPct,
          target_rr: targetRR,
          slippage_pct: 0.03,
          brokerage_per_trade: 20.0,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (e) {
      console.error('Failed to run backtest:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
      {/* Header & Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          background: 'var(--bg-card)',
          padding: 16,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}
      >
        <div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', fontWeight: 700 }}>
            Quant Strategy Backtesting Lab
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Historical walk-forward testing with conservative execution, slippage, and brokerage fees.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Strategy</label>
            <select
              className="chat-input"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as any)}
              style={{ fontSize: '0.8rem', padding: '4px 8px' }}
            >
              <option value="OB_RETEST_ENTRY">Order Block Retest (50% EQ)</option>
              <option value="BOS_MOMENTUM_ENTRY">BOS Breakout Momentum</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Risk / Trade</label>
            <select
              className="chat-input"
              value={riskPct}
              onChange={(e) => setRiskPct(parseFloat(e.target.value))}
              style={{ fontSize: '0.8rem', padding: '4px 8px' }}
            >
              <option value={0.5}>0.5%</option>
              <option value={1.0}>1.0%</option>
              <option value={2.0}>2.0%</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Target R:R</label>
            <select
              className="chat-input"
              value={targetRR}
              onChange={(e) => setTargetRR(parseFloat(e.target.value))}
              style={{ fontSize: '0.8rem', padding: '4px 8px' }}
            >
              <option value={1.5}>1 : 1.5</option>
              <option value={2.0}>1 : 2.0</option>
              <option value={2.5}>1 : 2.5</option>
              <option value={3.0}>1 : 3.0</option>
            </select>
          </div>

          <button
            className="action-btn primary"
            onClick={runBacktest}
            disabled={loading}
            style={{ marginTop: 14, minWidth: 120, justifyContent: 'center' }}
          >
            {loading ? <RefreshCw size={14} className="pulse-dot" /> : <Play size={14} />}
            <span>Run Simulation</span>
          </button>
        </div>
      </div>

      {result ? (
        <>
          {/* KPI Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div className="metric-cell" style={{ padding: 14 }}>
              <div className="label">Net Return</div>
              <div
                className="value"
                style={{
                  fontSize: '1.25rem',
                  color: result.net_return_pct >= 0 ? 'var(--bullish)' : 'var(--bearish)',
                }}
              >
                {result.net_return_pct >= 0 ? '+' : ''}
                {result.net_return_pct}%
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Final: ₹{result.final_equity.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="metric-cell" style={{ padding: 14 }}>
              <div className="label">Win Rate</div>
              <div className="value" style={{ fontSize: '1.25rem', color: 'var(--accent)' }}>
                {result.win_rate_pct}%
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {result.winning_trades}W / {result.losing_trades}L ({result.total_trades} trades)
              </span>
            </div>

            <div className="metric-cell" style={{ padding: 14 }}>
              <div className="label">Max Drawdown</div>
              <div className="value" style={{ fontSize: '1.25rem', color: 'var(--bearish)' }}>
                {result.max_drawdown_pct}%
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Peak to trough</span>
            </div>

            <div className="metric-cell" style={{ padding: 14 }}>
              <div className="label">Profit Factor</div>
              <div className="value" style={{ fontSize: '1.25rem' }}>
                {result.profit_factor}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gross Win / Loss</span>
            </div>

            <div className="metric-cell" style={{ padding: 14 }}>
              <div className="label">Expectancy / Trade</div>
              <div
                className="value"
                style={{
                  fontSize: '1.25rem',
                  color: result.expectancy >= 0 ? 'var(--bullish)' : 'var(--bearish)',
                }}
              >
                ₹{result.expectancy.toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Avg net gain/loss</span>
            </div>
          </div>

          {/* Equity Curve Visualizer */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Equity Growth Curve (₹)</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {result.equity_curve.length} check points
              </div>
            </div>
            {/* SVG Equity Line Chart */}
            <div style={{ height: 160, width: '100%', position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 800 160" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {(() => {
                  const pts = result.equity_curve;
                  if (pts.length < 2) return null;
                  const minEq = Math.min(...pts.map((p) => p.equity)) * 0.99;
                  const maxEq = Math.max(...pts.map((p) => p.equity)) * 1.01;
                  const range = maxEq - minEq || 1;
                  const pathData = pts
                    .map((p, idx) => {
                      const x = (idx / (pts.length - 1)) * 800;
                      const y = 160 - ((p.equity - minEq) / range) * 150 - 5;
                      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ');
                  const areaData = `${pathData} L 800 160 L 0 160 Z`;
                  return (
                    <>
                      <path d={areaData} fill="url(#equityGrad)" />
                      <path d={pathData} fill="none" stroke="#6366f1" strokeWidth="2.5" />
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Trade Ledger Table */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
              Trade-by-Trade Execution Ledger ({result.trades.length} trades)
            </div>
            <table className="scanner-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Direction</th>
                  <th>Entry Time</th>
                  <th>Exit Time</th>
                  <th>Entry Price</th>
                  <th>Exit Price</th>
                  <th>Qty</th>
                  <th>Net P&L</th>
                  <th>R:R</th>
                  <th>Exit Reason</th>
                </tr>
              </thead>
              <tbody>
                {result.trades.map((t, idx) => {
                  const isLong = t.direction === 'LONG';
                  const isWin = t.net_pnl > 0;
                  return (
                    <tr key={t.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <span
                          style={{
                            color: isLong ? 'var(--bullish)' : 'var(--bearish)',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.entry_time}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.exit_time}</td>
                      <td>₹{t.entry_price}</td>
                      <td>₹{t.exit_price}</td>
                      <td>{t.quantity}</td>
                      <td
                        style={{
                          fontWeight: 700,
                          color: isWin ? 'var(--bullish)' : 'var(--bearish)',
                        }}
                      >
                        {isWin ? '+' : ''}₹{t.net_pnl}
                      </td>
                      <td>{t.rr_achieved}R</td>
                      <td>
                        <span className={`lifecycle-badge ${isWin ? 'fresh' : 'invalidated'}`}>
                          {t.exit_reason}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          <BarChart3 size={40} style={{ color: 'var(--accent)', marginBottom: 12 }} />
          <h3>Ready to backtest on {activeSymbol}</h3>
          <p style={{ fontSize: '0.85rem', maxWidth: 450, margin: '8px auto 16px' }}>
            Click 'Run Simulation' to evaluate Order Block entries against historical candles with fee and slippage modeling.
          </p>
          <button className="action-btn primary" onClick={runBacktest}>
            Run Backtest
          </button>
        </div>
      )}
    </div>
  );
};
