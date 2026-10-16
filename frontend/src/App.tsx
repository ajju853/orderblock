import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { AnalysisResult, OrderBlockZone, Instrument, EngineConfig } from './types';
import { CandleChart } from './components/Chart/CandleChart';
import { ZoneInspector } from './components/ZoneInspector';
import { AIAssistant } from './components/AIAssistant';
import { Scanner } from './components/Scanner';
import { DataUploader } from './components/DataUploader';
import { SettingsModal } from './components/SettingsModal';
import { BacktestingLab } from './components/BacktestingLab';
import { MTFMatrix } from './components/MTFMatrix';
import { MarketBreadth } from './components/MarketBreadth';
import { OptionsHub } from './components/OptionsHub';
import { PaperTrading } from './components/PaperTrading';
import { TradeJournal } from './components/TradeJournal';
import { DataSourcesHub } from './components/DataSourcesHub';
import { OrderBlockApp } from './components/OrderBlockTerminal/OrderBlockApp';
import { LeftSidebar, type NavTab } from './components/Navigation/LeftSidebar';
import { TopSearchModal } from './components/Navigation/TopSearchModal';
import {
  Layers,
  Sparkles,
  Upload,
  RefreshCw,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Flame,
} from 'lucide-react';

export const App: React.FC = () => {
  // Navigation & View state - Default to 'orderblock_app' (matching user screenshot!)
  const [activeView, setActiveView] = useState<NavTab>('orderblock_app');
  const [sideTab, setSideTab] = useState<'inspector' | 'ai'>('inspector');

  // Theme state - Default to 'light' matching the user screenshot!
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Market & Analysis state
  const [symbol, setSymbol] = useState<string>('NIFTY 50');
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedZone, setSelectedZone] = useState<OrderBlockZone | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState<boolean>(false);

  // Overlay toggles
  const [showOrderBlocks, setShowOrderBlocks] = useState<boolean>(true);
  const [showStructure, setShowStructure] = useState<boolean>(true);
  const [showFVG, setShowFVG] = useState<boolean>(true);
  const [showLiquidity] = useState<boolean>(true);

  // Historical Replay state
  const [isReplayMode, setIsReplayMode] = useState<boolean>(false);
  const [replayPlaying, setReplayPlaying] = useState<boolean>(false);
  const [replayStep, setReplayStep] = useState<number>(30);
  const [replaySpeed, setReplaySpeed] = useState<number>(1);
  const replayTimerRef = useRef<any>(null);

  // Modals
  const [isUploaderOpen, setIsUploaderOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // AI Prompt Bridge
  const [aiExternalPrompt, setAiExternalPrompt] = useState<string>('');

  // Engine Configuration
  const [config, setConfig] = useState<EngineConfig>({
    swing_left: 3,
    swing_right: 3,
    break_confirmation: 'close',
    zone_boundary: 'wick',
    displacement_multiplier: 1.0,
    mitigation_threshold: 0.5,
    fvg_confirmation: false,
  });

  const [, setHealthStatus] = useState<{
    ollama_connected: boolean;
    available_models: string[];
  }>({
    ollama_connected: false,
    available_models: [],
  });

  // Fetch Instruments and Health
  const loadInitialData = async () => {
    try {
      const [healthRes, instRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/v1/health'),
        fetch('http://127.0.0.1:8000/api/v1/instruments'),
      ]);
      if (healthRes.ok) {
        const hData = await healthRes.json();
        setHealthStatus({
          ollama_connected: hData.ollama_connected,
          available_models: hData.available_models,
        });
      }
      if (instRes.ok) {
        const iData = await instRes.json();
        setInstruments(iData);
      }
    } catch (e) {
      console.warn('Backend offline or not yet connected:', e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Standard Analysis fetch
  const fetchAnalysis = useCallback(async () => {
    if (isReplayMode) return;
    setLoadingAnalysis(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/analysis/run?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
        setSelectedZone(null);
      }
    } catch (err) {
      console.error('Failed to run analysis:', err);
    } finally {
      setLoadingAnalysis(false);
    }
  }, [symbol, timeframe, config, isReplayMode]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  // Historical Replay Snapshot Fetch
  const fetchReplaySnapshot = useCallback(
    async (step: number) => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/v1/replay/step?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&step_index=${step}`
        );
        if (res.ok) {
          const json = await res.json();
          setAnalysis(json.analysis);
        }
      } catch (err) {
        console.error('Failed to fetch replay snapshot:', err);
      }
    },
    [symbol, timeframe]
  );

  // Replay playback ticker
  useEffect(() => {
    if (replayPlaying && isReplayMode) {
      replayTimerRef.current = setInterval(() => {
        setReplayStep((prev) => {
          const maxBars = analysis?.candles.length || 180;
          if (prev >= maxBars - 1) {
            setReplayPlaying(false);
            return prev;
          }
          const nextStep = prev + 1;
          fetchReplaySnapshot(nextStep);
          return nextStep;
        });
      }, 1000 / replaySpeed);
    } else {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    }
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [replayPlaying, isReplayMode, replaySpeed, analysis?.candles.length, fetchReplaySnapshot]);

  const handleAskAIFromInspector = (prompt: string) => {
    setAiExternalPrompt(prompt);
    setSideTab('ai');
  };

  return (
    <div className="ob-shell">
      {/* 1. Left Vertical Sidebar (Iconic 3-stripe logo + nav buttons) */}
      <LeftSidebar
        activeTab={activeView}
        onSelectTab={(tab) => setActiveView(tab)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 2. Main Terminal Content Container */}
      <div className="ob-main">
        {/* Top Header Bar */}
        <header className="ob-header">
          {/* Left: Top Search Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TopSearchModal
              onSelectStock={(sym) => {
                setSymbol(sym);
                setActiveView('orderblock_app');
              }}
              theme={theme}
            />

            {/* Quick Instrument Chip */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '8px',
              border: '1px solid var(--ob-border)',
              backgroundColor: 'var(--ob-card-hover)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: '700'
            }}>
              <Flame size={13} style={{ color: '#f59e0b' }} />
              <span>{symbol}</span>
              <span style={{ fontSize: '10px', color: 'var(--ob-text-muted)', fontWeight: '400' }}>{timeframe}</span>
            </div>
          </div>

          {/* Center: Module View Tabs */}
          <div className="ob-view-tabs">
            {[
              { id: 'orderblock_app', label: 'OrderBlock Live' },
              { id: 'chart', label: 'Candle Chart' },
              { id: 'scanner', label: 'Scanner' },
              { id: 'mtf', label: 'MTF Matrix' },
              { id: 'breadth', label: 'Market Breadth' },
              { id: 'backtest', label: 'Backtest Lab' },
              { id: 'options', label: 'Options Hub' },
              { id: 'paper', label: 'Paper Trading' },
              { id: 'journal', label: 'Journal' },
              { id: 'datasources', label: 'Data Feeds' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as NavTab)}
                className={`ob-tab-btn ${activeView === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Replay Mode Toggle */}
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                border: '1px solid var(--ob-border)',
                backgroundColor: isReplayMode ? '#6366f1' : 'var(--ob-card-hover)',
                color: isReplayMode ? '#ffffff' : 'var(--ob-text)',
                cursor: 'pointer'
              }}
              onClick={() => {
                const nextState = !isReplayMode;
                setIsReplayMode(nextState);
                if (nextState) {
                  setReplayStep(30);
                  fetchReplaySnapshot(30);
                } else {
                  setReplayPlaying(false);
                  fetchAnalysis();
                }
              }}
            >
              <Play size={12} className={isReplayMode ? 'animate-pulse' : ''} />
              <span>{isReplayMode ? 'Replay Active' : 'Replay'}</span>
            </button>

            {/* CSV Import */}
            <button
              className="action-btn"
              onClick={() => setIsUploaderOpen(true)}
              title="Import CSV Candles"
              style={{ padding: '6px', border: '1px solid var(--ob-border)', background: 'var(--ob-card-hover)', borderRadius: '8px' }}
            >
              <Upload size={14} style={{ color: 'var(--ob-text-muted)' }} />
            </button>

            {/* Refresh */}
            <button
              className="action-btn"
              onClick={fetchAnalysis}
              disabled={loadingAnalysis}
              title="Run Analysis"
              style={{ padding: '6px', border: '1px solid var(--ob-border)', background: 'var(--ob-card-hover)', borderRadius: '8px' }}
            >
              <RefreshCw size={14} className={loadingAnalysis ? 'animate-spin' : ''} style={{ color: 'var(--ob-text-muted)' }} />
            </button>
          </div>
        </header>

        {/* Dynamic Main Workspace Area */}
        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* 1. PRIMARY VIEW: ORDERBLOCK.COM REPLICA (Matching User Screenshot!) */}
          {activeView === 'orderblock_app' && (
            <OrderBlockApp
              onOpenFullChart={(sym) => {
                setSymbol(sym);
                setActiveView('chart');
              }}
              theme={theme}
            />
          )}

          {/* 2. FULL CANDLESTICK CHART TERMINAL */}
          {activeView === 'chart' && (
            <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
              <section style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
                {/* Secondary Ticker Bar */}
                <div style={{
                  height: '42px',
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--ob-border)',
                  backgroundColor: 'var(--ob-header-bg)',
                  fontSize: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <select
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--ob-border)',
                        background: 'var(--ob-card-hover)',
                        color: 'var(--ob-text)',
                        fontSize: '12px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: '600'
                      }}
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                    >
                      {instruments.map((inst) => (
                        <option key={inst.symbol} value={inst.symbol}>
                          {inst.symbol} ({inst.exchange})
                        </option>
                      ))}
                    </select>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {['5m', '15m', '1h', '1d'].map((tf) => (
                        <button
                          key={tf}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: '600',
                            cursor: 'pointer',
                            backgroundColor: timeframe === tf ? '#10b981' : 'transparent',
                            color: timeframe === tf ? '#ffffff' : 'var(--ob-text-muted)'
                          }}
                          onClick={() => setTimeframe(tf)}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      <span>Price: <strong style={{ color: 'var(--ob-text)' }}>₹{analysis?.latest_price.toFixed(2) || '0.00'}</strong></span>
                      <span>Trend: <strong style={{ color: analysis?.trend === 'BULLISH' ? 'var(--ob-bull)' : 'var(--ob-bear)' }}>{analysis?.trend || 'NEUTRAL'}</strong></span>
                      <span>Score: <strong style={{ color: '#6366f1' }}>{analysis?.score.overall_score || 0}/100</strong></span>
                    </div>
                  </div>

                  {/* Overlay Toggles */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    <button
                      className={`toggle-chip ${showOrderBlocks ? 'active' : ''}`}
                      onClick={() => setShowOrderBlocks(!showOrderBlocks)}
                    >
                      OB ({analysis?.order_blocks.length || 0})
                    </button>
                    <button
                      className={`toggle-chip ${showStructure ? 'active' : ''}`}
                      onClick={() => setShowStructure(!showStructure)}
                    >
                      BOS/CHoCH ({analysis?.structure_events.length || 0})
                    </button>
                    <button
                      className={`toggle-chip ${showFVG ? 'active' : ''}`}
                      onClick={() => setShowFVG(!showFVG)}
                    >
                      FVG ({analysis?.fvgs.length || 0})
                    </button>
                  </div>
                </div>

                {/* Replay Control Bar */}
                {isReplayMode && (
                  <div style={{
                    padding: '8px 16px',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderBottom: '1px solid rgba(99, 102, 241, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px'
                  }}>
                    <span style={{ fontWeight: '700', color: '#6366f1', fontFamily: 'var(--font-mono)' }}>
                      HISTORICAL REPLAY · Step {replayStep} / {analysis?.candles.length || 180}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="action-btn"
                        onClick={() => {
                          const s = Math.max(10, replayStep - 1);
                          setReplayStep(s);
                          fetchReplaySnapshot(s);
                        }}
                      >
                        <SkipBack size={13} />
                      </button>
                      <button
                        className="action-btn primary"
                        onClick={() => setReplayPlaying(!replayPlaying)}
                      >
                        {replayPlaying ? <Pause size={13} /> : <Play size={13} />}
                        <span>{replayPlaying ? 'Pause' : 'Play'}</span>
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => {
                          const s = Math.min((analysis?.candles.length || 180) - 1, replayStep + 1);
                          setReplayStep(s);
                          fetchReplaySnapshot(s);
                        }}
                      >
                        <SkipForward size={13} />
                      </button>
                      <select
                        style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}
                        value={replaySpeed}
                        onChange={(e) => setReplaySpeed(parseFloat(e.target.value))}
                      >
                        <option value={1}>1x</option>
                        <option value={2}>2x</option>
                        <option value={5}>5x</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* High-DPI Canvas Candlestick Chart */}
                <CandleChart
                  analysis={analysis}
                  selectedZone={selectedZone}
                  onSelectZone={(zone) => {
                    setSelectedZone(zone);
                    if (zone) setSideTab('inspector');
                  }}
                  showOrderBlocks={showOrderBlocks}
                  showStructure={showStructure}
                  showFVG={showFVG}
                  showLiquidity={showLiquidity}
                />
              </section>

              {/* Right Side Panel: Zone Inspector & Ollama Copilot */}
              <aside className="side-panel" style={{ width: '340px' }}>
                <div className="side-tabs">
                  <button
                    className={`side-tab-btn ${sideTab === 'inspector' ? 'active' : ''}`}
                    onClick={() => setSideTab('inspector')}
                  >
                    <Layers size={14} />
                    <span>Zone Inspector</span>
                  </button>
                  <button
                    className={`side-tab-btn ${sideTab === 'ai' ? 'active' : ''}`}
                    onClick={() => setSideTab('ai')}
                  >
                    <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                    <span>Ollama Copilot</span>
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {sideTab === 'inspector' ? (
                    <ZoneInspector
                      selectedZone={selectedZone}
                      analysis={analysis}
                      onSelectZone={setSelectedZone}
                      onAskAI={handleAskAIFromInspector}
                    />
                  ) : (
                    <AIAssistant
                      analysis={analysis}
                      selectedZone={selectedZone}
                      externalPrompt={aiExternalPrompt}
                      onClearExternalPrompt={() => setAiExternalPrompt('')}
                    />
                  )}
                </div>
              </aside>
            </div>
          )}

          {/* 3. MULTI-ASSET SCANNER */}
          {activeView === 'scanner' && (
            <Scanner
              onSelectInstrument={(sym, tf) => {
                setSymbol(sym);
                setTimeframe(tf);
                setActiveView('chart');
              }}
            />
          )}

          {/* 4. MULTI-TIMEFRAME CONFLUENCE MATRIX */}
          {activeView === 'mtf' && <MTFMatrix activeSymbol={symbol} />}

          {/* 5. MARKET BREADTH & SECTOR HEATMAP */}
          {activeView === 'breadth' && <MarketBreadth activeSymbol={symbol} />}

          {/* 6. BACKTESTING LAB */}
          {activeView === 'backtest' && <BacktestingLab activeSymbol={symbol} />}

          {/* 7. OPTIONS & DERIVATIVES HUB */}
          {activeView === 'options' && <OptionsHub activeSymbol={symbol} />}

          {/* 8. PAPER TRADING */}
          {activeView === 'paper' && <PaperTrading activeSymbol={symbol} />}

          {/* 9. TRADE JOURNAL */}
          {activeView === 'journal' && <TradeJournal />}

          {/* 10. DATA PROVIDER HUB */}
          {activeView === 'datasources' && (
            <DataSourcesHub
              onSyncCandles={(sym, tf) => {
                setSymbol(sym);
                setTimeframe(tf);
                setActiveView('chart');
              }}
            />
          )}
        </main>
      </div>

      {/* CSV Data Import Modal */}
      <DataUploader
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onSuccess={(newSymbol, newTf) => {
          loadInitialData();
          setSymbol(newSymbol);
          setTimeframe(newTf);
          setActiveView('chart');
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={(newCfg) => setConfig(newCfg)}
      />
    </div>
  );
};

export default App;
