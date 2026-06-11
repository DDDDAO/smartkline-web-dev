import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { isActiveCopyTradingTrader } from "@/app/_lib/copy-trading-radar-api";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type {
  CopyTradingDirection,
  CopyTradingEvent,
  CopyTradingEventType,
  CopyTradingPosition,
  CopyTradingRadarSnapshot,
  CopyTradingRiskLevel,
  CopyTradingTrader,
} from "@/app/_types/copy-trading";
import type { KolSignalSourceStatus } from "./types";
import { FavoriteStarButton, SourceAvatar, SymbolIcon } from "./card-ui";

type TopSignalsPanelProps = {
  activeSourceId: string;
  activeTradeEventId: string;
  copy: WorkspaceCopy;
  headerAction?: ReactNode;
  isDarkTheme: boolean;
  snapshot: CopyTradingRadarSnapshot | null;
  sourceFilterId: string;
  sourceStatus: KolSignalSourceStatus;
  variant?: "desktop" | "mobileSheet";
  watchlistedSourceIds?: ReadonlySet<string>;
  onPositionSelect: (position: CopyTradingPosition) => void;
  onSourceFilterChange: (sourceId: string) => void;
  onSourceSelect: (sourceId: string) => void;
  onSourceWatchToggle?: (trader: CopyTradingTrader) => void;
  onTradeSelect: (event: CopyTradingEvent) => void;
};

type TopSignalSourceModel = {
  events: CopyTradingEvent[];
  positions: CopyTradingPosition[];
  trader: CopyTradingTrader;
};

const MAX_POSITION_ROWS_PER_SOURCE_CARD = 10;
const MAX_TRADE_EVENT_ROWS_PER_SOURCE_CARD = 24;
const SMARTKLINE_SOURCE_AVATAR_STYLE: CSSProperties = {
  backgroundImage: "url(\"/logo-mark.svg\")",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "72%",
};

