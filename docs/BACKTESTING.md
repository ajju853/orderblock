# BlockMind AI — Quant Backtesting Methodology & Assumptions

## 1. Walk-Forward Execution Model

The backtesting engine (`backend/app/backtesting/engine.py`) processes historical candle series in strict chronological order:
- No future candle data is accessible when evaluating signals at candle index $i$.
- Position entries occur at the close of candle $i$ or the open of candle $i+1$.

## 2. Realistic Fill Assumptions & Slippage

To reflect real Indian stock market / F&O conditions:
- **Slippage**: Default $0.03\%$ is added to entry prices and deducted from exit prices to simulate execution spread and order queue delays.
- **Brokerage & Turnover Charges**: ₹20 flat brokerage per order + Securities Transaction Tax (STT) + exchange turnover charges are deducted directly from gross P&L.
- **Ambiguous Candle Execution (Conservative Rule)**:
  If a single candle's range spans across both the Stop Loss price and the Target price, the engine follows the **conservative risk management assumption** that the Stop Loss was hit first.

## 3. Position Sizing

Capital risk allocation:
$$\text{Risk Budget} = \text{Current Equity} \times \frac{\text{Risk Per Trade \%}}{100}$$
$$\text{Quantity} = \max\left(1, \left\lfloor \frac{\text{Risk Budget}}{|\text{Entry Price} - \text{Stop Loss Price}|} \right\rfloor\right)$$

## 4. Quantitative Performance Metrics

- **Net Return \%**: $\frac{\text{Final Equity} - \text{Initial Capital}}{\text{Initial Capital}} \times 100$
- **Win Rate \%**: $\frac{\text{Winning Trades Count}}{\text{Total Trades Count}} \times 100$
- **Profit Factor**: $\frac{\sum \text{Gross Winning PnL}}{|\sum \text{Gross Losing PnL}|}$
- **Max Drawdown \%**: $\max_{t} \left( \frac{\text{Peak Equity}_t - \text{Equity}_t}{\text{Peak Equity}_t} \times 100 \right)$
- **Expectancy**: $(\text{Win Rate} \times \text{Avg Win}) - ((1 - \text{Win Rate}) \times \text{Avg Loss})$
