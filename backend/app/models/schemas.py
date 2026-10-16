from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

class Candle(BaseModel):
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0

class SwingPoint(BaseModel):
    index: int
    timestamp: str
    type: Literal["high", "low"]
    price: float
    confirmed_index: int
    confirmed_time: str

class StructureEvent(BaseModel):
    id: str
    type: Literal["bullish_bos", "bearish_bos", "bullish_choch", "bearish_choch"]
    price: float
    broken_swing_price: float
    event_index: int
    event_time: str
    confirmation_index: int
    confirmation_time: str

class OrderBlockZone(BaseModel):
    id: str
    type: Literal["bullish", "bearish"]
    low: float
    high: float
    eq_price: float # 50% equilibrium level
    source_candle_index: int
    source_candle_time: str
    detected_index: int
    detected_at: str
    status: Literal["fresh", "tested", "mitigated", "invalidated"]
    test_count: int = 0
    mitigation_time: Optional[str] = None
    invalidation_time: Optional[str] = None
    displacement_pct: float = 0.0

class FVGZone(BaseModel):
    id: str
    type: Literal["bullish", "bearish"]
    low: float
    high: float
    candle_index: int
    detected_at: str
    status: Literal["open", "mitigated", "filled"]
    fill_pct: float = 0.0

class LiquidityLevel(BaseModel):
    id: str
    type: Literal["EQH", "EQL"]
    price: float
    count: int
    candle_indices: List[int]
    status: Literal["active", "swept"]
    swept_time: Optional[str] = None

class SetupScore(BaseModel):
    overall_score: int # 0-100
    direction: Literal["BULLISH", "BEARISH", "NEUTRAL"]
    factors: Dict[str, float]
    rationale: str

class EngineConfig(BaseModel):
    swing_left: int = 3
    swing_right: int = 3
    break_confirmation: Literal["close", "wick"] = "close"
    zone_boundary: Literal["wick", "body"] = "wick"
    displacement_multiplier: float = 1.0 # Minimum displacement move
    mitigation_threshold: float = 0.5 # 50% fill for mitigation
    fvg_confirmation: bool = False

class AnalysisResult(BaseModel):
    symbol: str
    timeframe: str
    data_source: str = "CSV"
    total_candles: int
    latest_price: float
    trend: Literal["BULLISH", "BEARISH", "NEUTRAL", "SIDEWAYS"]
    candles: List[Candle]
    swings: List[SwingPoint]
    structure_events: List[StructureEvent]
    order_blocks: List[OrderBlockZone]
    fvgs: List[FVGZone]
    liquidity_levels: List[LiquidityLevel]
    score: SetupScore
    config: EngineConfig

class DataImportSummary(BaseModel):
    filename: str
    total_rows: int
    accepted_rows: int
    rejected_rows: int
    errors: List[str]
    symbol: str
    timeframe: str

class AIChatRequest(BaseModel):
    symbol: str
    timeframe: str
    selected_zone_id: Optional[str] = None
    question: str
    language: Literal["en", "hi", "hinglish"] = "hinglish"
    model: Optional[str] = "qwen3:8b-fast"

class AIChatResponse(BaseModel):
    reply: str
    model_used: str
    structured_context: Dict[str, Any]
    execution_time_ms: float

class ScannerItem(BaseModel):
    symbol: str
    timeframe: str
    latest_price: float
    trend: str
    overall_score: int
    direction: str
    active_bullish_obs: int
    active_bearish_obs: int
    nearest_ob_distance_pct: Optional[float]
    status_summary: str
