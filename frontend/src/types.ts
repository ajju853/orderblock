export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SwingPoint {
  index: number;
  timestamp: string;
  type: 'high' | 'low';
  price: number;
  confirmed_index: number;
  confirmed_time: string;
}

export interface StructureEvent {
  id: string;
  type: 'bullish_bos' | 'bearish_bos' | 'bullish_choch' | 'bearish_choch';
  price: number;
  broken_swing_price: number;
  event_index: number;
  event_time: string;
  confirmation_index: number;
  confirmation_time: string;
}

export interface OrderBlockZone {
  id: string;
  type: 'bullish' | 'bearish';
  low: number;
  high: number;
  eq_price: number;
  source_candle_index: number;
  source_candle_time: string;
  detected_index: number;
  detected_at: string;
  status: 'fresh' | 'tested' | 'mitigated' | 'invalidated';
  test_count: number;
  mitigation_time?: string;
  invalidation_time?: string;
  displacement_pct: number;
}

export interface FVGZone {
  id: string;
  type: 'bullish' | 'bearish';
  low: number;
  high: number;
  candle_index: number;
  detected_at: string;
  status: 'open' | 'mitigated' | 'filled';
  fill_pct: number;
}

export interface LiquidityLevel {
  id: string;
  type: 'EQH' | 'EQL';
  price: number;
  count: number;
  candle_indices: number[];
  status: 'active' | 'swept';
  swept_time?: string;
}

export interface SetupScore {
  overall_score: number;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  factors: Record<string, number>;
  rationale: string;
}

export interface EngineConfig {
  swing_left: number;
  swing_right: number;
  break_confirmation: 'close' | 'wick';
  zone_boundary: 'wick' | 'body';
  displacement_multiplier: number;
  mitigation_threshold: number;
  fvg_confirmation: boolean;
}

export interface AnalysisResult {
  symbol: string;
  timeframe: string;
  data_source: string;
  total_candles: number;
  latest_price: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'SIDEWAYS';
  candles: Candle[];
  swings: SwingPoint[];
  structure_events: StructureEvent[];
  order_blocks: OrderBlockZone[];
  fvgs: FVGZone[];
  liquidity_levels: LiquidityLevel[];
  score: SetupScore;
  config: EngineConfig;
}

export interface ScannerItem {
  symbol: string;
  timeframe: string;
  latest_price: number;
  trend: string;
  overall_score: number;
  direction: string;
  active_bullish_obs: number;
  active_bearish_obs: number;
  nearest_ob_distance_pct?: number;
  status_summary: string;
}

export interface Instrument {
  symbol: string;
  name: string;
  exchange: string;
  default_tf: string;
  candles_count: number;
}
