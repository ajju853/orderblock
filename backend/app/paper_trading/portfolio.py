from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel
import time
from app.data.storage import store

class PaperPosition(BaseModel):
    id: str
    symbol: str
    direction: Literal["LONG", "SHORT"]
    entry_price: float
    current_price: float
    quantity: int
    unrealized_pnl: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    entry_time: str

class PaperTradeRecord(BaseModel):
    id: str
    symbol: str
    direction: Literal["LONG", "SHORT"]
    entry_price: float
    exit_price: float
    quantity: int
    net_pnl: float
    fees: float
    entry_time: str
    exit_time: str
    reason: str

class PaperOrderRequest(BaseModel):
    symbol: str
    direction: Literal["LONG", "SHORT"]
    order_type: Literal["MARKET", "LIMIT"] = "MARKET"
    quantity: int
    limit_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

class PaperAccountState(BaseModel):
    initial_balance: float
    cash_balance: float
    total_equity: float
    realized_pnl: float
    unrealized_pnl: float
    daily_loss_limit_pct: float
    daily_drawdown_pct: float
    active_positions: List[PaperPosition]
    trade_history: List[PaperTradeRecord]

class PaperTradingManager:
    def __init__(self, initial_capital: float = 500000.0, leverage: float = 5.0):
        self.initial_balance = initial_capital
        self.cash_balance = initial_capital
        self.leverage = leverage
        self.daily_loss_limit_pct = 3.0
        self.positions: Dict[str, PaperPosition] = {}
        self.trade_history: List[PaperTradeRecord] = []

    def get_latest_market_price(self, symbol: str) -> float:
        candles = store.get_candles(symbol)
        if candles:
            return candles[-1].close
        return 100.0

    def place_order(self, req: PaperOrderRequest) -> Dict[str, Any]:
        curr_price = self.get_latest_market_price(req.symbol)
        exec_price = req.limit_price if req.order_type == "LIMIT" and req.limit_price else curr_price

        # Check required capital with intraday leverage
        required_margin = (exec_price * req.quantity) / self.leverage
        if required_margin > self.cash_balance:
            return {"success": False, "message": f"Insufficient margin. Required: ₹{required_margin:.2f}, Available: ₹{self.cash_balance:.2f}"}

        # Check daily loss limit
        realized_loss_pct = ((self.initial_balance - self.cash_balance) / self.initial_balance) * 100
        if realized_loss_pct >= self.daily_loss_limit_pct:
            return {"success": False, "message": f"Daily loss limit ({self.daily_loss_limit_pct}%) reached! Trading locked for safety."}

        # Deduct margin and simulated fee (₹20)
        self.cash_balance -= 20.0
        pos_id = f"pos-{req.symbol}-{int(time.time())}"

        pos = PaperPosition(
            id=pos_id,
            symbol=req.symbol,
            direction=req.direction,
            entry_price=round(exec_price, 2),
            current_price=round(curr_price, 2),
            quantity=req.quantity,
            unrealized_pnl=0.0,
            stop_loss=req.stop_loss,
            take_profit=req.take_profit,
            entry_time=time.strftime("%Y-%m-%d %H:%M:%S")
        )
        self.positions[pos_id] = pos

        return {"success": True, "message": f"Filled {req.direction} {req.quantity} {req.symbol} @ ₹{exec_price:.2f}", "position": pos.model_dump()}

    def close_position(self, pos_id: str, reason: str = "MANUAL_CLOSE") -> Dict[str, Any]:
        if pos_id not in self.positions:
            return {"success": False, "message": "Position not found"}

        pos = self.positions.pop(pos_id)
        exit_price = self.get_latest_market_price(pos.symbol)
        gross_pnl = (exit_price - pos.entry_price) * pos.quantity if pos.direction == "LONG" else (pos.entry_price - exit_price) * pos.quantity
        fees = 20.0
        net_pnl = round(gross_pnl - fees, 2)

        self.cash_balance += net_pnl

        record = PaperTradeRecord(
            id=f"rec-{len(self.trade_history) + 1}",
            symbol=pos.symbol,
            direction=pos.direction,
            entry_price=pos.entry_price,
            exit_price=round(exit_price, 2),
            quantity=pos.quantity,
            net_pnl=net_pnl,
            fees=fees,
            entry_time=pos.entry_time,
            exit_time=time.strftime("%Y-%m-%d %H:%M:%S"),
            reason=reason
        )
        self.trade_history.insert(0, record)

        return {"success": True, "message": f"Closed {pos.symbol} position with net P&L ₹{net_pnl:.2f}", "record": record.model_dump()}

    def get_account_state(self) -> PaperAccountState:
        total_unrealized = 0.0
        active_list = []

        for pid, pos in self.positions.items():
            curr = self.get_latest_market_price(pos.symbol)
            pos.current_price = curr
            pnl = (curr - pos.entry_price) * pos.quantity if pos.direction == "LONG" else (pos.entry_price - curr) * pos.quantity
            pos.unrealized_pnl = round(pnl, 2)
            total_unrealized += pnl
            active_list.append(pos)

        total_equity = round(self.cash_balance + total_unrealized, 2)
        realized_pnl = round(self.cash_balance - self.initial_balance, 2)
        dd_pct = max(0.0, round(((self.initial_balance - total_equity) / self.initial_balance) * 100, 2))

        return PaperAccountState(
            initial_balance=self.initial_balance,
            cash_balance=round(self.cash_balance, 2),
            total_equity=total_equity,
            realized_pnl=realized_pnl,
            unrealized_pnl=round(total_unrealized, 2),
            daily_loss_limit_pct=self.daily_loss_limit_pct,
            daily_drawdown_pct=dd_pct,
            active_positions=active_list,
            trade_history=self.trade_history[:20]
        )

paper_manager = PaperTradingManager()
