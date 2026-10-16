from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel
import time
from app.models.schemas import Candle

class ProviderQuote(BaseModel):
    symbol: str
    ltp: float # Last Traded Price
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0
    change: float = 0.0
    change_pct: float = 0.0
    source_provider: str
    source_timestamp: str
    retrieval_timestamp: str
    is_live: bool = False
    is_delayed: bool = True
    delay_minutes: int = 15

class SymbolSearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str # NSE, BSE, NASDAQ
    asset_type: str = "EQUITY"
    provider: str

class ProviderHealth(BaseModel):
    name: str
    provider_type: Literal["LOCAL_CSV", "YFINANCE", "INDIAN_STOCK_API", "ALPHA_VANTAGE"]
    status: Literal["ONLINE", "OFFLINE", "DEGRADED", "NOT_CONFIGURED"]
    latency_ms: float = 0.0
    last_checked: str
    rate_limit_remaining: Optional[int] = None
    capabilities: List[str] = []
    error_message: Optional[str] = None

class BaseMarketDataProvider(ABC):
    """
    Abstract Base Class for all pluggable market data adapters in BlockMind AI.
    Guarantees strict schema validation, timestamp provenance, and error handling.
    """
    def __init__(self, name: str, provider_type: str):
        self.name = name
        self.provider_type = provider_type
        self.consecutive_failures = 0
        self.circuit_open_until = 0.0

    def is_circuit_open(self) -> bool:
        """Returns True if the provider is currently tripped by repeated failures."""
        if self.circuit_open_until > time.time():
            return True
        return False

    def record_success(self):
        self.consecutive_failures = 0
        self.circuit_open_until = 0.0

    def record_failure(self, cooldown_seconds: float = 60.0):
        self.consecutive_failures += 1
        if self.consecutive_failures >= 3:
            # Trip circuit breaker
            self.circuit_open_until = time.time() + cooldown_seconds

    @abstractmethod
    async def get_quote(self, symbol: str) -> Optional[ProviderQuote]:
        """Fetch latest quote for a single symbol."""
        pass

    @abstractmethod
    async def get_batch_quotes(self, symbols: List[str]) -> List[ProviderQuote]:
        """Fetch quotes for multiple symbols."""
        pass

    @abstractmethod
    async def search_symbols(self, query: str) -> List[SymbolSearchResult]:
        """Search instruments by query string."""
        pass

    @abstractmethod
    async def get_historical_candles(self, symbol: str, timeframe: str = "15m", lookback: int = 150) -> List[Candle]:
        """Retrieve and normalize historical OHLCV candles."""
        pass

    @abstractmethod
    async def check_health(self) -> ProviderHealth:
        """Ping provider and return health diagnostics."""
        pass
