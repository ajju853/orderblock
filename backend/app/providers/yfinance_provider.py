from typing import List, Optional, Dict, Any
import time
import asyncio
import pandas as pd
import numpy as np
from app.providers.base import BaseMarketDataProvider, ProviderQuote, SymbolSearchResult, ProviderHealth
from app.models.schemas import Candle

INDIAN_INDEX_MAP = {
    "NIFTY 50": "^NSEI",
    "NIFTY50": "^NSEI",
    "NIFTY": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "BANK NIFTY": "^NSEBANK",
    "FINNIFTY": "NIFTY_FIN_SERVICE.NS",
}

class YFinanceProvider(BaseMarketDataProvider):
    """
    Free Python Yahoo Finance adapter for Indian Equities and Indices.
    No subscription or API key required. Handles NSE (.NS) and BSE (.BO) mapping.
    """
    def __init__(self):
        super().__init__(name="Yahoo Finance (yfinance)", provider_type="YFINANCE")
        # In-memory TTL caches
        self.quote_cache: Dict[str, Dict[str, Any]] = {}
        self.candle_cache: Dict[str, Dict[str, Any]] = {}

    def to_yf_symbol(self, symbol: str) -> str:
        sym_clean = symbol.strip().upper()
        if sym_clean in INDIAN_INDEX_MAP:
            return INDIAN_INDEX_MAP[sym_clean]
        if sym_clean.startswith("^") or sym_clean.endswith(".NS") or sym_clean.endswith(".BO"):
            return sym_clean
        # Default Indian equity to NSE (.NS)
        return f"{sym_clean}.NS"

    def from_yf_symbol(self, yf_symbol: str) -> str:
        for orig, mapped in INDIAN_INDEX_MAP.items():
            if mapped == yf_symbol:
                return orig
        return yf_symbol.replace(".NS", "").replace(".BO", "")

    async def get_quote(self, symbol: str) -> Optional[ProviderQuote]:
        if self.is_circuit_open():
            return None

        now = time.time()
        yf_sym = self.to_yf_symbol(symbol)

        # Check Cache (TTL 60s)
        if yf_sym in self.quote_cache:
            entry = self.quote_cache[yf_sym]
            if now - entry["timestamp"] < 60:
                return entry["data"]

        try:
            import yfinance as yf
            ticker = yf.Ticker(yf_sym)
            fast_info = getattr(ticker, "fast_info", None)

            if fast_info:
                last_price = float(getattr(fast_info, "last_price", 0.0) or 0.0)
                prev_close = float(getattr(fast_info, "previous_close", 0.0) or last_price)
                open_p = float(getattr(fast_info, "open", 0.0) or last_price)
                high_p = float(getattr(fast_info, "day_high", 0.0) or max(last_price, open_p))
                low_p = float(getattr(fast_info, "day_low", 0.0) or min(last_price, open_p))
                vol = float(getattr(fast_info, "last_volume", 0.0) or 0.0)
            else:
                # Fallback to 1d history
                df = ticker.history(period="2d")
                if df.empty:
                    return None
                last_row = df.iloc[-1]
                prev_row = df.iloc[-2] if len(df) >= 2 else last_row
                last_price = float(last_row["Close"])
                prev_close = float(prev_row["Close"])
                open_p = float(last_row["Open"])
                high_p = float(last_row["High"])
                low_p = float(last_row["Low"])
                vol = float(last_row["Volume"])

            change = round(last_price - prev_close, 2)
            pct = round((change / (prev_close or 1)) * 100, 2)
            now_str = time.strftime("%Y-%m-%d %H:%M:%S")

            quote = ProviderQuote(
                symbol=symbol,
                ltp=round(last_price, 2),
                open=round(open_p, 2),
                high=round(high_p, 2),
                low=round(low_p, 2),
                close=round(last_price, 2),
                volume=round(vol, 2),
                change=change,
                change_pct=pct,
                source_provider="Yahoo Finance (NSE)",
                source_timestamp=now_str,
                retrieval_timestamp=now_str,
                is_live=False,
                is_delayed=True, # Yahoo Finance free tier has 15m exchange delay for NSE
                delay_minutes=15
            )

            self.quote_cache[yf_sym] = {"timestamp": now, "data": quote}
            self.record_success()
            return quote

        except Exception as e:
            self.record_failure()
            return None

    async def get_batch_quotes(self, symbols: List[str]) -> List[ProviderQuote]:
        quotes = []
        for s in symbols:
            q = await self.get_quote(s)
            if q:
                quotes.append(q)
            # Gentle pacing to respect unofficial endpoint
            await asyncio.sleep(0.05)
        return quotes

    async def search_symbols(self, query: str) -> List[SymbolSearchResult]:
        q = query.strip().upper()
        # Common preloaded Indian watchlist
        popular = [
            ("NIFTY 50", "NIFTY 50 Index", "NSE"),
            ("BANKNIFTY", "NIFTY Bank Index", "NSE"),
            ("RELIANCE", "Reliance Industries Ltd", "NSE"),
            ("TCS", "Tata Consultancy Services Ltd", "NSE"),
            ("HDFCBANK", "HDFC Bank Ltd", "NSE"),
            ("INFY", "Infosys Ltd", "NSE"),
            ("ICICIBANK", "ICICI Bank Ltd", "NSE"),
            ("SBIN", "State Bank of India", "NSE"),
            ("TATAMOTORS", "Tata Motors Ltd", "NSE"),
            ("ITC", "ITC Ltd", "NSE"),
        ]
        matches = []
        for sym, name, ex in popular:
            if q in sym or q in name.upper():
                matches.append(SymbolSearchResult(
                    symbol=sym,
                    name=name,
                    exchange=ex,
                    asset_type="EQUITY",
                    provider="Yahoo Finance"
                ))
        return matches

    async def get_historical_candles(self, symbol: str, timeframe: str = "15m", lookback: int = 150) -> List[Candle]:
        if self.is_circuit_open():
            return []

        yf_sym = self.to_yf_symbol(symbol)
        cache_key = f"{yf_sym}_{timeframe}"
        now = time.time()

        if cache_key in self.candle_cache:
            entry = self.candle_cache[cache_key]
            if now - entry["timestamp"] < 300: # 5 mins TTL
                return entry["data"]

        # Map interval and period
        interval_map = {"1m": "1m", "5m": "5m", "15m": "15m", "1h": "60m", "1d": "1d"}
        period_map = {"1m": "5d", "5m": "1mo", "15m": "1mo", "1h": "3mo", "1d": "1y"}

        interval = interval_map.get(timeframe, "15m")
        period = period_map.get(timeframe, "1mo")

        try:
            import yfinance as yf
            ticker = yf.Ticker(yf_sym)
            df = ticker.history(period=period, interval=interval)

            if df.empty:
                return []

            candles: List[Candle] = []
            for dt, row in df.iterrows():
                ts_str = dt.strftime("%Y-%m-%d %H:%M:%S")
                op = float(row["Open"])
                hi = float(row["High"])
                lo = float(row["Low"])
                cl = float(row["Close"])
                vol = float(row["Volume"]) if "Volume" in row else 0.0

                # Validate OHLC
                if hi >= max(op, cl, lo) and lo <= min(op, cl, hi):
                    candles.append(Candle(
                        timestamp=ts_str,
                        open=round(op, 2),
                        high=round(hi, 2),
                        low=round(lo, 2),
                        close=round(cl, 2),
                        volume=round(vol, 2)
                    ))

            candles.sort(key=lambda c: c.timestamp)
            final_candles = candles[-lookback:] if lookback > 0 else candles
            self.candle_cache[cache_key] = {"timestamp": now, "data": final_candles}
            self.record_success()
            return final_candles

        except Exception as e:
            self.record_failure()
            return []

    async def check_health(self) -> ProviderHealth:
        start = time.time()
        now_str = time.strftime("%Y-%m-%d %H:%M:%S")
        status = "DEGRADED" if self.is_circuit_open() else "ONLINE"
        error = f"Circuit open until {self.circuit_open_until}" if self.is_circuit_open() else None

        return ProviderHealth(
            name=self.name,
            provider_type="YFINANCE",
            status=status,
            latency_ms=round((time.time() - start) * 1000, 1),
            last_checked=now_str,
            rate_limit_remaining=2000,
            capabilities=["HISTORICAL_OHLCV", "QUOTES", "DELAYED_STREAM", "NSE_BSE_EQUITIES"],
            error_message=error
        )
