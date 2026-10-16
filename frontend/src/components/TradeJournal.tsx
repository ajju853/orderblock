import React, { useState, useEffect } from 'react';
import { BookOpen, Bell, ListFilter, Plus, CheckCircle } from 'lucide-react';

export const TradeJournal: React.FC = () => {
  const [journal, setJournal] = useState<any[]>([]);
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [tab, setTab] = useState<'journal' | 'watchlists' | 'alerts'>('journal');

  // New Journal Form state
  const [symbol, setSymbol] = useState<string>('NIFTY 50');
  const [direction, setDirection] = useState<string>('LONG');
  const [pnl, setPnl] = useState<string>('5000');
  const [setupType, setSetupType] = useState<string>('BULL_OB_RETEST');
  const [thesis, setThesis] = useState<string>('');
  const [review, setReview] = useState<string>('');

  const fetchData = async () => {
    try {
      const [jRes, wRes, aRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/v1/journal'),
        fetch('http://127.0.0.1:8000/api/v1/watchlists'),
        fetch('http://127.0.0.1:8000/api/v1/alerts'),
      ]);
      if (jRes.ok) setJournal(await jRes.json());
      if (wRes.ok) setWatchlists(await wRes.json());
      if (aRes.ok) setAlerts(await aRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `j-${Date.now()}`,
          symbol,
          direction,
          entry_price: 24800.0,
          exit_price: 25000.0,
          pnl: parseFloat(pnl) || 0.0,
          setup_type: setupType,
          thesis: thesis || 'Order Block + FVG confirmation on 15m.',
          review_notes: review || 'Followed trading discipline.',
          tags: ['SMC', 'DISCIPLINED'],
          created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
        }),
      });
      if (res.ok) {
        setThesis('');
        setReview('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          className={`action-btn ${tab === 'journal' ? 'primary' : ''}`}
          onClick={() => setTab('journal')}
        >
          <BookOpen size={15} />
          <span>Trade Journal ({journal.length})</span>
        </button>
        <button
          className={`action-btn ${tab === 'watchlists' ? 'primary' : ''}`}
          onClick={() => setTab('watchlists')}
        >
          <ListFilter size={15} />
          <span>Watchlists ({watchlists.length})</span>
        </button>
        <button
          className={`action-btn ${tab === 'alerts' ? 'primary' : ''}`}
          onClick={() => setTab('alerts')}
        >
          <Bell size={15} />
          <span>Active Alerts ({alerts.length})</span>
        </button>
      </div>

      {tab === 'journal' && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18 }}>
          {/* Add Journal Form */}
          <div style={{ background: 'var(--bg-card)', padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Log Trade Review</h3>
            <form onSubmit={handleAddJournal} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Symbol</label>
                <input
                  type="text"
                  className="chat-input"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Direction</label>
                  <select
                    className="chat-input"
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                  >
                    <option value="LONG">LONG</option>
                    <option value="SHORT">SHORT</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>P&L (₹)</label>
                  <input
                    type="number"
                    className="chat-input"
                    value={pnl}
                    onChange={(e) => setPnl(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Setup Pattern</label>
                <select
                  className="chat-input"
                  value={setupType}
                  onChange={(e) => setSetupType(e.target.value)}
                >
                  <option value="BULL_OB_RETEST">Bullish Order Block Retest</option>
                  <option value="BEAR_OB_RETEST">Bearish Order Block Retest</option>
                  <option value="BOS_CONTINUATION">BOS Momentum Breakout</option>
                  <option value="LIQUIDITY_SWEEP">Liquidity Sweep Reclaim</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Trade Thesis & Confluence</label>
                <textarea
                  className="chat-input"
                  rows={3}
                  placeholder="Why was this trade taken? (BOS, FVG, 50% EQ...)"
                  value={thesis}
                  onChange={(e) => setThesis(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Post-Trade Review & Lessons</label>
                <textarea
                  className="chat-input"
                  rows={2}
                  placeholder="Did you follow trading rules? Was exit timely?"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                />
              </div>

              <button type="submit" className="action-btn primary" style={{ width: '100%', justifyContent: 'center' }}>
                <Plus size={14} />
                <span>Save to Journal</span>
              </button>
            </form>
          </div>

          {/* Journal Entries List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {journal.map((item) => {
              const isProfit = item.pnl >= 0;
              return (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{item.symbol}</span>
                      <span className={`zone-badge ${item.direction === 'LONG' ? 'bullish' : 'bearish'}`}>
                        {item.direction}
                      </span>
                      <span className="lifecycle-badge fresh">{item.setup_type}</span>
                    </div>
                    <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: isProfit ? 'var(--bullish)' : 'var(--bearish)' }}>
                      {isProfit ? '+' : ''}₹{item.pnl}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                    <strong>Thesis:</strong> {item.thesis}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                    <strong>Review:</strong> {item.review_notes}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {item.tags?.map((tg: string) => (
                        <span key={tg} className="toggle-chip" style={{ fontSize: '0.68rem' }}>
                          #{tg}
                        </span>
                      ))}
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>{item.created_at}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'watchlists' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {watchlists.map((wl) => (
            <div
              key={wl.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 18,
              }}
            >
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>{wl.name}</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {wl.symbols?.map((sym: string) => (
                  <span key={sym} className="toggle-chip active" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'alerts' && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table className="scanner-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Alert Condition</th>
                <th>Target Price</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alt) => (
                <tr key={alt.id}>
                  <td style={{ fontWeight: 700 }}>{alt.symbol}</td>
                  <td>
                    <span className="lifecycle-badge fresh">{alt.alert_type}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>₹{alt.target_price}</td>
                  <td>
                    <span style={{ color: 'var(--bullish)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={13} /> Active
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{alt.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
