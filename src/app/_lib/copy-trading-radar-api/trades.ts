import type {
  CopyTradingEvent,
  CopyTradingEventType,
  CopyTradingPosition,
} from "@/app/_types/copy-trading";
import { REQUIRED_EVENT_TYPES } from "./constants";
import {
  formatNumber,
  formatPercent,
  formatSignedPercent,
  normalizeTimestamp,
  parseNumber,
  parsePositiveNumber,
} from "./parsers";
import { createPositionLookupKey, normalizeCopyTradingDirection } from "./positions";
import { formatCopyTradingEventType } from "./public-helpers";
import type { SignalCenterSignalSource, SignalCenterTradeEvent } from "./types";

export function adaptSignalCenterTrades(
  source: SignalCenterSignalSource,
  trades: readonly SignalCenterTradeEvent[],
  positionsBySourceAndSymbol: ReadonlyMap<string, CopyTradingPosition>,
): CopyTradingEvent[] {
  return filterDisplayableSignalCenterTrades(trades).map((trade, index) => {
    const eventType = normalizeTradeActionToEventType(trade);
    const position = positionsBySourceAndSymbol.get(createPositionLookupKey(source.id, trade.symbol, trade.side));
    const direction = normalizeCopyTradingDirection(trade.side);
    const eventPrice = readSignalCenterTradePrice(trade)
      ?? inferTradeEventPriceFromPosition(eventType, position);
    const pnlAfter = position?.unrealized_pnl ?? null;
    const severity = getEventSeverity(eventType, pnlAfter, position?.position_size_ratio ?? null);
    const title = `${source.name || source.id} ${formatCopyTradingEventType(eventType)} ${trade.symbol} ${direction === "long" ? "多单" : "空单"}`;

    return {
      event_id: trade.eventId || `${source.id}:${trade.symbol}:${trade.action}:${index}`,
      trader_id: source.id,
      position_id: position?.position_id,
      symbol: trade.symbol,
      direction,
      event_type: eventType,
      event_price: eventPrice,
      size_ratio_after: position?.position_size_ratio ?? null,
      pnl_after: pnlAfter,
      occurred_at: normalizeTimestamp(trade.timestamp || trade.sourceTimestamp),
      title,
      summary: createTradeEventSummary(trade, eventType, position),
      severity,
    };
  });
}

export function filterDisplayableSignalCenterTrades(
  trades: readonly SignalCenterTradeEvent[],
): SignalCenterTradeEvent[] {
  return trades.filter((trade) => !isSkippedSignalCenterTrade(trade));
}

export function isSkippedSignalCenterTrade(trade: SignalCenterTradeEvent): boolean {
  return isTruthyMetadataFlag(trade.skipped)
    || isSkipStatus(trade.status)
    || isSkipStatus(trade.tradeStatus)
    || isSkipStatus(trade.trade_status)
    || isTruthyMetadataFlag(trade.metadata?.skipped)
    || isSkipStatus(trade.metadata?.status)
    || isSkipStatus(trade.metadata?.tradeStatus)
    || isSkipStatus(trade.metadata?.trade_status);
}

function isTruthyMetadataFlag(value: unknown): boolean {
  return value === true || (typeof value === "string" && value.trim().toLowerCase() === "true");
}

function isSkipStatus(value: unknown): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === "skip";
}

function inferTradeEventPriceFromPosition(
  eventType: CopyTradingEventType,
  position: CopyTradingPosition | undefined,
): number | null {
  if (!position) {
    return null;
  }

  switch (eventType) {
    case "open":
    case "add":
    case "reverse":
      return position.entry_price ?? position.current_price;
    case "reduce":
    case "close":
    case "take_profit":
    case "stop_loss":
    case "trailing_stop":
      return position.current_price ?? position.entry_price;
    case "oversized_position":
    case "losing_streak":
      return position.current_price ?? position.entry_price;
  }
}

function createTradeEventSummary(
  trade: SignalCenterTradeEvent,
  eventType: CopyTradingEventType,
  position: CopyTradingPosition | undefined,
): string {
  const deltaQty = parseNumber(trade.deltaQty) ?? 0;
  const currQty = parseNumber(trade.currQty) ?? 0;
  const positionText = position
    ? `当前仓位约占 ${formatPercent(position.position_size_ratio)}，浮盈亏 ${formatSignedPercent(position.unrealized_pnl)}`
    : "这笔操作已记录，当前没有持仓";
  return `${formatCopyTradingEventType(eventType)} ${formatNumber(Math.abs(deltaQty))}，操作后持仓 ${formatNumber(currQty)}。${positionText}。`;
}

