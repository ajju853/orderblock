from typing import Dict, List, Any
from app.models.schemas import Candle, EngineConfig
from app.analysis.engine import run_analysis
from app.data.storage import store

def analyze_multi_timeframe(symbol: str, timeframes: List[str] = None) -> Dict[str, Any]:
    """
    Evaluates multi-timeframe market structure alignment and zone confluence
    across multiple timeframes (e.g., 5m, 15m, 1h, 1d).
    Determines institutional POI overlaps and overall MTF directional bias.
    """
    if timeframes is None:
        timeframes = ["5m", "15m", "1h", "1d"]

    tf_results: Dict[str, Any] = {}
    aligned_trends: List[str] = []
    all_active_obs: List[Dict[str, Any]] = []

    for tf in timeframes:
        candles = store.get_candles(symbol, tf)
        if not candles or len(candles) < 10:
            # If sub-timeframe not stored directly, use available candles with sample notice
            candles = store.get_candles(symbol, "15m")
            if not candles:
                continue

        res = run_analysis(candles, symbol=symbol, timeframe=tf)
        bullish_active = [z for z in res.order_blocks if z.type == "bullish" and z.status in ["fresh", "tested"]]
        bearish_active = [z for z in res.order_blocks if z.type == "bearish" and z.status in ["fresh", "tested"]]

        for ob in bullish_active + bearish_active:
            all_active_obs.append({
                "timeframe": tf,
                "type": ob.type,
                "low": ob.low,
                "high": ob.high,
                "eq_price": ob.eq_price,
                "status": ob.status
            })

        tf_results[tf] = {
            "trend": res.trend,
            "candles_count": len(candles),
            "score": res.score.overall_score,
            "latest_price": res.latest_price,
            "active_bullish_obs": len(bullish_active),
            "active_bearish_obs": len(bearish_active),
            "last_timestamp": candles[-1].timestamp if candles else None
        }
        aligned_trends.append(res.trend)

    # Calculate MTF alignment strength
    bull_count = aligned_trends.count("BULLISH")
    bear_count = aligned_trends.count("BEARISH")
    total_evaluated = len(aligned_trends) or 1

    if bull_count > total_evaluated / 2:
        overall_bias = "STRONG_BULLISH" if bull_count == total_evaluated else "BULLISH"
        confluence_score = int((bull_count / total_evaluated) * 100)
    elif bear_count > total_evaluated / 2:
        overall_bias = "STRONG_BEARISH" if bear_count == total_evaluated else "BEARISH"
        confluence_score = int((bear_count / total_evaluated) * 100)
    else:
        overall_bias = "MIXED_NEUTRAL"
        confluence_score = 40

    # Identify POI Overlaps (zones across timeframes that share price ranges)
    confluence_zones = []
    for i in range(len(all_active_obs)):
        for j in range(i + 1, len(all_active_obs)):
            z1 = all_active_obs[i]
            z2 = all_active_obs[j]
            if z1["timeframe"] != z2["timeframe"] and z1["type"] == z2["type"]:
                overlap_low = max(z1["low"], z2["low"])
                overlap_high = min(z1["high"], z2["high"])
                if overlap_low <= overlap_high:
                    confluence_zones.append({
                        "type": z1["type"],
                        "overlap_low": round(overlap_low, 2),
                        "overlap_high": round(overlap_high, 2),
                        "tfs": [z1["timeframe"], z2["timeframe"]],
                        "strength": "HIGH_CONFLUENCE"
                    })

    return {
        "symbol": symbol,
        "overall_bias": overall_bias,
        "confluence_score": confluence_score,
        "timeframe_breakdown": tf_results,
        "confluence_zones": confluence_zones[:6] # Top confluence POIs
    }
