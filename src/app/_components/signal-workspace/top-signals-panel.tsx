import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { isActiveCopyTradingTrader } from "@/app/_lib/copy-trading-radar-api";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { CopyTradingPrototypeTarget } from "./copy-trading-prototype";
import type {
  CopyTradingPosition,
  CopyTradingRadarSnapshot,
  CopyTradingReturnCurvePoint,
  CopyTradingTrader,
} from "@/app/_types/copy-trading";
import type { KolSignalSourceStatus } from "./types";
import { FavoriteStarButton, SignalField, SourceAvatar, SymbolIcon } from "./card-ui";
import {
  calculateAggregatePnlRatio,
  calculatePositionUnrealizedPnlAmount,
  calculateTotalLeverage,
  createTopSignalSourceModels,
  filterTopSignalSourceModelsBySource,
  formatAssetAmount,
  formatCurrency,
  formatDecimal,
  formatDirection,
  formatDisplayTime,
  formatInteger,
  formatLeverage,
  formatPercent,
  formatPnlWithRatio,
  formatPrice,
  formatQuantity,
  formatReturnCurveDate,
  formatSignedAssetAmount,
  formatSignedCurrency,
  formatSignedPercent,
  getDirectionBadgeClassName,
  getNeutralBadgeClassName,
  getPnlClassName,
  getPnlFieldClassName,
  getPnlRatioClassName,
  getStatusBadgeClassName,
  getTopSignalCardBackClassName,
  getTopSignalCardClassName,
  getTopSignalStateCardClassName,
  sortTopSignalSourceModels,
  sumPositionMarginValue,
  sumPositionNotionalValue,
  sumPositionUnrealizedPnlAmount,
} from "./top-signals-panel/helpers";

import type { PnlColorMode, TopSignalPerformanceWindow, TopSignalSortKey, TopSignalSourceModel } from "./top-signals-panel/helpers";
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

const COMPACT_POSITION_ROWS_PER_SOURCE_CARD = 10;
const EXPANDED_POSITION_ROWS_PER_PAGE = 100;
const TOP_SIGNAL_ACTIVE_CARD_SCROLL_GAP_PX = 8;
const EXPANDED_POSITION_CARD_MIN_HEIGHT = "clamp(420px, 68vh, 680px)";
const RETURN_CURVE_MAX_RENDER_POINTS = 160;
const RETURN_CURVE_SVG_HEIGHT = 92;
const RETURN_CURVE_SVG_WIDTH = 320;
const RETURN_CURVE_SVG_PADDING = 8;
const SMARTKLINE_SOURCE_AVATAR_STYLE: CSSProperties = {
  backgroundImage: "url(\"/logo-mark.svg\")",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "72%",
};

const TOP_SIGNAL_PERFORMANCE_WINDOWS: readonly TopSignalPerformanceWindow[] = ["7d", "30d", "90d", "180d"];
const TOP_SIGNAL_SORT_OPTIONS: readonly TopSignalSortKey[] = [
  "pnl",
  "roi",
  "maxDrawdown",
  "aum",
  "followers",
  "copierPnl",
  "sharpeRatio",
];

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

