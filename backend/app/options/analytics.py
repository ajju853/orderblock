import math
from typing import Dict, List, Any
import numpy as np

def norm_cdf(x: float) -> float:
    """Standard normal cumulative distribution function."""
    return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0

def norm_pdf(x: float) -> float:
    """Standard normal probability density function."""
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)

def calculate_black_scholes_greeks(
    spot: float,
    strike: float,
    dte_days: float,
    iv_pct: float = 14.5,
    r: float = 0.065 # 6.5% RBI repo rate reference
) -> Dict[str, Any]:
    """
    Calculates Black-Scholes Option theoretical price and Greeks (Delta, Gamma, Theta, Vega).
    """
    T = max(1.0 / 365.0, dte_days / 365.0)
    sigma = max(0.01, iv_pct / 100.0)

    d1 = (math.log(spot / strike) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)

    call_price = spot * norm_cdf(d1) - strike * math.exp(-r * T) * norm_cdf(d2)
    put_price = strike * math.exp(-r * T) * norm_cdf(-d2) - spot * norm_cdf(-d1)

    # Greeks
    call_delta = norm_cdf(d1)
    put_delta = call_delta - 1.0
    gamma = norm_pdf(d1) / (spot * sigma * math.sqrt(T))
    vega = (spot * norm_pdf(d1) * math.sqrt(T)) / 100.0 # Per 1% IV change
    call_theta = (- (spot * norm_pdf(d1) * sigma) / (2.0 * math.sqrt(T)) - r * strike * math.exp(-r * T) * norm_cdf(d2)) / 365.0
    put_theta = (- (spot * norm_pdf(d1) * sigma) / (2.0 * math.sqrt(T)) + r * strike * math.exp(-r * T) * norm_cdf(-d2)) / 365.0

    return {
        "call_price": round(call_price, 2),
        "put_price": round(put_price, 2),
        "call_delta": round(call_delta, 3),
        "put_delta": round(put_delta, 3),
        "gamma": round(gamma, 5),
        "vega": round(vega, 2),
        "call_theta": round(call_theta, 2),
        "put_theta": round(put_theta, 2),
        "d1": round(d1, 3),
        "d2": round(d2, 3)
    }

def generate_option_chain(symbol: str, spot_price: float) -> Dict[str, Any]:
    """
    Generates a structured Option Chain for Indian indices / stocks
    with strikes, Open Interest, PCR, and Max Pain calculation.
    """
    step = 50.0 if "NIFTY" in symbol else (100.0 if "BANK" in symbol else 20.0)
    atm_strike = round(spot_price / step) * step

    strikes = [atm_strike + (i * step) for i in range(-7, 8)]
    chain = []

    total_call_oi = 0
    total_put_oi = 0

    for strike in strikes:
        moneyness = (strike - spot_price) / spot_price
        base_oi = int(max(10000, 150000 - abs(strike - spot_price) * 120))

        call_oi = int(base_oi * (1.3 if strike >= spot_price else 0.7))
        put_oi = int(base_oi * (1.3 if strike <= spot_price else 0.7))
        call_change_oi = int(call_oi * 0.12)
        put_change_oi = int(put_oi * 0.15)

        total_call_oi += call_oi
        total_put_oi += put_oi

        greeks = calculate_black_scholes_greeks(spot_price, strike, dte_days=4)

        chain.append({
            "strike": strike,
            "is_atm": strike == atm_strike,
            "call_oi": call_oi,
            "call_change_oi": call_change_oi,
            "call_ltp": greeks["call_price"],
            "call_delta": greeks["call_delta"],
            "put_oi": put_oi,
            "put_change_oi": put_change_oi,
            "put_ltp": greeks["put_price"],
            "put_delta": greeks["put_delta"],
            "gamma": greeks["gamma"],
            "iv": 13.8 + abs(moneyness * 8.0)
        })

    # PCR
    pcr = round(total_put_oi / (total_call_oi or 1), 2)

    # Max Pain Calculation (Strike where total payoff loss of option buyers is maximized)
    min_loss = float("inf")
    max_pain_strike = atm_strike

    for eval_strike in strikes:
        total_loss = 0.0
        for row in chain:
            k = row["strike"]
            # Call buyer payoff
            call_val = max(0.0, eval_strike - k) * row["call_oi"]
            # Put buyer payoff
            put_val = max(0.0, k - eval_strike) * row["put_oi"]
            total_loss += (call_val + put_val)

        if total_loss < min_loss:
            min_loss = total_loss
            max_pain_strike = eval_strike

    return {
        "symbol": symbol,
        "spot_price": spot_price,
        "atm_strike": atm_strike,
        "pcr": pcr,
        "pcr_sentiment": "BULLISH" if pcr > 1.15 else ("BEARISH" if pcr < 0.85 else "NEUTRAL"),
        "max_pain_strike": max_pain_strike,
        "total_call_oi": total_call_oi,
        "total_put_oi": total_put_oi,
        "strikes": chain
    }

def calculate_strategy_payoff(strategy_name: str, spot: float) -> Dict[str, Any]:
    """
    Computes payoff curve points for defined options structures.
    """
    price_points = [spot * (1 + (p / 100.0)) for p in range(-6, 7)]
    step = 50.0

    payoffs = []
    if strategy_name == "BULL_CALL_SPREAD":
        buy_strike = spot
        sell_strike = spot + step * 2
        net_debit = 65.0
        max_profit = (sell_strike - buy_strike) - net_debit
        max_loss = -net_debit
        for p in price_points:
            payoff = max(0.0, p - buy_strike) - max(0.0, p - sell_strike) - net_debit
            payoffs.append({"price": round(p, 1), "payoff": round(payoff, 2)})

    elif strategy_name == "IRON_CONDOR":
        sell_put = spot - step * 2
        buy_put = spot - step * 4
        sell_call = spot + step * 2
        buy_call = spot + step * 4
        net_credit = 45.0
        max_profit = net_credit
        max_loss = - (step * 2 - net_credit)
        for p in price_points:
            put_side = max(0.0, buy_put - p) - max(0.0, sell_put - p)
            call_side = max(0.0, p - buy_call) - max(0.0, p - sell_call)
            payoff = put_side + call_side + net_credit
            payoffs.append({"price": round(p, 1), "payoff": round(payoff, 2)})

    else: # LONG_STRADDLE
        strike = spot
        total_premium = 140.0
        max_profit = 9999.0
        max_loss = -total_premium
        for p in price_points:
            payoff = abs(p - strike) - total_premium
            payoffs.append({"price": round(p, 1), "payoff": round(payoff, 2)})

    return {
        "strategy": strategy_name,
        "spot": spot,
        "max_profit": max_profit,
        "max_loss": max_loss,
        "breakeven": [spot - 65.0, spot + 65.0],
        "curve": payoffs
    }
