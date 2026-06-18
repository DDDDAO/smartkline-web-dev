import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TradingFoxPosition, TradingFoxStrategyDetail } from "@/app/_lib/tradingfox-control-plane";
import type { PerformanceCurveWindow } from "@/components/charts/performance-curve";
import type { MarketSymbol } from "@/app/_types/market";

export type StrategyCopy = WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
export type StrategyDetailCurveWindow = Extract<PerformanceCurveWindow, "24h" | "7d" | "30d" | "90d">;
export type SignalSourcePosition = TradingFoxStrategyDetail["signalSources"][number]["positions"][number];
export type TradingFoxOrderItem = NonNullable<TradingFoxStrategyDetail["orderHistory"]>["items"][number];
export type TradingFoxSignalSourceOrderItem = NonNullable<TradingFoxStrategyDetail["orderHistory"]>["signalSourceOrders"][number];
export type TradingFoxTradeLogItem = NonNullable<TradingFoxStrategyDetail["orderHistory"]>["tradeLogs"][number];
export type CopyPositionMarkPricesBySymbol = ReadonlyMap<string, number>;
export type SignalSourceIdentityById = ReadonlyMap<string, TradeHistorySourceIdentity>;

export const EMPTY_TRADING_FOX_POSITIONS: readonly TradingFoxPosition[] = [];

export type TradeHistorySourceIdentity = {
  avatarUrl: string | null;
  id: string;
  name: string;
};

export type TradeHistoryRow = {
  action: string | undefined;
  id: string;
  kind: "me" | "signalSource" | "tradeLog";
  order: TradingFoxOrderItem | null;
  price: number | null;
  quantity: number | null;
  side: string | undefined;
  signalSourceOrder: TradingFoxSignalSourceOrderItem | null;
  source: TradeHistorySourceIdentity;
  sourceTimeMs: number;
  status: string | undefined;
  symbol: string;
  timestamp: string;
  tradeLog: TradingFoxTradeLogItem | null;
};

export type TradeHistorySymbolOption = {
  count: number;
  label: string;
  symbol: MarketSymbol;
};

export type PositionSummaryModel = {
  availableMargin: number | null;
  longRatio: number | null;
  positionCount: number;
  shortRatio: number | null;
  totalLeverage: number | null;
  totalMargin: number | null;
  totalNotional: number | null;
  totalPnlRate: number | null;
  unrealizedPnl: number | null;
};

export type NormalizedSummaryPosition = {
  margin: number | null;
  notional: number | null;
  pnl: number | null;
  side: string | undefined;
};

export type PositionSummaryTotals = {
  longRatio: number | null;
  positionCount: number;
  shortRatio: number | null;
  totalNotional: number | null;
  totalPnl: number | null;
  usedMargin: number | null;
};
