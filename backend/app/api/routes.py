import os
import httpx
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from typing import Optional, List, Dict, Any
from app.models.schemas import (
    AnalysisResult, EngineConfig, DataImportSummary,
    AIChatRequest, AIChatResponse, ScannerItem
)
from app.data.storage import store
from app.analysis.candles import validate_and_parse_csv
from app.analysis.engine import run_analysis
from app.analysis.mtf import analyze_multi_timeframe
from app.analysis.breadth import get_market_breadth_and_sectors, calculate_premium_discount
from app.analysis.replay import get_replay_snapshot
from app.backtesting.engine import BacktestRequest, BacktestResult, run_backtest_simulation
from app.paper_trading.portfolio import paper_manager, PaperOrderRequest
from app.options.analytics import generate_option_chain, calculate_strategy_payoff
from app.journal.journal_service import journal_manager, JournalEntry
from app.ai.ollama_service import query_ollama, OLLAMA_BASE_URL
from app.providers.manager import market_data_manager
from app.analysis.orderblock_app import get_orderblock_terminal_data, get_stock_detail

router = APIRouter()

# ----------------- SYSTEM & PROVIDERS -----------------
@router.get("/health")
async def health_check():
    """Returns system status, active instruments, and Ollama connection status."""
    ollama_ok = False
    models = []
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if res.status_code == 200:
                ollama_ok = True
                models = [m.get("name") for m in res.json().get("models", [])]
    except Exception:
        ollama_ok = False

    return {
        "status": "healthy",
        "service": "BlockMind AI Core",
        "version": "1.0.0",
        "active_provider": market_data_manager.active_provider_key,
        "ollama_connected": ollama_ok,
        "available_models": models,
        "instruments_loaded": len(store.list_instruments())
    }

@router.get("/providers/status")
async def get_providers_status():
    """Returns diagnostics and capabilities for all pluggable market data adapters."""
    health_list = await market_data_manager.get_all_providers_health()
    return {
        "active_provider": market_data_manager.active_provider_key,
        "providers": [h.model_dump() for h in health_list]
    }

@router.post("/providers/active")
async def set_active_provider(provider_key: str = Query(..., description="Provider key e.g. YFINANCE, LOCAL_CSV, ALPHA_VANTAGE, INDIAN_STOCK_API")):
    """Switches active market data provider dynamically."""
    success = market_data_manager.set_active_provider(provider_key)
    if not success:
        raise HTTPException(status_code=400, detail=f"Unknown provider key '{provider_key}'. Valid: {list(market_data_manager.providers.keys())}")
    return {"success": True, "active_provider": market_data_manager.active_provider_key}

@router.get("/market/quote")
async def get_market_quote(symbol: str = Query("NIFTY 50")):
    """Fetches quote from active provider with automated fallback cascade and data provenance."""
    return await market_data_manager.get_quote_with_fallback(symbol)

@router.post("/market/batch-quotes")
async def get_batch_market_quotes(symbols: List[str]):
    """Fetches quotes for multiple symbols."""
    quotes = await market_data_manager.get_batch_quotes(symbols)
    return {"quotes": [q.model_dump() for q in quotes]}

@router.get("/market/search")
async def search_market_symbols(q: str = Query(..., description="Search keyword")):
    """Searches instruments across provider universe and local cache."""
    results = await market_data_manager.search_symbols(q)
    return {"results": [r.model_dump() for r in results]}

@router.post("/market/sync-candles")
async def sync_remote_candles(
    symbol: str = Query(..., description="Symbol"),
    timeframe: str = Query("15m", description="Timeframe"),
    lookback: int = Query(150, description="Lookback bars")
):
    """Fetches candles from remote provider and syncs into local engine store."""
    return await market_data_manager.fetch_and_sync_candles(symbol, timeframe, lookback)

@router.get("/instruments")
async def get_instruments():
    """Lists all available instruments."""
    return store.list_instruments()

@router.get("/candles")
async def get_candles(symbol: str = Query(..., description="Symbol name"), timeframe: str = Query("15m")):
    """Returns historical candles for an instrument."""
    candles = store.get_candles(symbol, timeframe)
    if not candles:
        candles = store.get_candles("NIFTY 50", "15m")
    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "count": len(candles),
        "candles": candles
    }

