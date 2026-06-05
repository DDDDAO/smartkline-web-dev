import type { IChartApi, ISeriesApi, LineStyle, LineWidth } from "lightweight-charts";
import type { MarketCandle } from "@/app/_types/market";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { StructuredSignal } from "@/app/_types/signal";
import type { ChartTheme } from "@/app/_components/kline-chart";

export type SignalPriceRayPrimitiveOptions = {
  candles: readonly MarketCandle[];
  paperPosition: PaperPositionRecord | null;
  signal: StructuredSignal | null;
  theme: ChartTheme;
};

export type SignalPriceRaySource = {
  color: string;
  lineStyle: LineStyle;
  lineWidth: LineWidth;
  price: number;
};

export type SignalPriceRangeSource = {
  fillColor: string;
  maxPrice: number;
  minPrice: number;
  startTimeMs?: number;
};

export type SignalPriceRayDrawing = {
  color: string;
  lineStyle: LineStyle;
  lineWidth: LineWidth;
  priceCoordinate: number;
  startCoordinate: number;
};

export type SignalPriceRangeDrawing = {
  fillColor: string;
  maxCoordinate: number;
  minCoordinate: number;
  startCoordinate: number;
};

export type SignalPriceRayDrawingState = {
  ranges: SignalPriceRangeDrawing[];
  rays: SignalPriceRayDrawing[];
};

export type SignalPriceRayChartApi = Pick<IChartApi, "timeScale">;
export type SignalPriceRaySeriesApi = Pick<ISeriesApi<"Candlestick">, "priceToCoordinate">;
