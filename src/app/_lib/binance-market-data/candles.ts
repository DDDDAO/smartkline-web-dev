import type { UTCTimestamp } from "lightweight-charts";
import type { KlineInterval, MarketCandle, MarketSymbol } from "@/app/_types/market";
import {
  BINANCE_FUTURES_MARKET_WS_BASE_URL,
  BINANCE_FUTURES_REST_BASE_URL,
  HISTORICAL_CANDLE_LIMIT,
  MILLISECONDS_PER_SECOND,
} from "./constants";
import { toBinanceFuturesStreamSymbol } from "./symbols";
import type {
  BinanceKlinePayload,
  BinanceKlineRow,
  HistoricalCandleFetchOptions,
  RealtimeHandlers,
} from "./types";

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
    return areCandlesEqual(lastCandle, nextCandle)
      ? candles as MarketCandle[]
      : [...candles.slice(0, -1), nextCandle];
  }

  const existingIndex = candles.findIndex((candle) => candle.sourceTimeMs === nextCandle.sourceTimeMs);
  if (existingIndex === -1) {
    return [...candles, nextCandle].sort(compareCandlesByTime);
  }

  if (areCandlesEqual(candles[existingIndex], nextCandle)) {
    return candles as MarketCandle[];
  }

  const updatedCandles = candles.slice();
  updatedCandles[existingIndex] = nextCandle;
  return updatedCandles;
}

export function upsertCandles(
  candles: readonly MarketCandle[],
  nextCandles: readonly MarketCandle[],
): MarketCandle[] {
  if (nextCandles.length === 0) {
    return candles as MarketCandle[];
  }

  const candlesBySourceTime = new Map<number, MarketCandle>();
  let didChange = false;

  for (const candle of candles) {
    candlesBySourceTime.set(candle.sourceTimeMs, candle);
  }

  for (const nextCandle of nextCandles) {
    const currentCandle = candlesBySourceTime.get(nextCandle.sourceTimeMs);
    if (!currentCandle || !areCandlesEqual(currentCandle, nextCandle)) {
      didChange = true;
      candlesBySourceTime.set(nextCandle.sourceTimeMs, nextCandle);
    }
  }

  if (!didChange) {
    return candles as MarketCandle[];
  }

  return Array.from(candlesBySourceTime.values()).sort(compareCandlesByTime);
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

function areCandlesEqual(left: MarketCandle, right: MarketCandle): boolean {
  return (
    left.sourceTimeMs === right.sourceTimeMs &&
    left.open === right.open &&
    left.high === right.high &&
    left.low === right.low &&
    left.close === right.close &&
    left.volume === right.volume
  );
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