@router.post("/data/import")
async def import_csv_data(
    file: UploadFile = File(...),
    symbol: Optional[str] = Form(None),
    timeframe: Optional[str] = Form("15m")
):
    """Uploads and validates a CSV file containing market candles."""
    content = await file.read()
    assigned_symbol = symbol.strip().upper() if symbol and symbol.strip() else file.filename.replace(".csv", "").upper()
    assigned_tf = timeframe if timeframe else "15m"

    candles, summary = validate_and_parse_csv(
        file_bytes=content,
        filename=file.filename,
        default_symbol=assigned_symbol,
        default_tf=assigned_tf
    )

    if candles:
        store.save_candles(assigned_symbol, assigned_tf, candles)

    return {
        "success": len(candles) > 0,
        "summary": summary,
        "symbol": assigned_symbol,
        "timeframe": assigned_tf
    }

@router.post("/analysis/run", response_model=AnalysisResult)
async def run_market_analysis(
    symbol: str = Query(..., description="Symbol"),
    timeframe: str = Query("15m", description="Timeframe"),
    config: Optional[EngineConfig] = None
):
    """Executes the deterministic order block and market structure analysis."""
    candles = store.get_candles(symbol, timeframe)
    if not candles:
        candles = store.get_candles("NIFTY 50", "15m")
        symbol = "NIFTY 50"

    result = run_analysis(candles, symbol=symbol, timeframe=timeframe, config=config)
    return result

@router.post("/scanner/run", response_model=List[ScannerItem])
async def run_market_scanner(config: Optional[EngineConfig] = None):
    """Scans all available instruments and ranks setups by score."""
    instruments = store.list_instruments()
    scanner_results: List[ScannerItem] = []

    for inst in instruments:
        sym = inst["symbol"]
        tf = inst.get("default_tf", "15m")
        candles = store.get_candles(sym, tf)
        if not candles or len(candles) < 20:
            continue

        res = run_analysis(candles, symbol=sym, timeframe=tf, config=config)
        bullish_active = [z for z in res.order_blocks if z.type == "bullish" and z.status in ["fresh", "tested"]]
        bearish_active = [z for z in res.order_blocks if z.type == "bearish" and z.status in ["fresh", "tested"]]
        all_active = bullish_active + bearish_active
        nearest_dist: Optional[float] = None
        if all_active and res.latest_price > 0:
            distances = [abs(res.latest_price - z.eq_price) / res.latest_price * 100 for z in all_active]
            nearest_dist = round(min(distances), 2)

        scanner_results.append(ScannerItem(
            symbol=sym,
            timeframe=tf,
            latest_price=res.latest_price,
            trend=res.trend,
            overall_score=res.score.overall_score,
            direction=res.score.direction,
            active_bullish_obs=len(bullish_active),
            active_bearish_obs=len(bearish_active),
            nearest_ob_distance_pct=nearest_dist,
            status_summary=res.score.rationale
        ))

    scanner_results.sort(key=lambda s: s.overall_score, reverse=True)
    return scanner_results

# ----------------- MULTI-TIMEFRAME & BREADTH -----------------
@router.get("/analysis/mtf")
async def get_mtf_analysis(symbol: str = Query("NIFTY 50")):
    """Calculates multi-timeframe trend alignment and zone confluence."""
    return analyze_multi_timeframe(symbol)

@router.get("/market/breadth")
async def get_market_breadth(symbol: str = Query("NIFTY 50")):
    """Returns sector heatmap, advance-decline ratio, and premium/discount levels."""
    candles = store.get_candles(symbol)
    pd_info = calculate_premium_discount(candles)
    breadth = get_market_breadth_and_sectors()
    return {
        "symbol": symbol,
        "premium_discount": pd_info,
        "market_breadth": breadth
    }

# ----------------- BACKTESTING & REPLAY -----------------
@router.post("/backtest/run", response_model=BacktestResult)
async def run_strategy_backtest(req: BacktestRequest):
    """Executes a chronological walk-forward backtest simulation with fee deductions."""
    candles = store.get_candles(req.symbol, req.timeframe)
    if not candles:
        candles = store.get_candles("NIFTY 50", "15m")
    return run_backtest_simulation(candles, req)

@router.get("/replay/step")
async def get_historical_replay_step(
    symbol: str = Query("NIFTY 50"),
    timeframe: str = Query("15m"),
    step_index: int = Query(30)
):
    """Returns the market analysis state at an exact point in historical time without lookahead."""
    return get_replay_snapshot(symbol, timeframe, step_index)

