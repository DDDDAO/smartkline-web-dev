"use client";

import Image from "next/image";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { markets } from "@/app/_lib/demo-data";
import { fetchUsdtPerpetualMarkets } from "@/app/_lib/binance-market-data";
import { getTradingFoxErrorMessage } from "@/app/_lib/tradingfox-errors";
import {
  createStructuredSignalPositionKey,
  fetchKolSignals,
  fetchKolSignalsAfter,
} from "@/app/_lib/kol-signal-api";
import {
  applyCopyTradingLatestPrices,
  createCopyTradingTradeMarkers,
  createMarketAlignedMockCopyTradingRadarSnapshot,
  fetchCopyTradingRadarSnapshot,
  fetchCopyTradingSourceReturnCurve,
  fetchCopyTradingSourceTradeHistoryPage,
  isActiveCopyTradingTrader,
  toCopyTradingMarketSymbol,
} from "@/app/_lib/copy-trading-radar-api";
import {
  computePaperPositionRecord,
  type PaperPositionRecord,
} from "@/app/_lib/paper-position";
import { KolPanel } from "./signal-workspace/kol-panel";
import {
  getWorkspaceCopy,
  isWorkspaceLanguage,
  WORKSPACE_LANGUAGE_STORAGE_KEY,
  type WorkspaceCopy,
  type WorkspaceLanguage,
} from "@/app/_lib/i18n";
import {
  createEmptyWorkspaceWatchlist,
  createKolSourceWatchKey,
  parseWorkspaceWatchlistValue,
  serializeWorkspaceWatchlist,
  WORKSPACE_WATCHLIST_STORAGE_KEY,
  type WorkspaceWatchlist,
} from "@/app/_lib/workspace-watchlist";
import { hasSeenOnboardingGuide, OnboardingGuide } from "./signal-workspace/onboarding-guide";
import { RealtimeKlinePanel } from "./signal-workspace/realtime-kline-panel";
import {
  formatKolSignalSourceError,
  type KolSignalSourceStatus,
} from "./signal-workspace/types";
import {
  type PaperPositionMarketCandleUpdate,
  usePaperPositionCandles,
} from "./signal-workspace/use-paper-position-candles";
import {
  readBinanceMiniTickerPrice,
  useBinanceMiniTickerPrices,
} from "./signal-workspace/use-binance-mini-ticker-prices";
import {
  createSignalFocusRequestKey,
  type ChartTheme,
} from "@/app/_components/kline-chart";
import type { ChartTimeFocusRequest, KlineSignalBiasSummary } from "@/app/_components/kline-chart/types";
import type { KlineInterval, MarketSymbol } from "@/app/_types/market";
import type {
  CopyTradingEvent,
  CopyTradingPosition,
  CopyTradingRadarSnapshot,
  CopyTradingTrader,
  CopyTradingTradeMarker,
} from "@/app/_types/copy-trading";
import type { StructuredSignal } from "@/app/_types/signal";
import { SourceAvatar, SymbolIcon } from "./signal-workspace/card-ui";
import {
  formatSignalPaperPositionStatus,
  getSignalDirectionBadgeClass,
  getSignalPaperPositionBadgeClass,
} from "./signal-workspace/paper-position-summary";
import {
  CommunityConversionModal,
  isWorkspaceProductTab,
  KolFollowProductTab,
  WORKSPACE_PRODUCT_TAB_STORAGE_KEY,
  WorkspaceProductTabs,
  type WorkspaceProductTab,
} from "./signal-workspace/product-tabs";
import {
  AccountEntryButton,
  AccountManagementPanel,
  CopyTradingPrototypeModal,
  type CopyTradingPrototypeTarget,
  type PrototypeApiConnection,
  type PrototypeConnectionSaveInput,
  type PrototypeStrategy,
  type PrototypeStrategyCreateInput,
  type PrototypeStrategyStatus,
} from "./signal-workspace/copy-trading-prototype";
import { TopSignalsPanel, type PnlColorMode, type TopSignalReturnCurveState } from "./signal-workspace/top-signals-panel";
import type { TelegramAuthMeResponse } from "@/app/_lib/auth/telegram-auth";
import type { TradingFoxAccountResponse, TradingFoxConnector } from "@/app/_lib/tradingfox-control-plane";

const MAX_VISIBLE_KOL_SIGNAL_HISTORY = 1_000;
const NOTIFICATION_DISMISS_MS = 6_500;
const KOL_SIGNAL_POLL_INTERVAL_MS = 30_000;
const TOP_SIGNALS_POLL_INTERVAL_MS = 60_000;
const PAPER_POSITION_PRICE_UPDATE_INTERVAL_MS = 1_000;
const TOP_SIGNAL_PRICE_UPDATE_INTERVAL_MS = 3_000;
const COMPACT_LAYOUT_MEDIA_QUERY = "(max-width: 1023px)";
const PNL_COLOR_MODE_STORAGE_KEY = "smartkline:pnl-color-mode";
const MARIO_STRATEGIES_STORAGE_PREFIX = "smartkline:mario-strategies";
const TELEGRAM_DISCUSSION_GROUP_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_GROUP_URL ?? "https://t.me/smartkline";
const EMPTY_COPY_TRADING_TRADE_MARKERS: readonly CopyTradingTradeMarker[] = [];
const EMPTY_COPY_TRADING_PROTOTYPE_TARGETS: readonly CopyTradingPrototypeTarget[] = [];
const EMPTY_MARKET_SYMBOL_LIST: readonly string[] = [];
const EMPTY_STRUCTURED_SIGNALS: readonly StructuredSignal[] = [];
const LOGGED_OUT_AUTH_ME: TelegramAuthMeResponse = {
  botBinding: "unbound",
  communityBinding: "unverified",
  isLoggedIn: false,
  notificationPermission: "none",
  sourceBindingCount: 0,
  telegramUser: null,
};
const WORKSPACE_TAB_ROUTE_SEGMENTS: Readonly<Record<WorkspaceProductTab, string>> = {
  intel: "kol",
  kolFollow: "kol-square",
  topSignals: "signal",
  accountManagement: "account",
};

type WorkspaceNotificationKind = "error" | "info" | "success";

type WorkspaceNotification = {
  id: string;
  kind: WorkspaceNotificationKind;
  message: string;
  meta: string;
  title: string;
};

type WorkspaceRouteState = {
  signalId: string;
  symbol: MarketSymbol | null;
  tab: WorkspaceProductTab | null;
  topSignalSourceId: string;
  topSignalTradeEventId: string;
};

