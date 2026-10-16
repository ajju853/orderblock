from typing import List, Dict
from app.models.schemas import (
    Candle, OrderBlockZone, FVGZone, SetupScore
)

def calculate_setup_score(
    candles: List[Candle],
    trend: str,
    order_blocks: List[OrderBlockZone],
    fvgs: List[FVGZone]
) -> SetupScore:
    """
    Computes a transparent, rule-based setup score (0-100).
    Evaluates market trend alignment, order block freshness, FVG confluence,
    displacement strength, and current price proximity.
    """
    if not candles:
        return SetupScore(overall_score=0, direction="NEUTRAL", factors={}, rationale="No candle data available.")

    latest_close = candles[-1].close
    factors: Dict[str, float] = {
        "trend_alignment": 0.0,
        "ob_freshness": 0.0,
        "fvg_confluence": 0.0,
        "displacement_strength": 0.0,
        "proximity": 0.0
    }

    # 1. Trend alignment (max 25 pts)
    if trend == "BULLISH":
        factors["trend_alignment"] = 25.0
    elif trend == "BEARISH":
        factors["trend_alignment"] = 25.0
    else:
        factors["trend_alignment"] = 10.0

    # 2. OB Freshness & Quality (max 30 pts)
    active_obs = [ob for ob in order_blocks if ob.status in ["fresh", "tested"]]
    if active_obs:
        # Check nearest active OB aligned with trend
        aligned_obs = [ob for ob in active_obs if (trend == "BULLISH" and ob.type == "bullish") or (trend == "BEARISH" and ob.type == "bearish")]
        target_ob = aligned_obs[-1] if aligned_obs else active_obs[-1]
        
        if target_ob.status == "fresh":
            factors["ob_freshness"] = 30.0
        elif target_ob.status == "tested":
            factors["ob_freshness"] = 18.0

        # 3. Displacement strength from OB (max 15 pts)
        factors["displacement_strength"] = min(15.0, target_ob.displacement_pct * 5.0)

        # 4. Proximity to current price (max 15 pts)
        # Closer to zone = higher immediate trade score
        dist_pct = abs(latest_close - target_ob.eq_price) / target_ob.eq_price * 100
        if dist_pct <= 0.5:
            factors["proximity"] = 15.0
        elif dist_pct <= 1.5:
            factors["proximity"] = 10.0
        elif dist_pct <= 3.0:
            factors["proximity"] = 5.0
        else:
            factors["proximity"] = 2.0
    else:
        factors["ob_freshness"] = 0.0
        factors["displacement_strength"] = 0.0
        factors["proximity"] = 0.0

    # 5. FVG Confluence (max 15 pts)
    open_fvgs = [f for f in fvgs if f.status in ["open", "mitigated"]]
    if open_fvgs:
        factors["fvg_confluence"] = 15.0

    total_score = int(min(100.0, round(sum(factors.values()))))

    direction = "NEUTRAL"
    if trend == "BULLISH" and total_score >= 45:
        direction = "BULLISH"
    elif trend == "BEARISH" and total_score >= 45:
        direction = "BEARISH"

    rationale_parts = []
    if trend != "NEUTRAL":
        rationale_parts.append(f"Market structure is {trend}")
    if active_obs:
        rationale_parts.append(f"{len(active_obs)} active valid Order Block(s) identified")
    if open_fvgs:
        rationale_parts.append(f"{len(open_fvgs)} open FVG imbalance(s) provide confluence")

    rationale = ". ".join(rationale_parts) if rationale_parts else "Market consolidating; awaiting clear structural break."

    return SetupScore(
        overall_score=total_score,
        direction=direction,
        factors=factors,
        rationale=rationale
    )
