# BlockMind AI — Market Data Providers & Integration Guide

BlockMind AI is built with a **provider-independent, lifetime-cost-conscious market data architecture**. It ensures that if any third-party or free API goes down or changes its terms, the core analysis engine remains 100% operational using locally stored data and interchangeable adapters.

---

## 1. Provider Comparison & Architectural Roles

| Provider | Supported Formats | Rate Limits / Quotas | Lifetime Cost | Primary Role in BlockMind AI |
| :--- | :--- | :--- | :--- | :--- |
| **Local CSV & Ingestion Store** | 1m, 5m, 15m, 1h, 1d (Full History) | Unlimited (Local disk) | **₹0 Free Forever** | Ground-truth historical backtesting, offline replay, and local database cache. |
| **Yahoo Finance (`yfinance`)** | 1m (7d), 5m/15m (60d), 1h (730d), 1d | ~2000 requests/hour | **₹0 Free** | Automated daily and intraday candle sync for Indian equities (`.NS`, `.BO`) and indices (`^NSEI`, `^NSEBANK`). |
| **Alpha Vantage** | 5m, 15m, 60m Intraday + Daily bars | 5 calls/min (Free tier) | **₹0 Free Tier** | Secondary validation, global market benchmarks, and currency/index correlation. |
| **Indian-Stock-Market-API** (`0xramm`/`Srvankit`) | Current quotes, batch lists, symbol search | Self-hosted / local microservice | **₹0 (Open Source MIT)** | Pluggable local microservice for rapid ticker quote lookup and symbol mapping. |

---

## 2. Configured Providers Setup

### A. Alpha Vantage API Key
Your dedicated access key is configured:
```env
ALPHA_VANTAGE_API_KEY=T8IFKZ8UTWJ3D8QO
```
- **Rate-Limiter Protection**: BlockMind AI enforces a strict sliding-window token bucket (max 5 requests per 60 seconds).
- **Cache**: Successful quotes are cached for 120 seconds to prevent hitting quota thresholds.

### B. Yahoo Finance (`yfinance`)
- Automatically maps Indian indices:
  - `NIFTY 50` -> `^NSEI`
  - `BANKNIFTY` -> `^NSEBANK`
  - `RELIANCE` -> `RELIANCE.NS`
  - `TCS` -> `TCS.NS`
- 15-minute exchange delay is explicitly tagged on all quotes as `DELAYED_FEED` with `is_delayed: true`.

### C. Indian-Stock-Market-API Microservice (`0xramm` / `Srvankit`)
If you want to run the standalone Flask microservice locally:
1. Clone the repository:
   ```bash
   git clone https://github.com/0xramm/Indian-Stock-Market-API.git
   cd Indian-Stock-Market-API
   python -m pip install -r requirements.txt
   python app.py
   ```
2. The service starts on `http://127.0.0.1:5000`.
3. In BlockMind AI `.env`, configure:
   ```env
   INDIAN_STOCK_API_URL=http://127.0.0.1:5000
   ```
4. **Circuit Breaker**: If this microservice is not running, BlockMind AI trips the circuit breaker after 3 attempts and marks it `OFFLINE` / `DEGRADED`, instantly falling back to `yfinance` or local CSV without UI stutter.

---

## 3. Data Freshness & Provenance Rules

BlockMind AI strictly adheres to quantitative data integrity:
1. **Never Label Delayed Data as Live**: Quotes from free tier feeds with 15-minute delays are always clearly marked in the UI with a `DELAYED (15m)` badge.
2. **Never Infer Historical Candles from a Current Quote**: Order blocks, BOS, and FVGs are only calculated from verified historical OHLCV series.
3. **Automated Fallback Cascade**: If the active provider fails, the system cascades:
   $$\text{Active Provider} \longrightarrow \text{Yahoo Finance} \longrightarrow \text{Alpha Vantage} \longrightarrow \text{Local CSV Cache}$$
