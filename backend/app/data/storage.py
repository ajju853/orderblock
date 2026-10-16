import os
import glob
from typing import Dict, List, Optional
import pandas as pd
from app.models.schemas import Candle
from app.analysis.candles import validate_and_parse_csv

DATASETS_DIR = "sample_data"

class DataStore:
    def __init__(self):
        # Store in-memory cache: symbol -> List[Candle]
        self.candles_db: Dict[str, List[Candle]] = {}
        self.preload_samples()

    def preload_samples(self):
        """Loads sample CSVs from sample_data/ directory."""
        if not os.path.exists(DATASETS_DIR):
            return

        csv_files = glob.glob(os.path.join(DATASETS_DIR, "*.csv"))
        for path in csv_files:
            basename = os.path.basename(path).replace(".csv", "")
            parts = basename.split("_")
            raw_symbol = parts[0]
            tf = parts[1] if len(parts) > 1 else "15m"
            
            # Map canonical names
            canonical_map = {
                "NIFTY50": "NIFTY 50",
                "BANKNIFTY": "BANKNIFTY",
                "RELIANCE": "RELIANCE",
                "TCS": "TCS"
            }
            symbol = canonical_map.get(raw_symbol.upper(), raw_symbol.upper())

            try:
                with open(path, "rb") as f:
                    candles, _ = validate_and_parse_csv(f.read(), os.path.basename(path), symbol, tf)
                    if candles:
                        # Index under multiple keys for seamless lookup
                        keys = [
                            f"{symbol}_{tf}".upper(),
                            symbol.upper(),
                            raw_symbol.upper(),
                            f"{raw_symbol}_{tf}".upper(),
                            symbol.replace(" ", "").upper()
                        ]
                        for k in keys:
                            self.candles_db[k] = candles
            except Exception as e:
                print(f"Error loading {path}: {e}")

    def list_instruments(self) -> List[Dict[str, str]]:
        instruments = [
            {"symbol": "NIFTY 50", "name": "NIFTY 50 Index", "exchange": "NSE", "default_tf": "15m", "candles_count": len(self.candles_db.get("NIFTY 50", []))},
            {"symbol": "BANKNIFTY", "name": "NIFTY Bank Index", "exchange": "NSE", "default_tf": "15m", "candles_count": len(self.candles_db.get("BANKNIFTY", []))},
            {"symbol": "RELIANCE", "name": "Reliance Industries", "exchange": "NSE", "default_tf": "1h", "candles_count": len(self.candles_db.get("RELIANCE", []))},
            {"symbol": "TCS", "name": "Tata Consultancy Services", "exchange": "NSE", "default_tf": "15m", "candles_count": len(self.candles_db.get("TCS", []))}
        ]
        # Append any custom uploaded symbols
        standard_keys = {"NIFTY 50", "BANKNIFTY", "RELIANCE", "TCS", "NIFTY50"}
        seen = set(inst["symbol"] for inst in instruments)
        for key in list(self.candles_db.keys()):
            if "_" not in key and key not in standard_keys and key not in seen:
                seen.add(key)
                instruments.append({
                    "symbol": key,
                    "name": f"Custom Asset ({key})",
                    "exchange": "CUSTOM",
                    "default_tf": "15m",
                    "candles_count": len(self.candles_db[key])
                })
        return instruments

    def get_candles(self, symbol: str, timeframe: str = "15m") -> List[Candle]:
        sym_clean = symbol.strip().upper()
        sym_no_space = sym_clean.replace(" ", "")

        candidates = [
            f"{sym_clean}_{timeframe}".upper(),
            f"{sym_no_space}_{timeframe}".upper(),
            sym_clean,
            sym_no_space
        ]
        for c in candidates:
            if c in self.candles_db:
                return self.candles_db[c]
        return []

    def save_candles(self, symbol: str, timeframe: str, candles: List[Candle]):
        key = f"{symbol}_{timeframe}".upper()
        self.candles_db[key] = candles
        self.candles_db[symbol.upper()] = candles

store = DataStore()
