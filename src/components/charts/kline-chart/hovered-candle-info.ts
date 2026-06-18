import type { ISeriesApi, MouseEventParams, Time } from "lightweight-charts";
import type { WorkspaceLanguage } from "@/i18n/workspace";
import type { MarketCandle } from "@/app/_types/market";
import { createChartPalette } from "./palette";
import { KLINE_PRICE_FORMAT } from "./series-data";
import type { ChartTheme, PriceColorMode } from "./types";

type HoveredCandleInfo = Pick<MarketCandle, "close" | "high" | "low" | "open">;

type HoveredCandleInfoPair = {
  label: HTMLSpanElement;
  value: HTMLSpanElement;
};

type HoveredCandleInfoChildren = {
  amplitude: HoveredCandleInfoPair;
  close: HoveredCandleInfoPair;
  high: HoveredCandleInfoPair;
  low: HoveredCandleInfoPair;
  open: HoveredCandleInfoPair;
  change: HTMLSpanElement;
};

const hoveredCandleInfoChildrenByElement = new WeakMap<HTMLDivElement, HoveredCandleInfoChildren>();

export function renderHoveredCandleInfo(input: {
  candles: readonly MarketCandle[];
  element: HTMLDivElement | null;
  language: WorkspaceLanguage;
  param: MouseEventParams<Time>;
  priceColorMode: PriceColorMode;
  series: ISeriesApi<"Candlestick">;
  theme: ChartTheme;
}): void {
  const { candles, element, language, param, priceColorMode, series, theme } = input;
  if (!element || !param.point) {
    hideHoveredCandleInfo(element);
    return;
  }

  const candle = readHoveredCandleInfo(param, series) ?? readHoveredCandleInfoFromTime(param.time, candles);
  if (!candle) {
    hideHoveredCandleInfo(element);
    return;
  }

  const labels = getHoveredCandleLabels(language);
  const change = candle.close - candle.open;
  const changeRatio = candle.open !== 0 ? change / candle.open : null;
  const amplitudeRatio = candle.open !== 0 ? (candle.high - candle.low) / candle.open : null;
  const valueColor = getHoveredCandleValueColor(change, theme, priceColorMode);
  const labelColor = theme === "dark" ? "#E5E7EB" : "#111827";
  const children = ensureHoveredCandleInfoChildren(element);

  element.style.alignItems = "center";
  element.style.display = "flex";
  element.style.fontVariantNumeric = "tabular-nums";
  element.style.gap = "10px";
  element.style.lineHeight = "1.2";
  element.style.opacity = "1";
  element.style.textShadow = theme === "dark" ? "0 1px 2px rgba(0,0,0,0.45)" : "0 1px 0 rgba(255,255,255,0.72)";

  setHoveredCandlePair(children.open, labels.open, formatKlineOhlcValue(candle.open), labelColor, valueColor);
  setHoveredCandlePair(children.high, labels.high, formatKlineOhlcValue(candle.high), labelColor, valueColor);
  setHoveredCandlePair(children.low, labels.low, formatKlineOhlcValue(candle.low), labelColor, valueColor);
  setHoveredCandlePair(children.close, labels.close, formatKlineOhlcValue(candle.close), labelColor, valueColor);
  setHoveredCandlePair(children.amplitude, labels.amplitude, formatKlinePercent(amplitudeRatio), labelColor, valueColor);
  children.change.textContent = `${formatSignedKlineDelta(change)} (${formatSignedKlinePercent(changeRatio)})`;
  children.change.style.color = valueColor;
}

export function hideHoveredCandleInfo(element: HTMLDivElement | null): void {
  if (!element) {
    return;
  }

  element.style.opacity = "0";
  element.style.display = "none";
}

function readHoveredCandleInfo(param: MouseEventParams<Time>, series: ISeriesApi<"Candlestick">): HoveredCandleInfo | null {
  return normalizeHoveredCandleInfo(param.seriesData.get(series));
}

function readHoveredCandleInfoFromTime(time: Time | undefined, candles: readonly MarketCandle[]): HoveredCandleInfo | null {
  if (typeof time !== "number") {
    return null;
  }

  return candles.find((candle) => candle.time === time) ?? null;
}

function normalizeHoveredCandleInfo(value: unknown): HoveredCandleInfo | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Record<keyof HoveredCandleInfo, unknown>>;
  const open = Number(candidate.open);
  const high = Number(candidate.high);
  const low = Number(candidate.low);
  const close = Number(candidate.close);

  if (![open, high, low, close].every(Number.isFinite)) {
    return null;
  }

  return { close, high, low, open };
}

function ensureHoveredCandleInfoChildren(element: HTMLDivElement): HoveredCandleInfoChildren {
  const cachedChildren = hoveredCandleInfoChildrenByElement.get(element);
  if (cachedChildren) {
    return cachedChildren;
  }

  const open = createHoveredCandleInfoPair("open");
  const high = createHoveredCandleInfoPair("high");
  const low = createHoveredCandleInfoPair("low");
  const close = createHoveredCandleInfoPair("close");
  const amplitude = createHoveredCandleInfoPair("amplitude");
  const change = document.createElement("span");
  change.dataset.ohlcChange = "true";
  change.style.display = "inline-block";
  change.style.fontWeight = "700";

  const children = {
    open,
    high,
    low,
    close,
    amplitude,
    change,
  };

  element.replaceChildren(open.group, high.group, low.group, close.group, amplitude.group, change);
  hoveredCandleInfoChildrenByElement.set(element, children);
  return children;
}

function createHoveredCandleInfoPair(key: string): HoveredCandleInfoPair & { group: HTMLSpanElement } {
  const group = document.createElement("span");
  const label = document.createElement("span");
  const value = document.createElement("span");

  group.dataset.ohlcGroup = key;
  group.style.display = "inline-flex";
  group.style.fontWeight = "700";
  group.style.gap = "0";
  group.style.minWidth = "0";
  label.dataset.ohlcLabel = "true";
  value.dataset.ohlcValue = "true";

  group.replaceChildren(label, value);
  return { group, label, value };
}

function setHoveredCandlePair(
  pair: HoveredCandleInfoPair,
  label: string,
  value: string,
  labelColor: string,
  valueColor: string,
): void {
  pair.label.textContent = label;
  pair.label.style.color = labelColor;
  pair.value.textContent = value;
  pair.value.style.color = valueColor;
}

function getHoveredCandleLabels(language: WorkspaceLanguage): { amplitude: string; close: string; high: string; low: string; open: string } {
  if (language === "en-US") {
    return { amplitude: "Amp=", close: "C=", high: "H=", low: "L=", open: "O=" };
  }

  return { amplitude: "振幅=", close: "收=", high: "高=", low: "低=", open: "开=" };
}

function getHoveredCandleValueColor(change: number, theme: ChartTheme, priceColorMode: PriceColorMode): string {
  if (change > 0) {
    return createChartPalette(theme, priceColorMode).up;
  }

  if (change < 0) {
    return createChartPalette(theme, priceColorMode).down;
  }

  return theme === "dark" ? "#CBD5E1" : "#334155";
}

function formatKlineOhlcValue(value: number): string {
  return KLINE_PRICE_FORMAT.formatter(value);
}

function formatSignedKlineDelta(value: number): string {
  if (value === 0) {
    return "0";
  }

  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${KLINE_PRICE_FORMAT.formatter(Math.abs(value))}`;
}

function formatSignedKlinePercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${(Math.abs(value) * 100).toFixed(2)}%`;
}

function formatKlinePercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return `${(value * 100).toFixed(2)}%`;
}
