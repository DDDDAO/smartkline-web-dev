import type { CopyTradingEventType, CopyTradingTrader } from "@/types/copy-trading";
import type { MarketSymbol } from "@/types/market";
import { REQUIRED_EVENT_TYPES, USDT_SUFFIX } from "./constants";

export function getCopyTradingEventChartSignalId(eventId: string): string {
  return `copy-radar:${eventId}`;
}

export function isActiveCopyTradingTrader(trader: Pick<CopyTradingTrader, "status">): boolean {
  return trader.status.trim().toUpperCase() === "ACTIVE";
}

export function toCopyTradingMarketSymbol(symbol: string): MarketSymbol {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (/^[A-Z0-9]+\/USDT$/u.test(normalizedSymbol)) {
    return `${normalizedSymbol}:USDT`;
  }

  if (normalizedSymbol.includes("/")) {
    return normalizedSymbol;
  }

  if (normalizedSymbol.endsWith(USDT_SUFFIX)) {
    const baseAsset = normalizedSymbol.slice(0, -USDT_SUFFIX.length);
    return `${baseAsset}/USDT:USDT`;
  }

  return `${normalizedSymbol}/USDT:USDT`;
}

export function formatCopyTradingEventType(eventType: CopyTradingEventType): string {
  const labels: Record<CopyTradingEventType, string> = {
    open: "开仓",
    add: "加仓",
    reduce: "减仓",
    close: "平仓",
    reverse: "反手",
    take_profit: "止盈",
    stop_loss: "止损",
    trailing_stop: "移动止损",
    oversized_position: "仓位异常放大",
    losing_streak: "连续亏损",
  };
  return labels[eventType];
}

export function getCopyTradingRequiredEventTypes(): CopyTradingEventType[] {
  return REQUIRED_EVENT_TYPES;
}
