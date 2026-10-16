from typing import List, Optional, Dict, Any
import os
import time
import httpx
from app.providers.base import BaseMarketDataProvider, ProviderQuote, SymbolSearchResult, ProviderHealth
from app.models.schemas import Candle

class AlphaVantageProvider(BaseMarketDataProvider):
    """
    Alpha Vantage API adapter using user's dedicated access key.
    Enforces a strict 5 requests/minute rate-limiter for free tier compliance.
    """
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(name="Alpha Vantage", provider_type="ALPHA_VANTAGE")
        self.api_key = api_key or os.getenv("ALPHA_VANTAGE_API_KEY", "T8IFKZ8UTWJ3D8QO")
        self.base_url = "https://www.alphavantage.co/query"
        self.request_timestamps: List[float] = []
        self.cache: Dict[str, Dict[str, Any]] = {}

    def _check_rate_limit(self) -> bool:
        """Enforces 5 requests per minute limit."""
        now = time.time()
        # Keep only timestamps in the last 60 seconds
        self.request_timestamps = [t for t in self.request_timestamps if now - t < 60.0]
        if len(self.request_timestamps) >= 5:
            return False # Rate limit reached
        self.request_timestamps.append(now)
        return True

    def get_rate_limit_remaining(self) -> int:
        now = time.time()
        active = [t for t in self.request_timestamps if now - t < 60.0]
        return max(0, 5 - len(active))

    async def get_quote(self, symbol: str) -> Optional[ProviderQuote]:
        if self.is_circuit_open():
            return None

        # Check Cache (TTL 120s to conserve requests)
        cache_key = f"quote_{symbol}"
        now = time.time()
        if cache_key in self.cache and now - self.cache[cache_key]["time"] < 120:
            return self.cache[cache_key]["data"]

        if not self._check_rate_limit():
            # Return cached if available, else None
            return self.cache.get(cache_key, {}).get("data")

        # Map Indian symbols if needed (e.g. RELIANCE.BSE)
        av_symbol = symbol.replace(" ", "")
        params = {
            "function": "GLOBAL_QUOTE",
            "symbol": av_symbol,
            "apikey": self.api_key
        }

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(self.base_url, params=params)
                if res.status_code == 200:
                    json_data = res.json()
                    # Check for rate limit note
                    if "Note" in json_data or "Information" in json_data:
                        # Rate limit reached on server
                        self.record_failure(cooldown_seconds=30.0)
                        return self.cache.get(cache_key, {}).get("data")

                    gq = json_data.get("Global Quote", {})
                    if not gq:
                        return None

                    ltp = float(gq.get("05. price", 0.0))
                    op = float(gq.get("02. open", ltp))
                    hi = float(gq.get("03. high", ltp))
                    lo = float(gq.get("04. low", ltp))
                    cl = float(gq.get("08. previous close", ltp))
                    vol = float(gq.get("06. volume", 0.0))
                    chg = float(gq.get("09. change", 0.0))
                    chg_pct_str = gq.get("10. change percent", "0%").replace("%", "")
                    chg_pct = float(chg_pct_str) if chg_pct_str else 0.0

                    now_str = time.strftime("%Y-%m-%d %H:%M:%S")
                    quote = ProviderQuote(
                        symbol=symbol,
                        ltp=round(ltp, 2),
                        open=round(op, 2),
                        high=round(hi, 2),
                        low=round(lo, 2),
                        close=round(ltp, 2),
                        volume=round(vol, 2),
                        change=round(chg, 2),
                        change_pct=round(chg_pct, 2),
                        source_provider="Alpha Vantage",
                        source_timestamp=gq.get("07. latest trading day", now_str),
                        retrieval_timestamp=now_str,
                        is_live=True,
                        is_delayed=False,
                        delay_minutes=0
                    )
                    self.cache[cache_key] = {"time": now, "data": quote}
                    self.record_success()
                    return quote
        except Exception:
            self.record_failure()
        return None

    async def get_batch_quotes(self, symbols: List[str]) -> List[ProviderQuote]:
        quotes = []
        for s in symbols:
            q = await self.get_quote(s)
            if q:
                quotes.append(q)
        return quotes

    async def search_symbols(self, query: str) -> List[SymbolSearchResult]:
        if not self._check_rate_limit() or self.is_circuit_open():
            return []

        params = {
            "function": "SYMBOL_SEARCH",
            "keywords": query,
            "apikey": self.api_key
        }

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(self.base_url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    matches = data.get("bestMatches", [])
                    results = []
                    for m in matches:
                        results.append(SymbolSearchResult(
                            symbol=m.get("1. symbol", ""),
                            name=m.get("2. name", ""),
                            exchange=m.get("4. region", "US/GLOBAL"),
                            asset_type=m.get("3. type", "EQUITY"),
                            provider="Alpha Vantage"
                        ))
                    self.record_success()
                    return results
        except Exception:
            self.record_failure()
        return []

    async def get_historical_candles(self, symbol: str, timeframe: str = "15m", lookback: int = 150) -> List[Candle]:
        if not self._check_rate_limit() or self.is_circuit_open():
            return []

        fn = "TIME_SERIES_DAILY" if timeframe == "1d" else "TIME_SERIES_INTRADAY"
        params: Dict[str, Any] = {
            "function": fn,
            "symbol": symbol.replace(" ", ""),
            "apikey": self.api_key,
            "outputsize": "compact"
        }
        if fn == "TIME_SERIES_INTRADAY":
            interval = "15min" if timeframe == "15m" else ("5min" if timeframe == "5m" else "60min")
            params["interval"] = interval

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(self.base_url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    series_key = [k for k in data.keys() if "Time Series" in k]
                    if not series_key:
                        return []
                    series = data[series_key[0]]

                    candles = []
                    for ts_str, vals in series.items():
                        op = float(vals.get("1. open", 0))
                        hi = float(vals.get("2. high", 0))
                        lo = float(vals.get("3. low", 0))
                        cl = float(vals.get("4. close", 0))
                        vol = float(vals.get("5. volume", 0))
                        candles.append(Candle(
                            timestamp=ts_str,
                            open=round(op, 2),
                            high=round(hi, 2),
                            low=round(lo, 2),
                            close=round(cl, 2),
                            volume=round(vol, 2)
                        ))
                    candles.sort(key=lambda c: c.timestamp)
                    self.record_success()
                    return candles[-lookback:] if lookback > 0 else candles
        except Exception:
            self.record_failure()
        return []

    async def check_health(self) -> ProviderHealth:
        start = time.time()
        now_str = time.strftime("%Y-%m-%d %H:%M:%S")
        remaining = self.get_rate_limit_remaining()

        status = "DEGRADED" if self.is_circuit_open() else ("ONLINE" if self.api_key else "NOT_CONFIGURED")
        err = f"Circuit open until {self.circuit_open_until}" if self.is_circuit_open() else None

        return ProviderHealth(
            name=self.name,
            provider_type="ALPHA_VANTAGE",
            status=status,
            latency_ms=round((time.time() - start) * 1000, 1),
            last_checked=now_str,
            rate_limit_remaining=remaining,
            capabilities=["GLOBAL_QUOTE", "DAILY_SERIES", "INTRADAY_SERIES", "SYMBOL_SEARCH"],
            error_message=err
        )
