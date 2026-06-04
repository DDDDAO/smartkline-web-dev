import { fetchHistoricalCandles } from "@/app/_lib/binance-market-data";
import { mockKolSignalScenarios, mockKolSignals } from "@/app/_lib/mock-kol-signal-data";
import type { MarketCandle } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";

const MARKET_ALIGNED_SIGNAL_HISTORY_LIMIT = 180;
const MARKET_ALIGNED_SIGNAL_STAGGER_MINUTES = 11;
const MARKET_ALIGNED_SIGNAL_MINIMUM_OFFSET_MINUTES = 8;
const MARKET_ALIGNED_SIGNAL_DUPLICATE_OFFSET_MINUTES = 5;

let cachedMarketAlignedSignals: StructuredSignal[] | null = null;
let pendingMarketAlignedSignals: Promise<StructuredSignal[]> | null = null;

export const fallbackKolSignals = mockKolSignals;

export async function fetchKolSignals(): Promise<StructuredSignal[]> {
  await delay(120);
  return getMarketAlignedMockSignals();
}

export function subscribeToKolSignals(): () => void {
  return () => undefined;
}

export function createStructuredSignalPositionKey(signal: StructuredSignal): string {
  return stableStringify({
    direction: signal.direction,
    entry: {
      max: signal.entry_type === "range" ? signal.entry_max : null,
      min: signal.entry_type === "range" ? signal.entry_min : null,
      price: signal.entry_type === "trigger" ? signal.trigger_price : null,
      type: signal.entry_type,
    },
    source_type: signal.source_type,
    stop_loss: signal.stop_loss,
    symbol: signal.symbol,
    take_profits: signal.take_profit,
  });
}

async function getMarketAlignedMockSignals(): Promise<StructuredSignal[]> {
  if (cachedMarketAlignedSignals) {
    return cachedMarketAlignedSignals;
  }

  pendingMarketAlignedSignals ??= createMarketAlignedMockSignals()
    .catch(() => fallbackKolSignals)
    .finally(() => {
      pendingMarketAlignedSignals = null;
    });

  cachedMarketAlignedSignals = await pendingMarketAlignedSignals;
  return cachedMarketAlignedSignals;
}

async function createMarketAlignedMockSignals(): Promise<StructuredSignal[]> {
  const scenarioSignals = mockKolSignalScenarios.map((scenario) => scenario.signal);
  const candlesBySymbol = await fetchMarketReferenceCandles(scenarioSignals);
  const alignedSignals = scenarioSignals.map((signal, index) => alignSignalToBinanceCandles(signal, index, candlesBySymbol[signal.symbol] ?? []));
  const duplicate = createDuplicateParsedPositionSignal(alignedSignals[0]);

  return duplicate ? [...alignedSignals, duplicate] : alignedSignals;
}

async function fetchMarketReferenceCandles(signals: readonly StructuredSignal[]): Promise<Record<string, MarketCandle[]>> {
  const symbols = Array.from(new Set(signals.map((signal) => signal.symbol)));
  const entries = await Promise.all(symbols.map(async (symbol) => {
    try {
      const candles = await fetchHistoricalCandles(symbol, "1m", { limit: MARKET_ALIGNED_SIGNAL_HISTORY_LIMIT });
      return [symbol, candles] as const;
    } catch {
      return [symbol, []] as const;
    }
  }));

  return Object.fromEntries(entries);
}

function alignSignalToBinanceCandles(signal: StructuredSignal, index: number, candles: readonly MarketCandle[]): StructuredSignal {
  const referenceCandle = selectSignalReferenceCandle(candles, index);
  if (!referenceCandle) {
    return signal;
  }

  const referencePrice = referenceCandle.open > 0 ? referenceCandle.open : referenceCandle.close;
  const entry = createAlignedEntry(signal, referencePrice);
  const createdAt = formatDateTimeInUtc8(referenceCandle.sourceTimeMs + 8_000);
  const confirmation = createAlignedConfirmation(signal, entry);

  return createAlignedSignal({
    ...signal,
    ...entry,
    confirmation,
    created_at: createdAt,
  });
}

function selectSignalReferenceCandle(candles: readonly MarketCandle[], index: number): MarketCandle | null {
  if (candles.length === 0) {
    return null;
  }

  const offset = MARKET_ALIGNED_SIGNAL_MINIMUM_OFFSET_MINUTES + (index * MARKET_ALIGNED_SIGNAL_STAGGER_MINUTES) % Math.max(1, candles.length - 1);
  return candles[Math.max(0, candles.length - 1 - offset)] ?? candles.at(-1) ?? null;
}

