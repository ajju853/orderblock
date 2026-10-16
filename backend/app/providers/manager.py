from typing import List, Dict, Any, Optional
import time
from app.providers.base import BaseMarketDataProvider, ProviderQuote, SymbolSearchResult, ProviderHealth
from app.providers.csv_provider import LocalCSVProvider
from app.providers.yfinance_provider import YFinanceProvider
from app.providers.indian_stock_api_provider import IndianStockMarketAPIProvider
from app.providers.alpha_vantage_provider import AlphaVantageProvider
from app.models.schemas import Candle
from app.data.storage import store

class MarketDataManager:
    """
    Central provider-independent market data manager.
    Coordinates multiple interchangeable data adapters, manages fallback cascades,
    and guarantees strict data provenance without fabricating prices.
    """
    def __init__(self):
        self.csv_provider = LocalCSVProvider()
        self.yf_provider = YFinanceProvider()
        self.ism_provider = IndianStockMarketAPIProvider()
        self.av_provider = AlphaVantageProvider()

        self.providers: Dict[str, BaseMarketDataProvider] = {
            "LOCAL_CSV": self.csv_provider,
            "YFINANCE": self.yf_provider,
            "INDIAN_STOCK_API": self.ism_provider,
            "ALPHA_VANTAGE": self.av_provider,
        }

        # Default active provider
        self.active_provider_key: str = "YFINANCE"

    def get_active_provider(self) -> BaseMarketDataProvider:
        return self.providers.get(self.active_provider_key, self.csv_provider)

    def set_active_provider(self, key: str) -> bool:
        if key in self.providers:
            self.active_provider_key = key
            return True
        return False

    async def get_all_providers_health(self) -> List[ProviderHealth]:
        health_list = []
        for p in self.providers.values():
            h = await p.check_health()
            health_list.append(h)
        return health_list

    async def get_quote_with_fallback(self, symbol: str) -> Dict[str, Any]:
        """
        Attempts to fetch live quote from active provider.
        Falls back to secondary providers and local store if primary fails.
        """
        primary = self.get_active_provider()
        quote = await primary.get_quote(symbol)

        if quote:
            return {
                "success": True,
                "quote": quote.model_dump(),
                "provider_used": primary.name,
                "data_mode": "DELAYED_FEED" if quote.is_delayed else "LIVE_FEED",
                "fallback_triggered": False
            }

        # Fallback Cascade: YFinance -> Alpha Vantage -> Local CSV
        fallback_order = [self.yf_provider, self.av_provider, self.csv_provider]
        for p in fallback_order:
            if p != primary:
                quote = await p.get_quote(symbol)
                if quote:
                    return {
                        "success": True,
                        "quote": quote.model_dump(),
                        "provider_used": p.name,
                        "data_mode": "OFFLINE_FALLBACK" if p.provider_type == "LOCAL_CSV" else "FALLBACK_FEED",
                        "fallback_triggered": True
                    }

        return {
            "success": False,
            "quote": None,
            "provider_used": None,
            "data_mode": "UNAVAILABLE",
            "fallback_triggered": True,
            "message": f"Quote unavailable for {symbol} across all configured providers."
        }

    async def get_batch_quotes(self, symbols: List[str]) -> List[ProviderQuote]:
        primary = self.get_active_provider()
        quotes = await primary.get_batch_quotes(symbols)
        if quotes:
            return quotes
        # Fallback to CSV
        return await self.csv_provider.get_batch_quotes(symbols)

    async def search_symbols(self, query: str) -> List[SymbolSearchResult]:
        primary = self.get_active_provider()
        results = await primary.search_symbols(query)
        if not results:
            results = await self.csv_provider.search_symbols(query)
        return results

    async def fetch_and_sync_candles(self, symbol: str, timeframe: str = "15m", lookback: int = 150) -> Dict[str, Any]:
        """
        Fetches historical candles from active remote provider and updates local DataStore cache.
        """
        primary = self.get_active_provider()
        candles = await primary.get_historical_candles(symbol, timeframe, lookback)

        if candles:
            # Sync to local in-memory store
            store.save_candles(symbol, timeframe, candles)
            return {
                "success": True,
                "symbol": symbol,
                "timeframe": timeframe,
                "count": len(candles),
                "source_provider": primary.name,
                "synced_to_local_store": True,
                "candles": [c.model_dump() for c in candles]
            }

        # If primary failed, return existing cached candles from store
        cached = store.get_candles(symbol, timeframe)
        return {
            "success": len(cached) > 0,
            "symbol": symbol,
            "timeframe": timeframe,
            "count": len(cached),
            "source_provider": "Local Historical Cache",
            "synced_to_local_store": False,
            "candles": [c.model_dump() for c in cached]
        }

# Global Singleton Manager
market_data_manager = MarketDataManager()
