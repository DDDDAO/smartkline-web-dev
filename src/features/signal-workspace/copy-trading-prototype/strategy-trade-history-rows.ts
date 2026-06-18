import type { TradingFoxStrategyDetail } from "@/app/_lib/tradingfox-control-plane";
import { finiteNumberOrNull } from "./formatters";
import type { CopyTradingPrototypeTarget, PrototypeStrategy } from "./types";
import type { SignalSourceIdentityById, TradeHistoryRow, TradeHistorySourceIdentity, TradingFoxOrderItem, TradingFoxSignalSourceOrderItem, TradingFoxTradeLogItem } from "./strategy-detail-shared";

export function createSignalSourceIdentityById(
  signalSources: readonly TradingFoxStrategyDetail["signalSources"][number][],
  strategy: PrototypeStrategy,
  availableSignalSources: readonly CopyTradingPrototypeTarget[] = [],
): SignalSourceIdentityById {
  const identities = new Map<string, TradeHistorySourceIdentity>();
  for (const target of availableSignalSources) {
    const sourceId = target.trader.trader_id.trim();
    if (!sourceId) {
      continue;
    }
    identities.set(sourceId, {
      avatarUrl: target.trader.avatar || null,
      id: sourceId,
      name: target.trader.name || sourceId,
    });
  }

  const fallbackSignalSourceName = strategy.signalSourceName || strategy.traderId;
  const fallbackSignalSourceAvatarUrl = strategy.signalSourceAvatarUrl || strategy.avatarUrl || null;
  signalSources.forEach((source) => {
    const sourceId = source.signalSourceId.trim();
    if (!sourceId) {
      return;
    }
    const existingIdentity = identities.get(sourceId);
    identities.set(sourceId, {
      avatarUrl: resolvePreferredSignalSourceAvatarUrl(existingIdentity?.avatarUrl, getTradingFoxSignalSourceAvatarUrl(source)),
      id: sourceId,
      name: existingIdentity?.name || source.name || fallbackSignalSourceName || sourceId,
    });
  });

  const strategySignalSourceId = strategy.traderId.trim();
  if (strategySignalSourceId) {
    const existingIdentity = identities.get(strategySignalSourceId);
    identities.set(strategySignalSourceId, {
      avatarUrl: resolvePreferredSignalSourceAvatarUrl(existingIdentity?.avatarUrl, fallbackSignalSourceAvatarUrl),
      id: strategySignalSourceId,
      name: existingIdentity?.name || fallbackSignalSourceName || strategySignalSourceId,
    });
  }

  return identities;
}

function getTradingFoxSignalSourceAvatarUrl(source: TradingFoxStrategyDetail["signalSources"][number]): string | null {
  return source.avatarUrl || source.avatar_url || source.signalSourceAvatarUrl || source.avatar || null;
}

function resolvePreferredSignalSourceAvatarUrl(...candidates: Array<string | null | undefined>): string | null {
  let generatedFallback: string | null = null;

  for (const candidate of candidates) {
    const avatarUrl = candidate?.trim();
    if (!avatarUrl) {
      continue;
    }
    if (!avatarUrl.startsWith("data:image/svg+xml")) {
      return avatarUrl;
    }
    generatedFallback ??= avatarUrl;
  }

  return generatedFallback;
}

export function createTradeHistoryRows({
  orders,
  signalSourceIdentityById,
  signalSourceOrders,
  strategy,
  tradeLogs,
}: {
  orders: readonly TradingFoxOrderItem[];
  signalSourceIdentityById: SignalSourceIdentityById;
  signalSourceOrders: readonly TradingFoxSignalSourceOrderItem[];
  strategy: PrototypeStrategy;
  tradeLogs: readonly TradingFoxTradeLogItem[];
}): TradeHistoryRow[] {
  return [
    ...orders.map((order) => createMyTradeHistoryRow(order, strategy)),
    ...signalSourceOrders.map((order) => createSignalSourceTradeHistoryRow(order, signalSourceIdentityById, strategy)),
    ...tradeLogs.map((log) => createTradeLogHistoryRow(log, signalSourceIdentityById, strategy)),
  ].sort(compareTradeHistoryRows);
}

