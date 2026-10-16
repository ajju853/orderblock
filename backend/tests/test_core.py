import pytest
from app.models.schemas import Candle, EngineConfig
from app.analysis.structure import detect_swings, detect_structure_events
from app.analysis.order_blocks import detect_and_track_order_blocks
from app.analysis.fvg import detect_and_track_fvgs
from app.analysis.scoring import calculate_setup_score
from app.analysis.engine import run_analysis

def make_test_candles():
    """Builds a deterministic synthetic sequence of 30 candles with a clear swing low, swing high, and breakout."""
    candles = []
    # Base downtrend from 100 to 90
    prices = [100, 98, 96, 94, 93, 91, 90, 92, 95, 96, 95, 94, 93, 92, 93, 97, 99, 102, 104, 105, 103, 102, 98, 97, 96, 98, 101, 103, 106, 108]
    for i, p in enumerate(prices):
        candles.append(Candle(
            timestamp=f"2026-10-16 09:{i:02d}:00",
            open=float(p),
            high=float(p + 1.0),
            low=float(p - 1.0),
            close=float(p + 0.5 if i % 2 == 0 else p - 0.5),
            volume=1000.0
        ))
    return candles

def test_swing_detection_no_lookahead():
    candles = make_test_candles()
    config = EngineConfig(swing_left=2, swing_right=2)
    swings = detect_swings(candles, config)
    assert len(swings) > 0
    # Every swing's confirmed_index must be >= index + swing_right
    for s in swings:
        assert s.confirmed_index == s.index + config.swing_right

def test_structure_events_bos():
    candles = make_test_candles()
    config = EngineConfig(swing_left=2, swing_right=2, break_confirmation="close")
    swings = detect_swings(candles, config)
    events, trend = detect_structure_events(candles, swings, config)
    assert isinstance(events, list)
    assert trend in ["BULLISH", "BEARISH", "NEUTRAL"]

def test_order_block_detection():
    candles = make_test_candles()
    config = EngineConfig(swing_left=2, swing_right=2, displacement_multiplier=0.5)
    swings = detect_swings(candles, config)
    events, trend = detect_structure_events(candles, swings, config)
    obs = detect_and_track_order_blocks(candles, events, config)
    # Validate order block properties
    for ob in obs:
        assert ob.low <= ob.high
        assert ob.status in ["fresh", "tested", "mitigated", "invalidated"]
        assert ob.eq_price == round((ob.low + ob.high) / 2.0, 2)

def test_fvg_detection():
    candles = [
        Candle(timestamp="2026-10-16 09:00:00", open=100, high=102, low=99, close=101, volume=100),
        Candle(timestamp="2026-10-16 09:01:00", open=101, high=107, low=100.5, close=106, volume=500), # Big green expansion
        Candle(timestamp="2026-10-16 09:02:00", open=106, high=110, low=104, close=109, volume=300), # Low 104 > High 102
    ]
    fvgs = detect_and_track_fvgs(candles, min_gap_pct=0.01)
    assert len(fvgs) == 1
    assert fvgs[0].type == "bullish"
    assert fvgs[0].low == 102
    assert fvgs[0].high == 104

def test_full_analysis_engine():
    candles = make_test_candles()
    res = run_analysis(candles, symbol="TEST", timeframe="1m")
    assert res.total_candles == len(candles)
    assert 0 <= res.score.overall_score <= 100
    assert res.trend in ["BULLISH", "BEARISH", "NEUTRAL"]
