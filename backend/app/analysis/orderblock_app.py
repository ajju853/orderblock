"""
OrderBlock Terminal Backend Service
Generates live market flow trajectories, sector telemetry, and ranked bullish & bearish 
order block setups modeled after https://order-block.com/app/orderblock.
"""

from typing import Dict, List, Any, Optional
import math
import random

# Predefined F&O Universe with Sectors and typical baseline pricing
FO_UNIVERSE = [
    {"symbol": "SBIN", "name": "State Bank of India", "sector": "BANK", "base_price": 842.35, "bias": "BULL", "rank": 1},
    {"symbol": "AXISBANK", "name": "Axis Bank Ltd", "sector": "BANK", "base_price": 1184.50, "bias": "BULL", "rank": 2},
    {"symbol": "TITAN", "name": "Titan Company Ltd", "sector": "CONSUMPTION", "base_price": 3420.00, "bias": "BULL", "rank": 3},
    {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "sector": "OIL & GAS", "base_price": 2740.00, "bias": "BULL", "rank": 4},
    {"symbol": "TCS", "name": "Tata Consultancy Services", "sector": "IT", "base_price": 3950.00, "bias": "BULL", "rank": 5},
    {"symbol": "TATASTEEL", "name": "Tata Steel Ltd", "sector": "METAL", "base_price": 158.40, "bias": "BULL", "rank": 6},
    {"symbol": "BAJFINANCE", "name": "Bajaj Finance Ltd", "sector": "FIN SERVICE", "base_price": 7180.00, "bias": "BULL", "rank": 7},
    {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd", "sector": "TELECOM", "base_price": 1640.00, "bias": "BULL", "rank": 8},
    
    {"symbol": "INFY", "name": "Infosys Ltd", "sector": "IT", "base_price": 1842.35, "bias": "BEAR", "rank": 1},
    {"symbol": "WIPRO", "name": "Wipro Ltd", "sector": "IT", "base_price": 512.60, "bias": "BEAR", "rank": 2},
    {"symbol": "HCLTECH", "name": "HCL Technologies Ltd", "sector": "IT", "base_price": 1720.00, "bias": "BEAR", "rank": 3},
    {"symbol": "TATAMOTORS", "name": "Tata Motors Ltd", "sector": "AUTO", "base_price": 890.00, "bias": "BEAR", "rank": 4},
    {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "sector": "BANK", "base_price": 1680.00, "bias": "BEAR", "rank": 5},
    {"symbol": "TECHM", "name": "Tech Mahindra Ltd", "sector": "IT", "base_price": 1520.00, "bias": "BEAR", "rank": 6},
    {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank", "sector": "BANK", "base_price": 1790.00, "bias": "BEAR", "rank": 7},
    {"symbol": "SUNPHARMA", "name": "Sun Pharma Industries", "sector": "PHARMA", "base_price": 1780.00, "bias": "BEAR", "rank": 8},
]

SECTORS_LIST = [
    {"name": "IT", "change_pct": -2.15, "stocks_count": 24, "sentiment": "BEARISH"},
    {"name": "PHARMA", "change_pct": 0.45, "stocks_count": 18, "sentiment": "NEUTRAL"},
    {"name": "BANK", "change_pct": 1.25, "stocks_count": 32, "sentiment": "BULLISH"},
    {"name": "METAL", "change_pct": 1.84, "stocks_count": 16, "sentiment": "STRONG_BULLISH"},
    {"name": "AUTO", "change_pct": -0.85, "stocks_count": 20, "sentiment": "MILD_BEARISH"},
    {"name": "OIL & GAS", "change_pct": 0.65, "stocks_count": 14, "sentiment": "BULLISH"},
    {"name": "REALTY", "change_pct": -0.35, "stocks_count": 12, "sentiment": "NEUTRAL"},
    {"name": "FIN SERVICE", "change_pct": 0.95, "stocks_count": 28, "sentiment": "BULLISH"},
]

TIME_POINTS = [
    "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45",
    "11:00", "11:15", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30"
]

def generate_trajectory(direction: str, target_pct: float, noise_seed: int) -> List[Dict[str, Any]]:
    """Generates an intraday curve trajectory starting at 09:15 baseline."""
    random.seed(noise_seed)
    curve = []
    total_steps = len(TIME_POINTS)
    
    for idx, t in enumerate(TIME_POINTS):
        progress = idx / (total_steps - 1)
        noise = (random.random() - 0.48) * 0.15
        base = target_pct * (progress ** 0.85)
        val = round(base + noise, 2)
        if idx == 0:
            val = 0.0
        curve.append({"time": t, "pct": val})
    return curve

def generate_composite_market_curve() -> List[Dict[str, Any]]:
    """
    Generates the characteristic market composite curve matching the screenshot:
    Dipping into deep red (-2.8%) at mid-morning liquidity sweep, followed by an afternoon rebound.
    """
    curve = []
    points = [
        ("09:15", 0.0),
        ("09:30", -0.45),
        ("09:45", -1.15),
        ("10:00", -1.80),
        ("10:15", -2.35),
        ("10:30", -2.85),  # Liquidity sweep low trough
        ("10:45", -2.60),
        ("11:00", -2.10),
        ("11:15", -1.75),
        ("11:30", -1.40),
        ("12:00", -1.10),
        ("12:30", -0.85),
        ("13:00", -0.70),
        ("13:30", -0.55),
        ("14:00", -0.40),
        ("14:30", -0.30),
        ("15:00", -0.25),
        ("15:30", -0.20)
    ]
    for t, p in points:
        curve.append({"time": t, "pct": p})
    return curve

def generate_mini_candles(base_price: float, bias: str, count: int = 24) -> List[Dict[str, float]]:
    """Generates candle history for the popover chart with realistic pullback into OB zone."""
    candles = []
    curr = base_price * (0.97 if bias == "BULL" else 1.03)
    
    for i in range(count):
        if bias == "BULL":
            step = (random.random() - 0.42) * (base_price * 0.0035)
        else:
            step = (random.random() - 0.58) * (base_price * 0.0035)
            
        open_p = curr
        close_p = open_p + step
        high_p = max(open_p, close_p) + abs(random.random() * (base_price * 0.002))
        low_p = min(open_p, close_p) - abs(random.random() * (base_price * 0.002))
        
        candles.append({
            "open": round(open_p, 2),
            "high": round(high_p, 2),
            "low": round(low_p, 2),
            "close": round(close_p, 2),
            "volume": int(random.randint(15000, 85000))
        })
        curr = close_p
    return candles

def get_orderblock_terminal_data() -> Dict[str, Any]:
    """Assembles complete OrderBlock terminal data model matching order-block.com/app/orderblock."""
    trajectories = []
    bull_setups = []
    bear_setups = []

    target_changes = {
        "SBIN": 2.84, "AXISBANK": 2.31, "TITAN": 2.06, "RELIANCE": 1.75, "TCS": 1.45, "TATASTEEL": 1.95, "BAJFINANCE": 1.60, "BHARTIARTL": 1.35,
        "INFY": -2.47, "WIPRO": -1.88, "HCLTECH": -1.64, "TATAMOTORS": -1.55, "HDFCBANK": -1.25, "TECHM": -1.40, "KOTAKBANK": -0.95, "SUNPHARMA": -0.80
    }

    for idx, item in enumerate(FO_UNIVERSE):
        sym = item["symbol"]
        bias = item["bias"]
        target = target_changes.get(sym, 1.5 if bias == "BULL" else -1.5)
        
        curve = generate_trajectory(bias, target, noise_seed=idx * 17 + 42)
        trajectories.append({
            "symbol": sym,
            "name": item["name"],
            "sector": item["sector"],
            "direction": bias,
            "change_pct": target,
            "curve": curve
        })

        price = item["base_price"]
        
        if bias == "BULL":
            zone_low = round(price * 0.993, 2)
            zone_high = round(price * 0.996, 2)
            eq_price = round((zone_low + zone_high) / 2, 2)
            r1 = round(price * 1.008, 2)
            r2 = round(price * 1.016, 2)
            s1 = round(price * 0.988, 2)
            s2 = round(price * 0.982, 2)
            lq = round(price * 0.985, 2)
            risk = 0.78 + (idx % 3) * 0.07
            rr = f"1:{round(2.8 + (idx % 4) * 0.3, 1)}"
            oi_val = f"+{round(3.5 + (idx * 0.8), 1)}%"
            oi_delta = f"+{int(100 + idx * 35)}K"
            
            candles = generate_mini_candles(price, "BULL", 20)
            sparkline = [c["close"] for c in candles]

            bull_setups.append({
                "rank": item["rank"],
                "symbol": sym,
                "name": item["name"],
                "price": price,
                "change_pct": target,
                "change_abs": round(price * (target / 100), 2),
                "badge": "BULL",
                "buildup": "LONG BUILD-UP",
                "oi": oi_val,
                "oi_delta": oi_delta,
                "zone": {
                    "low": zone_low,
                    "high": zone_high,
                    "eq": eq_price,
                    "status": "FRESH" if idx < 3 else "TESTED"
                },
                "levels": {
                    "r1": r1,
                    "r2": r2,
                    "r3": round(r2 * 1.008, 2),
                    "s1": s1,
                    "s2": s2,
                    "liquidity": lq
                },
                "risk_pct": round(risk, 2),
                "rr_ratio": rr,
                "conviction": "A+ (Institutional)" if idx <= 2 else "A (High)",
                "vwap": round(price * 0.997, 2),
                "rule": "BREAKOUT CONFIRMED",
                "sparkline": sparkline,
                "candles": candles
            })
        else:
            zone_low = round(price * 1.004, 2)
            zone_high = round(price * 1.012, 2)
            eq_price = round((zone_low + zone_high) / 2, 2)
            r1 = round(price * 1.015, 2)
            r2 = round(price * 1.025, 2)
            s1 = round(price * 0.985, 2)
            s2 = round(price * 0.972, 2)
            lq = round(price * 0.969, 2)
            risk = 0.88 + (idx % 3) * 0.06
            rr = f"1:{round(2.7 + (idx % 3) * 0.25, 1)}"
            oi_val = f"+{round(4.2 + (idx * 0.9), 1)}%"
            oi_delta = f"+{int(180 + idx * 45)}K"
            
            candles = generate_mini_candles(price, "BEAR", 20)
            sparkline = [c["close"] for c in candles]

            bear_setups.append({
                "rank": item["rank"],
                "symbol": sym,
                "name": item["name"],
                "price": price,
                "change_pct": target,
                "change_abs": round(price * (target / 100), 2),
                "badge": "BEAR",
                "buildup": "SHORT BUILD-UP",
                "oi": oi_val,
                "oi_delta": oi_delta,
                "zone": {
                    "low": zone_low,
                    "high": zone_high,
                    "eq": eq_price,
                    "status": "FRESH" if idx < 3 else "TESTED"
                },
                "levels": {
                    "r1": r1,
                    "r2": r2,
                    "r3": round(r2 * 1.008, 2),
                    "s1": s1,
                    "s2": s2,
                    "liquidity": lq
                },
                "risk_pct": round(risk, 2),
                "rr_ratio": rr,
                "conviction": "A+ (Institutional)" if idx <= 2 else "A (High)",
                "vwap": round(price * 1.008, 2),
                "rule": "BREAKDOWN CONFIRMED",
                "sparkline": sparkline,
                "candles": candles
            })

    bull_setups.sort(key=lambda s: s["rank"])
    bear_setups.sort(key=lambda s: s["rank"])

    return {
        "market_summary": {
            "session_time": "11:05 AM IST",
            "market_state": "LIVE",
            "bullish_count": 128,
            "bearish_count": 84,
            "leading_sector": "NIFTY METAL (+1.84%)",
            "lagging_sector": "NIFTY IT (-2.15%)",
            "nifty_spot": 24865.40,
            "nifty_change": "+82.50 (+0.33%)"
        },
        "sectors": SECTORS_LIST,
        "time_points": TIME_POINTS,
        "trajectories": trajectories,
        "market_composite_curve": generate_composite_market_curve(),
        "bull_setups": bull_setups,
        "bear_setups": bear_setups
    }

def get_stock_detail(symbol: str) -> Optional[Dict[str, Any]]:
    """Fetches full institutional details for a stock."""
    data = get_orderblock_terminal_data()
    for s in data["bull_setups"] + data["bear_setups"]:
        if s["symbol"].upper() == symbol.upper():
            return s
    price = 1000.0
    return {
        "rank": 99,
        "symbol": symbol.upper(),
        "name": f"{symbol.upper()} Equity",
        "price": price,
        "change_pct": 0.45,
        "change_abs": 4.50,
        "badge": "BULL",
        "buildup": "NEUTRAL ACCUMULATION",
        "oi": "+1.2%",
        "oi_delta": "+20K",
        "zone": {"low": 992.0, "high": 996.0, "eq": 994.0, "status": "FRESH"},
        "levels": {"r1": 1008.0, "r2": 1018.0, "r3": 1025.0, "s1": 988.0, "s2": 980.0, "liquidity": 978.0},
        "risk_pct": 0.85,
        "rr_ratio": "1:2.8",
        "conviction": "B (Moderate)",
        "vwap": 998.50,
        "rule": "RANGE BOUND",
        "sparkline": [995, 998, 1000, 999, 1002, 1001, 1000],
        "candles": generate_mini_candles(price, "BULL", 20)
    }