# ----------------- PAPER TRADING -----------------
@router.get("/paper/account")
async def get_paper_account():
    """Returns virtual paper trading account state, positions, and ledger."""
    return paper_manager.get_account_state()

@router.post("/paper/order")
async def place_paper_order(req: PaperOrderRequest):
    """Places a simulated paper trading market or limit order."""
    return paper_manager.place_order(req)

@router.post("/paper/close/{position_id}")
async def close_paper_position(position_id: str):
    """Closes an active paper trading position."""
    return paper_manager.close_position(position_id)

# ----------------- OPTIONS & DERIVATIVES -----------------
@router.get("/options/chain")
async def get_option_chain_data(symbol: str = Query("NIFTY 50")):
    """Returns complete Option Chain with Black-Scholes Greeks, PCR, and Max Pain."""
    candles = store.get_candles(symbol)
    spot = candles[-1].close if candles else 24850.0
    return generate_option_chain(symbol, spot)

@router.get("/options/payoff")
async def get_options_payoff(strategy: str = Query("BULL_CALL_SPREAD"), symbol: str = Query("NIFTY 50")):
    """Generates strategy payoff curve and risk/reward metrics."""
    candles = store.get_candles(symbol)
    spot = candles[-1].close if candles else 24850.0
    return calculate_strategy_payoff(strategy, spot)

# ----------------- WATCHLISTS, ALERTS & JOURNAL -----------------
@router.get("/watchlists")
async def list_watchlists():
    return journal_manager.list_watchlists()

@router.post("/watchlists")
async def create_watchlist(name: str = Form(...), symbols: str = Form("NIFTY 50,BANKNIFTY")):
    sym_list = [s.strip() for s in symbols.split(",") if s.strip()]
    return journal_manager.create_watchlist(name, sym_list)

@router.get("/alerts")
async def list_alerts():
    return journal_manager.list_alerts()

@router.post("/alerts")
async def create_alert(symbol: str = Form(...), alert_type: str = Form("PRICE_CROSS"), target_price: float = Form(...)):
    return journal_manager.create_alert(symbol, alert_type, target_price)

@router.get("/journal")
async def list_journal():
    return journal_manager.list_journal()

@router.post("/journal")
async def add_journal_entry(entry: JournalEntry):
    return journal_manager.add_journal_entry(entry)

# ----------------- AI OLLAMA -----------------
@router.post("/ai/explain", response_model=AIChatResponse)
async def explain_with_ai(request: AIChatRequest):
    """Feeds verified deterministic analysis facts into local Ollama."""
    candles = store.get_candles(request.symbol, request.timeframe)
    if not candles:
        candles = store.get_candles("NIFTY 50", "15m")

    analysis = run_analysis(candles, symbol=request.symbol, timeframe=request.timeframe)
    selected_zone_data = None
    if request.selected_zone_id:
        for z in analysis.order_blocks:
            if z.id == request.selected_zone_id:
                selected_zone_data = z.model_dump()
                break

    context_dict = analysis.model_dump()
    response = await query_ollama(
        context=context_dict,
        question=request.question,
        selected_zone=selected_zone_data,
        language=request.language,
        model=request.model or "qwen3:8b-fast"
    )
    return response

@router.get("/models")
async def get_ollama_models():
    """Lists locally available Ollama models."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if res.status_code == 200:
                models = res.json().get("models", [])
                return {"models": [m.get("name") for m in models]}
    except Exception:
        pass
    return {"models": ["qwen3:8b-fast", "qwen3:8b", "llama3.2:1b"]}

# ----------------- ORDERBLOCK.COM TERMINAL APP -----------------
@router.get("/orderblock/terminal")
async def get_orderblock_app_terminal():
    """
    Returns market trajectories, sectors, market composite curve,
    and ranked BULL/BEAR order block setups modeled after https://order-block.com/app/orderblock.
    """
    return get_orderblock_terminal_data()

@router.get("/orderblock/stock/{symbol}")
async def get_orderblock_stock_details(symbol: str):
    """
    Returns granular order block levels, zones, and candles for the Zone Inspector popover.
    """
    detail = get_stock_detail(symbol)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")
    return detail
