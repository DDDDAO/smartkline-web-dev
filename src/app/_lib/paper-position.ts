import type { MarketCandle } from "@/app/_types/market";
import type { SignalDirection, StructuredSignal } from "@/app/_types/signal";

export type PaperPositionStatus = "not-entered" | "entered" | "exited" | "invalid";
export type PaperPositionExitReason = "take-profit" | "stop-loss";

export type PaperPositionRecord = {
  signalId: string;
  status: PaperPositionStatus;
  currentPrice: number | null;
  signalSnapshotPrice: number | null;
  trackingHigh: number | null;
  trackingLow: number | null;
  entryPrice: number | null;
  entryTimeMs: number | null;
  entryHigh: number | null;
  entryLow: number | null;
  exitPrice: number | null;
  exitTimeMs: number | null;
  exitReason: PaperPositionExitReason | null;
  pnlPercent: number | null;
  distanceToEntryPrice: number | null;
  distanceToEntryPercent: number | null;
  dataIssue: string | null;
};

type ComputePaperPositionRecordOptions = {
  currentPriceOverride?: number | null;
};

type EntryRule =
  | { type: "range"; min: number; max: number }
  | { type: "price"; price: number }
  | { type: "market"; price: number };

type EntryFill = {
  candleIndex: number;
  price: number;
  timeMs: number;
};

type ExitFill = {
  price: number;
  reason: PaperPositionExitReason;
  timeMs: number;
};

export function computePaperPositionRecord(
  signal: StructuredSignal,
  candles: readonly MarketCandle[],
  options: ComputePaperPositionRecordOptions = {},
): PaperPositionRecord {
  const baseRecord = createEmptyRecord(signal.id);
  const sortedCandles = candles.slice().sort((left, right) => left.sourceTimeMs - right.sourceTimeMs);
  const currentPrice = normalizeCurrentPriceOverride(options.currentPriceOverride) ?? sortedCandles.at(-1)?.close ?? null;
  const signalTimeMs = Date.parse(signal.created_at);

  if (!Number.isFinite(signalTimeMs)) {
    return { ...baseRecord, currentPrice, dataIssue: "Invalid signal time." };
  }

  const trackingStartMs = resolveTrackingStartMs(sortedCandles, signalTimeMs);
  if (trackingStartMs === null) {
    return { ...baseRecord, currentPrice, dataIssue: "Missing candles at signal time." };
  }

  const trackingCandles = sortedCandles.filter((candle) => candle.sourceTimeMs >= trackingStartMs);

  if (trackingCandles.length === 0) {
    return { ...baseRecord, currentPrice, dataIssue: "Missing candles at signal time." };
  }

  const signalSnapshotPrice = resolveSignalSnapshotPrice(sortedCandles, trackingStartMs);
  const trackingRange = summarizeCandles(trackingCandles);

  if (signalSnapshotPrice === null) {
    return {
      ...baseRecord,
      currentPrice,
      trackingHigh: trackingRange.high,
      trackingLow: trackingRange.low,
      dataIssue: "Cannot derive signal snapshot price.",
    };
  }

  const entryRule = resolveEntryRule(signal, signalSnapshotPrice);
  if (entryRule === null) {
    return {
      ...baseRecord,
      currentPrice,
      signalSnapshotPrice,
      trackingHigh: trackingRange.high,
      trackingLow: trackingRange.low,
      dataIssue: "Missing entry price.",
    };
  }

  const entryFill = findEntryFill({ entryRule, signalTimeMs, signalSnapshotPrice, trackingCandles });
  if (entryFill === null) {
    const distance = currentPrice === null ? null : calculateDistanceToEntry(currentPrice, entryRule);

    return {
      ...baseRecord,
      status: "not-entered",
      currentPrice,
      signalSnapshotPrice,
      trackingHigh: trackingRange.high,
      trackingLow: trackingRange.low,
      distanceToEntryPrice: distance?.price ?? null,
      distanceToEntryPercent: distance?.percent ?? null,
    };
  }

  const entryCandles = trackingCandles.slice(entryFill.candleIndex);
  const entryRange = summarizeCandles(entryCandles);
  const exitFill = findExitFill({ direction: signal.direction, entryPrice: entryFill.price, signal, candles: entryCandles });

  if (exitFill !== null) {
    return {
      ...baseRecord,
      status: "exited",
      currentPrice,
      signalSnapshotPrice,
      trackingHigh: trackingRange.high,
      trackingLow: trackingRange.low,
      entryPrice: entryFill.price,
      entryTimeMs: entryFill.timeMs,
      entryHigh: entryRange.high,
      entryLow: entryRange.low,
      exitPrice: exitFill.price,
      exitTimeMs: exitFill.timeMs,
      exitReason: exitFill.reason,
      pnlPercent: calculatePnlPercent(signal.direction, entryFill.price, exitFill.price),
    };
  }

  return {
    ...baseRecord,
    status: "entered",
    currentPrice,
    signalSnapshotPrice,
    trackingHigh: trackingRange.high,
    trackingLow: trackingRange.low,
    entryPrice: entryFill.price,
    entryTimeMs: entryFill.timeMs,
    entryHigh: entryRange.high,
    entryLow: entryRange.low,
    pnlPercent: currentPrice === null ? null : calculatePnlPercent(signal.direction, entryFill.price, currentPrice),
  };
}

