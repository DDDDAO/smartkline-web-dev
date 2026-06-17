"use client";

import { useEffect, useMemo, useState } from "react";
import { getTradingFoxErrorMessage } from "@/app/_lib/tradingfox-errors";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { TelegramSessionUser } from "@/app/_lib/auth/telegram-auth";
import type { TradingFoxStrategyDetail } from "@/app/_lib/tradingfox-control-plane";
import type { KlineInterval } from "@/app/_types/market";
import { SourceAvatar } from "../card-ui";
import {
  STRATEGY_NOTIFICATION_EVENTS,
  TRADE_HISTORY_PAGE_SIZE,
} from "./constants";
import { formatDetailCurrency } from "./formatters";
import { BellGlyph, PlusGlyph, SaveGlyph } from "./icons";
import {
  CopyPositionTable,
  EMPTY_TRADING_FOX_POSITIONS,
  PositionSummaryPanel,
  RowsPaginationControls,
  SignalSourcePositionTable,
  StrategyPerformanceCurvePanel,
  TradeHistoryKlinePanel,
  TradeHistoryTable,
  createCopyPositionMarkPricesBySymbol,
  createCopyPositionSummary,
  createOpenEndedPageRangeLabel,
  createSignalSourceIdentityById,
  createSignalSourcePositionSummary,
  createTradeHistoryRows,
  filterTradeHistoryRowsByStrategyStart,
  type TradeHistoryRow,
} from "./strategy-detail-content";
import { MiniMetric } from "./mini-metric";
import { getStrategyStatusLabel } from "./strategy-helpers";
import {
  getDangerButtonClassName,
  getErrorPanelClassName,
  getIconButtonClassName,
  getInlineErrorClassName,
  getModalSectionClassName,
  getNotificationConfigureButtonClassName,
  getNotificationModalIconClassName,
  getNotificationSaveButtonClassName,
  getNotificationUnavailableBadgeClassName,
  getPrimaryButtonClassName,
  getSoftButtonClassName,
  getStrategyStatusClassName,
} from "./styles";
import type { PrototypeStrategy, PrototypeStrategyStatus } from "./types";

