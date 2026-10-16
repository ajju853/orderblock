import React, { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, XCircle } from 'lucide-react';

export const PaperTrading: React.FC<{ activeSymbol: string }> = ({ activeSymbol }) => {
  const [account, setAccount] = useState<any | null>(null);
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [qty, setQty] = useState<number>(10);
  const [sl, setSl] = useState<string>('');
  const [tp, setTp] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchAccount = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/paper/account');
      if (res.ok) {
        const data = await res.json();
        setAccount(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAccount();
  }, []);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/paper/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: activeSymbol,
          direction: direction,
          order_type: 'MARKET',
          quantity: qty,
          stop_loss: sl ? parseFloat(sl) : null,
          take_profit: tp ? parseFloat(tp) : null,
        }),
      });
      const data = await res.json();
      setMsg(data.message);
      fetchAccount();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePosition = async (pid: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/paper/close/${pid}`, {
        method: 'POST',
      });
      const data = await res.json();
      setMsg(data.message);
      fetchAccount();
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  if (!account) return <div style={{ padding: 40, textAlign: 'center' }}>Loading Paper Trading Portfolio...</div>;

  return (
    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
      {/* Account KPI Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="metric-cell" style={{ padding: 16 }}>
          <div className="label">Total Equity</div>
          <div className="value" style={{ fontSize: '1.35rem' }}>
            ₹{account.total_equity?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Cash: ₹{account.cash_balance?.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="metric-cell" style={{ padding: 16 }}>
          <div className="label">Unrealized P&L</div>
          <div
            className="value"
            style={{
              fontSize: '1.35rem',
              color: account.unrealized_pnl >= 0 ? 'var(--bullish)' : 'var(--bearish)',
            }}
          >
            {account.unrealized_pnl >= 0 ? '+' : ''}₹{account.unrealized_pnl}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {account.active_positions?.length} Open Positions
          </span>
        </div>

        <div className="metric-cell" style={{ padding: 16 }}>
          <div className="label">Realized Net P&L</div>
          <div
            className="value"
            style={{
              fontSize: '1.35rem',
              color: account.realized_pnl >= 0 ? 'var(--bullish)' : 'var(--bearish)',
            }}
          >
            {account.realized_pnl >= 0 ? '+' : ''}₹{account.realized_pnl}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Closed Trades</span>
        </div>

        <div className="metric-cell" style={{ padding: 16 }}>
          <div className="label">Daily Loss Circuit Breaker</div>
          <div className="value" style={{ fontSize: '1.35rem', color: 'var(--bearish)' }}>
            {account.daily_drawdown_pct}% / {account.daily_loss_limit_pct}%
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Guardrail Protection</span>
        </div>
      </div>

      {/* Main Trading Area: Order Form + Active Positions */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18, marginBottom: 24 }}>
        {/* Order Form */}
        <div style={{ background: 'var(--bg-card)', padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
            Place Simulated Order ({activeSymbol})
          </h3>

          <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`action-btn ${direction === 'LONG' ? 'primary' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setDirection('LONG')}
              >
                <ArrowUpCircle size={15} style={{ color: 'var(--bullish)' }} />
                <span>BUY / LONG</span>
              </button>
              <button
                type="button"
                className={`action-btn ${direction === 'SHORT' ? 'primary' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setDirection('SHORT')}
              >
                <ArrowDownCircle size={15} style={{ color: 'var(--bearish)' }} />
                <span>SELL / SHORT</span>
              </button>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Quantity (Shares / Lots)</label>
              <input
                type="number"
                className="chat-input"
                min={1}
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value) || 1)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Stop Loss (₹ Optional)</label>
              <input
                type="number"
                step="0.1"
                className="chat-input"
                placeholder="e.g. 24800"
                value={sl}
                onChange={(e) => setSl(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Take Profit Target (₹ Optional)</label>
              <input
                type="number"
                step="0.1"
                className="chat-input"
                placeholder="e.g. 25200"
                value={tp}
                onChange={(e) => setTp(e.target.value)}
              />
            </div>

            <button type="submit" className="action-btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? <RefreshCw size={14} className="pulse-dot" /> : 'Execute Paper Order'}
            </button>
          </form>

          {msg && (
            <div style={{ marginTop: 12, padding: 8, background: 'var(--bg-primary)', borderRadius: 4, fontSize: '0.75rem', color: 'var(--accent)' }}>
              {msg}
            </div>
          )}
        </div>

        {/* Active Positions Table */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
            Open Positions ({account.active_positions?.length || 0})
          </div>

          <table className="scanner-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th>Qty</th>
                <th>Avg Price</th>
                <th>LTP</th>
                <th>Unrealized P&L</th>
                <th>SL / TP</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {account.active_positions?.map((pos: any) => {
                const isLong = pos.direction === 'LONG';
                const isProfit = pos.unrealized_pnl >= 0;
                return (
                  <tr key={pos.id}>
                    <td style={{ fontWeight: 700 }}>{pos.symbol}</td>
                    <td>
                      <span className={`zone-badge ${isLong ? 'bullish' : 'bearish'}`}>{pos.direction}</span>
                    </td>
                    <td>{pos.quantity}</td>
                    <td>₹{pos.entry_price}</td>
                    <td>₹{pos.current_price}</td>
                    <td style={{ fontWeight: 700, color: isProfit ? 'var(--bullish)' : 'var(--bearish)' }}>
                      {isProfit ? '+' : ''}₹{pos.unrealized_pnl}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      SL: {pos.stop_loss ? `₹${pos.stop_loss}` : '—'} | TP: {pos.take_profit ? `₹${pos.take_profit}` : '—'}
                    </td>
                    <td>
                      <button
                        className="action-btn"
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                        onClick={() => handleClosePosition(pos.id)}
                      >
                        <XCircle size={12} />
                        <span>Close</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {account.active_positions?.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                    No active positions. Execute a paper order to start live tracking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade History Ledger */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
          Simulated Closed Trades History
        </div>
        <table className="scanner-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Side</th>
              <th>Entry Price</th>
              <th>Exit Price</th>
              <th>Qty</th>
              <th>Net P&L</th>
              <th>Exit Time</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {account.trade_history?.map((th: any) => (
              <tr key={th.id}>
                <td style={{ fontWeight: 600 }}>{th.symbol}</td>
                <td>
                  <span className={`zone-badge ${th.direction === 'LONG' ? 'bullish' : 'bearish'}`}>
                    {th.direction}
                  </span>
                </td>
                <td>₹{th.entry_price}</td>
                <td>₹{th.exit_price}</td>
                <td>{th.quantity}</td>
                <td style={{ fontWeight: 700, color: th.net_pnl >= 0 ? 'var(--bullish)' : 'var(--bearish)' }}>
                  {th.net_pnl >= 0 ? '+' : ''}₹{th.net_pnl}
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{th.exit_time}</td>
                <td>
                  <span className="lifecycle-badge fresh">{th.reason}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
