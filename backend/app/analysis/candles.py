from typing import List, Tuple, Dict, Any
import pandas as pd
import numpy as np
from datetime import datetime
from app.models.schemas import Candle, DataImportSummary

def validate_and_parse_csv(file_bytes: bytes, filename: str, default_symbol: str = "CUSTOM", default_tf: str = "15m") -> Tuple[List[Candle], DataImportSummary]:
    """
    Parses and validates CSV market candles.
    Enforces strict OHLC relationships, handles duplicate timestamps deterministically,
    and reports row-level errors without fabricating prices.
    """
    errors: List[str] = []
    accepted: List[Candle] = []
    
    try:
        import io
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        return [], DataImportSummary(
            filename=filename,
            total_rows=0,
            accepted_rows=0,
            rejected_rows=0,
            errors=[f"CSV Parse error: {str(e)}"],
            symbol=default_symbol,
            timeframe=default_tf
        )
    
    # Normalize column names (lowercase, stripped)
    col_map = {c: c.strip().lower() for c in df.columns}
    df.rename(columns=col_map, inplace=True)
    
    # Required columns detection
    time_col = None
    for candidate in ["timestamp", "datetime", "date", "time"]:
        if candidate in df.columns:
            time_col = candidate
            break
            
    if not time_col:
        errors.append("Missing timestamp column (expected: timestamp, datetime, date, or time)")
        return [], DataImportSummary(
            filename=filename,
            total_rows=len(df),
            accepted_rows=0,
            rejected_rows=len(df),
            errors=errors,
            symbol=default_symbol,
            timeframe=default_tf
        )

    for req in ["open", "high", "low", "close"]:
        if req not in df.columns:
            errors.append(f"Missing required price column: {req}")
            
    if errors:
        return [], DataImportSummary(
            filename=filename,
            total_rows=len(df),
            accepted_rows=0,
            rejected_rows=len(df),
            errors=errors,
            symbol=default_symbol,
            timeframe=default_tf
        )

    # Volume is optional (default 0)
    has_vol = "volume" in df.columns or "vol" in df.columns
    vol_col = "volume" if "volume" in df.columns else ("vol" if "vol" in df.columns else None)

    total_rows = len(df)
    seen_timestamps = set()

    for idx, row in df.iterrows():
        row_num = idx + 2 # 1-based index including header
        
        # 1. Parse timestamp
        raw_ts = str(row[time_col]).strip()
        try:
            # Let pandas parse standard dates
            dt = pd.to_datetime(raw_ts)
            ts_str = dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            errors.append(f"Row {row_num}: Invalid timestamp format '{raw_ts}'")
            continue
            
        # Check duplicate timestamp
        if ts_str in seen_timestamps:
            # Deterministic policy: skip duplicate row
            continue
            
        # 2. Parse numbers
        try:
            op = float(row["open"])
            hi = float(row["high"])
            lo = float(row["low"])
            cl = float(row["close"])
            vol = float(row[vol_col]) if vol_col and not pd.isna(row[vol_col]) else 0.0
        except (ValueError, TypeError) as e:
            errors.append(f"Row {row_num}: Non-numeric OHLC price value ({str(e)})")
            continue

        # 3. OHLC logic validation
        # High must be >= open, close, and low
        # Low must be <= open, close, and high
        if np.isnan(op) or np.isnan(hi) or np.isnan(lo) or np.isnan(cl):
            errors.append(f"Row {row_num}: NaN price detected")
            continue

        if hi < max(op, cl, lo):
            errors.append(f"Row {row_num}: Invalid High ({hi}) < max(open, close, low)")
            continue

        if lo > min(op, cl, hi):
            errors.append(f"Row {row_num}: Invalid Low ({lo}) > min(open, close, high)")
            continue

        if vol < 0:
            vol = 0.0

        seen_timestamps.add(ts_str)
        accepted.append(Candle(
            timestamp=ts_str,
            open=round(op, 2),
            high=round(hi, 2),
            low=round(lo, 2),
            close=round(cl, 2),
            volume=round(vol, 2)
        ))

    # Sort accepted candles strictly by timestamp ascending
    accepted.sort(key=lambda c: c.timestamp)

    summary = DataImportSummary(
        filename=filename,
        total_rows=total_rows,
        accepted_rows=len(accepted),
        rejected_rows=total_rows - len(accepted),
        errors=errors[:20], # limit error preview
        symbol=default_symbol,
        timeframe=default_tf
    )

    return accepted, summary
