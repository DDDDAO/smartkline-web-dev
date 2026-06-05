import { LineStyle } from "lightweight-charts";
import type { MarketCandle } from "@/app/_types/market";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { StructuredSignal } from "@/app/_types/signal";
import type { ChartTheme } from "@/app/_components/kline-chart";
import type { SignalPriceRangeSource, SignalPriceRayChartApi, SignalPriceRaySource } from "./signal-price-ray-types";

export function createSignalPriceRaySourceState(
  signal: StructuredSignal,
  paperPosition: PaperPositionRecord | null,
  theme: ChartTheme,
): { ranges: SignalPriceRangeSource[]; rays: SignalPriceRaySource[]; startTimeMs: number } | null {
  const startTimeMs = Date.parse(signal.created_at);
  if (!Number.isFinite(startTimeMs)) {
    return null;
  }

  const ranges: SignalPriceRangeSource[] = [];
  const rays: SignalPriceRaySource[] = [];
  const style = createSignalDrawingStyle(theme, paperPosition);
  ranges.push(...createSignalRiskRewardRanges(signal, paperPosition, style));

  if (signal.entry_min !== null && signal.entry_max !== null) {
    const minPrice = Math.min(signal.entry_min, signal.entry_max);
    const maxPrice = Math.max(signal.entry_min, signal.entry_max);

    if (minPrice !== maxPrice) {
      ranges.push({
        fillColor: style.entryRangeFillColor,
        maxPrice,
        minPrice,
      });
    }

    rays.push(
      { price: signal.entry_max, ...style.entryRay },
      { price: signal.entry_min, ...style.entryRay },
    );
  }

  if (signal.trigger_price !== null) {
    rays.push({ price: signal.trigger_price, ...style.entryRay });
  }

  if (signal.stop_loss !== null) {
    rays.push({ price: signal.stop_loss, ...style.stopLossRay });
  }

  for (const price of signal.take_profit) {
    rays.push({ price, ...style.takeProfitRay });
  }

  return { ranges, rays, startTimeMs };
}

function createSignalDrawingStyle(
  theme: ChartTheme,
  paperPosition: PaperPositionRecord | null,
): {
  entryRangeFillColor: string;
  entryRay: Omit<SignalPriceRaySource, "price">;
  riskRangeFillColor: string;
  rewardRangeFillColor: string;
  stopLossRay: Omit<SignalPriceRaySource, "price">;
  takeProfitRay: Omit<SignalPriceRaySource, "price">;
} {
  if (paperPosition?.status === "not-entered") {
    return {
      entryRangeFillColor: theme === "light" ? "rgba(8, 145, 178, 0.32)" : "rgba(34, 211, 238, 0.36)",
      entryRay: { color: "#0891b2", lineStyle: LineStyle.Solid, lineWidth: 3 },
      riskRangeFillColor: theme === "light" ? "rgba(239, 68, 68, 0.12)" : "rgba(248, 113, 113, 0.16)",
      rewardRangeFillColor: theme === "light" ? "rgba(34, 197, 94, 0.12)" : "rgba(74, 222, 128, 0.16)",
      stopLossRay: { color: "rgba(220, 38, 38, 0.62)", lineStyle: LineStyle.Dashed, lineWidth: 1 },
      takeProfitRay: { color: "rgba(22, 163, 74, 0.62)", lineStyle: LineStyle.Dashed, lineWidth: 1 },
    };
  }

  if (paperPosition?.status === "entered") {
    return {
      entryRangeFillColor: theme === "light" ? "rgba(8, 145, 178, 0.08)" : "rgba(34, 211, 238, 0.10)",
      entryRay: { color: "rgba(8, 145, 178, 0.52)", lineStyle: LineStyle.Dashed, lineWidth: 1 },
      riskRangeFillColor: theme === "light" ? "rgba(239, 68, 68, 0.20)" : "rgba(248, 113, 113, 0.22)",
      rewardRangeFillColor: theme === "light" ? "rgba(34, 197, 94, 0.20)" : "rgba(74, 222, 128, 0.22)",
      stopLossRay: { color: "#dc2626", lineStyle: LineStyle.Solid, lineWidth: 3 },
      takeProfitRay: { color: "#16a34a", lineStyle: LineStyle.Solid, lineWidth: 3 },
    };
  }

  if (paperPosition?.status === "exited") {
    return {
      entryRangeFillColor: theme === "light" ? "rgba(8, 145, 178, 0.05)" : "rgba(34, 211, 238, 0.06)",
      entryRay: { color: "rgba(8, 145, 178, 0.40)", lineStyle: LineStyle.Dashed, lineWidth: 1 },
      riskRangeFillColor: theme === "light" ? "rgba(239, 68, 68, 0.08)" : "rgba(248, 113, 113, 0.10)",
      rewardRangeFillColor: theme === "light" ? "rgba(34, 197, 94, 0.08)" : "rgba(74, 222, 128, 0.10)",
      stopLossRay: { color: "rgba(220, 38, 38, 0.44)", lineStyle: LineStyle.Dashed, lineWidth: 1 },
      takeProfitRay: { color: "rgba(22, 163, 74, 0.44)", lineStyle: LineStyle.Dashed, lineWidth: 1 },
    };
  }

  return {
    entryRangeFillColor: theme === "light" ? "rgba(8, 145, 178, 0.22)" : "rgba(34, 211, 238, 0.26)",
    entryRay: { color: "#0891b2", lineStyle: LineStyle.Solid, lineWidth: 2 },
    riskRangeFillColor: theme === "light" ? "rgba(239, 68, 68, 0.14)" : "rgba(248, 113, 113, 0.18)",
    rewardRangeFillColor: theme === "light" ? "rgba(34, 197, 94, 0.14)" : "rgba(74, 222, 128, 0.18)",
    stopLossRay: { color: "#dc2626", lineStyle: LineStyle.Solid, lineWidth: 2 },
    takeProfitRay: { color: "#16a34a", lineStyle: LineStyle.Solid, lineWidth: 2 },
  };
}

