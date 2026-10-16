# BlockMind AI — REST API Documentation

Base URL: `http://127.0.0.1:8000/api/v1`

## Endpoints

### 1. System Health
- **`GET /health`**
  - Returns backend status, active instruments count, and Ollama connection status.

### 2. Instruments & Market Data
- **`GET /instruments`**
  - Lists supported instruments (NIFTY 50, BANKNIFTY, RELIANCE, TCS, and uploaded assets).
- **`GET /candles?symbol={symbol}&timeframe={tf}`**
  - Returns validated OHLCV candlestick series.
- **`POST /data/import`** (multipart/form-data)
  - Fields: `file` (.csv), `symbol` (optional), `timeframe` (optional).
  - Validates OHLC integrity and reports row-level errors.

### 3. Market Structure & Order Block Analysis
- **`POST /analysis/run?symbol={symbol}&timeframe={tf}`**
  - Body: `EngineConfig` (optional)
  - Returns: Swings, BOS/CHoCH events, Order Blocks with lifecycle states, FVGs, Liquidity levels, and Setup Score.

### 4. Multi-Asset Scanner
- **`POST /scanner/run`**
  - Scans loaded instruments and returns ranked setups with score breakdown.

### 5. Multi-Timeframe & Market Breadth
- **`GET /analysis/mtf?symbol={symbol}`**
  - Evaluates 5m, 15m, 1h, and 1d structural trends and detects overlapping POI zones.
- **`GET /market/breadth?symbol={symbol}`**
  - Returns Advance/Decline ratio, % above 20 EMA, sector heatmap, and institutional Premium/Discount gauge.

### 6. Strategy Backtesting & Replay
- **`POST /backtest/run`**
  - Body: `BacktestRequest` (`strategy_name`, `initial_capital`, `risk_per_trade_pct`, `target_rr`, `slippage_pct`, `brokerage_per_trade`).
  - Returns: Trade ledger, equity curve, win rate %, profit factor, max drawdown %, expectancy.
- **`GET /replay/step?symbol={symbol}&timeframe={tf}&step_index={n}`**
  - Returns past-only market analysis snapshot at historical step `n`.

### 7. Options & Derivatives Analytics
- **`GET /options/chain?symbol={symbol}`**
  - Returns Option Chain with Call/Put Open Interest, Black-Scholes Greeks, PCR, and Max Pain strike.
- **`GET /options/payoff?strategy={strat}&symbol={symbol}`**
  - Returns payoff curve points and risk/reward metrics for defined options strategies.

### 8. Paper Trading
- **`GET /paper/account`**
  - Returns virtual cash, total equity, realized/unrealized P&L, daily loss circuit breaker, and active positions.
- **`POST /paper/order`**
  - Body: `PaperOrderRequest` (`symbol`, `direction`, `quantity`, `stop_loss`, `take_profit`).
- **`POST /paper/close/{position_id}`**
  - Closes simulated paper trading position and logs to trade history.

### 9. Watchlists, Alerts & Trade Journal
- **`GET/POST /watchlists`**
- **`GET/POST /alerts`**
- **`GET/POST /journal`**

### 10. Ollama Local AI Copilot
- **`POST /ai/explain`**
  - Body: `AIChatRequest` (`symbol`, `timeframe`, `selected_zone_id`, `question`, `language`, `model`).
  - Returns: Grounded institutional trading explanation and execution latency in ms.
- **`GET /models`**
  - Lists available local Ollama models.
