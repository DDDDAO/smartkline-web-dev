import { LineStyle } from "lightweight-charts";
import type { MarketCandle } from "@/app/_types/market";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { SignalAiHighlightTone, SignalAiSummary } from "@/app/_lib/signal-ai-summary";
import type { StructuredSignal } from "@/app/_types/signal";
import type { ChartTheme } from "@/app/_components/kline-chart";
import type { SignalPriceRangeSource, SignalPriceRayChartApi, SignalPriceRaySource } from "./signal-price-ray-types";

export function createSignalPriceRaySourceState(
  signal: StructuredSignal,
  paperPosition: PaperPositionRecord | null,
  signalAiSummary: SignalAiSummary | null,
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

  if (signalAiSummary) {
    ranges.push(...signalAiSummary.highlights.map((range) => ({
      fillColor: createAiHighlightFillColor(theme, range.tone),
      maxPrice: range.maxPrice,
      minPrice: range.minPrice,
      startTimeMs: 0,
    })));
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
    return {
      entryRangeFillColor: theme === "light" ? "rgba(8, 145, 178, 0.05)" : "rgba(34, 211, 238, 0.06)",
      entryRay: { color: "rgba(8, 145, 178, 0.40)", lineStyle: LineStyle.Dashed, lineWidth: 1 },
      riskRangeFillColor: theme === "light" ? "rgba(246, 70, 93, 0.08)" : "rgba(246, 70, 93, 0.10)",
      rewardRangeFillColor: createTakeProfitFillColor(theme, 0.08, 0.10),
      stopLossRay: { color: "#F6465D", lineStyle: LineStyle.Dashed, lineWidth: 1 },
      takeProfitRay: { color: createTakeProfitFillColor(theme, 0.44, 0.44), lineStyle: LineStyle.Dashed, lineWidth: 1 },
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
): SignalPriceRangeSource[] {
  const entryPrice = resolveSignalEntryReferencePrice(signal, paperPosition);
  if (entryPrice === null) {
    return [];
  }

  const ranges: SignalPriceRangeSource[] = [];
  const stopLoss = normalizePositivePrice(signal.stop_loss);
  const takeProfit = resolvePrimaryTakeProfit(signal);

  if (stopLoss !== null && isStopLossValid(signal.direction, entryPrice, stopLoss)) {
    ranges.push({
      fillColor: style.riskRangeFillColor,
      maxPrice: Math.max(entryPrice, stopLoss),
      minPrice: Math.min(entryPrice, stopLoss),
    });
  }

  if (takeProfit !== null) {
    ranges.push({
      fillColor: style.rewardRangeFillColor,
      maxPrice: Math.max(entryPrice, takeProfit),
      minPrice: Math.min(entryPrice, takeProfit),
    });
  }

  return ranges;
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

function resolvePrimaryTakeProfit(signal: StructuredSignal): number | null {
  const entryPrice = resolveSignalEntryReferencePrice(signal, null);
  const validTakeProfits = signal.take_profit
    .map(normalizePositivePrice)
    .filter((price): price is number => price !== null)
    .filter((price) => {
      if (entryPrice === null) {
        return true;
      }

      return signal.direction === "long" ? price > entryPrice : price < entryPrice;
    });

  if (validTakeProfits.length === 0) {
    return null;
  }

  return signal.direction === "long" ? Math.min(...validTakeProfits) : Math.max(...validTakeProfits);
}

function isStopLossValid(direction: StructuredSignal["direction"], entryPrice: number, stopLoss: number): boolean {
  return direction === "long" ? stopLoss < entryPrice : stopLoss > entryPrice;
}

function normalizePositivePrice(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value > 0 ? value : null;
}

function createAiHighlightFillColor(theme: ChartTheme, tone: SignalAiHighlightTone): string {
  const colors: Record<SignalAiHighlightTone, { dark: string; light: string }> = {
    disagreement: { dark: "rgba(168, 85, 247, 0.10)", light: "rgba(168, 85, 247, 0.08)" },
    long: { dark: "rgba(47, 189, 133, 0.10)", light: "rgba(47, 189, 133, 0.08)" },
    risk: { dark: "rgba(244, 63, 94, 0.10)", light: "rgba(244, 63, 94, 0.08)" },
    short: { dark: "rgba(246, 70, 93, 0.10)", light: "rgba(246, 70, 93, 0.08)" },
    target: { dark: "rgba(47, 189, 133, 0.10)", light: "rgba(47, 189, 133, 0.08)" },
  };

  return theme === "dark" ? colors[tone].dark : colors[tone].light;
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
