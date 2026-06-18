import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import type { ChartTheme } from "@/components/charts/kline-chart/types";
import type { CopyTradingDirection, CopyTradingEventType } from "@/types/copy-trading";
import type { MarketCandle, MarketSymbol } from "@/types/market";

export type DrawnTradePoint = {
  actionLabel?: string;
  avatarImage: HTMLImageElement | null;
  avatarUrl: string | null;
  detail?: string;
  direction?: CopyTradingDirection;
  eventType?: CopyTradingEventType;
  id: string;
  initials: string;
  isActive: boolean;
  occurredAtText?: string;
  priceText?: string | null;
  side: "buy" | "sell";
  signalId: string;
  textMarkerLabel: string | null;
  title: string;
  traderName?: string;
  width: number;
  height: number;
  x: number;
  y: number;
};

export type KlineTradePointMarker = {
  actionLabel?: string;
  avatarUrl?: string | null;
  detail?: string;
  direction?: CopyTradingDirection;
  eventType?: CopyTradingEventType;
  id: string;
  occurredAtText?: string;
  price: number | null;
  priceText?: string | null;
  side: "buy" | "sell";
  signalId: string;
  sourceTimeMs: number;
  symbol?: MarketSymbol;
  title: string;
  traderName?: string;
};

export type TradePointPrimitiveOptions = {
  activeSignalId: string | null;
  candles: readonly MarketCandle[];
  markers: readonly KlineTradePointMarker[];
  theme: ChartTheme;
};

export type TradePointPrimitiveDrawingState = {
  items: readonly DrawnTradePoint[];
  theme: ChartTheme;
};

export type AttachedContext = {
  chart: IChartApi;
  requestUpdate: () => void;
  series: ISeriesApi<"Candlestick", Time>;
};

export type CachedAvatarImage = {
  image: HTMLImageElement | null;
  status: "error" | "loading" | "ready";
};

export type TradePointCandleCoordinates = {
  buyBoundaryY: number;
  sellBoundaryY: number;
  x: number;
};

export type VisibleTradeMarkerTimeRange = {
  fromMs: number;
  toMs: number;
};
