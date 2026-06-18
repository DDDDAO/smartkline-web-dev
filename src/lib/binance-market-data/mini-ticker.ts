import {
  BINANCE_ALL_MARKET_MINI_TICKER_STREAM_NAME,
  BINANCE_FUTURES_MARKET_WS_BASE_URL,
  BINANCE_MINI_TICKER_RECONNECT_DELAY_MS,
} from "./constants";
import { normalizeBinanceFuturesSymbol } from "./symbols";
import type {
  BinanceMiniTickerCombinedPayload,
  BinanceMiniTickerHandlers,
  BinanceMiniTickerPriceSnapshot,
  BinanceMiniTickerRow,
} from "./types";

const miniTickerPricesBySymbol = new Map<string, number>();
const miniTickerSubscribers = new Set<BinanceMiniTickerHandlers>();
let miniTickerWebSocket: WebSocket | null = null;
let miniTickerReconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

export function subscribeToBinanceAllMarketMiniTickers(
  handlers: BinanceMiniTickerHandlers,
): () => void {
  if (typeof WebSocket === "undefined") {
    handlers.onError?.(new Error("Binance mini ticker stream is unavailable outside the browser."));
    return () => undefined;
  }

  miniTickerSubscribers.add(handlers);
  if (miniTickerPricesBySymbol.size > 0) {
    handlers.onPrices(createMiniTickerPriceSnapshot());
  }
  ensureBinanceMiniTickerWebSocket();

  return () => {
    miniTickerSubscribers.delete(handlers);
    if (miniTickerSubscribers.size === 0) {
      disconnectBinanceMiniTickerWebSocket();
    }
  };
}

export function getLatestBinanceMiniTickerPrices(): BinanceMiniTickerPriceSnapshot {
  return createMiniTickerPriceSnapshot();
}

function createBinanceAllMarketMiniTickerWebSocketUrl(): string {
  return `${BINANCE_FUTURES_MARKET_WS_BASE_URL}/${BINANCE_ALL_MARKET_MINI_TICKER_STREAM_NAME}`;
}

function ensureBinanceMiniTickerWebSocket(): void {
  if (
    miniTickerSubscribers.size === 0
    || miniTickerWebSocket
    || miniTickerReconnectTimeoutId !== null
    || typeof WebSocket === "undefined"
  ) {
    return;
  }

  const websocket = new WebSocket(createBinanceAllMarketMiniTickerWebSocketUrl());
  miniTickerWebSocket = websocket;

  websocket.onopen = () => {
    notifyMiniTickerOpen();
  };
  websocket.onerror = () => {
    notifyMiniTickerError(new Error("Binance all-market mini ticker stream failed."));
  };
  websocket.onmessage = (event) => {
    try {
      const rows = parseMiniTickerRows(String(event.data));
      if (upsertMiniTickerRows(rows)) {
        notifyMiniTickerPrices();
      }
    } catch (error: unknown) {
      notifyMiniTickerError(error instanceof Error ? error : new Error(String(error)));
    }
  };
  websocket.onclose = () => {
    if (miniTickerWebSocket === websocket) {
      miniTickerWebSocket = null;
    }
    notifyMiniTickerClose();
    scheduleMiniTickerReconnect();
  };
}

function disconnectBinanceMiniTickerWebSocket(): void {
  if (miniTickerReconnectTimeoutId !== null) {
    clearTimeout(miniTickerReconnectTimeoutId);
    miniTickerReconnectTimeoutId = null;
  }

  const websocket = miniTickerWebSocket;
  miniTickerWebSocket = null;
  websocket?.close(1000, "smartkline mini ticker unsubscribed");
}

function scheduleMiniTickerReconnect(): void {
  if (miniTickerSubscribers.size === 0 || miniTickerReconnectTimeoutId !== null) {
    return;
  }

  miniTickerReconnectTimeoutId = setTimeout(() => {
    miniTickerReconnectTimeoutId = null;
    ensureBinanceMiniTickerWebSocket();
  }, BINANCE_MINI_TICKER_RECONNECT_DELAY_MS);
}

function parseMiniTickerRows(rawMessage: string): BinanceMiniTickerRow[] {
  const payload = JSON.parse(rawMessage) as unknown;
  const rows: unknown[] = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray((payload as BinanceMiniTickerCombinedPayload).data)
      ? (payload as BinanceMiniTickerCombinedPayload).data as unknown[]
      : [];

  return rows.filter(isRecord).map((row) => row as BinanceMiniTickerRow);
}

function upsertMiniTickerRows(rows: readonly BinanceMiniTickerRow[]): boolean {
  let didChange = false;

  for (const row of rows) {
    const rawSymbol = typeof row.s === "string" ? row.s : "";
    const symbol = normalizeBinanceFuturesSymbol(rawSymbol);
    const price = Number(row.c);

    if (!symbol || !isUsdsMarginedMiniTicker(row) || !Number.isFinite(price) || price <= 0) {
      continue;
    }

    if (miniTickerPricesBySymbol.get(symbol) !== price) {
      miniTickerPricesBySymbol.set(symbol, price);
      didChange = true;
    }
  }

  return didChange;
}

function isUsdsMarginedMiniTicker(row: BinanceMiniTickerRow): boolean {
  const streamType = row.st;
  return streamType === undefined || streamType === 1 || streamType === "1";
}

function notifyMiniTickerOpen(): void {
  for (const subscriber of miniTickerSubscribers) {
    subscriber.onOpen?.();
  }
}

function notifyMiniTickerClose(): void {
  for (const subscriber of miniTickerSubscribers) {
    subscriber.onClose?.();
  }
}

function notifyMiniTickerError(error: Error): void {
  for (const subscriber of miniTickerSubscribers) {
    subscriber.onError?.(error);
  }
}

function notifyMiniTickerPrices(): void {
  const snapshot = createMiniTickerPriceSnapshot();
  for (const subscriber of miniTickerSubscribers) {
    subscriber.onPrices(snapshot);
  }
}

function createMiniTickerPriceSnapshot(): BinanceMiniTickerPriceSnapshot {
  return new Map(miniTickerPricesBySymbol);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
