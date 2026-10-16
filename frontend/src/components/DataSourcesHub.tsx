import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Search, ArrowRight } from 'lucide-react';

interface ProviderHealth {
  name: string;
  provider_type: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'NOT_CONFIGURED';
  latency_ms: number;
  last_checked: string;
  rate_limit_remaining?: number;
  capabilities: string[];
  error_message?: string;
}

export const DataSourcesHub: React.FC<{ onSyncCandles: (sym: string, tf: string) => void }> = ({ onSyncCandles }) => {
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [activeProvider, setActiveProvider] = useState<string>('YFINANCE');
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Quote test state
  const [searchQuery, setSearchQuery] = useState<string>('RELIANCE');
  const [testedQuote, setTestedQuote] = useState<any | null>(null);
  const [testingQuote, setTestingQuote] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const fetchProvidersStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/providers/status');
      if (res.ok) {
        const json = await res.json();
        setProviders(json.providers || []);
        setActiveProvider(json.active_provider || 'YFINANCE');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProvidersStatus();
  }, []);

  const handleSwitchProvider = async (key: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/providers/active?provider_key=${key}`, {
        method: 'POST',
      });
      if (res.ok) {
        setActiveProvider(key);
        fetchProvidersStatus();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestQuote = async () => {
    if (!searchQuery.trim()) return;
    setTestingQuote(true);
    setTestedQuote(null);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/market/quote?symbol=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setTestedQuote(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTestingQuote(false);
    }
  };

  const handleSyncToEngine = async (sym: string) => {
    setSyncStatus('Fetching candles from remote provider and syncing into local store...');
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/market/sync-candles?symbol=${encodeURIComponent(sym)}&timeframe=15m&lookback=150`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(`Successfully synced ${data.count} candles for ${sym} from ${data.source_provider}!`);
        onSyncCandles(sym, '15m');
      }
    } catch (e: any) {
      setSyncStatus(`Sync error: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
      {/* Top Banner */}
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
            <Database size={22} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', fontWeight: 700 }}>
              Lifetime-Cost-Conscious Market Data Architecture
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Pluggable, provider-independent market data adapters. If any external feed goes offline, the deterministic engine seamlessly falls back to local historical data.
          </p>
        </div>

        <button className="action-btn" onClick={fetchProvidersStatus} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'pulse-dot' : ''} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Provider Health Diagnostics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 24 }}>
        {providers.map((p) => {
          const isSelected = activeProvider === p.provider_type;
          const isOnline = p.status === 'ONLINE';
          const isDegraded = p.status === 'DEGRADED';

          return (
            <div
              key={p.provider_type}
              style={{
                background: 'var(--bg-card)',
                border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isSelected ? '0 0 16px var(--accent-glow)' : 'none',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</span>
                  <span
                    className={`lifecycle-badge ${isOnline ? 'fresh' : isDegraded ? 'tested' : 'invalidated'}`}
                    style={{ fontSize: '0.68rem' }}
                  >
                    {p.status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                  <span>Latency: {p.latency_ms}ms</span>
                  {p.rate_limit_remaining !== undefined && p.rate_limit_remaining !== null && (
                    <span>Rate limit: {p.rate_limit_remaining} rem</span>
                  )}
                </div>

                {p.error_message && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--bearish)', marginBottom: 8 }}>
                    {p.error_message}
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                  {p.capabilities.map((cap) => (
                    <span key={cap} className="toggle-chip" style={{ fontSize: '0.65rem' }}>
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <button
                className={`action-btn ${isSelected ? 'primary' : ''}`}
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}
                onClick={() => handleSwitchProvider(p.provider_type)}
              >
                {isSelected ? '✓ Active Primary Provider' : 'Set as Active Provider'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Quote Tester & Remote Sync */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          padding: 18,
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>
          Live Quote & Candle Sync Tester
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
          Test symbol retrieval from the active provider. Inspect data freshness and sync fresh candles into the local database cache.
        </p>

        <div style={{ display: 'flex', gap: 10, maxWidth: 500, marginBottom: 16 }}>
          <input
            type="text"
            className="chat-input"
            placeholder="Search symbol (e.g. RELIANCE, TCS, INFY, NIFTY 50)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
          />
          <button className="action-btn primary" onClick={handleTestQuote} disabled={testingQuote}>
            <Search size={14} />
            <span>Fetch Quote</span>
          </button>
        </div>

        {testedQuote && (
          <div
            style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              padding: 14,
            }}
          >
            {testedQuote.success && testedQuote.quote ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{testedQuote.quote.symbol}</span>
                    <span className="lifecycle-badge fresh">{testedQuote.data_mode}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Source: {testedQuote.provider_used}
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>
                    ₹{testedQuote.quote.ltp}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, fontSize: '0.75rem', marginBottom: 12 }}>
                  <div>Open: ₹{testedQuote.quote.open}</div>
                  <div>High: ₹{testedQuote.quote.high}</div>
                  <div>Low: ₹{testedQuote.quote.low}</div>
                  <div>Close: ₹{testedQuote.quote.close}</div>
                  <div>Volume: {testedQuote.quote.volume?.toLocaleString('en-IN')}</div>
                  <div>Source Time: {testedQuote.quote.source_timestamp}</div>
                </div>

                <button
                  className="action-btn primary"
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => handleSyncToEngine(testedQuote.quote.symbol)}
                >
                  <ArrowRight size={13} />
                  <span>Sync 15m Candles to BlockMind Engine</span>
                </button>
              </div>
            ) : (
              <div style={{ color: 'var(--bearish)', fontSize: '0.8rem' }}>
                {testedQuote.message || 'Symbol quote could not be retrieved from active provider.'}
              </div>
            )}
          </div>
        )}

        {syncStatus && (
          <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--accent)' }}>
            {syncStatus}
          </div>
        )}
      </div>

      {/* Provider Architectural Comparison Matrix */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
          Indian Market Data Providers — Comparison & Lifetime Cost Matrix
        </div>
        <table className="scanner-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Provider / Library</th>
              <th>Intraday OHLCV Support</th>
              <th>Rate Limits / Tiers</th>
              <th>Lifetime Cost</th>
              <th>Latency / Freshness</th>
              <th>Best Role in BlockMind AI</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Local CSV & Ingestion Store</strong></td>
              <td>1m, 5m, 15m, 1h, 1d (Full History)</td>
              <td>Unlimited (Local disk)</td>
              <td><span className="lifecycle-badge fresh">₹0 / Free Forever</span></td>
              <td>&lt; 1ms (Instant)</td>
              <td>Backtesting, deterministic validation, offline analysis baseline.</td>
            </tr>
            <tr>
              <td><strong>Yahoo Finance (yfinance)</strong></td>
              <td>1m (7d), 5m/15m (60d), 1h (730d), 1d</td>
              <td>~2000 requests/hour (Unofficial)</td>
              <td><span className="lifecycle-badge fresh">₹0 / Free</span></td>
              <td>15-min delayed for NSE (.NS)</td>
              <td>Primary free automated historical candle sync for Indian equities.</td>
            </tr>
            <tr>
              <td><strong>Alpha Vantage</strong></td>
              <td>Intraday 5m, 15m, 60m + Daily</td>
              <td>5 calls / minute (Free API key)</td>
              <td><span className="lifecycle-badge fresh">₹0 (Free Tier)</span></td>
              <td>Global / BSE quotes</td>
              <td>Secondary fallback for daily bars and global equity correlation.</td>
            </tr>
            <tr>
              <td><strong>Indian-Stock-Market-API</strong></td>
              <td>Current quote, symbol list, search</td>
              <td>Self-hosted / localhost</td>
              <td><span className="lifecycle-badge fresh">₹0 (Open Source MIT)</span></td>
              <td>Local Flask microservice</td>
              <td>Pluggable quote search and batch ticker lookup.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
