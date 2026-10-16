from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
from app.models.schemas import Candle, EngineConfig
from app.analysis.structure import detect_swings, detect_structure_events
from app.analysis.order_blocks import detect_and_track_order_blocks
from app.analysis.fvg import detect_and_track_fvgs

class BacktestRequest(BaseModel):
    symbol: str = "NIFTY 50"
    timeframe: str = "15m"
    strategy_name: Literal["OB_RETEST_ENTRY", "BOS_MOMENTUM_ENTRY", "LIQUIDITY_SWEEP_ENTRY"] = "OB_RETEST_ENTRY"
    initial_capital: float = 100000.0 # ₹1,00,000 INR
    risk_per_trade_pct: float = 1.0 # 1% risk per trade
    target_rr: float = 2.0 # 1:2 Risk to Reward
    slippage_pct: float = 0.03 # 0.03%
    brokerage_per_trade: float = 20.0 # ₹20 per order
    config: Optional[EngineConfig] = None

class BacktestTrade(BaseModel):
    id: str
    direction: Literal["LONG", "SHORT"]
    entry_time: str
    exit_time: str
    entry_price: float
    exit_price: float
    quantity: int
    gross_pnl: float
    net_pnl: float
    fees: float
    rr_achieved: float
    exit_reason: Literal["TARGET_HIT", "STOP_LOSS", "ZONE_INVALIDATION", "END_OF_DATA"]

class BacktestResult(BaseModel):
    strategy_name: str
    symbol: str
    timeframe: str
    initial_capital: float
    final_equity: float
    net_return_pct: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate_pct: float
    profit_factor: float
    max_drawdown_pct: float
    expectancy: float
    avg_win: float
    avg_loss: float
    equity_curve: List[Dict[str, Any]]
    trades: List[BacktestTrade]
    execution_assumptions: Dict[str, Any]

