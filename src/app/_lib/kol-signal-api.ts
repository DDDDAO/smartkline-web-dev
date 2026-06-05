import { fetchHistoricalCandles } from "@/app/_lib/binance-market-data";
import { mockKolSignalScenarios, mockKolSignals } from "@/app/_lib/mock-kol-signal-data";
import type { MarketCandle, MarketSymbol } from "@/app/_types/market";
import type { SignalDirection, StructuredSignal } from "@/app/_types/signal";

const CONFIGURED_REST_ENDPOINT = process.env.NEXT_PUBLIC_KOL_SIGNALS_ENDPOINT;
const CONFIGURED_STREAM_ENDPOINT = process.env.NEXT_PUBLIC_KOL_SIGNALS_STREAM_ENDPOINT;
const CONFIGURED_API_BASE_URL = process.env.NEXT_PUBLIC_KOL_SIGNALS_API_BASE_URL;
const CONFIGURED_MOCK_MODE = process.env.NEXT_PUBLIC_KOL_SIGNALS_USE_MOCK;
const DEFAULT_REMOTE_API_BASE_URL = "https://api.smartkline.com/kol";
const KOL_SIGNALS_REST_PATH = "/kol-message-ai-results";
const KOL_SIGNALS_STREAM_PATH = "/kol-message-ai-results/stream";
const KOL_SIGNALS_LIMIT = "50";
const KOL_SIGNALS_STREAM_LIMIT = "1";
const LOCAL_REST_ENDPOINT = "http://127.0.0.1:3001/kol-message-ai-results?limit=50";
const LOCAL_STREAM_ENDPOINT = "http://127.0.0.1:3001/kol-message-ai-results/stream?limit=1";
const DEFAULT_SOURCE_NAME = "KOL 信源";
const KOL_SOURCE_NAME_BY_ID: Record<string, string> = {
  "34": "大镖客合约群",
  "49": "三马哥合约",
};
const UTC_8_OFFSET_MINUTES = 8 * 60;
const DEFAULT_CREATED_AT = "2026-05-31T20:58:00+08:00";
const MARKET_ALIGNED_SIGNAL_HISTORY_LIMIT = 180;
const MARKET_ALIGNED_SIGNAL_STAGGER_MINUTES = 11;
const MARKET_ALIGNED_SIGNAL_MINIMUM_OFFSET_MINUTES = 8;
const MARKET_ALIGNED_SIGNAL_DUPLICATE_OFFSET_MINUTES = 5;
const MOCK_MARKET_ALIGNMENT_TIMEOUT_MS = 2_500;

let cachedMarketAlignedSignals: StructuredSignal[] | null = null;
let pendingMarketAlignedSignals: Promise<StructuredSignal[]> | null = null;

type KolSignalEntryType = "RANGE" | "PRICE" | "MARKET" | "UNKNOWN" | string;
type KolSignalDirection = "LONG" | "SHORT" | string;

type KolSignalApiEntry = {
  raw?: string | null;
  type?: KolSignalEntryType | null;
  price?: string | number | null;
  range?: string | null;
  max_price?: string | number | null;
  min_price?: string | number | null;
};

type KolSignalApiStopLoss = {
  price?: string | number | null;
};

type KolSignalApiTakeProfit = {
  label?: string | null;
  price?: string | number | null;
  percentage?: string | number | null;
};

export type KolSignalApiItem = {
  id?: string | null;
  source_id?: string | number | null;
  source_message_id?: string | number | null;
  source_name?: string | null;
  created_at?: string | null;
  message_type?: string | null;
  raw_text?: string | null;
  source_avatar_url?: string | null;
  standard_message_dedup_key?: string | null;
  entry?: KolSignalApiEntry | null;
  symbol?: string | null;
  direction?: KolSignalDirection | null;
  stop_loss?: KolSignalApiStopLoss | null;
  take_profits?: KolSignalApiTakeProfit[] | null;
};

export type KolSignalAiResultResponse = {
  source_id?: string | number | null;
  source_message_id?: string | number | null;
  created_at?: string | null;
  kol_channel_name?: string | null;
  kol_avatar_url?: string | null;
  original_message?: string | null;
  standard_message?: KolSignalApiResponse | null;
};

