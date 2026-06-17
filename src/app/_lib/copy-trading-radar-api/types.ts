import type {
  CopyTradingDirection,
  CopyTradingEvent,
  CopyTradingEventType,
} from "@/app/_types/copy-trading";
import type { MarketCandle } from "@/app/_types/market";

export type CopyTradingSignalSourceSortKey =
  | "aum"
  | "copierPnl"
  | "followers"
  | "maxDrawdown"
  | "pnl"
  | "roi"
  | "sharpeRatio";

export type SignalCenterSignalSource = {
  id: string;
  name: string;
  signalType: string;
  status: string;
  margin: string;
  leaderId: string;
  leaderPrivate: boolean;
  positionShow: boolean;
  avatarUrl?: string | null;
  url?: string | null;
  isSpot: boolean;
  private: boolean;
  isAdmin: boolean;
  positionsSyncedTime?: string | null;
};

export type SignalCenterPositionSnapshot = {
  key: {
    signalSourceId: string;
    symbol: string;
    side: string;
  };
  qty: string;
  leverage?: number;
  marginSnapshot?: string;
  margin_snapshot?: string;
  markPrice?: string;
  mark_price?: string;
  currentPrice?: string;
  current_price?: string;
  price?: string;
  entryPrice?: string;
  entry_price?: string;
  notionalValue?: string;
  notional_value?: string;
  unPnl?: string;
  un_pnl?: string;
  unrealizedPnl?: string;
  unrealized_pnl?: string;
  metadata?: Record<string, unknown>;
  sourceUpdatedAt?: string;
  updatedAt?: string;
};

