"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTradingFoxErrorMessage } from "@/lib/tradingfox-errors";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TelegramSessionUser } from "@/lib/auth/telegram-auth";
import type { TradingFoxStrategyDetail, TradingFoxStrategyDetailSection } from "@/lib/tradingfox-control-plane";
import type { KlineInterval } from "@/types/market";
import { TRADE_HISTORY_PAGE_SIZE } from "./constants";
import { EMPTY_TRADING_FOX_POSITIONS, createCopyPositionMarkPricesBySymbol, createOpenEndedPageRangeLabel, createSignalSourceIdentityById, createTradeHistoryRows, filterTradeHistoryRowsByStrategyStart, type StrategyDetailCurveWindow, type TradeHistoryRow } from "./strategy-detail-content";
import { StrategySettingsDialog } from "./strategy-settings-dialog";
import { StrategyNotificationSettingsDialog } from "./strategy-notification-settings-dialog";
import { StrategyPositionSyncDialog } from "./strategy-position-sync-dialog";
import { StrategyDetailSummaryCard } from "./strategy-detail-summary-card";
import { StrategyDetailLoadedSections } from "./strategy-detail-loaded-sections";
import { getAdjacentStrategyCurveWindows, getStrategyCurveQueryKey, mergeStrategyDetail, requestMarioStrategyDetailRefresh, requestStrategyDefinition, requestStrategyDetail, requestStrategyPositionSync, scheduleStrategyDetailTask } from "./strategy-detail-utils";
import { getStrategyPresentationModule } from "./strategy-presentation-registry";
import { getErrorPanelClassName, getModalSectionClassName } from "./styles";
import type { CopyTradingPrototypeTarget, PrototypeStrategy, PrototypeStrategySettingsUpdateInput, PrototypeStrategyStatus } from "./types";
const STRATEGY_DETAIL_CURVE_WINDOWS: readonly StrategyDetailCurveWindow[] = ["24h", "7d", "30d", "90d"];
const DEFAULT_STRATEGY_DETAIL_CURVE_WINDOW: StrategyDetailCurveWindow = "30d";
const STRATEGY_CURVE_QUERY_STALE_TIME_MS = 60_000;
const STRATEGY_CURVE_QUERY_GC_TIME_MS = 5 * 60_000;
const EMPTY_COPY_TRADING_TARGETS: readonly CopyTradingPrototypeTarget[] = [];
export function StrategyDetailView({
  copy,
  isDarkTheme,
  strategy,
  telegramUser,
  availableSignalSources = EMPTY_COPY_TRADING_TARGETS,
  onBack,
  onStrategyDelete,
  onStrategySettingsUpdate,
  onStrategyStatusChange,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  strategy: PrototypeStrategy;
  telegramUser: TelegramSessionUser | null;
  availableSignalSources?: readonly CopyTradingPrototypeTarget[];
  onBack: () => void;
  onStrategyDelete: (strategyId: string) => Promise<void> | void;
  onStrategySettingsUpdate: (input: PrototypeStrategySettingsUpdateInput) => Promise<void> | void;
  onStrategyStatusChange: (strategyId: string, status: PrototypeStrategyStatus) => Promise<void> | void;
}) {
  const [detail, setDetail] = useState<TradingFoxStrategyDetail | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [shouldLoadTradeHistory, setShouldLoadTradeHistory] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [isSyncingPositions, setIsSyncingPositions] = useState(false);
  const [isUpdatingLifecycle, setIsUpdatingLifecycle] = useState(false);
  const [isDeletingStrategy, setIsDeletingStrategy] = useState(false);
  const [tradeHistoryPageOffset, setTradeHistoryPageOffset] = useState(0);
  const [isTradeKlineOpen, setIsTradeKlineOpen] = useState(false);
  const [selectedTradeKlineRowId, setSelectedTradeKlineRowId] = useState<string | null>(null);
  const [tradeKlineInterval, setTradeKlineInterval] = useState<KlineInterval>("15m");
  const [activeCurveWindow, setActiveCurveWindow] = useState<StrategyDetailCurveWindow>(DEFAULT_STRATEGY_DETAIL_CURVE_WINDOW);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [isPositionSyncOpen, setIsPositionSyncOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const tradeHistorySectionRef = useRef<HTMLElement | null>(null);
  const strategyCopy = copy.workspace.accountCenter.strategy;
  const queryClient = useQueryClient();
  useEffect(() => {
    let isMounted = true;
    const loadSummary = async () => {
      setDetail(null);
      setIsLoading(true);
      setShouldLoadTradeHistory(false);
      setTradeHistoryPageOffset(0);
      setActiveCurveWindow(DEFAULT_STRATEGY_DETAIL_CURVE_WINDOW);
      setIsTradeKlineOpen(false);
      setSelectedTradeKlineRowId(null);
      setIsPositionSyncOpen(false);
      setError("");
      try {
        const nextDetail = await requestStrategyDetail(strategy.id, {
          sections: ["account"],
        });
        if (isMounted) {
          setDetail(nextDetail);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getTradingFoxErrorMessage(loadError, copy));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    void loadSummary();
    return () => {
      isMounted = false;
    };
  }, [copy, strategy.id]);

  const detailStrategyId = detail?.strategy.id ?? "";
  const strategyDefinitionId = detail?.trader.strategyDefinitionId || strategy.strategyDefinitionId || "";
  const liveStrategy = detail?.strategy ?? strategy;

  const {
    data: strategyDefinitionData,
    error: strategyDefinitionQueryError,
  } = useQuery({
    enabled: Boolean(strategyDefinitionId),
    queryFn: () => requestStrategyDefinition(strategyDefinitionId),
    queryKey: ["tradingfox", "strategy-definition", strategyDefinitionId],
    refetchOnMount: "always",
  });
  const strategyDefinition = strategyDefinitionData ?? null;
  const strategyPresentation = getStrategyPresentationModule({
    definition: strategyDefinition,
    definitionId: strategyDefinitionId,
    strategy: liveStrategy,
  }, "detail");
  const strategyType = strategyPresentation.strategyType;

  const {
    data: curveQueryData,
    error: curveQueryError,
    isFetching: isCurveFetching,
  } = useQuery({
    enabled: Boolean(detailStrategyId),
    gcTime: STRATEGY_CURVE_QUERY_GC_TIME_MS,
    placeholderData: (previousData) => previousData,
    queryFn: () => requestStrategyDetail(detailStrategyId, {
      curveWindow: activeCurveWindow,
      sections: ["curve"],
    }),
    queryKey: getStrategyCurveQueryKey(detailStrategyId, activeCurveWindow),
    staleTime: STRATEGY_CURVE_QUERY_STALE_TIME_MS,
  });

  useEffect(() => {
    if (!detailStrategyId) {
      return;
    }

    for (const window of getAdjacentStrategyCurveWindows(activeCurveWindow)) {
      void queryClient.prefetchQuery({
        gcTime: STRATEGY_CURVE_QUERY_GC_TIME_MS,
        queryFn: () => requestStrategyDetail(detailStrategyId, {
          curveWindow: window,
          sections: ["curve"],
        }),
        queryKey: getStrategyCurveQueryKey(detailStrategyId, window),
        staleTime: STRATEGY_CURVE_QUERY_STALE_TIME_MS,
      });
    }
  }, [activeCurveWindow, detailStrategyId, queryClient]);

  useEffect(() => {
    if (!detailStrategyId) {
      return;
    }

    let isMounted = true;
    const cancelIdleTask = scheduleStrategyDetailTask(() => {
      requestStrategyDetail(detailStrategyId, {
        sections: ["positions", "signalSources"],
      })
        .then((nextDetail) => {
          if (isMounted) {
            setDetail((currentDetail) => mergeStrategyDetail(currentDetail, nextDetail));
          }
        })
        .catch((loadError) => {
          if (isMounted) {
            setError(getTradingFoxErrorMessage(loadError, copy));
          }
        })
    });

    return () => {
      isMounted = false;
      cancelIdleTask();
    };
  }, [copy, detailStrategyId]);

  useEffect(() => {
    if (!detailStrategyId || shouldLoadTradeHistory) {
      return;
    }

    const sectionElement = tradeHistorySectionRef.current;
    if (!sectionElement || typeof IntersectionObserver === "undefined") {
      const timeoutId = window.setTimeout(() => setShouldLoadTradeHistory(true), 800);
      return () => window.clearTimeout(timeoutId);
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShouldLoadTradeHistory(true);
        observer.disconnect();
      }
    }, { rootMargin: "640px 0px" });
    observer.observe(sectionElement);

    return () => observer.disconnect();
  }, [detailStrategyId, shouldLoadTradeHistory]);

  useEffect(() => {
    if (!detailStrategyId || !strategyPresentation.detail.preloadTradeHistory) {
      return;
    }
    return scheduleStrategyDetailTask(() => setShouldLoadTradeHistory(true));
  }, [detailStrategyId, strategyPresentation.detail.preloadTradeHistory]);

  useEffect(() => {
    if (!detailStrategyId || !shouldLoadTradeHistory) {
      return;
    }

    let isMounted = true;
    const loadTradeHistory = async () => {
      try {
        const nextDetail = await requestStrategyDetail(detailStrategyId, {
          orderLimit: TRADE_HISTORY_PAGE_SIZE,
          orderOffset: tradeHistoryPageOffset,
          sections: ["orders", "signalSources"],
        });
        if (isMounted) {
          setDetail((currentDetail) => mergeStrategyDetail(currentDetail, nextDetail));
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getTradingFoxErrorMessage(loadError, copy));
        }
      }
    };

    void loadTradeHistory();

    return () => {
      isMounted = false;
    };
  }, [copy, detailStrategyId, shouldLoadTradeHistory, tradeHistoryPageOffset]);

  const loadedSections = detail?.loadedSections ?? [];
  const hasLoadedSection = (section: TradingFoxStrategyDetailSection) => loadedSections.includes(section);
  const orderItems = detail?.orderHistory?.items ?? [];
  const signalSourceOrderItems = detail?.orderHistory?.signalSourceOrders ?? [];
  const tradeLogItems = detail?.orderHistory?.tradeLogs ?? [];
  const signalSourceIdentityById = createSignalSourceIdentityById(
    hasLoadedSection("signalSources") ? detail?.signalSources ?? [] : [],
    liveStrategy,
    availableSignalSources,
  );
  const tradeHistoryOffset = detail?.orderHistory?.offset ?? tradeHistoryPageOffset;
  const allTradeHistoryRows = filterTradeHistoryRowsByStrategyStart(createTradeHistoryRows({
    orders: orderItems,
    signalSourceIdentityById,
    signalSourceOrders: signalSourceOrderItems,
    strategy: liveStrategy,
    tradeLogs: tradeLogItems,
  }), liveStrategy);
  const visibleTradeHistoryRows = hasLoadedSection("orders")
    ? allTradeHistoryRows.slice(tradeHistoryOffset, tradeHistoryOffset + TRADE_HISTORY_PAGE_SIZE)
    : [];
  const selectedTradeKlineRow = visibleTradeHistoryRows.find((row) => row.id === selectedTradeKlineRowId) ?? visibleTradeHistoryRows.find((row) => row.kind === "me") ?? visibleTradeHistoryRows[0] ?? null;
  const hasPreviousTradeHistoryPage = tradeHistoryOffset > 0;
  const hasNextTradeHistoryPage = hasLoadedSection("orders") && (allTradeHistoryRows.length > tradeHistoryOffset + TRADE_HISTORY_PAGE_SIZE || Boolean(detail?.orderHistory?.hasMore));
  const tradeHistoryRangeLabel = createOpenEndedPageRangeLabel(tradeHistoryOffset, visibleTradeHistoryRows.length);
  const detailPositions = detail?.positions ?? EMPTY_TRADING_FOX_POSITIONS;
  const copyPositionMarkPricesBySymbol = useMemo(
    () => createCopyPositionMarkPricesBySymbol(detailPositions),
    [detailPositions],
  );
  const shouldShowActionMessage = Boolean(detail && (syncMessage || syncError));
  const positionsSectionLoaded = hasLoadedSection("positions");
  const signalSourcesSectionLoaded = hasLoadedSection("signalSources");
  const ordersSectionLoaded = hasLoadedSection("orders");
  const curveDetail = curveQueryData ?? (hasLoadedSection("curve") ? detail : null);
  const curveErrorMessage = curveQueryError ? getTradingFoxErrorMessage(curveQueryError, copy) : curveDetail?.strategyCurveError;
  const positionsMetricValue = positionsSectionLoaded ? String(detail?.positions.length ?? 0) : "—";
  const signalSourcesMetricValue = signalSourcesSectionLoaded ? String(detail?.signalSources.length ?? 0) : "—";
  const traderOrdersMetricValue = ordersSectionLoaded ? String(orderItems.length) : "—";
  const shouldShowCopyTradingPositionSync = Boolean(detail && strategyType === "copyTrading" && liveStrategy.status === "running");
  const strategyDefinitionError = strategyDefinitionQueryError
    ? getTradingFoxErrorMessage(strategyDefinitionQueryError, copy)
    : "";

  const openTradeKline = (row: TradeHistoryRow) => {
    setSelectedTradeKlineRowId(row.id);
    setIsTradeKlineOpen(true);
  };

  const toggleTradeKline = () => {
    if (!selectedTradeKlineRow) {
      return;
    }

    setSelectedTradeKlineRowId(selectedTradeKlineRow.id);
    setIsTradeKlineOpen((currentValue) => !currentValue);
  };

  const showPreviousTradeHistoryPage = () => {
    setTradeHistoryPageOffset((currentOffset) => Math.max(0, currentOffset - TRADE_HISTORY_PAGE_SIZE));
  };

  const showNextTradeHistoryPage = () => {
    setTradeHistoryPageOffset((currentOffset) => currentOffset + TRADE_HISTORY_PAGE_SIZE);
  };

  const updateLifecycle = async (status: PrototypeStrategyStatus) => {
    setIsUpdatingLifecycle(true);
    setSyncError("");
    try {
      await onStrategyStatusChange(liveStrategy.id, status);
      setDetail(await requestStrategyDetail(liveStrategy.id, {
        orderLimit: TRADE_HISTORY_PAGE_SIZE,
        orderOffset: tradeHistoryPageOffset,
      }));
    } catch (lifecycleError) {
      setSyncError(getTradingFoxErrorMessage(lifecycleError, copy));
    } finally {
      setIsUpdatingLifecycle(false);
    }
  };

  const deleteStrategy = async () => {
    setIsDeletingStrategy(true);
    setSyncError("");
    try {
      await onStrategyDelete(liveStrategy.id);
      onBack();
    } catch (deleteError) {
      setSyncError(getTradingFoxErrorMessage(deleteError, copy));
    } finally {
      setIsDeletingStrategy(false);
    }
  };

  const updateSettings = async (input: PrototypeStrategySettingsUpdateInput) => {
    setSyncError("");
    setSyncMessage("");
    await onStrategySettingsUpdate(input);
    try {
      setDetail(await requestStrategyDetail(liveStrategy.id, {
        orderLimit: TRADE_HISTORY_PAGE_SIZE,
        orderOffset: tradeHistoryPageOffset,
      }));
    } catch (refreshError) {
      setSyncError(getTradingFoxErrorMessage(refreshError, copy));
    }
    setSyncMessage(strategyCopy.settingsSaved);
  };

  const refreshMarioStrategyDetail = async () => {
    setTradeHistoryPageOffset(0);
    const nextDetail = await requestMarioStrategyDetailRefresh(liveStrategy.id);
    setDetail((currentDetail) => mergeStrategyDetail(currentDetail, nextDetail));
  };

  const completeStrategyAction = async (nextDetail?: TradingFoxStrategyDetail) => {
    if (nextDetail) {
      setDetail((currentDetail) => mergeStrategyDetail(currentDetail, nextDetail));
      return;
    }
    const refreshedDetail = await requestStrategyDetail(liveStrategy.id, {
      orderLimit: TRADE_HISTORY_PAGE_SIZE,
      orderOffset: tradeHistoryPageOffset,
    });
    setDetail((currentDetail) => mergeStrategyDetail(currentDetail, refreshedDetail));
  };

  const syncCopyTradingPositions = async (ratioPercent: number) => {
    if (!detail || !shouldShowCopyTradingPositionSync) {
      return;
    }
    setIsSyncingPositions(true);
    setSyncError("");
    setSyncMessage("");
    try {
      setTradeHistoryPageOffset(0);
      setDetail(await requestStrategyPositionSync(liveStrategy.id, ratioPercent));
      setIsPositionSyncOpen(false);
      setSyncMessage(strategyCopy.syncPositionsSuccess);
    } catch (syncPositionsError) {
      setSyncError(getTradingFoxErrorMessage(syncPositionsError, copy));
    } finally {
      setIsSyncingPositions(false);
    }
  };

  return (
    <section className="space-y-4">
      <StrategyDetailSummaryCard
        availableSignalSources={availableSignalSources}
        copy={copy}
        detail={detail}
        isDarkTheme={isDarkTheme}
        isDeletingStrategy={isDeletingStrategy}
        isSyncingPositions={isSyncingPositions}
        isUpdatingLifecycle={isUpdatingLifecycle}
        liveStrategy={liveStrategy}
        positionsMetricValue={positionsMetricValue}
        signalSourcesMetricValue={signalSourcesMetricValue}
        shouldShowActionMessage={shouldShowActionMessage}
        strategyCopy={strategyCopy}
        syncError={syncError}
        syncMessage={syncMessage}
        traderOrdersMetricValue={traderOrdersMetricValue}
        shouldShowCopyTradingPositionSync={shouldShowCopyTradingPositionSync}
        onBack={onBack}
        onDelete={() => void deleteStrategy()}
        onEdit={() => setIsSettingsOpen(true)}
        onNotificationOpen={() => setIsNotificationSettingsOpen(true)}
        onSyncCopyTradingPositions={() => {
          setSyncError("");
          setSyncMessage("");
          setIsPositionSyncOpen(true);
        }}
        onUpdateLifecycle={(status) => void updateLifecycle(status)}
      />

      {isLoading ? (
        <div className={getModalSectionClassName(isDarkTheme)}>{strategyCopy.loadingDetail}</div>
      ) : error ? (
        <div className={getErrorPanelClassName(isDarkTheme)}>{error}</div>
      ) : detail ? (
        <StrategyDetailLoadedSections
          activeCurveWindow={activeCurveWindow}
          allTradeHistoryRows={allTradeHistoryRows}
          canGoNext={hasNextTradeHistoryPage}
          canGoPrevious={hasPreviousTradeHistoryPage}
          copy={copy}
          copyPositionMarkPricesBySymbol={copyPositionMarkPricesBySymbol}
          curve={curveDetail?.strategyCurve ?? null}
          curveError={curveErrorMessage}
          curveWindows={STRATEGY_DETAIL_CURVE_WINDOWS}
          detail={detail}
          interval={tradeKlineInterval}
          isCurveLoading={isCurveFetching}
          isDarkTheme={isDarkTheme}
          isKlineOpen={isTradeKlineOpen}
          ordersSectionLoaded={ordersSectionLoaded}
          positionsSectionLoaded={positionsSectionLoaded}
          rangeLabel={tradeHistoryRangeLabel}
          rows={visibleTradeHistoryRows}
          sectionRef={tradeHistorySectionRef}
          selectedRow={selectedTradeKlineRow}
          signalSourceIdentityById={signalSourceIdentityById}
          signalSourcesSectionLoaded={signalSourcesSectionLoaded}
          strategy={liveStrategy}
          strategyCopy={strategyCopy}
          strategyDefinition={strategyDefinition}
          strategyDefinitionError={strategyDefinitionError}
          strategyPresentation={strategyPresentation}
          telegramUser={telegramUser}
          onActionCompleted={completeStrategyAction}
          onIntervalChange={setTradeKlineInterval}
          onMarioRefresh={refreshMarioStrategyDetail}
          onNextPage={showNextTradeHistoryPage}
          onPreviousPage={showPreviousTradeHistoryPage}
          onRowKlineOpen={openTradeKline}
          onToggleKline={toggleTradeKline}
          onWindowChange={setActiveCurveWindow}
        />
      ) : null}
      {isPositionSyncOpen ? (
        <StrategyPositionSyncDialog
          copy={copy}
          error={syncError}
          isDarkTheme={isDarkTheme}
          isSubmitting={isSyncingPositions}
          onClose={() => setIsPositionSyncOpen(false)}
          onConfirm={syncCopyTradingPositions}
        />
      ) : null}
      {isNotificationSettingsOpen ? (
        <StrategyNotificationSettingsDialog
          copy={copy}
          isDarkTheme={isDarkTheme}
          onClose={() => setIsNotificationSettingsOpen(false)}
        />
      ) : null}
      {isSettingsOpen ? (
        <StrategySettingsDialog
          key={`${liveStrategy.id}:${detail?.trader.configRevision ?? "loading"}`}
          availableSignalSources={availableSignalSources}
          copy={copy}
          detail={detail}
          isDarkTheme={isDarkTheme}
          signalSourceIdentityById={signalSourceIdentityById}
          strategy={liveStrategy}
          strategyDefinition={strategyDefinition}
          strategyDefinitionError={strategyDefinitionError}
          onClose={() => setIsSettingsOpen(false)}
          onSave={updateSettings}
        />
      ) : null}
    </section>
  );
}