export type KolSignalApiResponse = {
  error?: string | null;
  reason?: string | null;
  status?: "SUCCESS" | "FAILED" | string | null;
  signals?: KolSignalApiItem[] | null;
  message_type?: string | null;
  is_trade_signal?: boolean | null;
  source_id?: string | number | null;
  source_name?: string | null;
  raw_text?: string | null;
  created_at?: string | null;
  message_id?: string | null;
  source_message_id?: string | number | null;
};

type KolSignalApiStreamPayload = {
  signals?: KolSignalApiItem[] | null;
  messages?: KolSignalAiResultResponse[] | KolSignalApiResponse[] | null;
  count?: number | null;
  emitted_at?: string | null;
};

type KolSignalApiPayload =
  | KolSignalApiItem[]
  | KolSignalApiResponse
  | KolSignalApiResponse[]
  | KolSignalAiResultResponse
  | KolSignalAiResultResponse[]
  | KolSignalApiStreamPayload
  | { items?: KolSignalApiItem[] | KolSignalApiResponse[] | KolSignalAiResultResponse[] | null };

type AdaptKolSignalOptions = {
  createdAt?: string;
  messageType?: string;
  rawText?: string | null;
  sourceId?: string | number | null;
  sourceMessageId?: string | number | null;
  sourceName?: string | null;
  sourceAvatarUrl?: string | null;
  standardMessageDedupKey?: string | null;
};

type KolSignalSubscriptionHandlers = {
  onSignals: (signals: StructuredSignal[]) => void;
  onError?: (error: Error) => void;
};

type ResolvedKolSignalEndpoint = {
  shouldFallbackOnFailure: boolean;
  url: string;
};

export const sampleKolSignalApiResponses: KolSignalApiItem[] = [
  {
    id: "sample:3:0",
    source_id: "sample-3",
    source_message_id: "sample-message-3",
    created_at: "2026-05-31T09:30:00+08:00",
    message_type: "OPEN_POSITION",
    entry: {
      raw: "市价多单模拟，用于展示已入场浮动盈亏",
      type: "MARKET",
      price: null,
      range: null,
      max_price: null,
      min_price: null,
    },
    symbol: "BTC/USDT:USDT",
    direction: "LONG",
    stop_loss: null,
    take_profits: [],
  },
  {
    id: "sample:4:0",
    source_id: "sample-4",
    source_message_id: "sample-message-4",
    created_at: "2026-05-31T09:30:00+08:00",
    message_type: "OPEN_POSITION",
    entry: {
      raw: "市价空单模拟，用于展示已入场浮动盈亏",
      type: "MARKET",
      price: null,
      range: null,
      max_price: null,
      min_price: null,
    },
    symbol: "BTC/USDT:USDT",
    direction: "SHORT",
    stop_loss: null,
    take_profits: [],
  },
  {
    id: "sample:1:0",
    source_id: "sample-1",
    source_message_id: "sample-message-1",
    created_at: DEFAULT_CREATED_AT,
    message_type: "OPEN_POSITION",
    entry: {
      raw: "67000附近直接空市价 再挂68588",
      type: "RANGE",
      price: null,
      range: "67000-68588",
      max_price: "68588",
      min_price: "67000",
    },
    symbol: "BTC/USDT:USDT",
    direction: "SHORT",
    stop_loss: { price: "70000" },
    take_profits: [
      { label: "TP_SHORT_1", price: "66188", percentage: "70" },
      { label: "TP_SHORT_2", price: "65388", percentage: null },
      { label: "TP_SHORT_3", price: "63888", percentage: null },
    ],
  },
  {
    id: "sample:2:0",
    source_id: "sample-2",
    source_message_id: "sample-message-2",
    created_at: "2026-05-31T21:02:00+08:00",
    message_type: "OPEN_POSITION",
    entry: {
      raw: "67400-68600",
      type: "RANGE",
      price: null,
      range: "67400-68600",
      max_price: "68600",
      min_price: "67400",
    },
    symbol: "BTC/USDT:USDT",
    direction: "SHORT",
    stop_loss: { price: "69200" },
    take_profits: [
      { label: "TP_SHORT_1", price: "66500", percentage: null },
      { label: "TP_SHORT_2", price: "65800", percentage: null },
      { label: "TP_SHORT_3", price: "65100", percentage: null },
    ],
  },
];