export function StrategyDetailView({
  copy,
  isDarkTheme,
  strategy,
  telegramUser,
  onBack,
  onStrategyDelete,
  onStrategyStatusChange,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  strategy: PrototypeStrategy;
  telegramUser: TelegramSessionUser | null;
  onBack: () => void;
  onStrategyDelete: (strategyId: string) => Promise<void> | void;
  onStrategyStatusChange: (strategyId: string, status: PrototypeStrategyStatus) => Promise<void> | void;
}) {
  const [detail, setDetail] = useState<TradingFoxStrategyDetail | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [syncRatioPercent, setSyncRatioPercent] = useState("100");
  const [syncError, setSyncError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [isSyncingPositions, setIsSyncingPositions] = useState(false);
  const [isUpdatingLifecycle, setIsUpdatingLifecycle] = useState(false);
  const [isDeletingStrategy, setIsDeletingStrategy] = useState(false);
  const [tradeHistoryPageOffset, setTradeHistoryPageOffset] = useState(0);
  const [isTradeKlineOpen, setIsTradeKlineOpen] = useState(false);
  const [selectedTradeKlineRowId, setSelectedTradeKlineRowId] = useState<string | null>(null);
  const [tradeKlineInterval, setTradeKlineInterval] = useState<KlineInterval>("15m");
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const strategyCopy = copy.workspace.accountCenter.strategy;

  useEffect(() => {
    let isMounted = true;

    const loadDetail = async () => {
      setIsLoading(true);
      setError("");
      try {
        const nextDetail = await requestStrategyDetail(strategy.id, {
          orderLimit: TRADE_HISTORY_PAGE_SIZE,
          orderOffset: tradeHistoryPageOffset,
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

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [copy, strategy.id, tradeHistoryPageOffset]);

  const liveStrategy = detail?.strategy ?? strategy;
  const isStrategyRunning = liveStrategy.status === "running";
  const parsedSyncRatioPercent = Number(syncRatioPercent);
  const canSyncPositions = Boolean(detail) && isStrategyRunning && Number.isFinite(parsedSyncRatioPercent) && parsedSyncRatioPercent > 0 && !isSyncingPositions;
  const orderItems = detail?.orderHistory?.items ?? [];
  const signalSourceOrderItems = detail?.orderHistory?.signalSourceOrders ?? [];
  const tradeLogItems = detail?.orderHistory?.tradeLogs ?? [];
  const signalSourceIdentityById = createSignalSourceIdentityById(detail?.signalSources ?? [], liveStrategy);
  const tradeHistoryOffset = detail?.orderHistory?.offset ?? tradeHistoryPageOffset;
  const allTradeHistoryRows = filterTradeHistoryRowsByStrategyStart(createTradeHistoryRows({
    orders: orderItems,
    signalSourceIdentityById,
    signalSourceOrders: signalSourceOrderItems,
    strategy: liveStrategy,
    tradeLogs: tradeLogItems,
  }), liveStrategy);
  const visibleTradeHistoryRows = allTradeHistoryRows.slice(tradeHistoryOffset, tradeHistoryOffset + TRADE_HISTORY_PAGE_SIZE);
  const selectedTradeKlineRow = visibleTradeHistoryRows.find((row) => row.id === selectedTradeKlineRowId) ?? visibleTradeHistoryRows.find((row) => row.kind === "me") ?? visibleTradeHistoryRows[0] ?? null;
  const hasPreviousTradeHistoryPage = tradeHistoryOffset > 0;
  const hasNextTradeHistoryPage = allTradeHistoryRows.length > tradeHistoryOffset + TRADE_HISTORY_PAGE_SIZE || Boolean(detail?.orderHistory?.hasMore);
  const shouldShowTradeHistoryPagination = hasPreviousTradeHistoryPage || hasNextTradeHistoryPage;
  const tradeHistoryRangeLabel = createOpenEndedPageRangeLabel(tradeHistoryOffset, visibleTradeHistoryRows.length);
  const detailPositions = detail?.positions ?? EMPTY_TRADING_FOX_POSITIONS;
  const copyPositionMarkPricesBySymbol = useMemo(
    () => createCopyPositionMarkPricesBySymbol(detailPositions),
    [detailPositions],
  );
  const shouldShowActionMessage = Boolean(detail && (syncMessage || syncError || liveStrategy.status === "paused" || liveStrategy.status === "stopped"));

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

  const syncPositions = async () => {
    if (!canSyncPositions) {
      return;
    }

    setIsSyncingPositions(true);
    setSyncError("");
    setSyncMessage("");
    try {
      const nextDetail = await requestStrategyPositionSync(liveStrategy.id, parsedSyncRatioPercent);
      setDetail(nextDetail);
      setTradeHistoryPageOffset(0);
      setSyncMessage(strategyCopy.syncPositionsSuccess);
    } catch (syncPositionsError) {
      setSyncError(getTradingFoxErrorMessage(syncPositionsError, copy));
    } finally {
      setIsSyncingPositions(false);
    }
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

  return (
    <section className="space-y-4">
      <div className={getModalSectionClassName(isDarkTheme)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={onBack}>← {strategyCopy.back}</button>
          <button className={getNotificationConfigureButtonClassName(isDarkTheme)} type="button" onClick={() => setIsNotificationSettingsOpen(true)}>
            <BellGlyph />
            {strategyCopy.configureNotifications}
          </button>
        </div>
        <div className="mt-4 flex min-w-0 items-start gap-3">
          <SourceAvatar isDarkTheme={isDarkTheme} name={liveStrategy.traderName} url={liveStrategy.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-black">{liveStrategy.traderName}</h3>
              <span className={getStrategyStatusClassName(isDarkTheme, liveStrategy.status)}>{getStrategyStatusLabel(strategyCopy, liveStrategy.status)}</span>
            </div>
            <p className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-500"}>
              #{liveStrategy.id} · {liveStrategy.platform} · {liveStrategy.apiAccountName}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs lg:grid-cols-4">
          <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.accountEquity} value={formatDetailCurrency(detail?.account?.equity)} />
          <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.positionCount} value={String(detail?.positions.length ?? liveStrategy.positionsCount)} />
          <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.signalSourceCount} value={String(detail?.signalSources.length ?? 0)} />
          <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.traderOrders} value={String(orderItems.length)} />
        </div>
        {detail?.trader.statusMessage ? (
          <p className={isDarkTheme ? "mt-3 whitespace-pre-line break-words text-xs leading-5 text-amber-200" : "mt-3 whitespace-pre-line break-words text-xs leading-5 text-amber-700"}>
            {getTradingFoxErrorMessage(detail.trader.statusMessage, copy)}
          </p>
        ) : null}
        {shouldShowActionMessage ? (
          <div className="mt-3">
            {syncMessage ? <p className={isDarkTheme ? "text-xs text-emerald-200" : "text-xs text-emerald-700"}>{syncMessage}</p> : null}
            {syncError ? <p className={getInlineErrorClassName(isDarkTheme)}>{syncError}</p> : null}
            {detail && (liveStrategy.status === "paused" || liveStrategy.status === "stopped") ? <p className={isDarkTheme ? "text-xs text-amber-200" : "text-xs text-amber-700"}>{strategyCopy.syncPositionsDisabled}</p> : null}
          </div>
        ) : null}
        <div className={isDarkTheme ? "mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-white/[0.075] pt-4 lg:flex-nowrap" : "mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[#E5EAF0] pt-4 lg:flex-nowrap"}>
          {liveStrategy.status === "running" ? (
            <button className={getSoftButtonClassName(isDarkTheme)} disabled={isUpdatingLifecycle} type="button" onClick={() => void updateLifecycle("paused")}>{isUpdatingLifecycle ? strategyCopy.updating : strategyCopy.pause}</button>
          ) : (
            <button className={getPrimaryButtonClassName(isDarkTheme)} disabled={isUpdatingLifecycle} type="button" onClick={() => void updateLifecycle("running")}>{isUpdatingLifecycle ? strategyCopy.updating : strategyCopy.resume}</button>
          )}
          <button className={getDangerButtonClassName(isDarkTheme)} disabled={isDeletingStrategy} type="button" onClick={() => void deleteStrategy()}>{isDeletingStrategy ? strategyCopy.deleting : strategyCopy.delete}</button>
          <div className={isDarkTheme ? "flex shrink-0 items-center gap-2 rounded-2xl border border-white/[0.075] bg-white/[0.03] p-2" : "flex shrink-0 items-center gap-2 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-2"}>
            <span className={isDarkTheme ? "px-1 text-xs font-black text-slate-400" : "px-1 text-xs font-black text-slate-500"}>{strategyCopy.ratioPercent}</span>
            <div className="relative w-24">
              <input
                className={isDarkTheme ? "h-9 w-full rounded-xl border border-white/[0.075] bg-white/[0.035] px-3 pr-7 text-sm font-black text-slate-100 outline-none transition focus:border-sky-400/45 disabled:cursor-not-allowed disabled:opacity-55" : "h-9 w-full rounded-xl border border-[#D5E4EF] bg-white px-3 pr-7 text-sm font-black text-slate-950 outline-none transition focus:border-[#7DBEFF] disabled:cursor-not-allowed disabled:opacity-55"}
                disabled={!detail || Boolean(error)}
                inputMode="decimal"
                placeholder={strategyCopy.ratioPlaceholder}
                value={syncRatioPercent}
                onChange={(event) => setSyncRatioPercent(event.target.value)}
              />
              <span className={isDarkTheme ? "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500" : "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400"}>%</span>
            </div>
          </div>
          <button className={getPrimaryButtonClassName(isDarkTheme)} disabled={!canSyncPositions} type="button" onClick={syncPositions}>
            {isSyncingPositions ? strategyCopy.syncingPositions : strategyCopy.syncPositions}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={getModalSectionClassName(isDarkTheme)}>{strategyCopy.loadingDetail}</div>
      ) : error ? (
        <div className={getErrorPanelClassName(isDarkTheme)}>{error}</div>
      ) : detail ? (
        <>
          <StrategyPerformanceCurvePanel
            curve={detail.strategyCurve}
            curveError={detail.strategyCurveError}
            isDarkTheme={isDarkTheme}
            strategyCopy={strategyCopy}
          />

          <section className={getModalSectionClassName(isDarkTheme)}>
            <h3 className="text-sm font-black">{strategyCopy.copyPositions}</h3>
            {detail.positionsError ? <p className={getInlineErrorClassName(isDarkTheme)}>{getTradingFoxErrorMessage(detail.positionsError, copy)}</p> : null}
            {detail.positions.length > 0 ? (
              <>
                <PositionSummaryPanel
                  isDarkTheme={isDarkTheme}
                  strategyCopy={strategyCopy}
                  summary={createCopyPositionSummary(detail)}
                />
                <CopyPositionTable isDarkTheme={isDarkTheme} positions={detail.positions} strategyCopy={strategyCopy} />
              </>
            ) : <div className={isDarkTheme ? "mt-3 text-sm text-slate-500" : "mt-3 text-sm text-slate-500"}>{strategyCopy.copyPositionsEmpty}</div>}
          </section>

          <section className={getModalSectionClassName(isDarkTheme)}>
            <h3 className="text-sm font-black">{strategyCopy.signalSourcePositions}</h3>
            {detail.signalSourcesError ? <p className={getInlineErrorClassName(isDarkTheme)}>{getTradingFoxErrorMessage(detail.signalSourcesError, copy)}</p> : null}
            <div className="mt-3 grid gap-2">
              {detail.signalSources.length > 0 ? detail.signalSources.map((source) => (
                <div key={source.signalSourceId} className={isDarkTheme ? "rounded-2xl bg-white/[0.035] p-3" : "rounded-2xl bg-[#F8FAFC] p-3"}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-black">{source.name || source.signalSourceId}</div>
                    <div className={isDarkTheme ? "text-xs font-bold text-slate-500" : "text-xs font-bold text-slate-500"}>{strategyCopy.followSide}: {source.followSide || "both"}</div>
                  </div>
                  <PositionSummaryPanel
                    isDarkTheme={isDarkTheme}
                    strategyCopy={strategyCopy}
                    summary={createSignalSourcePositionSummary(source, copyPositionMarkPricesBySymbol)}
                  />
                  {source.positions.length > 0 ? (
                    <SignalSourcePositionTable
                      copyPositionMarkPricesBySymbol={copyPositionMarkPricesBySymbol}
                      isDarkTheme={isDarkTheme}
                      positions={source.positions}
                      strategyCopy={strategyCopy}
                    />
                  ) : <div className={isDarkTheme ? "mt-3 text-xs text-slate-500" : "mt-3 text-xs text-slate-500"}>{strategyCopy.signalSourcePositionsEmpty}</div>}
                </div>
              )) : <div className={isDarkTheme ? "text-sm text-slate-500" : "text-sm text-slate-500"}>{strategyCopy.signalSourcePositionsEmpty}</div>}
            </div>
          </section>

          <section className={getModalSectionClassName(isDarkTheme)}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black">{strategyCopy.tradeHistory}</h3>
                <div className={isDarkTheme ? "mt-1 text-[11px] font-bold text-slate-500" : "mt-1 text-[11px] font-bold text-slate-400"}>
                  {tradeHistoryRangeLabel}
                </div>
              </div>
              <button
                className={getSoftButtonClassName(isDarkTheme)}
                disabled={!selectedTradeKlineRow}
                type="button"
                onClick={toggleTradeKline}
              >
                {isTradeKlineOpen ? strategyCopy.hideKline : strategyCopy.viewKline}
              </button>
            </div>
            {detail.orderHistoryError ? <p className={getInlineErrorClassName(isDarkTheme)}>{getTradingFoxErrorMessage(detail.orderHistoryError, copy)}</p> : null}
            {isTradeKlineOpen && selectedTradeKlineRow ? (
              <TradeHistoryKlinePanel
                copy={copy}
                interval={tradeKlineInterval}
                isDarkTheme={isDarkTheme}
                row={selectedTradeKlineRow}
                rows={allTradeHistoryRows}
                strategy={liveStrategy}
                telegramUser={telegramUser}
                onIntervalChange={setTradeKlineInterval}
              />
            ) : null}
            {visibleTradeHistoryRows.length > 0 ? (
              <>
                <TradeHistoryTable
                  activeKlineRowId={selectedTradeKlineRow?.id ?? null}
                  copy={copy}
                  isDarkTheme={isDarkTheme}
                  rows={visibleTradeHistoryRows}
                  strategyCopy={strategyCopy}
                  telegramUser={telegramUser}
                  onRowKlineOpen={openTradeKline}
                />
                {shouldShowTradeHistoryPagination ? (
                  <div className="mt-3">
                    <RowsPaginationControls
                      canGoNext={hasNextTradeHistoryPage}
                      canGoPrevious={hasPreviousTradeHistoryPage}
                      isDarkTheme={isDarkTheme}
                      nextLabel={strategyCopy.nextTradeHistoryPage}
                      previousLabel={strategyCopy.previousTradeHistoryPage}
                      rangeLabel={tradeHistoryRangeLabel}
                      onNext={showNextTradeHistoryPage}
                      onPrevious={showPreviousTradeHistoryPage}
                    />
                  </div>
                ) : null}
              </>
            ) : <div className={isDarkTheme ? "mt-3 text-sm text-slate-500" : "mt-3 text-sm text-slate-500"}>{strategyCopy.noTradeHistory}</div>}
          </section>

        </>
      ) : null}
      {isNotificationSettingsOpen ? (
        <StrategyNotificationSettingsDialog
          copy={copy}
          isDarkTheme={isDarkTheme}
          onClose={() => setIsNotificationSettingsOpen(false)}
        />
      ) : null}
    </section>
  );
}

function StrategyNotificationSettingsDialog({
  copy,
  isDarkTheme,
  onClose,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onClose: () => void;
}) {
  const notificationCopy = copy.workspace.accountCenter.notifications;
  const strategyCopy = copy.workspace.accountCenter.strategy;
  const emptyPanelClassName = isDarkTheme
    ? "rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.02] px-4 py-5 text-sm font-bold text-slate-500"
    : "rounded-2xl border border-dashed border-[#E5EAF0] bg-[#FAFBFD] px-4 py-5 text-sm font-bold text-slate-500";
  const eventCardClassName = isDarkTheme
    ? "flex min-h-[72px] items-start gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.025] p-3 opacity-70"
    : "flex min-h-[72px] items-start gap-3 rounded-2xl border border-[#E5EAF0] bg-[#FAFBFD] p-3 opacity-75";
  const checkboxClassName = isDarkTheme
    ? "mt-0.5 h-4 w-4 shrink-0 rounded border border-white/[0.12] bg-white/[0.02]"
    : "mt-0.5 h-4 w-4 shrink-0 rounded border border-[#D5E4EF] bg-white";

  return (
    <>
      <button
        aria-label={copy.common.close}
        className={isDarkTheme ? "fixed inset-0 z-[125] bg-black/58 backdrop-blur-[5px]" : "fixed inset-0 z-[125] bg-slate-950/28 backdrop-blur-[5px]"}
        type="button"
        onClick={onClose}
      />
      <section
        aria-label={strategyCopy.notificationSettingsTitle}
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-[130] h-[92dvh] overflow-hidden rounded-t-[30px] shadow-[0_-26px_88px_rgba(15,23,42,0.26)] sm:inset-x-3 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:h-[min(820px,calc(100dvh-1rem))] sm:max-w-[980px] sm:-translate-y-1/2 sm:rounded-[30px] sm:shadow-[0_30px_90px_rgba(15,23,42,0.26)]"
        role="dialog"
      >
        <div className={isDarkTheme ? "flex h-full flex-col border border-white/[0.085] bg-[#111820] text-slate-100" : "flex h-full flex-col border border-[#D5E4EF] bg-white text-slate-950"}>
          <header className={isDarkTheme ? "border-b border-white/[0.075] px-4 py-4 sm:px-5 sm:py-5" : "border-b border-[#E5EAF0] px-4 py-4 sm:px-5 sm:py-5"}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className={getNotificationModalIconClassName(isDarkTheme)}>
                  <BellGlyph />
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black tracking-tight">{strategyCopy.notificationSettingsTitle}</h2>
                    <span className={getNotificationUnavailableBadgeClassName(isDarkTheme)}>
                      {notificationCopy.unavailable}
                    </span>
                  </div>
                  <p className={isDarkTheme ? "mt-2 max-w-3xl text-sm leading-6 text-slate-400" : "mt-2 max-w-3xl text-sm leading-6 text-slate-600"}>
                    {strategyCopy.notificationSettingsDescription}
                  </p>
                </div>
              </div>
              <button aria-label={copy.common.close} className={getIconButtonClassName(isDarkTheme)} type="button" onClick={onClose}>
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </button>
            </div>
          </header>

          <div className="kol-scroll-area min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            <section className={getModalSectionClassName(isDarkTheme)}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black">{strategyCopy.notificationEnableTitle}</h3>
                  <p className={isDarkTheme ? "mt-1 text-sm leading-6 text-slate-400" : "mt-1 text-sm leading-6 text-slate-600"}>
                    {strategyCopy.notificationEnableDescription}
                  </p>
                </div>
                <span className={isDarkTheme ? "relative h-7 w-12 shrink-0 rounded-full bg-white/[0.08] opacity-60" : "relative h-7 w-12 shrink-0 rounded-full bg-slate-200 opacity-70"} aria-hidden="true">
                  <span className={isDarkTheme ? "absolute left-1 top-1 h-5 w-5 rounded-full bg-slate-600" : "absolute left-1 top-1 h-5 w-5 rounded-full bg-white"} />
                </span>
              </div>
            </section>

            <section className={getModalSectionClassName(isDarkTheme)}>
              <h3 className="text-base font-black">{strategyCopy.notificationChannelsTitle}</h3>
              <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                {strategyCopy.notificationChannelsDescription}
              </p>
              <div className={`${emptyPanelClassName} mt-4`}>
                {strategyCopy.notificationChannelsEmpty}
              </div>
            </section>

            <section className={getModalSectionClassName(isDarkTheme)}>
              <h3 className="text-base font-black">{strategyCopy.notificationEventsTitle}</h3>
              <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                {strategyCopy.notificationEventsDescription}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {STRATEGY_NOTIFICATION_EVENTS.map((event) => {
                  const eventCopy = strategyCopy.notificationEvents[event.key];

                  return (
                    <div key={event.key} className={eventCardClassName}>
                      <span className={checkboxClassName} aria-hidden="true" />
                      <div className="min-w-0">
                        <div className={isDarkTheme ? "text-sm font-black text-slate-300" : "text-sm font-black text-slate-700"}>
                          {eventCopy}
                        </div>
                        <div className={isDarkTheme ? "mt-2 break-all text-xs font-semibold text-slate-500" : "mt-2 break-all text-xs font-semibold text-slate-400"}>
                          {event.code}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={getModalSectionClassName(isDarkTheme)}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black">{strategyCopy.notificationThresholdTitle}</h3>
                  <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                    {strategyCopy.notificationThresholdDescription}
                  </p>
                </div>
                <button className={getSoftButtonClassName(isDarkTheme)} disabled type="button">
                  <PlusGlyph />
                  {strategyCopy.notificationAddThreshold}
                </button>
              </div>
              <div className={`${emptyPanelClassName} mt-4`}>
                {strategyCopy.notificationThresholdEmpty}
              </div>
            </section>
          </div>

          <footer className={isDarkTheme ? "flex flex-col gap-3 border-t border-white/[0.075] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-5" : "flex flex-col gap-3 border-t border-[#E5EAF0] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-5"}>
            <p className={isDarkTheme ? "text-sm leading-6 text-slate-500" : "text-sm leading-6 text-slate-500"}>
              {strategyCopy.notificationFooterHint}
            </p>
            <button className={getNotificationSaveButtonClassName(isDarkTheme)} disabled type="button">
              <SaveGlyph />
              {strategyCopy.notificationSaveSettings}
            </button>
          </footer>
        </div>
      </section>
    </>
  );
}

async function requestStrategyDetail(
  strategyId: string,
  options: { orderLimit?: number; orderOffset?: number } = {},
): Promise<TradingFoxStrategyDetail> {
  const query = new URLSearchParams();
  if (options.orderLimit !== undefined) {
    query.set("orderLimit", String(options.orderLimit));
  }
  if (options.orderOffset !== undefined) {
    query.set("orderOffset", String(options.orderOffset));
  }
  const queryString = query.toString();
  const response = await fetch(`/api/tradingfox/copy-strategies/${encodeURIComponent(strategyId)}${queryString ? `?${queryString}` : ""}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await response.json() as TradingFoxStrategyDetail | { error?: string };
  if (!response.ok) {
    throw new Error("error" in payload && payload.error ? payload.error : `Strategy detail failed with status ${response.status}.`);
  }
  return payload as TradingFoxStrategyDetail;
}

async function requestStrategyPositionSync(strategyId: string, ratioPercent: number): Promise<TradingFoxStrategyDetail> {
  const response = await fetch(`/api/tradingfox/copy-strategies/${encodeURIComponent(strategyId)}/sync-positions`, {
    body: JSON.stringify({ ratioPercent }),
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = await response.json() as TradingFoxStrategyDetail | { error?: string };
  if (!response.ok) {
    throw new Error("error" in payload && payload.error ? payload.error : `Position sync failed with status ${response.status}.`);
  }
  return payload as TradingFoxStrategyDetail;
}
