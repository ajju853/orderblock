from typing import List, Optional
from app.models.schemas import Candle, EngineConfig, AnalysisResult
from app.analysis.structure import detect_swings, detect_structure_events
from app.analysis.order_blocks import detect_and_track_order_blocks
from app.analysis.fvg import detect_and_track_fvgs
from app.analysis.liquidity import detect_liquidity_pools
from app.analysis.scoring import calculate_setup_score

def run_analysis(
    candles: List[Candle],
    symbol: str = "NIFTY 50",
    timeframe: str = "15m",
    config: Optional[EngineConfig] = None
) -> AnalysisResult:
    """
    Executes the full deterministic market analysis pipeline:
    1. Swing highs & lows (with zero lookahead bias)
    2. BOS and CHoCH structural break events
    3. Bullish/Bearish Order Block detection & lifecycle state tracking
    4. Fair Value Gaps (FVG) and fill tracking
    5. Liquidity pools (EQH/EQL) and sweeps
    6. Multi-factor rule-based setup scoring
    """
    if config is None:
        config = EngineConfig()

    if not candles:
        from app.models.schemas import SetupScore
        return AnalysisResult(
            symbol=symbol,
            timeframe=timeframe,
            total_candles=0,
            latest_price=0.0,
            trend="NEUTRAL",
            candles=[],
            swings=[],
            structure_events=[],
            order_blocks=[],
            fvgs=[],
            liquidity_levels=[],
            score=SetupScore(overall_score=0, direction="NEUTRAL", factors={}, rationale="No data"),
            config=config
        )

    # 1. Detect Swings
    swings = detect_swings(candles, config)

    # 2. Detect BOS & CHoCH Market Structure Events
    structure_events, trend = detect_structure_events(candles, swings, config)

    # 3. Detect & Track Order Blocks
    order_blocks = detect_and_track_order_blocks(candles, structure_events, config)

    # 4. Fair Value Gaps
    fvgs = detect_and_track_fvgs(candles)

    # 5. Liquidity Pools
    liquidity_levels = detect_liquidity_pools(candles, swings)

    # 6. Scoring
    score = calculate_setup_score(candles, trend, order_blocks, fvgs)

    latest_price = candles[-1].close if candles else 0.0

    return AnalysisResult(
        symbol=symbol,
        timeframe=timeframe,
        total_candles=len(candles),
        latest_price=round(latest_price, 2),
        trend=trend,
        candles=candles,
        swings=swings,
        structure_events=structure_events,
        order_blocks=order_blocks,
        fvgs=fvgs,
        liquidity_levels=liquidity_levels,
        score=score,
        config=config
    )