export const fallbackKolSignals = mockKolSignals;

export async function fetchKolSignals(): Promise<StructuredSignal[]> {
  if (shouldUseDevMockKolSignals()) {
    await delay(120);
    return getMarketAlignedMockSignals();
  }

  const endpoint = resolveKolSignalsEndpoint();
  if (!endpoint) {
    return getMarketAlignedMockSignals();
  }

  try {
    const response = await fetch(endpoint.url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`KOL signal source failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as KolSignalApiPayload;
    return adaptKolSignalPayload(payload);
  } catch (error) {
    if (endpoint.shouldFallbackOnFailure) {
      return getMarketAlignedMockSignals();
    }

    throw error;
  }
}

export function subscribeToKolSignals(handlers: KolSignalSubscriptionHandlers): () => void {
  if (shouldUseDevMockKolSignals()) {
    return () => undefined;
  }

  const endpoint = resolveKolSignalsStreamEndpoint();
  if (!endpoint || typeof EventSource === "undefined") {
    return () => undefined;
  }

  const eventSource = new EventSource(endpoint.url);
  const handleSignals = (event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as KolSignalApiStreamPayload;
      const signals = adaptKolSignalPayload(payload);
      if (signals.length > 0) {
        handlers.onSignals(signals);
      }
    } catch (error) {
      handlers.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  eventSource.addEventListener("messages", handleSignals);
  eventSource.addEventListener("signals", handleSignals);
  eventSource.onerror = () => {
    handlers.onError?.(new Error("KOL signal SSE stream failed."));
  };

  return () => {
    eventSource.removeEventListener("messages", handleSignals);
    eventSource.removeEventListener("signals", handleSignals);
    eventSource.close();
  };
}

function shouldUseDevMockKolSignals(): boolean {
  if (CONFIGURED_MOCK_MODE === "true") {
    return true;
  }

  if (CONFIGURED_MOCK_MODE === "false") {
    return false;
  }

  return process.env.NODE_ENV === "development" && !CONFIGURED_REST_ENDPOINT && !CONFIGURED_API_BASE_URL;
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

function createSourceAvatarUrl(sourceName: string): string {
  const label = sourceName.trim().slice(0, 2).toUpperCase() || "K";
  const hue = [...sourceName].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">`,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0%" stop-color="hsl(${hue} 84% 58%)"/>`,
    `<stop offset="100%" stop-color="hsl(${(hue + 52) % 360} 92% 42%)"/>`,
    `</linearGradient></defs>`,
    `<rect width="96" height="96" rx="48" fill="url(#g)"/>`,
    `<circle cx="70" cy="24" r="16" fill="rgba(255,255,255,.18)"/>`,
    `<text x="48" y="57" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800">${escapeSvgText(label)}</text>`,
    `</svg>`,
  ].join("");

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

function roundMarketPrice(value: number): number {
  const absoluteValue = Math.abs(value);
  const maximumFractionDigits = absoluteValue >= 10_000 ? 1 : absoluteValue >= 1_000 ? 2 : absoluteValue >= 1 ? 4 : 6;
  return Number(value.toFixed(maximumFractionDigits));
}

function formatTimestampInUtc8(timestampMs: number): string {
  const utc8Date = new Date(timestampMs + UTC_8_OFFSET_MINUTES * 60_000);
  const year = utc8Date.getUTCFullYear();
  const month = padDatePart(utc8Date.getUTCMonth() + 1);
  const day = padDatePart(utc8Date.getUTCDate());
  const hours = padDatePart(utc8Date.getUTCHours());
  const minutes = padDatePart(utc8Date.getUTCMinutes());
  const seconds = padDatePart(utc8Date.getUTCSeconds());

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
}

export function adaptKolSignalPayload(payload: KolSignalApiPayload, options: AdaptKolSignalOptions = {}): StructuredSignal[] {
  return dedupeKolSignalItems(normalizeKolSignalItems(payload, options)).map((item, index) => adaptKolSignalItem(item, index));
}

function normalizeKolSignalItems(payload: KolSignalApiPayload, options: AdaptKolSignalOptions): KolSignalApiItem[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item, index) => normalizeArrayPayloadItem(item, index, options));
  }

  if (isItemsCollection(payload)) {
    return (payload.items ?? []).flatMap((item, index) => normalizeArrayPayloadItem(item, index, options));
  }

  if (isKolSignalAiResultResponse(payload)) {
    return normalizeAiResultResponseSignals(payload, 0, options);
  }

  if (isSuccessfulLegacyResponse(payload)) {
    return normalizeLegacyResponseSignals(payload, 0, options);
  }

  if (isStreamPayload(payload)) {
    if (Array.isArray(payload.messages)) {
      return payload.messages.flatMap((message, index) => normalizeArrayPayloadItem(message, index, {
        ...options,
        createdAt: payload.emitted_at ?? options.createdAt,
      }));
    }

    return (payload.signals ?? []).map((signal, index) => ({
      ...signal,
      created_at: signal.created_at ?? payload.emitted_at ?? options.createdAt,
      id: signal.id ?? createFallbackApiSignalId({ index, sourceId: signal.source_id, sourceMessageId: signal.source_message_id }),
    }));
  }

  return [];
}

