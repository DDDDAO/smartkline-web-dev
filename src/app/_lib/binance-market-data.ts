import type { UTCTimestamp } from "lightweight-charts";
import { getMockSignalScenario, mockMarketSymbols, type MockSignalScenario } from "@/app/_lib/mock-kol-signal-data";
import type { KlineInterval, MarketCandle, MarketSymbol } from "@/app/_types/market";

export const HISTORICAL_CANDLE_LIMIT = 360;
const MILLISECONDS_PER_SECOND = 1_000;
const MINUTE_MS = 60_000;

type HistoricalCandleFetchOptions = {
  limit?: number;
  untilMs?: number;
};

type RealtimeHandlers = {
  onOpen: () => void;
  onError: (error: Error) => void;
  onCandle: (candle: MarketCandle) => void;
};

export async function fetchUsdtPerpetualMarkets(): Promise<MarketSymbol[]> {
  await delay(80);
  return mockMarketSymbols;
}

export async function fetchHistoricalCandles(
  symbol: MarketSymbol,
  interval: KlineInterval,
  options: HistoricalCandleFetchOptions = {},
): Promise<MarketCandle[]> {
  await delay(80);
  const limit = options.limit ?? HISTORICAL_CANDLE_LIMIT;
  const candles = createMockCandles(symbol, interval);
  const eligibleCandles = options.untilMs === undefined
    ? candles
    : candles.filter((candle) => candle.sourceTimeMs < options.untilMs!);

  return eligibleCandles.slice(-limit);
}

export function subscribeToBinanceKlines(
  symbol: MarketSymbol,
  interval: KlineInterval,
  handlers: RealtimeHandlers,
): () => void {
  let tick = 0;
  window.setTimeout(handlers.onOpen, 0);

  const intervalId = window.setInterval(() => {
    tick += 1;
    const latestCandle = createMockRealtimeCandle(symbol, interval, tick);
    handlers.onCandle(latestCandle);
  }, 3_000);

  return () => window.clearInterval(intervalId);
}

export function upsertCandle(candles: readonly MarketCandle[], nextCandle: MarketCandle): MarketCandle[] {
  const lastCandle = candles.at(-1);

  if (!lastCandle || nextCandle.sourceTimeMs > lastCandle.sourceTimeMs) {
    return [...candles, nextCandle];
  }

  if (nextCandle.sourceTimeMs === lastCandle.sourceTimeMs) {
    return [...candles.slice(0, -1), nextCandle];
  }

  const existingIndex = candles.findIndex((candle) => candle.sourceTimeMs === nextCandle.sourceTimeMs);
  if (existingIndex === -1) {
    return [...candles, nextCandle].sort(compareCandlesByTime);
  }

  const updatedCandles = candles.slice();
  updatedCandles[existingIndex] = nextCandle;
  return updatedCandles.sort(compareCandlesByTime);
}

export function prependHistoricalCandles(
  currentCandles: readonly MarketCandle[],
  olderCandles: readonly MarketCandle[],
): MarketCandle[] {
  const candlesBySourceTime = new Map<number, MarketCandle>();

  for (const candle of olderCandles) {
    candlesBySourceTime.set(candle.sourceTimeMs, candle);
  }

  for (const candle of currentCandles) {
    candlesBySourceTime.set(candle.sourceTimeMs, candle);
  }

  return Array.from(candlesBySourceTime.values()).sort(compareCandlesByTime);
}

export function toBinanceFuturesStreamSymbol(symbol: MarketSymbol): string {
  return symbol.replace("/USDT:USDT", "USDT").toLowerCase();
}

export function createMockCandles(symbol: MarketSymbol, interval: KlineInterval): MarketCandle[] {
  const scenario = getMockSignalScenario(symbol);
  if (!scenario) {
    return createFallbackCandles(symbol, interval);
  }

  return scenario.kind === "invalid-missing-coverage"
    ? createMissingCoverageCandles(scenario, interval)
    : createScenarioCandles(scenario, interval);
}

