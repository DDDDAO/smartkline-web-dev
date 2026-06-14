import type { MarketSymbol } from "./market";

export type CopyTradingDirection = "long" | "short";
export type CopyTradingRiskLevel = "low" | "medium" | "high";
export type CopyTradingWatchStatus = "pinned" | "watching" | "custom";
export type CopyTradingPositionStatus = "holding" | "closed";

export type CopyTradingTrader = {
  trader_id: string;
  name: string;
  platform: string;
  avatar: string;
  followers: number;
  margin_balance: number | null;
  positions_synced_at: string | null;
  source_url: string | null;
  status: string;
  watch_status: CopyTradingWatchStatus;
  monthly_return: number;
  win_rate: number;
  max_drawdown: number;
  risk_level: CopyTradingRiskLevel;
};

export type CopyTradingPosition = {
  position_id: string;
  trader_id: string;
  symbol: string;
  direction: CopyTradingDirection;
  quantity: number;
  entry_price: number | null;
  current_price: number | null;
  leverage: number;
  margin_snapshot: number | null;
  notional_value: number;
  position_size_ratio: number;
  unrealized_pnl: number;
  open_time: string;
  status: CopyTradingPositionStatus;
};

export type CopyTradingEventType =
  | "open"
  | "add"
  | "reduce"
  | "close"
  | "reverse"
  | "take_profit"
  | "stop_loss"
  | "trailing_stop"
  | "oversized_position"
  | "losing_streak";

export type CopyTradingEvent = {
  event_id: string;
  trader_id: string;
  position_id?: string;
  symbol: string;
  direction: CopyTradingDirection;
  event_type: CopyTradingEventType;
  event_price: number | null;
  size_ratio_after: number | null;
  pnl_after: number | null;
  occurred_at: string;
  title: string;
  summary: string;
  severity: CopyTradingRiskLevel;
};

export type EquityEtfSignalSymbol = "QQQ" | "SPY" | "NVDA" | "TSLA" | "COIN" | "MSTR" | "IBIT" | "ETHA";
export type EquityEtfSignalStatus = "watching" | "active" | "cooldown" | "invalidated";

export type EquityEtfSignal = {
  signal_id: string;
  source: string;
  symbol: EquityEtfSignalSymbol;
  direction: CopyTradingDirection;
  status: EquityEtfSignalStatus;
  btc_correlation: number;
  eth_correlation: number;
  crypto_impact: string;
  updated_at: string;
};

export type CopyTradingRadarSnapshot = {
  traders: CopyTradingTrader[];
  positions: CopyTradingPosition[];
  events: CopyTradingEvent[];
  equity_etf_signals: EquityEtfSignal[];
  updated_at: string;
};

export type CopyTradingReturnCurveWindow = "7d" | "30d" | "90d" | "all";

export type CopyTradingReturnCurvePoint = {
  timestamp: number;
  /**
   * Signal Center normalizes return-curve values as ratios so the card can
   * share the workspace percent formatter. For example, 0.1234 is +12.34%.
   */
  value: number;
};

export type CopyTradingReturnCurve = {
  points: CopyTradingReturnCurvePoint[];
  sourceId: string;
  updatedAt: string | null;
  window: CopyTradingReturnCurveWindow | string;
};

export type CopyTradingChartSignalMeta = {
  eventId: string;
  traderId: string;
};

export type CopyTradingChartSignal = {
  id: string;
  symbol: MarketSymbol;
  meta: CopyTradingChartSignalMeta;
};

export type CopyTradingTradeMarkerSide = "buy" | "sell";

export type CopyTradingTradeMarker = {
  actionLabel: string;
  avatarUrl: string | null;
  detail: string;
  direction: CopyTradingDirection;
  eventId: string;
  eventType: CopyTradingEventType;
  id: string;
  occurredAtText: string;
  price: number | null;
  priceText: string | null;
  side: CopyTradingTradeMarkerSide;
  signalId: string;
  sourceTimeMs: number;
  symbol: MarketSymbol;
  title: string;
  traderId: string;
  traderName: string;
};