function normalizeArrayPayloadItem(
  item: KolSignalApiItem | KolSignalApiResponse | KolSignalAiResultResponse,
  index: number,
  options: AdaptKolSignalOptions,
): KolSignalApiItem[] {
  if (isKolSignalAiResultResponse(item)) {
    return normalizeAiResultResponseSignals(item, index, options);
  }

  if (isSuccessfulLegacyResponse(item)) {
    return normalizeLegacyResponseSignals(item, index, options);
  }

  return [item];
}

function normalizeAiResultResponseSignals(
  response: KolSignalAiResultResponse,
  responseIndex: number,
  options: AdaptKolSignalOptions,
): KolSignalApiItem[] {
  const standardMessage = response.standard_message;

  if (!standardMessage || !isSuccessfulLegacyResponse(standardMessage)) {
    return [];
  }

  return normalizeLegacyResponseSignals(standardMessage, responseIndex, {
    ...options,
    rawText: response.original_message ?? options.rawText,
    createdAt: response.created_at ?? options.createdAt,
    sourceAvatarUrl: response.kol_avatar_url ?? options.sourceAvatarUrl,
    sourceId: response.source_id ?? options.sourceId,
    sourceMessageId: response.source_message_id ?? options.sourceMessageId,
    sourceName: response.kol_channel_name ?? options.sourceName,
    standardMessageDedupKey: stableStringify(standardMessage),
  });
}

function normalizeLegacyResponseSignals(response: KolSignalApiResponse, responseIndex: number, options: AdaptKolSignalOptions): KolSignalApiItem[] {
  return (response.signals ?? []).map((signal, signalIndex) => {
    const normalizedSignal = {
      ...signal,
      created_at: signal.created_at ?? response.created_at ?? options.createdAt,
      id: signal.id ?? response.message_id ?? createFallbackApiSignalId({
        index: signalIndex,
        sourceId: response.source_id ?? options.sourceId,
        sourceMessageId: response.source_message_id ?? options.sourceMessageId,
      }),
      message_type: signal.message_type ?? response.message_type ?? options.messageType,
      raw_text: signal.raw_text ?? response.raw_text ?? options.rawText,
      source_avatar_url: signal.source_avatar_url ?? options.sourceAvatarUrl ?? null,
      source_id: signal.source_id ?? response.source_id ?? options.sourceId,
      source_message_id: signal.source_message_id ?? response.source_message_id ?? options.sourceMessageId ?? response.message_id ?? responseIndex,
      source_name: signal.source_name ?? response.source_name ?? options.sourceName,
    };

    return {
      ...normalizedSignal,
      standard_message_dedup_key: signal.standard_message_dedup_key ?? createSignalDedupKey(normalizedSignal),
    };
  });
}

