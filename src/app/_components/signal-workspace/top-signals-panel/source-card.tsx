import { useLayoutEffect, useRef, useState } from "react";

import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { CopyTradingPosition } from "@/app/_types/copy-trading";
import { SignalField } from "../card-ui";
import type {
  PnlColorMode,
  TopSignalPerformanceWindow,
  TopSignalSourceModel,
} from "./helpers";
import {
  calculateAggregatePnlRatio,
  calculateTotalLeverage,
  formatAssetAmount,
  formatCurrency,
  formatDecimal,
  formatInteger,
  formatLeverage,
  formatPercent,
  formatPnlWithRatio,
  formatSignedAssetAmount,
  formatSignedCurrency,
  formatSignedPercent,
  getNeutralBadgeClassName,
  getPnlFieldClassName,
  getTopSignalCardBackClassName,
  getTopSignalCardClassName,
  sumPositionMarginValue,
  sumPositionNotionalValue,
  sumPositionUnrealizedPnlAmount,
} from "./helpers";
import {
  COMPACT_POSITION_ROWS_PER_SOURCE_CARD,
  EXPANDED_POSITION_ROWS_PER_PAGE,
} from "./constants";
import {
  createPageRangeLabel,
  getSafePageOffset,
  getTopSignalCardHeightStyle,
} from "./utils";
import { TopSignalPerformanceCurveCard } from "./performance-card";
import {
  PositionRow,
  RowsPaginationControls,
  SourceHeader,
  TopSignalCopyTradingAction,
} from "./source-card-subcomponents";

