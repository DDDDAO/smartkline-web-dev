import type {
  TradingFoxCopyStrategyDetailInput,
  TradingFoxOrderHistory,
  TradingFoxSignalSource,
} from "./types";
import {
  normalizeNonNegativeInteger,
  normalizePositiveInteger,
} from "./normalizers";

const TRADINGFOX_ORDER_HISTORY_PAGE_LIMIT = 50;
const TRADINGFOX_ORDER_HISTORY_FETCH_LIMIT = 500;

export function normalizeTradingFoxOrderHistoryPage(input: TradingFoxCopyStrategyDetailInput): {
  fetchLimit: number;
  limit: number;
  offset: number;
} {
  const normalizedLimit = normalizePositiveInteger(input.orderLimit) ?? TRADINGFOX_ORDER_HISTORY_PAGE_LIMIT;
  const limit = Math.min(TRADINGFOX_ORDER_HISTORY_PAGE_LIMIT, normalizedLimit);
  const offset = normalizeNonNegativeInteger(input.orderOffset);
  return {
    fetchLimit: Math.min(TRADINGFOX_ORDER_HISTORY_FETCH_LIMIT, offset + limit),
    limit,
    offset,
  };
}

export function applyTradingFoxOrderHistoryPage(
  orderHistory: TradingFoxOrderHistory,
  page: { fetchLimit: number; limit: number; offset: number },
  startedAt: string,
): TradingFoxOrderHistory {
  const filteredOrderHistory = filterTradingFoxOrderHistorySince(orderHistory, startedAt);
  const items = filteredOrderHistory.items.slice(0, page.fetchLimit);
  const signalSourceOrders = filteredOrderHistory.signalSourceOrders.slice(0, page.fetchLimit);
  const tradeLogs = filteredOrderHistory.tradeLogs.slice(0, page.fetchLimit);
  const hasCursorMore = Boolean(
    orderHistory.traderOrdersNextCursor
    || orderHistory.signalSourceOrdersNextCursor
    || orderHistory.tradeLogsNextCursor,
  );
  const hasFilteredPageFilled = Math.max(items.length, signalSourceOrders.length, tradeLogs.length) >= page.fetchLimit;
  return {
    ...orderHistory,
    hasMore: orderHistory.hasMore ?? (hasCursorMore && hasFilteredPageFilled),
    items,
    limit: page.limit,
    offset: page.offset,
    returnedCount: Math.min(page.limit, Math.max(0, items.length - page.offset)),
    signalSourceOrders,
    tradeLogs,
  };
}

function filterTradingFoxOrderHistorySince(orderHistory: TradingFoxOrderHistory, startedAt: string): TradingFoxOrderHistory {
  const startedAtMs = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMs)) {
    return orderHistory;
  }

  return {
    ...orderHistory,
    items: orderHistory.items.filter((item) => isTradingFoxHistoryTimestampAfter(item.timestamp, startedAtMs)),
    signalSourceOrders: orderHistory.signalSourceOrders.filter((item) =>
      isTradingFoxHistoryTimestampAfter(item.timestamp || item.sourceTimestamp, startedAtMs),
    ),
    tradeLogs: orderHistory.tradeLogs.filter((item) => isTradingFoxHistoryTimestampAfter(item.timestamp, startedAtMs)),
  };
}

function isTradingFoxHistoryTimestampAfter(value: string | undefined, startedAtMs: number): boolean {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) && timestamp >= startedAtMs;
}

/**
 * Some TradingFox order-history deployments expose signal source events without
 * Signal Center event metadata, so the frontend cannot read the original event
 * price. Current signal-source positions still provide a useful reference price
 * for the strategy history table instead of leaving the value columns empty.
 */
export function enrichTradingFoxOrderHistorySignalSourcePrices(
  orderHistory: TradingFoxOrderHistory,
  signalSources: readonly TradingFoxSignalSource[],
): TradingFoxOrderHistory {
  if (orderHistory.signalSourceOrders.length === 0 || signalSources.length === 0) {
    return orderHistory;
  }

  const positionsByKey = createTradingFoxSignalSourcePositionLookup(signalSources);
  return {
    ...orderHistory,
    signalSourceOrders: orderHistory.signalSourceOrders.map((order) =>
      enrichTradingFoxSignalSourceOrderPrices(order, positionsByKey),
    ),
  };
}