function adaptKolSignalItem(signal: KolSignalApiItem, signalIndex: number): StructuredSignal {
  const symbol = normalizeMarketSymbol(signal.symbol);
  const direction = normalizeDirection(signal.direction);
  const entry = signal.entry ?? null;
  const rangePrices = parseEntryRange(entry?.range);
  const entryMin = parseNullableNumber(entry?.min_price) ?? rangePrices?.min ?? null;
  const entryMax = parseNullableNumber(entry?.max_price) ?? rangePrices?.max ?? null;
  const triggerPrice = parseNullableNumber(entry?.price);
  const stopLoss = parseNullableNumber(signal.stop_loss?.price);
  const takeProfits = (signal.take_profits ?? [])
    .map((takeProfit) => parseNullableNumber(takeProfit.price))
    .filter((price): price is number => price !== null);
  const entryType = entry?.type === "RANGE" || (entryMin !== null && entryMax !== null) ? "range" : "trigger";
  const entryText = formatEntryText({ entryMax, entryMin, triggerPrice });
  const takeProfitText = takeProfits.length > 0 ? takeProfits.map(formatPrice).join(" / ") : "--";
  const sourceName = signal.source_name ?? formatSourceName(signal.source_id);
  const sourceAvatarUrl = normalizeUrl(signal.source_avatar_url);
  const createdAt = normalizeCreatedAtToUtc8(signal.created_at ?? new Date().toISOString());
  const rawText = signal.raw_text ?? createRawText({ direction, entryText, stopLoss, symbol, takeProfitText });

  return {
    id: signal.id ?? createSignalId({ direction, entryText, signalIndex, sourceName, symbol }),
    source_name: sourceName,
    source_avatar_url: sourceAvatarUrl,
    source_level: "S",
    source_type: formatMessageType(signal.message_type ?? "OPEN_POSITION"),
    symbol,
    direction,
    entry_type: entryType,
    entry_min: entryType === "range" ? entryMin : null,
    entry_max: entryType === "range" ? entryMax : null,
    trigger_price: entryType === "trigger" ? triggerPrice : null,
    confirmation: entry?.raw ?? null,
    stop_loss: stopLoss,
    take_profit: takeProfits,
    status: "观察中",
    risk_tags: createRiskTags({ entryType, stopLoss, takeProfits }),
    raw_text: rawText,
    summary: createSummary({ direction, entryText, stopLoss, symbol, takeProfitText }),
    created_at: createdAt,
    isStrongAlert: true,
    isReview: false,
  };
}

function dedupeKolSignalItems(items: KolSignalApiItem[]): KolSignalApiItem[] {
  const uniqueItemsByKey = new Map<string, KolSignalApiItem>();

  for (const item of items) {
    const dedupKey = createSignalDedupKey(item);
    const currentItem = uniqueItemsByKey.get(dedupKey);
    if (!currentItem || compareSignalCreatedAt(item, currentItem) < 0) {
      uniqueItemsByKey.set(dedupKey, item);
    }
  }

  return Array.from(uniqueItemsByKey.values());
}

function compareSignalCreatedAt(left: KolSignalApiItem, right: KolSignalApiItem): number {
  return getSignalCreatedAtTimestamp(left) - getSignalCreatedAtTimestamp(right);
}

