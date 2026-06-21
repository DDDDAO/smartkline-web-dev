"use client";

import dynamic from "next/dynamic";

import type { TelegramAuthMeResponse } from "@/lib/auth/telegram-auth";
import type { CopyTradingTradeMarker } from "@/types/copy-trading";
import type { StructuredSignal } from "@/types/signal";
import type { CopyTradingPrototypeTarget } from "./copy-trading-prototype";
import type { WorkspaceProductTab } from "./product-tabs";
export {
  type WorkspaceCopy,
  type WorkspaceLanguage,
} from "@/i18n/workspace";
export {
  CommunityConversionModal,
  isWorkspaceProductTab,
  WORKSPACE_PRODUCT_TAB_STORAGE_KEY,
  WorkspaceProductTabs,
  type WorkspaceProductTab,
} from "./product-tabs";
export {
  DEFAULT_TOP_SIGNALS_WORKSPACE_PANEL,
  isTopSignalsWorkspacePanel,
  normalizeTopSignalsWorkspacePanel,
  TopSignalsWorkspaceTabs,
  type TopSignalsWorkspacePanel,
} from "./top-signals-workspace-tabs";
export { hasSeenOnboardingGuide, OnboardingGuide } from "./onboarding-guide";
export { RealtimeKlinePanel } from "./realtime-kline-panel";
export {
  formatKolSignalSourceError,
  type KolSignalSourceStatus,
} from "./types";
export { KolPanel } from "./kol-panel";

export const MAX_VISIBLE_KOL_SIGNAL_HISTORY = 1_000;
export const PAPER_POSITION_PRIORITY_SIGNAL_LIMIT = 160;
export const NOTIFICATION_DISMISS_MS = 6_500;
export const KOL_SIGNAL_POLL_INTERVAL_MS = 30_000;
export const TOP_SIGNALS_POLL_INTERVAL_MS = 60_000;
export const PAPER_POSITION_PRICE_UPDATE_INTERVAL_MS = 1_000;
export const TOP_SIGNAL_PRICE_UPDATE_INTERVAL_MS = 3_000;
export const COMPACT_LAYOUT_MEDIA_QUERY = "(max-width: 1023px)";
export const PNL_COLOR_MODE_STORAGE_KEY = "smartkline:pnl-color-mode";
export const MARIO_STRATEGIES_STORAGE_PREFIX = "smartkline:mario-strategies";
export const TELEGRAM_DISCUSSION_GROUP_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_GROUP_URL ?? "https://t.me/smartkline";

export const EMPTY_COPY_TRADING_TRADE_MARKERS: readonly CopyTradingTradeMarker[] = [];
export const EMPTY_COPY_TRADING_PROTOTYPE_TARGETS: readonly CopyTradingPrototypeTarget[] = [];
export const EMPTY_MARKET_SYMBOL_LIST: readonly string[] = [];
export const EMPTY_STRUCTURED_SIGNALS: readonly StructuredSignal[] = [];
export const LOGGED_OUT_AUTH_ME: TelegramAuthMeResponse = {
  botBinding: "unbound",
  communityBinding: "unverified",
  isLoggedIn: false,
  notificationPermission: "none",
  sourceBindingCount: 0,
  telegramUser: null,
};

export const AccountManagementPanelWithWallet = dynamic(
  () =>
    import("./account-wallet-boundary").then(
      (module) => module.AccountManagementPanelWithWallet,
    ),
  { loading: () => null },
);
export const StrategyManagementPanel = dynamic(
  () =>
    import("./strategy-management-query-boundary").then(
      (module) => module.StrategyManagementPanelWithQueryProvider,
    ),
  { loading: () => null },
);
export const ReferralDashboardPanel = dynamic(
  () =>
    import("./referral-dashboard-panel").then(
      (module) => module.ReferralDashboardPanel,
    ),
  { loading: () => null },
);
export const CopyTradingPrototypeModalWithWallet = dynamic(
  () =>
    import("./account-wallet-boundary").then(
      (module) => module.CopyTradingPrototypeModalWithWallet,
    ),
  { loading: () => null },
);
export const TopSignalsPanel = dynamic(
  () => import("./top-signals-panel").then((module) => module.TopSignalsPanel),
  { loading: () => null },
);
export const StrategySquareProductTab = dynamic(
  () =>
    import("./strategy-square/strategy-square-panel").then(
      (module) => module.StrategySquareProductTab,
    ),
  { loading: () => null },
);

export type WorkspaceNotificationKind = "error" | "info" | "success";

export type WorkspaceNotification = {
  id: string;
  kind: WorkspaceNotificationKind;
  message: string;
  meta: string;
  title: string;
};

export type SignalWorkspaceProps = {
  initialProductTab?: WorkspaceProductTab;
};