export function SignalWorkspace() {
  const [symbol, setSymbol] = useState<MarketSymbol>("BTC/USDT:USDT");
  const [interval, setInterval] = useState<KlineInterval>("15m");
  const [activeSignalId, setActiveSignalId] = useState("");
  const [chartFocusSignalRequestKey, setChartFocusSignalRequestKey] = useState<
    string | null
  >(null);
  const [chartFocusTimeRequest, setChartFocusTimeRequest] =
    useState<ChartTimeFocusRequest | null>(null);
  const [theme, setTheme] = useState<ChartTheme>("light");
  const [pnlColorMode, setPnlColorMode] = useState<PnlColorMode>("positiveGreen");
  const [isPnlColorModeHydrated, setIsPnlColorModeHydrated] = useState(false);
  const [language, setLanguage] = useState<WorkspaceLanguage>("zh-CN");
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isMobileKolSheetOpen, setIsMobileKolSheetOpen] = useState(false);
  const [isMobileTopSignalsSheetOpen, setIsMobileTopSignalsSheetOpen] =
    useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [isRightPanelExiting, setIsRightPanelExiting] = useState(false);
  const [activeProductTab, setActiveProductTab] =
    useState<WorkspaceProductTab>("intel");
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
  const [explicitTopSignalSourceId, setExplicitTopSignalSourceId] =
    useState("");
  const [topSignalsSourceStatus, setTopSignalsSourceStatus] =
    useState<KolSignalSourceStatus>({
      error: null,
      isLoading: true,
    });
  const [topSignalReturnCurvesBySourceId, setTopSignalReturnCurvesBySourceId] =
    useState<Readonly<Record<string, TopSignalReturnCurveState>>>(() => ({}));
  const [latestMarketCandleUpdate, setLatestMarketCandleUpdate] =
    useState<PaperPositionMarketCandleUpdate | null>(null);
  const [workspaceNotification, setWorkspaceNotification] =
    useState<WorkspaceNotification | null>(null);
  const [authMe, setAuthMe] = useState<TelegramAuthMeResponse>(LOGGED_OUT_AUTH_ME);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isTradingFoxLoading, setIsTradingFoxLoading] = useState(false);
  const [isApiSetupOpen, setIsApiSetupOpen] = useState(false);
  const [prototypeApiConnections, setPrototypeApiConnections] = useState<PrototypeApiConnection[]>([]);
  const prototypeApiConnection = prototypeApiConnections[0] ?? createEmptyPrototypeApiConnection();
  const [prototypeStrategies, setPrototypeStrategies] = useState<
    PrototypeStrategy[]
  >([]);
  const [prototypeMarioStrategies, setPrototypeMarioStrategies] = useState<
    PrototypeStrategy[]
  >([]);
  const [isMarioStrategiesHydrated, setIsMarioStrategiesHydrated] = useState(false);
  const [copyTradingTarget, setCopyTradingTarget] =
    useState<CopyTradingPrototypeTarget | null>(null);
  const [pendingCopyTradingTarget, setPendingCopyTradingTarget] =
    useState<CopyTradingPrototypeTarget | null>(null);
  const [kolSignalSourceStatus, setKolSignalSourceStatus] =
    useState<KolSignalSourceStatus>({
      error: null,
      isLoading: true,
    });
  const latestKolSignalCreatedAtRef = useRef<string | null>(null);
  const copy = getWorkspaceCopy(language);
  const copyRef = useRef<WorkspaceCopy>(copy);
  const isCompactLayout = useCompactLayout();
  const rightPanelExitTimeoutRef = useRef<number | null>(null);
  const onboardingOpenTimeoutRef = useRef<number | null>(null);
  const hasEvaluatedAutoOnboardingRef = useRef(false);
  const pendingRouteTopSignalTradeEventIdRef = useRef("");
  const pendingTopSignalReturnCurveRequestsRef = useRef<Map<string, Promise<void>>>(new Map());
  const topSignalReturnCurvesBySourceIdRef = useRef(topSignalReturnCurvesBySourceId);

  const activeSignal =
    signals.find((signal) => signal.id === activeSignalId) ??
    signals[0] ??
    null;
  const isIntelTab = activeProductTab === "intel";
  const isTopSignalsTab = activeProductTab === "topSignals";
  const isAccountManagementTab = activeProductTab === "accountManagement";
  const shouldUsePaperPositions = !isTopSignalsTab && !isAccountManagementTab;
  const kolSignals = useMemo(() => sortSignalsForKolPanel(signals), [signals]);
  const paperPositionSignals = useMemo(
    () => shouldUsePaperPositions ? signals : EMPTY_STRUCTURED_SIGNALS,
    [shouldUsePaperPositions, signals],
  );
  const watchlistedKolSourceKeys = useMemo(
    () => new Set(watchlist.kolSources.map((source) => source.key)),
    [watchlist.kolSources],
  );
  const watchlistedTopSignalSourceIds = useMemo(
    () => new Set(watchlist.topSignalSources.map((source) => source.id)),
    [watchlist.topSignalSources],
  );
  const topSignalMiniTickerSymbols = useMemo(() => {
    if (!isTopSignalsTab || !topSignalsSnapshot) {
      return EMPTY_MARKET_SYMBOL_LIST;
    }

    return Array.from(new Set(topSignalsSnapshot.positions.map((position) => position.symbol)));
  }, [isTopSignalsTab, topSignalsSnapshot]);
  const {
    latestPricesBySymbol: topSignalMiniTickerPricesBySymbol,
  } = useBinanceMiniTickerPrices(topSignalMiniTickerSymbols, {
    updateIntervalMs: TOP_SIGNAL_PRICE_UPDATE_INTERVAL_MS,
  });
  const deferredTopSignalMiniTickerPricesBySymbol = useDeferredValue(
    topSignalMiniTickerPricesBySymbol,
  );
  const topSignalsDisplaySnapshot = useMemo(
    () => topSignalsSnapshot
      ? applyCopyTradingLatestPrices(topSignalsSnapshot, deferredTopSignalMiniTickerPricesBySymbol)
      : null,
    [deferredTopSignalMiniTickerPricesBySymbol, topSignalsSnapshot],
  );
  const topSignalsActiveSourceIds = useMemo(
    () => new Set(topSignalsSnapshot?.traders.filter(isActiveCopyTradingTrader).map((trader) => trader.trader_id) ?? []),
    [topSignalsSnapshot],
  );
  const copyTradingSignalSourceTargets = useMemo(
    () => createCopyTradingPrototypeTargets(topSignalsSnapshot),
    [topSignalsSnapshot],
  );
  const prototypeStrategyList = useMemo(
    () => [...prototypeMarioStrategies, ...prototypeStrategies],
    [prototypeMarioStrategies, prototypeStrategies],
  );
  const marioStrategiesStorageKey = authMe.telegramUser?.id
    ? `${MARIO_STRATEGIES_STORAGE_PREFIX}:${authMe.telegramUser.id}`
    : "";
  const effectiveTopSignalsSourceFilterId = topSignalsSourceFilterId === "all" || topSignalsActiveSourceIds.has(topSignalsSourceFilterId)
    ? topSignalsSourceFilterId
    : "all";
  const allTopSignalsTradeMarkers = useMemo(() => {
    if (!topSignalsSnapshot) {
      return EMPTY_COPY_TRADING_TRADE_MARKERS;
    }

    return createCopyTradingTradeMarkers(topSignalsSnapshot);
  }, [topSignalsSnapshot]);
  const topSignalsTradeMarkers = useMemo(() => {
    if (effectiveTopSignalsSourceFilterId === "all") {
      return allTopSignalsTradeMarkers;
    }

    return allTopSignalsTradeMarkers.filter((marker) => {
      return marker.traderId === effectiveTopSignalsSourceFilterId;
    });
  }, [allTopSignalsTradeMarkers, effectiveTopSignalsSourceFilterId]);
  const topSignalsEventsById = useMemo(
    () => new Map(topSignalsSnapshot?.events.map((event) => [event.event_id, event]) ?? []),
    [topSignalsSnapshot],
  );
  const topSignalsSignalBiasSummary = useMemo(
    () => createTopSignalsSignalBiasSummary(topSignalsSnapshot, symbol),
    [symbol, topSignalsSnapshot],
  );
  const shouldLoadTopSignalsSnapshot = isTopSignalsTab || isAccountManagementTab;

  const {
    candlesBySymbol: paperPositionCandlesBySymbol,
    errorsBySymbol: paperPositionErrorsBySymbol,
    latestPricesBySymbol: paperPositionLatestPricesBySymbol,
  } = usePaperPositionCandles(
    paperPositionSignals,
    shouldUsePaperPositions ? latestMarketCandleUpdate : null,
  );
  const paperPositionMiniTickerSymbols = useMemo(
    () => paperPositionSignals.map((signal) => signal.symbol),
    [paperPositionSignals],
  );
  const {
    latestPricesBySymbol: paperPositionMiniTickerPricesBySymbol,
  } = useBinanceMiniTickerPrices(paperPositionMiniTickerSymbols, {
    updateIntervalMs: PAPER_POSITION_PRICE_UPDATE_INTERVAL_MS,
  });
  const paperPositionsBySignalId = useMemo(() => {
    const recordsBySignalId: Record<string, PaperPositionRecord> = {};

    for (const signal of paperPositionSignals) {
      const candles = paperPositionCandlesBySymbol[signal.symbol];
      if (candles && candles.length > 0) {
        const miniTickerPrice = readBinanceMiniTickerPrice(
          paperPositionMiniTickerPricesBySymbol,
          signal.symbol,
        );
        recordsBySignalId[signal.id] = computePaperPositionRecord(
          signal,
          candles,
          {
            currentPriceOverride:
              miniTickerPrice ?? paperPositionLatestPricesBySymbol[signal.symbol] ?? null,
          },
        );
      }
    }

    return recordsBySignalId;
  }, [
    paperPositionCandlesBySymbol,
    paperPositionLatestPricesBySymbol,
    paperPositionMiniTickerPricesBySymbol,
    paperPositionSignals,
  ]);
  const activeChartPaperPosition = activeSignal
    ? (paperPositionsBySignalId[activeSignal.id] ?? null)
    : null;
  /**
   * Chart-level signal drawings depend on the simulated lifecycle. Rendering
   * before this record exists briefly applies the wrong lifecycle style.
   */
  const isActiveChartPaperPositionReady = activeSignal
    ? Object.prototype.hasOwnProperty.call(
      paperPositionsBySignalId,
      activeSignal.id,
    )
    : false;
  const isDarkTheme = theme === "dark";
  const pageClassName = isDarkTheme
    ? "flex min-h-dvh w-full flex-col overflow-x-hidden overflow-y-auto bg-[#0B0E11] text-slate-100 lg:h-screen lg:overflow-hidden"
    : "flex min-h-dvh w-full flex-col overflow-x-hidden overflow-y-auto bg-[#F1F4F8] text-slate-900 lg:h-screen lg:overflow-hidden";
  const workspaceGridClassName = isRightPanelCollapsed
    ? "motion-fx-7-workspace-grid relative flex min-h-0 flex-col gap-3 p-3 pb-28 lg:grid lg:h-full lg:p-4 lg:pb-4 lg:grid-cols-[minmax(0,1fr)]"
    : "motion-fx-7-workspace-grid relative flex min-h-0 flex-col gap-3 p-3 pb-28 lg:grid lg:h-full lg:gap-4 lg:p-4 lg:pb-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]";

  const startOnboardingGuide = useCallback(() => {
    setActiveProductTab("intel");
    setIsRightPanelCollapsed(false);
    if (isCompactLayout) {
      setIsMobileKolSheetOpen(true);
    }
    if (onboardingOpenTimeoutRef.current !== null) {
      window.clearTimeout(onboardingOpenTimeoutRef.current);
    }

    onboardingOpenTimeoutRef.current = window.setTimeout(() => {
      setIsOnboardingOpen(true);
      onboardingOpenTimeoutRef.current = null;
    }, 180);
  }, [isCompactLayout]);

  const handleTelegramDiscussionJoin = useCallback(() => {
    openExternalTelegramUrl(TELEGRAM_DISCUSSION_GROUP_URL);
  }, []);
  const startTelegramLogin = useCallback(() => {
    const redirectPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.assign(`/api/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
  }, []);
  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        credentials: "same-origin",
        method: "POST",
      });
    } finally {
      setAuthMe(LOGGED_OUT_AUTH_ME);
      setPrototypeApiConnections([]);
      setPrototypeStrategies([]);
      setPrototypeMarioStrategies([]);
    }
  }, []);
  const applyTradingFoxAccount = useCallback((account: TradingFoxAccountResponse) => {
    const connectors = account.connectors ?? (account.connector ? [account.connector] : []);
    setPrototypeApiConnections(connectors.map((connector) => mapTradingFoxConnectorToPrototypeConnection(connector, language)));
    setPrototypeStrategies(account.strategies);
  }, [language]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!marioStrategiesStorageKey) {
        setPrototypeMarioStrategies([]);
        setIsMarioStrategiesHydrated(false);
        return;
      }

      setPrototypeMarioStrategies(readStoredMarioStrategies(marioStrategiesStorageKey));
      setIsMarioStrategiesHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [marioStrategiesStorageKey]);

  useEffect(() => {
    if (!marioStrategiesStorageKey || !isMarioStrategiesHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(marioStrategiesStorageKey, JSON.stringify(prototypeMarioStrategies));
    } catch {
      // Local Mario records are optional until the dedicated backend strategy exists.
    }
  }, [isMarioStrategiesHydrated, marioStrategiesStorageKey, prototypeMarioStrategies]);

  const handleCommunityModalJoin = useCallback(() => {
    handleTelegramDiscussionJoin();
    setIsCommunityConversionOpen(false);
  }, [handleTelegramDiscussionJoin]);

  const toggleTheme = () =>
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  const togglePnlColorMode = () => {
    setPnlColorMode((currentMode) => currentMode === "positiveGreen" ? "positiveRed" : "positiveGreen");
  };
  const setWorkspaceLanguage = useCallback((nextLanguage: WorkspaceLanguage) => {
    setLanguage(nextLanguage);
    try {
      window.localStorage.setItem(WORKSPACE_LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch {
      // Ignore storage failures in private browsing or restricted webviews.
    }
  }, []);
  const toggleLanguage = () =>
    setWorkspaceLanguage(language === "zh-CN" ? "en-US" : "zh-CN");
  const applyWorkspaceRouteState = useCallback((
    routeState: WorkspaceRouteState,
    fallbackTab?: WorkspaceProductTab,
  ) => {
    const nextTab = routeState.tab ?? fallbackTab;
    if (nextTab) {
      setActiveProductTab(nextTab);
    }

    if (routeState.symbol) {
      setSymbol(routeState.symbol);
    }

    if (routeState.signalId) {
      setActiveSignalId(routeState.signalId);
    }

    if (routeState.tab === "topSignals") {
      setTopSignalsSourceFilterId(routeState.topSignalSourceId || "all");
      setActiveTopSignalSourceId(routeState.topSignalSourceId);
      setExplicitTopSignalSourceId(routeState.topSignalSourceId);
      setActiveTopSignalTradeEventId(routeState.topSignalTradeEventId);
      pendingRouteTopSignalTradeEventIdRef.current = routeState.topSignalTradeEventId;
    } else {
      pendingRouteTopSignalTradeEventIdRef.current = "";
    }
  }, []);

  useEffect(() => {
    copyRef.current = copy;
  }, [copy]);

  useEffect(() => {
    topSignalReturnCurvesBySourceIdRef.current = topSignalReturnCurvesBySourceId;
  }, [topSignalReturnCurvesBySourceId]);

  useEffect(() => {
    let isMounted = true;

    const refreshAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) {
          throw new Error("Unable to load auth session.");
        }

        const nextAuthMe = await response.json() as TelegramAuthMeResponse;
        if (isMounted) {
          setAuthMe(nextAuthMe);
        }
      } catch {
        if (isMounted) {
          setAuthMe(LOGGED_OUT_AUTH_ME);
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    void refreshAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadTradingFoxAccount = async () => {
      if (isAuthLoading) {
        return;
      }

      if (!authMe.isLoggedIn) {
        setPrototypeApiConnections([]);
        setPrototypeStrategies([]);
        return;
      }

      setIsTradingFoxLoading(true);
      try {
        const account = await requestTradingFoxAccount("/api/tradingfox/account");
        if (isMounted) {
          applyTradingFoxAccount(account);
        }
      } catch (error) {
        if (isMounted) {
          setWorkspaceNotification({
            id: `tradingfox-account-error-${Date.now()}`,
            kind: "error",
            message: getTradingFoxErrorMessage(error, copyRef.current),
            meta: "TradingFox",
            title: copyRef.current.workspace.accountCenter.api.title,
          });
        }
      } finally {
        if (isMounted) {
          setIsTradingFoxLoading(false);
        }
      }
    };

    void loadTradingFoxAccount();

    return () => {
      isMounted = false;
    };
  }, [applyTradingFoxAccount, authMe.isLoggedIn, isAuthLoading]);

  useEffect(() => {
    document.documentElement.lang = language;
    const title = copy.workspace.documentTitle;
    document.title = title;
    const timeoutId = window.setTimeout(() => {
      document.title = title;
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [copy.workspace.documentTitle, language]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const storedLanguage = window.localStorage.getItem(WORKSPACE_LANGUAGE_STORAGE_KEY);
        if (isWorkspaceLanguage(storedLanguage)) {
          setLanguage(storedLanguage);
        }
      } catch {
        // Keep the default language when local storage is unavailable.
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const storedMode = window.localStorage.getItem(PNL_COLOR_MODE_STORAGE_KEY);
        if (isPnlColorMode(storedMode)) {
          setPnlColorMode(storedMode);
        } else if (storedMode !== null) {
          window.localStorage.removeItem(PNL_COLOR_MODE_STORAGE_KEY);
        }
      } catch {
        // Keep the default PnL color mode when local storage is unavailable.
      } finally {
        setIsPnlColorModeHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const routeState = readWorkspaceRouteStateFromLocation();
      if (routeState.tab) {
        applyWorkspaceRouteState(routeState);
        setIsProductTabHydrated(true);
        return;
      }

      try {
        const storedProductTab = window.localStorage.getItem(
          WORKSPACE_PRODUCT_TAB_STORAGE_KEY,
        );
        if (isWorkspaceProductTab(storedProductTab)) {
          setActiveProductTab(storedProductTab);
        } else if (storedProductTab !== null) {
          window.localStorage.removeItem(WORKSPACE_PRODUCT_TAB_STORAGE_KEY);
        }
      } catch {
        // Keep the default tab when local storage is unavailable.
      } finally {
        setIsProductTabHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [applyWorkspaceRouteState]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const rawWatchlist = window.localStorage.getItem(
          WORKSPACE_WATCHLIST_STORAGE_KEY,
        );
        const result = parseWorkspaceWatchlistValue(rawWatchlist);
        setWatchlist(result.watchlist);
        setIsWatchlistHydrated(true);
        if (result.shouldRewrite) {
          window.localStorage.setItem(
            WORKSPACE_WATCHLIST_STORAGE_KEY,
            serializeWorkspaceWatchlist(result.watchlist),
          );
        }
      } catch {
        setWatchlist(createEmptyWorkspaceWatchlist());
        setIsWatchlistHydrated(true);
        try {
          window.localStorage.removeItem(WORKSPACE_WATCHLIST_STORAGE_KEY);
        } catch {
          // Ignore storage failures in private browsing or restricted webviews.
        }
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isWatchlistHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(
        WORKSPACE_WATCHLIST_STORAGE_KEY,
        serializeWorkspaceWatchlist(watchlist),
      );
    } catch {
      // Ignore storage failures in private browsing or restricted webviews.
    }
  }, [isWatchlistHydrated, watchlist]);

  useEffect(() => {
    if (!isProductTabHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(
        WORKSPACE_PRODUCT_TAB_STORAGE_KEY,
        activeProductTab,
      );
    } catch {
      // Ignore storage failures in private browsing or restricted webviews.
    }
  }, [activeProductTab, isProductTabHydrated]);

  useEffect(() => {
    if (!isPnlColorModeHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(PNL_COLOR_MODE_STORAGE_KEY, pnlColorMode);
    } catch {
      // Ignore storage failures in private browsing or restricted webviews.
    }
  }, [isPnlColorModeHydrated, pnlColorMode]);

  const updateWorkspaceRouteUrl = useCallback((
    mode: "push" | "replace",
    overrides?: {
      tab?: WorkspaceProductTab;
      symbol?: MarketSymbol;
      signalId?: string;
      topSignalSourceId?: string;
    },
  ) => {
    if (!isProductTabHydrated) {
      return;
    }

    const nextTab = overrides?.tab ?? activeProductTab;
    const hasTopSignalSourceOverride = Object.prototype.hasOwnProperty.call(
      overrides ?? {},
      "topSignalSourceId",
    );
    const nextTopSignalSourceId = hasTopSignalSourceOverride
      ? (overrides?.topSignalSourceId ?? "")
      : explicitTopSignalSourceId
        || (topSignalsSourceFilterId !== "all" ? topSignalsSourceFilterId : "");
    const nextUrl = createWorkspaceRouteUrl({
      activeSignalId: overrides?.signalId ?? activeSignalId,
      currentPathname: window.location.pathname,
      symbol: overrides?.symbol ?? symbol,
      tab: nextTab,
      topSignalSourceId: nextTopSignalSourceId,
    });
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl === nextUrl) {
      return;
    }

    window.history[mode === "push" ? "pushState" : "replaceState"](null, "", nextUrl);
  }, [
    activeProductTab,
    activeSignalId,
    explicitTopSignalSourceId,
    isProductTabHydrated,
    symbol,
    topSignalsSourceFilterId,
  ]);

  useEffect(() => {
    updateWorkspaceRouteUrl("replace");
  }, [updateWorkspaceRouteUrl]);

  useEffect(() => {
    const handlePopState = () => {
      applyWorkspaceRouteState(readWorkspaceRouteStateFromLocation(), "intel");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [applyWorkspaceRouteState]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsWorkspaceMotionVisible(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    return () => {
      if (rightPanelExitTimeoutRef.current !== null) {
        window.clearTimeout(rightPanelExitTimeoutRef.current);
      }

      if (onboardingOpenTimeoutRef.current !== null) {
        window.clearTimeout(onboardingOpenTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!workspaceNotification) {
      return;
    }

    const timeout = window.setTimeout(
      () => setWorkspaceNotification(null),
      NOTIFICATION_DISMISS_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [workspaceNotification]);

  useEffect(() => {
    if (hasEvaluatedAutoOnboardingRef.current || !isWorkspaceMotionVisible || kolSignalSourceStatus.isLoading) {
      return;
    }

    hasEvaluatedAutoOnboardingRef.current = true;
    if (hasSeenOnboardingGuide()) {
      return;
    }

    const timeoutId = window.setTimeout(startOnboardingGuide, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isWorkspaceMotionVisible, kolSignalSourceStatus.isLoading, startOnboardingGuide]);

  useEffect(() => {
    let isActive = true;

    fetchUsdtPerpetualMarkets()
      .then((loadedMarkets) => {
        if (!isActive) {
          return;
        }

        setMarketOptions(loadedMarkets);
        setSymbol((currentSymbol) =>
          loadedMarkets.includes(currentSymbol)
            ? currentSymbol
            : loadedMarkets[0],
        );
      })
      .catch(() => {
        if (isActive) {
          setMarketOptions(markets);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    let isPolling = false;
    let pollingIntervalId: number | null = null;

    const rememberLatestSignalCreatedAt = (
      nextSignals: readonly StructuredSignal[],
    ) => {
      const latestCreatedAt = getLatestStructuredSignalCreatedAt(nextSignals);
      if (!latestCreatedAt) {
        return;
      }

      const currentTimestamp = Date.parse(
        latestKolSignalCreatedAtRef.current ?? "",
      );
      const nextTimestamp = Date.parse(latestCreatedAt);
      if (
        !latestKolSignalCreatedAtRef.current ||
        !Number.isFinite(currentTimestamp) ||
        nextTimestamp > currentTimestamp
      ) {
        latestKolSignalCreatedAtRef.current = latestCreatedAt;
      }
    };

    const applyInitialSignals = (loadedSignals: StructuredSignal[]) => {
      if (!isActive) {
        return;
      }

      const sortedSignals = dedupeStructuredSignalsByPosition(loadedSignals);
      rememberLatestSignalCreatedAt(sortedSignals);
      setSignals(sortedSignals);
      setKolSignalSourceStatus({ error: null, isLoading: false });
      setActiveSignalId((currentActiveSignalId) =>
        sortedSignals.some((signal) => signal.id === currentActiveSignalId)
          ? currentActiveSignalId
          : (sortedSignals[0]?.id ?? ""),
      );
    };

    const applyIncomingSignals = (incomingSignals: StructuredSignal[]) => {
      if (!isActive || incomingSignals.length === 0) {
        return;
      }

      setSignals((currentSignals) => {
        const mergedSignals = mergeIncomingSignals(
          incomingSignals,
          currentSignals,
        );
        rememberLatestSignalCreatedAt(mergedSignals);
        return mergedSignals;
      });
      setKolSignalSourceStatus({ error: null, isLoading: false });
      setActiveSignalId(
        (currentActiveSignalId) =>
          currentActiveSignalId || incomingSignals[0]?.id || "",
      );
      const currentCopy = copyRef.current;
      setWorkspaceNotification({
        id: `kol-signal-poll-${Date.now()}`,
        kind: "info",
        title: currentCopy.workspace.signalUpdateTitle,
        message: currentCopy.workspace.signalUpdateMessage(incomingSignals.length),
        meta: currentCopy.workspace.signalUpdateMeta,
      });
    };

    const pollIncomingSignals = async () => {
      const latestCreatedAt = latestKolSignalCreatedAtRef.current;
      if (!isActive || isPolling || !latestCreatedAt) {
        return;
      }

      isPolling = true;
      try {
        const incomingSignals = await fetchKolSignalsAfter(latestCreatedAt);
        if (incomingSignals.length > 0) {
          applyIncomingSignals(incomingSignals);
        } else if (isActive) {
          setKolSignalSourceStatus({ error: null, isLoading: false });
        }
      } catch (error: unknown) {
        if (isActive) {
          setKolSignalSourceStatus({
            error: formatKolSignalSourceError(error),
            isLoading: false,
          });
        }
      } finally {
        isPolling = false;
      }
    };

    const startPolling = () => {
      if (pollingIntervalId !== null) {
        return;
      }

      pollingIntervalId = window.setInterval(() => {
        void pollIncomingSignals();
      }, KOL_SIGNAL_POLL_INTERVAL_MS);
    };

    fetchKolSignals()
      .then((loadedSignals) => {
        applyInitialSignals(loadedSignals);
        startPolling();
      })
      .catch((error: unknown) => {
        if (isActive) {
          setSignals([]);
          setActiveSignalId("");
          setKolSignalSourceStatus({
            error: formatKolSignalSourceError(error),
            isLoading: false,
          });
        }
      });

    return () => {
      isActive = false;
      if (pollingIntervalId !== null) {
        window.clearInterval(pollingIntervalId);
      }
    };
  }, []);

  useEffect(() => {
    if (!shouldLoadTopSignalsSnapshot) {
      return;
    }

    let isActive = true;
    let isPolling = false;
    let pollingIntervalId: number | null = null;

    const applySnapshot = (
      snapshot: CopyTradingRadarSnapshot,
      error: string | null,
    ) => {
      if (!isActive) {
        return;
      }

      setTopSignalsSnapshot(snapshot);
      setTopSignalsSourceStatus({ error, isLoading: false });
      const activeSourceIds = new Set(snapshot.traders.filter(isActiveCopyTradingTrader).map((trader) => trader.trader_id));
      setActiveTopSignalSourceId((currentSourceId) =>
        activeSourceIds.has(currentSourceId)
          ? currentSourceId
          : (snapshot.traders.find(isActiveCopyTradingTrader)?.trader_id ?? ""),
      );
      setTopSignalsSourceFilterId((currentSourceFilterId) =>
        currentSourceFilterId === "all" || activeSourceIds.has(currentSourceFilterId)
          ? currentSourceFilterId
          : "all",
      );
      setActiveTopSignalTradeEventId((currentTradeEventId) =>
        snapshot.events.some((event) => event.event_id === currentTradeEventId)
          ? currentTradeEventId
          : "",
      );
    };

    const loadSnapshot = async (allowMockFallback: boolean) => {
      if (!isActive || isPolling) {
        return;
      }

      isPolling = true;
      try {
        const snapshot = await fetchCopyTradingRadarSnapshot();
        applySnapshot(snapshot, null);
      } catch (error: unknown) {
        const message = formatKolSignalSourceError(error);
        if (!allowMockFallback) {
          if (isActive) {
            setTopSignalsSourceStatus({ error: message, isLoading: false });
          }
          return;
        }

        try {
          const mockSnapshot = await createMarketAlignedMockCopyTradingRadarSnapshot();
          applySnapshot(mockSnapshot, message);
        } catch {
          if (isActive) {
            setTopSignalsSnapshot(null);
            setActiveTopSignalSourceId("");
            setTopSignalsSourceStatus({ error: message, isLoading: false });
          }
        }
      } finally {
        isPolling = false;
      }
    };

    void loadSnapshot(true);
    pollingIntervalId = window.setInterval(() => {
      void loadSnapshot(false);
    }, TOP_SIGNALS_POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      if (pollingIntervalId !== null) {
        window.clearInterval(pollingIntervalId);
      }
    };
  }, [shouldLoadTopSignalsSnapshot]);

  useEffect(() => {
    const pendingTradeEventId = pendingRouteTopSignalTradeEventIdRef.current;
    if (
      activeProductTab !== "topSignals"
      || !topSignalsSnapshot
      || !pendingTradeEventId
      || pendingTradeEventId !== activeTopSignalTradeEventId
    ) {
      return;
    }

    const event = topSignalsSnapshot.events.find(
      (snapshotEvent) => snapshotEvent.event_id === pendingTradeEventId,
    );
    pendingRouteTopSignalTradeEventIdRef.current = "";
    if (!event) {
      return;
    }

    const eventTimeMs = Date.parse(event.occurred_at);
    const nextSymbol = toCopyTradingMarketSymbol(event.symbol);
    setActiveTopSignalSourceId(event.trader_id);
    setExplicitTopSignalSourceId(event.trader_id);
    setSymbol(nextSymbol);
    if (Number.isFinite(eventTimeMs)) {
      setChartFocusSignalRequestKey(null);
      setChartFocusTimeRequest({
        key: `top-signal-route:${event.event_id}:${eventTimeMs}`,
        sourceTimeMs: eventTimeMs,
      });
    }
  }, [
    activeProductTab,
    activeTopSignalTradeEventId,
    topSignalsSnapshot,
  ]);

  const toggleRightPanel = () => {
    if (isRightPanelExiting) {
      return;
    }

    if (isRightPanelCollapsed) {
      setIsRightPanelCollapsed(false);
      return;
    }

    setIsRightPanelExiting(true);
    rightPanelExitTimeoutRef.current = window.setTimeout(() => {
      setIsRightPanelCollapsed(true);
      setIsRightPanelExiting(false);
      rightPanelExitTimeoutRef.current = null;
    }, 220);
  };

  const handleSignalSelect = useCallback(
    (signal: StructuredSignal) => {
      setChartFocusSignalRequestKey(createSignalFocusRequestKey(signal));
      setChartFocusTimeRequest(null);
      setActiveSignalId(signal.id);
      setSymbol(signal.symbol);
      updateWorkspaceRouteUrl("replace", {
        signalId: signal.id,
        symbol: signal.symbol,
      });
    },
    [updateWorkspaceRouteUrl],
  );

  const handleSymbolChange = useCallback(
    (nextSymbol: MarketSymbol) => {
      const nextSignal = signals.find((signal) => signal.symbol === nextSymbol);
      setChartFocusSignalRequestKey(null);
      setChartFocusTimeRequest(null);
      setSymbol(nextSymbol);
      setActiveSignalId(nextSignal?.id ?? "");
      if (activeProductTab === "topSignals") {
        setActiveTopSignalTradeEventId("");
        pendingRouteTopSignalTradeEventIdRef.current = "";
      }
      updateWorkspaceRouteUrl("replace", {
        signalId: nextSignal?.id ?? "",
        symbol: nextSymbol,
      });
    },
    [activeProductTab, signals, updateWorkspaceRouteUrl],
  );

  const handleProductTabChange = useCallback((nextTab: WorkspaceProductTab) => {
    setActiveProductTab(nextTab);
    if (nextTab !== "topSignals") {
      pendingRouteTopSignalTradeEventIdRef.current = "";
    }
    updateWorkspaceRouteUrl("push", { tab: nextTab });
  }, [updateWorkspaceRouteUrl]);

  const handleAccountEntry = useCallback(() => {
    if (authMe.isLoggedIn) {
      handleProductTabChange("accountManagement");
      return;
    }

    startTelegramLogin();
  }, [authMe.isLoggedIn, handleProductTabChange, startTelegramLogin]);

  const handleTopSignalSourceSelect = useCallback((sourceId: string) => {
    setActiveTopSignalSourceId(sourceId);
    setExplicitTopSignalSourceId(sourceId);
    setActiveTopSignalTradeEventId("");
    pendingRouteTopSignalTradeEventIdRef.current = "";
    updateWorkspaceRouteUrl("replace", {
      tab: "topSignals",
      topSignalSourceId: sourceId,
    });
  }, [updateWorkspaceRouteUrl]);

  const handleTopSignalSourceFilterChange = useCallback((sourceId: string) => {
    setTopSignalsSourceFilterId(sourceId);
    setExplicitTopSignalSourceId(sourceId === "all" ? "" : sourceId);
    pendingRouteTopSignalTradeEventIdRef.current = "";
    if (sourceId !== "all") {
      setActiveTopSignalSourceId(sourceId);
      setActiveTopSignalTradeEventId("");
    } else {
      setActiveTopSignalTradeEventId("");
    }
    updateWorkspaceRouteUrl("replace", {
      tab: "topSignals",
      topSignalSourceId: sourceId === "all" ? "" : sourceId,
    });
  }, [updateWorkspaceRouteUrl]);

  const handleTopSignalPositionSelect = useCallback((position: CopyTradingPosition) => {
    const nextSymbol = toCopyTradingMarketSymbol(position.symbol);
    setActiveTopSignalSourceId(position.trader_id);
    setExplicitTopSignalSourceId(position.trader_id);
    setActiveTopSignalTradeEventId("");
    pendingRouteTopSignalTradeEventIdRef.current = "";
    setChartFocusSignalRequestKey(null);
    setChartFocusTimeRequest(null);
    setSymbol(nextSymbol);
    updateWorkspaceRouteUrl("replace", {
      symbol: nextSymbol,
      tab: "topSignals",
      topSignalSourceId: position.trader_id,
    });
  }, [updateWorkspaceRouteUrl]);

  const handleTopSignalTradeSelect = useCallback((event: CopyTradingEvent) => {
    const eventTimeMs = Date.parse(event.occurred_at);
    const nextSymbol = toCopyTradingMarketSymbol(event.symbol);
    setActiveTopSignalSourceId(event.trader_id);
    setExplicitTopSignalSourceId(event.trader_id);
    if (topSignalsActiveSourceIds.has(event.trader_id)) {
      setTopSignalsSourceFilterId(event.trader_id);
    }
    setActiveTopSignalTradeEventId(event.event_id);
    pendingRouteTopSignalTradeEventIdRef.current = "";
    setChartFocusSignalRequestKey(null);
    setSymbol(nextSymbol);

    if (Number.isFinite(eventTimeMs)) {
      setChartFocusTimeRequest({
        key: `top-signal-trade:${event.event_id}:${eventTimeMs}`,
        sourceTimeMs: eventTimeMs,
      });
    } else {
      setChartFocusTimeRequest(null);
    }
    updateWorkspaceRouteUrl("replace", {
      symbol: nextSymbol,
      tab: "topSignals",
      topSignalSourceId: event.trader_id,
    });
  }, [topSignalsActiveSourceIds, updateWorkspaceRouteUrl]);

  const handleTopSignalTradeHistoryLoadMore = useCallback(async ({
    limit,
    offset,
    positions,
    trader,
  }: {
    limit: number;
    offset: number;
    positions: readonly CopyTradingPosition[];
    trader: CopyTradingTrader;
  }) => {
    const page = await fetchCopyTradingSourceTradeHistoryPage({
      limit,
      offset,
      positions,
      trader,
    });

    setTopSignalsSnapshot((currentSnapshot) => {
      if (!currentSnapshot || page.events.length === 0) {
        return currentSnapshot;
      }

      return {
        ...currentSnapshot,
        events: mergeCopyTradingEvents(currentSnapshot.events, page.events),
      };
    });

    return {
      hasMore: page.hasMore,
      returnedCount: page.returnedCount,
    };
  }, []);

  const handleTopSignalReturnCurveLoad = useCallback(async (trader: CopyTradingTrader) => {
    const sourceId = trader.trader_id;
    if (!sourceId) {
      return;
    }

    const currentState = topSignalReturnCurvesBySourceIdRef.current[sourceId];
    if (currentState?.hasLoaded || currentState?.isLoading) {
      return;
    }

    const pendingRequest = pendingTopSignalReturnCurveRequestsRef.current.get(sourceId);
    if (pendingRequest) {
      await pendingRequest;
      return;
    }

    setTopSignalReturnCurvesBySourceId((currentStates) => {
      const nextStates = {
        ...currentStates,
        [sourceId]: {
          error: null,
          hasLoaded: false,
          isLoading: true,
          points: currentStates[sourceId]?.points ?? [],
          updatedAt: currentStates[sourceId]?.updatedAt ?? null,
        },
      };
      topSignalReturnCurvesBySourceIdRef.current = nextStates;
      return nextStates;
    });

    const request = fetchCopyTradingSourceReturnCurve({
      sourceId,
      window: "90d",
    })
      .then((curve) => {
        setTopSignalReturnCurvesBySourceId((currentStates) => {
          const nextStates = {
            ...currentStates,
            [sourceId]: {
              error: null,
              hasLoaded: true,
              isLoading: false,
              points: curve.points,
              updatedAt: curve.updatedAt,
            },
          };
          topSignalReturnCurvesBySourceIdRef.current = nextStates;
          return nextStates;
        });
      })
      .catch((error: unknown) => {
        setTopSignalReturnCurvesBySourceId((currentStates) => {
          const nextStates = {
            ...currentStates,
            [sourceId]: {
              error: formatKolSignalSourceError(error),
              hasLoaded: false,
              isLoading: false,
              points: currentStates[sourceId]?.points ?? [],
              updatedAt: currentStates[sourceId]?.updatedAt ?? null,
            },
          };
          topSignalReturnCurvesBySourceIdRef.current = nextStates;
          return nextStates;
        });
      })
      .finally(() => {
        pendingTopSignalReturnCurveRequestsRef.current.delete(sourceId);
      });

    pendingTopSignalReturnCurveRequestsRef.current.set(sourceId, request);
    await request;
  }, []);

  const handleTopSignalTradeMarkerSelect = useCallback((marker: CopyTradingTradeMarker) => {
    const event = topSignalsEventsById.get(marker.eventId);
    if (event) {
      handleTopSignalTradeSelect(event);
    }
  }, [handleTopSignalTradeSelect, topSignalsEventsById]);

  const handleKolSourceWatchToggle = useCallback((signal: StructuredSignal) => {
    const sourceKey = createKolSourceWatchKey(signal.source_name);
    if (!sourceKey) {
      return;
    }

    setWatchlist((currentWatchlist) => {
      const isAlreadyWatched = currentWatchlist.kolSources.some(
        (source) => source.key === sourceKey,
      );

      if (isAlreadyWatched) {
        return {
          ...currentWatchlist,
          kolSources: currentWatchlist.kolSources.filter(
            (source) => source.key !== sourceKey,
          ),
        };
      }

      return {
        ...currentWatchlist,
        kolSources: [
          {
            avatarUrl: signal.source_avatar_url,
            favoritedAt: new Date().toISOString(),
            key: sourceKey,
            name: signal.source_name,
            sourceType: signal.source_type,
          },
          ...currentWatchlist.kolSources,
        ],
      };
    });
  }, []);

  const handleTopSignalSourceWatchToggle = useCallback((trader: CopyTradingTrader) => {
    setWatchlist((currentWatchlist) => {
      const isAlreadyWatched = currentWatchlist.topSignalSources.some(
        (source) => source.id === trader.trader_id,
      );

      if (isAlreadyWatched) {
        return {
          ...currentWatchlist,
          topSignalSources: currentWatchlist.topSignalSources.filter(
            (source) => source.id !== trader.trader_id,
          ),
        };
      }

      return {
        ...currentWatchlist,
        topSignalSources: [
          {
            avatarUrl: trader.avatar,
            favoritedAt: new Date().toISOString(),
            id: trader.trader_id,
            name: trader.name,
            platform: trader.platform,
          },
          ...currentWatchlist.topSignalSources,
        ],
      };
    });
  }, []);

  const handleCopyTradingRequest = useCallback((target: CopyTradingPrototypeTarget) => {
    if (!authMe.isLoggedIn) {
      startTelegramLogin();
      return;
    }

    if (prototypeApiConnection.status !== "connected") {
      setPendingCopyTradingTarget(target);
      handleProductTabChange("accountManagement");
      setIsApiSetupOpen(true);
      return;
    }

    setCopyTradingTarget(target);
  }, [authMe.isLoggedIn, handleProductTabChange, prototypeApiConnection.status, startTelegramLogin]);

  const handlePrototypeConnectionSave = useCallback(async (input: PrototypeConnectionSaveInput) => {
    if (!authMe.isLoggedIn) {
      startTelegramLogin();
      return;
    }

    setIsTradingFoxLoading(true);
    try {
      const account = await requestTradingFoxAccount("/api/tradingfox/connectors", {
        body: JSON.stringify({
          accountName: input.accountName,
          apiKey: input.apiKey,
          exchangePlatform: input.exchangePlatform,
          ipAddress: input.ipAddress,
          isMock: input.isMock,
          mockMarginBalance: input.mockMarginBalance,
          secret: input.secret,
        }),
        method: "POST",
      });
      applyTradingFoxAccount(account);
      setWorkspaceNotification({
        id: `api-connected-${Date.now()}`,
        kind: "success",
        message: copyRef.current.workspace.accountCenter.apiSetup.connectedToast,
        meta: account.connector?.name ?? input.accountName,
        title: copyRef.current.workspace.accountCenter.api.title,
      });

      if (pendingCopyTradingTarget) {
        setCopyTradingTarget(pendingCopyTradingTarget);
        setPendingCopyTradingTarget(null);
      }
    } catch (error) {
      setWorkspaceNotification({
        id: `api-connect-error-${Date.now()}`,
        kind: "error",
        message: getTradingFoxErrorMessage(error, copyRef.current),
        meta: input.accountName,
        title: copyRef.current.workspace.accountCenter.api.title,
      });
    } finally {
      setIsTradingFoxLoading(false);
    }
  }, [applyTradingFoxAccount, authMe.isLoggedIn, pendingCopyTradingTarget, startTelegramLogin]);

  const handlePrototypeConnectionDelete = useCallback(async (connectionId: number) => {
    if (!authMe.isLoggedIn) {
      startTelegramLogin();
      return;
    }

    const connection = prototypeApiConnections.find((item) => item.id === connectionId) ?? null;
    const attachedStrategy = prototypeStrategyList.find((strategy) => strategy.exchangeConnectorId === connectionId) ?? null;
    if (attachedStrategy) {
      setWorkspaceNotification({
        id: `api-delete-blocked-${Date.now()}`,
        kind: "error",
        message: copyRef.current.workspace.accountCenter.api.deleteBlockedByStrategy,
        meta: connection?.accountName ?? `#${connectionId}`,
        title: copyRef.current.workspace.accountCenter.api.title,
      });
      return;
    }

    setIsTradingFoxLoading(true);
    try {
      const account = await requestTradingFoxAccount(`/api/tradingfox/connectors/${encodeURIComponent(String(connectionId))}`, {
        method: "DELETE",
      });
      applyTradingFoxAccount(account);
      setWorkspaceNotification({
        id: `api-delete-${Date.now()}`,
        kind: "success",
        message: copyRef.current.workspace.accountCenter.api.deleteSuccess,
        meta: connection?.accountName ?? `#${connectionId}`,
        title: copyRef.current.workspace.accountCenter.api.title,
      });
    } catch (error) {
      setWorkspaceNotification({
        id: `api-delete-error-${Date.now()}`,
        kind: "error",
        message: getTradingFoxErrorMessage(error, copyRef.current),
        meta: connection?.accountName ?? `#${connectionId}`,
        title: copyRef.current.workspace.accountCenter.api.title,
      });
    } finally {
      setIsTradingFoxLoading(false);
    }
  }, [applyTradingFoxAccount, authMe.isLoggedIn, prototypeApiConnections, prototypeStrategyList, startTelegramLogin]);

  const handleApiSetupOpenChange = useCallback((isOpen: boolean) => {
    setIsApiSetupOpen(isOpen);
    if (!isOpen) {
      setPendingCopyTradingTarget(null);
    }
  }, []);

  const requestPrototypeCopyStrategyStart = useCallback(async (input: {
    exchangeConnectorId: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    target: CopyTradingPrototypeTarget;
  }) => {
    const account = await requestTradingFoxAccount("/api/tradingfox/copy-strategies", {
      body: JSON.stringify({
        avatarUrl: input.target.trader.avatar,
        eventsCount: input.target.eventsCount,
        platform: input.target.trader.platform,
        positionsCount: input.target.positionsCount,
        exchangeConnectorId: input.exchangeConnectorId,
        signalSourceId: input.target.trader.trader_id,
        stopLossPercent: input.stopLossPercent,
        takeProfitPercent: input.takeProfitPercent,
        traderName: input.target.trader.name,
      }),
      method: "POST",
    });
    applyTradingFoxAccount(account);
    handleProductTabChange("accountManagement");
  }, [applyTradingFoxAccount, handleProductTabChange]);

  const handlePrototypeStrategyStart = useCallback(async (input: {
    exchangeConnectorId: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    target: CopyTradingPrototypeTarget;
  }) => {
    if (!authMe.isLoggedIn) {
      startTelegramLogin();
      return;
    }

    setIsTradingFoxLoading(true);
    try {
      await requestPrototypeCopyStrategyStart(input);
      setCopyTradingTarget(null);
      setWorkspaceNotification({
        id: `copy-strategy-created-${Date.now()}`,
        kind: "success",
        message: copyRef.current.workspace.accountCenter.strategyCreate.copyTradingCreatedToast,
        meta: input.target.trader.name,
        title: copyRef.current.workspace.accountCenter.copyTrading.start,
      });
    } catch (error) {
      setWorkspaceNotification({
        id: `copy-strategy-error-${Date.now()}`,
        kind: "error",
        message: getTradingFoxErrorMessage(error, copyRef.current),
        meta: input.target.trader.name,
        title: copyRef.current.workspace.accountCenter.copyTrading.start,
      });
    } finally {
      setIsTradingFoxLoading(false);
    }
  }, [authMe.isLoggedIn, requestPrototypeCopyStrategyStart, startTelegramLogin]);

  const handlePrototypeStrategyCreate = useCallback(async (input: PrototypeStrategyCreateInput) => {
    if (!authMe.isLoggedIn) {
      startTelegramLogin();
      throw new Error(copyRef.current.workspace.accountCenter.strategyCreate.loginRequired);
    }

    setIsTradingFoxLoading(true);
    try {
      if (input.strategyType === "copyTrading") {
        await requestPrototypeCopyStrategyStart({
          exchangeConnectorId: input.exchangeConnectorId,
          stopLossPercent: input.stopLossPercent,
          takeProfitPercent: input.takeProfitPercent,
          target: input.target,
        });
        setWorkspaceNotification({
          id: `copy-strategy-created-${Date.now()}`,
          kind: "success",
          message: copyRef.current.workspace.accountCenter.strategyCreate.copyTradingCreatedToast,
          meta: input.target.trader.name,
          title: copyRef.current.workspace.accountCenter.strategyCreate.modalTitle,
        });
        return;
      }

      const connector = prototypeApiConnections.find((connection) => connection.id === input.exchangeConnectorId && connection.status === "connected") ?? null;
      if (!connector) {
        throw new Error(copyRef.current.workspace.accountCenter.copyTrading.apiRequired);
      }

      const marioStrategy = createMarioPrototypeStrategy(connector, copyRef.current, language);
      setPrototypeMarioStrategies((currentStrategies) => [marioStrategy, ...currentStrategies]);
      handleProductTabChange("accountManagement");
      setWorkspaceNotification({
        id: `mario-strategy-created-${Date.now()}`,
        kind: "success",
        message: copyRef.current.workspace.accountCenter.strategyCreate.marioCreatedToast,
        meta: connector.accountName,
        title: copyRef.current.workspace.accountCenter.strategyCreate.marioTitle,
      });
    } catch (error) {
      const meta = input.strategyType === "copyTrading" ? input.target.trader.name : String(input.exchangeConnectorId);
      setWorkspaceNotification({
        id: `strategy-create-error-${Date.now()}`,
        kind: "error",
        message: getTradingFoxErrorMessage(error, copyRef.current),
        meta,
        title: copyRef.current.workspace.accountCenter.strategyCreate.modalTitle,
      });
      throw error;
    } finally {
      setIsTradingFoxLoading(false);
    }
  }, [authMe.isLoggedIn, handleProductTabChange, language, prototypeApiConnections, requestPrototypeCopyStrategyStart, startTelegramLogin]);

  const handlePrototypeStrategyStatusChange = useCallback(async (
    strategyId: string,
    status: PrototypeStrategyStatus,
  ) => {
    if (prototypeMarioStrategies.some((strategy) => strategy.id === strategyId)) {
      setPrototypeMarioStrategies((currentStrategies) =>
        currentStrategies.map((strategy) =>
          strategy.id === strategyId ? { ...strategy, status } : strategy,
        ),
      );
      return;
    }

    const previousStrategies = prototypeStrategies;
    setPrototypeStrategies((currentStrategies) =>
      currentStrategies.map((strategy) =>
        strategy.id === strategyId ? { ...strategy, status } : strategy,
      ),
    );

    try {
      const account = await requestTradingFoxAccount(`/api/tradingfox/copy-strategies/${encodeURIComponent(strategyId)}`, {
        body: JSON.stringify({ status }),
        method: "PATCH",
      });
      applyTradingFoxAccount(account);
    } catch (error) {
      setPrototypeStrategies(previousStrategies);
      setWorkspaceNotification({
        id: `copy-strategy-status-error-${Date.now()}`,
        kind: "error",
        message: getTradingFoxErrorMessage(error, copyRef.current),
        meta: strategyId,
        title: copyRef.current.workspace.accountCenter.strategy.title,
      });
      throw error;
    }
  }, [applyTradingFoxAccount, prototypeMarioStrategies, prototypeStrategies]);

  const handlePrototypeStrategyDelete = useCallback(async (strategyId: string) => {
    if (prototypeMarioStrategies.some((strategy) => strategy.id === strategyId)) {
      setPrototypeMarioStrategies((currentStrategies) => currentStrategies.filter((strategy) => strategy.id !== strategyId));
      setWorkspaceNotification({
        id: `mario-strategy-delete-${Date.now()}`,
        kind: "success",
        message: copyRef.current.workspace.accountCenter.strategy.deleteSuccess,
        meta: strategyId,
        title: copyRef.current.workspace.accountCenter.strategy.title,
      });
      return;
    }

    const previousStrategies = prototypeStrategies;
    setPrototypeStrategies((currentStrategies) => currentStrategies.filter((strategy) => strategy.id !== strategyId));

    try {
      const account = await requestTradingFoxAccount(`/api/tradingfox/copy-strategies/${encodeURIComponent(strategyId)}`, {
        method: "DELETE",
      });
      applyTradingFoxAccount(account);
      setWorkspaceNotification({
        id: `copy-strategy-delete-${Date.now()}`,
        kind: "success",
        message: copyRef.current.workspace.accountCenter.strategy.deleteSuccess,
        meta: strategyId,
        title: copyRef.current.workspace.accountCenter.strategy.title,
      });
    } catch (error) {
      setPrototypeStrategies(previousStrategies);
      setWorkspaceNotification({
        id: `copy-strategy-delete-error-${Date.now()}`,
        kind: "error",
        message: getTradingFoxErrorMessage(error, copyRef.current),
        meta: strategyId,
        title: copyRef.current.workspace.accountCenter.strategy.title,
      });
      throw error;
    }
  }, [applyTradingFoxAccount, prototypeMarioStrategies, prototypeStrategies]);

  const openCommunityConversion = useCallback((signal: StructuredSignal) => {
    handleSignalSelect(signal);
    setIsCommunityConversionOpen(true);
  }, [handleSignalSelect]);

  const handleKolCommunityConversionOpen = useCallback(
    (_sourceName: string, signal?: StructuredSignal) => {
      if (signal) {
        handleSignalSelect(signal);
      }
      setIsCommunityConversionOpen(true);
    },
    [handleSignalSelect],
  );

  const isChartSplitProductTab = isIntelTab || isTopSignalsTab;
  const chartActiveSignal = isIntelTab ? activeSignal : null;
  const chartActivePaperPosition = isIntelTab ? activeChartPaperPosition : null;
  const chartSignals = isIntelTab ? signals : EMPTY_STRUCTURED_SIGNALS;
  const chartTopSignalsTradeMarkers = useMemo(() => {
    if (!isTopSignalsTab) {
      return EMPTY_COPY_TRADING_TRADE_MARKERS;
    }

    return topSignalsTradeMarkers.filter((marker) => marker.symbol === symbol);
  }, [isTopSignalsTab, symbol, topSignalsTradeMarkers]);
  const chartTradeMarkers = isTopSignalsTab
    ? chartTopSignalsTradeMarkers
    : EMPTY_COPY_TRADING_TRADE_MARKERS;
  const chartFocusTime = isTopSignalsTab ? chartFocusTimeRequest : null;
  const handleIntervalChange = useCallback((nextInterval: KlineInterval) => {
    setChartFocusSignalRequestKey(null);
    setChartFocusTimeRequest(null);
    setInterval(nextInterval);
  }, []);
  const handleFocusSignalRequestHandled = useCallback(() => {
    setChartFocusSignalRequestKey(null);
  }, []);
  const handleFocusTimeRequestHandled = useCallback(() => {
    setChartFocusTimeRequest(null);
  }, []);

  return (
    <main className={pageClassName} data-compact-ui>
      <div
        className={`motion-fx-10-delay-0 motion-fx-10-reveal ${isWorkspaceMotionVisible ? "is-visible" : ""}`}
      >
        <WorkspaceTopNavigation
          activeProductTab={activeProductTab}
          copy={copy}
          isDarkTheme={isDarkTheme}
          language={language}
          notification={workspaceNotification}
          pnlColorMode={pnlColorMode}
          telegramUser={authMe.telegramUser}
          isAuthLoading={isAuthLoading || isTradingFoxLoading}
          onAccountOpen={handleAccountEntry}
          onCommunityOpen={handleTelegramDiscussionJoin}
          onGuideOpen={startOnboardingGuide}
          onLanguageToggle={toggleLanguage}
          onNotificationDismiss={() => setWorkspaceNotification(null)}
          onProductTabChange={handleProductTabChange}
          onPnlColorModeToggle={togglePnlColorMode}
          onThemeToggle={toggleTheme}
        />
      </div>
      <div className="min-w-0 flex-1 lg:min-h-0 lg:overflow-hidden">
        {isChartSplitProductTab ? (
          <section
            className={workspaceGridClassName}
            data-right-panel-collapsed={String(isRightPanelCollapsed)}
          >
            <div
              className={`motion-fx-10-delay-1 motion-fx-10-reveal motion-fx-7-primary-panel flex min-w-0 w-full lg:h-full lg:min-h-0 ${isWorkspaceMotionVisible ? "is-visible" : ""}`}
            >
              <RealtimeKlinePanel
                key={`${symbol}-${interval}`}
                activePaperPosition={chartActivePaperPosition}
                isActivePaperPositionReady={isIntelTab && isActiveChartPaperPositionReady}
                activeSignal={chartActiveSignal}
                focusSignalRequestKey={chartFocusSignalRequestKey}
                focusTimeRequest={chartFocusTime}
                interval={interval}
                language={language}
                isCompactLayout={isCompactLayout}
                marketOptions={marketOptions}
                priceColorMode={pnlColorMode}
                signalBiasSummary={isTopSignalsTab ? topSignalsSignalBiasSummary : null}
                symbol={symbol}
                signals={chartSignals}
                theme={theme}
                tradeMarkers={chartTradeMarkers}
                onIntervalChange={handleIntervalChange}
                onSymbolChange={handleSymbolChange}
                onSignalSelect={handleSignalSelect}
                onFocusSignalRequestHandled={handleFocusSignalRequestHandled}
                onFocusTimeRequestHandled={handleFocusTimeRequestHandled}
                onMarketCandleUpdate={isIntelTab ? setLatestMarketCandleUpdate : undefined}
                onTradeMarkerSelect={isTopSignalsTab ? handleTopSignalTradeMarkerSelect : undefined}
              />
            </div>

            {!isRightPanelCollapsed || isRightPanelExiting ? (
              <div
                className={`kol-panel-shell motion-fx-10-delay-2 motion-fx-10-reveal motion-fx-7-secondary-panel relative hidden min-h-0 min-w-0 flex-col gap-3 lg:flex ${isWorkspaceMotionVisible ? "is-visible" : ""} ${isRightPanelExiting ? "is-exiting" : ""}`}
              >
                {isIntelTab ? (
                  <KolPanel
                    activeSignal={activeSignal}
                    headerAction={
                      <SidebarCollapseButton
                        copy={copy}
                        isCollapsed={isRightPanelCollapsed}
                        isDarkTheme={isDarkTheme}
                        panelLabel={copy.kol.title}
                        variant="header"
                        onToggle={toggleRightPanel}
                      />
                    }
                    copy={copy}
                    isDarkTheme={isDarkTheme}
                    paperPositionErrorsBySymbol={paperPositionErrorsBySymbol}
                    paperPositionsBySignalId={paperPositionsBySignalId}
                    sourceStatus={kolSignalSourceStatus}
                    signals={kolSignals}
                    watchlistedSourceKeys={watchlistedKolSourceKeys}
                    onFollowRequest={openCommunityConversion}
                    onSourceWatchToggle={handleKolSourceWatchToggle}
                    onSignalSelect={handleSignalSelect}
                  />
                ) : (
                  <TopSignalsPanel
                    activeSourceId={activeTopSignalSourceId}
                    activeTradeEventId={activeTopSignalTradeEventId}
                    copy={copy}
                    headerAction={
                      <SidebarCollapseButton
                        copy={copy}
                        isCollapsed={isRightPanelCollapsed}
                        isDarkTheme={isDarkTheme}
                        panelLabel={copy.workspace.topSignals.title}
                        variant="header"
                        onToggle={toggleRightPanel}
                      />
                    }
                    isDarkTheme={isDarkTheme}
                    pnlColorMode={pnlColorMode}
                    returnCurvesBySourceId={topSignalReturnCurvesBySourceId}
                    snapshot={topSignalsDisplaySnapshot}
                    sourceFilterId={effectiveTopSignalsSourceFilterId}
                    sourceStatus={topSignalsSourceStatus}
                    watchlistedSourceIds={watchlistedTopSignalSourceIds}
                    onPositionSelect={handleTopSignalPositionSelect}
                    onSourceFilterChange={handleTopSignalSourceFilterChange}
                    onSourceSelect={handleTopSignalSourceSelect}
                    onSourceWatchToggle={handleTopSignalSourceWatchToggle}
                    onCopyTradingRequest={handleCopyTradingRequest}
                    onReturnCurveLoad={handleTopSignalReturnCurveLoad}
                    onTradeHistoryLoadMore={handleTopSignalTradeHistoryLoadMore}
                    onTradeSelect={handleTopSignalTradeSelect}
                  />
                )}
              </div>
            ) : (
              <SidebarCollapseButton
                copy={copy}
                isCollapsed={isRightPanelCollapsed}
                isDarkTheme={isDarkTheme}
                panelLabel={isTopSignalsTab ? copy.workspace.topSignals.title : copy.kol.title}
                variant="edge-tab"
                onToggle={toggleRightPanel}
              />
            )}
          </section>
        ) : isAccountManagementTab ? (
          <AccountManagementPanel
            apiConnection={prototypeApiConnection}
            apiConnections={prototypeApiConnections}
            availableSignalSources={copyTradingSignalSourceTargets}
            copy={copy}
            isApiSetupOpen={isApiSetupOpen}
            isAuthLoading={isAuthLoading || isTradingFoxLoading}
            isDarkTheme={isDarkTheme}
            telegramUser={authMe.telegramUser}
            strategies={prototypeStrategyList}
            onApiSetupOpen={() => setIsApiSetupOpen(true)}
            onApiSetupOpenChange={handleApiSetupOpenChange}
            onConnectionDelete={handlePrototypeConnectionDelete}
            onConnectionSave={handlePrototypeConnectionSave}
            onLogin={startTelegramLogin}
            onLogout={handleLogout}
            onStrategyCreate={handlePrototypeStrategyCreate}
            onStrategyDelete={handlePrototypeStrategyDelete}
            onStrategyStatusChange={handlePrototypeStrategyStatusChange}
          />
        ) : (
          <KolFollowProductTab
            copy={copy}
            isDarkTheme={isDarkTheme}
            paperPositionsBySignalId={paperPositionsBySignalId}
            signals={kolSignals}
            watchlistedSourceKeys={watchlistedKolSourceKeys}
            onCommunityConversionOpen={handleKolCommunityConversionOpen}
            onKolSourceWatchToggle={handleKolSourceWatchToggle}
            onSignalSelect={handleSignalSelect}
          />
        )}
      </div>
      {isIntelTab ? (
        <MobileKolBottomSheet
          activeSignal={activeSignal}
          copy={copy}
          isCompactLayout={isCompactLayout}
          isDarkTheme={isDarkTheme}
          isOpen={isMobileKolSheetOpen}
          paperPositionErrorsBySymbol={paperPositionErrorsBySymbol}
          paperPositionsBySignalId={paperPositionsBySignalId}
          signals={kolSignals}
          sourceStatus={kolSignalSourceStatus}
          watchlistedSourceKeys={watchlistedKolSourceKeys}
          onFollowRequest={openCommunityConversion}
          onOpenChange={setIsMobileKolSheetOpen}
          onSourceWatchToggle={handleKolSourceWatchToggle}
          onSignalSelect={handleSignalSelect}
        />
      ) : null}
      {isTopSignalsTab ? (
        <MobileTopSignalsBottomSheet
          activeSourceId={activeTopSignalSourceId}
          activeTradeEventId={activeTopSignalTradeEventId}
          copy={copy}
          isCompactLayout={isCompactLayout}
          isDarkTheme={isDarkTheme}
          isOpen={isMobileTopSignalsSheetOpen}
          pnlColorMode={pnlColorMode}
          returnCurvesBySourceId={topSignalReturnCurvesBySourceId}
          snapshot={topSignalsDisplaySnapshot}
          sourceFilterId={effectiveTopSignalsSourceFilterId}
          sourceStatus={topSignalsSourceStatus}
          watchlistedSourceIds={watchlistedTopSignalSourceIds}
          onOpenChange={setIsMobileTopSignalsSheetOpen}
          onPositionSelect={handleTopSignalPositionSelect}
          onSourceFilterChange={handleTopSignalSourceFilterChange}
          onSourceSelect={handleTopSignalSourceSelect}
          onSourceWatchToggle={handleTopSignalSourceWatchToggle}
          onCopyTradingRequest={handleCopyTradingRequest}
          onReturnCurveLoad={handleTopSignalReturnCurveLoad}
          onTradeHistoryLoadMore={handleTopSignalTradeHistoryLoadMore}
          onTradeSelect={handleTopSignalTradeSelect}
        />
      ) : null}
      <CopyTradingPrototypeModal
        key={copyTradingTarget?.trader.trader_id ?? "empty"}
        apiConnection={prototypeApiConnection}
        apiConnections={prototypeApiConnections}
        copy={copy}
        isDarkTheme={isDarkTheme}
        strategies={prototypeStrategyList}
        target={copyTradingTarget}
        onClose={() => setCopyTradingTarget(null)}
        onStart={handlePrototypeStrategyStart}
      />
      <OnboardingGuide
        copy={copy.onboarding}
        isCompactLayout={isCompactLayout}
        isDarkTheme={isDarkTheme}
        isOpen={isOnboardingOpen}
        onMobileKolSheetOpenChange={setIsMobileKolSheetOpen}
        onComplete={() => {
          setIsOnboardingOpen(false);
          if (isCompactLayout) {
            setIsMobileKolSheetOpen(false);
          }
        }}
      />
      {isCommunityConversionOpen ? (
        <CommunityConversionModal
          copy={copy}
          isDarkTheme={isDarkTheme}
          onClose={() => setIsCommunityConversionOpen(false)}
          onCommunityOpen={handleCommunityModalJoin}
        />
      ) : null}
    </main>
  );
}

