import { LineStyle } from "lightweight-charts";
import { getWorkspaceCopy, type WorkspaceLanguage } from "@/i18n/workspace";
import type { MarketCandle } from "@/app/_types/market";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { StructuredSignal } from "@/app/_types/signal";
import type { ChartTheme } from "@/app/_components/kline-chart/types";
import type { SignalPriceRangeSource, SignalPriceRayChartApi, SignalPriceRaySource } from "./signal-price-ray-types";

export function createSignalPriceRaySourceState(
  signal: StructuredSignal,
  paperPosition: PaperPositionRecord | null,
  theme: ChartTheme,
  language: WorkspaceLanguage = "zh-CN",
): { ranges: SignalPriceRangeSource[]; rays: SignalPriceRaySource[]; startTimeMs: number } | null {
  const copy = getWorkspaceCopy(language);
  const startTimeMs = Date.parse(signal.created_at);
  if (!Number.isFinite(startTimeMs)) {
    return null;
  }

  const ranges: SignalPriceRangeSource[] = [];
  const rays: SignalPriceRaySource[] = [];
  const style = createSignalDrawingStyle(theme, paperPosition);
  const isExited = paperPosition?.status === "exited";
  const endTimeMs = isExited ? paperPosition.exitTimeMs ?? undefined : undefined;

  ranges.push(...createSignalRiskRewardRanges(signal, paperPosition, style, endTimeMs));

  if (signal.entry_min !== null && signal.entry_max !== null) {
    const minPrice = Math.min(signal.entry_min, signal.entry_max);
    const maxPrice = Math.max(signal.entry_min, signal.entry_max);

    if (minPrice !== maxPrice) {
      ranges.push({
        endTimeMs,
        fillColor: style.entryRangeFillColor,
        maxPrice,
        minPrice,
      });
    }

    rays.push(
      { label: isExited ? copy.kline.entryUpper : undefined, price: signal.entry_max, endTimeMs, ...style.entryRay },
      { label: isExited ? copy.kline.entryLower : undefined, price: signal.entry_min, endTimeMs, ...style.entryRay },
    );
  }

  if (signal.trigger_price !== null) {
    rays.push({ label: isExited ? copy.kline.entry : undefined, price: signal.trigger_price, endTimeMs, ...style.entryRay });
  }

  if (signal.stop_loss !== null) {
    rays.push({ label: isExited ? copy.kline.stopLoss : undefined, price: signal.stop_loss, endTimeMs, ...style.stopLossRay });
  }

  for (const [index, price] of signal.take_profit.entries()) {
    rays.push({ label: isExited ? copy.kline.takeProfit(index + 1) : undefined, price, endTimeMs, ...style.takeProfitRay });
  }

  return { ranges, rays, startTimeMs };
}

