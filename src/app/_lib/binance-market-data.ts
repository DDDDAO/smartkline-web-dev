import type { UTCTimestamp } from "lightweight-charts";
import type { KlineInterval, MarketCandle, MarketSymbol } from "@/app/_types/market";

const BINANCE_FUTURES_REST_BASE_URL = "https://fapi.binance.com";
const BINANCE_FUTURES_MARKET_WS_BASE_URL = "wss://fstream.binance.com/market/ws";
export const HISTORICAL_CANDLE_LIMIT = 1500;
export const CHART_CANDLE_PAGE_LIMIT = 600;
const MILLISECONDS_PER_SECOND = 1_000;

type HistoricalCandleFetchOptions = {
  limit?: number;
  signal?: AbortSignal;
  untilMs?: number;
};

type BinanceExchangeInfo = {
  symbols?: BinanceExchangeSymbol[];
};

type BinanceExchangeSymbol = {
  baseAsset: string;
  contractType: string;
  quoteAsset: string;
  status: string;
};

type BinanceKlineRow = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

type BinanceKlinePayload = {
  k?: {
    t: number;
    o: string;
    h: string;
    l: string;
    c: string;
    v: string;
  };
};

type RealtimeHandlers = {
  onOpen: () => void;
  onError: (error: Error) => void;
  onCandle: (candle: MarketCandle) => void;
};

export async function fetchUsdtPerpetualMarkets(): Promise<MarketSymbol[]> {
  const response = await fetch(new URL("/fapi/v1/exchangeInfo", BINANCE_FUTURES_REST_BASE_URL));
  if (!response.ok) {
    throw new Error(`Binance futures market list failed: ${response.status} ${response.statusText}`);
  }

  const exchangeInfo = await response.json() as BinanceExchangeInfo;
  const exchangeSymbols = exchangeInfo.symbols ?? [];
  const marketSymbols = exchangeSymbols
    .filter((symbol) => symbol.contractType === "PERPETUAL" && symbol.quoteAsset === "USDT" && symbol.status === "TRADING")
    .map((symbol) => `${symbol.baseAsset}/USDT:USDT`)
    .sort((left, right) => left.localeCompare(right));

  if (marketSymbols.length === 0) {
    throw new Error("Binance USDT perpetual market list is empty.");
  }

  return marketSymbols;
}

export async function fetchHistoricalCandles(
  symbol: MarketSymbol,
  interval: KlineInterval,
  options: HistoricalCandleFetchOptions = {},
): Promise<MarketCandle[]> {
  const limit = options.limit ?? HISTORICAL_CANDLE_LIMIT;
  const url = new URL("/fapi/v1/klines", BINANCE_FUTURES_REST_BASE_URL);
  url.searchParams.set("symbol", toBinanceFuturesStreamSymbol(symbol).toUpperCase());
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  if (options.untilMs !== undefined) {
    /**
     * Binance endTime is inclusive. Asking for the current oldest candle time
     * would spend one slot on a duplicate and make full older pages look short.
     */
    url.searchParams.set("endTime", String(Math.max(0, options.untilMs - 1)));
  }

  const response = await fetch(url, { signal: options.signal });
  if (!response.ok) {
    throw new Error(`Binance historical candles failed: ${response.status} ${response.statusText}`);
  }

  const rows = await response.json() as BinanceKlineRow[];
  const candles = rows.map((row) => parseKlineRow(row, symbol));
  const untilMs = options.untilMs;

  if (untilMs === undefined) {
    return candles;
  }

  return candles.filter((candle) => candle.sourceTimeMs < untilMs).slice(-limit);
}

export function subscribeToBinanceKlines(
  symbol: MarketSymbol,
  interval: KlineInterval,
  handlers: RealtimeHandlers,
): () => void {
  const websocket = new WebSocket(createBinanceKlineWebSocketUrl(symbol, interval));

  websocket.onopen = handlers.onOpen;
  websocket.onerror = () => {
    handlers.onError(new Error(`Binance realtime stream failed for ${symbol} ${interval}.`));
  };
  websocket.onmessage = (event) => {
    handlers.onCandle(parseKlineMessage(String(event.data), symbol));
  };

  return () => {
    websocket.close(1000, "smartkline market changed");
  };
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

export function upsertCandles(
  candles: readonly MarketCandle[],
  nextCandles: readonly MarketCandle[],
): MarketCandle[] {
  let mergedCandles = candles.slice();

  for (const nextCandle of nextCandles) {
    mergedCandles = upsertCandle(mergedCandles, nextCandle);
  }

  return mergedCandles;
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
  const match = /^([^/]+)\/([^:]+):USDT$/u.exec(symbol.trim());
  if (!match) {
    throw new Error(`Cannot derive Binance Futures stream symbol from ${symbol}.`);
  }

  return `${match[1]}${match[2]}`.toLowerCase();
}

function createBinanceKlineWebSocketUrl(symbol: MarketSymbol, interval: KlineInterval): string {
  const streamSymbol = toBinanceFuturesStreamSymbol(symbol);
  return `${BINANCE_FUTURES_MARKET_WS_BASE_URL}/${encodeURIComponent(streamSymbol)}@kline_${interval}`;
}

function parseKlineRow(row: BinanceKlineRow, symbol: MarketSymbol): MarketCandle {
  const [timestamp, open, high, low, close, volume] = row;
  return createCandle({ timestamp, open, high, low, close, volume, symbol });
}

function parseKlineMessage(rawMessage: string, symbol: MarketSymbol): MarketCandle {
  const payload = JSON.parse(rawMessage) as BinanceKlinePayload;
  const kline = payload.k;

  if (!kline) {
    throw new Error(`Binance realtime message did not include kline data for ${symbol}.`);
  }

  return createCandle({
    timestamp: kline.t,
    open: kline.o,
    high: kline.h,
    low: kline.l,
    close: kline.c,
    volume: kline.v,
    symbol,
  });
}

function createCandle(input: {
  timestamp: unknown;
  open: unknown;
  high: unknown;
  low: unknown;
  close: unknown;
  volume: unknown;
  symbol: MarketSymbol;
}): MarketCandle {
  const timestamp = Number(input.timestamp);
  const open = Number(input.open);
  const high = Number(input.high);
  const low = Number(input.low);
  const close = Number(input.close);
  const volume = Number(input.volume);

  if (![timestamp, open, high, low, close, volume].every(Number.isFinite)) {
    throw new Error(`Binance returned invalid OHLCV data for ${input.symbol}.`);
  }

  return {
    time: toBrowserLocalChartTimestamp(timestamp),
    sourceTimeMs: timestamp,
    open,
    high,
    low,
    close,
    volume,
  };
}

function toBrowserLocalChartTimestamp(timestamp: number): UTCTimestamp {
  const utcDate = new Date(timestamp);
  const localUtcSeconds = Date.UTC(
    utcDate.getFullYear(),
    utcDate.getMonth(),
    utcDate.getDate(),
    utcDate.getHours(),
    utcDate.getMinutes(),
    utcDate.getSeconds(),
    utcDate.getMilliseconds(),
  ) / MILLISECONDS_PER_SECOND;

  return Math.floor(localUtcSeconds) as UTCTimestamp;
}

function compareCandlesByTime(left: MarketCandle, right: MarketCandle): number {
  return left.sourceTimeMs - right.sourceTimeMs;
}
