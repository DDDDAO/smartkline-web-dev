import type { CopyTradingEventType } from "@/app/_types/copy-trading";
import type { CopyTradingSignalSourceSortKey } from "./types";

export const SIGNAL_CENTER_PROXY_BASE_URL = "/api/signal-center";
export const SMART_MONEY_SIGNAL_TYPE = "BinanceSmartMoney";
export const FALLBACK_UPDATED_AT = "2026-06-05T12:00:00+08:00";
export const DEFAULT_TRADER_PLATFORM = "Binance Square";
export const USDT_SUFFIX = "USDT";
export const MOCK_MARKET_ALIGNMENT_TIMEOUT_MS = 2_500;
export const MOCK_MARKET_ALIGNMENT_HISTORY_LIMIT = 180;
export const COPY_TRADING_RADAR_SOURCE_LIMIT = 200;
export const COPY_TRADING_RADAR_TRADE_LIMIT = 200;

export const LIST_SIGNAL_SOURCE_SORT_BY: Partial<Record<CopyTradingSignalSourceSortKey, string>> = {
  maxDrawdown: "maxdrawdown",
  pnl: "pnl",
  roi: "roi",
  sharpeRatio: "sharpe",
};

export const REQUIRED_EVENT_TYPES: CopyTradingEventType[] = [
  "open",
  "add",
  "reduce",
  "close",
  "reverse",
  "take_profit",
  "stop_loss",
  "trailing_stop",
  "oversized_position",
  "losing_streak",
];