function createWorkspaceRouteUrl(input: {
  activeSignalId: string;
  currentPathname: string;
  symbol: MarketSymbol;
  tab: WorkspaceProductTab;
  topSignalSourceId: string;
}): string {
  const routePrefix = getWorkspaceRoutePrefix(input.currentPathname);
  const tabSegment = WORKSPACE_TAB_ROUTE_SEGMENTS[input.tab];
  const symbolSegment = encodeMarketSymbolForRoute(input.symbol);
  const queryParams = new URLSearchParams();

  if (input.tab === "intel" && input.activeSignalId) {
    queryParams.set("signal", input.activeSignalId);
  }

  if (input.tab === "topSignals") {
    if (input.topSignalSourceId) {
      queryParams.set("source", input.topSignalSourceId);
    }
  }

  const path = shouldWorkspaceTabUseSymbolRoute(input.tab)
    ? `${routePrefix}/${tabSegment}/${encodeURIComponent(symbolSegment)}`
    : `${routePrefix}/${tabSegment}`;
  const query = queryParams.toString();
  return query ? `${path}?${query}` : path;
}

async function requestTradingFoxAccount(path: string, init?: RequestInit): Promise<TradingFoxAccountResponse> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(errorPayload?.error || `TradingFox request failed with status ${response.status}.`);
  }

  return await response.json() as TradingFoxAccountResponse;
}

