import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { isActiveCopyTradingTrader } from "@/app/_lib/copy-trading-radar-api";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { CopyTradingPrototypeTarget } from "./copy-trading-prototype";
import type {
  CopyTradingPosition,
  CopyTradingRadarSnapshot,
  CopyTradingTrader,
} from "@/app/_types/copy-trading";
import type { KolSignalSourceStatus } from "./types";
import {
  createTopSignalSourceModels,
  filterTopSignalSourceModelsBySource,
  getStatusBadgeClassName,
  sortTopSignalSourceModels,
} from "./top-signals-panel/helpers";
import type {
  PnlColorMode,
  TopSignalPerformanceWindow,
  TopSignalSortKey,
  TopSignalSourceModel,
} from "./top-signals-panel/helpers";
import {
  EXPANDED_POSITION_ROWS_PER_PAGE,
  TOP_SIGNAL_ACTIVE_CARD_SCROLL_GAP_PX,
} from "./top-signals-panel/constants";
import {
  getSafePageOffset,
  scrollElementIntoContainer,
} from "./top-signals-panel/utils";
import {
  TopSignalsSourceFilterBar,
  TopSignalPerformanceToolbar,
  WatchedTopSignalSources,
} from "./top-signals-panel/filter-toolbar";
import {
  TopSignalSourceCard,
  TopSignalsStateCard,
} from "./top-signals-panel/source-card";

export type { PnlColorMode, TopSignalPerformanceWindow, TopSignalSortKey } from "./top-signals-panel/helpers";

type TopSignalsPanelProps = {
  activeSourceId: string;
  copy: WorkspaceCopy;
  headerAction?: ReactNode;
  isDarkTheme: boolean;
  performanceWindow: TopSignalPerformanceWindow;
  pnlColorMode: PnlColorMode;
  snapshot: CopyTradingRadarSnapshot | null;
  sortKey: TopSignalSortKey;
  sourceFilterId: string;
  sourceStatus: KolSignalSourceStatus;
  variant?: "desktop" | "mobileSheet";
  watchlistedSourceIds?: ReadonlySet<string>;
  onPositionSelect: (position: CopyTradingPosition) => void;
  onSourceFilterChange: (sourceId: string) => void;
  onSourceSelect: (sourceId: string) => void;
  onSourceWatchToggle?: (trader: CopyTradingTrader) => void;
  onCopyTradingRequest?: (target: CopyTradingPrototypeTarget) => void;
  onPerformanceWindowChange: (window: TopSignalPerformanceWindow) => void;
  onSortKeyChange: (sortKey: TopSignalSortKey) => void;
};

