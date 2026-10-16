from typing import List, Optional, Dict, Any
import os
import time
import httpx
from app.providers.base import BaseMarketDataProvider, ProviderQuote, SymbolSearchResult, ProviderHealth
from app.models.schemas import Candle

class IndianStockMarketAPIProvider(BaseMarketDataProvider):
    """
    Adapter for 0xramm/Srvankit Indian-Stock-Market-API microservice.
    Connects to local or remote Flask/FastAPI instance serving NSE/BSE stock data.
    """
    def __init__(self, base_url: Optional[str] = None):
        super().__init__(name="Indian Stock Market API (0xramm/Srvankit)", provider_type="INDIAN_STOCK_API")
        self.base_url = base_url or os.getenv("INDIAN_STOCK_API_URL", "http://127.0.0.1:5000").rstrip("/")
        self.timeout = 3.5

    async def get_quote(self, symbol: str) -> Optional[ProviderQuote]:
        if self.is_circuit_open():
            return None

        clean_sym = symbol.replace(" ", "").upper()
        url = f"{self.base_url}/stock?symbol={clean_sym}&res=num"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    now_str = time.strftime("%Y-%m-%d %H:%M:%S")

                    # Handle dictionary response structure from Indian-Stock-Market-API
                    ltp = float(data.get("current_price") or data.get("price") or data.get("close") or 0.0)
                    op = float(data.get("open") or ltp)
                    hi = float(data.get("day_high") or data.get("high") or ltp)
                    lo = float(data.get("day_low") or data.get("low") or ltp)
                    cl = float(data.get("previous_close") or data.get("close") or ltp)
                    vol = float(data.get("volume") or 0.0)
                    chg = float(data.get("change") or (ltp - cl))
                    chg_pct = float(data.get("percent_change") or data.get("change_pct") or ((chg / (cl or 1)) * 100))

                    self.record_success()
                    return ProviderQuote(
                        symbol=symbol,
                        ltp=round(ltp, 2),
                        open=round(op, 2),
                        high=round(hi, 2),
                        low=round(lo, 2),
                        close=round(ltp, 2),
                        volume=round(vol, 2),
                        change=round(chg, 2),
                        change_pct=round(chg_pct, 2),
                        source_provider="Indian-Stock-Market-API (Microservice)",
                        source_timestamp=data.get("timestamp") or now_str,
                        retrieval_timestamp=now_str,
                        is_live=False,
                        is_delayed=True,
                        delay_minutes=15
                    )
                else:
                    self.record_failure()
                    return None
        except Exception:
            self.record_failure()
            return None

    async def get_batch_quotes(self, symbols: List[str]) -> List[ProviderQuote]:
        if self.is_circuit_open():
            return []

        clean_syms = ",".join([s.replace(" ", "").upper() for s in symbols])
        url = f"{self.base_url}/stock/list?symbols={clean_syms}&res=num"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    now_str = time.strftime("%Y-%m-%d %H:%M:%S")
                    quotes = []
                    # Data is dict of symbol -> quote
                    items = data.items() if isinstance(data, dict) else []
                    for sym, q_data in items:
                        ltp = float(q_data.get("current_price") or q_data.get("price") or 0.0)
                        quotes.append(ProviderQuote(
                            symbol=sym,
                            ltp=round(ltp, 2),
                            open=round(float(q_data.get("open") or ltp), 2),
                            high=round(float(q_data.get("day_high") or ltp), 2),
                            low=round(float(q_data.get("day_low") or ltp), 2),
                            close=round(ltp, 2),
                            volume=round(float(q_data.get("volume") or 0.0), 2),
                            change=round(float(q_data.get("change") or 0.0), 2),
                            change_pct=round(float(q_data.get("percent_change") or 0.0), 2),
                            source_provider="Indian-Stock-Market-API (Microservice)",
                            source_timestamp=now_str,
                            retrieval_timestamp=now_str,
                            is_live=False,
                            is_delayed=True,
                            delay_minutes=15
                        ))
                    self.record_success()
                    return quotes
                else:
                    self.record_failure()
                    return []
        except Exception:
            self.record_failure()
            return []

    async def search_symbols(self, query: str) -> List[SymbolSearchResult]:
        if self.is_circuit_open():
            return []

        url = f"{self.base_url}/search?q={query}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    results = res.json()
                    search_list = []
                    if isinstance(results, list):
                        for item in results:
                            search_list.append(SymbolSearchResult(
                                symbol=item.get("symbol") or item.get("ticker", ""),
                                name=item.get("name") or item.get("company", ""),
                                exchange=item.get("exchange", "NSE"),
                                asset_type="EQUITY",
                                provider="Indian-Stock-Market-API"
                            ))
                    self.record_success()
                    return search_list
        except Exception:
            self.record_failure()
        return []

    async def get_historical_candles(self, symbol: str, timeframe: str = "15m", lookback: int = 150) -> List[Candle]:
        # Indian-Stock-Market-API quote service does not provide multi-year intraday candle history by default
        return []

    async def check_health(self) -> ProviderHealth:
        start = time.time()
        now_str = time.strftime("%Y-%m-%d %H:%M:%S")

        if self.is_circuit_open():
            return ProviderHealth(
                name=self.name,
                provider_type="INDIAN_STOCK_API",
                status="DEGRADED",
                latency_ms=round((time.time() - start) * 1000, 1),
                last_checked=now_str,
                rate_limit_remaining=None,
                capabilities=["QUOTES", "BATCH_QUOTES", "SEARCH"],
                error_message=f"Circuit open. Service at {self.base_url} unresponsive."
            )

        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                res = await client.get(f"{self.base_url}/")
                elapsed = round((time.time() - start) * 1000, 1)
                if res.status_code == 200:
                    self.record_success()
                    return ProviderHealth(
                        name=self.name,
                        provider_type="INDIAN_STOCK_API",
                        status="ONLINE",
                        latency_ms=elapsed,
                        last_checked=now_str,
                        rate_limit_remaining=1000,
                        capabilities=["QUOTES", "BATCH_QUOTES", "SEARCH", "SYMBOLS"],
                        error_message=None
                    )
                else:
                    self.record_failure()
                    return ProviderHealth(
                        name=self.name,
                        provider_type="INDIAN_STOCK_API",
                        status="DEGRADED",
                        latency_ms=elapsed,
                        last_checked=now_str,
                        error_message=f"HTTP {res.status_code}"
                    )
        except Exception as e:
            self.record_failure()
            return ProviderHealth(
                name=self.name,
                provider_type="INDIAN_STOCK_API",
                status="OFFLINE",
                latency_ms=round((time.time() - start) * 1000, 1),
                last_checked=now_str,
                error_message=f"Connection refused at {self.base_url} (Local Flask microservice not currently running)"
            )