function createEmptyRecord(signalId: string): PaperPositionRecord {
  return {
    signalId,
    status: "invalid",
    currentPrice: null,
    signalSnapshotPrice: null,
    trackingHigh: null,
    trackingLow: null,
    entryPrice: null,
    entryTimeMs: null,
    entryHigh: null,
    entryLow: null,
    exitPrice: null,
    exitTimeMs: null,
    exitReason: null,
    pnlPercent: null,
    distanceToEntryPrice: null,
    distanceToEntryPercent: null,
    dataIssue: null,
  };
}

function normalizeCurrentPriceOverride(value: number | null | undefined): number | null {
  return value !== null && value !== undefined && Number.isFinite(value) && value > 0 ? value : null;
}

function resolveTrackingStartMs(candles: readonly MarketCandle[], signalTimeMs: number): number | null {
  if (!Number.isFinite(signalTimeMs) || candles.length === 0) {
    return null;
  }

  let startTimeMs: number | null = null;
  for (const candle of candles) {
    if (candle.sourceTimeMs > signalTimeMs) {
      break;
    }

    startTimeMs = candle.sourceTimeMs;
  }

  return startTimeMs;
}

function summarizeCandles(candles: readonly MarketCandle[]): { high: number | null; low: number | null } {
  if (candles.length === 0) {
    return { high: null, low: null };
  }

  return {
    high: Math.max(...candles.map((candle) => candle.high)),
    low: Math.min(...candles.map((candle) => candle.low)),
  };
}

function resolveSignalSnapshotPrice(candles: readonly MarketCandle[], trackingStartMs: number): number | null {
  const signalCandle = candles.find((candle) => candle.sourceTimeMs === trackingStartMs);
  if (!signalCandle) {
    return null;
  }

  /**
   * OHLC data does not expose the exact intra-candle tick that created the signal.
   * Use the signal candle open as the least future-looking approximation for market fills.
   */
  return signalCandle.open;
}

function resolveEntryRule(signal: StructuredSignal, signalSnapshotPrice: number): EntryRule | null {
  const entryMin = normalizePositivePrice(signal.entry_min);
  const entryMax = normalizePositivePrice(signal.entry_max);
  const triggerPrice = normalizePositivePrice(signal.trigger_price);

  if (entryMin !== null && entryMax !== null) {
    return { type: "range", min: Math.min(entryMin, entryMax), max: Math.max(entryMin, entryMax) };
  }

  if (triggerPrice !== null) {
    return { type: "price", price: triggerPrice };
  }

  const marketPrice = normalizePositivePrice(signalSnapshotPrice);
  return marketPrice === null ? null : { type: "market", price: marketPrice };
}

function normalizePositivePrice(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value > 0 ? value : null;
}

function findEntryFill(input: {
  entryRule: EntryRule;
  signalSnapshotPrice: number;
  signalTimeMs: number;
  trackingCandles: readonly MarketCandle[];
}): EntryFill | null {
  if (input.entryRule.type === "market") {
    const signalCandle = input.trackingCandles[0];
    return signalCandle ? { candleIndex: 0, price: input.entryRule.price, timeMs: signalCandle.sourceTimeMs } : null;
  }

  for (const [candleIndex, candle] of input.trackingCandles.entries()) {
    if (input.entryRule.type === "price" && candle.low <= input.entryRule.price && candle.high >= input.entryRule.price) {
      return { candleIndex, price: input.entryRule.price, timeMs: candle.sourceTimeMs };
    }

    if (input.entryRule.type === "range" && candle.low <= input.entryRule.max && candle.high >= input.entryRule.min) {
      return {
        candleIndex,
        price: resolveRangeEntryPrice({
          candle,
          range: input.entryRule,
          signalSnapshotPrice: candleIndex === 0 ? input.signalSnapshotPrice : null,
        }),
        timeMs: candle.sourceTimeMs,
      };
    }
  }

  return null;
}

