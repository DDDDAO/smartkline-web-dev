"use client";

import { useRef, useState } from "react";
import { useLocale } from "next-intl";

import type { ChartTimeFocusRequest } from "@/components/charts/kline-chart/types";
import type { TelegramAuthMeResponse } from "@/lib/auth/telegram-auth";
import { markets } from "@/lib/demo-data";
import {
  getWorkspaceCopy,
  getWorkspaceLanguageFromLocale,
  type WorkspaceCopy,
} from "@/i18n/workspace";
import {
  createEmptyWorkspaceWatchlist,
  type WorkspaceWatchlist,
} from "@/lib/workspace-watchlist";
import type { CopyTradingRadarSnapshot } from "@/types/copy-trading";
import type { KlineInterval, MarketSymbol } from "@/types/market";
import type { StructuredSignal } from "@/types/signal";
import type { ChartTheme } from "@/components/charts/kline-chart";
import type {
  CopyTradingPrototypeTarget,
  PrototypeApiConnection,
  PrototypeStrategy,
} from "../copy-trading-prototype";
import type {
  PnlColorMode,
  TopSignalPerformanceWindow,
  TopSignalSortKey,
} from "../top-signals-panel";
import type { PaperPositionMarketCandleUpdate } from "../use-paper-position-candles";
import type {
  WorkspaceNotification,
  SignalWorkspaceProps,
  TopSignalsWorkspacePanel,
} from "../signal-workspace-helpers";
import {
  createEmptyPrototypeApiConnection,
  DEFAULT_TOP_SIGNALS_WORKSPACE_PANEL,
  LOGGED_OUT_AUTH_ME,
  useCompactLayout,
} from "../signal-workspace-helpers";
import type { KolSignalSourceStatus } from "../types";

