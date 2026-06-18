import type { ISeriesApi } from "lightweight-charts";
import type { KlineInterval, MarketCandle } from "@/types/market";
import type { KlineChartMetrics } from "./chart-metrics";
import { KLINE_PRICE_FORMAT } from "./series-data";
import type { PriceColorMode } from "./types";

export const CANDLE_COUNTDOWN_UPDATE_MS = 1_000;

const KLINE_INTERVAL_MS_BY_INTERVAL: Record<KlineInterval, number> = {
  "1d": 86_400_000,
  "1h": 3_600_000,
  "1m": 60_000,
  "4h": 14_400_000,
  "5m": 300_000,
  "15m": 900_000,
};

export function formatKlineCandleCountdown(candle: MarketCandle | null, interval: KlineInterval): string {
  if (!candle || !Number.isFinite(candle.sourceTimeMs)) {
    return "";
  }

  const intervalMs = KLINE_INTERVAL_MS_BY_INTERVAL[interval];
  const remainingSeconds = Math.max(
    0,
    Math.ceil((candle.sourceTimeMs + intervalMs - Date.now()) / 1_000),
  );
  const hours = Math.floor(remainingSeconds / 3_600);
  const minutes = Math.floor((remainingSeconds % 3_600) / 60);
  const seconds = remainingSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function renderCurrentPriceTag(input: {
  candle: MarketCandle | null;
  countdownText: string;
  element: HTMLDivElement | null;
  metrics: KlineChartMetrics;
  priceColorMode: PriceColorMode;
  series: ISeriesApi<"Candlestick"> | null;
}): void {
  const { candle, countdownText, element, metrics, priceColorMode, series } = input;
  const container = element?.parentElement;
  if (!element || !container || !series || !candle || !countdownText) {
    hideCurrentPriceTag(element);
    return;
  }

  const coordinate = series.priceToCoordinate(candle.close);
  if (coordinate === null || !Number.isFinite(coordinate)) {
    hideCurrentPriceTag(element);
    return;
  }

  const tagColor = getCurrentCandleColor(candle, priceColorMode);
  const containerHeight = container.clientHeight;
  const top = clampNumber(
    coordinate - metrics.currentPriceTagHeight / 2,
    4,
    Math.max(4, containerHeight - metrics.currentPriceTagHeight - 4),
  );
  const { countdown, priceText } = ensureCurrentPriceTagChildren(element);

  priceText.textContent = KLINE_PRICE_FORMAT.formatter(candle.close);
  priceText.style.fontSize = `${metrics.currentPriceTagFontSize}px`;
  priceText.style.lineHeight = `${metrics.currentPriceTagLineHeight}px`;

  countdown.textContent = countdownText;
  countdown.style.fontSize = `${metrics.currentPriceTagFontSize}px`;
  countdown.style.lineHeight = `${metrics.currentPriceTagLineHeight}px`;

  element.style.alignItems = "flex-start";
  element.style.background = tagColor;
  element.style.borderRadius = "6px";
  element.style.boxShadow = "0 8px 18px rgba(15, 23, 42, 0.12)";
  element.style.color = "#FFFFFF";
  element.style.display = "flex";
  element.style.flexDirection = "column";
  element.style.fontVariantNumeric = "tabular-nums";
  element.style.fontWeight = "700";
  element.style.gap = "1px";
  element.style.justifyContent = "center";
  element.style.letterSpacing = "-0.02em";
  element.style.minHeight = `${metrics.currentPriceTagHeight}px`;
  element.style.overflow = "hidden";
  element.style.padding = "5px 8px";
  element.style.right = `${metrics.rightPriceScaleWidth - metrics.currentPriceTagWidth}px`;
  element.style.textAlign = "left";
  element.style.top = `${Math.round(top)}px`;
  element.style.whiteSpace = "nowrap";
  element.style.width = `${metrics.currentPriceTagWidth}px`;
  element.style.opacity = "1";
}

function ensureCurrentPriceTagChildren(element: HTMLDivElement): {
  countdown: HTMLSpanElement;
  priceText: HTMLSpanElement;
} {
  const firstChild = element.children.item(0);
  const secondChild = element.children.item(1);

  if (
    firstChild instanceof HTMLSpanElement &&
    secondChild instanceof HTMLSpanElement &&
    element.children.length === 2
  ) {
    return { countdown: secondChild, priceText: firstChild };
  }

  const priceText = document.createElement("span");
  const countdown = document.createElement("span");

  for (const child of [priceText, countdown]) {
    child.style.display = "block";
    child.style.fontFeatureSettings = "\"tnum\" 1, \"lnum\" 1";
    child.style.width = "100%";
  }
  countdown.style.opacity = "0.96";

  element.replaceChildren(priceText, countdown);
  return { countdown, priceText };
}

function hideCurrentPriceTag(element: HTMLDivElement | null): void {
  if (!element) {
    return;
  }

  element.style.opacity = "0";
}

function getCurrentCandleColor(candle: MarketCandle, priceColorMode: PriceColorMode): string {
  const up = priceColorMode === "positiveGreen" ? "#2FBD85" : "#F6465D";
  const down = priceColorMode === "positiveGreen" ? "#F6465D" : "#2FBD85";

  return candle.close >= candle.open ? up : down;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