function createCopyTradingPrototypeTargets(snapshot: CopyTradingRadarSnapshot | null): readonly CopyTradingPrototypeTarget[] {
  if (!snapshot) {
    return EMPTY_COPY_TRADING_PROTOTYPE_TARGETS;
  }

  const positionsByTraderId = new Map<string, number>();
  for (const position of snapshot.positions) {
    positionsByTraderId.set(position.trader_id, (positionsByTraderId.get(position.trader_id) ?? 0) + 1);
  }

  const eventsByTraderId = new Map<string, number>();
  for (const event of snapshot.events) {
    eventsByTraderId.set(event.trader_id, (eventsByTraderId.get(event.trader_id) ?? 0) + 1);
  }

  return snapshot.traders
    .filter(isActiveCopyTradingTrader)
    .map((trader) => ({
      eventsCount: eventsByTraderId.get(trader.trader_id) ?? 0,
      positionsCount: positionsByTraderId.get(trader.trader_id) ?? 0,
      trader,
    }))
    .sort(compareCopyTradingPrototypeTargets);
}

function compareCopyTradingPrototypeTargets(
  left: CopyTradingPrototypeTarget,
  right: CopyTradingPrototypeTarget,
): number {
  return right.trader.monthly_return - left.trader.monthly_return
    || right.positionsCount - left.positionsCount
    || right.eventsCount - left.eventsCount
    || left.trader.name.localeCompare(right.trader.name);
}

