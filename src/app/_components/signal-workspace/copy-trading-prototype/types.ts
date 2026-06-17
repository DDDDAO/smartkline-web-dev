import type { TelegramSessionUser } from "@/app/_lib/auth/telegram-auth";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { TradingFoxAccountResponse } from "@/app/_lib/tradingfox-control-plane";
import type { CopyTradingTrader } from "@/app/_types/copy-trading";

export type CopyTradingPrototypeTarget = {
  eventsCount: number;
  positionsCount: number;
  trader: CopyTradingTrader;
};

export type PrototypeApiConnection = {
  accountName: string;
  accountBalance: number | null;
  bindingLabel?: string;
  bindingMode?: string;
  displayName?: string;
  id: number;
  connectedAtLabel: string;
  exchangePlatform: string;
  isMock: boolean;
  mockMarginBalance: number | null;
  recommended?: boolean;
  status: "empty" | "connected";
  whitelistIp?: string;
};

export type PrototypeStrategyStatus = "failed" | "paused" | "pending" | "running" | "stopped";
export type PrototypeStrategyType = "copyTrading" | "mario";

export type PrototypeStrategy = {
  apiAccountName: string;
  accountEquity?: number;
  exchangeConnectorId: number;
  avatarUrl: string;
  createdAtLabel: string;
  eventsCount: number;
  followRatioPercent?: number;
  id: string;
  platform: string;
  positionsCount: number;
  signalSourceAvatarUrl?: string;
  signalSourceName?: string;
  signalSourcePlatform?: string;
  startedAt?: string;
  status: PrototypeStrategyStatus;
  stopLossPercent: number;
  strategyType?: PrototypeStrategyType;
  takeProfitPercent: number;
  traderId: string;
  traderName: string;
  unrealizedPnl?: number;
};

export type PrototypeStrategyCreateInput = {
  exchangeConnectorId: number;
  strategyName: string;
  strategyType: "mario";
} | {
  exchangeConnectorId: number;
  followRatioPercent: 100;
  stopLossPercent: number;
  strategyName: string;
  strategyType: "copyTrading";
  takeProfitPercent: number;
  target: CopyTradingPrototypeTarget;
};

export type PrototypeStrategySettingsUpdateInput = {
  stopLossPercent: number;
  strategyId: string;
  strategyName: string;
  takeProfitPercent: number;
};

export type PrototypeConnectionSaveInput = {
  accountName: string;
  apiKey?: string;
  exchangePlatform: string;
  ipAddress?: string;
  isMock: boolean;
  mockMarginBalance?: number;
  password?: string;
  privateKey?: string;
  secret?: string;
  walletAddress?: string;
};

export type AccountCenterPrototypeProps = {
  apiConnection: PrototypeApiConnection;
  apiConnections: readonly PrototypeApiConnection[];
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  copy: WorkspaceCopy;
  isApiSetupOpen: boolean;
  isAuthLoading: boolean;
  isCoveredByModal?: boolean;
  isDarkTheme: boolean;
  isOpen: boolean;
  strategies: readonly PrototypeStrategy[];
  telegramUser: TelegramSessionUser | null;
  onApiSetupOpen: () => void;
  onApiSetupOpenChange: (isOpen: boolean) => void;
  onClose: () => void;
  onConnectionDelete: (connectionId: number) => Promise<void> | void;
  onConnectionSave: (input: PrototypeConnectionSaveInput) => Promise<boolean> | boolean;
  onHyperliquidAgentBound: (account: TradingFoxAccountResponse, accountName: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  onStrategyCreate: (input: PrototypeStrategyCreateInput) => Promise<void> | void;
  onStrategyDelete: (strategyId: string) => Promise<void> | void;
  onStrategySettingsUpdate: (input: PrototypeStrategySettingsUpdateInput) => Promise<void> | void;
  onStrategyStatusChange: (strategyId: string, status: PrototypeStrategyStatus) => Promise<void> | void;
};

export type CopyTradingPrototypeModalProps = {
  apiConnection: PrototypeApiConnection;
  apiConnections: readonly PrototypeApiConnection[];
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  strategies: readonly PrototypeStrategy[];
  target: CopyTradingPrototypeTarget | null;
  onClose: () => void;
  onStart: (input: {
    exchangeConnectorId: number;
    strategyName: string;
    stopLossPercent: number;
    takeProfitPercent: number;
    target: CopyTradingPrototypeTarget;
  }) => void;
};

export type AccountManagementTab = "api" | "notifications" | "strategies";
export type NotificationChannelKey = "dingtalkWebhook" | "feishuWebhook" | "telegramBot" | "wecomWebhook";
