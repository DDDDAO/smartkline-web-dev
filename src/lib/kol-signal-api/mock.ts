import { fetchHistoricalCandles } from "@/lib/binance-market-data";
import { mockKolSignalScenarios, mockKolSignals } from "@/lib/mock-kol-signal-data";
import type { MarketCandle } from "@/types/market";
import type { StructuredSignal } from "@/types/signal";
import {
  MARKET_ALIGNED_SIGNAL_DUPLICATE_OFFSET_MINUTES,
  MARKET_ALIGNED_SIGNAL_HISTORY_LIMIT,
  MARKET_ALIGNED_SIGNAL_MINIMUM_OFFSET_MINUTES,
  MARKET_ALIGNED_SIGNAL_STAGGER_MINUTES,
  MOCK_MARKET_ALIGNMENT_TIMEOUT_MS,
} from "./constants";
import {
  createSourceAvatarUrl,
  formatPrice,
  formatTimestampInUtc8,
  roundMarketPrice,
} from "./formatters";

let cachedMarketAlignedSignals: StructuredSignal[] | null = null;
let pendingMarketAlignedSignals: Promise<StructuredSignal[]> | null = null;

export const fallbackKolSignals = mockKolSignals;

export async function getMarketAlignedMockSignals(): Promise<StructuredSignal[]> {
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
  const resonanceSignals = createMarketAlignedResonanceSignals(alignedSignals[0]);
  const duplicate = createDuplicateParsedPositionSignal(alignedSignals[0]);

  return duplicate ? [...alignedSignals, ...resonanceSignals, duplicate] : [...alignedSignals, ...resonanceSignals];
}