function createMarioPrototypeStrategy(
  connector: PrototypeApiConnection,
  copy: WorkspaceCopy,
  language: WorkspaceLanguage,
): PrototypeStrategy {
  const now = new Date().toISOString();

  return {
    apiAccountName: connector.accountName,
    accountEquity: connector.accountBalance ?? undefined,
    avatarUrl: "/logo-mark.svg",
    createdAtLabel: formatTradingFoxDateLabel(now, language),
    eventsCount: 0,
    exchangeConnectorId: connector.id,
    followRatioPercent: 100,
    id: `mario-${connector.id}-${Date.now()}`,
    platform: "Mario",
    positionsCount: 0,
    status: "running",
    stopLossPercent: 0,
    strategyType: "mario",
    takeProfitPercent: 0,
    traderId: `mario-${connector.id}`,
    traderName: copy.workspace.accountCenter.strategyCreate.marioStrategyName,
    unrealizedPnl: 0,
  };
}

function readStoredMarioStrategies(storageKey: string): PrototypeStrategy[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map(normalizeStoredMarioStrategy)
      .filter((strategy): strategy is PrototypeStrategy => strategy !== null);
  } catch {
    return [];
  }
}

function normalizeStoredMarioStrategy(value: unknown): PrototypeStrategy | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<PrototypeStrategy>;
  if (record.strategyType !== "mario" || typeof record.id !== "string" || typeof record.exchangeConnectorId !== "number") {
    return null;
  }

  return {
    apiAccountName: typeof record.apiAccountName === "string" ? record.apiAccountName : "Binance",
    accountEquity: typeof record.accountEquity === "number" ? record.accountEquity : undefined,
    avatarUrl: typeof record.avatarUrl === "string" ? record.avatarUrl : "/logo-mark.svg",
    createdAtLabel: typeof record.createdAtLabel === "string" ? record.createdAtLabel : "--",
    eventsCount: typeof record.eventsCount === "number" ? record.eventsCount : 0,
    exchangeConnectorId: record.exchangeConnectorId,
    followRatioPercent: 100,
    id: record.id,
    platform: typeof record.platform === "string" ? record.platform : "Mario",
    positionsCount: typeof record.positionsCount === "number" ? record.positionsCount : 0,
    status: record.status === "paused" || record.status === "stopped" ? record.status : "running",
    stopLossPercent: 0,
    strategyType: "mario",
    takeProfitPercent: 0,
    traderId: typeof record.traderId === "string" ? record.traderId : `mario-${record.exchangeConnectorId}`,
    traderName: typeof record.traderName === "string" ? record.traderName : "Mario Strategy",
    unrealizedPnl: typeof record.unrealizedPnl === "number" ? record.unrealizedPnl : 0,
  };
}

