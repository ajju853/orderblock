from typing import List, Optional
from app.models.schemas import Candle, SwingPoint, LiquidityLevel

def detect_liquidity_pools(candles: List[Candle], swings: List[SwingPoint], tolerance_pct: float = 0.15) -> List[LiquidityLevel]:
    """
    Identifies Equal Highs (EQH) and Equal Lows (EQL) clusters from swing points.
    Checks if subsequently swept by a wick and reclaimed.
    """
    levels: List[LiquidityLevel] = []
    n = len(candles)
    if not swings or n == 0:
        return levels

    high_swings = [s for s in swings if s.type == "high"]
    low_swings = [s for s in swings if s.type == "low"]

    # 1. Cluster high swings for EQH
    used_highs = set()
    for i, s1 in enumerate(high_swings):
        if i in used_highs:
            continue
        cluster = [s1]
        for j in range(i + 1, len(high_swings)):
            s2 = high_swings[j]
            diff_pct = abs(s2.price - s1.price) / s1.price * 100
            if diff_pct <= tolerance_pct:
                cluster.append(s2)
                used_highs.add(j)

        if len(cluster) >= 2:
            avg_price = round(sum(s.price for s in cluster) / len(cluster), 2)
            max_conf_idx = max(s.confirmed_index for s in cluster)
            
            # Check if swept
            status = "active"
            swept_time: Optional[str] = None
            for t in range(max_conf_idx + 1, n):
                if candles[t].high > avg_price:
                    status = "swept"
                    swept_time = candles[t].timestamp
                    break

            levels.append(LiquidityLevel(
                id=f"eqh-{cluster[0].index}-{cluster[-1].index}",
                type="EQH",
                price=avg_price,
                count=len(cluster),
                candle_indices=[s.index for s in cluster],
                status=status,
                swept_time=swept_time
            ))

    # 2. Cluster low swings for EQL
    used_lows = set()
    for i, s1 in enumerate(low_swings):
        if i in used_lows:
            continue
        cluster = [s1]
        for j in range(i + 1, len(low_swings)):
            s2 = low_swings[j]
            diff_pct = abs(s2.price - s1.price) / s1.price * 100
            if diff_pct <= tolerance_pct:
                cluster.append(s2)
                used_lows.add(j)

        if len(cluster) >= 2:
            avg_price = round(sum(s.price for s in cluster) / len(cluster), 2)
            max_conf_idx = max(s.confirmed_index for s in cluster)

            status = "active"
            swept_time: Optional[str] = None
            for t in range(max_conf_idx + 1, n):
                if candles[t].low < avg_price:
                    status = "swept"
                    swept_time = candles[t].timestamp
                    break

            levels.append(LiquidityLevel(
                id=f"eql-{cluster[0].index}-{cluster[-1].index}",
                type="EQL",
                price=avg_price,
                count=len(cluster),
                candle_indices=[s.index for s in cluster],
                status=status,
                swept_time=swept_time
            ))

    return levels