function createScenarioCandles(scenario: MockSignalScenario, interval: KlineInterval): MarketCandle[] {
  const intervalMs = toIntervalMs(interval);
  const signalTimeMs = getIntervalStartMs(Date.parse(scenario.signal.created_at), intervalMs);
  const beforeCount = interval === "1m" ? 36 : 80;
  const afterCount = interval === "1m" ? 112 : 160;
  const startTimeMs = signalTimeMs - beforeCount * intervalMs;
  let previousClose = scenario.snapshotPrice;

  return Array.from({ length: beforeCount + afterCount + 1 }, (_, index) => {
    const sourceTimeMs = startTimeMs + index * intervalMs;
    const offset = Math.round((sourceTimeMs - signalTimeMs) / intervalMs);
    const center = resolveScenarioCenterPrice(scenario, offset, afterCount);
    const open = offset === 0 ? scenario.snapshotPrice : previousClose;
    let close = center;
    let high = Math.max(open, close) + scenario.volatility;
    let low = Math.min(open, close) - scenario.volatility;

    if (offset === 0) {
      high = Math.max(high, scenario.snapshotPrice + scenario.volatility * 0.7);
      low = Math.min(low, scenario.snapshotPrice - scenario.volatility * 0.7);
    }

    const forcedExit = resolveForcedExit(scenario, offset);
    if (forcedExit !== null) {
      high = Math.max(high, forcedExit.high ?? high);
      low = Math.min(low, forcedExit.low ?? low);
      close = forcedExit.close;
    }

    previousClose = close;
    return createCandle({ close, high, low, open, sourceTimeMs, volumeSeed: index, symbol: scenario.signal.symbol });
  });
}

function createMissingCoverageCandles(scenario: MockSignalScenario, interval: KlineInterval): MarketCandle[] {
  const intervalMs = toIntervalMs(interval);
  const signalTimeMs = getIntervalStartMs(Date.parse(scenario.signal.created_at), intervalMs);
  const startTimeMs = signalTimeMs + 10 * intervalMs;
  let previousClose = scenario.currentPrice;

  return Array.from({ length: 120 }, (_, index) => {
    const sourceTimeMs = startTimeMs + index * intervalMs;
    const wave = Math.sin(index / 6) * scenario.volatility * 2;
    const close = scenario.currentPrice + wave;
    const open = previousClose;
    const high = Math.max(open, close) + scenario.volatility;
    const low = Math.min(open, close) - scenario.volatility;
    previousClose = close;
    return createCandle({ close, high, low, open, sourceTimeMs, volumeSeed: index, symbol: scenario.signal.symbol });
  });
}

function createFallbackCandles(symbol: MarketSymbol, interval: KlineInterval): MarketCandle[] {
  const intervalMs = toIntervalMs(interval);
  const seed = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const basePrice = 100 + seed % 80;
  const startTimeMs = Date.parse("2026-06-03T16:00:00+08:00");
  let previousClose = basePrice;

  return Array.from({ length: 180 }, (_, index) => {
    const sourceTimeMs = startTimeMs + index * intervalMs;
    const close = basePrice + Math.sin(index / 8) * 4 + index * 0.03;
    const open = previousClose;
    const high = Math.max(open, close) + 0.8;
    const low = Math.min(open, close) - 0.8;
    previousClose = close;
    return createCandle({ close, high, low, open, sourceTimeMs, volumeSeed: index, symbol });
  });
}

function resolveScenarioCenterPrice(scenario: MockSignalScenario, offset: number, afterCount: number): number {
  if (offset < 0) {
    return scenario.snapshotPrice + Math.sin(offset / 5) * scenario.volatility * 2;
  }

  const progress = Math.min(1, offset / Math.max(1, afterCount));

  if (scenario.kind === "trigger-long-entered" && offset < 4) {
    return scenario.snapshotPrice + offset * scenario.volatility * 1.4;
  }

  const smoothProgress = 1 - Math.pow(1 - progress, 2);
  const trend = scenario.snapshotPrice + (scenario.currentPrice - scenario.snapshotPrice) * smoothProgress;
  return trend + Math.sin(offset / 7) * scenario.volatility * 1.6;
}