function createMyTradeHistoryRow(order: TradingFoxOrderItem, strategy: PrototypeStrategy): TradeHistoryRow {
  return {
    action: order.side,
    id: `me:${order.clientOrderId}`,
    kind: "me",
    order,
    price: finiteNumberOrNull(order.price),
    quantity: finiteNumberOrNull(order.contractAmount),
    side: order.side,
    signalSourceOrder: null,
    source: {
      avatarUrl: strategy.avatarUrl || null,
      id: strategy.traderId,
      name: strategy.traderName,
    },
    sourceTimeMs: getTimestampMs(order.timestamp),
    status: order.status,
    symbol: order.symbol,
    timestamp: order.timestamp,
    tradeLog: null,
  };
}

function createSignalSourceTradeHistoryRow(
  order: TradingFoxSignalSourceOrderItem,
  signalSourceIdentityById: SignalSourceIdentityById,
  strategy: PrototypeStrategy,
): TradeHistoryRow {
  const fallbackName = order.signalSourceName || strategy.signalSourceName || strategy.traderId || order.signalSourceId;
  const source = signalSourceIdentityById.get(order.signalSourceId) ?? {
    avatarUrl: null,
    id: order.signalSourceId || strategy.traderId,
    name: fallbackName,
  };
  const sourceTimestamp = order.timestamp || order.sourceTimestamp || "";

  return {
    action: order.action,
    id: `source:${order.eventId || `${order.signalSourceId}:${order.symbol}:${sourceTimestamp}`}`,
    kind: "signalSource",
    order: null,
    price: getSignalSourceOrderPrice(order),
    quantity: getSignalSourceOrderQuantity(order),
    side: order.side,
    signalSourceOrder: order,
    source: {
      ...source,
      name: resolveTradeHistorySourceName(order.signalSourceName || source.name, source.id, fallbackName),
    },
    sourceTimeMs: getTimestampMs(sourceTimestamp),
    status: undefined,
    symbol: order.symbol,
    timestamp: sourceTimestamp,
    tradeLog: null,
  };
}

function createTradeLogHistoryRow(
  log: TradingFoxTradeLogItem,
  signalSourceIdentityById: SignalSourceIdentityById,
  strategy: PrototypeStrategy,
): TradeHistoryRow {
  const trade = log.ssTradeInfo ?? {};
  const config = log.ssConfig ?? {};
  const orderData = log.orderData ?? {};
  const sourceId = firstString(
    trade.signalSourceId,
    trade.signalSourceID,
    config.signalSourceId,
    config.signalSourceID,
    strategy.traderId,
  );
  const fallbackName = firstString(
    trade.signalSourceName,
    trade.sourceName,
    config.signalSourceName,
    config.sourceName,
    strategy.signalSourceName,
    strategy.traderId,
    sourceId,
  );
  const source = signalSourceIdentityById.get(sourceId) ?? {
    avatarUrl: null,
    id: sourceId,
    name: fallbackName,
  };
  const timestamp = firstString(trade.timestamp, trade.signalTimestamp, log.timestamp);
  const side = getTradeLogSide(log);

  return {
    action: log.type,
    id: `trade-log:${log.id}`,
    kind: "tradeLog",
    order: null,
    price: firstFiniteNumber(trade.price, orderData.orderPrice, orderData.price, orderData.markPrice),
    quantity: getTradeLogQuantity(log),
    side,
    signalSourceOrder: null,
    source: {
      ...source,
      name: resolveTradeHistorySourceName(source.name, source.id, fallbackName),
    },
    sourceTimeMs: getTimestampMs(timestamp),
    status: getTradeLogReason(log),
    symbol: firstString(trade.symbol, orderData.symbol) || "--",
    timestamp,
    tradeLog: log,
  };
}

function resolveTradeHistorySourceName(preferredName: string | undefined, sourceId: string, fallbackName: string): string {
  const normalizedPreferredName = firstString(preferredName);
  if (normalizedPreferredName && !isOpaqueSignalSourceId(normalizedPreferredName)) {
    return normalizedPreferredName;
  }

  const normalizedFallbackName = firstString(fallbackName);
  if (normalizedFallbackName && !isOpaqueSignalSourceId(normalizedFallbackName)) {
    return normalizedFallbackName;
  }

  return normalizedPreferredName || normalizedFallbackName || sourceId;
}

function isOpaqueSignalSourceId(value: string): boolean {
  return /^(?:信号源[:：]\s*)?(?:bn|mx)-[\da-z-]+$/iu.test(value.trim());
}