type AlignedSignalPriceFields = Pick<StructuredSignal, "entry_max" | "entry_min" | "stop_loss" | "take_profit" | "trigger_price">;

function createAlignedEntry(signal: StructuredSignal, referencePrice: number): AlignedSignalPriceFields {
  if (signal.stop_loss === null && signal.take_profit.length === 0 && signal.trigger_price === null && signal.entry_min === null && signal.entry_max === null) {
    return {
      entry_min: null,
      entry_max: null,
      trigger_price: null,
      stop_loss: null,
      take_profit: [],
    };
  }

  if (signal.entry_min !== null && signal.entry_max !== null) {
    return createAlignedRangeSignalPrices(signal.direction, referencePrice);
  }

  if (signal.trigger_price !== null) {
    return createAlignedTriggerSignalPrices(signal.direction, referencePrice);
  }

  return createAlignedMarketSignalPrices(signal.direction, referencePrice, signal.stop_loss !== null || signal.take_profit.length > 0);
}

function createAlignedRangeSignalPrices(direction: StructuredSignal["direction"], referencePrice: number): AlignedSignalPriceFields {
  if (direction === "long") {
    const entryMin = roundMarketPrice(referencePrice * 0.9975);
    const entryMax = roundMarketPrice(referencePrice * 1.0015);
    return {
      entry_min: entryMin,
      entry_max: entryMax,
      trigger_price: null,
      stop_loss: roundMarketPrice(entryMin * 0.987),
      take_profit: [
        roundMarketPrice(entryMax * 1.008),
        roundMarketPrice(entryMax * 1.016),
        roundMarketPrice(entryMax * 1.026),
      ],
    };
  }

  const entryMin = roundMarketPrice(referencePrice * 0.9985);
  const entryMax = roundMarketPrice(referencePrice * 1.0025);
  return {
    entry_min: entryMin,
    entry_max: entryMax,
    trigger_price: null,
    stop_loss: roundMarketPrice(entryMax * 1.013),
    take_profit: [
      roundMarketPrice(entryMin * 0.992),
      roundMarketPrice(entryMin * 0.984),
      roundMarketPrice(entryMin * 0.974),
    ],
  };
}

function createAlignedTriggerSignalPrices(direction: StructuredSignal["direction"], referencePrice: number): AlignedSignalPriceFields {
  if (direction === "long") {
    const triggerPrice = roundMarketPrice(referencePrice * 1.001);
    return {
      entry_min: null,
      entry_max: null,
      trigger_price: triggerPrice,
      stop_loss: roundMarketPrice(triggerPrice * 0.988),
      take_profit: [
        roundMarketPrice(triggerPrice * 1.01),
        roundMarketPrice(triggerPrice * 1.019),
        roundMarketPrice(triggerPrice * 1.03),
      ],
    };
  }

  const triggerPrice = roundMarketPrice(referencePrice * 0.999);
  return {
    entry_min: null,
    entry_max: null,
    trigger_price: triggerPrice,
    stop_loss: roundMarketPrice(triggerPrice * 1.012),
    take_profit: [
      roundMarketPrice(triggerPrice * 0.99),
      roundMarketPrice(triggerPrice * 0.981),
      roundMarketPrice(triggerPrice * 0.97),
    ],
  };
}

function createAlignedMarketSignalPrices(
  direction: StructuredSignal["direction"],
  referencePrice: number,
  hasRiskFields: boolean,
): AlignedSignalPriceFields {
  if (!hasRiskFields) {
    return {
      entry_min: null,
      entry_max: null,
      trigger_price: null,
      stop_loss: null,
      take_profit: [],
    };
  }

  if (direction === "long") {
    return {
      entry_min: null,
      entry_max: null,
      trigger_price: null,
      stop_loss: roundMarketPrice(referencePrice * 0.988),
      take_profit: [
        roundMarketPrice(referencePrice * 1.01),
        roundMarketPrice(referencePrice * 1.019),
        roundMarketPrice(referencePrice * 1.03),
      ],
    };
  }

  return {
    entry_min: null,
    entry_max: null,
    trigger_price: null,
    stop_loss: roundMarketPrice(referencePrice * 1.012),
    take_profit: [
      roundMarketPrice(referencePrice * 0.99),
      roundMarketPrice(referencePrice * 0.981),
      roundMarketPrice(referencePrice * 0.97),
    ],
  };
}