function createEmptyPrototypeApiConnection(): PrototypeApiConnection {
  return {
    accountName: "Mock Exchange #1",
    accountBalance: null,
    connectedAtLabel: "",
    exchangePlatform: "Mock",
    id: 0,
    isMock: true,
    mockMarginBalance: null,
    status: "empty",
  };
}

function mapTradingFoxConnectorToPrototypeConnection(
  connector: TradingFoxConnector,
  language: WorkspaceLanguage,
): PrototypeApiConnection {
  const isBinanceDemoConnector = connector.isMock && isBinanceDemoExchangePlatform(connector.exchangePlatform);

  return {
    accountName: connector.name,
    accountBalance: connector.accountEquity ?? (isBinanceDemoConnector ? null : connector.mockMarginBalance ?? null),
    connectedAtLabel: formatTradingFoxDateLabel(connector.updatedAt, language),
    displayName: connector.displayName,
    exchangePlatform: connector.exchangePlatform,
    id: connector.id,
    isMock: connector.isMock,
    mockMarginBalance: isBinanceDemoConnector ? null : connector.mockMarginBalance ?? null,
    status: "connected",
    whitelistIp: connector.ipAddress?.address ?? connector.whitelistIp,
  };
}

function isBinanceDemoExchangePlatform(exchangePlatform: string): boolean {
  const normalizedPlatform = exchangePlatform.replace(/[\s_-]/gu, "").toLowerCase();
  return normalizedPlatform === "binance" || normalizedPlatform === "binancedemo" || normalizedPlatform === "bn";
}

function formatTradingFoxDateLabel(value: string, language: WorkspaceLanguage): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString(language, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}

function readWorkspaceRouteStateFromLocation(): WorkspaceRouteState {
  if (typeof window === "undefined") {
    return createEmptyWorkspaceRouteState();
  }

  return readWorkspaceRouteState(
    window.location.pathname,
    window.location.search,
  );
}

function readWorkspaceRouteState(
  pathname: string,
  search: string,
): WorkspaceRouteState {
  const segments = pathname.split("/").filter(Boolean);
  const routeStartIndex = segments[0] === "zh" ? 1 : 0;
  const tab = workspaceTabFromRouteSegment(segments[routeStartIndex] ?? "");
  if (!tab) {
    return createEmptyWorkspaceRouteState();
  }

  const rawSymbolSegment = shouldWorkspaceTabUseSymbolRoute(tab) ? (segments[routeStartIndex + 1] ?? "") : "";
  const symbol = rawSymbolSegment
    ? toCopyTradingMarketSymbol(safeDecodeRouteSegment(rawSymbolSegment))
    : null;
  const queryParams = new URLSearchParams(search);

  return {
    signalId: tab === "intel" ? (queryParams.get("signal")?.trim() ?? "") : "",
    symbol,
    tab,
    topSignalSourceId: tab === "topSignals" ? (queryParams.get("source")?.trim() ?? "") : "",
    topSignalTradeEventId: tab === "topSignals" ? (queryParams.get("trade")?.trim() ?? "") : "",
  };
}

function createEmptyWorkspaceRouteState(): WorkspaceRouteState {
  return {
    signalId: "",
    symbol: null,
    tab: null,
    topSignalSourceId: "",
    topSignalTradeEventId: "",
  };
}

function workspaceTabFromRouteSegment(segment: string): WorkspaceProductTab | null {
  const normalizedSegment = segment.trim().toLowerCase();
  for (const [tab, routeSegment] of Object.entries(WORKSPACE_TAB_ROUTE_SEGMENTS)) {
    if (routeSegment === normalizedSegment) {
      return tab as WorkspaceProductTab;
    }
  }

  return null;
}

function shouldWorkspaceTabUseSymbolRoute(tab: WorkspaceProductTab): boolean {
  return tab !== "accountManagement";
}

function getWorkspaceRoutePrefix(pathname: string): string {
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  return firstSegment === "zh" ? "/zh" : "";
}

function encodeMarketSymbolForRoute(symbol: MarketSymbol): string {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const perpetualMatch = /^([^/]+)\/([^:]+)(?::[^:]+)?$/u.exec(normalizedSymbol);
  if (perpetualMatch) {
    return `${perpetualMatch[1]}${perpetualMatch[2]}`;
  }

  return normalizedSymbol.replace(/[^A-Z0-9]/gu, "");
}

function safeDecodeRouteSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function useCompactLayout(): boolean {
  const [isCompactLayout, setIsCompactLayout] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_LAYOUT_MEDIA_QUERY);
    const updateCompactLayout = () => setIsCompactLayout(mediaQuery.matches);

    updateCompactLayout();
    mediaQuery.addEventListener("change", updateCompactLayout);
    return () => mediaQuery.removeEventListener("change", updateCompactLayout);
  }, []);

  return isCompactLayout;
}

function createTopSignalsSignalBiasSummary(
  snapshot: CopyTradingRadarSnapshot | null,
  symbol: MarketSymbol,
): KlineSignalBiasSummary | null {
  if (!snapshot) {
    return null;
  }

  let longCount = 0;
  let shortCount = 0;

  for (const event of snapshot.events) {
    if (toCopyTradingMarketSymbol(event.symbol) !== symbol) {
      continue;
    }

    if (event.direction === "long") {
      longCount += 1;
    } else {
      shortCount += 1;
    }
  }

  const totalCount = longCount + shortCount;
  if (totalCount === 0) {
    return null;
  }

  const longPercent = Math.round((longCount / totalCount) * 100);
  return {
    longCount,
    longPercent,
    shortCount,
    shortPercent: 100 - longPercent,
    totalCount,
  };
}

function mergeCopyTradingEvents(
  currentEvents: readonly CopyTradingEvent[],
  nextEvents: readonly CopyTradingEvent[],
): CopyTradingEvent[] {
  const eventsById = new Map<string, CopyTradingEvent>();
  for (const event of currentEvents) {
    eventsById.set(event.event_id, event);
  }
  for (const event of nextEvents) {
    eventsById.set(event.event_id, event);
  }

  return Array.from(eventsById.values()).sort(
    (left, right) => Date.parse(right.occurred_at) - Date.parse(left.occurred_at),
  );
}