async function fetchMarketReferenceCandles(signals: readonly StructuredSignal[]): Promise<Record<string, MarketCandle[]>> {
  const symbols = Array.from(new Set(signals.map((signal) => signal.symbol)));
  const entries = await Promise.all(symbols.map(async (symbol) => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), MOCK_MARKET_ALIGNMENT_TIMEOUT_MS);

    try {
      /**
       * Mock signal rendering should never be blocked by an unreachable market
       * region; stale fixture prices are better than an empty local UI.
       */
      const candles = await fetchHistoricalCandles(symbol, "1m", {
        limit: MARKET_ALIGNED_SIGNAL_HISTORY_LIMIT,
        signal: abortController.signal,
      });
      return [symbol, candles] as const;
    } catch {
      return [symbol, []] as const;
    } finally {
      clearTimeout(timeoutId);
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
  const confirmation = createAlignedConfirmation(signal, entry);

  return createAlignedSignal({
    ...signal,
    ...entry,
    confirmation,
  });
}

function selectSignalReferenceCandle(candles: readonly MarketCandle[], index: number): MarketCandle | null {
  if (candles.length === 0) {
    return null;
  }

  const offset = MARKET_ALIGNED_SIGNAL_MINIMUM_OFFSET_MINUTES + (index * MARKET_ALIGNED_SIGNAL_STAGGER_MINUTES) % Math.max(1, candles.length - 1);
  return candles[Math.max(0, candles.length - 1 - offset)] ?? candles.at(-1) ?? null;
}

function createAlignedEntry(signal: StructuredSignal, referencePrice: number) {
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

function createAlignedRangeSignalPrices(direction: StructuredSignal["direction"], referencePrice: number) {
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

function createAlignedTriggerSignalPrices(direction: StructuredSignal["direction"], referencePrice: number) {
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
) {
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
  const entryText = formatMockEntryText(signal);
  const stopLossText = formatPrice(signal.stop_loss);
  const takeProfitText = formatMockTakeProfitText(signal.take_profit);
  const sideText = signal.direction === "long" ? "多" : "空";

  return {
    ...signal,
    raw_text: `${signal.source_name}: ${signal.symbol} ${sideText}，入场/触发 ${entryText}，止损 ${stopLossText}，${takeProfitText}。${signal.confirmation ?? "结构化喊单"}`,
    risk_tags: createMockRiskTags(signal),
    summary: `${signal.symbol} ${sideText} mock signal：入场 ${entryText}，止损 ${stopLossText}，${takeProfitText}`,
  };
}

function createAlignedConfirmation(signal: StructuredSignal, entry: ReturnType<typeof createAlignedEntry>): string {
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
    ? formatTimestampInUtc8(createdAtMs + MARKET_ALIGNED_SIGNAL_DUPLICATE_OFFSET_MINUTES * 60_000)
    : new Date().toISOString();

  return createAlignedSignal({
    ...signal,
    id: "mock-btc-short-range-duplicate-later-message",
    created_at: createdAt,
    raw_text: `重复转发：${signal.raw_text}`,
    summary: `重复解析的 ${signal.symbol} ${signal.direction === "long" ? "多" : "空"} 信号，仅在去重失败时显示。`,
  });
}

function createMarketAlignedResonanceSignals(signal: StructuredSignal | undefined): StructuredSignal[] {
  if (!signal || signal.direction !== "short" || signal.symbol !== "BTC/USDT:USDT") {
    return [];
  }

  return [
    createMarketAlignedResonanceSignal({
      basisPointShift: -0.001,
      id: "mock-btc-short-resonance-whale-club",
      minuteOffset: 1,
      signal,
      sourceName: "Crypto Whale Club",
    }),
    createMarketAlignedResonanceSignal({
      basisPointShift: 0.0011,
      id: "mock-btc-short-resonance-north-star",
      minuteOffset: 2,
      signal,
      sourceName: "North Star Signals",
    }),
  ];
}

function createMarketAlignedResonanceSignal(input: {
  basisPointShift: number;
  id: string;
  minuteOffset: number;
  signal: StructuredSignal;
  sourceName: string;
}): StructuredSignal {
  const createdAtMs = Date.parse(input.signal.created_at);
  const createdAt = Number.isFinite(createdAtMs)
    ? formatTimestampInUtc8(createdAtMs + input.minuteOffset * 60_000)
    : input.signal.created_at;
  const shiftedSignal: StructuredSignal = {
    ...input.signal,
    id: input.id,
    source_name: input.sourceName,
    source_avatar_url: createSourceAvatarUrl(input.sourceName),
    source_type: "共振信号",
    created_at: createdAt,
    entry_min: shiftPrice(input.signal.entry_min, input.basisPointShift),
    entry_max: shiftPrice(input.signal.entry_max, input.basisPointShift),
    stop_loss: shiftPrice(input.signal.stop_loss, input.basisPointShift),
    take_profit: input.signal.take_profit.map((price) => shiftPrice(price, input.basisPointShift)).filter((price): price is number => price !== null),
    confirmation: "BTC 空头区域出现多源共振，用于展示 KOL 头像叠加与辐射效果。",
  };

  return createAlignedSignal({
    ...shiftedSignal,
    raw_text: `${input.sourceName}: ${input.signal.symbol} 空，入场/触发 ${formatMockEntryText(shiftedSignal)}，止损 ${formatPrice(shiftedSignal.stop_loss)}，${formatMockTakeProfitText(shiftedSignal.take_profit)}。多位交易员在同一压力区给出空头计划，形成 3 源共振。`,
    summary: `${input.signal.symbol} 空头共振：入场 ${formatMockEntryText(shiftedSignal)}，止损 ${formatPrice(shiftedSignal.stop_loss)}，${formatMockTakeProfitText(shiftedSignal.take_profit)}`,
  });
}

function shiftPrice(value: number | null, ratio: number): number | null {
  if (value === null) {
    return null;
  }

  return roundMarketPrice(value * (1 + ratio));
}

function createMockRiskTags(input: Pick<StructuredSignal, "entry_max" | "entry_min" | "stop_loss" | "take_profit" | "trigger_price">): string[] {
  return [
    input.entry_min !== null && input.entry_max !== null ? "区间入场" : input.trigger_price !== null ? "触发入场" : "市价入场",
    input.stop_loss !== null ? "止损完整" : "缺少止损",
    input.take_profit.length > 0 ? "止盈完整" : "缺少止盈",
  ];
}

function formatMockTakeProfitText(takeProfit: readonly number[]): string {
  return takeProfit.length > 0
    ? takeProfit.map((price, index) => `止盈${index + 1} ${formatPrice(price)}`).join(" / ")
    : "止盈 --";
}

function formatMockEntryText(input: Pick<StructuredSignal, "entry_max" | "entry_min" | "trigger_price">): string {
  if (input.entry_min !== null && input.entry_max !== null) {
    return `${formatPrice(input.entry_min)}-${formatPrice(input.entry_max)}`;
  }

  return input.trigger_price !== null ? formatPrice(input.trigger_price) : "市价";
}