export function useSignalWorkspaceStateBase({
  initialProductTab = "strategySquare",
}: SignalWorkspaceProps = {}) {
  const [symbol, setSymbol] = useState<MarketSymbol>("BTC/USDT:USDT");
  const [interval, setInterval] = useState<KlineInterval>("15m");
  const [activeSignalId, setActiveSignalId] = useState("");
  const [chartFocusSignalRequestKey, setChartFocusSignalRequestKey] = useState<
    string | null
  >(null);
  const [chartFocusTimeRequest, setChartFocusTimeRequest] =
    useState<ChartTimeFocusRequest | null>(null);
  const [theme, setTheme] = useState<ChartTheme>("light");
  const [pnlColorMode, setPnlColorMode] =
    useState<PnlColorMode>("positiveGreen");
  const [isPnlColorModeHydrated, setIsPnlColorModeHydrated] = useState(false);
  const language = getWorkspaceLanguageFromLocale(useLocale());
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isMobileKolSheetOpen, setIsMobileKolSheetOpen] = useState(false);
  const [isMobileTopSignalsSheetOpen, setIsMobileTopSignalsSheetOpen] =
    useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [isRightPanelExiting, setIsRightPanelExiting] = useState(false);
  const [activeProductTab, setActiveProductTab] =
    useState<NonNullable<SignalWorkspaceProps["initialProductTab"]>>(
      initialProductTab,
    );
  const [isProductTabHydrated, setIsProductTabHydrated] = useState(false);
  const [isCommunityConversionOpen, setIsCommunityConversionOpen] =
    useState(false);
  const [isWorkspaceMotionVisible, setIsWorkspaceMotionVisible] =
    useState(false);
  const [marketOptions, setMarketOptions] = useState<MarketSymbol[]>(markets);
  const [signals, setSignals] = useState<StructuredSignal[]>([]);
  const [watchlist, setWatchlist] = useState<WorkspaceWatchlist>(() =>
    createEmptyWorkspaceWatchlist(),
  );
  const [isWatchlistHydrated, setIsWatchlistHydrated] = useState(false);
  const [topSignalsSnapshot, setTopSignalsSnapshot] =
    useState<CopyTradingRadarSnapshot | null>(null);
  const [activeTopSignalSourceId, setActiveTopSignalSourceId] = useState("");
  const [activeTopSignalTradeEventId, setActiveTopSignalTradeEventId] =
    useState("");
  const [topSignalsPanel, setTopSignalsPanel] = useState<TopSignalsWorkspacePanel>(
    DEFAULT_TOP_SIGNALS_WORKSPACE_PANEL,
  );
  const [topSignalsSourceFilterId, setTopSignalsSourceFilterId] =
    useState("all");
  const [topSignalPerformanceWindow, setTopSignalPerformanceWindow] =
    useState<TopSignalPerformanceWindow>("30d");
  const [topSignalSortKey, setTopSignalSortKey] =
    useState<TopSignalSortKey>("pnl");
  const [explicitTopSignalSourceId, setExplicitTopSignalSourceId] =
    useState("");
  const [topSignalsSourceStatus, setTopSignalsSourceStatus] =
    useState<KolSignalSourceStatus>({ error: null, isLoading: true });
  const [latestMarketCandleUpdate, setLatestMarketCandleUpdate] =
    useState<PaperPositionMarketCandleUpdate | null>(null);
  const [workspaceNotification, setWorkspaceNotification] =
    useState<WorkspaceNotification | null>(null);
  const [authMe, setAuthMe] =
    useState<TelegramAuthMeResponse>(LOGGED_OUT_AUTH_ME);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isTradingFoxLoading, setIsTradingFoxLoading] = useState(false);
  const [isTradingFoxAccountLoaded, setIsTradingFoxAccountLoaded] =
    useState(false);
  const [isApiSetupOpen, setIsApiSetupOpen] = useState(false);
  const [prototypeApiConnections, setPrototypeApiConnections] = useState<
    PrototypeApiConnection[]
  >([]);
  const [prototypeStrategies, setPrototypeStrategies] = useState<
    PrototypeStrategy[]
  >([]);
  const [prototypeMarioStrategies, setPrototypeMarioStrategies] = useState<
    PrototypeStrategy[]
  >([]);
  const [activeAccountStrategyId, setActiveAccountStrategyId] = useState("");
  const [isMarioStrategiesHydrated, setIsMarioStrategiesHydrated] =
    useState(false);
  const [copyTradingTarget, setCopyTradingTarget] =
    useState<CopyTradingPrototypeTarget | null>(null);
  const [pendingCopyTradingTarget, setPendingCopyTradingTarget] =
    useState<CopyTradingPrototypeTarget | null>(null);
  const [kolSignalSourceStatus, setKolSignalSourceStatus] =
    useState<KolSignalSourceStatus>({ error: null, isLoading: true });

  const copy = getWorkspaceCopy(language);
  const copyRef = useRef<WorkspaceCopy>(copy);
  const isCompactLayout = useCompactLayout();
  const rightPanelExitTimeoutRef = useRef<number | null>(null);
  const onboardingOpenTimeoutRef = useRef<number | null>(null);
  const hasEvaluatedAutoOnboardingRef = useRef(false);
  const pendingRouteTopSignalTradeEventIdRef = useRef("");
  const prototypeApiConnection =
    prototypeApiConnections[0] ?? createEmptyPrototypeApiConnection();

  return {
    activeAccountStrategyId,
    activeProductTab,
    activeSignalId,
    activeTopSignalSourceId,
    activeTopSignalTradeEventId,
    authMe,
    chartFocusSignalRequestKey,
    chartFocusTimeRequest,
    copy,
    copyRef,
    copyTradingTarget,
    explicitTopSignalSourceId,
    hasEvaluatedAutoOnboardingRef,
    interval,
    isApiSetupOpen,
    isAuthLoading,
    isCommunityConversionOpen,
    isCompactLayout,
    isMarioStrategiesHydrated,
    isMobileKolSheetOpen,
    isMobileTopSignalsSheetOpen,
    isOnboardingOpen,
    isPnlColorModeHydrated,
    isProductTabHydrated,
    isRightPanelCollapsed,
    isRightPanelExiting,
    isTradingFoxAccountLoaded,
    isTradingFoxLoading,
    isWatchlistHydrated,
    isWorkspaceMotionVisible,
    kolSignalSourceStatus,
    language,
    latestMarketCandleUpdate,
    marketOptions,
    onboardingOpenTimeoutRef,
    pendingCopyTradingTarget,
    pendingRouteTopSignalTradeEventIdRef,
    pnlColorMode,
    prototypeApiConnection,
    prototypeApiConnections,
    prototypeMarioStrategies,
    prototypeStrategies,
    rightPanelExitTimeoutRef,
    setActiveAccountStrategyId,
    setActiveProductTab,
    setActiveSignalId,
    setActiveTopSignalSourceId,
    setActiveTopSignalTradeEventId,
    setAuthMe,
    setChartFocusSignalRequestKey,
    setChartFocusTimeRequest,
    setCopyTradingTarget,
    setExplicitTopSignalSourceId,
    setInterval,
    setIsApiSetupOpen,
    setIsAuthLoading,
    setIsCommunityConversionOpen,
    setIsMarioStrategiesHydrated,
    setIsMobileKolSheetOpen,
    setIsMobileTopSignalsSheetOpen,
    setIsOnboardingOpen,
    setIsPnlColorModeHydrated,
    setIsProductTabHydrated,
    setIsRightPanelCollapsed,
    setIsRightPanelExiting,
    setIsTradingFoxAccountLoaded,
    setIsTradingFoxLoading,
    setIsWatchlistHydrated,
    setIsWorkspaceMotionVisible,
    setKolSignalSourceStatus,
    setLatestMarketCandleUpdate,
    setMarketOptions,
    setPendingCopyTradingTarget,
    setPnlColorMode,
    setPrototypeApiConnections,
    setPrototypeMarioStrategies,
    setPrototypeStrategies,
    setSignals,
    setSymbol,
    setTheme,
    setTopSignalPerformanceWindow,
    setTopSignalsPanel,
    setTopSignalSortKey,
    setTopSignalsSnapshot,
    setTopSignalsSourceFilterId,
    setTopSignalsSourceStatus,
    setWatchlist,
    setWorkspaceNotification,
    signals,
    symbol,
    theme,
    topSignalPerformanceWindow,
    topSignalsPanel,
    topSignalSortKey,
    topSignalsSnapshot,
    topSignalsSourceFilterId,
    topSignalsSourceStatus,
    watchlist,
    workspaceNotification,
  };
}

export type SignalWorkspaceStateBase = ReturnType<
  typeof useSignalWorkspaceStateBase
>;