function createAlignedSignal(signal: StructuredSignal): StructuredSignal {
  const entryText = formatEntryText(signal);
  const stopLossText = formatPrice(signal.stop_loss);
  const takeProfitText = formatTakeProfitText(signal.take_profit);
  const sideText = signal.direction === "long" ? "多" : "空";

  return {
    ...signal,
    raw_text: `${signal.source_name}: ${signal.symbol} ${sideText}，入场/触发 ${entryText}，止损 ${stopLossText}，${takeProfitText}。${signal.confirmation ?? "结构化喊单"}`,
    risk_tags: createRiskTags(signal),
    summary: `${signal.symbol} ${sideText} mock signal：入场 ${entryText}，止损 ${stopLossText}，${takeProfitText}`,
  };
}

function createAlignedConfirmation(signal: StructuredSignal, entry: AlignedSignalPriceFields): string {
  if (entry.entry_min !== null && entry.entry_max !== null) {
    return `${formatPrice(entry.entry_min)}-${formatPrice(entry.entry_max)} 区间基于 Binance 近端 1m K 线生成，用于校准图表范围和止盈线。`;
  }

  if (entry.trigger_price !== null) {
    return `突破 ${formatPrice(entry.trigger_price)} 后入场，基于 Binance 近端 1m K 线校准。`;
  }

  return entry.take_profit.length === 0
    ? "市价信号缺少止损止盈，用于展示风险字段缺失状态。"
    : "市价信号基于 Binance 近端 1m K 线校准止损止盈。";
}

function createDuplicateParsedPositionSignal(signal: StructuredSignal | undefined): StructuredSignal | null {
  if (!signal) {
    return null;
  }

  const createdAtMs = Date.parse(signal.created_at);
  const createdAt = Number.isFinite(createdAtMs)
    ? formatDateTimeInUtc8(createdAtMs + MARKET_ALIGNED_SIGNAL_DUPLICATE_OFFSET_MINUTES * 60_000)
    : new Date().toISOString();

  return createAlignedSignal({
    ...signal,
    id: "mock-btc-short-range-duplicate-later-message",
    created_at: createdAt,
    raw_text: `重复转发：${signal.raw_text}`,
    summary: `重复解析的 ${signal.symbol} ${signal.direction === "long" ? "多" : "空"} 信号，仅在去重失败时显示。`,
  });
}

function createRiskTags(input: Pick<StructuredSignal, "entry_max" | "entry_min" | "stop_loss" | "take_profit" | "trigger_price">): string[] {
  return [
    input.entry_min !== null && input.entry_max !== null ? "区间入场" : input.trigger_price !== null ? "触发入场" : "市价入场",
    input.stop_loss !== null ? "止损完整" : "缺少止损",
    input.take_profit.length > 0 ? "止盈完整" : "缺少止盈",
  ];
}

function formatTakeProfitText(takeProfit: readonly number[]): string {
  return takeProfit.length > 0
    ? takeProfit.map((price, index) => `止盈 ${index + 1} ${formatPrice(price)}`).join(" / ")
    : "止盈 --";
}

function formatEntryText(input: Pick<StructuredSignal, "entry_max" | "entry_min" | "trigger_price">): string {
  if (input.entry_min !== null && input.entry_max !== null) {
    return `${formatPrice(input.entry_min)}-${formatPrice(input.entry_max)}`;
  }

  return input.trigger_price !== null ? formatPrice(input.trigger_price) : "市价";
}

function formatPrice(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: value >= 1_000 ? 1 : 4 });
}

function roundMarketPrice(value: number): number {
  const absoluteValue = Math.abs(value);
  const maximumFractionDigits = absoluteValue >= 10_000 ? 1 : absoluteValue >= 1_000 ? 2 : absoluteValue >= 1 ? 4 : 6;
  return Number(value.toFixed(maximumFractionDigits));
}

function formatDateTimeInUtc8(timestampMs: number): string {
  const utc8Date = new Date(timestampMs + 8 * 60 * 60 * 1_000);
  const year = utc8Date.getUTCFullYear();
  const month = padDatePart(utc8Date.getUTCMonth() + 1);
  const day = padDatePart(utc8Date.getUTCDate());
  const hours = padDatePart(utc8Date.getUTCHours());
  const minutes = padDatePart(utc8Date.getUTCMinutes());
  const seconds = padDatePart(utc8Date.getUTCSeconds());

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item));
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, item]) => [key, sortJsonValue(item)]),
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