export function TopSignalsPanel({
  activeSourceId,
  copy,
  headerAction,
  isDarkTheme,
  performanceWindow,
  pnlColorMode,
  snapshot,
  sortKey,
  sourceFilterId,
  sourceStatus,
  variant = "desktop",
  watchlistedSourceIds,
  onPositionSelect,
  onSourceFilterChange,
  onSourceSelect,
  onSourceWatchToggle,
  onCopyTradingRequest,
  onPerformanceWindowChange,
  onSortKeyChange,
}: TopSignalsPanelProps) {
  const [flippedSourceIds, setFlippedSourceIds] = useState<ReadonlySet<string>>(() => new Set());
  const [positionPageOffsetsBySourceId, setPositionPageOffsetsBySourceId] = useState<Readonly<Record<string, number>>>(() => ({}));
  const panelScrollRef = useRef<HTMLDivElement | null>(null);
  const sourceCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const models = useMemo(() => createTopSignalSourceModels(snapshot), [snapshot]);
  const activeModels = useMemo(() => models.filter((model) => isActiveCopyTradingTrader(model.trader)), [models]);
  const sortedActiveModels = useMemo(() => sortTopSignalSourceModels(activeModels, sortKey), [activeModels, sortKey]);
  const filteredModels = useMemo(() => filterTopSignalSourceModelsBySource(sortedActiveModels, sourceFilterId), [sortedActiveModels, sourceFilterId]);
  const watchedModels = useMemo(
    () => sortedActiveModels.filter((model) => watchlistedSourceIds?.has(model.trader.trader_id)).slice(0, 8),
    [sortedActiveModels, watchlistedSourceIds],
  );
  const isMobileSheet = variant === "mobileSheet";
  const panelCopy = copy.workspace.topSignals;
  const shellClassName = isDarkTheme
    ? isMobileSheet
      ? "flex h-full min-h-0 flex-col overflow-hidden rounded-t-[28px] border border-b-0 border-white/[0.085] bg-[#181A20] shadow-[0_-18px_54px_rgba(0,0,0,0.38)]"
      : "flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#181A20]"
    : isMobileSheet
      ? "flex h-full min-h-0 flex-col overflow-hidden rounded-t-[28px] border border-b-0 border-[#D5E4EF] bg-white shadow-[0_-18px_54px_rgba(15,23,42,0.16)]"
      : "flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-[#E5EAF0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.035)]";
  const scrollClassName = isDarkTheme
    ? "kol-scroll-area kol-scroll-area-dark mr-2 min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto bg-[#12161D] pb-3 pl-3 pr-1 pt-2"
    : "kol-scroll-area mr-2 min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto bg-[#FAFBFD] pb-3 pl-3 pr-1 pt-2";
  const rememberSourceCardElement = useCallback((sourceId: string, element: HTMLDivElement | null) => {
    if (element) {
      sourceCardRefs.current.set(sourceId, element);
      return;
    }

    sourceCardRefs.current.delete(sourceId);
  }, []);

  const toggleSourceFlip = (input: {
    isFlipped: boolean;
    sourceId: string;
  }) => {
    const { isFlipped, sourceId } = input;
    onSourceSelect(sourceId);

    setFlippedSourceIds((currentSourceIds) => {
      const nextSourceIds = new Set(currentSourceIds);
      if (isFlipped) {
        nextSourceIds.delete(sourceId);
      } else {
        nextSourceIds.add(sourceId);
      }
      return nextSourceIds;
    });
  };
  const showPreviousPositionPage = (model: TopSignalSourceModel) => {
    const sourceId = model.trader.trader_id;
    setPositionPageOffsetsBySourceId((currentOffsetsBySourceId) => {
      const currentOffset = getSafePageOffset(currentOffsetsBySourceId[sourceId] ?? 0, model.positions.length, EXPANDED_POSITION_ROWS_PER_PAGE);
      const nextOffset = Math.max(0, currentOffset - EXPANDED_POSITION_ROWS_PER_PAGE);
      if (nextOffset === currentOffset) {
        return currentOffsetsBySourceId;
      }

      return {
        ...currentOffsetsBySourceId,
        [sourceId]: nextOffset,
      };
    });
  };
  const showNextPositionPage = (model: TopSignalSourceModel) => {
    const sourceId = model.trader.trader_id;
    setPositionPageOffsetsBySourceId((currentOffsetsBySourceId) => {
      const currentOffset = getSafePageOffset(currentOffsetsBySourceId[sourceId] ?? 0, model.positions.length, EXPANDED_POSITION_ROWS_PER_PAGE);
      const nextOffset = Math.min(
        getSafePageOffset(model.positions.length - 1, model.positions.length, EXPANDED_POSITION_ROWS_PER_PAGE),
        currentOffset + EXPANDED_POSITION_ROWS_PER_PAGE,
      );
      if (nextOffset === currentOffset) {
        return currentOffsetsBySourceId;
      }

      return {
        ...currentOffsetsBySourceId,
        [sourceId]: nextOffset,
      };
    });
  };
  useEffect(() => {
    if (!activeSourceId) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const sourceCard = sourceCardRefs.current.get(activeSourceId);
      if (!sourceCard) {
        return;
      }

      scrollElementIntoContainer(panelScrollRef.current, sourceCard, {
        block: "start",
        offset: TOP_SIGNAL_ACTIVE_CARD_SCROLL_GAP_PX,
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeSourceId, filteredModels.length, sourceFilterId]);

  return (
    <aside className={shellClassName}>
      {isMobileSheet ? (
        <div
          aria-hidden="true"
          className={isDarkTheme ? "mx-auto mt-2 h-1 w-10 rounded-full bg-white/[0.18]" : "mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300"}
        />
      ) : null}
      <div className={isDarkTheme ? "flex min-h-[48px] items-center justify-between gap-3 border-b border-white/[0.075] bg-white/[0.055] px-4 py-2 sm:px-5 lg:py-1.5" : "flex min-h-[48px] items-center justify-between gap-3 border-b border-[#E5EAF0] bg-white px-4 py-2 sm:px-5 lg:py-1.5"}>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className={isDarkTheme ? "truncate text-base font-semibold tracking-tight text-slate-50" : "truncate text-base font-semibold tracking-tight text-slate-950"}>
              {panelCopy.title}
            </h2>
            {sourceStatus.error || sourceStatus.isLoading ? (
              <span className={getStatusBadgeClassName(isDarkTheme, sourceStatus.error ? "risk" : "loading")}>
                {sourceStatus.error ? copy.common.errorPrefix : copy.paper.loading}
              </span>
            ) : null}
          </div>
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>

      <div ref={panelScrollRef} className={scrollClassName}>
        {activeModels.length > 0 ? (
          <TopSignalsSourceFilterBar
            activeSourceId={sourceFilterId}
            allLabel={panelCopy.allSources}
            isDarkTheme={isDarkTheme}
            models={activeModels}
            searchPlaceholder={panelCopy.sourceSearchPlaceholder}
            onSourceChange={onSourceFilterChange}
          />
        ) : null}
        {activeModels.length > 0 ? (
          <TopSignalPerformanceToolbar
            copy={copy}
            isDarkTheme={isDarkTheme}
            performanceWindow={performanceWindow}
            sortKey={sortKey}
            onPerformanceWindowChange={onPerformanceWindowChange}
            onSortKeyChange={onSortKeyChange}
          />
        ) : null}
        {watchedModels.length > 0 ? (
          <WatchedTopSignalSources
            copy={copy}
            isDarkTheme={isDarkTheme}
            sources={watchedModels}
            onSourceOpen={(model) => {
              onSourceFilterChange(model.trader.trader_id);
              onSourceSelect(model.trader.trader_id);
              const preferredPosition = model.positions[0] ?? null;
              if (preferredPosition) {
                onPositionSelect(preferredPosition);
                return;
              }

            }}
          />
        ) : null}
        {sourceStatus.isLoading && activeModels.length === 0 ? (
          <TopSignalsStateCard isDarkTheme={isDarkTheme} message={panelCopy.loading} title={panelCopy.title} tone="loading" />
        ) : null}
        {sourceStatus.error ? (
          <TopSignalsStateCard
            isDarkTheme={isDarkTheme}
            message={activeModels.length > 0 ? panelCopy.errorWithCache : panelCopy.errorWithoutCache}
            statusText={`${copy.common.errorPrefix}：${sourceStatus.error}`}
            title={panelCopy.title}
            tone="risk"
          />
        ) : null}
        {!sourceStatus.isLoading && !sourceStatus.error && activeModels.length === 0 && filteredModels.length === 0 ? (
          <TopSignalsStateCard isDarkTheme={isDarkTheme} message={panelCopy.empty} title={panelCopy.title} tone="pending" />
        ) : null}
        {!sourceStatus.isLoading && activeModels.length > 0 && filteredModels.length === 0 ? (
          <TopSignalsStateCard isDarkTheme={isDarkTheme} message={panelCopy.filteredEmpty} title={panelCopy.title} tone="pending" />
        ) : null}
        {filteredModels.map((model) => {
          const isActive = model.trader.trader_id === activeSourceId;
          const isFlipped = flippedSourceIds.has(model.trader.trader_id);
          return (
            <TopSignalSourceCard
              key={model.trader.trader_id}
              cardRef={(element) => rememberSourceCardElement(model.trader.trader_id, element)}
              copy={copy}
              expandPositionList={sourceFilterId !== "all" && filteredModels.length === 1}
              isActive={isActive}
              isDarkTheme={isDarkTheme}
              isFlipped={isFlipped}
              isPerformanceLoading={sourceStatus.isLoading}
              isWatchlisted={watchlistedSourceIds?.has(model.trader.trader_id) ?? false}
              model={model}
              performanceWindow={performanceWindow}
              pnlColorMode={pnlColorMode}
              positionPageOffset={positionPageOffsetsBySourceId[model.trader.trader_id] ?? 0}
              onCardSelect={() => onSourceSelect(model.trader.trader_id)}
              onCopyTradingRequest={onCopyTradingRequest ? () => onCopyTradingRequest({
                eventsCount: model.events.length,
                positionsCount: model.positions.length,
                trader: model.trader,
              }) : undefined}
              onFlipToggle={() => toggleSourceFlip({
                isFlipped,
                sourceId: model.trader.trader_id,
              })}
              onNextPositionPage={() => showNextPositionPage(model)}
              onPositionSelect={onPositionSelect}
              onPreviousPositionPage={() => showPreviousPositionPage(model)}
              onWatchToggle={onSourceWatchToggle ? () => onSourceWatchToggle(model.trader) : undefined}
            />
          );
        })}
      </div>
    </aside>
  );
}
