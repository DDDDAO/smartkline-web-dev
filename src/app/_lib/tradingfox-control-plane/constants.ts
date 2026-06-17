import type { TradingFoxAccountStatus, TradingFoxCopyStrategyCurveWindow, TradingFoxStrategyDetailSection } from "./types";

export const DEFAULT_MOCK_MARGIN_BALANCE = 10_000;
export const DEFAULT_DEMO_EXCHANGE_PLATFORM = "Mock";
export const TRADINGFOX_COPY_STRATEGY_DEFINITION_ID = "COPY_TRADING";
export const TRADINGFOX_MARIO_STRATEGY_DEFINITION_ID = "MARIO_STRATEGY";
export const TRADINGFOX_ACTION_SYNC_POSITIONS = "sync_positions";
export const TRADINGFOX_STRATEGY_DETAIL_SECTIONS: readonly TradingFoxStrategyDetailSection[] = [
  "account",
  "positions",
  "signalSources",
  "orders",
  "curve",
];
export const TRADINGFOX_STRATEGY_DETAIL_SECTION_SET = new Set<TradingFoxStrategyDetailSection>(TRADINGFOX_STRATEGY_DETAIL_SECTIONS);
export const TRADINGFOX_STRATEGY_CURVE_WINDOWS: readonly TradingFoxCopyStrategyCurveWindow[] = ["24h", "7d", "30d", "90d", "180d"];
export const TRADINGFOX_STRATEGY_CURVE_WINDOW_SET = new Set<TradingFoxCopyStrategyCurveWindow>(TRADINGFOX_STRATEGY_CURVE_WINDOWS);

export type TradingFoxDemoExchangePlatform = "Mock" | "Binance";
export type TradingFoxLiveExchangePlatform = "Aster" | "Binance" | "Bitget" | "Bybit" | "Gate" | "HyperLiquid" | "OKX";

export type TradingFoxCopyStrategyConfigInput = {
  signalSourceConfigs?: readonly Record<string, unknown>[];
  signalSourceId: string;
  startTime?: string;
  takeProfitMargin?: number;
  stopLossPercent: number;
  takeProfitPercent: number;
};

export type TradingFoxAccountStatusResponse = {
  account?: TradingFoxAccountStatus | null;
  accountSnapshots?: unknown;
  account_snapshots?: unknown;
  curve?: unknown;
  data?: unknown;
  items?: unknown;
  performanceCurve?: unknown;
  performance_curve?: unknown;
  points?: unknown;
  snapshots?: unknown;
  strategyCurve?: unknown;
  strategy_curve?: unknown;
  updatedAt?: unknown;
  updated_at?: unknown;
};