function normalizeTradeActionToEventType(trade: SignalCenterTradeEvent): CopyTradingEventType {
  const metadataEventType = normalizeCopyTradingEventType(trade.metadata?.eventType ?? trade.metadata?.event_type ?? trade.metadata?.copyTradingEventType);
  if (metadataEventType) {
    return metadataEventType;
  }

  const actionEventType = normalizeCopyTradingEventType(trade.action);
  if (actionEventType && actionEventType !== "add" && actionEventType !== "reduce") {
    return actionEventType;
  }

  if (trade.action === "leverage_change") {
    return "oversized_position";
  }

  const prevQty = Math.abs(parseNumber(trade.prevQty) ?? 0);
  const currQty = Math.abs(parseNumber(trade.currQty) ?? 0);
  const isCloseAction = trade.action === "close_long" || trade.action === "close_short";
  const isOpenAction = trade.action === "open_long" || trade.action === "open_short";

  if (isCloseAction && (trade.isFullClose || currQty === 0)) {
    return "close";
  }

  if (isCloseAction || currQty < prevQty) {
    return "reduce";
  }

  if (isOpenAction && prevQty > 0) {
    return "add";
  }

  return "open";
}

export function normalizeMockTradeActionToEventType(action: string): CopyTradingEventType {
  if (action.startsWith("open_")) {
    return "open";
  }

  if (action.startsWith("add_")) {
    return "add";
  }

  if (action.startsWith("close_")) {
    return "reduce";
  }

  return normalizeCopyTradingEventType(action) ?? "open";
}

function normalizeCopyTradingEventType(value: unknown): CopyTradingEventType | null {
  return typeof value === "string" && (REQUIRED_EVENT_TYPES as readonly string[]).includes(value)
    ? value as CopyTradingEventType
    : null;
}

function readSignalCenterTradePrice(trade: SignalCenterTradeEvent): number | null {
  return parsePositiveNumber(trade.price)
    ?? parsePositiveNumber(trade.metadata?.price)
    ?? parsePositiveNumber(trade.metadata?.eventPrice)
    ?? parsePositiveNumber(trade.metadata?.event_price)
    ?? parsePositiveNumber(trade.metadata?.executedPrice)
    ?? parsePositiveNumber(trade.metadata?.executed_price)
    ?? parsePositiveNumber(trade.metadata?.orderPrice)
    ?? parsePositiveNumber(trade.metadata?.order_price)
    ?? parsePositiveNumber(trade.metadata?.avgPrice)
    ?? parsePositiveNumber(trade.metadata?.avg_price)
    ?? parsePositiveNumber(trade.markPrice)
    ?? parsePositiveNumber(trade.mark_price)
    ?? parsePositiveNumber(trade.metadata?.markPrice)
    ?? parsePositiveNumber(trade.metadata?.mark_price)
    ?? parsePositiveNumber(trade.entryPrice)
    ?? parsePositiveNumber(trade.entry_price)
    ?? parsePositiveNumber(trade.metadata?.entryPrice)
    ?? parsePositiveNumber(trade.metadata?.entry_price);
}

function getEventSeverity(eventType: CopyTradingEventType, pnl: number | null, sizeRatio: number | null): "low" | "medium" | "high" {
  if (["stop_loss", "oversized_position", "losing_streak", "reverse"].includes(eventType)) {
    return "high";
  }

  if ((pnl ?? 0) < -0.08 || (sizeRatio ?? 0) >= 0.35) {
    return "high";
  }

  if (["open", "add", "close"].includes(eventType)) {
    return "medium";
  }

  return "low";
}

export function isLossTrade(trade: SignalCenterTradeEvent): boolean {
  const metadataPnl = trade.metadata?.pnl ?? trade.metadata?.realizedPnl;
  return typeof metadataPnl === "number" ? metadataPnl < 0 : typeof metadataPnl === "string" && Number(metadataPnl) < 0;
}
