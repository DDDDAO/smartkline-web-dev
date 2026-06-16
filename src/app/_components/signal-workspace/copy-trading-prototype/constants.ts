import type { KlineInterval, MarketCandle } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";
import type { NotificationChannelKey } from "./types";

const BINANCE_DEMO_API_MANAGEMENT_URL = "https://demo.binance.com/zh-CN/my/settings/api-management";

export const MOCK_MARGIN_BALANCE_MAX = 100000;
export const MOCK_MARGIN_BALANCE_PRESETS = [1000, 5000, 10000] as const;
export const TRADE_HISTORY_PAGE_SIZE = 50;
export const TRADE_HISTORY_KLINE_CANDLE_LIMIT = 360;
export const EMPTY_MARKET_CANDLES: readonly MarketCandle[] = [];
export const EMPTY_STRUCTURED_SIGNALS: readonly StructuredSignal[] = [];
export const KLINE_INTERVAL_MS_BY_INTERVAL: Record<KlineInterval, number> = {
  "1d": 86_400_000,
  "1h": 3_600_000,
  "1m": 60_000,
  "4h": 14_400_000,
  "5m": 300_000,
  "15m": 900_000,
};
export const HYPERLIQUID_DEPOSIT_URL = "https://app.hyperliquid.xyz/portfolio";

export const EXCHANGES = [
  { id: "binance", apiManagementUrl: "https://www.binance.com/en/my/settings/api-management", connectorExchangePlatform: "Binance", defaultAccountName: "Binance #1", enabled: true, fallback: "BN", logoPath: "/exchanges/binance/brand/icon.png", mode: "api", registrationUrl: "https://accounts.binance.com/register", requiresApiPassword: false, requiresPrivateKey: false, requiresWalletAddress: false },
  { id: "okx", apiManagementUrl: "https://www.okx.com/account/my-api", connectorExchangePlatform: "OKX", defaultAccountName: "OKX #1", enabled: true, fallback: "OK", logoPath: "/exchanges/okx/brand/icon.png", mode: "api", registrationUrl: "https://www.okx.com/join", requiresApiPassword: true, requiresPrivateKey: false, requiresWalletAddress: false },
  { id: "hyperliquid", apiManagementUrl: "https://app.hyperliquid.xyz/API", connectorExchangePlatform: "HyperLiquid", defaultAccountName: "HyperLiquid #1", enabled: true, fallback: "HL", logoPath: "/exchanges/hyperliquid/brand/icon.png", mode: "api", registrationUrl: "https://app.hyperliquid.xyz/", requiresApiPassword: false, requiresPrivateKey: false, requiresWalletAddress: false },
  { id: "aster", apiManagementUrl: "https://www.asterdex.com/en/api-management", connectorExchangePlatform: "Aster", defaultAccountName: "Aster #1", enabled: true, fallback: "AS", logoPath: "/exchanges/aster/brand/icon.png", mode: "api", registrationUrl: "https://www.asterdex.com/en", requiresApiPassword: false, requiresPrivateKey: false, requiresWalletAddress: true },
  { id: "bitget", apiManagementUrl: "https://www.bitget.com/account/newapi", connectorExchangePlatform: "Bitget", defaultAccountName: "Bitget #1", enabled: true, fallback: "BG", logoPath: "/exchanges/bitget/brand/icon.png", mode: "api", registrationUrl: "https://www.bitget.com/register", requiresApiPassword: true, requiresPrivateKey: false, requiresWalletAddress: false },
  { id: "bybit", apiManagementUrl: "https://www.bybit.com/app/user/api-management", connectorExchangePlatform: "Bybit", defaultAccountName: "Bybit #1", enabled: true, fallback: "BY", logoPath: "/exchanges/bybit/brand/icon.png", mode: "api", registrationUrl: "https://www.bybit.com/register", requiresApiPassword: false, requiresPrivateKey: false, requiresWalletAddress: false },
  { id: "gate", apiManagementUrl: "https://www.gate.com/myaccount/apikeys", connectorExchangePlatform: "Gate", defaultAccountName: "Gate #1", enabled: true, fallback: "GT", logoPath: "/exchanges/gate/brand/icon.png", mode: "api", registrationUrl: "https://www.gate.com/signup", requiresApiPassword: false, requiresPrivateKey: false, requiresWalletAddress: false },
  { id: "mockExchange", apiManagementUrl: null, connectorExchangePlatform: "Mock", defaultAccountName: "Mock Exchange #1", enabled: true, fallback: "MX", logoPath: "/exchanges/binance/brand/icon.png", mode: "demo", registrationUrl: null, requiresApiPassword: false, requiresPrivateKey: false, requiresWalletAddress: false },
  { id: "binanceDemo", apiManagementUrl: BINANCE_DEMO_API_MANAGEMENT_URL, connectorExchangePlatform: "Binance", defaultAccountName: "Binance Demo #1", enabled: true, fallback: "BN", logoPath: "/exchanges/binance/brand/icon.png", mode: "demo", registrationUrl: null, requiresApiPassword: false, requiresPrivateKey: false, requiresWalletAddress: false },
] as const;

export type PrototypeExchange = typeof EXCHANGES[number];
export type PrototypeExchangeId = PrototypeExchange["id"];

export const NOTIFICATION_CHANNELS: readonly {
  icon: string;
  key: NotificationChannelKey;
  requiresWebhookUrl: boolean;
}[] = [
  { icon: "🤖", key: "telegramBot", requiresWebhookUrl: false },
  { icon: "💬", key: "feishuWebhook", requiresWebhookUrl: true },
  { icon: "🔗", key: "wecomWebhook", requiresWebhookUrl: true },
  { icon: "📨", key: "dingtalkWebhook", requiresWebhookUrl: true },
];

export const STRATEGY_NOTIFICATION_EVENTS = [
  { code: "trader.started", key: "traderStarted" },
  { code: "trader.stopped", key: "traderStopped" },
  { code: "trader.failed", key: "traderFailed" },
  { code: "order.filled", key: "orderFilled" },
  { code: "order.rejected", key: "orderRejected" },
  { code: "exchange.error", key: "exchangeError" },
  { code: "equity.threshold_crossed", key: "equityThresholdCrossed" },
  { code: "risk.take_profit", key: "riskTakeProfit" },
  { code: "risk.stop_loss", key: "riskStopLoss" },
] as const;
