"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { markets } from "@/app/_lib/demo-data";
import { fetchUsdtPerpetualMarkets } from "@/app/_lib/binance-market-data";
import {
  createStructuredSignalPositionKey,
  fetchKolSignals,
  fetchKolSignalsAfter,
} from "@/app/_lib/kol-signal-api";
import {
  createCopyTradingTradeMarkers,
  createMarketAlignedMockCopyTradingRadarSnapshot,
  fetchCopyTradingRadarSnapshot,
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
import { TopSignalsPanel } from "./signal-workspace/top-signals-panel";

const MAX_VISIBLE_KOL_SIGNAL_HISTORY = 1_000;
const NOTIFICATION_DISMISS_MS = 6_500;
const KOL_SIGNAL_POLL_INTERVAL_MS = 30_000;
const TOP_SIGNALS_POLL_INTERVAL_MS = 60_000;
const COMPACT_LAYOUT_MEDIA_QUERY = "(max-width: 1023px)";
const TELEGRAM_DISCUSSION_GROUP_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_GROUP_URL ?? "https://t.me/smartkline";
const EMPTY_COPY_TRADING_TRADE_MARKERS: readonly CopyTradingTradeMarker[] = [];


type WorkspaceNotification = {
  id: string;
  message: string;
  meta: string;
  title: string;
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
  const [topSignalsSourceStatus, setTopSignalsSourceStatus] =
    useState<KolSignalSourceStatus>({
      error: null,
      isLoading: true,
    });
  const [latestMarketCandleUpdate, setLatestMarketCandleUpdate] =
    useState<PaperPositionMarketCandleUpdate | null>(null);
  const [workspaceNotification, setWorkspaceNotification] =
    useState<WorkspaceNotification | null>(null);
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

  const activeSignal =
    signals.find((signal) => signal.id === activeSignalId) ??
    signals[0] ??
    null;
  const kolSignals = useMemo(() => sortSignalsForKolPanel(signals), [signals]);
  const watchlistedKolSourceKeys = useMemo(
    () => new Set(watchlist.kolSources.map((source) => source.key)),
    [watchlist.kolSources],
  );
  const watchlistedTopSignalSourceIds = useMemo(
    () => new Set(watchlist.topSignalSources.map((source) => source.id)),
    [watchlist.topSignalSources],
  );
  const topSignalsActiveSourceIds = useMemo(
    () => new Set(topSignalsSnapshot?.traders.filter(isActiveCopyTradingTrader).map((trader) => trader.trader_id) ?? []),
    [topSignalsSnapshot],
  );
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
  const shouldLoadTopSignalsSnapshot = activeProductTab === "topSignals";

  const {
    candlesBySymbol: paperPositionCandlesBySymbol,
    errorsBySymbol: paperPositionErrorsBySymbol,
    latestPricesBySymbol: paperPositionLatestPricesBySymbol,
  } = usePaperPositionCandles(signals, latestMarketCandleUpdate);
  const paperPositionsBySignalId = useMemo(() => {
    const recordsBySignalId: Record<string, PaperPositionRecord> = {};

    for (const signal of signals) {
      const candles = paperPositionCandlesBySymbol[signal.symbol];
      if (candles && candles.length > 0) {
        recordsBySignalId[signal.id] = computePaperPositionRecord(
          signal,
          candles,
          {
            currentPriceOverride:
              paperPositionLatestPricesBySymbol[signal.symbol] ?? null,
          },
        );
      }
    }

    return recordsBySignalId;
  }, [
    paperPositionCandlesBySymbol,
    paperPositionLatestPricesBySymbol,
    signals,
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

  const handleCommunityModalJoin = useCallback(() => {
    handleTelegramDiscussionJoin();
    setIsCommunityConversionOpen(false);
  }, [handleTelegramDiscussionJoin]);

  const toggleTheme = () =>
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
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

  useEffect(() => {
    copyRef.current = copy;
  }, [copy]);

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
  }, []);

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
    },
    [],
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
      }
    },
    [activeProductTab, signals],
  );

  const handleTopSignalSourceSelect = useCallback((sourceId: string) => {
    setActiveTopSignalSourceId(sourceId);
    setActiveTopSignalTradeEventId("");
  }, []);

  const handleTopSignalSourceFilterChange = useCallback((sourceId: string) => {
    setTopSignalsSourceFilterId(sourceId);
    if (sourceId !== "all") {
      setActiveTopSignalSourceId(sourceId);
      setActiveTopSignalTradeEventId("");
    }
  }, []);

  const handleTopSignalPositionSelect = useCallback((position: CopyTradingPosition) => {
    setActiveTopSignalSourceId(position.trader_id);
    setActiveTopSignalTradeEventId("");
    setChartFocusSignalRequestKey(null);
    setChartFocusTimeRequest(null);
    setSymbol(toCopyTradingMarketSymbol(position.symbol));
  }, []);

  const handleTopSignalTradeSelect = useCallback((event: CopyTradingEvent) => {
    const eventTimeMs = Date.parse(event.occurred_at);
    const nextSymbol = toCopyTradingMarketSymbol(event.symbol);
    setActiveTopSignalSourceId(event.trader_id);
    setActiveTopSignalTradeEventId(event.event_id);
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
  }, []);

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

  const isIntelTab = activeProductTab === "intel";
  const isTopSignalsTab = activeProductTab === "topSignals";
  const isChartSplitProductTab = isIntelTab || isTopSignalsTab;
  const chartActiveSignal = isIntelTab ? activeSignal : null;
  const chartActivePaperPosition = isIntelTab ? activeChartPaperPosition : null;
  const chartSignals = isIntelTab ? signals : [];
  const chartTradeMarkers = isTopSignalsTab
    ? topSignalsTradeMarkers
    : EMPTY_COPY_TRADING_TRADE_MARKERS;
  const chartFocusTime = isTopSignalsTab ? chartFocusTimeRequest : null;

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
          onCommunityOpen={handleTelegramDiscussionJoin}
          onGuideOpen={startOnboardingGuide}
          onLanguageToggle={toggleLanguage}
          onNotificationDismiss={() => setWorkspaceNotification(null)}
          onProductTabChange={setActiveProductTab}
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
                signalBiasSummary={isTopSignalsTab ? topSignalsSignalBiasSummary : null}
                symbol={symbol}
                signals={chartSignals}
                theme={theme}
                tradeMarkers={chartTradeMarkers}
                onIntervalChange={(nextInterval) => {
                  setChartFocusSignalRequestKey(null);
                  setChartFocusTimeRequest(null);
                  setInterval(nextInterval);
                }}
                onSymbolChange={handleSymbolChange}
                onSignalSelect={handleSignalSelect}
                onFocusSignalRequestHandled={() =>
                  setChartFocusSignalRequestKey(null)
                }
                onFocusTimeRequestHandled={() =>
                  setChartFocusTimeRequest(null)
                }
                onMarketCandleUpdate={setLatestMarketCandleUpdate}
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
                    snapshot={topSignalsSnapshot}
                    sourceFilterId={effectiveTopSignalsSourceFilterId}
                    sourceStatus={topSignalsSourceStatus}
                    watchlistedSourceIds={watchlistedTopSignalSourceIds}
                    onPositionSelect={handleTopSignalPositionSelect}
                    onSourceFilterChange={handleTopSignalSourceFilterChange}
                    onSourceSelect={handleTopSignalSourceSelect}
                    onSourceWatchToggle={handleTopSignalSourceWatchToggle}
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
          snapshot={topSignalsSnapshot}
          sourceFilterId={effectiveTopSignalsSourceFilterId}
          sourceStatus={topSignalsSourceStatus}
          watchlistedSourceIds={watchlistedTopSignalSourceIds}
          onOpenChange={setIsMobileTopSignalsSheetOpen}
          onPositionSelect={handleTopSignalPositionSelect}
          onSourceFilterChange={handleTopSignalSourceFilterChange}
          onSourceSelect={handleTopSignalSourceSelect}
          onSourceWatchToggle={handleTopSignalSourceWatchToggle}
          onTradeHistoryLoadMore={handleTopSignalTradeHistoryLoadMore}
          onTradeSelect={handleTopSignalTradeSelect}
        />
      ) : null}
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
  snapshot,
  sourceFilterId,
  sourceStatus,
  watchlistedSourceIds,
  onOpenChange,
  onPositionSelect,
  onSourceFilterChange,
  onSourceSelect,
  onSourceWatchToggle,
  onTradeHistoryLoadMore,
  onTradeSelect,
}: {
  activeSourceId: string;
  activeTradeEventId: string;
  copy: WorkspaceCopy;
  isCompactLayout: boolean;
  isDarkTheme: boolean;
  isOpen: boolean;
  snapshot: CopyTradingRadarSnapshot | null;
  sourceFilterId: string;
  sourceStatus: KolSignalSourceStatus;
  watchlistedSourceIds: ReadonlySet<string>;
  onOpenChange: (isOpen: boolean) => void;
  onPositionSelect: (position: CopyTradingPosition) => void;
  onSourceFilterChange: (sourceId: string) => void;
  onSourceSelect: (sourceId: string) => void;
  onSourceWatchToggle: (trader: CopyTradingTrader) => void;
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
  onCommunityOpen,
  onGuideOpen,
  onLanguageToggle,
  onNotificationDismiss,
  onProductTabChange,
  onThemeToggle,
}: {
  activeProductTab: WorkspaceProductTab;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  notification: WorkspaceNotification | null;
  onCommunityOpen: () => void;
  onGuideOpen: () => void;
  onLanguageToggle: () => void;
  onNotificationDismiss: () => void;
  onProductTabChange: (tab: WorkspaceProductTab) => void;
  onThemeToggle: () => void;
}) {
  const headerClassName = isDarkTheme
    ? "relative z-50 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-6 border-b border-white/[0.075] bg-[#0B0E11]/95 px-3 py-2 backdrop-blur-xl sm:px-5 lg:flex-nowrap"
    : "relative z-50 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-6 border-b border-[#E5EAF0] bg-white/95 px-3 py-2 backdrop-blur-xl sm:px-5 lg:flex-nowrap";

  return (
    <header className={headerClassName}>
      <div className="flex min-w-0 items-center gap-8">
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
      <div className="relative flex items-center gap-2">
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
        <LanguageToggleButton
          copy={copy}
          isDarkTheme={isDarkTheme}
          language={language}
          onLanguageToggle={onLanguageToggle}
        />
        {notification ? (
          <div className="fixed right-5 top-20 z-[65] w-[min(390px,calc(100vw-2rem))]">
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
    "motion-fx-1-brand flex h-[54px] shrink-0 items-center gap-[7px] overflow-hidden rounded-xl px-0 py-1";
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
        className="h-[39.6px] w-[39.6px] shrink-0 object-contain"
        height={64}
        src="/logo-mark.svg"
        width={64}
      />
      <Image
        priority
        unoptimized
        alt={logoAlt}
        className="h-[39.6px] w-auto object-contain object-left"
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
    ? "group motion-fx-1-nav-button flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/[0.075] bg-white/[0.035] px-0 text-sm font-medium text-slate-300 transition-[width,transform,background-color,border-color,color,padding] duration-200 ease-out hover:w-[104px] hover:border-white/[0.11] hover:bg-white/[0.08] hover:px-3 hover:text-slate-50 active:scale-[0.98] focus-visible:w-[104px] focus-visible:px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
    : "group motion-fx-1-nav-button flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#E5EAF0] bg-white px-0 text-sm font-medium text-slate-500 transition-[width,transform,background-color,border-color,color,padding] duration-200 ease-out hover:w-[104px] hover:border-[#B7E8FC] hover:bg-[#EAF8FE]/70 hover:px-3 hover:text-slate-950 active:scale-[0.98] focus-visible:w-[104px] focus-visible:px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#229ED9]";

  return (
    <button
      aria-label={copy.workspace.guide}
      className={className}
      title={copy.workspace.guide}
      type="button"
      onClick={onGuideOpen}
    >
      <GuideSparkIcon className="h-4 w-4 shrink-0" />
      <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap text-xs font-normal opacity-0 transition-[max-width,opacity,margin] duration-200 ease-out group-hover:ml-2 group-hover:max-w-16 group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-16 group-focus-visible:opacity-100">
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
    ? "motion-fx-1-nav-button flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/[0.075] bg-white/[0.035] text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50"
    : "motion-fx-1-nav-button flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#E5EAF0] bg-white text-slate-600 transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE]/70 hover:text-[#007DB8]";

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
    ? `motion-fx-1-nav-button ${isCollapsed ? "grid h-10 w-10 place-items-center" : "flex h-10 w-full items-center gap-3 px-2.5"} rounded-full border border-white/[0.075] bg-white/[0.035] text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50`
    : `motion-fx-1-nav-button ${isCollapsed ? "grid h-10 w-10 place-items-center" : "flex h-10 w-full items-center gap-3 px-2.5"} rounded-full border border-[#E5EAF0] bg-white text-sm font-medium text-slate-500 transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE]/70 hover:text-slate-950`;

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
  const className = isDarkTheme
    ? "pointer-events-auto w-full overflow-hidden rounded-2xl border border-white/[0.075] bg-[#181A20]/96 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl"
    : "pointer-events-auto w-full overflow-hidden rounded-2xl border border-[#E5EAF0] bg-white/96 shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl";

  return (
    <div className={className} role="status">
      <div
        className={
          isDarkTheme
            ? "border-b border-white/[0.075] bg-white/[0.035] px-4 py-2"
            : "border-b border-[#E5EAF0] bg-[#F8FAFC] px-4 py-2"
        }
      >
        <div className="flex items-center justify-between gap-3">
          <span
            className={
              isDarkTheme
                ? "text-[11px] font-bold text-sky-300"
                : "text-[11px] font-bold text-[#007DB8]"
            }
          >
            {copy.workspace.browserNotification}
          </span>
          <button
            className={
              isDarkTheme
                ? "rounded-full px-2 py-0.5 text-xs text-slate-500 transition hover:bg-white/[0.08] hover:text-slate-200"
                : "rounded-full px-2 py-0.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            }
            type="button"
            onClick={onDismiss}
          >
            {copy.common.close}
          </button>
        </div>
      </div>
      <div className="flex gap-3 px-4 py-3">
        <div
          className={
            isDarkTheme
              ? "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-500/15 text-sky-300"
              : "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600"
          }
        >
          <span aria-hidden="true">🔔</span>
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={
              isDarkTheme
                ? "truncate text-sm font-bold text-slate-50"
                : "truncate text-sm font-bold text-slate-950"
            }
          >
            {notification.title}
          </div>
          <div
            className={
              isDarkTheme
                ? "mt-1 text-xs leading-5 text-slate-300"
                : "mt-1 text-xs leading-5 text-slate-600"
            }
          >
            {notification.message}
          </div>
          <div
            className={
              isDarkTheme
                ? "mt-2 text-[11px] text-slate-500"
                : "mt-2 text-[11px] text-slate-400"
            }
          >
            {notification.meta}
          </div>
        </div>
      </div>
    </div>
  );
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