function TopSignalsSourceFilterBar({
  activeSourceId,
  allLabel,
  isDarkTheme,
  models,
  searchPlaceholder,
  onSourceChange,
}: {
  activeSourceId: string;
  allLabel: string;
  isDarkTheme: boolean;
  models: readonly TopSignalSourceModel[];
  searchPlaceholder: string;
  onSourceChange: (sourceId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const activeModel = models.find((model) => model.trader.trader_id === activeSourceId) ?? null;
  const selectedLabel = activeModel?.trader.name ?? allLabel;
  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return models;
    }

    return models.filter((model) => {
      return model.trader.name.toLowerCase().includes(normalizedQuery)
        || model.trader.trader_id.toLowerCase().includes(normalizedQuery)
        || model.trader.platform.toLowerCase().includes(normalizedQuery);
    });
  }, [models, query]);
  const shellClassName = isDarkTheme
    ? "relative rounded-[20px] border border-white/[0.075] bg-[#181A20] p-2"
    : "relative rounded-[20px] border border-[#E5EAF0] bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.035)]";
  const triggerClassName = isDarkTheme
    ? "flex h-9 w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 text-left text-xs font-bold text-slate-200 transition hover:bg-white/[0.07]"
    : "flex h-9 w-full items-center justify-between gap-3 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 text-left text-xs font-bold text-slate-700 transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE]";
  const dropdownClassName = isDarkTheme
    ? "absolute left-2 right-2 top-[calc(100%-4px)] z-30 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#181A20] shadow-[0_18px_46px_rgba(0,0,0,0.36)]"
    : "absolute left-2 right-2 top-[calc(100%-4px)] z-30 overflow-hidden rounded-2xl border border-[#D5E4EF] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.14)]";
  const searchClassName = isDarkTheme
    ? "h-9 w-full rounded-xl border border-white/[0.075] bg-[#0F131A] px-3 text-xs font-medium text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/40"
    : "h-9 w-full rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#B7E8FC]";

  const chooseSource = (sourceId: string) => {
    onSourceChange(sourceId);
    setIsOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    searchInputRef.current?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && containerRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={shellClassName}>
      <button
        aria-expanded={isOpen}
        className={triggerClassName}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          {activeModel ? (
            <SourceAvatarMini isActive={false} isDarkTheme={isDarkTheme} name={activeModel.trader.name} url={activeModel.trader.avatar} />
          ) : (
            <SmartKlineSourceAvatarMini isActive={false} isDarkTheme={isDarkTheme} />
          )}
          <span className="truncate">{selectedLabel}</span>
        </span>
        <span className={isDarkTheme ? "text-[10px] text-slate-500" : "text-[10px] text-slate-400"}>⌄</span>
      </button>
      {isOpen ? (
        <div className={dropdownClassName}>
          <div className="p-2">
            <input
              ref={searchInputRef}
              className={searchClassName}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClick={(event) => event.stopPropagation()}
            />
          </div>
          <div className="max-h-64 overflow-y-auto px-2 pb-2">
            <SourceFilterOption
              count={models.length}
              isActive={activeSourceId === "all" || !activeModel}
              isDarkTheme={isDarkTheme}
              label={allLabel}
              onClick={() => chooseSource("all")}
            />
            {filteredModels.map((model) => (
              <SourceFilterOption
                key={model.trader.trader_id}
                count={model.events.length}
                isActive={model.trader.trader_id === activeSourceId}
                isDarkTheme={isDarkTheme}
                label={model.trader.name}
                meta={model.trader.platform}
                name={model.trader.name}
                url={model.trader.avatar}
                onClick={() => chooseSource(model.trader.trader_id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SourceFilterOption({
  count,
  isActive,
  isDarkTheme,
  label,
  meta,
  name,
  url,
  onClick,
}: {
  count: number;
  isActive: boolean;
  isDarkTheme: boolean;
  label: string;
  meta?: string;
  name?: string;
  url?: string | null;
  onClick: () => void;
}) {
  const className = isActive
    ? "flex w-full items-center gap-2 rounded-xl bg-[#00A6F4] px-2.5 py-2 text-left text-xs font-black text-white"
    : isDarkTheme
      ? "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-bold text-slate-300 transition hover:bg-white/[0.06]"
      : "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-[#F4FBFF]";

  return (
    <button className={className} type="button" onClick={onClick}>
      {name ? (
        <SourceAvatarMini isActive={isActive} isDarkTheme={isDarkTheme} name={name} url={url ?? null} />
      ) : (
        <SmartKlineSourceAvatarMini isActive={isActive} isDarkTheme={isDarkTheme} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {meta ? <span className={isActive ? "block truncate text-[10px] text-white/70" : isDarkTheme ? "block truncate text-[10px] text-slate-500" : "block truncate text-[10px] text-slate-400"}>{meta}</span> : null}
      </span>
      <span className={isActive ? "rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] text-white" : isDarkTheme ? "rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-500" : "rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400"}>{count}</span>
    </button>
  );
}

function TopSignalPerformanceToolbar({
  copy,
  isDarkTheme,
  performanceWindow,
  sortKey,
  onPerformanceWindowChange,
  onSortKeyChange,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  performanceWindow: TopSignalPerformanceWindow;
  sortKey: TopSignalSortKey;
  onPerformanceWindowChange: (window: TopSignalPerformanceWindow) => void;
  onSortKeyChange: (sortKey: TopSignalSortKey) => void;
}) {
  const panelCopy = copy.workspace.topSignals;
  const shellClassName = isDarkTheme
    ? "rounded-[20px] border border-white/[0.075] bg-[#181A20] p-3"
    : "rounded-[20px] border border-[#E5EAF0] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)]";
  const labelClassName = isDarkTheme
    ? "text-[10px] font-black uppercase tracking-[0.12em] text-slate-500"
    : "text-[10px] font-black uppercase tracking-[0.12em] text-slate-400";
  const selectClassName = isDarkTheme
    ? "h-9 rounded-2xl border border-white/[0.075] bg-[#0F131A] px-3 text-xs font-bold text-slate-100 outline-none transition focus:border-sky-400/45"
    : "h-9 rounded-2xl border border-[#D5E4EF] bg-[#F8FAFC] px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-[#7DD7FA]";

  return (
    <section className={shellClassName}>
      <div className="grid gap-3">
        <div>
          <div className={labelClassName}>{panelCopy.performanceWindow}</div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {TOP_SIGNAL_PERFORMANCE_WINDOWS.map((window) => {
              const isActive = window === performanceWindow;
              const buttonClassName = isActive
                ? "rounded-2xl bg-[#00A6F4] px-2.5 py-2 text-xs font-black text-white shadow-[0_10px_22px_rgba(0,166,244,0.20)]"
                : isDarkTheme
                  ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-2.5 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/[0.065]"
                  : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-2.5 py-2 text-xs font-bold text-slate-600 transition hover:border-[#B7E8FC] hover:bg-[#F4FBFF]";
              return (
                <button
                  key={window}
                  aria-pressed={isActive}
                  className={buttonClassName}
                  type="button"
                  onClick={() => onPerformanceWindowChange(window)}
                >
                  {panelCopy.performanceWindows[window]}
                </button>
              );
            })}
          </div>
        </div>
        <label className="grid gap-2">
          <span className={labelClassName}>{panelCopy.sortBy}</span>
          <select
            className={selectClassName}
            value={sortKey}
            onChange={(event) => onSortKeyChange(event.target.value as TopSignalSortKey)}
          >
            {TOP_SIGNAL_SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {panelCopy.sortOptions[option]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function SmartKlineSourceAvatarMini({
  isActive,
  isDarkTheme,
}: {
  isActive: boolean;
  isDarkTheme: boolean;
}) {
  const className = isActive
    ? "h-6 w-6 border-white/60 bg-white"
    : isDarkTheme
      ? "h-6 w-6 border-white/[0.10] bg-white"
      : "h-6 w-6 border-white bg-white";

  return (
    <span aria-hidden="true" className={`block shrink-0 overflow-hidden rounded-full border ${className}`}>
      <span className="block h-full w-full" style={SMARTKLINE_SOURCE_AVATAR_STYLE} />
    </span>
  );
}

function SourceAvatarMini({
  isActive,
  isDarkTheme,
  name,
  url,
}: {
  isActive: boolean;
  isDarkTheme: boolean;
  name: string;
  url: string | null;
}) {
  const className = isActive
    ? "h-6 w-6 border-white/40"
    : isDarkTheme
      ? "h-6 w-6 border-white/[0.08]"
      : "h-6 w-6 border-white";

  return (
    <span className={`block shrink-0 overflow-hidden rounded-full border ${className}`}>
      <span
        aria-hidden="true"
        className="block h-full w-full bg-cover bg-center"
        style={url ? { backgroundImage: `url("${url}")` } : undefined}
      >
        {!url ? (
          <span className="grid h-full w-full place-items-center bg-[#00A6F4] text-[10px] font-black text-white">
            {name.trim().slice(0, 1).toUpperCase() || "S"}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function WatchedTopSignalSources({
  copy,
  isDarkTheme,
  sources,
  onSourceOpen,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  sources: readonly TopSignalSourceModel[];
  onSourceOpen: (model: TopSignalSourceModel) => void;
}) {
  const shellClassName = isDarkTheme
    ? "rounded-[20px] border border-white/[0.075] bg-[#181A20] p-3"
    : "rounded-[20px] border border-[#E5EAF0] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)]";
  const cardClassName = isDarkTheme
    ? "min-w-0 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-left transition hover:border-sky-500/30 hover:bg-white/[0.065]"
    : "min-w-0 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2 text-left transition hover:border-[#B7E8FC] hover:bg-[#F4FBFF]";

  return (
    <section className={shellClassName}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={isDarkTheme ? "text-xs font-black text-slate-50" : "text-xs font-black text-slate-950"}>
          {copy.workspace.watchlist.favoriteSources}
        </h3>
        <span className={isDarkTheme ? "text-[10px] font-medium text-slate-500" : "text-[10px] font-medium text-slate-400"}>
          {copy.workspace.watchlist.favoriteCount(sources.length)}
        </span>
      </div>
      <div className="mt-2 grid max-h-[292px] grid-cols-2 gap-2 overflow-y-auto pr-1">
        {sources.map((model) => {
          const latestPosition = model.positions[0] ?? null;
          const latestEvent = model.events[0] ?? null;
          const symbol = latestPosition?.symbol ?? latestEvent?.symbol ?? null;

          return (
            <button
              key={model.trader.trader_id}
              className={cardClassName}
              type="button"
              onClick={() => onSourceOpen(model)}
            >
              <div className="flex min-w-0 items-center gap-2">
                <SourceAvatar
                  isDarkTheme={isDarkTheme}
                  name={model.trader.name}
                  url={model.trader.avatar}
                />
                <div className="min-w-0 flex-1">
                  <div className={isDarkTheme ? "truncate text-xs font-black text-slate-50" : "truncate text-xs font-black text-slate-950"}>
                    {model.trader.name}
                  </div>
                  <div className={isDarkTheme ? "mt-1 flex items-center gap-1.5 text-[10px] text-slate-500" : "mt-1 flex items-center gap-1.5 text-[10px] text-slate-500"}>
                    <span>{copy.workspace.watchlist.positions}: {model.positions.length}</span>
                    <span>·</span>
                    <span>{copy.workspace.watchlist.trades}: {model.events.length}</span>
                  </div>
                </div>
              </div>
              <div className={isDarkTheme ? "mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-300" : "mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700"}>
                {symbol ? <SymbolIcon symbol={symbol} /> : null}
                <span>{symbol ?? copy.workspace.watchlist.noActiveSymbols}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TopSignalSourceCard({
  cardRef,
  copy,
  expandPositionList,
  isActive,
  isDarkTheme,
  isFlipped,
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

function TopSignalPerformanceCurveCard({
  copy,
  isDarkTheme,
  performance,
  performanceWindow,
  pnlColorMode,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  performance: CopyTradingTrader["performance"];
  performanceWindow: TopSignalPerformanceWindow;
  pnlColorMode: PnlColorMode;
}) {
  const panelCopy = copy.workspace.topSignals;
  const points = performance?.return_curve ?? [];
  const latestPoint = points.length > 0 ? points[points.length - 1] : null;
  const metaText = performance?.updated_at
    ? panelCopy.updatedAt(formatDisplayTime(performance.updated_at))
    : panelCopy.performanceHint;
  const cardClassName = isDarkTheme
    ? "mt-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3"
    : "mt-3 rounded-2xl border border-[#E5EAF0] bg-white p-3";
  const latestValue = latestPoint?.value ?? performance?.roi ?? null;
  const latestClassName = getPnlClassName(isDarkTheme, latestValue, pnlColorMode);
  const windowLabel = panelCopy.performanceWindows[performanceWindow] ?? performance?.window ?? performanceWindow;

  return (
    <div className={cardClassName}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={isDarkTheme ? "text-xs font-bold text-slate-100" : "text-xs font-bold text-slate-900"}>
            {panelCopy.returnCurve}
          </div>
          <div className={isDarkTheme ? "mt-1 truncate text-[10px] font-medium text-slate-500" : "mt-1 truncate text-[10px] font-medium text-slate-400"}>
            {metaText}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={latestClassName}>{formatSignedPercent(latestValue)}</div>
          <div className={isDarkTheme ? "mt-1 text-[10px] text-slate-500" : "mt-1 text-[10px] text-slate-400"}>
            {panelCopy.returnCurveLatest}
          </div>
        </div>
      </div>
      <div className="mt-3 h-[92px]">
        {points.length > 0 ? (
          <TopSignalReturnCurveChart
            ariaLabel={panelCopy.returnCurve}
            isDarkTheme={isDarkTheme}
            pnlColorMode={pnlColorMode}
            points={points}
          />
        ) : (
          <div className={isDarkTheme ? "flex h-full items-center justify-center rounded-xl border border-white/[0.06] bg-[#181A20] px-3 text-center text-xs text-slate-500" : "flex h-full items-center justify-center rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 text-center text-xs text-slate-500"}>
            {panelCopy.returnCurveEmpty}
          </div>
        )}
      </div>
      {points.length > 0 ? (
        <div className={isDarkTheme ? "mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-500" : "mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-400"}>
          <span>{formatReturnCurveDate(points[0]?.timestamp ?? null)}</span>
          <span className="truncate">{windowLabel}</span>
          <span>{formatReturnCurveDate(latestPoint?.timestamp ?? null)}</span>
        </div>
      ) : null}
    </div>
  );
}

function TopSignalReturnCurveChart({
  ariaLabel,
  isDarkTheme,
  pnlColorMode,
  points,
}: {
  ariaLabel: string;
  isDarkTheme: boolean;
  pnlColorMode: PnlColorMode;
  points: readonly CopyTradingReturnCurvePoint[];
}) {
  const sampledPoints = sampleReturnCurvePoints(points, RETURN_CURVE_MAX_RENDER_POINTS);
  const renderPoints = createReturnCurveRenderPoints(sampledPoints);
  if (renderPoints.length === 0) {
    return null;
  }

  const latestPoint = sampledPoints[sampledPoints.length - 1];
  const pathData = createReturnCurvePath(renderPoints);
  const zeroLineY = calculateReturnCurveZeroLineY(sampledPoints);
  const strokeColor = getReturnCurveStrokeColor(isDarkTheme, latestPoint?.value ?? 0, pnlColorMode);
  const gridColor = isDarkTheme ? "rgba(148,163,184,0.2)" : "rgba(148,163,184,0.28)";
  const endPoint = renderPoints[renderPoints.length - 1];

  return (
    <svg
      aria-label={ariaLabel}
      className="h-full w-full overflow-visible"
      role="img"
      viewBox={`0 0 ${RETURN_CURVE_SVG_WIDTH} ${RETURN_CURVE_SVG_HEIGHT}`}
    >
      {zeroLineY !== null ? (
        <line
          stroke={gridColor}
          strokeDasharray="4 4"
          strokeWidth="1"
          x1={RETURN_CURVE_SVG_PADDING}
          x2={RETURN_CURVE_SVG_WIDTH - RETURN_CURVE_SVG_PADDING}
          y1={zeroLineY}
          y2={zeroLineY}
        />
      ) : null}
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      {endPoint ? (
        <circle
          cx={endPoint.x}
          cy={endPoint.y}
          fill={strokeColor}
          r="3"
        />
      ) : null}
    </svg>
  );
}

function sampleReturnCurvePoints(
  points: readonly CopyTradingReturnCurvePoint[],
  maxPoints: number,
): CopyTradingReturnCurvePoint[] {
  const normalizedPoints = points
    .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.value))
    .slice()
    .sort((left, right) => left.timestamp - right.timestamp);

  if (normalizedPoints.length <= maxPoints) {
    return normalizedPoints;
  }

  const sampledPoints: CopyTradingReturnCurvePoint[] = [];
  const lastIndex = normalizedPoints.length - 1;
  const sampleCount = Math.max(2, maxPoints);
  const usedIndexes = new Set<number>();
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const pointIndex = Math.round((sampleIndex / (sampleCount - 1)) * lastIndex);
    if (!usedIndexes.has(pointIndex)) {
      sampledPoints.push(normalizedPoints[pointIndex]);
      usedIndexes.add(pointIndex);
    }
  }

  return sampledPoints;
}

function createReturnCurveRenderPoints(
  points: readonly CopyTradingReturnCurvePoint[],
): { x: number; y: number }[] {
  if (points.length === 0) {
    return [];
  }

  const { max, min } = getReturnCurveValueRange(points);
  const valueRange = max - min;
  const xRange = RETURN_CURVE_SVG_WIDTH - RETURN_CURVE_SVG_PADDING * 2;
  const yRange = RETURN_CURVE_SVG_HEIGHT - RETURN_CURVE_SVG_PADDING * 2;

  return points.map((point, index) => {
    const xRatio = points.length === 1 ? 1 : index / (points.length - 1);
    const yRatio = valueRange === 0 ? 0.5 : (max - point.value) / valueRange;
    return {
      x: RETURN_CURVE_SVG_PADDING + xRatio * xRange,
      y: RETURN_CURVE_SVG_PADDING + yRatio * yRange,
    };
  });
}

function createReturnCurvePath(points: readonly { x: number; y: number }[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${formatSvgNumber(point.x)} ${formatSvgNumber(point.y)}`)
    .join(" ");
}

function calculateReturnCurveZeroLineY(points: readonly CopyTradingReturnCurvePoint[]): number | null {
  if (points.length === 0) {
    return null;
  }

  const { max, min } = getReturnCurveValueRange(points);
  if (min > 0 || max < 0) {
    return null;
  }

  const valueRange = max - min;
  const yRange = RETURN_CURVE_SVG_HEIGHT - RETURN_CURVE_SVG_PADDING * 2;
  const yRatio = valueRange === 0 ? 0.5 : max / valueRange;
  return RETURN_CURVE_SVG_PADDING + yRatio * yRange;
}

function getReturnCurveValueRange(points: readonly CopyTradingReturnCurvePoint[]): { max: number; min: number } {
  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  if (minValue !== maxValue) {
    return { max: maxValue, min: minValue };
  }

  const padding = Math.max(0.01, Math.abs(minValue) * 0.08);
  return {
    max: maxValue + padding,
    min: minValue - padding,
  };
}

function getReturnCurveStrokeColor(
  isDarkTheme: boolean,
  value: number,
  pnlColorMode: PnlColorMode,
): string {
  if (Math.abs(value) < 0.00005) {
    return isDarkTheme ? "#94A3B8" : "#64748B";
  }

  const shouldUseGainColor = value > 0;
  const isGreenGain = pnlColorMode === "positiveGreen";
  if (shouldUseGainColor === isGreenGain) {
    return isDarkTheme ? "#34D399" : "#059669";
  }

  return isDarkTheme ? "#FB7185" : "#E11D48";
}

function formatSvgNumber(value: number): string {
  return value.toFixed(2);
}

function getSafePageOffset(offset: number, totalCount: number, pageSize: number): number {
  if (totalCount <= 0) {
    return 0;
  }

  const safePageSize = Math.max(1, pageSize);
  const maxOffset = Math.floor((totalCount - 1) / safePageSize) * safePageSize;
  return Math.max(0, Math.min(Math.floor(offset), maxOffset));
}

function createPageRangeLabel(pageOffset: number, visibleCount: number, totalCount: number): string {
  if (totalCount <= 0 || visibleCount <= 0) {
    return "0 / 0";
  }

  const start = pageOffset + 1;
  const end = Math.min(totalCount, pageOffset + visibleCount);
  return `${start}-${end} / ${totalCount}`;
}

function getSafeExternalUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function getTopSignalCardHeightStyle({
  expandPositionList,
  isFlipped,
  lockedCardHeight,
  shouldLockCardHeight,
}: {
  expandPositionList: boolean;
  isFlipped: boolean;
  lockedCardHeight: number | null;
  shouldLockCardHeight: boolean;
}): CSSProperties | undefined {
  if (expandPositionList && isFlipped) {
    return {
      height: EXPANDED_POSITION_CARD_MIN_HEIGHT,
      minHeight: EXPANDED_POSITION_CARD_MIN_HEIGHT,
    };
  }

  if (lockedCardHeight === null || !shouldLockCardHeight) {
    return undefined;
  }

  return { minHeight: lockedCardHeight };
}

function scrollElementIntoContainer(
  container: HTMLElement | null,
  element: HTMLElement,
  options: {
    block: "center" | "start";
    offset?: number;
  },
) {
  if (!container || !container.contains(element)) {
    element.scrollIntoView({ block: options.block, inline: "nearest" });
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const offset = options.offset ?? 0;
  const targetTop = options.block === "center"
    ? container.scrollTop + elementRect.top - containerRect.top - (container.clientHeight - elementRect.height) / 2
    : container.scrollTop + elementRect.top - containerRect.top - offset;
  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);

  container.scrollTo({
    behavior: "auto",
    top: Math.max(0, Math.min(targetTop, maxScrollTop)),
  });
}

function RowsPaginationControls({
  canGoNext,
  canGoPrevious,
  isLoading,
  isDarkTheme,
  nextLabel,
  previousLabel,
  rangeLabel,
  onNext,
  onPrevious,
}: {
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLoading?: boolean;
  isDarkTheme: boolean;
  nextLabel: string;
  previousLabel: string;
  rangeLabel: string;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const buttonClassName = isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-[11px] font-bold text-sky-200 transition hover:border-sky-400/25 hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:opacity-45"
    : "rounded-2xl border border-[#B7E8FC] bg-white px-3 py-2 text-[11px] font-bold text-[#008DCC] transition hover:bg-[#EAF8FE] disabled:cursor-not-allowed disabled:opacity-45";
  const rangeClassName = isDarkTheme
    ? "text-center text-[10px] font-semibold text-slate-500"
    : "text-center text-[10px] font-semibold text-slate-400";
  const isNextDisabled = !canGoNext || Boolean(isLoading);
  const isPreviousDisabled = !canGoPrevious || Boolean(isLoading);

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <button className={buttonClassName} disabled={isPreviousDisabled} type="button" onClick={onPrevious}>
        {previousLabel}
      </button>
      <span className={rangeClassName}>{rangeLabel}</span>
      <button className={buttonClassName} disabled={isNextDisabled} type="button" onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  );
}

function SourceHeader({
  actionLabel,
  copy,
  isDarkTheme,
  isWatchlisted,
  model,
  onActionToggle,
  onWatchToggle,
}: {
  actionLabel?: string;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  isWatchlisted: boolean;
  model: TopSignalSourceModel;
  onActionToggle?: () => void;
  onWatchToggle?: () => void;
}) {
  const panelCopy = copy.workspace.topSignals;
  const profileUrl = getSafeExternalUrl(model.trader.source_url);
  const actionButtonClassName = isDarkTheme
    ? "motion-fx-3-raw-button inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-sky-400/20 bg-sky-400/10 px-3 text-[11px] font-bold text-sky-200 transition hover:bg-sky-400/15"
    : "motion-fx-3-raw-button inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-[#B7E8FC] bg-[#EAF8FE] px-3 text-[11px] font-bold text-[#008DCC] transition hover:bg-[#DDF4FF]";
  const traderNameClassName = isDarkTheme
    ? "min-w-0 truncate text-sm font-black leading-none text-slate-50"
    : "min-w-0 truncate text-sm font-black leading-none text-slate-950";

  return (
    <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)_auto] grid-rows-[40px_28px] gap-x-3 gap-y-0">
      <div className="col-start-1 row-start-1 row-span-2 flex h-10 items-center">
        <SourceAvatar isDarkTheme={isDarkTheme} name={model.trader.name} url={model.trader.avatar} />
      </div>
      <div className="col-start-2 row-start-1 flex min-w-0 items-center">
        {profileUrl ? (
          <a
            className={`${traderNameClassName} motion-fx-3-raw-button rounded-md outline-none transition hover:text-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400/50`}
            href={profileUrl}
            rel="noopener noreferrer"
            target="_blank"
            title={panelCopy.openTraderProfile}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {model.trader.name}
          </a>
        ) : (
          <h3 className={traderNameClassName}>{model.trader.name}</h3>
        )}
      </div>
      {onActionToggle && actionLabel ? (
        <button
          className={`${actionButtonClassName} col-start-3 row-start-1 self-center justify-self-end`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onActionToggle();
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {actionLabel}
        </button>
      ) : null}
      <div className={isDarkTheme ? "col-start-2 col-end-4 row-start-2 flex min-w-0 items-center gap-1.5 text-[13px] font-bold leading-none text-slate-500" : "col-start-2 col-end-4 row-start-2 flex min-w-0 items-center gap-1.5 text-[13px] font-bold leading-none text-slate-500"}>
        <span className="min-w-0 truncate whitespace-nowrap">{panelCopy.signalType}: {model.trader.platform}</span>
        {onWatchToggle ? (
          <FavoriteStarButton
            activeLabel={copy.workspace.watchlist.removeFavorite}
            inactiveLabel={copy.workspace.watchlist.addFavorite}
            isActive={isWatchlisted}
            isDarkTheme={isDarkTheme}
            size="compact"
            onToggle={onWatchToggle}
          />
        ) : null}
      </div>
    </div>
  );
}

function TopSignalCopyTradingAction({
  copy,
  isDarkTheme,
  onClick,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onClick: () => void;
}) {
  const panelCopy = copy.workspace.topSignals;
  const buttonClassName = isDarkTheme
    ? "motion-fx-3-raw-button mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-3 py-3 text-left text-sky-100 transition hover:border-sky-300/30 hover:bg-sky-400/15"
    : "motion-fx-3-raw-button mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-[#B7E8FC] bg-[#EAF8FE] px-3 py-3 text-left text-[#007DB8] transition hover:border-[#93D6F7] hover:bg-[#DDF4FF]";

  return (
    <button
      className={buttonClassName}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <span className="min-w-0">
        <span className="block text-sm font-black">{panelCopy.copyTradingCta}</span>
        <span className={isDarkTheme ? "mt-0.5 block text-[11px] font-bold text-sky-200/70" : "mt-0.5 block text-[11px] font-bold text-[#008DCC]/70"}>{panelCopy.copyTradingMeta}</span>
      </span>
      <span aria-hidden="true" className={isDarkTheme ? "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-300/15 text-base font-black text-sky-200" : "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-base font-black text-[#008DCC]"}>
        →
      </span>
    </button>
  );
}

function PositionRow({
  copy,
  isDarkTheme,
  pnlColorMode,
  position,
  onPositionSelect,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  pnlColorMode: PnlColorMode;
  position: CopyTradingPosition;
  onPositionSelect: (position: CopyTradingPosition) => void;
}) {
  const panelCopy = copy.workspace.topSignals;
  const unrealizedPnlAmount = calculatePositionUnrealizedPnlAmount(position);
  const pnlToneValue = unrealizedPnlAmount ?? position.unrealized_pnl;
  const rowClassName = isDarkTheme
    ? "block min-h-[74px] w-full min-w-0 appearance-none overflow-hidden rounded-2xl border border-white/[0.075] bg-[#181A20] px-3 py-2 text-left transition hover:border-sky-500/30 hover:bg-white/[0.055]"
    : "block min-h-[74px] w-full min-w-0 appearance-none overflow-hidden rounded-2xl border border-[#E5EAF0] bg-white px-3 py-2 text-left transition hover:border-[#B7E8FC] hover:bg-[#F4FBFF]";

  return (
    <button
      className={rowClassName}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onPositionSelect(position);
      }}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <SymbolIcon symbol={position.symbol} />
            <span className={isDarkTheme ? "min-w-0 max-w-[142px] truncate text-xs font-black text-slate-50" : "min-w-0 max-w-[142px] truncate text-xs font-black text-slate-950"}>{position.symbol}</span>
            <span className={getDirectionBadgeClassName(isDarkTheme, position.direction)}>{formatDirection(position.direction, copy)}</span>
            <span className={isDarkTheme ? "rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-slate-300" : "rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"}>{position.leverage}x</span>
          </div>
          <div className={isDarkTheme ? "mt-1 truncate text-[11px] text-slate-500" : "mt-1 truncate text-[11px] text-slate-500"}>
            {panelCopy.entry} {formatPrice(position.entry_price)} · {panelCopy.mark} {formatPrice(position.current_price)}
          </div>
          <div className={isDarkTheme ? "mt-1 truncate text-[10px] font-medium text-slate-500" : "mt-1 truncate text-[10px] font-medium text-slate-400"}>
            {panelCopy.quantity} {formatQuantity(position.quantity)} · {panelCopy.notional} {formatCurrency(position.notional_value)} · {formatPercent(position.position_size_ratio)}
          </div>
        </div>
        <div className="shrink-0 pl-1 text-right">
          <div className={getPnlClassName(isDarkTheme, pnlToneValue, pnlColorMode)}>{formatSignedCurrency(unrealizedPnlAmount)}</div>
          <div className={getPnlRatioClassName(isDarkTheme, position.unrealized_pnl, pnlColorMode)}>{formatSignedPercent(position.unrealized_pnl)}</div>
        </div>
      </div>
    </button>
  );
}

function TopSignalsStateCard({ isDarkTheme, message, statusText, title, tone }: { isDarkTheme: boolean; message: string; statusText?: string; title: string; tone: "loading" | "pending" | "risk" }) {
  const cardClassName = getTopSignalStateCardClassName(isDarkTheme, tone);

  return (
    <div className="signal-card-scene">
      <div className={cardClassName}>
        <div className="relative z-10 p-4">
          <div className={isDarkTheme ? "text-sm font-black text-slate-50" : "text-sm font-black text-slate-950"}>{title}</div>
          <p className={isDarkTheme ? "mt-2 text-xs leading-5 text-slate-400" : "mt-2 text-xs leading-5 text-slate-600"}>{message}</p>
          {statusText ? <div className={isDarkTheme ? "mt-3 text-[11px] font-medium text-rose-300" : "mt-3 text-[11px] font-medium text-rose-600"}>{statusText}</div> : null}
        </div>
      </div>
    </div>
  );
}