function enrichTradingFoxSignalSourceOrderPrices(
  order: TradingFoxOrderHistory["signalSourceOrders"][number],
  positionsByKey: ReadonlyMap<string, TradingFoxSignalSource["positions"][number]>,
): TradingFoxOrderHistory["signalSourceOrders"][number] {
  if (readPositiveTradingFoxNumber(order.price) !== null) {
    return order;
  }

  const position = lookupTradingFoxSignalSourcePosition(order, positionsByKey);
  if (!position) {
    return order;
  }

  const entryPrice = readPositiveTradingFoxNumber(order.entryPrice)
    ?? readPositiveTradingFoxNumber(order.metadata?.entryPrice)
    ?? readPositiveTradingFoxNumber(order.metadata?.entry_price)
    ?? readPositiveTradingFoxNumber(position.entryPrice);
  const markPrice = readPositiveTradingFoxNumber(order.markPrice)
    ?? readPositiveTradingFoxNumber(order.metadata?.markPrice)
    ?? readPositiveTradingFoxNumber(order.metadata?.mark_price)
    ?? readPositiveTradingFoxNumber(position.markPrice);
  const price = markPrice ?? entryPrice;

  if (price === null) {
    return order;
  }

  return {
    ...order,
    entryPrice: order.entryPrice ?? entryPrice ?? undefined,
    markPrice: order.markPrice ?? markPrice ?? undefined,
    price,
    priceSource: order.priceSource ?? (markPrice !== null ? "signal_source_mark_price" : "signal_source_entry_price"),
  };
}

function createTradingFoxSignalSourcePositionLookup(
  signalSources: readonly TradingFoxSignalSource[],
): Map<string, TradingFoxSignalSource["positions"][number]> {
  const positionsByKey = new Map<string, TradingFoxSignalSource["positions"][number]>();
  const positionsBySymbolKey = new Map<string, TradingFoxSignalSource["positions"][number] | null>();

  for (const source of signalSources) {
    for (const position of source.positions) {
      const symbolKey = normalizeTradingFoxPositionSymbolKey(position.symbol);
      if (!source.signalSourceId || !symbolKey) {
        continue;
      }

      const sideKey = normalizeTradingFoxPositionSideKey(position.positionSide);
      positionsByKey.set(createTradingFoxSignalSourcePositionKey(source.signalSourceId, symbolKey, sideKey), position);

      const symbolOnlyKey = createTradingFoxSignalSourcePositionKey(source.signalSourceId, symbolKey, "");
      positionsBySymbolKey.set(
        symbolOnlyKey,
        positionsBySymbolKey.has(symbolOnlyKey) ? null : position,
      );
    }
  }

  for (const [key, position] of positionsBySymbolKey) {
    if (position) {
      positionsByKey.set(key, position);
    }
  }

  return positionsByKey;
}

function lookupTradingFoxSignalSourcePosition(
  order: TradingFoxOrderHistory["signalSourceOrders"][number],
  positionsByKey: ReadonlyMap<string, TradingFoxSignalSource["positions"][number]>,
): TradingFoxSignalSource["positions"][number] | null {
  const symbolKey = normalizeTradingFoxPositionSymbolKey(order.symbol);
  if (!order.signalSourceId || !symbolKey) {
    return null;
  }

  const sideKey = normalizeTradingFoxPositionSideKey(order.side);
  return positionsByKey.get(createTradingFoxSignalSourcePositionKey(order.signalSourceId, symbolKey, sideKey))
    ?? positionsByKey.get(createTradingFoxSignalSourcePositionKey(order.signalSourceId, symbolKey, ""))
    ?? null;
}

function createTradingFoxSignalSourcePositionKey(sourceId: string, symbolKey: string, sideKey: string): string {
  return `${sourceId.trim()}::${symbolKey}::${sideKey}`;
}

function normalizeTradingFoxPositionSymbolKey(value: string | undefined): string {
  const normalizedValue = (value ?? "").trim().toUpperCase();
  if (!normalizedValue) {
    return "";
  }
  return normalizedValue.split(":")[0]?.replace(/[^A-Z0-9]/gu, "") ?? "";
}

function normalizeTradingFoxPositionSideKey(value: string | undefined): string {
  const normalizedValue = (value ?? "").trim().toLowerCase();
  if (normalizedValue.includes("long") || normalizedValue.includes("buy")) {
    return "long";
  }
  if (normalizedValue.includes("short") || normalizedValue.includes("sell")) {
    return "short";
  }
  return normalizedValue;
}

function readPositiveTradingFoxNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
