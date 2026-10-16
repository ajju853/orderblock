import pytest
import time
from app.providers.csv_provider import LocalCSVProvider
from app.providers.yfinance_provider import YFinanceProvider
from app.providers.indian_stock_api_provider import IndianStockMarketAPIProvider
from app.providers.alpha_vantage_provider import AlphaVantageProvider
from app.providers.manager import MarketDataManager

@pytest.mark.asyncio
async def test_csv_provider():
    csv_p = LocalCSVProvider()
    health = await csv_p.check_health()
    assert health.status == "ONLINE"
    assert "HISTORICAL_OHLCV" in health.capabilities

    quote = await csv_p.get_quote("NIFTY 50")
    assert quote is not None
    assert quote.symbol == "NIFTY 50"
    assert quote.ltp > 0
    assert quote.source_provider == "Local CSV Ingestion Store"

    candles = await csv_p.get_historical_candles("NIFTY 50", "15m", lookback=10)
    assert len(candles) == 10

@pytest.mark.asyncio
async def test_yfinance_symbol_mapping():
    yf_p = YFinanceProvider()
    assert yf_p.to_yf_symbol("NIFTY 50") == "^NSEI"
    assert yf_p.to_yf_symbol("BANKNIFTY") == "^NSEBANK"
    assert yf_p.to_yf_symbol("RELIANCE") == "RELIANCE.NS"
    assert yf_p.to_yf_symbol("TCS") == "TCS.NS"

    # Search popular symbols
    matches = await yf_p.search_symbols("RELIANCE")
    assert len(matches) > 0
    assert matches[0].symbol == "RELIANCE"

@pytest.mark.asyncio
async def test_alpha_vantage_rate_limiter():
    av_p = AlphaVantageProvider(api_key="TEST_KEY")
    # Simulate 5 fast requests
    for _ in range(5):
        av_p.request_timestamps.append(time.time())

    # 6th request within 60s should be denied by rate limiter
    assert av_p._check_rate_limit() is False
    assert av_p.get_rate_limit_remaining() == 0

@pytest.mark.asyncio
async def test_indian_stock_api_circuit_breaker():
    ism_p = IndianStockMarketAPIProvider(base_url="http://127.0.0.1:9999") # Inactive port
    # Simulate 3 failures
    for _ in range(3):
        ism_p.record_failure(cooldown_seconds=10.0)

    assert ism_p.is_circuit_open() is True
    # Quote should instantly return None without network delay
    q = await ism_p.get_quote("RELIANCE")
    assert q is None

    # Reset
    ism_p.record_success()
    assert ism_p.is_circuit_open() is False

@pytest.mark.asyncio
async def test_manager_fallback_cascade():
    mgr = MarketDataManager()
    # Force an inactive microservice as active
    mgr.set_active_provider("INDIAN_STOCK_API")
    mgr.ism_provider.circuit_open_until = time.time() + 60.0 # Force circuit open

    # Fallback to local CSV/YF should trigger smoothly
    res = await mgr.get_quote_with_fallback("NIFTY 50")
    assert res["success"] is True
    assert res["fallback_triggered"] is True
    assert res["quote"] is not None
    assert res["quote"]["ltp"] > 0