function createSignalRiskRewardRanges(
  signal: StructuredSignal,
  paperPosition: PaperPositionRecord | null,
  style: Pick<ReturnType<typeof createSignalDrawingStyle>, "riskRangeFillColor" | "rewardRangeFillColor">,
): SignalPriceRangeSource[] {
  const anchors = resolveRiskRewardAnchors(signal, paperPosition);
  if (!anchors) {
    return [];
  }

  const ranges: SignalPriceRangeSource[] = [];
  const stopLoss = normalizePositivePrice(signal.stop_loss);
  const takeProfit = resolveRewardRangeTakeProfit(signal, anchors.rewardAnchorPrice);

  if (stopLoss !== null && isStopLossValid(signal.direction, anchors.riskAnchorPrice, stopLoss)) {
    ranges.push({
      fillColor: style.riskRangeFillColor,
      maxPrice: Math.max(anchors.riskAnchorPrice, stopLoss),
      minPrice: Math.min(anchors.riskAnchorPrice, stopLoss),
    });
  }

  if (takeProfit !== null) {
    ranges.push({
      fillColor: style.rewardRangeFillColor,
      maxPrice: Math.max(anchors.rewardAnchorPrice, takeProfit),
      minPrice: Math.min(anchors.rewardAnchorPrice, takeProfit),
    });
  }

  return ranges;
}

function resolveRiskRewardAnchors(
  signal: StructuredSignal,
  paperPosition: PaperPositionRecord | null,
): { rewardAnchorPrice: number; riskAnchorPrice: number } | null {
  const entryMin = normalizePositivePrice(signal.entry_min);
  const entryMax = normalizePositivePrice(signal.entry_max);
  if (entryMin !== null && entryMax !== null) {
    const lowerEntryBoundary = Math.min(entryMin, entryMax);
    const upperEntryBoundary = Math.max(entryMin, entryMax);

    /**
     * Range entries have their own blue zone. Risk/reward fills start from the
     * range edge that faces the stop/target so the red and green areas do not
     * overlap the entry zone.
     */
    return signal.direction === "long"
      ? { riskAnchorPrice: lowerEntryBoundary, rewardAnchorPrice: upperEntryBoundary }
      : { riskAnchorPrice: upperEntryBoundary, rewardAnchorPrice: lowerEntryBoundary };
  }

  const entryPrice = resolveSignalEntryReferencePrice(signal, paperPosition);
  return entryPrice === null ? null : { riskAnchorPrice: entryPrice, rewardAnchorPrice: entryPrice };
}

function resolveSignalEntryReferencePrice(signal: StructuredSignal, paperPosition: PaperPositionRecord | null): number | null {
  const filledEntryPrice = normalizePositivePrice(paperPosition?.entryPrice ?? null);
  if (filledEntryPrice !== null) {
    return filledEntryPrice;
  }

  const triggerPrice = normalizePositivePrice(signal.trigger_price);
  if (triggerPrice !== null) {
    return triggerPrice;
  }

  const entryMin = normalizePositivePrice(signal.entry_min);
  const entryMax = normalizePositivePrice(signal.entry_max);
  if (entryMin !== null && entryMax !== null) {
    return (entryMin + entryMax) / 2;
  }

  return null;
}

function resolveRewardRangeTakeProfit(signal: StructuredSignal, anchorPrice: number): number | null {
  const validTakeProfits = signal.take_profit
    .map(normalizePositivePrice)
    .filter((price): price is number => price !== null)
    .filter((price) => signal.direction === "long" ? price > anchorPrice : price < anchorPrice);

  if (validTakeProfits.length === 0) {
    return null;
  }

  /**
   * The green plan zone should communicate the full intended reward envelope,
   * not just TP1. Keep the API/display order semantics: TP3 is the third valid
   * take-profit level, falling back to the last available TP when fewer exist.
   */
  return validTakeProfits[Math.min(2, validTakeProfits.length - 1)];
}

function isStopLossValid(direction: StructuredSignal["direction"], entryPrice: number, stopLoss: number): boolean {
  return direction === "long" ? stopLoss < entryPrice : stopLoss > entryPrice;
}

function normalizePositivePrice(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value > 0 ? value : null;
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
