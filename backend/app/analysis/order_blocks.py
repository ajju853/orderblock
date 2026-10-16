from typing import List, Optional
import numpy as np
from app.models.schemas import Candle, StructureEvent, OrderBlockZone, EngineConfig

def calculate_atr(candles: List[Candle], period: int = 14) -> List[float]:
    """Calculates Average True Range (ATR) across the candle series."""
    n = len(candles)
    if n == 0:
        return []
    atrs = [candles[0].high - candles[0].low]
    for i in range(1, n):
        tr = max(
            candles[i].high - candles[i].low,
            abs(candles[i].high - candles[i - 1].close),
            abs(candles[i].low - candles[i - 1].close)
        )
        atrs.append((atrs[-1] * (period - 1) + tr) / period)
    return atrs

def detect_and_track_order_blocks(
    candles: List[Candle],
    structure_events: List[StructureEvent],
    config: EngineConfig
) -> List[OrderBlockZone]:
    """
    Detects candidate Order Blocks following confirmed BOS / CHoCH events,
    and tracks their lifecycle states (FRESH -> TESTED -> MITIGATED -> INVALIDATED)
    in chronological sequence without future-data leakage.
    """
    n = len(candles)
    if n < 5 or not structure_events:
        return []

    atrs = calculate_atr(candles, period=14)
    order_blocks: List[OrderBlockZone] = []
    seen_sources = set()

    for event in structure_events:
        break_idx = event.event_index
        if break_idx >= n:
            continue

        is_bullish = "bullish" in event.type
        lookback = min(30, break_idx)

        # 1. Search backward from structure break to identify origin & last opposite candle
        source_idx: Optional[int] = None

        if is_bullish:
            # Bullish OB: search for last bearish candle (close < open) prior to the rally
            for k in range(break_idx - 1, break_idx - lookback - 1, -1):
                if k < 0:
                    break
                if candles[k].close < candles[k].open:
                    source_idx = k
                    break
        else:
            # Bearish OB: search for last bullish candle (close > open) prior to the drop
            for k in range(break_idx - 1, break_idx - lookback - 1, -1):
                if k < 0:
                    break
                if candles[k].close > candles[k].open:
                    source_idx = k
                    break

        if source_idx is None or source_idx in seen_sources:
            continue

        src_candle = candles[source_idx]
        seen_sources.add(source_idx)

        # 2. Determine Zone Boundaries
        if config.zone_boundary == "body":
            zone_low = min(src_candle.open, src_candle.close)
            zone_high = max(src_candle.open, src_candle.close)
        else:
            zone_low = src_candle.low
            zone_high = src_candle.high

        if zone_high <= zone_low:
            zone_high = zone_low + 0.01

        eq_price = round((zone_low + zone_high) / 2.0, 2)

        # 3. Check Displacement Strength
        atr_val = atrs[break_idx] if break_idx < len(atrs) else (src_candle.high - src_candle.low)
        move_size = abs(event.price - (src_candle.low if is_bullish else src_candle.high))
        displacement_pct = round((move_size / (src_candle.close + 1e-6)) * 100, 2)

        # Filter out if move is smaller than displacement requirement
        if move_size < (atr_val * config.displacement_multiplier * 0.75):
            continue

        # 4. Track Lifecycle from detection candle (break_idx) forward to latest candle
        status: str = "fresh"
        test_count = 0
        mitigation_time: Optional[str] = None
        invalidation_time: Optional[str] = None

        for t in range(break_idx + 1, n):
            c_test = candles[t]

            # Invalidation Check:
            # Bullish OB invalidated if price closes below zone_low
            # Bearish OB invalidated if price closes above zone_high
            if is_bullish:
                if c_test.close < zone_low:
                    status = "invalidated"
                    invalidation_time = c_test.timestamp
                    break
            else:
                if c_test.close > zone_high:
                    status = "invalidated"
                    invalidation_time = c_test.timestamp
                    break

            # Test & Mitigation Check
            in_zone = (c_test.low <= zone_high and c_test.high >= zone_low)
            if in_zone:
                test_count += 1
                if status == "fresh":
                    status = "tested"

                # Mitigation reached when price touches equilibrium (50%)
                if is_bullish and c_test.low <= eq_price:
                    status = "mitigated"
                    if not mitigation_time:
                        mitigation_time = c_test.timestamp
                elif not is_bullish and c_test.high >= eq_price:
                    status = "mitigated"
                    if not mitigation_time:
                        mitigation_time = c_test.timestamp

        ob_id = f"ob-{'bull' if is_bullish else 'bear'}-{source_idx}-{src_candle.timestamp.replace(' ', '_')}"
        order_blocks.append(OrderBlockZone(
            id=ob_id,
            type="bullish" if is_bullish else "bearish",
            low=round(zone_low, 2),
            high=round(zone_high, 2),
            eq_price=eq_price,
            source_candle_index=source_idx,
            source_candle_time=src_candle.timestamp,
            detected_index=break_idx,
            detected_at=event.confirmation_time,
            status=status,
            test_count=test_count,
            mitigation_time=mitigation_time,
            invalidation_time=invalidation_time,
            displacement_pct=displacement_pct
        ))

    return order_blocks
