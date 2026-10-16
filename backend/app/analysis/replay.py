from typing import Dict, Any, List
from app.models.schemas import Candle, EngineConfig, AnalysisResult
from app.analysis.engine import run_analysis
from app.data.storage import store

def get_replay_snapshot(symbol: str, timeframe: str, step_index: int, config: EngineConfig = None) -> Dict[str, Any]:
    """
    Returns the market structure state at a historical point in time.
    Guarantees zero future data leakage: only candles up to `step_index`
    are analyzed and revealed to the user.
    """
    candles = store.get_candles(symbol, timeframe)
    if not candles:
        return {"error": "Symbol not found"}

    total_candles = len(candles)
    clamped_index = max(10, min(total_candles - 1, step_index))

    # Past-only window
    past_candles = candles[:clamped_index + 1]
    res = run_analysis(past_candles, symbol=symbol, timeframe=timeframe, config=config)

    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "current_step": clamped_index,
        "total_steps": total_candles,
        "timestamp": past_candles[-1].timestamp,
        "latest_candle": past_candles[-1].model_dump(),
        "analysis": res.model_dump()
    }
