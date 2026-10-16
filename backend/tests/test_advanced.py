import pytest
from app.models.schemas import Candle, EngineConfig
from app.data.storage import store
from app.backtesting.engine import BacktestRequest, run_backtest_simulation
from app.analysis.replay import get_replay_snapshot
from app.paper_trading.portfolio import PaperTradingManager, PaperOrderRequest
from app.options.analytics import calculate_black_scholes_greeks, generate_option_chain, calculate_strategy_payoff
from app.analysis.mtf import analyze_multi_timeframe
from app.analysis.breadth import calculate_premium_discount, get_market_breadth_and_sectors

def test_backtest_simulation():
    candles = store.get_candles("NIFTY 50", "15m")
    assert len(candles) > 0

    req = BacktestRequest(
        symbol="NIFTY 50",
        timeframe="15m",
        strategy_name="OB_RETEST_ENTRY",
        initial_capital=100000.0,
        risk_per_trade_pct=1.0,
        target_rr=2.0
    )
    res = run_backtest_simulation(candles, req)
    assert res.initial_capital == 100000.0
    assert isinstance(res.equity_curve, list)
    assert len(res.equity_curve) >= 1
    assert 0.0 <= res.win_rate_pct <= 100.0
    assert res.max_drawdown_pct >= 0.0

def test_replay_past_only_window():
    candles = store.get_candles("NIFTY 50", "15m")
    step = 50
    snap = get_replay_snapshot("NIFTY 50", "15m", step_index=step)
    assert snap["current_step"] == step
    assert snap["analysis"]["total_candles"] == step + 1
    # Verify no candle after step 50 is included
    assert snap["timestamp"] == candles[step].timestamp

def test_paper_trading_lifecycle():
    pm = PaperTradingManager(initial_capital=500000.0)
    assert pm.cash_balance == 500000.0

    order = PaperOrderRequest(
        symbol="NIFTY 50",
        direction="LONG",
        quantity=10
    )
    fill_res = pm.place_order(order)
    assert fill_res["success"] is True
    pos_id = fill_res["position"]["id"]

    # Check position open
    state = pm.get_account_state()
    assert len(state.active_positions) == 1

    # Close position
    close_res = pm.close_position(pos_id, reason="TEST_CLOSE")
    assert close_res["success"] is True

    # Check trade ledger
    state_after = pm.get_account_state()
    assert len(state_after.active_positions) == 0
    assert len(state_after.trade_history) == 1

def test_options_black_scholes_greeks():
    greeks = calculate_black_scholes_greeks(spot=25000.0, strike=25000.0, dte_days=5, iv_pct=14.0)
    assert 0.45 <= greeks["call_delta"] <= 0.55
    assert -0.55 <= greeks["put_delta"] <= -0.45
    assert greeks["gamma"] > 0
    assert greeks["vega"] > 0
    assert greeks["call_theta"] < 0

def test_option_chain_pcr_max_pain():
    chain_data = generate_option_chain("NIFTY 50", 24850.0)
    assert chain_data["spot_price"] == 24850.0
    assert chain_data["atm_strike"] == 24850.0
    assert chain_data["pcr"] > 0
    assert len(chain_data["strikes"]) == 15
    assert chain_data["max_pain_strike"] > 0

def test_strategy_payoff():
    payoff = calculate_strategy_payoff("BULL_CALL_SPREAD", 25000.0)
    assert payoff["strategy"] == "BULL_CALL_SPREAD"
    assert len(payoff["curve"]) == 13
    assert payoff["max_profit"] > 0

def test_mtf_confluence():
    mtf = analyze_multi_timeframe("NIFTY 50", ["15m", "1h"])
    assert "overall_bias" in mtf
    assert 0 <= mtf["confluence_score"] <= 100
    assert "timeframe_breakdown" in mtf

def test_market_breadth_and_sectors():
    breadth = get_market_breadth_and_sectors()
    assert breadth["advance_decline_ratio"] > 0
    assert len(breadth["sectors"]) >= 5