export type SignalCenterTradeEvent = {
  eventId: string;
  exchange: string;
  signalType: string;
  signalSourceId: string;
  symbol: string;
  side: string;
  action: string;
  prevQty: string;
  currQty: string;
  deltaQty: string;
  isFullClose: boolean;
  price?: number | string | null;
  priceSource?: string | null;
  price_source?: string | null;
  entryPrice?: number | string | null;
  entry_price?: number | string | null;
  markPrice?: number | string | null;
  mark_price?: number | string | null;
  skipped?: boolean | string | null;
  status?: string | null;
  tradeStatus?: string | null;
  trade_status?: string | null;
  sourceTimestamp: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type SignalSourcesResponse = {
  sources?: SignalCenterSignalSource[] | null;
};

export type PositionsResponse = {
  positions?: SignalCenterPositionSnapshot[] | null;
};

export type TradesResponse = {
  sourceId?: string | null;
  trades?: SignalCenterTradeEvent[] | null;
  meta?: {
    hasMore?: boolean | null;
    includeSkipped?: boolean | null;
    limit?: number | null;
    offset?: number | null;
    returnedCount?: number | null;
  } | null;
};

export type SignalCenterReturnCurvePoint = {
  date?: string | null;
  amount?: number | string | null;
  pnlRate?: number | string | null;
  pnl_rate?: number | string | null;
  pnl?: number | string | null;
  pnlAmount?: number | string | null;
  pnl_amount?: number | string | null;
  ratio?: number | string | null;
  returnPercent?: number | string | null;
  returnRate?: number | string | null;
  return_rate?: number | string | null;
  return_percent?: number | string | null;
  roi?: number | string | null;
  roiPercent?: number | string | null;
  roi_percent?: number | string | null;
  statTime?: number | string | null;
  stat_time?: number | string | null;
  time?: number | string | null;
  timestamp?: number | string | null;
  totalPnl?: number | string | null;
  total_pnl?: number | string | null;
  value?: number | string | null;
};

export type SignalCenterReturnCurveResponse = {
  curve?: SignalCenterReturnCurvePoint[] | null;
  data?: SignalCenterReturnCurvePoint[] | {
    curve?: SignalCenterReturnCurvePoint[] | null;
    items?: SignalCenterReturnCurvePoint[] | null;
    points?: SignalCenterReturnCurvePoint[] | null;
  } | null;
  items?: SignalCenterReturnCurvePoint[] | null;
  points?: SignalCenterReturnCurvePoint[] | null;
  sourceId?: string | null;
  source_id?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  window?: string | null;
};

export type SignalCenterRadarSourcePerformance = {
  aum?: number | string | null;
  copierPnl?: number | string | null;
  copier_pnl?: number | string | null;
  copierPnlAsset?: string | null;
  copier_pnl_asset?: string | null;
  followers?: number | string | null;
  marginBalance?: number | string | null;
  margin_balance?: number | string | null;
  maxDrawdown?: number | string | null;
  max_drawdown?: number | string | null;
  pnl?: number | string | null;
  pnlCurve?: SignalCenterReturnCurvePoint[] | null;
  pnl_curve?: SignalCenterReturnCurvePoint[] | null;
  returnCurve?: SignalCenterReturnCurvePoint[] | null;
  return_curve?: SignalCenterReturnCurvePoint[] | null;
  roi?: number | string | null;
  sharpeRatio?: number | string | null;
  sharpe_ratio?: number | string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  winRate?: number | string | null;
  win_rate?: number | string | null;
  window?: string | null;
};

export type SignalCenterListSignalSourceMetrics = {
  aum?: number | string | null;
  aumAmount?: number | string | null;
  aum_amount?: number | string | null;
  copierPnl?: number | string | null;
  copier_pnl?: number | string | null;
  copierPnlAsset?: string | null;
  copier_pnl_asset?: string | null;
  followerPnl?: number | string | null;
  follower_pnl?: number | string | null;
  followers?: number | string | null;
  marginBalance?: number | string | null;
  margin_balance?: number | string | null;
  maxDrawdown?: number | string | null;
  max_drawdown?: number | string | null;
  pnl?: number | string | null;
  pnlPoints?: SignalCenterReturnCurvePoint[] | null;
  pnl_points?: SignalCenterReturnCurvePoint[] | null;
  roi?: number | string | null;
  roiPoints?: SignalCenterReturnCurvePoint[] | null;
  roi_points?: SignalCenterReturnCurvePoint[] | null;
  sharpe?: number | string | null;
  sharpeRatio?: number | string | null;
  sharpe_ratio?: number | string | null;
  totalPositions?: number | string | null;
  total_positions?: number | string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  winRate?: number | string | null;
  win_rate?: number | string | null;
  window?: string | null;
  winningPositions?: number | string | null;
  winning_positions?: number | string | null;
};

export type SignalCenterListSignalSourceExchangeData = {
  raw?: Record<string, unknown> | null;
};

export type CopyTradingTradeHistoryPage = {
  events: CopyTradingEvent[];
  hasMore: boolean;
  nextOffset: number;
  returnedCount: number;
};

export type SignalCenterRadarSourceRuntime = {
  exchangeData?: SignalCenterListSignalSourceExchangeData | null;
  metrics?: SignalCenterListSignalSourceMetrics | null;
  performance?: SignalCenterRadarSourcePerformance | null;
  positions?: SignalCenterPositionSnapshot[] | null;
  source?: SignalCenterSignalSource | null;
  trades?: SignalCenterTradeEvent[] | null;
};

export type SignalCenterRadarSnapshotResponse = {
  meta?: {
    matchedSourceCount?: number;
    returnedSourceCount?: number;
    signalType?: string;
    sourceCount?: number;
    sourceLimit?: number;
    tradeLimit?: number;
  } | null;
  sources?: SignalCenterRadarSourceRuntime[] | null;
  updatedAt?: string | null;
};

export type SourceRuntimeData = {
  performance: SignalCenterRadarSourcePerformance | null;
  positions: SignalCenterPositionSnapshot[];
  source: SignalCenterSignalSource;
  trades: SignalCenterTradeEvent[];
};

export type MockMarketReference = {
  candles: readonly MarketCandle[];
  fallbackPrice: number;
  symbol: string;
};

export type MockPositionBlueprint = {
  direction: CopyTradingDirection;
  entryPriceRatio: number;
  leverage: number;
  notional: number;
  qty: number;
  sourceId: string;
  sourceUpdatedAtMinuteOffset: number;
  symbol: string;
};

export type MockTradeBlueprint = {
  action: string;
  currQty: number;
  eventType?: CopyTradingEventType;
  isFullClose?: boolean;
  minuteOffset: number;
  prevQty: number;
  side: CopyTradingDirection;
  sourceId: string;
  symbol: string;
};
