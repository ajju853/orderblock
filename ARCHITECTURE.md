# BlockMind AI — Architecture & Engineering Specification

## 1. System Design Philosophy

BlockMind AI strictly separates **deterministic quantitative calculation** from **artificial intelligence reasoning**:

```
[Market Data / CSV]
        │
        ▼
[Data Validation & Normalization Engine] (candles.py)
        │
        ▼
[Market Structure Engine] (structure.py: Zero lookahead swing detection, BOS, CHoCH)
        │
        ├──► [Order Block & Lifecycle Engine] (order_blocks.py: FRESH, TESTED, MITIGATED, INVALIDATED)
        ├──► [Fair Value Gap Engine] (fvg.py: 3-candle imbalance, fill % tracking)
        ├──► [Liquidity & Sweep Engine] (liquidity.py: EQH/EQL, turtle soup sweeps)
        └──► [Setup Scoring Engine] (scoring.py: rule-based multi-factor score 0-100)
        │
        ├──► [Backtesting Lab] (engine.py: walk-forward simulation with slippage & brokerage)
        ├──► [MTF Confluence] (mtf.py: multi-timeframe alignment & POI overlaps)
        ├──► [Options Hub] (analytics.py: Black-Scholes Greeks, PCR, Max Pain)
        └──► [Paper Trading] (portfolio.py: virtual margin, positions, daily loss limit)
        │
        ├──► [FastAPI REST APIs] (routes.py: typed Pydantic contracts & CORS)
        │           │
        │           ▼
        │    [React + TypeScript Frontend] (Canvas Candlestick Chart, Zone Inspector, Terminal)
        │
        └──► [Structured Factual Context Builder] (prompts.py)
                    │
                    ▼
             [Local Ollama AI] (qwen3:8b-fast / llama3.2:1b)
                    │
                    ▼
             [English / Hindi / Hinglish Institutional Explanation]
```

## 2. Preventing Look-Ahead Bias

A common flaw in visual trading indicators is looking ahead into future bars to paint historical pivots. BlockMind AI guarantees zero look-ahead bias through explicit confirmation indexing:

- **Swing High/Low Rule**: A pivot at candle index $i$ requires $L$ left bars and $R$ right bars.
  The swing point is **never** available at index $i$; its earliest valid availability timestamp is strictly:
  $$\text{Confirmation Index} = i + R$$
- **Structure Break (BOS/CHoCH)**: At candle $j$, the engine only queries swing points where $\text{Confirmation Index} \le j$.
- **Backtesting Execution**: In `run_backtest_simulation`, the bar loop advances sequentially bar-by-bar, slicing `candles[:i+1]`. Orders are filled on subsequent bars using only conservative assumptions.

## 3. Order Block Lifecycle State Machine

Order blocks follow an explicit state transition machine:

```
[Candle Breakout] ──► [Candidate Detection: Last Opposing Candle]
                                │
                                ▼
                             [FRESH] (Price has not re-entered zone)
                                │
                                ├──► [TESTED] (Price touched zone bounds, test_count += 1)
                                │       │
                                │       ▼
                                │    [MITIGATED] (Price reached 50% equilibrium level)
                                │
                                └──► [INVALIDATED] (Price candle closed beyond far boundary)
```

- **Bullish Invalidation**: Candle close below `zone_low`.
- **Bearish Invalidation**: Candle close above `zone_high`.

## 4. Local Ollama Integration Contract

The AI Assistant is never allowed to invent technical indicators or market prices.
1. The deterministic engine calculates verified values (Trend, Score, Zones, Invalidation levels, Support/Resistance).
2. The values are serialized into a strict JSON context payload.
3. The prompt explicitly restricts the LLM to interpreting the provided facts.
4. If Ollama is offline or uninstalled, the backend triggers an automated rule-based explanation fallback so the user experience remains uninterrupted.
