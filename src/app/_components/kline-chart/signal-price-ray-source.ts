import { LineStyle } from "lightweight-charts";
import type { MarketCandle } from "@/app/_types/market";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { StructuredSignal } from "@/app/_types/signal";
import type { ChartTheme } from "@/app/_components/kline-chart";
import type { SignalPriceRayChartApi, SignalPriceRaySource } from "./signal-price-ray-types";

export function createSignalPriceRaySourceState(
  signal: StructuredSignal,
  paperPosition: PaperPositionRecord | null,
  theme: ChartTheme,
): { rays: SignalPriceRaySource[]; startTimeMs: number } | null {
  const startTimeMs = Date.parse(signal.created_at);
  if (!Number.isFinite(startTimeMs)) {
    return null;
  }

  const style = createSignalDrawingStyle(theme, paperPosition);
  const endTimeMs = paperPosition?.status === "exited" ? paperPosition.exitTimeMs ?? undefined : undefined;
  const rays: SignalPriceRaySource[] = [];

  if (signal.entry_min !== null && signal.entry_max !== null) {
    rays.push(
      { label: "入场上沿", price: signal.entry_max, endTimeMs, ...style.entryRay },
      { label: "入场下沿", price: signal.entry_min, endTimeMs, ...style.entryRay },
    );
  }

  if (signal.trigger_price !== null) {
    rays.push({ label: "入场", price: signal.trigger_price, endTimeMs, ...style.entryRay });
  }

  if (signal.stop_loss !== null) {
    rays.push({ label: "止损", price: signal.stop_loss, endTimeMs, ...style.stopLossRay });
  }

  for (const [index, price] of signal.take_profit.entries()) {
    rays.push({ label: `止盈${index + 1}`, price, endTimeMs, ...style.takeProfitRay });
  }

  return { rays, startTimeMs };
}

function createSignalDrawingStyle(
  theme: ChartTheme,
  paperPosition: PaperPositionRecord | null,
): {
  entryRay: Omit<SignalPriceRaySource, "endTimeMs" | "label" | "price">;
  stopLossRay: Omit<SignalPriceRaySource, "endTimeMs" | "label" | "price">;
  takeProfitRay: Omit<SignalPriceRaySource, "endTimeMs" | "label" | "price">;
} {
  const secondaryEntryColor = theme === "light" ? "rgba(8, 145, 178, 0.54)" : "rgba(34, 211, 238, 0.60)";
  const secondaryStopColor = theme === "light" ? "rgba(220, 38, 38, 0.58)" : "rgba(248, 113, 113, 0.64)";
  const secondaryTargetColor = theme === "light" ? "rgba(22, 163, 74, 0.58)" : "rgba(74, 222, 128, 0.64)";

  if (paperPosition?.status === "not-entered") {
    return {
      entryRay: { color: "#0891b2", lineStyle: LineStyle.Solid, lineWidth: 2 },
      stopLossRay: { color: secondaryStopColor, lineStyle: LineStyle.Solid, lineWidth: 1 },
      takeProfitRay: { color: secondaryTargetColor, lineStyle: LineStyle.Solid, lineWidth: 1 },
    };
  }

  if (paperPosition?.status === "entered") {
    return {
      entryRay: { color: secondaryEntryColor, lineStyle: LineStyle.Solid, lineWidth: 1 },
      stopLossRay: { color: "#dc2626", lineStyle: LineStyle.Solid, lineWidth: 2 },
      takeProfitRay: { color: "#16a34a", lineStyle: LineStyle.Solid, lineWidth: 2 },
    };
  }

  if (paperPosition?.status === "exited") {
    const exitedStopColor = paperPosition.exitReason === "stop-loss" ? "#dc2626" : secondaryStopColor;
    const exitedTargetColor = paperPosition.exitReason === "take-profit" ? "#16a34a" : secondaryTargetColor;

    return {
      entryRay: { color: secondaryEntryColor, lineStyle: LineStyle.Solid, lineWidth: 1 },
      stopLossRay: { color: exitedStopColor, lineStyle: LineStyle.Solid, lineWidth: paperPosition.exitReason === "stop-loss" ? 2 : 1 },
      takeProfitRay: { color: exitedTargetColor, lineStyle: LineStyle.Solid, lineWidth: paperPosition.exitReason === "take-profit" ? 2 : 1 },
    };
  }

  return {
    entryRay: { color: "#0891b2", lineStyle: LineStyle.Solid, lineWidth: 2 },
    stopLossRay: { color: "#dc2626", lineStyle: LineStyle.Solid, lineWidth: 1 },
    takeProfitRay: { color: "#16a34a", lineStyle: LineStyle.Solid, lineWidth: 1 },
  };
}

export function resolveSignalTimeCoordinate(
  chart: SignalPriceRayChartApi,
  candles: readonly MarketCandle[],
  sourceTimeMs: number,
): number | null {
  if (candles.length === 0 || !Number.isFinite(sourceTimeMs)) {
    return null;
  }

  const firstCandle = candles[0];
  const lastCandle = candles.at(-1);
  if (!firstCandle || !lastCandle) {
    return null;
  }

  if (sourceTimeMs <= firstCandle.sourceTimeMs) {
    return toNumberCoordinate(chart.timeScale().timeToCoordinate(firstCandle.time));
  }

  if (sourceTimeMs >= lastCandle.sourceTimeMs) {
    return toNumberCoordinate(chart.timeScale().timeToCoordinate(lastCandle.time));
  }

  const rightIndex = findFirstCandleIndexAtOrAfter(candles, sourceTimeMs);
  const rightCandle = candles[rightIndex];
  const leftCandle = candles[rightIndex - 1];
  if (!leftCandle || !rightCandle) {
    return null;
  }

  const leftCoordinate = toNumberCoordinate(chart.timeScale().timeToCoordinate(leftCandle.time));
  const rightCoordinate = toNumberCoordinate(chart.timeScale().timeToCoordinate(rightCandle.time));
  if (leftCoordinate === null || rightCoordinate === null) {
    return null;
  }

  const timeSpanMs = rightCandle.sourceTimeMs - leftCandle.sourceTimeMs;
  if (timeSpanMs <= 0) {
    return leftCoordinate;
  }

  const ratio = (sourceTimeMs - leftCandle.sourceTimeMs) / timeSpanMs;
  return leftCoordinate + (rightCoordinate - leftCoordinate) * ratio;
}

function findFirstCandleIndexAtOrAfter(candles: readonly MarketCandle[], sourceTimeMs: number): number {
  let leftIndex = 0;
  let rightIndex = candles.length - 1;

  while (leftIndex < rightIndex) {
    const middleIndex = Math.floor((leftIndex + rightIndex) / 2);
    if (candles[middleIndex].sourceTimeMs < sourceTimeMs) {
      leftIndex = middleIndex + 1;
    } else {
      rightIndex = middleIndex;
    }
  }

  return leftIndex;
}

function toNumberCoordinate(coordinate: number | null): number | null {
  return coordinate === null ? null : Number(coordinate);
}
