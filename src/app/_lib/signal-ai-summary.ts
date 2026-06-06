import { getWorkspaceCopy, type WorkspaceLanguage } from "@/app/_lib/i18n";
import type { StructuredSignal } from "@/app/_types/signal";

export type SignalAiHighlightTone = "long" | "short" | "disagreement" | "risk" | "target";

export type SignalAiHighlightRange = {
  label: string;
  maxPrice: number;
  minPrice: number;
  tone: SignalAiHighlightTone;
};

export type SignalAiSummary = {
  highFrequencyPrices: number[];
  highlights: SignalAiHighlightRange[];
  longCount: number;
  longPercent: number;
  resonanceCount: number;
  shortCount: number;
  shortPercent: number;
  summaryText: string;
  totalCount: number;
};

export function createSignalAiSummary(signals: readonly StructuredSignal[], language: WorkspaceLanguage = "zh-CN"): SignalAiSummary {
  const copy = getWorkspaceCopy(language);
  const totalCount = signals.length;
  const longCount = signals.filter((signal) => signal.direction === "long").length;
  const shortCount = totalCount - longCount;
  const longPercent = totalCount > 0 ? Math.round(longCount / totalCount * 100) : 0;
  const shortPercent = totalCount > 0 ? 100 - longPercent : 0;
  const longEntries = createDirectionEntryRanges(signals, "long");
  const shortEntries = createDirectionEntryRanges(signals, "short");
  const stopLossRange = createPriceClusterRange(signals.flatMap((signal) => signal.stop_loss === null ? [] : [signal.stop_loss]));
  const takeProfitRange = createPriceClusterRange(signals.flatMap((signal) => signal.take_profit));
  const highlights: SignalAiHighlightRange[] = [
    ...longEntries.map((range) => ({ ...range, label: copy.ai.highlightLabels.long, tone: "long" as const })),
    ...shortEntries.map((range) => ({ ...range, label: copy.ai.highlightLabels.short, tone: "short" as const })),
  ];

  const disagreementRange = createDisagreementRange(longEntries[0] ?? null, shortEntries[0] ?? null);
  if (disagreementRange) {
    highlights.push({ ...disagreementRange, label: copy.ai.highlightLabels.disagreement, tone: "disagreement" });
  }

  if (stopLossRange) {
    highlights.push({ ...stopLossRange, label: copy.ai.highlightLabels.risk, tone: "risk" });
  }

  if (takeProfitRange) {
    highlights.push({ ...takeProfitRange, label: copy.ai.highlightLabels.target, tone: "target" });
  }

  const dominantSideText = longPercent === shortPercent ? copy.ai.dominantBalanced : longPercent > shortPercent ? copy.ai.dominantLong : copy.ai.dominantShort;
  const resonanceCount = countResonanceGroups(signals);

  return {
    highFrequencyPrices: createHighFrequencyPrices(signals),
    highlights: highlights.slice(0, 5),
    longCount,
    longPercent,
    resonanceCount,
    shortCount,
    shortPercent,
    summaryText: totalCount > 0
      ? copy.ai.summary(dominantSideText, totalCount, resonanceCount)
      : copy.ai.noStats,
    totalCount,
  };
}

function createDirectionEntryRanges(
  signals: readonly StructuredSignal[],
  direction: StructuredSignal["direction"],
): Array<Pick<SignalAiHighlightRange, "maxPrice" | "minPrice">> {
  const ranges = signals
    .filter((signal) => signal.direction === direction)
    .map(resolveEntryRange)
    .filter((range): range is Pick<SignalAiHighlightRange, "maxPrice" | "minPrice"> => range !== null);

  if (ranges.length === 0) {
    return [];
  }

  const minPrice = Math.min(...ranges.map((range) => range.minPrice));
  const maxPrice = Math.max(...ranges.map((range) => range.maxPrice));
  return [{ minPrice, maxPrice }];
}

function resolveEntryRange(signal: StructuredSignal): Pick<SignalAiHighlightRange, "maxPrice" | "minPrice"> | null {
  if (signal.entry_min !== null && signal.entry_max !== null) {
    return {
      maxPrice: Math.max(signal.entry_min, signal.entry_max),
      minPrice: Math.min(signal.entry_min, signal.entry_max),
    };
  }

  if (signal.trigger_price !== null) {
    return createCenteredRange(signal.trigger_price, 0.0018);
  }

  return null;
}

function createPriceClusterRange(prices: readonly number[]): Pick<SignalAiHighlightRange, "maxPrice" | "minPrice"> | null {
  const validPrices = prices.filter((price) => Number.isFinite(price) && price > 0);
  if (validPrices.length === 0) {
    return null;
  }

  const minPrice = Math.min(...validPrices);
  const maxPrice = Math.max(...validPrices);
  if (minPrice === maxPrice) {
    return createCenteredRange(minPrice, 0.0018);
  }

  return { minPrice, maxPrice };
}

function createCenteredRange(price: number, ratio: number): Pick<SignalAiHighlightRange, "maxPrice" | "minPrice"> {
  return {
    maxPrice: price * (1 + ratio),
    minPrice: price * (1 - ratio),
  };
}

function createDisagreementRange(
  longRange: Pick<SignalAiHighlightRange, "maxPrice" | "minPrice"> | null,
  shortRange: Pick<SignalAiHighlightRange, "maxPrice" | "minPrice"> | null,
): Pick<SignalAiHighlightRange, "maxPrice" | "minPrice"> | null {
  if (!longRange || !shortRange) {
    return null;
  }

  const minPrice = Math.max(longRange.minPrice, shortRange.minPrice);
  const maxPrice = Math.min(longRange.maxPrice, shortRange.maxPrice);
  if (minPrice <= maxPrice) {
    return { minPrice, maxPrice };
  }

  const midpoint = (longRange.maxPrice + shortRange.minPrice) / 2;
  return createCenteredRange(midpoint, 0.0024);
}

function createHighFrequencyPrices(signals: readonly StructuredSignal[]): number[] {
  const priceCounts = new Map<string, { count: number; price: number }>();
  const prices = signals.flatMap((signal) => [
    signal.entry_min,
    signal.entry_max,
    signal.trigger_price,
    signal.stop_loss,
    ...signal.take_profit,
  ]);

  for (const price of prices) {
    if (price === null || !Number.isFinite(price) || price <= 0) {
      continue;
    }

    const key = price.toPrecision(4);
    const record = priceCounts.get(key);
    priceCounts.set(key, { count: (record?.count ?? 0) + 1, price });
  }

  return Array.from(priceCounts.values())
    .sort((left, right) => right.count - left.count || left.price - right.price)
    .slice(0, 3)
    .map((record) => record.price);
}

function countResonanceGroups(signals: readonly StructuredSignal[]): number {
  const groups = new Map<string, number>();
  for (const signal of signals) {
    const entryRange = resolveEntryRange(signal);
    if (!entryRange) {
      continue;
    }

    const midpoint = (entryRange.minPrice + entryRange.maxPrice) / 2;
    const key = `${signal.direction}:${midpoint.toPrecision(3)}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }

  return Array.from(groups.values()).filter((count) => count >= 2).length;
}
