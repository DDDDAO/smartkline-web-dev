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
import type { KlineInterval, MarketSymbol } from "@/app/_types/market";
import type { CopyTradingTradeMarker } from "@/app/_types/copy-trading";
import type { StructuredSignal } from "@/app/_types/signal";
import { SourceAvatar, SymbolIcon } from "./signal-workspace/card-ui";
import {
  formatSignalPaperPositionStatus,
  getSignalDirectionBadgeClass,
  getSignalPaperPositionBadgeClass,
} from "./signal-workspace/paper-position-summary";

const MAX_VISIBLE_KOL_SIGNALS = 50;
const NOTIFICATION_DISMISS_MS = 6_500;
const KOL_SIGNAL_POLL_INTERVAL_MS = 30_000;
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
  const [theme, setTheme] = useState<ChartTheme>("light");
  const [language, setLanguage] = useState<WorkspaceLanguage>("zh-CN");
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isMobileKolSheetOpen, setIsMobileKolSheetOpen] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [isRightPanelExiting, setIsRightPanelExiting] = useState(false);
  const [isWorkspaceMotionVisible, setIsWorkspaceMotionVisible] =
    useState(false);
  const [marketOptions, setMarketOptions] = useState<MarketSymbol[]>(markets);
  const [signals, setSignals] = useState<StructuredSignal[]>([]);
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
    ? "motion-fx-7-workspace-grid relative flex min-h-0 flex-col gap-3 p-3 pb-24 lg:grid lg:h-full lg:p-4 lg:pb-4 lg:grid-cols-[minmax(0,1fr)]"
    : "motion-fx-7-workspace-grid relative flex min-h-0 flex-col gap-3 p-3 pb-24 lg:grid lg:h-full lg:gap-4 lg:p-4 lg:pb-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]";

  const startOnboardingGuide = useCallback(() => {
    setIsRightPanelCollapsed(false);
    setIsMobileKolSheetOpen(true);
    if (onboardingOpenTimeoutRef.current !== null) {
      window.clearTimeout(onboardingOpenTimeoutRef.current);
    }

    onboardingOpenTimeoutRef.current = window.setTimeout(() => {
      setIsOnboardingOpen(true);
      onboardingOpenTimeoutRef.current = null;
    }, 180);
  }, []);

  const handleTelegramDiscussionJoin = () => {
    openExternalTelegramUrl(TELEGRAM_DISCUSSION_GROUP_URL);
  };

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
      if (signal.symbol !== symbol) {
        setChartFocusSignalRequestKey(createSignalFocusRequestKey(signal));
      } else {
        setChartFocusSignalRequestKey(null);
      }
      setActiveSignalId(signal.id);
      setSymbol(signal.symbol);
    },
    [symbol],
  );

  const handleSymbolChange = useCallback(
    (nextSymbol: MarketSymbol) => {
      const nextSignal = signals.find((signal) => signal.symbol === nextSymbol);
      setChartFocusSignalRequestKey(null);
      setSymbol(nextSymbol);
      setActiveSignalId(nextSignal?.id ?? "");
    },
    [signals],
  );

  return (
    <main className={pageClassName} data-compact-ui>
      <div
        className={`motion-fx-10-delay-0 motion-fx-10-reveal ${isWorkspaceMotionVisible ? "is-visible" : ""}`}
      >
        <WorkspaceTopNavigation
          copy={copy}
          isDarkTheme={isDarkTheme}
          language={language}
          notification={workspaceNotification}
          onCommunityOpen={handleTelegramDiscussionJoin}
          onGuideOpen={startOnboardingGuide}
          onLanguageToggle={toggleLanguage}
          onNotificationDismiss={() => setWorkspaceNotification(null)}
          onThemeToggle={toggleTheme}
        />
      </div>
      <div className="min-w-0 flex-1 lg:min-h-0 lg:overflow-hidden">
        <section
          className={workspaceGridClassName}
          data-right-panel-collapsed={String(isRightPanelCollapsed)}
        >
          <div
            className={`motion-fx-10-delay-1 motion-fx-10-reveal motion-fx-7-primary-panel flex min-w-0 w-full lg:h-full lg:min-h-0 ${isWorkspaceMotionVisible ? "is-visible" : ""}`}
          >
            <RealtimeKlinePanel
              key={`${symbol}-${interval}`}
              activePaperPosition={activeChartPaperPosition}
              isActivePaperPositionReady={isActiveChartPaperPositionReady}
              activeSignal={activeSignal}
              focusSignalRequestKey={chartFocusSignalRequestKey}
              interval={interval}
              language={language}
              isCompactLayout={isCompactLayout}
              marketOptions={marketOptions}
              symbol={symbol}
              signals={signals}
              theme={theme}
              tradeMarkers={EMPTY_COPY_TRADING_TRADE_MARKERS}
              onIntervalChange={(nextInterval) => {
                setChartFocusSignalRequestKey(null);
                setInterval(nextInterval);
              }}
              onSymbolChange={handleSymbolChange}
              onSignalSelect={handleSignalSelect}
              onFocusSignalRequestHandled={() =>
                setChartFocusSignalRequestKey(null)
              }
              onMarketCandleUpdate={setLatestMarketCandleUpdate}
            />
          </div>

          {!isRightPanelCollapsed || isRightPanelExiting ? (
            <div
              className={`kol-panel-shell motion-fx-10-delay-2 motion-fx-10-reveal motion-fx-7-secondary-panel relative hidden min-h-0 min-w-0 flex-col gap-3 lg:flex ${isWorkspaceMotionVisible ? "is-visible" : ""} ${isRightPanelExiting ? "is-exiting" : ""}`}
            >
              <KolPanel
                activeSignal={activeSignal}
                headerAction={
                  <SidebarCollapseButton
                    copy={copy}
                    isCollapsed={isRightPanelCollapsed}
                    isDarkTheme={isDarkTheme}
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
                onSignalSelect={handleSignalSelect}
              />
            </div>
          ) : (
            <SidebarCollapseButton
              copy={copy}
              isCollapsed={isRightPanelCollapsed}
              isDarkTheme={isDarkTheme}
              variant="edge-tab"
              onToggle={toggleRightPanel}
            />
          )}
        </section>
      </div>
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
        onOpenChange={setIsMobileKolSheetOpen}
        onSignalSelect={handleSignalSelect}
      />
      <OnboardingGuide
        copy={copy.onboarding}
        isDarkTheme={isDarkTheme}
        isOpen={isOnboardingOpen}
        onComplete={() => setIsOnboardingOpen(false)}
      />
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
  onOpenChange,
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
  onOpenChange: (isOpen: boolean) => void;
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
    ? "motion-fx-9-surface w-full rounded-[22px] border border-white/[0.085] bg-[#181A20]/96 px-3.5 py-3 text-left text-slate-100 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl"
    : "motion-fx-9-surface w-full rounded-[22px] border border-[#D5E4EF] bg-white/96 px-3.5 py-3 text-left text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur-xl";
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
  copy,
  isDarkTheme,
  language,
  notification,
  onCommunityOpen,
  onGuideOpen,
  onLanguageToggle,
  onNotificationDismiss,
  onThemeToggle,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  notification: WorkspaceNotification | null;
  onCommunityOpen: () => void;
  onGuideOpen: () => void;
  onLanguageToggle: () => void;
  onNotificationDismiss: () => void;
  onThemeToggle: () => void;
}) {
  const headerClassName = isDarkTheme
    ? "relative z-50 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.075] bg-[#0B0E11]/95 px-5 backdrop-blur-xl"
    : "relative z-50 flex h-16 shrink-0 items-center justify-between border-b border-[#E5EAF0] bg-white/95 px-5 backdrop-blur-xl";
  const headerLinkClassName = isDarkTheme
    ? "motion-fx-1-nav-button px-2 py-2 text-sm font-semibold text-slate-400 transition-colors hover:text-[#69D4FF]"
    : "motion-fx-1-nav-button px-2 py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-[#008DCC]";

  return (
    <header className={headerClassName}>
      <div className="flex min-w-0 items-center gap-5">
        <BrandLogo copy={copy} isDarkTheme={isDarkTheme} language={language} />
        <nav
          aria-label={copy.workspace.navAria}
          className="hidden items-center gap-1 md:flex"
        >
          <button
            className={headerLinkClassName}
            type="button"
            onClick={onGuideOpen}
          >
            {copy.workspace.guide}
          </button>
          <button className={headerLinkClassName} type="button">
            {copy.workspace.copyTrading}
          </button>
          <button
            className={headerLinkClassName}
            type="button"
            onClick={onCommunityOpen}
          >
            {copy.workspace.community}
          </button>
        </nav>
      </div>
      <div className="relative flex items-center gap-2">
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
  variant = "header",
  onToggle,
}: {
  copy: WorkspaceCopy;
  isCollapsed: boolean;
  isDarkTheme: boolean;
  variant?: "header" | "edge-tab";
  onToggle: () => void;
}) {
  const label = isCollapsed ? copy.workspace.expandPanel : copy.workspace.collapse;
  const edgeLabel = copy.workspace.edgePanel;

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
          {copy.kol.title}
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
  ).slice(0, MAX_VISIBLE_KOL_SIGNALS);
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
