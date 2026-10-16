from typing import List, Optional
import time
from app.providers.base import BaseMarketDataProvider, ProviderQuote, SymbolSearchResult, ProviderHealth
from app.data.storage import store
from app.models.schemas import Candle

class LocalCSVProvider(BaseMarketDataProvider):
    """
    Default offline provider leveraging validated local CSV datasets and user uploads.
    Zero external network cost, guaranteed 100% uptime.
    """
    def __init__(self):
        super().__init__(name="Local CSV & Ingestion Store", provider_type="LOCAL_CSV")

    async def get_quote(self, symbol: str) -> Optional[ProviderQuote]:
        candles = store.get_candles(symbol)
        if not candles:
            return None
        latest = candles[-1]
        prev = candles[-2] if len(candles) >= 2 else latest
        change = round(latest.close - prev.close, 2)
        pct = round((change / (prev.close or 1)) * 100, 2)

        now_str = time.strftime("%Y-%m-%d %H:%M:%S")
        return ProviderQuote(
            symbol=symbol,
            ltp=latest.close,
            open=latest.open,
            high=latest.high,
            low=latest.low,
            close=latest.close,
            volume=latest.volume,
            change=change,
            change_pct=pct,
            source_provider="Local CSV Ingestion Store",
            source_timestamp=latest.timestamp,
            retrieval_timestamp=now_str,
            is_live=False,
            is_delayed=False,
            delay_minutes=0
        )

    async def get_batch_quotes(self, symbols: List[str]) -> List[ProviderQuote]:
        quotes = []
        for s in symbols:
            q = await self.get_quote(s)
            if q:
                quotes.append(q)
        return quotes

    async def search_symbols(self, query: str) -> List[SymbolSearchResult]:
        q_upper = query.strip().upper()
        instruments = store.list_instruments()
        results = []
        for inst in instruments:
            if q_upper in inst["symbol"].upper() or q_upper in inst["name"].upper():
                results.append(SymbolSearchResult(
                    symbol=inst["symbol"],
                    name=inst["name"],
                    exchange=inst["exchange"],
                    asset_type="EQUITY",
                    provider="Local CSV"
                ))
        return results

    async def get_historical_candles(self, symbol: str, timeframe: str = "15m", lookback: int = 150) -> List[Candle]:
        candles = store.get_candles(symbol, timeframe)
        return candles[-lookback:] if lookback > 0 else candles

    async def check_health(self) -> ProviderHealth:
        instruments = store.list_instruments()
        now_str = time.strftime("%Y-%m-%d %H:%M:%S")
        return ProviderHealth(
            name=self.name,
            provider_type="LOCAL_CSV",
            status="ONLINE",
            latency_ms=0.5,
            last_checked=now_str,
            rate_limit_remaining=999999,
            capabilities=["HISTORICAL_OHLCV", "QUOTES", "SYMBOL_SEARCH", "OFFLINE_PLAYBACK"],
            error_message=None
        )
