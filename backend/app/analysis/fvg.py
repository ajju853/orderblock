from typing import List
from app.models.schemas import Candle, FVGZone

def detect_and_track_fvgs(candles: List[Candle], min_gap_pct: float = 0.05) -> List[FVGZone]:
    """
    Detects Fair Value Gaps using the classic 3-candle imbalance rule:
    - Bullish FVG: Candle[i].low > Candle[i-2].high
    - Bearish FVG: Candle[i].high < Candle[i-2].low
    Tracks subsequent fill percentage and status (open, mitigated, filled).
    """
    fvgs: List[FVGZone] = []
    n = len(candles)
    if n < 3:
        return fvgs

    for i in range(2, n):
        c0 = candles[i - 2]
        c1 = candles[i - 1]
        c2 = candles[i]

        # Bullish FVG: Low of candle 2 is above High of candle 0
        if c2.low > c0.high:
            gap_size = c2.low - c0.high
            gap_pct = (gap_size / (c1.close + 1e-6)) * 100
            if gap_pct >= min_gap_pct:
                fvg_low = c0.high
                fvg_high = c2.low

                # Track forward fill
                max_penetration = 0.0
                status = "open"

                for t in range(i + 1, n):
                    test_c = candles[t]
                    if test_c.low < fvg_high:
                        penetration = min(gap_size, fvg_high - test_c.low)
                        max_penetration = max(max_penetration, penetration)

                    if test_c.close < fvg_low:
                        max_penetration = gap_size
                        status = "filled"
                        break

                fill_pct = min(100.0, round((max_penetration / gap_size) * 100.0, 1))
                if fill_pct >= 100.0:
                    status = "filled"
                elif fill_pct > 0.0:
                    status = "mitigated"

                fvgs.append(FVGZone(
                    id=f"fvg-bull-{i}-{c2.timestamp.replace(' ', '_')}",
                    type="bullish",
                    low=round(fvg_low, 2),
                    high=round(fvg_high, 2),
                    candle_index=i,
                    detected_at=c2.timestamp,
                    status=status,
                    fill_pct=fill_pct
                ))

        # Bearish FVG: High of candle 2 is below Low of candle 0
        elif c2.high < c0.low:
            gap_size = c0.low - c2.high
            gap_pct = (gap_size / (c1.close + 1e-6)) * 100
            if gap_pct >= min_gap_pct:
                fvg_low = c2.high
                fvg_high = c0.low

                max_penetration = 0.0
                status = "open"

                for t in range(i + 1, n):
                    test_c = candles[t]
                    if test_c.high > fvg_low:
                        penetration = min(gap_size, test_c.high - fvg_low)
                        max_penetration = max(max_penetration, penetration)

                    if test_c.close > fvg_high:
                        max_penetration = gap_size
                        status = "filled"
                        break

                fill_pct = min(100.0, round((max_penetration / gap_size) * 100.0, 1))
                if fill_pct >= 100.0:
                    status = "filled"
                elif fill_pct > 0.0:
                    status = "mitigated"

                fvgs.append(FVGZone(
                    id=f"fvg-bear-{i}-{c2.timestamp.replace(' ', '_')}",
                    type="bearish",
                    low=round(fvg_low, 2),
                    high=round(fvg_high, 2),
                    candle_index=i,
                    detected_at=c2.timestamp,
                    status=status,
                    fill_pct=fill_pct
                ))

    return fvgs
