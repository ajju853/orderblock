import math
import random
import pandas as pd
from datetime import datetime, timedelta

def generate_candles(symbol: str, base_price: float, num_candles: int = 180, interval_mins: int = 15):
    """
    Generates realistic market candles with swings, impulse legs, BOS, and order block setups.
    """
    random.seed(42 if symbol == "NIFTY 50" else (108 if symbol == "BANKNIFTY" else 2024))
    
    # Start timestamp (e.g. 5 days ago during market hours 09:15 to 15:30 IST)
    start_time = datetime(2026, 10, 10, 9, 15)
    
    candles = []
    current_price = base_price
    current_time = start_time
    
    # Generate structured waves: Downtrend wave -> Base -> Strong Bullish Impulse -> Retest -> Continuation
    # Wave patterns repeat to form multiple swings
    phase_length = 25
    
    for i in range(num_candles):
        # Adjust time for Indian market trading sessions (09:15 - 15:30)
        if current_time.hour >= 15 and current_time.minute > 30:
            current_time = (current_time + timedelta(days=1)).replace(hour=9, minute=15)
            # Skip weekends
            while current_time.weekday() >= 5:
                current_time = current_time + timedelta(days=1)
        
        cycle = (i // phase_length) % 4
        # 0: Downtrend wave (lower highs, lower lows)
        # 1: Accumulation / Last drop (Order block source)
        # 2: Explosive Bullish BOS Breakout & FVG creation
        # 3: Retest of Bullish OB (mitigation / reaction)
        
        atr = base_price * 0.0035  # ~0.35% per bar
        
        if cycle == 0:
            drift = -0.5 * atr
            volatility = atr * 0.8
        elif cycle == 1:
            drift = -0.2 * atr
            volatility = atr * 0.6
        elif cycle == 2:
            drift = 1.2 * atr  # Strong impulsive expansion!
            volatility = atr * 1.4
        else: # cycle == 3
            drift = -0.3 * atr # Pullback to order block
            volatility = atr * 0.7
            
        noise = random.gauss(0, volatility)
        delta = drift + noise
        
        op = round(current_price, 2)
        cl = round(current_price + delta, 2)
        
        # Ensure high is >= max(op, cl) and low <= min(op, cl)
        wick_up = abs(random.gauss(0, atr * 0.4))
        wick_down = abs(random.gauss(0, atr * 0.4))
        hi = round(max(op, cl) + wick_up, 2)
        lo = round(min(op, cl) - wick_down, 2)
        
        vol = int(random.randint(50000, 300000) * (2.2 if cycle == 2 else 1.0))
        
        candles.append({
            "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
            "open": op,
            "high": hi,
            "low": lo,
            "close": cl,
            "volume": vol
        })
        
        current_price = cl
        current_time += timedelta(minutes=interval_mins)
        
    df = pd.DataFrame(candles)
    return df

if __name__ == "__main__":
    nifty = generate_candles("NIFTY 50", 24850.0, num_candles=200, interval_mins=15)
    nifty.to_csv("sample_data/NIFTY50_15m.csv", index=False)
    print(f"Generated NIFTY50_15m.csv: {len(nifty)} rows")
    
    banknifty = generate_candles("BANKNIFTY", 51600.0, num_candles=200, interval_mins=15)
    banknifty.to_csv("sample_data/BANKNIFTY_15m.csv", index=False)
    print(f"Generated BANKNIFTY_15m.csv: {len(banknifty)} rows")

    reliance = generate_candles("RELIANCE", 2980.0, num_candles=160, interval_mins=60)
    reliance.to_csv("sample_data/RELIANCE_1h.csv", index=False)
    print(f"Generated RELIANCE_1h.csv: {len(reliance)} rows")

    tcs = generate_candles("TCS", 4210.0, num_candles=180, interval_mins=15)
    tcs.to_csv("sample_data/TCS_15m.csv", index=False)
    print(f"Generated TCS_15m.csv: {len(tcs)} rows")