function compareTradeHistoryRows(left: TradeHistoryRow, right: TradeHistoryRow): number {
  if (left.sourceTimeMs !== right.sourceTimeMs) {
    return right.sourceTimeMs - left.sourceTimeMs;
  }
  if (left.kind !== right.kind) {
    return getTradeHistoryRowKindRank(left.kind) - getTradeHistoryRowKindRank(right.kind);
  }
  return left.id.localeCompare(right.id);
}

export function filterTradeHistoryRowsByStrategyStart(rows: readonly TradeHistoryRow[], strategy: PrototypeStrategy): TradeHistoryRow[] {
  const startedAtMs = getStrategyStartedAtMs(strategy);
  if (startedAtMs === null) {
    return [...rows];
  }

  return rows.filter((row) => row.sourceTimeMs >= startedAtMs);
}

function getStrategyStartedAtMs(strategy: PrototypeStrategy): number | null {
  const timestamp = Date.parse(strategy.startedAt ?? "");
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getTradeHistoryRowKindRank(kind: TradeHistoryRow["kind"]): number {
  switch (kind) {
    case "signalSource":
      return 0;
    case "me":
      return 1;
    case "tradeLog":
      return 2;
  }
}

function getTimestampMs(value: string | undefined): number {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getSignalSourceOrderQuantity(order: TradingFoxSignalSourceOrderItem): number | null {
  const quantity = firstFiniteNumber(
    order.deltaQty,
    order.metadata?.deltaQty,
    order.metadata?.delta_qty,
  );
  if (quantity !== null) {
    return Math.abs(quantity);
  }

  const previousQuantity = firstFiniteNumber(
    order.prevQty,
    order.metadata?.prevQty,
    order.metadata?.prev_qty,
  );
  const currentQuantity = firstFiniteNumber(
    order.currQty,
    order.metadata?.currQty,
    order.metadata?.curr_qty,
  );
  if (previousQuantity !== null && currentQuantity !== null) {
    return Math.abs(currentQuantity - previousQuantity);
  }
  if (currentQuantity !== null) {
    return Math.abs(currentQuantity);
  }

  return null;
}

function getSignalSourceOrderPrice(order: TradingFoxSignalSourceOrderItem): number | null {
  return firstFiniteNumber(
    order.price,
    order.metadata?.eventPrice,
    order.metadata?.event_price,
    order.metadata?.price,
    order.metadata?.executedPrice,
    order.metadata?.executed_price,
    order.metadata?.orderPrice,
    order.metadata?.order_price,
    order.metadata?.avgPrice,
    order.metadata?.avg_price,
    order.markPrice,
    order.metadata?.markPrice,
    order.metadata?.mark_price,
    order.entryPrice,
    order.metadata?.entryPrice,
    order.metadata?.entry_price,
  );
}

function getTradeLogQuantity(log: TradingFoxTradeLogItem): number | null {
  const trade = log.ssTradeInfo ?? {};
  const orderData = log.orderData ?? {};
  const quantity = firstFiniteNumber(trade.amountAbsolute, trade.nomAmount, orderData.contractAmount, orderData.amount);
  return quantity === null ? null : Math.abs(quantity);
}

function getTradeLogSide(log: TradingFoxTradeLogItem): string | undefined {
  const trade = log.ssTradeInfo ?? {};
  const orderData = log.orderData ?? {};
  const explicitSide = firstString(orderData.side, orderData.ccxtOrderSide, orderData.CCXTOrderSide);
  if (explicitSide) {
    return explicitSide;
  }

  const amount = firstFiniteNumber(trade.nomAmount);
  if (amount === null) {
    return undefined;
  }
  if (amount > 0) {
    return "buy";
  }
  if (amount < 0) {
    return "sell";
  }
  return undefined;
}

function getTradeLogReason(log: TradingFoxTradeLogItem): string {
  const additional = log.additionalInfo ?? {};
  return firstString(additional.skipReason, additional.errorCode, log.errorMessage, log.type) || "--";
}

function firstFiniteNumber(...values: readonly unknown[]): number | null {
  for (const value of values) {
    const number = finiteNumberOrNull(value);
    if (number !== null) {
      return number;
    }
  }
  return null;
}

function firstString(...values: readonly unknown[]): string {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        return trimmedValue;
      }
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}