function resolveRangeEntryPrice(input: {
  candle: MarketCandle;
  range: Extract<EntryRule, { type: "range" }>;
  signalSnapshotPrice: number | null;
}): number {
  if (input.signalSnapshotPrice !== null && isPriceInsideRange(input.signalSnapshotPrice, input.range)) {
    return input.signalSnapshotPrice;
  }

  if (isPriceInsideRange(input.candle.open, input.range)) {
    return input.candle.open;
  }

  return input.candle.open > input.range.max ? input.range.max : input.range.min;
}

function isPriceInsideRange(price: number, range: Extract<EntryRule, { type: "range" }>): boolean {
  return price >= range.min && price <= range.max;
}

function findExitFill(input: {
  candles: readonly MarketCandle[];
  direction: SignalDirection;
  entryPrice: number;
  signal: StructuredSignal;
}): ExitFill | null {
  const stopLoss = resolveValidStopLoss(input.signal.stop_loss, input.entryPrice, input.direction);
  const takeProfit = resolvePrimaryTakeProfit(input.signal.take_profit, input.entryPrice, input.direction);

  for (const candle of input.candles) {
    const isStopLossTriggered = stopLoss !== null && isExitPriceTriggered({ candle, direction: input.direction, price: stopLoss, type: "stop-loss" });
    const isTakeProfitTriggered = takeProfit !== null && isExitPriceTriggered({ candle, direction: input.direction, price: takeProfit, type: "take-profit" });

    if (isStopLossTriggered) {
      return { price: stopLoss, reason: "stop-loss", timeMs: candle.sourceTimeMs };
    }

    if (isTakeProfitTriggered) {
      return { price: takeProfit, reason: "take-profit", timeMs: candle.sourceTimeMs };
    }
  }

  return null;
}

function resolveValidStopLoss(stopLoss: number | null, entryPrice: number, direction: SignalDirection): number | null {
  const price = normalizePositivePrice(stopLoss);
  if (price === null) {
    return null;
  }

  return direction === "long"
    ? price < entryPrice ? price : null
    : price > entryPrice ? price : null;
}

function resolvePrimaryTakeProfit(takeProfits: readonly number[], entryPrice: number, direction: SignalDirection): number | null {
  const validTakeProfits = takeProfits
    .map(normalizePositivePrice)
    .filter((price): price is number => price !== null)
    .filter((price) => direction === "long" ? price > entryPrice : price < entryPrice);

  if (validTakeProfits.length === 0) {
    return null;
  }

  return direction === "long" ? Math.min(...validTakeProfits) : Math.max(...validTakeProfits);
}

function isExitPriceTriggered(input: {
  candle: MarketCandle;
  direction: SignalDirection;
  price: number;
  type: PaperPositionExitReason;
}): boolean {
  if (input.direction === "long") {
    return input.type === "take-profit" ? input.candle.high >= input.price : input.candle.low <= input.price;
  }

  return input.type === "take-profit" ? input.candle.low <= input.price : input.candle.high >= input.price;
}

function calculatePnlPercent(direction: SignalDirection, entryPrice: number, price: number): number {
  const ratio = direction === "long" ? (price - entryPrice) / entryPrice : (entryPrice - price) / entryPrice;
  return ratio * 100;
}

function calculateDistanceToEntry(currentPrice: number, entryRule: EntryRule): { price: number; percent: number } {
  const targetPrice = entryRule.type === "range" ? resolveNearestRangeBoundary(currentPrice, entryRule) : entryRule.price;
  const price = Math.abs(targetPrice - currentPrice);
  const percent = currentPrice > 0 ? price / currentPrice * 100 : 0;

  return { price, percent };
}

function resolveNearestRangeBoundary(currentPrice: number, range: Extract<EntryRule, { type: "range" }>): number {
  if (currentPrice > range.max) {
    return range.max;
  }

  if (currentPrice < range.min) {
    return range.min;
  }

  return currentPrice;
}
