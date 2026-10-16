from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import time

class JournalEntry(BaseModel):
    id: str
    symbol: str
    direction: str
    entry_price: float
    exit_price: float
    pnl: float
    setup_type: str
    thesis: str
    review_notes: str
    tags: List[str]
    created_at: str

class AlertRule(BaseModel):
    id: str
    symbol: str
    alert_type: str # "PRICE_CROSS" | "OB_PROXIMITY" | "ZONE_INVALIDATED"
    target_price: float
    active: bool = True
    created_at: str

class Watchlist(BaseModel):
    id: str
    name: str
    symbols: List[str]

class JournalAndWatchlistManager:
    def __init__(self):
        self.watchlists: Dict[str, Watchlist] = {
            "default": Watchlist(id="default", name="Main NIFTY F&O", symbols=["NIFTY 50", "BANKNIFTY", "RELIANCE", "TCS"]),
            "intraday": Watchlist(id="intraday", name="High Momentum Intraday", symbols=["BANKNIFTY", "RELIANCE"])
        }
        self.alerts: List[AlertRule] = [
            AlertRule(id="alt-1", symbol="NIFTY 50", alert_type="OB_PROXIMITY", target_price=24800.0, active=True, created_at="2026-10-16 09:15:00"),
            AlertRule(id="alt-2", symbol="BANKNIFTY", alert_type="PRICE_CROSS", target_price=51800.0, active=True, created_at="2026-10-16 09:30:00")
        ]
        self.journal_entries: List[JournalEntry] = [
            JournalEntry(
                id="j-1",
                symbol="NIFTY 50",
                direction="LONG",
                entry_price=24850.0,
                exit_price=25050.0,
                pnl=10000.0,
                setup_type="BULL_OB_RETEST",
                thesis="Confirmed 15m BOS with bullish order block retest at 50% equilibrium. Clean FVG confluence.",
                review_notes="Followed plan precisely. Exited at prior swing high resistance.",
                tags=["DISCIPLINED", "PERFECT_SETUP", "SMC"],
                created_at="2026-10-14 14:30:00"
            )
        ]

    # Watchlists
    def list_watchlists(self) -> List[Watchlist]:
        return list(self.watchlists.values())

    def create_watchlist(self, name: str, symbols: List[str]) -> Watchlist:
        wid = f"wl-{int(time.time())}"
        wl = Watchlist(id=wid, name=name, symbols=symbols)
        self.watchlists[wid] = wl
        return wl

    def add_symbol_to_watchlist(self, wid: str, symbol: str):
        if wid in self.watchlists and symbol not in self.watchlists[wid].symbols:
            self.watchlists[wid].symbols.append(symbol)

    # Alerts
    def list_alerts(self) -> List[AlertRule]:
        return self.alerts

    def create_alert(self, symbol: str, alert_type: str, target_price: float) -> AlertRule:
        rule = AlertRule(
            id=f"alt-{len(self.alerts) + 1}",
            symbol=symbol,
            alert_type=alert_type,
            target_price=target_price,
            active=True,
            created_at=time.strftime("%Y-%m-%d %H:%M:%S")
        )
        self.alerts.append(rule)
        return rule

    # Journal
    def list_journal(self) -> List[JournalEntry]:
        return self.journal_entries

    def add_journal_entry(self, entry: JournalEntry) -> JournalEntry:
        self.journal_entries.insert(0, entry)
        return entry

journal_manager = JournalAndWatchlistManager()