function MobileKolBottomSheet({
  activeSignal,
  copy,
  isCompactLayout,
  isDarkTheme,
  isOpen,
  paperPositionErrorsBySymbol,
  paperPositionsBySignalId,
  signals,
  sourceStatus,
  watchlistedSourceKeys,
  onFollowRequest,
  onOpenChange,
  onSourceWatchToggle,
  onSignalSelect,
}: {
  activeSignal: StructuredSignal | null;
  copy: WorkspaceCopy;
  isCompactLayout: boolean;
  isDarkTheme: boolean;
  isOpen: boolean;
  paperPositionErrorsBySymbol: Readonly<Record<string, string>>;
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>;
  signals: readonly StructuredSignal[];
  sourceStatus: KolSignalSourceStatus;
  watchlistedSourceKeys: ReadonlySet<string>;
  onFollowRequest: (signal: StructuredSignal) => void;
  onOpenChange: (isOpen: boolean) => void;
  onSourceWatchToggle: (signal: StructuredSignal) => void;
  onSignalSelect: (signal: StructuredSignal) => void;
}) {
  const closeButtonClassName = isDarkTheme
    ? "inline-flex h-9 items-center gap-1.5 rounded-full border border-white/[0.075] bg-white/[0.035] px-3 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50"
    : "inline-flex h-9 items-center gap-1.5 rounded-full border border-[#BFE7FB] bg-[#F4FBFF] px-3 text-xs font-semibold text-slate-700 transition hover:border-[#A7DDF7] hover:bg-[#ECF8FE] hover:text-slate-900";

  if (!isCompactLayout) {
    return null;
  }

  if (isOpen) {
    return (
      <>
        <button
          aria-label={copy.common.close}
          className={
            isDarkTheme
              ? "fixed inset-0 z-[70] bg-black/42 backdrop-blur-[2px] lg:hidden"
              : "fixed inset-0 z-[70] bg-slate-950/20 backdrop-blur-[2px] lg:hidden"
          }
          type="button"
          onClick={() => onOpenChange(false)}
        />
        <div className="fixed inset-x-0 bottom-0 z-[80] h-[min(78dvh,680px)] px-2 pb-[max(8px,env(safe-area-inset-bottom))] lg:hidden">
          <KolPanel
            activeSignal={activeSignal}
            activeCardScrollBlock="nearest"
            copy={copy}
            headerAction={
              <button
                className={closeButtonClassName}
                type="button"
                onClick={() => onOpenChange(false)}
              >
                <CloseIcon className="h-3.5 w-3.5" />
                <span>{copy.common.close}</span>
              </button>
            }
            isDarkTheme={isDarkTheme}
            paperPositionErrorsBySymbol={paperPositionErrorsBySymbol}
            paperPositionsBySignalId={paperPositionsBySignalId}
            sourceStatus={sourceStatus}
            signals={signals}
            variant="mobileSheet"
            watchlistedSourceKeys={watchlistedSourceKeys}
            onFollowRequest={onFollowRequest}
            onSourceWatchToggle={onSourceWatchToggle}
            onSignalSelect={(signal) => {
              onSignalSelect(signal);
              onOpenChange(false);
            }}
          />
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
      <MobileKolSheetHandle
        activeSignal={activeSignal}
        copy={copy}
        isDarkTheme={isDarkTheme}
        paperPositionErrorsBySymbol={paperPositionErrorsBySymbol}
        paperPositionsBySignalId={paperPositionsBySignalId}
        sourceStatus={sourceStatus}
        onOpen={() => onOpenChange(true)}
      />
    </div>
  );
}

function MobileTopSignalsBottomSheet({
  activeSourceId,
  activeTradeEventId,
  copy,
  isCompactLayout,
  isDarkTheme,
  isOpen,
  pnlColorMode,
  returnCurvesBySourceId,
  snapshot,
  sourceFilterId,
  sourceStatus,
  watchlistedSourceIds,
  onOpenChange,
  onPositionSelect,
  onSourceFilterChange,
  onSourceSelect,
  onSourceWatchToggle,
  onCopyTradingRequest,
  onReturnCurveLoad,
  onTradeHistoryLoadMore,
  onTradeSelect,
}: {
  activeSourceId: string;
  activeTradeEventId: string;
  copy: WorkspaceCopy;
  isCompactLayout: boolean;
  isDarkTheme: boolean;
  isOpen: boolean;
  pnlColorMode: PnlColorMode;
  returnCurvesBySourceId: Readonly<Record<string, TopSignalReturnCurveState>>;
  snapshot: CopyTradingRadarSnapshot | null;
  sourceFilterId: string;
  sourceStatus: KolSignalSourceStatus;
  watchlistedSourceIds: ReadonlySet<string>;
  onOpenChange: (isOpen: boolean) => void;
  onPositionSelect: (position: CopyTradingPosition) => void;
  onSourceFilterChange: (sourceId: string) => void;
  onSourceSelect: (sourceId: string) => void;
  onSourceWatchToggle: (trader: CopyTradingTrader) => void;
  onCopyTradingRequest: (target: CopyTradingPrototypeTarget) => void;
  onReturnCurveLoad: (trader: CopyTradingTrader) => Promise<void>;
  onTradeHistoryLoadMore: (input: {
    limit: number;
    offset: number;
    positions: readonly CopyTradingPosition[];
    trader: CopyTradingTrader;
  }) => Promise<{ hasMore: boolean; returnedCount: number }>;
  onTradeSelect: (event: CopyTradingEvent) => void;
}) {
  const closeButtonClassName = isDarkTheme
    ? "inline-flex h-9 items-center gap-1.5 rounded-full border border-white/[0.075] bg-white/[0.035] px-3 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50"
    : "inline-flex h-9 items-center gap-1.5 rounded-full border border-[#BFE7FB] bg-[#F4FBFF] px-3 text-xs font-semibold text-slate-700 transition hover:border-[#A7DDF7] hover:bg-[#ECF8FE] hover:text-slate-900";

  if (!isCompactLayout) {
    return null;
  }

  if (isOpen) {
    return (
      <>
        <button
          aria-label={copy.common.close}
          className={
            isDarkTheme
              ? "fixed inset-0 z-[70] bg-black/42 backdrop-blur-[2px] lg:hidden"
              : "fixed inset-0 z-[70] bg-slate-950/20 backdrop-blur-[2px] lg:hidden"
          }
          type="button"
          onClick={() => onOpenChange(false)}
        />
        <div className="fixed inset-x-0 bottom-0 z-[80] h-[min(78dvh,680px)] px-2 pb-[max(8px,env(safe-area-inset-bottom))] lg:hidden">
          <TopSignalsPanel
            activeSourceId={activeSourceId}
            activeTradeEventId={activeTradeEventId}
            copy={copy}
            headerAction={
              <button
                className={closeButtonClassName}
                type="button"
                onClick={() => onOpenChange(false)}
              >
                <CloseIcon className="h-3.5 w-3.5" />
                <span>{copy.common.close}</span>
              </button>
            }
            isDarkTheme={isDarkTheme}
            pnlColorMode={pnlColorMode}
            returnCurvesBySourceId={returnCurvesBySourceId}
            snapshot={snapshot}
            sourceFilterId={sourceFilterId}
            sourceStatus={sourceStatus}
            variant="mobileSheet"
            watchlistedSourceIds={watchlistedSourceIds}
            onPositionSelect={(position) => {
              onPositionSelect(position);
              onOpenChange(false);
            }}
            onSourceFilterChange={onSourceFilterChange}
            onSourceSelect={onSourceSelect}
            onSourceWatchToggle={onSourceWatchToggle}
            onCopyTradingRequest={(target) => {
              onCopyTradingRequest(target);
              onOpenChange(false);
            }}
            onReturnCurveLoad={onReturnCurveLoad}
            onTradeHistoryLoadMore={onTradeHistoryLoadMore}
            onTradeSelect={(event) => {
              onTradeSelect(event);
              onOpenChange(false);
            }}
          />
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
      <MobileTopSignalsSheetHandle
        copy={copy}
        isDarkTheme={isDarkTheme}
        sourceStatus={sourceStatus}
        onOpen={() => onOpenChange(true)}
      />
    </div>
  );
}

function MobileTopSignalsSheetHandle({
  copy,
  isDarkTheme,
  sourceStatus,
  onOpen,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  sourceStatus: KolSignalSourceStatus;
  onOpen: () => void;
}) {
  const buttonClassName = isDarkTheme
    ? "motion-fx-9-surface min-h-[92px] w-full rounded-[22px] border border-white/[0.085] bg-[#181A20]/96 px-3.5 py-3 text-left text-slate-100 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl"
    : "motion-fx-9-surface min-h-[92px] w-full rounded-[22px] border border-[#D5E4EF] bg-white/96 px-3.5 py-3 text-left text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur-xl";
  const eyebrowClassName = isDarkTheme
    ? "text-[10px] font-bold uppercase tracking-[0.12em] text-sky-300"
    : "text-[10px] font-bold uppercase tracking-[0.12em] text-[#008DCC]";
  const statusText = sourceStatus.isLoading
    ? copy.paper.loading
    : sourceStatus.error
      ? copy.common.errorPrefix
      : "";

  return (
    <button className={buttonClassName} type="button" onClick={onOpen}>
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-400/45" />
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={
            isDarkTheme
              ? "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-sky-300"
              : "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#EAF8FE] text-[#008DCC]"
          }
        >
          S
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className={eyebrowClassName}>{copy.workspace.topSignals.title}</span>
            {statusText ? <span className="truncate text-xs font-semibold">{statusText}</span> : null}
          </div>
        </div>
        <ChevronUpIcon className={isDarkTheme ? "h-4 w-4 shrink-0 text-slate-400" : "h-4 w-4 shrink-0 text-slate-500"} />
      </div>
    </button>
  );
}

function MobileKolSheetHandle({
  activeSignal,
  copy,
  isDarkTheme,
  paperPositionErrorsBySymbol,
  paperPositionsBySignalId,
  sourceStatus,
  onOpen,
}: {
  activeSignal: StructuredSignal | null;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  paperPositionErrorsBySymbol: Readonly<Record<string, string>>;
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>;
  sourceStatus: KolSignalSourceStatus;
  onOpen: () => void;
}) {
  const activePaperPosition = activeSignal
    ? (paperPositionsBySignalId[activeSignal.id] ?? null)
    : null;
  const paperPositionError = activeSignal
    ? (paperPositionErrorsBySymbol[activeSignal.symbol] ?? null)
    : null;
  const buttonClassName = isDarkTheme
    ? "motion-fx-9-surface min-h-[92px] w-full rounded-[22px] border border-white/[0.085] bg-[#181A20]/96 px-3.5 py-3 text-left text-slate-100 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl"
    : "motion-fx-9-surface min-h-[92px] w-full rounded-[22px] border border-[#D5E4EF] bg-white/96 px-3.5 py-3 text-left text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur-xl";
  const eyebrowClassName = isDarkTheme
    ? "text-[10px] font-bold uppercase tracking-[0.12em] text-sky-300"
    : "text-[10px] font-bold uppercase tracking-[0.12em] text-[#008DCC]";
  const mutedClassName = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const statusText = activeSignal
    ? formatSignalPaperPositionStatus(
        activePaperPosition,
        paperPositionError,
        copy.paper,
      )
    : sourceStatus.isLoading
      ? copy.paper.loading
      : sourceStatus.error
        ? copy.common.errorPrefix
      : copy.kol.noSignalsStatus;

  return (
    <button className={buttonClassName} type="button" onClick={onOpen}>
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-400/45" />
      <div className="flex min-w-0 items-center gap-3">
        {activeSignal ? (
          <SourceAvatar
            isDarkTheme={isDarkTheme}
            name={activeSignal.source_name}
            url={activeSignal.source_avatar_url}
          />
        ) : (
          <span
            aria-hidden="true"
            className={
              isDarkTheme
                ? "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-sky-300"
                : "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#EAF8FE] text-[#008DCC]"
            }
          >
            K
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className={eyebrowClassName}>{copy.kol.title}</span>
            {activeSignal ? (
              <span className="inline-flex min-w-0 items-center gap-1 truncate text-xs font-semibold">
                <SymbolIcon symbol={activeSignal.symbol} />
                <span className="truncate">
                  {formatMobileSymbolLabel(activeSignal.symbol)}
                </span>
              </span>
            ) : null}
          </div>
          <div className={`mt-1 min-w-0 truncate text-xs ${mutedClassName}`}>
            {activeSignal
              ? `${activeSignal.source_name} · ${formatMobileSignalTime(activeSignal)}`
              : copy.kol.noSignalsMessage}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {activeSignal ? (
            <span
              className={getSignalDirectionBadgeClass(
                isDarkTheme,
                activeSignal.direction,
              )}
            >
              {copy.kol.directionShort[activeSignal.direction]}
            </span>
          ) : null}
          <span
            className={getSignalPaperPositionBadgeClass(
              isDarkTheme,
              activePaperPosition,
            )}
          >
            {statusText}
          </span>
        </div>
        <ChevronUpIcon className={isDarkTheme ? "h-4 w-4 shrink-0 text-slate-400" : "h-4 w-4 shrink-0 text-slate-500"} />
      </div>
    </button>
  );
}

function WorkspaceTopNavigation({
  activeProductTab,
  copy,
  isDarkTheme,
  language,
  notification,
  pnlColorMode,
  telegramUser,
  isAuthLoading,
  onCommunityOpen,
  onGuideOpen,
  onLanguageToggle,
  onNotificationDismiss,
  onAccountOpen,
  onProductTabChange,
  onPnlColorModeToggle,
  onThemeToggle,
}: {
  activeProductTab: WorkspaceProductTab;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  notification: WorkspaceNotification | null;
  pnlColorMode: PnlColorMode;
  telegramUser: TelegramAuthMeResponse["telegramUser"];
  isAuthLoading: boolean;
  onAccountOpen: () => void;
  onCommunityOpen: () => void;
  onGuideOpen: () => void;
  onLanguageToggle: () => void;
  onNotificationDismiss: () => void;
  onProductTabChange: (tab: WorkspaceProductTab) => void;
  onPnlColorModeToggle: () => void;
  onThemeToggle: () => void;
}) {
  const headerClassName = isDarkTheme
    ? "relative z-50 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-white/[0.075] bg-[#0B0E11]/95 px-3 py-2 backdrop-blur-xl sm:px-5 lg:flex-nowrap lg:gap-6"
    : "relative z-50 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[#E5EAF0] bg-white/95 px-3 py-2 backdrop-blur-xl sm:px-5 lg:flex-nowrap lg:gap-6";
  const actionRailClassName = isDarkTheme
    ? "relative flex shrink-0 items-center justify-end gap-1 rounded-full border border-white/[0.075] bg-white/[0.035] p-1 sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0"
    : "relative flex shrink-0 items-center justify-end gap-1 rounded-full border border-[#E5EAF0] bg-[#F8FAFC] p-1 shadow-sm sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none";

  return (
    <header className={headerClassName}>
      <div className="flex min-w-0 flex-1 items-center gap-8 lg:flex-none">
        <BrandLogo copy={copy} isDarkTheme={isDarkTheme} language={language} />
      </div>
      <div className="order-3 flex w-full min-w-0 items-center gap-7 overflow-x-auto lg:order-none lg:w-auto lg:flex-1">
        <WorkspaceProductTabs
          activeTab={activeProductTab}
          copy={copy}
          isDarkTheme={isDarkTheme}
          variant="topbar"
          onTabChange={onProductTabChange}
        />
        <nav
          aria-label={copy.workspace.navAria}
          className="flex shrink-0 items-center gap-4"
        >
          <TelegramCommunityButton
            copy={copy}
            isDarkTheme={isDarkTheme}
            onCommunityOpen={onCommunityOpen}
          />
        </nav>
      </div>
      <div className={actionRailClassName}>
        <GuideIconButton
          copy={copy}
          isDarkTheme={isDarkTheme}
          onGuideOpen={onGuideOpen}
        />
        <AnimatedThemeToggler
          copy={copy}
          isCollapsed
          isDarkTheme={isDarkTheme}
          onThemeToggle={onThemeToggle}
        />
        <PnlColorModeToggleButton
          copy={copy}
          isDarkTheme={isDarkTheme}
          pnlColorMode={pnlColorMode}
          onToggle={onPnlColorModeToggle}
        />
        <LanguageToggleButton
          copy={copy}
          isDarkTheme={isDarkTheme}
          language={language}
          onLanguageToggle={onLanguageToggle}
        />
        <AccountEntryButton
          copy={copy}
          isAuthLoading={isAuthLoading}
          isDarkTheme={isDarkTheme}
          telegramUser={telegramUser}
          onOpen={onAccountOpen}
        />
        {notification ? (
          <div className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.75rem)] z-[95] mx-auto w-auto max-w-[440px] sm:inset-x-auto sm:right-5 sm:top-20 sm:mx-0 sm:w-[min(440px,calc(100vw-2rem))]">
            <WorkspaceNotificationBanner
              copy={copy}
              isDarkTheme={isDarkTheme}
              notification={notification}
              onDismiss={onNotificationDismiss}
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}

function BrandLogo({
  copy,
  isDarkTheme,
  language,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
}) {
  const wrapperClassName =
    "motion-fx-1-brand flex h-[42px] max-w-[min(46vw,156px)] shrink-0 items-center gap-[6px] overflow-hidden rounded-xl px-0 py-1 sm:h-[54px] sm:max-w-none sm:gap-[7px]";
  const isEnglish = language === "en-US";
  const logoAlt = copy.workspace.brandAlt;
  const wordmarkSrc = isEnglish
    ? isDarkTheme
      ? "/logo-wordmark-en-dark.svg"
      : "/logo-wordmark-en-light.svg"
    : isDarkTheme
      ? "/logo-wordmark-zh-dark.svg"
      : "/logo-wordmark-zh-light.svg";

  return (
    <div aria-label={logoAlt} className={wrapperClassName}>
      <Image
        priority
        unoptimized
        alt=""
        aria-hidden="true"
        className="h-8 w-8 shrink-0 object-contain sm:h-[39.6px] sm:w-[39.6px]"
        height={64}
        src="/logo-mark.svg"
        width={64}
      />
      <Image
        priority
        unoptimized
        alt={logoAlt}
        className="h-8 w-auto object-contain object-left sm:h-[39.6px]"
        height={64}
        src={wordmarkSrc}
        width={isEnglish ? 240 : 160}
      />
    </div>
  );
}

function TelegramCommunityButton({
  copy,
  isDarkTheme,
  onCommunityOpen,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onCommunityOpen: () => void;
}) {
  const className = isDarkTheme
    ? "group motion-fx-1-nav-button flex h-10 items-center gap-2 overflow-visible rounded-full border border-sky-300/24 bg-[#00A6F4] px-3 text-sm font-semibold text-white transition-none hover:bg-[#00A6F4] hover:shadow-none active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
    : "group motion-fx-1-nav-button flex h-10 items-center gap-2 overflow-visible rounded-full border border-[#00A6F4]/20 bg-[#00A6F4] px-3 text-sm font-semibold text-white transition-none hover:bg-[#00A6F4] hover:shadow-none active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#229ED9]";
  const slugClassName = "max-w-0 overflow-hidden whitespace-nowrap text-xs font-normal text-white/86 opacity-0 transition-[max-width,opacity,margin] duration-200 ease-out group-hover:ml-1 group-hover:max-w-28 group-hover:opacity-100 group-focus-visible:ml-1 group-focus-visible:max-w-28 group-focus-visible:opacity-100";

  return (
    <button
      aria-label={`${copy.workspace.community} - ${copy.workspace.communitySlug}`}
      className={className}
      title={`${copy.workspace.community} - ${copy.workspace.communitySlug}`}
      type="button"
      onClick={onCommunityOpen}
    >
      <TelegramIcon className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">{copy.workspace.community}</span>
      <span aria-hidden="true" className={slugClassName}>
        {copy.workspace.communitySlug}
      </span>
    </button>
  );
}

function GuideIconButton({
  copy,
  isDarkTheme,
  onGuideOpen,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onGuideOpen: () => void;
}) {
  const className = isDarkTheme
    ? "group motion-fx-1-nav-button flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/[0.075] bg-white/[0.035] px-0 text-sm font-medium text-slate-300 transition-[width,transform,background-color,border-color,color,padding] duration-200 ease-out active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 sm:h-10 sm:w-10 sm:hover:w-[104px] sm:hover:border-white/[0.11] sm:hover:bg-white/[0.08] sm:hover:px-3 sm:hover:text-slate-50 sm:focus-visible:w-[104px] sm:focus-visible:px-3"
    : "group motion-fx-1-nav-button flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#E5EAF0] bg-white px-0 text-sm font-medium text-slate-500 transition-[width,transform,background-color,border-color,color,padding] duration-200 ease-out active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#229ED9] sm:h-10 sm:w-10 sm:hover:w-[104px] sm:hover:border-[#B7E8FC] sm:hover:bg-[#EAF8FE]/70 sm:hover:px-3 sm:hover:text-slate-950 sm:focus-visible:w-[104px] sm:focus-visible:px-3";

  return (
    <button
      aria-label={copy.workspace.guide}
      className={className}
      title={copy.workspace.guide}
      type="button"
      onClick={onGuideOpen}
    >
      <GuideSparkIcon className="h-4 w-4 shrink-0" />
      <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap text-xs font-normal opacity-0 transition-[max-width,opacity,margin] duration-200 ease-out sm:group-hover:ml-2 sm:group-hover:max-w-16 sm:group-hover:opacity-100 sm:group-focus-visible:ml-2 sm:group-focus-visible:max-w-16 sm:group-focus-visible:opacity-100">
        {copy.workspace.guide}
      </span>
    </button>
  );
}

function LanguageToggleButton({
  copy,
  isDarkTheme,
  language,
  onLanguageToggle,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  onLanguageToggle: () => void;
}) {
  const className = isDarkTheme
    ? "motion-fx-1-nav-button flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/[0.075] bg-white/[0.035] text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50 sm:h-10 sm:w-10"
    : "motion-fx-1-nav-button flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#E5EAF0] bg-white text-slate-600 transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE]/70 hover:text-[#007DB8] sm:h-10 sm:w-10";

  return (
    <button
      aria-label={copy.workspace.languageTitle[language === "zh-CN" ? "en-US" : "zh-CN"]}
      className={className}
      title={copy.workspace.languageTitle[language === "zh-CN" ? "en-US" : "zh-CN"]}
      type="button"
      onClick={onLanguageToggle}
    >
      <LanguagesIcon className="h-4 w-4" />
    </button>
  );
}

function AnimatedThemeToggler({
  copy,
  isCollapsed,
  isDarkTheme,
  onThemeToggle,
}: {
  copy: WorkspaceCopy;
  isCollapsed: boolean;
  isDarkTheme: boolean;
  onThemeToggle: () => void;
}) {
  const className = isDarkTheme
    ? `motion-fx-1-nav-button ${isCollapsed ? "grid h-8 w-8 place-items-center sm:h-10 sm:w-10" : "flex h-10 w-full items-center gap-3 px-2.5"} rounded-full border border-white/[0.075] bg-white/[0.035] text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50`
    : `motion-fx-1-nav-button ${isCollapsed ? "grid h-8 w-8 place-items-center sm:h-10 sm:w-10" : "flex h-10 w-full items-center gap-3 px-2.5"} rounded-full border border-[#E5EAF0] bg-white text-sm font-medium text-slate-500 transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE]/70 hover:text-slate-950`;

  return (
    <button
      aria-label={isDarkTheme ? copy.workspace.themeSwitchToLight : copy.workspace.themeSwitchToDark}
      className={className}
      type="button"
      onClick={(event) => {
        const originX = event.clientX;
        const originY = event.clientY;

        if (!document.startViewTransition) {
          onThemeToggle();
          return;
        }

        const transition = document.startViewTransition(() => {
          flushSync(onThemeToggle);
        });

        void transition.ready.then(() => {
          const endRadius = Math.hypot(
            Math.max(originX, window.innerWidth - originX),
            Math.max(originY, window.innerHeight - originY),
          );

          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${originX}px ${originY}px)`,
                `circle(${endRadius}px at ${originX}px ${originY}px)`,
              ],
            },
            {
              duration: 820,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            },
          );

          document.documentElement.animate(
            { opacity: [1, 0.82, 0] },
            {
              duration: 820,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-old(root)",
            },
          );
        });
      }}
    >
      <ThemeToggleIcon isDarkTheme={isDarkTheme} />
      {!isCollapsed ? (
        <span>{isDarkTheme ? copy.workspace.themeLight : copy.workspace.themeDark}</span>
      ) : null}
    </button>
  );
}

function ThemeToggleIcon({ isDarkTheme }: { isDarkTheme: boolean }) {
  return isDarkTheme ? (
    <SunIcon className="h-4 w-4" />
  ) : (
    <MoonIcon className="h-4 w-4" />
  );
}

function isPnlColorMode(value: unknown): value is PnlColorMode {
  return value === "positiveGreen" || value === "positiveRed";
}

function PnlColorModeToggleButton({
  copy,
  isDarkTheme,
  pnlColorMode,
  onToggle,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  pnlColorMode: PnlColorMode;
  onToggle: () => void;
}) {
  const className = isDarkTheme
    ? "motion-fx-1-nav-button grid h-8 w-8 place-items-center rounded-full border border-white/[0.075] bg-white/[0.035] text-xs font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50 sm:h-10 sm:w-10"
    : "motion-fx-1-nav-button grid h-8 w-8 place-items-center rounded-full border border-[#E5EAF0] bg-white text-xs font-black text-slate-500 transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE]/70 hover:text-slate-950 sm:h-10 sm:w-10";
  const title = pnlColorMode === "positiveGreen"
    ? copy.workspace.pnlColorSwitchToPositiveRed
    : copy.workspace.pnlColorSwitchToPositiveGreen;
  const leadingClassName = pnlColorMode === "positiveGreen" ? "text-emerald-500" : "text-rose-500";
  const trailingClassName = pnlColorMode === "positiveGreen" ? "text-rose-500" : "text-emerald-500";

  return (
    <button
      aria-label={title}
      className={className}
      title={title}
      type="button"
      onClick={onToggle}
    >
      <span aria-hidden="true" className="flex items-center gap-0.5">
        <span className={leadingClassName}>+</span>
        <span className="text-slate-400">/</span>
        <span className={trailingClassName}>−</span>
      </span>
    </button>
  );
}

function SidebarCollapseButton({
  copy,
  isCollapsed,
  isDarkTheme,
  panelLabel,
  variant = "header",
  onToggle,
}: {
  copy: WorkspaceCopy;
  isCollapsed: boolean;
  isDarkTheme: boolean;
  panelLabel?: string;
  variant?: "header" | "edge-tab";
  onToggle: () => void;
}) {
  const resolvedPanelLabel = panelLabel ?? copy.kol.title;
  const label = isCollapsed ? resolvedPanelLabel : copy.workspace.collapse;
  const edgeLabel = isCollapsed ? resolvedPanelLabel : copy.workspace.edgePanel;

  if (variant === "edge-tab") {
    const className = isDarkTheme
      ? "kol-edge-tab group fixed right-0 top-1/2 z-[60] hidden h-14 w-8 -translate-y-1/2 overflow-hidden rounded-l-2xl border border-r-0 border-white/[0.075] bg-[#181A20]/96 text-slate-200 backdrop-blur-xl transition-[width,transform,background-color,border-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-[116px] hover:-translate-x-0.5 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-slate-50 active:scale-[0.98] lg:flex"
      : "kol-edge-tab group fixed right-0 top-1/2 z-[60] hidden h-14 w-8 -translate-y-1/2 overflow-hidden rounded-l-2xl border border-r-0 border-[#BFE7FB] bg-[#F4FBFF] text-slate-700 backdrop-blur-xl transition-[width,transform,background-color,border-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-[116px] hover:-translate-x-0.5 hover:border-[#A7DDF7] hover:bg-[#ECF8FE] hover:text-slate-900 active:scale-[0.98] lg:flex";

    return (
      <button
        aria-label={edgeLabel}
        className={className}
        type="button"
        onClick={onToggle}
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-full items-center justify-center transition-all duration-200 ease-out group-hover:w-8 group-hover:justify-start group-hover:px-2.5">
          <ChevronLeftIcon className="motion-fx-7-collapse-icon h-4 w-4" />
        </span>
        <span className="pointer-events-none absolute left-8 top-1/2 max-w-0 -translate-y-1/2 overflow-hidden whitespace-nowrap text-[13px] font-normal leading-none opacity-0 transition-[max-width,opacity] duration-200 ease-out group-hover:max-w-20 group-hover:opacity-100">
          {resolvedPanelLabel}
        </span>
      </button>
    );
  }

  const className = isDarkTheme
    ? "group hidden h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/[0.075] bg-white/[0.035] px-0 text-slate-300 transition-[width,transform,background-color,border-color,color,padding] duration-200 ease-out hover:w-[74px] hover:border-white/[0.11] hover:bg-white/[0.08] hover:px-3 hover:text-slate-50 active:scale-[0.98] focus-visible:w-[74px] focus-visible:px-3 lg:flex"
    : "group hidden h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#BFE7FB] bg-[#F4FBFF] px-0 text-slate-700 transition-[width,transform,background-color,border-color,color,padding] duration-200 ease-out hover:w-[74px] hover:border-[#A7DDF7] hover:bg-[#ECF8FE] hover:px-3 hover:text-slate-900 active:scale-[0.98] focus-visible:w-[74px] focus-visible:px-3 lg:flex";

  return (
    <button
      aria-label={label}
      className={className}
      title={label}
      type="button"
      onClick={onToggle}
    >
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-normal opacity-0 transition-[max-width,opacity,margin] duration-200 ease-out group-hover:mr-2 group-hover:max-w-10 group-hover:opacity-100 group-focus-visible:mr-2 group-focus-visible:max-w-10 group-focus-visible:opacity-100">
        {label}
      </span>
      <span className="grid h-4 w-4 shrink-0 place-items-center">
        {isCollapsed ? (
          <PanelRightOpenIcon className="motion-fx-7-collapse-icon h-4 w-4 is-collapsed" />
        ) : (
          <PanelRightCloseIcon className="motion-fx-7-collapse-icon h-4 w-4" />
        )}
      </span>
    </button>
  );
}

function WorkspaceNotificationBanner({
  copy,
  isDarkTheme,
  notification,
  onDismiss,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  notification: WorkspaceNotification;
  onDismiss: () => void;
}) {
  const tone = getWorkspaceNotificationTone(notification.kind, isDarkTheme, copy);

  return (
    <div className={tone.shellClassName} role={notification.kind === "error" ? "alert" : "status"}>
      <div className={tone.headerClassName}>
        <div className="flex items-center justify-between gap-3">
          <span className={tone.eyebrowClassName}>
            {tone.eyebrow}
          </span>
          <button
            aria-label={copy.common.close}
            className={tone.closeClassName}
            type="button"
            onClick={onDismiss}
          >
            {copy.common.close}
          </button>
        </div>
      </div>
      <div className="flex gap-3 px-4 py-3">
        <div className={tone.iconClassName}>
          <span aria-hidden="true">{tone.icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className={tone.titleClassName}>
            {notification.title}
          </div>
          <div className={tone.messageClassName}>
            {notification.message}
          </div>
          <div className={tone.metaClassName}>
            {notification.meta}
          </div>
        </div>
      </div>
    </div>
  );
}

function getWorkspaceNotificationTone(
  kind: WorkspaceNotificationKind,
  isDarkTheme: boolean,
  copy: WorkspaceCopy,
) {
  const common = {
    closeClassName: isDarkTheme
      ? "rounded-full px-2 py-0.5 text-xs text-slate-500 transition hover:bg-white/[0.08] hover:text-slate-200"
      : "rounded-full px-2 py-0.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-700",
    messageClassName: isDarkTheme
      ? "mt-1 whitespace-pre-line break-words text-xs leading-5 text-slate-300"
      : "mt-1 whitespace-pre-line break-words text-xs leading-5 text-slate-600",
    metaClassName: isDarkTheme
      ? "mt-2 break-words text-[11px] text-slate-500"
      : "mt-2 break-words text-[11px] text-slate-400",
    titleClassName: isDarkTheme
      ? "break-words text-sm font-bold text-slate-50"
      : "break-words text-sm font-bold text-slate-950",
  };

  if (kind === "error") {
    return {
      ...common,
      eyebrow: copy.workspace.errorNotification,
      eyebrowClassName: isDarkTheme ? "text-[11px] font-bold text-rose-300" : "text-[11px] font-bold text-rose-700",
      headerClassName: isDarkTheme ? "border-b border-rose-300/15 bg-rose-400/[0.08] px-4 py-2" : "border-b border-rose-100 bg-rose-50 px-4 py-2",
      icon: "!",
      iconClassName: isDarkTheme ? "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-500/15 text-lg font-black text-rose-300" : "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-100 text-lg font-black text-rose-700",
      shellClassName: isDarkTheme ? "pointer-events-auto w-full overflow-hidden rounded-2xl border border-rose-300/20 bg-[#1B1117]/96 shadow-[0_18px_56px_rgba(0,0,0,0.38)] backdrop-blur-xl" : "pointer-events-auto w-full overflow-hidden rounded-2xl border border-rose-100 bg-white/96 shadow-[0_18px_56px_rgba(127,29,29,0.14)] backdrop-blur-xl",
    };
  }

  if (kind === "success") {
    return {
      ...common,
      eyebrow: copy.workspace.successNotification,
      eyebrowClassName: isDarkTheme ? "text-[11px] font-bold text-emerald-300" : "text-[11px] font-bold text-emerald-700",
      headerClassName: isDarkTheme ? "border-b border-emerald-300/15 bg-emerald-400/[0.08] px-4 py-2" : "border-b border-emerald-100 bg-emerald-50 px-4 py-2",
      icon: "✓",
      iconClassName: isDarkTheme ? "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-lg font-black text-emerald-300" : "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-lg font-black text-emerald-700",
      shellClassName: isDarkTheme ? "pointer-events-auto w-full overflow-hidden rounded-2xl border border-emerald-300/20 bg-[#111B17]/96 shadow-[0_18px_56px_rgba(0,0,0,0.34)] backdrop-blur-xl" : "pointer-events-auto w-full overflow-hidden rounded-2xl border border-emerald-100 bg-white/96 shadow-[0_18px_56px_rgba(6,95,70,0.12)] backdrop-blur-xl",
    };
  }

  return {
    ...common,
    eyebrow: copy.workspace.browserNotification,
    eyebrowClassName: isDarkTheme ? "text-[11px] font-bold text-sky-300" : "text-[11px] font-bold text-[#007DB8]",
    headerClassName: isDarkTheme ? "border-b border-white/[0.075] bg-white/[0.035] px-4 py-2" : "border-b border-[#E5EAF0] bg-[#F8FAFC] px-4 py-2",
    icon: "🔔",
    iconClassName: isDarkTheme ? "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-500/15 text-sky-300" : "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600",
    shellClassName: isDarkTheme ? "pointer-events-auto w-full overflow-hidden rounded-2xl border border-white/[0.075] bg-[#181A20]/96 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl" : "pointer-events-auto w-full overflow-hidden rounded-2xl border border-[#E5EAF0] bg-white/96 shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl",
  };
}

function openExternalTelegramUrl(url: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function mergeIncomingSignals(
  incomingSignals: readonly StructuredSignal[],
  currentSignals: StructuredSignal[],
): StructuredSignal[] {
  const mergedSignals = dedupeStructuredSignalsByPosition([
    ...currentSignals,
    ...incomingSignals,
  ]);
  return areStructuredSignalListsEqual(currentSignals, mergedSignals)
    ? currentSignals
    : mergedSignals;
}

function areStructuredSignalListsEqual(
  leftSignals: readonly StructuredSignal[],
  rightSignals: readonly StructuredSignal[],
): boolean {
  if (leftSignals.length !== rightSignals.length) {
    return false;
  }

  return leftSignals.every((leftSignal, index) => {
    const rightSignal = rightSignals[index];
    return Boolean(
      rightSignal &&
        leftSignal.id === rightSignal.id &&
        leftSignal.created_at === rightSignal.created_at &&
        createStructuredSignalPositionKey(leftSignal) ===
          createStructuredSignalPositionKey(rightSignal),
    );
  });
}

function dedupeStructuredSignalsByPosition(
  signals: readonly StructuredSignal[],
): StructuredSignal[] {
  const signalsByPositionKey = new Map<string, StructuredSignal>();

  for (const signal of signals) {
    const positionKey = createStructuredSignalPositionKey(signal);
    const currentSignal = signalsByPositionKey.get(positionKey);
    if (
      !currentSignal ||
      compareStructuredSignalCreatedAt(signal, currentSignal) < 0
    ) {
      signalsByPositionKey.set(positionKey, signal);
    }
  }

  return sortSignalsForKolPanel(
    Array.from(signalsByPositionKey.values()),
  ).slice(0, MAX_VISIBLE_KOL_SIGNAL_HISTORY);
}

function compareStructuredSignalCreatedAt(
  left: StructuredSignal,
  right: StructuredSignal,
): number {
  return (
    getStructuredSignalCreatedAtTimestamp(left) -
    getStructuredSignalCreatedAtTimestamp(right)
  );
}

function getStructuredSignalCreatedAtTimestamp(
  signal: StructuredSignal,
): number {
  const timestamp = Date.parse(signal.created_at);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function getLatestStructuredSignalCreatedAt(
  signals: readonly StructuredSignal[],
): string | null {
  let latestSignal: StructuredSignal | null = null;
  let latestTimestamp = Number.NEGATIVE_INFINITY;

  for (const signal of signals) {
    const timestamp = Date.parse(signal.created_at);
    if (Number.isFinite(timestamp) && timestamp > latestTimestamp) {
      latestSignal = signal;
      latestTimestamp = timestamp;
    }
  }

  return latestSignal?.created_at ?? null;
}

function sortSignalsForKolPanel(
  signals: readonly StructuredSignal[],
): StructuredSignal[] {
  return signals.slice().sort((left, right) => {
    const strongAlertSort =
      Number(right.isStrongAlert) - Number(left.isStrongAlert);
    if (strongAlertSort !== 0) {
      return strongAlertSort;
    }

    const createdAtSort =
      Date.parse(right.created_at) - Date.parse(left.created_at);
    if (Number.isFinite(createdAtSort) && createdAtSort !== 0) {
      return createdAtSort;
    }

    return right.id.localeCompare(left.id);
  });
}

function formatMobileSignalTime(signal: StructuredSignal): string {
  return signal.created_at.replace("T", " ").slice(5, 16);
}

function formatMobileSymbolLabel(symbol: MarketSymbol): string {
  return symbol.replace("/USDT:USDT", "");
}

function ChevronUpIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m6 15 6-6 6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m15 6-6 6 6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.6"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function LanguagesIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m5 8 4.5 7M4 15l5.4-7.8M3 5h10M8 3v2M12 19l1.2-3M21 19l-4-10-4 10M14 16h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function GuideSparkIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path
        d="M9.75 9.35a2.35 2.35 0 0 1 4.5.9c0 1.55-1.15 2.05-1.84 2.55-.48.35-.66.72-.66 1.35"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path
        d="M12 17.25h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M20.5 14.3A8.2 8.2 0 0 1 9.7 3.5 8.2 8.2 0 1 0 20.5 14.3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function PanelRightCloseIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M14 3v18M10.5 9 7.5 12l3 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function PanelRightOpenIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M14 3v18M8 9l3 3-3 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function SunIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 3v2.25M12 18.75V21M4.22 4.22l1.59 1.59M18.19 18.19l1.59 1.59M3 12h2.25M18.75 12H21M4.22 19.78l1.59-1.59M18.19 5.81l1.59-1.59"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function TelegramIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M21.5 4.1 18.2 19.7c-.25 1.1-.9 1.37-1.82.85l-5.03-3.7-2.43 2.34c-.27.27-.5.5-1.02.5l.36-5.12 9.32-8.43c.4-.36-.09-.56-.63-.2L5.43 13.2.47 11.65c-1.08-.34-1.1-1.08.22-1.6L20.08 2.58c.9-.34 1.68.2 1.42 1.52Z"
        fill="currentColor"
      />
    </svg>
  );
}
