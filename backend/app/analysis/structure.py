from typing import List, Tuple, Literal
from app.models.schemas import Candle, SwingPoint, StructureEvent, EngineConfig

def detect_swings(candles: List[Candle], config: EngineConfig) -> List[SwingPoint]:
    """
    Detects confirmed swing highs and lows using configurable left and right bars.
    CRITICAL: To eliminate lookahead bias, a swing at index `i` is only confirmed
    when candle `i + config.swing_right` has fully closed.
    """
    swings: List[SwingPoint] = []
    n = len(candles)
    left = config.swing_left
    right = config.swing_right

    if n < left + right + 1:
        return swings

    for i in range(left, n - right):
        curr_high = candles[i].high
        curr_low = candles[i].low

        # Check Swing High
        is_high = True
        for l in range(1, left + 1):
            if candles[i - l].high >= curr_high:
                is_high = False
                break
        if is_high:
            for r in range(1, right + 1):
                if candles[i + r].high >= curr_high:
                    is_high = False
                    break

        if is_high:
            conf_idx = i + right
            swings.append(SwingPoint(
                index=i,
                timestamp=candles[i].timestamp,
                type="high",
                price=curr_high,
                confirmed_index=conf_idx,
                confirmed_time=candles[conf_idx].timestamp
            ))

        # Check Swing Low
        is_low = True
        for l in range(1, left + 1):
            if candles[i - l].low <= curr_low:
                is_low = False
                break
        if is_low:
            for r in range(1, right + 1):
                if candles[i + r].low <= curr_low:
                    is_low = False
                    break

        if is_low:
            conf_idx = i + right
            swings.append(SwingPoint(
                index=i,
                timestamp=candles[i].timestamp,
                type="low",
                price=curr_low,
                confirmed_index=conf_idx,
                confirmed_time=candles[conf_idx].timestamp
            ))

    # Sort swings by index
    swings.sort(key=lambda s: s.index)
    return swings


def detect_structure_events(candles: List[Candle], swings: List[SwingPoint], config: EngineConfig) -> Tuple[List[StructureEvent], str]:
    """
    Evaluates market structure chronologically:
    Identifies Break of Structure (BOS) and Change of Character (CHoCH).
    Only utilizes swings that were already confirmed at the time of evaluation.
    Returns (structure_events, current_market_trend).
    """
    events: List[StructureEvent] = []
    n = len(candles)
    if not swings or n == 0:
        return events, "NEUTRAL"

    # Track active swings and current structural trend
    last_confirmed_high: SwingPoint | None = None
    last_confirmed_low: SwingPoint | None = None
    current_trend: Literal["BULLISH", "BEARISH", "NEUTRAL"] = "NEUTRAL"
    broken_swings = set()

    for j in range(n):
        c = candles[j]

        # Update available confirmed swings up to candle j
        for s in swings:
            if s.confirmed_index == j:
                if s.type == "high":
                    last_confirmed_high = s
                elif s.type == "low":
                    last_confirmed_low = s

        # Evaluate potential Bullish break above confirmed swing high
        if last_confirmed_high and last_confirmed_high.index not in broken_swings:
            break_price = c.close if config.break_confirmation == "close" else c.high
            if break_price > last_confirmed_high.price:
                # Break occurred!
                is_choch = (current_trend == "BEARISH")
                event_type = "bullish_choch" if is_choch else "bullish_bos"
                
                events.append(StructureEvent(
                    id=f"{event_type}-{j}-{c.timestamp}",
                    type=event_type,
                    price=round(break_price, 2),
                    broken_swing_price=last_confirmed_high.price,
                    event_index=j,
                    event_time=c.timestamp,
                    confirmation_index=j,
                    confirmation_time=c.timestamp
                ))
                broken_swings.add(last_confirmed_high.index)
                current_trend = "BULLISH"

        # Evaluate potential Bearish break below confirmed swing low
        if last_confirmed_low and last_confirmed_low.index not in broken_swings:
            break_price = c.close if config.break_confirmation == "close" else c.low
            if break_price < last_confirmed_low.price:
                # Break occurred!
                is_choch = (current_trend == "BULLISH")
                event_type = "bearish_choch" if is_choch else "bearish_bos"

                events.append(StructureEvent(
                    id=f"{event_type}-{j}-{c.timestamp}",
                    type=event_type,
                    price=round(break_price, 2),
                    broken_swing_price=last_confirmed_low.price,
                    event_index=j,
                    event_time=c.timestamp,
                    confirmation_index=j,
                    confirmation_time=c.timestamp
                ))
                broken_swings.add(last_confirmed_low.index)
                current_trend = "BEARISH"

    return events, current_trend