export function TopSignalsPanel({
  activeSourceId,
  activeTradeEventId,
  copy,
  headerAction,
  isDarkTheme,
  snapshot,
  sourceFilterId,
  sourceStatus,
  variant = "desktop",
  watchlistedSourceIds,
  onPositionSelect,
  onSourceFilterChange,
  onSourceSelect,
  onSourceWatchToggle,
  onTradeSelect,
}: TopSignalsPanelProps) {
  const [flippedSourceIds, setFlippedSourceIds] = useState<ReadonlySet<string>>(() => new Set());
  const models = useMemo(() => createTopSignalSourceModels(snapshot), [snapshot]);
  const activeModels = useMemo(() => models.filter((model) => isActiveCopyTradingTrader(model.trader)), [models]);
  const filteredModels = useMemo(() => filterTopSignalSourceModelsBySource(activeModels, sourceFilterId), [activeModels, sourceFilterId]);
  const watchedModels = useMemo(
    () => activeModels.filter((model) => watchlistedSourceIds?.has(model.trader.trader_id)).slice(0, 8),
    [activeModels, watchlistedSourceIds],
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

      <div className={scrollClassName}>
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

              const latestEvent = model.events[0] ?? null;
              if (latestEvent) {
                onTradeSelect(latestEvent);
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
          const isLocallyFlipped = flippedSourceIds.has(model.trader.trader_id);
          const isForcedFlipped = Boolean(activeTradeEventId) && isActive && !isLocallyFlipped;
          const isFlipped = isLocallyFlipped || isForcedFlipped;
          return (
            <TopSignalSourceCard
              key={model.trader.trader_id}
              activeTradeEventId={activeTradeEventId}
              copy={copy}
              isActive={isActive}
              isDarkTheme={isDarkTheme}
              isFlipped={isFlipped}
              isWatchlisted={watchlistedSourceIds?.has(model.trader.trader_id) ?? false}
              model={model}
              onFlipToggle={() => toggleSourceFlip({
                isFlipped,
                sourceId: model.trader.trader_id,
              })}
              onPositionSelect={onPositionSelect}
              onWatchToggle={onSourceWatchToggle ? () => onSourceWatchToggle(model.trader) : undefined}
              onTradeSelect={onTradeSelect}
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
  activeTradeEventId,
  copy,
  isActive,
  isDarkTheme,
  isFlipped,
  isWatchlisted,
  model,
  onFlipToggle,
  onPositionSelect,
  onWatchToggle,
  onTradeSelect,
}: {
  activeTradeEventId: string;
  copy: WorkspaceCopy;
  isActive: boolean;
  isDarkTheme: boolean;
  isFlipped: boolean;
  isWatchlisted: boolean;
  model: TopSignalSourceModel;
  onFlipToggle: () => void;
  onPositionSelect: (position: CopyTradingPosition) => void;
  onWatchToggle?: () => void;
  onTradeSelect: (event: CopyTradingEvent) => void;
}) {
  const panelCopy = copy.workspace.topSignals;
  const cardClassName = getTopSignalCardClassName(isDarkTheme, isActive, model.positions.length > 0 ? "live" : model.events.length > 0 ? "pending" : "muted");
  const backCardClassName = getTopSignalCardBackClassName(isDarkTheme);
  const visiblePositions = model.positions.slice(0, MAX_POSITION_ROWS_PER_SOURCE_CARD);
  const visibleEvents = selectVisibleTradeEvents(model.events, activeTradeEventId);
  const hiddenPositionCount = Math.max(0, model.positions.length - visiblePositions.length);
  const hiddenEventCount = Math.max(0, model.events.length - visibleEvents.length);
  const shouldRenderFrontRows = !isFlipped;
  const shouldRenderBackRows = isFlipped;

  return (
    <div className="signal-card-scene will-change-transform">
      <div className={`signal-card-flipper ${isFlipped ? "is-flipped" : ""}`}>
        <div
          className={`${cardClassName} motion-fx-3-card-face-front signal-card-face`}
          aria-hidden={isFlipped}
        >
          <div className="motion-fx-3-front-panel relative z-10 flex min-h-[330px] flex-col p-4">
            <SourceHeader
              actionLabel={panelCopy.flipToHistory}
              copy={copy}
              isDarkTheme={isDarkTheme}
              isWatchlisted={isWatchlisted}
              model={model}
              onActionToggle={onFlipToggle}
              onWatchToggle={onWatchToggle}
            />
            <div className="mt-3 grid grid-cols-3 gap-2">
              <MetricTile isDarkTheme={isDarkTheme} label={panelCopy.currentPositions} value={String(model.positions.length)} />
              <MetricTile isDarkTheme={isDarkTheme} label={panelCopy.tradeHistory} value={String(model.events.length)} />
              <MetricTile isDarkTheme={isDarkTheme} label={panelCopy.margin} value={formatCurrency(model.trader.margin_balance)} />
            </div>
            <div className={isDarkTheme ? "mt-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3" : "mt-3 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3"}>
              <div className="flex items-center justify-between gap-3">
                <span className={isDarkTheme ? "text-xs font-bold text-slate-100" : "text-xs font-bold text-slate-900"}>{panelCopy.currentPositions}</span>
                <span className={isDarkTheme ? "text-[10px] font-medium text-slate-500" : "text-[10px] font-medium text-slate-400"}>{panelCopy.positionHint}</span>
              </div>
              <div className="mt-2 grid gap-2">
                {model.positions.length > 0 && shouldRenderFrontRows ? (
                  <div className="kol-scroll-area grid max-h-[246px] gap-2 overflow-x-hidden overflow-y-auto pr-1">
                    {visiblePositions.map((position) => (
                      <PositionRow
                        key={position.position_id}
                        copy={copy}
                        isDarkTheme={isDarkTheme}
                        position={position}
                        onPositionSelect={onPositionSelect}
                      />
                    ))}
                    {hiddenPositionCount > 0 ? (
                      <RowLimitNotice
                        isDarkTheme={isDarkTheme}
                        text={panelCopy.visiblePositionsNotice(visiblePositions.length, model.positions.length)}
                      />
                    ) : null}
                  </div>
                ) : model.positions.length > 0 ? null : (
                  <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-[#181A20] px-3 py-3 text-xs text-slate-400" : "rounded-2xl border border-[#E5EAF0] bg-white px-3 py-3 text-xs text-slate-500"}>
                    {model.events.length > 0 ? panelCopy.historyOnly : panelCopy.noPositions}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          className={`${backCardClassName} motion-fx-3-card-face-back signal-card-face signal-card-back`}
          aria-hidden={!isFlipped}
        >
          <div className="motion-fx-3-back-panel relative z-10 flex min-h-[330px] flex-col p-4">
            <SourceHeader
              actionLabel={panelCopy.flipToPositions}
              copy={copy}
              isDarkTheme={isDarkTheme}
              isWatchlisted={isWatchlisted}
              model={model}
              onActionToggle={onFlipToggle}
              onWatchToggle={onWatchToggle}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className={isDarkTheme ? "text-xs font-bold text-slate-100" : "text-xs font-bold text-slate-900"}>{panelCopy.tradeHistory}</span>
              <span className={isDarkTheme ? "text-[10px] font-medium text-slate-500" : "text-[10px] font-medium text-slate-400"}>{panelCopy.tradeHint}</span>
            </div>
            {shouldRenderBackRows ? (
              <div className="mt-2 grid max-h-[232px] gap-2 overflow-y-auto pr-1">
                {model.events.length > 0 ? visibleEvents.map((event) => (
                <TradeEventRow
                  key={event.event_id}
                  copy={copy}
                  event={event}
                  isActive={event.event_id === activeTradeEventId}
                  isDarkTheme={isDarkTheme}
                  onTradeSelect={onTradeSelect}
                />
                )) : (
                  <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-[#181A20] px-3 py-3 text-xs text-slate-400" : "rounded-2xl border border-[#E5EAF0] bg-white px-3 py-3 text-xs text-slate-500"}>
                    {panelCopy.noTrades}
                  </div>
                )}
                {hiddenEventCount > 0 ? (
                  <RowLimitNotice
                    isDarkTheme={isDarkTheme}
                    text={panelCopy.visibleTradesNotice(visibleEvents.length, model.events.length)}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function selectVisibleTradeEvents(
  events: readonly CopyTradingEvent[],
  activeTradeEventId: string,
): CopyTradingEvent[] {
  const visibleEvents = events.slice(0, MAX_TRADE_EVENT_ROWS_PER_SOURCE_CARD);
  if (!activeTradeEventId || visibleEvents.some((event) => event.event_id === activeTradeEventId)) {
    return visibleEvents;
  }

  const activeEvent = events.find((event) => event.event_id === activeTradeEventId);
  return activeEvent ? [...visibleEvents, activeEvent] : visibleEvents;
}

function RowLimitNotice({ isDarkTheme, text }: { isDarkTheme: boolean; text: string }) {
  const className = isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-[11px] font-medium text-slate-500"
    : "rounded-2xl border border-[#E5EAF0] bg-white px-3 py-2 text-[11px] font-medium text-slate-500";

  return <div className={className}>{text}</div>;
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
  const actionButtonClassName = isDarkTheme
    ? "inline-flex h-8 shrink-0 items-center rounded-full border border-sky-400/20 bg-sky-400/10 px-3 text-[11px] font-bold text-sky-200 transition hover:bg-sky-400/15"
    : "inline-flex h-8 shrink-0 items-center rounded-full border border-[#B7E8FC] bg-[#EAF8FE] px-3 text-[11px] font-bold text-[#008DCC] transition hover:bg-[#DDF4FF]";

  return (
    <div className="flex min-w-0 items-start gap-3">
      <SourceAvatar isDarkTheme={isDarkTheme} name={model.trader.name} url={model.trader.avatar} />
      <div className="min-w-0 flex-1">
        <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
          <h3 className={isDarkTheme ? "min-w-0 flex-1 truncate text-sm font-black leading-5 text-slate-50" : "min-w-0 flex-1 truncate text-sm font-black leading-5 text-slate-950"}>{model.trader.name}</h3>
          {onActionToggle && actionLabel ? (
            <button
              className={actionButtonClassName}
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
        </div>
        <div className={isDarkTheme ? "mt-0.5 flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold leading-none text-slate-500" : "mt-0.5 flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold leading-none text-slate-500"}>
          <span className="min-w-0 truncate">{panelCopy.signalType}: {model.trader.platform}</span>
          {onWatchToggle ? (
            <FavoriteStarButton
              activeLabel={copy.workspace.watchlist.removeFavorite}
              inactiveLabel={copy.workspace.watchlist.addFavorite}
              isActive={isWatchlisted}
              isDarkTheme={isDarkTheme}
              onToggle={onWatchToggle}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PositionRow({ copy, isDarkTheme, position, onPositionSelect }: { copy: WorkspaceCopy; isDarkTheme: boolean; position: CopyTradingPosition; onPositionSelect: (position: CopyTradingPosition) => void }) {
  const panelCopy = copy.workspace.topSignals;
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
            {panelCopy.quantity} {formatQuantity(position.quantity)} · {panelCopy.notional} {formatCurrency(position.notional_value)}
          </div>
        </div>
        <div className="shrink-0 pl-1 text-right">
          <div className={getPnlClassName(isDarkTheme, position.unrealized_pnl)}>{formatSignedPercent(position.unrealized_pnl)}</div>
          <div className={isDarkTheme ? "mt-1 text-[10px] text-slate-500" : "mt-1 text-[10px] text-slate-400"}>{formatPercent(position.position_size_ratio)}</div>
        </div>
      </div>
    </button>
  );
}

function TradeEventRow({ copy, event, isActive, isDarkTheme, onTradeSelect }: { copy: WorkspaceCopy; event: CopyTradingEvent; isActive: boolean; isDarkTheme: boolean; onTradeSelect: (event: CopyTradingEvent) => void }) {
  const panelCopy = copy.workspace.topSignals;
  const rowClassName = getTradeEventRowClassName(isDarkTheme, isActive, event.severity);

  return (
    <button
      className={rowClassName}
      type="button"
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        onTradeSelect(event);
      }}
    >
      <div className="flex items-start justify-between gap-3 text-left">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={getEventBadgeClassName(isDarkTheme, event.severity)}>{formatEventType(event.event_type, copy)}</span>
            <span className={getDirectionBadgeClassName(isDarkTheme, event.direction)}>{formatDirection(event.direction, copy)}</span>
            <span className={isDarkTheme ? "text-[10px] font-medium text-slate-500" : "text-[10px] font-medium text-slate-400"}>{formatDisplayTime(event.occurred_at)}</span>
          </div>
          <div className={isDarkTheme ? "mt-1 truncate text-xs font-black text-slate-50" : "mt-1 truncate text-xs font-black text-slate-950"}>{event.symbol}</div>
          <p className={isDarkTheme ? "mt-1 max-h-8 overflow-hidden text-[11px] leading-4 text-slate-400" : "mt-1 max-h-8 overflow-hidden text-[11px] leading-4 text-slate-600"}>{event.summary}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className={isDarkTheme ? "text-xs font-black text-slate-100" : "text-xs font-black text-slate-900"}>{formatPrice(event.event_price)}</div>
          <div className={isDarkTheme ? "mt-1 text-[10px] text-slate-500" : "mt-1 text-[10px] text-slate-400"}>{panelCopy.price}</div>
        </div>
      </div>
    </button>
  );
}

function MetricTile({ isDarkTheme, label, value }: { isDarkTheme: boolean; label: string; value: string }) {
  return (
    <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-[#181A20] px-3 py-2" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2"}>
      <div className={isDarkTheme ? "text-[10px] font-semibold text-slate-500" : "text-[10px] font-semibold text-slate-400"}>{label}</div>
      <div className={isDarkTheme ? "mt-1 truncate text-xs font-black text-slate-100" : "mt-1 truncate text-xs font-black text-slate-950"}>{value}</div>
    </div>
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

function createTopSignalSourceModels(snapshot: CopyTradingRadarSnapshot | null): TopSignalSourceModel[] {
  if (!snapshot) {
    return [];
  }

  const positionsByTrader = groupBy(snapshot.positions, (position) => position.trader_id);
  const eventsByTrader = groupBy(snapshot.events, (event) => event.trader_id);

  return snapshot.traders
    .map((trader) => ({
      trader,
      positions: (positionsByTrader.get(trader.trader_id) ?? []).slice().sort(comparePositions),
      events: (eventsByTrader.get(trader.trader_id) ?? []).slice().sort(compareEventsDesc),
    }))
    .sort(compareSourceModels);
}

function filterTopSignalSourceModelsBySource(models: readonly TopSignalSourceModel[], sourceId: string): TopSignalSourceModel[] {
  if (sourceId === "all" || !models.some((model) => model.trader.trader_id === sourceId)) {
    return [...models];
  }

  return models.filter((model) => model.trader.trader_id === sourceId);
}

function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function compareSourceModels(left: TopSignalSourceModel, right: TopSignalSourceModel): number {
  if (left.positions.length !== right.positions.length) {
    return right.positions.length - left.positions.length;
  }

  const leftLatestTime = getLatestEventTime(left.events);
  const rightLatestTime = getLatestEventTime(right.events);
  if (leftLatestTime !== rightLatestTime) {
    return rightLatestTime - leftLatestTime;
  }

  return left.trader.name.localeCompare(right.trader.name);
}

function comparePositions(left: CopyTradingPosition, right: CopyTradingPosition): number {
  if (left.position_size_ratio !== right.position_size_ratio) {
    return right.position_size_ratio - left.position_size_ratio;
  }
  return left.symbol.localeCompare(right.symbol);
}

function compareEventsDesc(left: CopyTradingEvent, right: CopyTradingEvent): number {
  return Date.parse(right.occurred_at) - Date.parse(left.occurred_at);
}

function getLatestEventTime(events: readonly CopyTradingEvent[]): number {
  return events.reduce((latest, event) => Math.max(latest, Date.parse(event.occurred_at) || 0), 0);
}

function getTopSignalCardClassName(isDarkTheme: boolean, isActive: boolean, tone: "live" | "muted" | "pending"): string {
  const surfaceClassName = isDarkTheme ? "signal-card-surface-dark" : "signal-card-surface-light";
  const toneClassName = tone === "live" ? "signal-card-left-live" : tone === "pending" ? "signal-card-left-pending" : "signal-card-left-muted";
  const activeClassName = isActive ? " signal-card-left-active" : "";
  const themeClassName = isDarkTheme
    ? "relative min-h-[330px] cursor-pointer overflow-hidden rounded-[22px] border border-white/[0.075] bg-[#181A20] text-slate-100 transition hover:border-sky-500/30"
    : "relative min-h-[330px] cursor-pointer overflow-hidden rounded-[22px] border border-[#E5EAF0] bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.035)] transition hover:border-[#B7E8FC]";

  return `${themeClassName} signal-card-left-status ${surfaceClassName} ${toneClassName}${activeClassName}`;
}

function getTopSignalCardBackClassName(isDarkTheme: boolean): string {
  const surfaceClassName = isDarkTheme ? "signal-card-surface-dark" : "signal-card-surface-light";
  const themeClassName = isDarkTheme
    ? "relative min-h-[330px] cursor-pointer overflow-hidden rounded-[22px] border border-white/[0.075] bg-[#181A20] text-slate-100"
    : "relative min-h-[330px] cursor-pointer overflow-hidden rounded-[22px] border border-[#E5EAF0] bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.035)]";

  return `${themeClassName} signal-card-left-status ${surfaceClassName} signal-card-left-live`;
}

function getTopSignalStateCardClassName(isDarkTheme: boolean, tone: "loading" | "pending" | "risk"): string {
  const surfaceClassName = isDarkTheme ? "signal-card-surface-dark" : "signal-card-surface-light";
  const toneClassName = tone === "loading" ? "signal-card-left-loading" : tone === "risk" ? "signal-card-left-risk" : "signal-card-left-pending";
  const themeClassName = isDarkTheme
    ? "relative overflow-hidden rounded-[22px] border border-white/[0.075] bg-[#181A20] text-slate-100"
    : "relative overflow-hidden rounded-[22px] border border-[#E5EAF0] bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.035)]";

  return `${themeClassName} signal-card-left-status ${surfaceClassName} ${toneClassName}`;
}

function getStatusBadgeClassName(isDarkTheme: boolean, tone: "live" | "loading" | "risk"): string {
  if (tone === "risk") {
    return isDarkTheme ? "rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-200" : "rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700";
  }

  if (tone === "loading") {
    return isDarkTheme ? "rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-bold text-sky-200" : "rounded-full bg-[#EAF8FE] px-2 py-0.5 text-[10px] font-bold text-[#008DCC]";
  }

  return isDarkTheme ? "rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200" : "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700";
}

function getDirectionBadgeClassName(isDarkTheme: boolean, direction: CopyTradingDirection): string {
  if (direction === "long") {
    return isDarkTheme ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-300" : "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700";
  }

  return isDarkTheme ? "rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-black text-rose-300" : "rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700";
}

function getRiskBadgeClassName(isDarkTheme: boolean, riskLevel: CopyTradingRiskLevel): string {
  if (riskLevel === "high") {
    return isDarkTheme ? "rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-200" : "rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700";
  }

  if (riskLevel === "medium") {
    return isDarkTheme ? "rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-200" : "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700";
  }

  return isDarkTheme ? "rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-bold text-sky-200" : "rounded-full bg-[#EAF8FE] px-2 py-0.5 text-[10px] font-bold text-[#008DCC]";
}

function getEventBadgeClassName(isDarkTheme: boolean, riskLevel: CopyTradingRiskLevel): string {
  return getRiskBadgeClassName(isDarkTheme, riskLevel);
}

function getTradeEventRowClassName(isDarkTheme: boolean, isActive: boolean, riskLevel: CopyTradingRiskLevel): string {
  const activeClassName = isActive ? (isDarkTheme ? " border-sky-400/40 bg-sky-400/10" : " border-[#B7E8FC] bg-[#F4FBFF]") : "";
  const riskClassName = riskLevel === "high" ? (isDarkTheme ? " hover:border-rose-400/40" : " hover:border-rose-200") : "";
  const baseClassName = isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-[#181A20] px-3 py-2 transition hover:bg-white/[0.055]"
    : "rounded-2xl border border-[#E5EAF0] bg-white px-3 py-2 transition hover:bg-[#F8FAFC]";

  return `${baseClassName}${activeClassName}${riskClassName}`;
}

function getPnlClassName(isDarkTheme: boolean, value: number): string {
  if (value > 0) {
    return isDarkTheme ? "text-xs font-black text-emerald-300" : "text-xs font-black text-emerald-600";
  }

  if (value < 0) {
    return isDarkTheme ? "text-xs font-black text-rose-300" : "text-xs font-black text-rose-600";
  }

  return isDarkTheme ? "text-xs font-black text-slate-300" : "text-xs font-black text-slate-600";
}

function formatDirection(direction: CopyTradingDirection, copy: WorkspaceCopy): string {
  return direction === "long" ? copy.kol.directionShort.long : copy.kol.directionShort.short;
}

function formatEventType(eventType: CopyTradingEventType, copy: WorkspaceCopy): string {
  return copy.workspace.topSignals.eventTypes[eventType] ?? eventType;
}

function formatCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return `$${formatCompactNumber(value)}`;
}

function formatPrice(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const maximumFractionDigits = Math.abs(value) >= 1_000 ? 2 : Math.abs(value) >= 1 ? 4 : 6;
  return value.toLocaleString("en-US", { maximumFractionDigits });
}

function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function formatCompactNumber(value: number): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Math.abs(value) >= 1_000 ? 0 : 2,
  });
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return "--";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${(value * 100).toFixed(2)}%`;
}

function formatDisplayTime(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value.replace("T", " ").slice(0, 16);
  }

  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const hours = String(parsedDate.getHours()).padStart(2, "0");
  const minutes = String(parsedDate.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hours}:${minutes}`;
}
