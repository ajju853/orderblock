# BlockMind AI — Institutional Smart Money & Quant Analysis Terminal

**BlockMind AI** is an advanced, local-first quantitative trading and Smart Money Concept (SMC) analysis platform built specifically for Indian financial markets (NSE cash, NIFTY 50, BANKNIFTY, and F&O derivatives) with custom CSV data ingestion support.

---

## Key Features

1. **Deterministic Market Structure Engine (Zero Lookahead Bias)**
   - Algorithmic Swing Highs and Lows confirmed strictly after `k` future bars close.
   - Break of Structure (BOS) and Change of Character (CHoCH).
   - Order Block detection with full lifecycle tracking: `FRESH` -> `TESTED` -> `MITIGATED` -> `INVALIDATED`.
   - Fair Value Gaps (FVG 3-candle imbalance) with real-time fill % tracking.
   - Liquidity Pools (Equal Highs EQH / Equal Lows EQL) and liquidity sweeps.

2. **Quant Strategy Backtesting Lab**
   - Walk-forward historical testing with conservative fill execution (stop-loss prioritized on ambiguous candles).
   - Real transaction fee modeling: ₹20 brokerage, exchange turnover charges, STT, and configurable slippage.
   - Generates trade-by-trade ledger, equity curve, max drawdown, win rate, expectancy, and profit factor.

3. **Historical Market Replay**
   - Step-by-step past-only playback window.
   - Play, pause, step forward, step backward, and speed controls (1x, 2x, 5x).
   - Analyzes only what was known at that exact candle timestamp.

4. **Multi-Timeframe (MTF) Confluence Matrix**
   - Simultaneous analysis across 5m, 15m, 1h, and 1d.
   - Evaluates multi-timeframe trend alignment and detects overlapping Points of Interest (POIs).

5. **Options & Derivatives Analytics Hub**
   - Black-Scholes Greeks calculation (Delta, Gamma, Theta, Vega).
   - Full Option Chain with Call/Put Open Interest (OI) distribution.
   - Put/Call Ratio (PCR) sentiment analysis and Max Pain strike calculator.
   - Strategy Payoff diagrams (Bull Call Spread, Iron Condor, Long Straddle).

6. **Paper Trading Terminal & Risk Controls**
   - Simulated virtual portfolio (₹5,00,000 initial virtual cash with 5x intraday margin).
   - Risk management guardrail: 3% daily loss circuit breaker.
   - Active position tracking with live P&L and one-click manual close.

7. **Local Ollama AI Research Copilot**
   - Connects to local Ollama (`qwen3:8b-fast`, `qwen3:8b`, `llama3.2:1b`).
   - Grounded strictly in verified deterministic calculations (zero hallucination rule).
   - Multilingual explanations: English, Hindi, and friendly Hinglish ("Bhai Ajju" style).
   - Deterministic offline fallback engine when Ollama is offline or busy.

8. **Market Breadth & Sector Heatmap**
   - Advance/Decline ratio, % of stocks above 20 EMA.
   - Sector performance heatmap (NIFTY BANK, IT, AUTO, ENERGY, PHARMA, FMCG, METAL).
   - Institutional Premium vs Discount zone gauge.

9. **Trade Journal, Watchlists & Alerts**
   - Persistent watchlists and alert conditions (price crossing, order block proximity).
   - Structured trade journal for logging trade thesis, review notes, and discipline tags.

---

## Architecture Overview

```
orderblock/
├── backend/
│   ├── app/
│   │   ├── analysis/       # Candles, Structure (BOS/CHoCH), Order Blocks, FVG, Liquidity, Scoring, MTF, Breadth, Replay
│   │   ├── backtesting/    # Walk-forward simulation engine & trade ledger
│   │   ├── options/        # Black-Scholes Greeks, Option Chain, PCR, Max Pain, Payoffs
│   │   ├── paper_trading/  # Virtual portfolio manager & risk controls
│   │   ├── journal/        # Watchlists, alerts, and trade journal
│   │   ├── ai/             # Ollama service, prompts, and deterministic fallback
│   │   ├── api/            # FastAPI REST endpoints
│   │   ├── data/           # In-memory storage & CSV parsing
│   │   └── main.py         # App entrypoint
│   └── tests/              # Pytest automated test suite (13/13 passing)
├── frontend/
│   ├── src/
│   │   ├── components/     # CandleChart, ZoneInspector, AIAssistant, Scanner, BacktestingLab, MTFMatrix, OptionsHub, PaperTrading, TradeJournal
│   │   ├── types.ts        # Shared TypeScript interfaces
│   │   ├── index.css       # Dark trading-terminal design system
│   │   └── App.tsx         # Main orchestrator
│   └── package.json
└── sample_data/            # Realistic Indian market datasets (NIFTY 50, BANKNIFTY, RELIANCE, TCS)
```

---

## Quickstart & Installation

### Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Node.js 18+ (tested on Node v26)
- Ollama (optional, for AI copilot; fallback engine runs automatically if offline)

### 1. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Open your browser at `http://127.0.0.1:5173`.

### 3. Running Automated Tests
```bash
$env:PYTHONPATH="backend"
python -m pytest backend/tests/ -v
```

---

## Data Ingestion & Supported Formats

BlockMind AI supports CSV candle uploads from any platform (Zerodha Kite, TradingView, Yahoo Finance, NSE):
- Required columns: `timestamp` (or `datetime`/`date`), `open`, `high`, `low`, `close`.
- Optional column: `volume`.
- Enforces strict OHLC integrity validation: $High \ge \max(Open, Close, Low)$ and $Low \le \min(Open, Close, High)$.