def run_backtest_simulation(candles: List[Candle], req: BacktestRequest) -> BacktestResult:
    """
    Executes a walk-forward, chronological backtest with realistic fills,
    conservative stop-loss prioritization, and transaction fee deduction.
    """
    cfg = req.config or EngineConfig()
    n = len(candles)
    capital = req.initial_capital
    peak_capital = capital
    max_drawdown = 0.0

    trades: List[BacktestTrade] = []
    equity_curve: List[Dict[str, Any]] = [
        {"timestamp": candles[0].timestamp if n > 0 else "start", "equity": capital, "drawdown_pct": 0.0}
    ]

    if n < 30:
        return BacktestResult(
            strategy_name=req.strategy_name,
            symbol=req.symbol,
            timeframe=req.timeframe,
            initial_capital=capital,
            final_equity=capital,
            net_return_pct=0.0,
            total_trades=0,
            winning_trades=0,
            losing_trades=0,
            win_rate_pct=0.0,
            profit_factor=0.0,
            max_drawdown_pct=0.0,
            expectancy=0.0,
            avg_win=0.0,
            avg_loss=0.0,
            equity_curve=equity_curve,
            trades=[],
            execution_assumptions={"error": "Insufficient historical candles for backtesting"}
        )

    # Walk-forward simulation bar by bar
    active_trade: Optional[Dict[str, Any]] = None

    for i in range(25, n):
        # Slice only candles available at or before index i (NO FUTURE LEAKAGE)
        window = candles[:i + 1]
        curr_bar = candles[i]

        # 1. Evaluate Active Trade Exits
        if active_trade:
            pos = active_trade
            is_long = pos["direction"] == "LONG"
            exit_price: Optional[float] = None
            exit_reason: Optional[str] = None

            # Conservative fill logic: check SL first, then TP
            if is_long:
                if curr_bar.low <= pos["stop_loss"]:
                    exit_price = pos["stop_loss"] * (1 - req.slippage_pct / 100)
                    exit_reason = "STOP_LOSS"
                elif curr_bar.high >= pos["target"]:
                    exit_price = pos["target"] * (1 - req.slippage_pct / 100)
                    exit_reason = "TARGET_HIT"
            else: # SHORT
                if curr_bar.high >= pos["stop_loss"]:
                    exit_price = pos["stop_loss"] * (1 + req.slippage_pct / 100)
                    exit_reason = "STOP_LOSS"
                elif curr_bar.low <= pos["target"]:
                    exit_price = pos["target"] * (1 + req.slippage_pct / 100)
                    exit_reason = "TARGET_HIT"

            if exit_price:
                qty = pos["quantity"]
                gross_pnl = (exit_price - pos["entry_price"]) * qty if is_long else (pos["entry_price"] - exit_price) * qty
                total_fees = req.brokerage_per_trade * 2 + (exit_price * qty * 0.00025) # brokerage + STT turnover
                net_pnl = round(gross_pnl - total_fees, 2)

                capital += net_pnl
                peak_capital = max(peak_capital, capital)
                dd_pct = round(((peak_capital - capital) / peak_capital) * 100, 2)
                max_drawdown = max(max_drawdown, dd_pct)

                risk_amt = abs(pos["entry_price"] - pos["stop_loss"]) * qty or 1.0
                rr_achieved = round(net_pnl / risk_amt, 2)

                trades.append(BacktestTrade(
                    id=f"trade-{len(trades) + 1}",
                    direction=pos["direction"],
                    entry_time=pos["entry_time"],
                    exit_time=curr_bar.timestamp,
                    entry_price=round(pos["entry_price"], 2),
                    exit_price=round(exit_price, 2),
                    quantity=qty,
                    gross_pnl=round(gross_pnl, 2),
                    net_pnl=net_pnl,
                    fees=round(total_fees, 2),
                    rr_achieved=rr_achieved,
                    exit_reason=exit_reason
                ))

                equity_curve.append({
                    "timestamp": curr_bar.timestamp,
                    "equity": round(capital, 2),
                    "drawdown_pct": dd_pct
                })
                active_trade = None

        # 2. Evaluate Strategy Entry Conditions (only if no active trade)
        if not active_trade and i < n - 5:
            swings = detect_swings(window, cfg)
            struct_events, trend = detect_structure_events(window, swings, cfg)
            obs = detect_and_track_order_blocks(window, struct_events, cfg)

            entry_signal: Optional[Dict[str, Any]] = None

            if req.strategy_name == "OB_RETEST_ENTRY":
                # Check if current bar touches a confirmed fresh/tested OB
                for ob in obs:
                    if ob.status in ["fresh", "tested"]:
                        is_bull = ob.type == "bullish"
                        if is_bull and trend == "BULLISH" and curr_bar.low <= ob.high and curr_bar.close >= ob.low:
                            entry_price = curr_bar.close * (1 + req.slippage_pct / 100)
                            sl = ob.low * 0.998 # just below zone low
                            risk = entry_price - sl
                            if risk > 0:
                                tp = entry_price + (risk * req.target_rr)
                                entry_signal = {"direction": "LONG", "entry": entry_price, "sl": sl, "tp": tp}
                                break
                        elif not is_bull and trend == "BEARISH" and curr_bar.high >= ob.low and curr_bar.close <= ob.high:
                            entry_price = curr_bar.close * (1 - req.slippage_pct / 100)
                            sl = ob.high * 1.002
                            risk = sl - entry_price
                            if risk > 0:
                                tp = entry_price - (risk * req.target_rr)
                                entry_signal = {"direction": "SHORT", "entry": entry_price, "sl": sl, "tp": tp}
                                break

            elif req.strategy_name == "BOS_MOMENTUM_ENTRY":
                # Enter immediately on latest candle if it formed a confirmed BOS
                if struct_events and struct_events[-1].confirmation_index == i:
                    last_ev = struct_events[-1]
                    if "bullish" in last_ev.type:
                        entry_price = curr_bar.close * (1 + req.slippage_pct / 100)
                        sl = curr_bar.low * 0.995
                        risk = entry_price - sl
                        if risk > 0:
                            entry_signal = {"direction": "LONG", "entry": entry_price, "sl": sl, "tp": entry_price + (risk * req.target_rr)}
                    elif "bearish" in last_ev.type:
                        entry_price = curr_bar.close * (1 - req.slippage_pct / 100)
                        sl = curr_bar.high * 1.005
                        risk = sl - entry_price
                        if risk > 0:
                            entry_signal = {"direction": "SHORT", "entry": entry_price, "sl": sl, "tp": entry_price - (risk * req.target_rr)}

            if entry_signal:
                risk_budget = capital * (req.risk_per_trade_pct / 100.0)
                unit_risk = abs(entry_signal["entry"] - entry_signal["sl"]) or 1.0
                qty = max(1, int(risk_budget / unit_risk))

                active_trade = {
                    "direction": entry_signal["direction"],
                    "entry_time": curr_bar.timestamp,
                    "entry_price": entry_signal["entry"],
                    "stop_loss": entry_signal["sl"],
                    "target": entry_signal["tp"],
                    "quantity": qty
                }

    # Close remaining position at last bar close if still open
    if active_trade:
        c_last = candles[-1]
        is_long = active_trade["direction"] == "LONG"
        exit_p = c_last.close
        qty = active_trade["quantity"]
        gross_pnl = (exit_p - active_trade["entry_price"]) * qty if is_long else (active_trade["entry_price"] - exit_p) * qty
        fees = req.brokerage_per_trade * 2
        net_pnl = round(gross_pnl - fees, 2)
        capital += net_pnl
        trades.append(BacktestTrade(
            id=f"trade-{len(trades) + 1}",
            direction=active_trade["direction"],
            entry_time=active_trade["entry_time"],
            exit_time=c_last.timestamp,
            entry_price=round(active_trade["entry_price"], 2),
            exit_price=round(exit_p, 2),
            quantity=qty,
            gross_pnl=round(gross_pnl, 2),
            net_pnl=net_pnl,
            fees=round(fees, 2),
            rr_achieved=round(net_pnl / (abs(active_trade["entry_price"] - active_trade["stop_loss"]) * qty or 1), 2),
            exit_reason="END_OF_DATA"
        ))

    # Calculate Summary Metrics
    total_trades = len(trades)
    winning_trades = [t for t in trades if t.net_pnl > 0]
    losing_trades = [t for t in trades if t.net_pnl <= 0]
    win_rate = round((len(winning_trades) / total_trades * 100), 1) if total_trades > 0 else 0.0

    total_win_pnl = sum(t.net_pnl for t in winning_trades)
    total_loss_pnl = abs(sum(t.net_pnl for t in losing_trades))
    profit_factor = round(total_win_pnl / (total_loss_pnl or 1.0), 2) if total_loss_pnl > 0 else round(total_win_pnl, 2)

    avg_win = round(total_win_pnl / len(winning_trades), 2) if winning_trades else 0.0
    avg_loss = round(total_loss_pnl / len(losing_trades), 2) if losing_trades else 0.0

    expectancy = round(((win_rate / 100) * avg_win) - ((1 - win_rate / 100) * avg_loss), 2)
    net_return_pct = round(((capital - req.initial_capital) / req.initial_capital) * 100, 2)

    return BacktestResult(
        strategy_name=req.strategy_name,
        symbol=req.symbol,
        timeframe=req.timeframe,
        initial_capital=round(req.initial_capital, 2),
        final_equity=round(capital, 2),
        net_return_pct=net_return_pct,
        total_trades=total_trades,
        winning_trades=len(winning_trades),
        losing_trades=len(losing_trades),
        win_rate_pct=win_rate,
        profit_factor=profit_factor,
        max_drawdown_pct=round(max_drawdown, 2),
        expectancy=expectancy,
        avg_win=avg_win,
        avg_loss=avg_loss,
        equity_curve=equity_curve,
        trades=trades,
        execution_assumptions={
            "slippage_pct": req.slippage_pct,
            "brokerage_per_trade_inr": req.brokerage_per_trade,
            "risk_per_trade_pct": req.risk_per_trade_pct,
            "stop_loss_priority": "Conservative (SL before TP on ambiguous bar)"
        }
    )