function resolveForcedExit(scenario: MockSignalScenario, offset: number): { close: number; high?: number; low?: number } | null {
  if (scenario.exitMinute === undefined || offset !== scenario.exitMinute) {
    return null;
  }

  const signal = scenario.signal;
  if (scenario.kind === "exited-long-take-profit") {
    const takeProfit = signal.take_profit[0];
    return { close: takeProfit + scenario.volatility, high: takeProfit + scenario.volatility * 2 };
  }

  if (scenario.kind === "exited-short-take-profit") {
    const takeProfit = signal.take_profit[0];
    return { close: takeProfit - scenario.volatility, low: takeProfit - scenario.volatility * 2 };
  }

  if (scenario.kind === "exited-long-stop-loss" && signal.stop_loss !== null) {
    return { close: signal.stop_loss - scenario.volatility, low: signal.stop_loss - scenario.volatility * 2 };
  }

  if (scenario.kind === "exited-short-stop-loss" && signal.stop_loss !== null) {
    return { close: signal.stop_loss + scenario.volatility, high: signal.stop_loss + scenario.volatility * 2 };
  }

  return null;
}

function createMockRealtimeCandle(symbol: MarketSymbol, interval: KlineInterval, tick: number): MarketCandle {
  const scenario = getMockSignalScenario(symbol);
  const intervalMs = toIntervalMs(interval);
  const sourceTimeMs = getIntervalStartMs(Date.parse("2026-06-04T00:30:00+08:00") + tick * intervalMs, intervalMs);
  const basePrice = scenario?.currentPrice ?? 100;
  const volatility = scenario?.volatility ?? 1;
  const open = basePrice + Math.sin(tick / 3) * volatility;
  const close = basePrice + Math.cos(tick / 4) * volatility;
  const high = Math.max(open, close) + volatility * 0.8;
  const low = Math.min(open, close) - volatility * 0.8;

  return createCandle({ close, high, low, open, sourceTimeMs, volumeSeed: tick, symbol });
}

function createCandle(input: {
  close: number;
  high: number;
  low: number;
  open: number;
  sourceTimeMs: number;
  symbol: MarketSymbol;
  volumeSeed: number;
}): MarketCandle {
  return {
    time: Math.floor(input.sourceTimeMs / MILLISECONDS_PER_SECOND) as UTCTimestamp,
    sourceTimeMs: input.sourceTimeMs,
    open: roundPrice(input.open),
    high: roundPrice(input.high),
    low: roundPrice(input.low),
    close: roundPrice(input.close),
    volume: 1_000 + (input.volumeSeed * 73 + input.symbol.length * 19) % 2_500,
  };
}

function getIntervalStartMs(timestampMs: number, intervalMs: number): number {
  return Math.floor(timestampMs / intervalMs) * intervalMs;
}

function toIntervalMs(interval: KlineInterval): number {
  const unit = interval.at(-1);
  const value = Number(interval.slice(0, -1));
  if (unit === "m") return value * MINUTE_MS;
  if (unit === "h") return value * 60 * MINUTE_MS;
  return value * 24 * 60 * MINUTE_MS;
}

function roundPrice(value: number): number {
  const absoluteValue = Math.abs(value);
  const maximumFractionDigits = absoluteValue >= 1_000 ? 1 : absoluteValue >= 10 ? 3 : 5;
  return Number(value.toFixed(maximumFractionDigits));
}

function compareCandlesByTime(left: MarketCandle, right: MarketCandle): number {
  return left.sourceTimeMs - right.sourceTimeMs;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
