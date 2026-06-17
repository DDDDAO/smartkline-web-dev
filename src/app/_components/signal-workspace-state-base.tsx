"use client";

import { useRef, useState } from "react";

import type { ChartTimeFocusRequest } from "@/app/_components/kline-chart/types";
import type { TelegramAuthMeResponse } from "@/app/_lib/auth/telegram-auth";
import { markets } from "@/app/_lib/demo-data";
import {
  getWorkspaceCopy,
  type WorkspaceCopy,
  type WorkspaceLanguage,
} from "@/app/_lib/i18n";
import {
  createEmptyWorkspaceWatchlist,
  type WorkspaceWatchlist,
} from "@/app/_lib/workspace-watchlist";
import type { CopyTradingRadarSnapshot } from "@/app/_types/copy-trading";
import type { KlineInterval, MarketSymbol } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";
import type { ChartTheme } from "@/app/_components/kline-chart";
import type {
  CopyTradingPrototypeTarget,
  PrototypeApiConnection,
  PrototypeStrategy,
} from "./signal-workspace/copy-trading-prototype";
import type {
  PnlColorMode,
  TopSignalPerformanceWindow,
  TopSignalSortKey,
} from "./signal-workspace/top-signals-panel";
import type { PaperPositionMarketCandleUpdate } from "./signal-workspace/use-paper-position-candles";
import type {
  WorkspaceNotification,
  SignalWorkspaceProps,
} from "./signal-workspace/signal-workspace-helpers";
import {
  createEmptyPrototypeApiConnection,
  LOGGED_OUT_AUTH_ME,
  useCompactLayout,
} from "./signal-workspace/signal-workspace-helpers";
import type { KolSignalSourceStatus } from "./signal-workspace/types";

export function useSignalWorkspaceStateBase({
  initialProductTab = "intel",
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
  const [language, setLanguage] = useState<WorkspaceLanguage>("zh-CN");
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
    setLanguage,
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
