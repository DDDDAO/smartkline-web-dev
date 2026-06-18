import type {
  CopyTradingEvent,
  CopyTradingPosition,
  CopyTradingRadarSnapshot,
  CopyTradingTradeMarker,
  CopyTradingTradeMarkerSide,
  CopyTradingTrader,
} from "@/types/copy-trading";
import type { StructuredSignal } from "@/types/signal";
import { DEFAULT_TRADER_PLATFORM } from "./constants";
import {
  compareNullableNumbers,
  formatDisplayTimestamp,
  formatNumber,
  formatRiskLevel,
} from "./parsers";
import {
  formatCopyTradingEventType,
  getCopyTradingEventChartSignalId,
  toCopyTradingMarketSymbol,
} from "./public-helpers";

export function createCopyTradingChartSignals(snapshot: CopyTradingRadarSnapshot): StructuredSignal[] {
  const tradersById = new Map(snapshot.traders.map((trader) => [trader.trader_id, trader]));
  const positionsById = new Map(snapshot.positions.map((position) => [position.position_id, position]));
  return snapshot.events.map((event) => copyTradingEventToStructuredSignal(event, tradersById.get(event.trader_id), event.position_id ? positionsById.get(event.position_id) : undefined));
}

export function createCopyTradingTradeMarkers(snapshot: CopyTradingRadarSnapshot): CopyTradingTradeMarker[] {
  const tradersById = new Map(snapshot.traders.map((trader) => [trader.trader_id, trader]));
  return snapshot.events
    .map((event) => copyTradingEventToTradeMarker(event, tradersById.get(event.trader_id)))
    .filter((marker): marker is CopyTradingTradeMarker => marker !== null)
    .sort((left, right) => left.sourceTimeMs - right.sourceTimeMs || compareNullableNumbers(left.price, right.price));
}

function copyTradingEventToStructuredSignal(
  event: CopyTradingEvent,
  trader: CopyTradingTrader | undefined,
  position: CopyTradingPosition | undefined,
): StructuredSignal {
  const traderName = trader?.name ?? event.trader_id;
  const eventLabel = formatCopyTradingEventType(event.event_type);
  const symbol = toCopyTradingMarketSymbol(event.symbol);
  const entryPrice = event.event_price ?? position?.entry_price ?? null;

  return {
    id: getCopyTradingEventChartSignalId(event.event_id),
    source_name: traderName,
    source_avatar_url: trader?.avatar || null,
    source_level: event.severity === "high" ? "S" : event.severity === "medium" ? "A" : "B",
    source_type: `带单雷达 · ${eventLabel}`,
    symbol,
    direction: event.direction,
    entry_type: "trigger",
    entry_min: null,
    entry_max: null,
    trigger_price: entryPrice,
    confirmation: event.summary,
    stop_loss: null,
    take_profit: [],
    status: event.event_type === "close" ? "已平仓" : event.event_type === "take_profit" ? "建议止盈" : "观察中",
    risk_tags: [eventLabel, formatRiskLevel(event.severity), trader?.platform ?? DEFAULT_TRADER_PLATFORM],
    raw_text: `${traderName} ${eventLabel} ${event.symbol} ${event.direction === "long" ? "多" : "空"}，价格 ${formatNumber(entryPrice)}，${event.summary}`,
    summary: event.title,
    created_at: event.occurred_at,
    isStrongAlert: ["open", "close", "reverse", "oversized_position", "losing_streak"].includes(event.event_type),
    isReview: false,
  };
}

function copyTradingEventToTradeMarker(
  event: CopyTradingEvent,
  trader: CopyTradingTrader | undefined,
): CopyTradingTradeMarker | null {
  const price = event.event_price;
  const sourceTimeMs = Date.parse(event.occurred_at);
  const side = resolveCopyTradingTradeMarkerSide(event);
  if (!Number.isFinite(sourceTimeMs) || side === null) {
    return null;
  }

  const signalId = getCopyTradingEventChartSignalId(event.event_id);
  const traderName = trader?.name ?? event.trader_id;

  const actionLabel = formatCopyTradingEventType(event.event_type);
  const priceText = price !== null && Number.isFinite(price) ? formatNumber(price) : null;
  const occurredAtText = formatDisplayTimestamp(event.occurred_at);
  const priceSuffix = priceText ? ` @ ${priceText}` : "";

  return {
    actionLabel,
    avatarUrl: trader?.avatar ?? null,
    detail: event.summary,
    direction: event.direction,
    eventId: event.event_id,
    eventType: event.event_type,
    id: `copy-trade-point:${event.event_id}`,
    occurredAtText,
    price,
    priceText,
    side,
    signalId,
    sourceTimeMs,
    symbol: toCopyTradingMarketSymbol(event.symbol),
    title: `${traderName} ${actionLabel} ${event.symbol}${priceSuffix}`,
    traderId: event.trader_id,
    traderName,
  };
}

function resolveCopyTradingTradeMarkerSide(event: CopyTradingEvent): CopyTradingTradeMarkerSide | null {
  if (event.event_type === "open" || event.event_type === "add" || event.event_type === "reverse") {
    return event.direction === "long" ? "buy" : "sell";
  }

  if (event.event_type === "reduce" || event.event_type === "close" || event.event_type === "take_profit" || event.event_type === "stop_loss" || event.event_type === "trailing_stop") {
    return event.direction === "long" ? "sell" : "buy";
  }

  return null;
}