export function TopSignalSourceCard({
  cardRef,
  copy,
  expandPositionList,
  isActive,
  isDarkTheme,
  isFlipped,
  isPerformanceLoading,
  isWatchlisted,
  model,
  performanceWindow,
  pnlColorMode,
  positionPageOffset,
  onCardSelect,
  onCopyTradingRequest,
  onFlipToggle,
  onNextPositionPage,
  onPositionSelect,
  onPreviousPositionPage,
  onWatchToggle,
}: {
  cardRef?: (element: HTMLDivElement | null) => void;
  copy: WorkspaceCopy;
  expandPositionList: boolean;
  isActive: boolean;
  isDarkTheme: boolean;
  isFlipped: boolean;
  isPerformanceLoading: boolean;
  isWatchlisted: boolean;
  model: TopSignalSourceModel;
  performanceWindow: TopSignalPerformanceWindow;
  pnlColorMode: PnlColorMode;
  positionPageOffset: number;
  onCardSelect: () => void;
  onCopyTradingRequest?: () => void;
  onFlipToggle: () => void;
  onNextPositionPage: () => void;
  onPositionSelect: (position: CopyTradingPosition) => void;
  onPreviousPositionPage: () => void;
  onWatchToggle?: () => void;
}) {
  const panelCopy = copy.workspace.topSignals;
  const performance = model.trader.performance;
  const cardClassName = getTopSignalCardClassName(isDarkTheme, isActive, performance ? "live" : model.positions.length > 0 ? "pending" : "muted");
  const backCardClassName = getTopSignalCardBackClassName(isDarkTheme);
  const frontFaceRef = useRef<HTMLDivElement | null>(null);
  const [lockedCardHeight, setLockedCardHeight] = useState<number | null>(null);
  const shouldLockCardHeight = !expandPositionList;
  const lockedCardHeightStyle = getTopSignalCardHeightStyle({
    expandPositionList,
    isFlipped,
    lockedCardHeight,
    shouldLockCardHeight,
  });
  const positionScrollAreaClassName = isDarkTheme ? "kol-scroll-area kol-scroll-area-dark" : "kol-scroll-area";
  const positionListClassName = expandPositionList
    ? `${positionScrollAreaClassName} grid min-h-0 flex-1 gap-2 overflow-x-hidden overflow-y-auto pr-1`
    : `${positionScrollAreaClassName} grid max-h-[246px] gap-2 overflow-x-hidden overflow-y-auto pr-1`;
  const positionsCardClassName = expandPositionList
    ? isDarkTheme
      ? "mt-3 flex min-h-0 flex-1 flex-col rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3"
      : "mt-3 flex min-h-0 flex-1 flex-col rounded-2xl border border-[#E5EAF0] bg-white p-3"
    : isDarkTheme
      ? "mt-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3"
      : "mt-3 rounded-2xl border border-[#E5EAF0] bg-white p-3";
  const positionsBodyClassName = expandPositionList ? "mt-2 flex min-h-0 flex-1 flex-col gap-2" : "mt-2 grid gap-2";
  const positionPageSize = expandPositionList ? EXPANDED_POSITION_ROWS_PER_PAGE : COMPACT_POSITION_ROWS_PER_SOURCE_CARD;
  const safePositionPageOffset = expandPositionList
    ? getSafePageOffset(positionPageOffset, model.positions.length, EXPANDED_POSITION_ROWS_PER_PAGE)
    : 0;
  const visiblePositions = model.positions.slice(safePositionPageOffset, safePositionPageOffset + positionPageSize);
  const hasPreviousPositionPage = expandPositionList && safePositionPageOffset > 0;
  const hasNextPositionPage = expandPositionList && safePositionPageOffset + EXPANDED_POSITION_ROWS_PER_PAGE < model.positions.length;
  const shouldShowPositionPagination = hasPreviousPositionPage || hasNextPositionPage;
  const shouldShowCompactPositionNotice = !expandPositionList && model.positions.length > COMPACT_POSITION_ROWS_PER_SOURCE_CARD;
  const positionPageRange = createPageRangeLabel(safePositionPageOffset, visiblePositions.length, model.positions.length);
  const totalNotionalValue = sumPositionNotionalValue(model.positions);
  const totalPositionMarginValue = sumPositionMarginValue(model.positions);
  const totalLeverage = calculateTotalLeverage({
    accountMarginValue: model.trader.margin_balance,
    positionMarginValue: totalPositionMarginValue,
    totalNotionalValue,
  });
  const totalUnrealizedPnlAmount = sumPositionUnrealizedPnlAmount(model.positions);
  const aggregatePnlRatio = calculateAggregatePnlRatio(totalUnrealizedPnlAmount, totalNotionalValue);
  const shouldRenderBackRows = isFlipped;
  const performanceAsset = performance?.copier_pnl_asset || "USDT";
  const performanceRoi = performance?.roi ?? model.trader.monthly_return;
  const performancePnl = performance?.pnl ?? totalUnrealizedPnlAmount;
  const performanceFollowers = performance?.followers ?? model.trader.followers;
  const performanceMaxDrawdown = performance?.max_drawdown ?? model.trader.max_drawdown;
  const performanceWinRate = performance?.win_rate ?? model.trader.win_rate;
  const performanceMarginBalance = performance?.margin_balance ?? model.trader.margin_balance;

  useLayoutEffect(() => {
    if (isFlipped || !shouldLockCardHeight) {
      return;
    }

    const frontFace = frontFaceRef.current;
    if (!frontFace) {
      return;
    }

    const updateLockedCardHeight = () => {
      const nextHeight = Math.ceil(frontFace.getBoundingClientRect().height);
      if (Number.isFinite(nextHeight) && nextHeight > 0) {
        setLockedCardHeight(nextHeight);
      }
    };

    updateLockedCardHeight();
    const resizeObserver = new ResizeObserver(updateLockedCardHeight);
    resizeObserver.observe(frontFace);
    return () => resizeObserver.disconnect();
  }, [isFlipped, model.positions.length, performance, shouldLockCardHeight]);

  return (
    <div ref={cardRef} className="signal-card-scene will-change-transform" style={lockedCardHeightStyle}>
      <div className={`signal-card-flipper ${isFlipped ? "is-flipped" : ""}`} style={lockedCardHeightStyle}>
        <div
          ref={frontFaceRef}
          className={`${cardClassName} motion-fx-3-card-face-front signal-card-face`}
          aria-hidden={isFlipped}
          role="button"
          style={lockedCardHeightStyle}
          tabIndex={isFlipped ? -1 : 0}
          onClick={onCardSelect}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onCardSelect();
            }
          }}
        >
          <div className="motion-fx-3-front-panel flex min-w-0 flex-col">
            <SourceHeader
              actionLabel={panelCopy.flipToPositions}
              copy={copy}
              isDarkTheme={isDarkTheme}
              isWatchlisted={isWatchlisted}
              model={model}
              onActionToggle={onFlipToggle}
              onWatchToggle={onWatchToggle}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className={getNeutralBadgeClassName(isDarkTheme)}>
                {panelCopy.performanceOverview}
              </span>
              <span className={getNeutralBadgeClassName(isDarkTheme)}>
                {panelCopy.currentPositions}: {model.positions.length}
              </span>
              {performanceFollowers !== null && performanceFollowers !== undefined ? (
                <span className={getNeutralBadgeClassName(isDarkTheme)}>
                  {panelCopy.followers}: {formatInteger(performanceFollowers)}
                </span>
              ) : null}
            </div>
            <div className="signal-card-field-layer mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <SignalField
                isDarkTheme={isDarkTheme}
                label={panelCopy.roi}
                value={formatSignedPercent(performanceRoi)}
                valueClassName={getPnlFieldClassName(isDarkTheme, performanceRoi, pnlColorMode)}
              />
              <SignalField
                isDarkTheme={isDarkTheme}
                label={panelCopy.pnl}
                value={formatSignedCurrency(performancePnl)}
                valueClassName={getPnlFieldClassName(isDarkTheme, performancePnl, pnlColorMode)}
              />
              <SignalField
                isDarkTheme={isDarkTheme}
                label={panelCopy.copierPnl}
                value={formatSignedAssetAmount(performance?.copier_pnl ?? null, performanceAsset)}
                valueClassName={getPnlFieldClassName(isDarkTheme, performance?.copier_pnl ?? null, pnlColorMode)}
              />
              <SignalField isDarkTheme={isDarkTheme} label={panelCopy.sharpeRatio} value={formatDecimal(performance?.sharpe_ratio ?? null)} />
              <SignalField isDarkTheme={isDarkTheme} label={panelCopy.maxDrawdown} value={formatPercent(performanceMaxDrawdown)} />
              <SignalField isDarkTheme={isDarkTheme} label={panelCopy.winRate} value={formatPercent(performanceWinRate)} />
              <SignalField isDarkTheme={isDarkTheme} label={panelCopy.aum} value={formatAssetAmount(performance?.aum ?? null, performanceAsset)} />
              <SignalField isDarkTheme={isDarkTheme} label={panelCopy.leaderMarginBalance} value={formatAssetAmount(performanceMarginBalance, performanceAsset)} />
            </div>
            {!performance ? (
              <div className={isDarkTheme ? "mt-2 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-[11px] font-medium text-slate-500" : "mt-2 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2 text-[11px] font-medium text-slate-500"}>
                {panelCopy.frontendSortFallbackHint}
              </div>
            ) : null}
            <TopSignalPerformanceCurveCard
              copy={copy}
              isDarkTheme={isDarkTheme}
              isPerformanceLoading={isPerformanceLoading}
              performance={performance}
              performanceWindow={performanceWindow}
              pnlColorMode={pnlColorMode}
            />
            {onCopyTradingRequest ? (
              <TopSignalCopyTradingAction
                copy={copy}
                isDarkTheme={isDarkTheme}
                onClick={onCopyTradingRequest}
              />
            ) : null}
          </div>
        </div>

        <div
          className={`${backCardClassName} motion-fx-3-card-face-back signal-card-face signal-card-back`}
          aria-hidden={!isFlipped}
          style={lockedCardHeightStyle}
        >
          <div className="motion-fx-3-back-panel flex h-full min-h-0 flex-col">
            <SourceHeader
              actionLabel={panelCopy.flipToPerformance}
              copy={copy}
              isDarkTheme={isDarkTheme}
              isWatchlisted={isWatchlisted}
              model={model}
              onActionToggle={onFlipToggle}
              onWatchToggle={onWatchToggle}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className={getNeutralBadgeClassName(isDarkTheme)}>
                {panelCopy.currentPositions}: {model.positions.length}
              </span>
              <span className={getNeutralBadgeClassName(isDarkTheme)}>
                {panelCopy.margin}: {formatAssetAmount(model.trader.margin_balance, performanceAsset)}
              </span>
            </div>
            <div className="signal-card-field-layer mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <SignalField isDarkTheme={isDarkTheme} label={panelCopy.notional} value={formatCurrency(totalNotionalValue)} />
              <SignalField isDarkTheme={isDarkTheme} label={panelCopy.totalLeverage} value={formatLeverage(totalLeverage)} />
              <SignalField
                isDarkTheme={isDarkTheme}
                label={panelCopy.unrealizedPnlWithRatio}
                value={formatPnlWithRatio(totalUnrealizedPnlAmount, aggregatePnlRatio)}
                valueClassName={getPnlFieldClassName(isDarkTheme, totalUnrealizedPnlAmount, pnlColorMode)}
              />
              <SignalField isDarkTheme={isDarkTheme} label={panelCopy.positionCount} value={formatInteger(model.positions.length)} />
            </div>
            <div className={positionsCardClassName}>
              <div className="flex items-center justify-between gap-3">
                <span className={isDarkTheme ? "text-xs font-bold text-slate-100" : "text-xs font-bold text-slate-900"}>{panelCopy.currentPositions}</span>
                <span className={isDarkTheme ? "text-[10px] font-medium text-slate-500" : "text-[10px] font-medium text-slate-400"}>{panelCopy.positionHint}</span>
              </div>
              <div className={positionsBodyClassName}>
                {model.positions.length > 0 && shouldRenderBackRows ? (
                  <div className={positionListClassName}>
                    {visiblePositions.map((position) => (
                      <PositionRow
                        key={position.position_id}
                        copy={copy}
                        isDarkTheme={isDarkTheme}
                        pnlColorMode={pnlColorMode}
                        position={position}
                        onPositionSelect={onPositionSelect}
                      />
                    ))}
                  </div>
                ) : model.positions.length > 0 ? null : (
                  <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-[#181A20] px-3 py-3 text-xs text-slate-400" : "rounded-2xl border border-[#E5EAF0] bg-white px-3 py-3 text-xs text-slate-500"}>
                    {panelCopy.noPositions}
                  </div>
                )}
                {shouldRenderBackRows && shouldShowCompactPositionNotice ? (
                  <div className={isDarkTheme ? "rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-[11px] font-medium text-slate-500" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2 text-[11px] font-medium text-slate-500"}>
                    {panelCopy.visiblePositionsNotice(visiblePositions.length, model.positions.length)}
                  </div>
                ) : null}
                {shouldRenderBackRows && shouldShowPositionPagination ? (
                  <RowsPaginationControls
                    canGoNext={hasNextPositionPage}
                    canGoPrevious={hasPreviousPositionPage}
                    rangeLabel={positionPageRange}
                    nextLabel={panelCopy.nextPositionsPage}
                    previousLabel={panelCopy.previousPositionsPage}
                    isDarkTheme={isDarkTheme}
                    onNext={onNextPositionPage}
                    onPrevious={onPreviousPositionPage}
                  />
                ) : null}
              </div>
            </div>
            {onCopyTradingRequest ? (
              <TopSignalCopyTradingAction
                copy={copy}
                isDarkTheme={isDarkTheme}
                onClick={onCopyTradingRequest}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export { TopSignalsStateCard } from "./source-card-subcomponents";