function getSignalCreatedAtTimestamp(signal: KolSignalApiItem): number {
  const timestamp = Date.parse(signal.created_at ?? "");
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function createSignalDedupKey(signal: KolSignalApiItem): string {
  const entry = normalizeApiEntryForDedup(signal.entry);

  return stableStringify({
    direction: normalizeDirection(signal.direction),
    entry,
    message_type: signal.message_type ?? null,
    stop_loss: parseNullableNumber(signal.stop_loss?.price),
    symbol: normalizeMarketSymbol(signal.symbol),
    take_profits: normalizeTakeProfitPricesForDedup(signal.take_profits),
  });
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

function normalizeApiEntryForDedup(entry: KolSignalApiEntry | null | undefined): {
  max: number | null;
  min: number | null;
  price: number | null;
  type: "range" | "trigger";
} {
  const rangePrices = parseEntryRange(entry?.range);
  const entryMin = parseNullableNumber(entry?.min_price) ?? rangePrices?.min ?? null;
  const entryMax = parseNullableNumber(entry?.max_price) ?? rangePrices?.max ?? null;
  const triggerPrice = parseNullableNumber(entry?.price);
  const entryType = entry?.type === "RANGE" || (entryMin !== null && entryMax !== null) ? "range" : "trigger";

  return {
    max: entryType === "range" ? entryMax : null,
    min: entryType === "range" ? entryMin : null,
    price: entryType === "trigger" ? triggerPrice : null,
    type: entryType,
  };
}

function normalizeTakeProfitPricesForDedup(takeProfits: KolSignalApiTakeProfit[] | null | undefined): number[] {
  return (takeProfits ?? [])
    .map((takeProfit) => parseNullableNumber(takeProfit.price))
    .filter((price): price is number => price !== null);
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

function resolveKolSignalsEndpoint(): ResolvedKolSignalEndpoint | null {
  if (CONFIGURED_REST_ENDPOINT) {
    return { shouldFallbackOnFailure: false, url: CONFIGURED_REST_ENDPOINT };
  }

  const configuredApiBaseEndpoint = createKolSignalsEndpoint(CONFIGURED_API_BASE_URL, KOL_SIGNALS_REST_PATH);
  if (configuredApiBaseEndpoint) {
    return { shouldFallbackOnFailure: false, url: configuredApiBaseEndpoint };
  }

  const localEndpoint = resolveLocalEndpoint(LOCAL_REST_ENDPOINT);
  if (localEndpoint) {
    return { shouldFallbackOnFailure: true, url: localEndpoint };
  }

  const defaultRemoteEndpoint = createKolSignalsEndpoint(DEFAULT_REMOTE_API_BASE_URL, KOL_SIGNALS_REST_PATH);
  return defaultRemoteEndpoint ? { shouldFallbackOnFailure: false, url: defaultRemoteEndpoint } : null;
}

function resolveKolSignalsStreamEndpoint(): ResolvedKolSignalEndpoint | null {
  if (CONFIGURED_STREAM_ENDPOINT) {
    return { shouldFallbackOnFailure: false, url: CONFIGURED_STREAM_ENDPOINT };
  }

  const configuredApiBaseEndpoint = createKolSignalsEndpoint(
    CONFIGURED_API_BASE_URL,
    KOL_SIGNALS_STREAM_PATH,
    KOL_SIGNALS_STREAM_LIMIT,
  );
  if (configuredApiBaseEndpoint) {
    return { shouldFallbackOnFailure: false, url: configuredApiBaseEndpoint };
  }

  const localEndpoint = resolveLocalEndpoint(LOCAL_STREAM_ENDPOINT);
  if (localEndpoint) {
    return { shouldFallbackOnFailure: true, url: localEndpoint };
  }

  const defaultRemoteEndpoint = createKolSignalsEndpoint(
    DEFAULT_REMOTE_API_BASE_URL,
    KOL_SIGNALS_STREAM_PATH,
    KOL_SIGNALS_STREAM_LIMIT,
  );
  return defaultRemoteEndpoint ? { shouldFallbackOnFailure: false, url: defaultRemoteEndpoint } : null;
}

function createKolSignalsEndpoint(apiBaseUrl: string | undefined, path: string, limit = KOL_SIGNALS_LIMIT): string | null {
  if (!apiBaseUrl) {
    return null;
  }

  try {
    const normalizedApiBaseUrl = normalizeKolSignalsApiBaseUrl(apiBaseUrl);
    const baseUrl = normalizedApiBaseUrl.endsWith("/") ? normalizedApiBaseUrl : `${normalizedApiBaseUrl}/`;
    const url = new URL(path.replace(/^\//u, ""), baseUrl);
    url.searchParams.set("limit", limit);
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeKolSignalsApiBaseUrl(apiBaseUrl: string): string {
  const url = new URL(apiBaseUrl);
  if (url.hostname === "api.smartkline.com" && (url.pathname === "" || url.pathname === "/")) {
    url.pathname = "/kol";
  }

  return url.toString();
}

function resolveLocalEndpoint(endpoint: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return ["localhost", "127.0.0.1"].includes(window.location.hostname) ? endpoint : null;
}

function isItemsCollection(
  payload: KolSignalApiResponse | KolSignalAiResultResponse | KolSignalApiStreamPayload | { items?: KolSignalApiItem[] | KolSignalApiResponse[] | KolSignalAiResultResponse[] | null },
): payload is { items?: KolSignalApiItem[] | KolSignalApiResponse[] | KolSignalAiResultResponse[] | null } {
  return "items" in payload;
}

function isStreamPayload(payload: KolSignalApiResponse | KolSignalAiResultResponse | KolSignalApiStreamPayload): payload is KolSignalApiStreamPayload {
  return "count" in payload || "emitted_at" in payload || "messages" in payload;
}

function isKolSignalAiResultResponse(payload: KolSignalApiItem | KolSignalApiResponse | KolSignalAiResultResponse): payload is KolSignalAiResultResponse {
  return "standard_message" in payload;
}

function isSuccessfulLegacyResponse(payload: KolSignalApiItem | KolSignalApiResponse): payload is KolSignalApiResponse {
  return "status" in payload && payload.status === "SUCCESS" && payload.is_trade_signal === true;
}

function normalizeMarketSymbol(symbol: string | null | undefined): MarketSymbol {
  return symbol || "BTC/USDT:USDT";
}

function normalizeDirection(direction: KolSignalDirection | null | undefined): SignalDirection {
  return direction === "LONG" ? "long" : "short";
}

function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseNullableNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function formatSourceName(sourceId: string | number | null | undefined): string {
  if (sourceId === null || sourceId === undefined) {
    return DEFAULT_SOURCE_NAME;
  }

  return KOL_SOURCE_NAME_BY_ID[String(sourceId)] ?? `${DEFAULT_SOURCE_NAME} #${sourceId}`;
}

function formatMessageType(messageType: string): string {
  if (messageType === "OPEN_POSITION") {
    return "开仓信号";
  }

  return messageType;
}

function formatEntryText(input: { entryMax: number | null; entryMin: number | null; triggerPrice: number | null }): string {
  if (input.entryMin !== null && input.entryMax !== null) {
    return `${formatPrice(input.entryMin)}-${formatPrice(input.entryMax)}`;
  }

  return formatPrice(input.triggerPrice);
}

function formatPrice(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: value > 1000 ? 1 : 3 });
}

function normalizeCreatedAtToUtc8(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value;
  }

  const utc8Date = new Date(timestamp + UTC_8_OFFSET_MINUTES * 60_000);
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

function parseEntryRange(value: string | null | undefined): { min: number; max: number } | null {
  if (!value) {
    return null;
  }

  const rangeParts = value.split(/[-~—–到至]/u).map((part) => parseNullableNumber(part.trim()));
  const [firstPrice, secondPrice] = rangeParts;
  if (firstPrice === null || firstPrice === undefined || secondPrice === null || secondPrice === undefined) {
    return null;
  }

  return {
    max: Math.max(firstPrice, secondPrice),
    min: Math.min(firstPrice, secondPrice),
  };
}

function createRawText(input: {
  direction: SignalDirection;
  entryText: string;
  stopLoss: number | null;
  symbol: MarketSymbol;
  takeProfitText: string;
}): string {
  return `${input.symbol} ${input.direction === "long" ? "多" : "空"}，入场/触发 ${input.entryText}，止损 ${formatPrice(input.stopLoss)}，止盈 ${input.takeProfitText}`;
}

function createSummary(input: {
  direction: SignalDirection;
  entryText: string;
  stopLoss: number | null;
  symbol: MarketSymbol;
  takeProfitText: string;
}): string {
  return `${input.symbol} ${input.direction === "long" ? "多" : "空"}信号：入场/触发 ${input.entryText}，止损 ${formatPrice(input.stopLoss)}，止盈 ${input.takeProfitText}`;
}

function createRiskTags(input: { entryType: "range" | "trigger"; stopLoss: number | null; takeProfits: number[] }): string[] {
  return [
    input.entryType === "range" ? "区间入场" : "触发入场",
    input.stopLoss !== null ? "止损完整" : "缺少止损",
    input.takeProfits.length > 0 ? "止盈完整" : "缺少止盈",
  ];
}

function createFallbackApiSignalId(input: { index: number; sourceId?: string | number | null; sourceMessageId?: string | number | null }): string {
  return [input.sourceId ?? "source", input.sourceMessageId ?? "message", input.index].join(":");
}

function createSignalId(input: {
  direction: SignalDirection;
  entryText: string;
  signalIndex: number;
  sourceName: string;
  symbol: MarketSymbol;
}): string {
  const rawId = `${input.sourceName}-${input.symbol}-${input.direction}-${input.entryText}-${input.signalIndex}`;
  return rawId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
