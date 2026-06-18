"use client";

import { useEffect, useState } from "react";

import { toCopyTradingMarketSymbol } from "@/app/_lib/copy-trading-radar-api";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { KlineSignalBiasSummary } from "@/app/_components/kline-chart/types";
import type {
  CopyTradingPosition,
  CopyTradingRadarSnapshot,
  CopyTradingTrader,
} from "@/app/_types/copy-trading";
import type { MarketSymbol } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";
import { SourceAvatar, SymbolIcon } from "./card-ui";
import type { CopyTradingPrototypeTarget } from "./copy-trading-prototype";
import { KolPanel } from "./kol-panel";
import {
  formatSignalPaperPositionStatus,
  getSignalDirectionBadgeClass,
  getSignalPaperPositionBadgeClass,
} from "./paper-position-summary";
import {
  COMPACT_LAYOUT_MEDIA_QUERY,
  TopSignalsPanel,
} from "./signal-workspace-helpers-constants";
import {
  ChevronUpIcon,
  CloseIcon,
  formatMobileSignalTime,
  formatMobileSymbolLabel,
} from "./signal-workspace-helpers-icons";
import type {
  PnlColorMode,
  TopSignalPerformanceWindow,
  TopSignalSortKey,
} from "./top-signals-panel";
import type { KolSignalSourceStatus } from "./types";

export function useCompactLayout(): boolean {
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

export function createTopSignalsSignalBiasSummary(
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

export function MobileKolBottomSheet({
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

export function MobileTopSignalsBottomSheet({
  activeSourceId,
  copy,
  isCompactLayout,
  isDarkTheme,
  isOpen,
  performanceWindow,
  pnlColorMode,
  snapshot,
  sortKey,
  sourceFilterId,
  sourceStatus,
  watchlistedSourceIds,
  onOpenChange,
  onPositionSelect,
  onSourceFilterChange,
  onSourceSelect,
  onSourceWatchToggle,
  onCopyTradingRequest,
  onPerformanceWindowChange,
  onSortKeyChange,
}: {
  activeSourceId: string;
  copy: WorkspaceCopy;
  isCompactLayout: boolean;
  isDarkTheme: boolean;
  isOpen: boolean;
  performanceWindow: TopSignalPerformanceWindow;
  pnlColorMode: PnlColorMode;
  snapshot: CopyTradingRadarSnapshot | null;
  sortKey: TopSignalSortKey;
  sourceFilterId: string;
  sourceStatus: KolSignalSourceStatus;
  watchlistedSourceIds: ReadonlySet<string>;
  onOpenChange: (isOpen: boolean) => void;
  onPositionSelect: (position: CopyTradingPosition) => void;
  onSourceFilterChange: (sourceId: string) => void;
  onSourceSelect: (sourceId: string) => void;
  onSourceWatchToggle: (trader: CopyTradingTrader) => void;
  onCopyTradingRequest: (target: CopyTradingPrototypeTarget) => void;
  onPerformanceWindowChange: (window: TopSignalPerformanceWindow) => void;
  onSortKeyChange: (sortKey: TopSignalSortKey) => void;
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
            performanceWindow={performanceWindow}
            pnlColorMode={pnlColorMode}
            snapshot={snapshot}
            sortKey={sortKey}
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
            onPerformanceWindowChange={onPerformanceWindowChange}
            onSortKeyChange={onSortKeyChange}
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

export function MobileTopSignalsSheetHandle({
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

export function MobileKolSheetHandle({
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