function createSignalDrawingStyle(
  theme: ChartTheme,
  paperPosition: PaperPositionRecord | null,
): {
  entryRangeFillColor: string;
  entryRay: Omit<SignalPriceRaySource, "endTimeMs" | "label" | "price">;
  riskRangeFillColor: string;
  rewardRangeFillColor: string;
  stopLossRay: Omit<SignalPriceRaySource, "endTimeMs" | "label" | "price">;
  takeProfitRay: Omit<SignalPriceRaySource, "endTimeMs" | "label" | "price">;
} {
  if (paperPosition?.status === "not-entered") {
    return {
      entryRangeFillColor: theme === "light" ? "rgba(8, 145, 178, 0.32)" : "rgba(34, 211, 238, 0.36)",
      entryRay: { color: "#0891b2", lineStyle: LineStyle.Solid, lineWidth: 3 },
      riskRangeFillColor: theme === "light" ? "rgba(246, 70, 93, 0.12)" : "rgba(246, 70, 93, 0.16)",
      rewardRangeFillColor: createTakeProfitFillColor(theme, 0.12, 0.16),
      stopLossRay: { color: "#F6465D", lineStyle: LineStyle.Dashed, lineWidth: 1 },
      takeProfitRay: { color: createTakeProfitFillColor(theme, 0.62, 0.62), lineStyle: LineStyle.Dashed, lineWidth: 1 },
    };
  }

  if (paperPosition?.status === "entered") {
    return {
      entryRangeFillColor: theme === "light" ? "rgba(8, 145, 178, 0.08)" : "rgba(34, 211, 238, 0.10)",
      entryRay: { color: "rgba(8, 145, 178, 0.52)", lineStyle: LineStyle.Dashed, lineWidth: 1 },
      riskRangeFillColor: theme === "light" ? "rgba(246, 70, 93, 0.08)" : "rgba(246, 70, 93, 0.10)",
      rewardRangeFillColor: createTakeProfitFillColor(theme, 0.08, 0.10),
      stopLossRay: { color: "#F6465D", lineStyle: LineStyle.Solid, lineWidth: 3 },
      takeProfitRay: { color: createTakeProfitLineColor(theme), lineStyle: LineStyle.Solid, lineWidth: 3 },
    };
  }

  if (paperPosition?.status === "exited") {
    const secondaryEntryColor = theme === "light" ? "rgba(8, 145, 178, 0.54)" : "rgba(34, 211, 238, 0.60)";
    const secondaryStopColor = theme === "light" ? "rgba(246, 70, 93, 0.58)" : "rgba(255, 116, 133, 0.64)";
    const secondaryTargetColor = theme === "light" ? "rgba(47, 189, 133, 0.58)" : "rgba(69, 220, 166, 0.64)";
    const exitedStopColor = paperPosition.exitReason === "stop-loss" ? "#F6465D" : secondaryStopColor;
    const exitedTargetColor = paperPosition.exitReason === "take-profit" ? "#2FBD85" : secondaryTargetColor;

    return {
      entryRangeFillColor: theme === "light" ? "rgba(8, 145, 178, 0.05)" : "rgba(34, 211, 238, 0.06)",
      entryRay: { color: secondaryEntryColor, lineStyle: LineStyle.Solid, lineWidth: 1 },
      riskRangeFillColor: theme === "light" ? "rgba(246, 70, 93, 0.08)" : "rgba(246, 70, 93, 0.10)",
      rewardRangeFillColor: createTakeProfitFillColor(theme, 0.08, 0.10),
      stopLossRay: { color: exitedStopColor, lineStyle: LineStyle.Solid, lineWidth: paperPosition.exitReason === "stop-loss" ? 2 : 1 },
      takeProfitRay: { color: exitedTargetColor, lineStyle: LineStyle.Solid, lineWidth: paperPosition.exitReason === "take-profit" ? 2 : 1 },
    };
  }

  return {
    entryRangeFillColor: theme === "light" ? "rgba(8, 145, 178, 0.22)" : "rgba(34, 211, 238, 0.26)",
    entryRay: { color: "#0891b2", lineStyle: LineStyle.Solid, lineWidth: 2 },
    riskRangeFillColor: theme === "light" ? "rgba(246, 70, 93, 0.07)" : "rgba(246, 70, 93, 0.09)",
    rewardRangeFillColor: createTakeProfitFillColor(theme, 0.07, 0.09),
    stopLossRay: { color: "#F6465D", lineStyle: LineStyle.Solid, lineWidth: 2 },
    takeProfitRay: { color: createTakeProfitLineColor(theme), lineStyle: LineStyle.Solid, lineWidth: 2 },
  };
}

function createTakeProfitLineColor(theme: ChartTheme): string {
  return theme === "light" ? "#2FBD85" : "#2FBD85";
}

function createTakeProfitFillColor(theme: ChartTheme, lightOpacity: number, darkOpacity: number): string {
  if (theme === "light") {
    return `rgba(47, 189, 133, ${lightOpacity})`;
  }

  return `rgba(47, 189, 133, ${darkOpacity})`;
}

function createSignalRiskRewardRanges(
  signal: StructuredSignal,
  paperPosition: PaperPositionRecord | null,
  style: Pick<ReturnType<typeof createSignalDrawingStyle>, "riskRangeFillColor" | "rewardRangeFillColor">,
  endTimeMs: number | undefined,
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
      endTimeMs,
      fillColor: style.riskRangeFillColor,
      maxPrice: Math.max(anchors.riskAnchorPrice, stopLoss),
      minPrice: Math.min(anchors.riskAnchorPrice, stopLoss),
    });
  }

  if (takeProfit !== null) {
    ranges.push({
      endTimeMs,
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
     * range edge that faces the stop/target so those areas do not overlap it.
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
