import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { StructuredSignal } from "@/app/_types/signal";
import type { KolSignalSourceStatus } from "./types";
import { createKolSourceWatchKey } from "@/app/_lib/workspace-watchlist";
import { ALL_DIRECTION_FILTER, ALL_KOL_FILTER, ALL_STATUS_FILTER, ALL_SYMBOL_FILTER, STATUS_FILTER_OPTIONS, type StatusFilterOption } from "./kol-panel/shared";
import { createKolStatsSummary, createUniqueOptions, createWatchedKolSourceModels, getScrollContentTop, isStatusFilterOption, isStatusStatsFilter, matchesStatusFilter } from "./kol-panel/model";
import { KolPanelFilters } from "./kol-panel/filters";
import { KolStatsSummaryPanel } from "./kol-panel/stats";
import { FilterEmptyState, KolPanelLoadingState, KolPanelSourceState, WatchedKolSources } from "./kol-panel/states";
import { KolSignalCard } from "./kol-panel/signal-card";

export function KolPanel({
  activeSignal,
  activeCardScrollBlock = "center",
  copy,
  isDarkTheme,
  paperPositionErrorsBySymbol,
  paperPositionsBySignalId,
  headerAction,
  sourceStatus,
  signals,
  variant = "desktop",
  watchlistedSourceKeys,
  onFollowRequest,
  onSourceWatchToggle,
  onSignalSelect,
}: {
  activeSignal: StructuredSignal | null;
  activeCardScrollBlock?: ScrollLogicalPosition;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  paperPositionErrorsBySymbol: Readonly<Record<string, string>>;
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>;
  headerAction?: ReactNode;
  sourceStatus: KolSignalSourceStatus;
  signals: readonly StructuredSignal[];
  variant?: "desktop" | "mobileSheet";
  watchlistedSourceKeys?: ReadonlySet<string>;
  onFollowRequest?: (signal: StructuredSignal) => void;
  onSourceWatchToggle?: (signal: StructuredSignal) => void;
  onSignalSelect: (signal: StructuredSignal) => void;
}) {
  const activeCardRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const previousCardTopsRef = useRef(new Map<string, number>());
  const previousLayoutKeyRef = useRef<string | null>(null);
  const previousSignalIdsRef = useRef(new Set<string>());
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const [flippedSignalIds, setFlippedSignalIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [symbolFilter, setSymbolFilter] = useState<string>(ALL_SYMBOL_FILTER);
  const [directionFilter, setDirectionFilter] =
    useState<string>(ALL_DIRECTION_FILTER);
  const [kolFilter, setKolFilter] = useState<string>(ALL_KOL_FILTER);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS_FILTER);
  const symbolOptions = useMemo(
    () => createUniqueOptions(signals.map((signal) => signal.symbol)),
    [signals],
  );
  const directionOptions = useMemo(
    () => createUniqueOptions(signals.map((signal) => signal.direction)),
    [signals],
  );
  const kolOptions = useMemo(
    () => createUniqueOptions(signals.map((signal) => signal.source_name)),
    [signals],
  );
  const effectiveSymbolFilter =
    symbolFilter !== ALL_SYMBOL_FILTER && symbolOptions.includes(symbolFilter)
      ? symbolFilter
      : ALL_SYMBOL_FILTER;
  const effectiveDirectionFilter =
    directionFilter !== ALL_DIRECTION_FILTER &&
    directionOptions.includes(directionFilter as StructuredSignal["direction"])
      ? directionFilter
      : ALL_DIRECTION_FILTER;
  const effectiveKolFilter =
    kolFilter !== ALL_KOL_FILTER && kolOptions.includes(kolFilter)
      ? kolFilter
      : ALL_KOL_FILTER;
  const effectiveStatusFilter: StatusFilterOption | typeof ALL_STATUS_FILTER =
    statusFilter !== ALL_STATUS_FILTER && isStatusFilterOption(statusFilter)
      ? statusFilter
      : ALL_STATUS_FILTER;
  const baseFilteredSignals = useMemo(
    () =>
      signals.filter((signal) => {
        const matchesSymbol =
          effectiveSymbolFilter === ALL_SYMBOL_FILTER ||
          signal.symbol === effectiveSymbolFilter;
        const matchesDirection =
          effectiveDirectionFilter === ALL_DIRECTION_FILTER ||
          signal.direction === effectiveDirectionFilter;
        const matchesKol =
          effectiveKolFilter === ALL_KOL_FILTER ||
          signal.source_name === effectiveKolFilter;

        return matchesSymbol && matchesDirection && matchesKol;
      }),
    [
      effectiveDirectionFilter,
      effectiveKolFilter,
      effectiveSymbolFilter,
      signals,
    ],
  );
  const visibleSignals = useMemo(
    () =>
      baseFilteredSignals.filter((signal) => {
        const matchesStatus =
          effectiveStatusFilter === ALL_STATUS_FILTER ||
          matchesStatusFilter(
            paperPositionsBySignalId[signal.id] ?? null,
            effectiveStatusFilter,
          );

        return matchesStatus;
      }),
    [baseFilteredSignals, effectiveStatusFilter, paperPositionsBySignalId],
  );
  const statsSummary = useMemo(
    () =>
      createKolStatsSummary({
        copy,
        isStatusStatsFilter: isStatusStatsFilter(effectiveStatusFilter),
        paperPositionsBySignalId,
        selectedKolName:
          effectiveKolFilter === ALL_KOL_FILTER ? null : effectiveKolFilter,
        statusFilteredSignals: visibleSignals,
        baseFilteredSignals,
      }),
    [
      baseFilteredSignals,
      copy,
      effectiveKolFilter,
      effectiveStatusFilter,
      paperPositionsBySignalId,
      visibleSignals,
    ],
  );
  const watchedSources = useMemo(
    () => createWatchedKolSourceModels(signals, watchlistedSourceKeys, paperPositionsBySignalId),
    [paperPositionsBySignalId, signals, watchlistedSourceKeys],
  );
  const visibleSignalIds = visibleSignals.map((signal) => signal.id);
  const visibleSignalLayoutKey = JSON.stringify(visibleSignalIds);

  useLayoutEffect(() => {
    const previousTops = previousCardTopsRef.current;
    const previousSignalIds = previousSignalIdsRef.current;
    const currentTops = new Map<string, number>();
    const shouldAnimateLayoutChange =
      previousLayoutKeyRef.current !== null &&
      previousLayoutKeyRef.current !== visibleSignalLayoutKey;

    for (const signalId of visibleSignalIds) {
      const element = cardRefs.current.get(signalId);
      if (!element) {
        continue;
      }

      const currentTop = getScrollContentTop(element, scrollAreaRef.current);
      const previousTop = previousTops.get(signalId);
      currentTops.set(signalId, currentTop);

      if (shouldAnimateLayoutChange && previousTop !== undefined) {
        const deltaY = previousTop - currentTop;
        if (Math.abs(deltaY) > 1) {
          element.animate(
            [
              { transform: `translateY(${deltaY}px)` },
              { transform: "translateY(0)" },
            ],
            { duration: 280, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
          );
        }
        continue;
      }

      if (shouldAnimateLayoutChange && previousSignalIds.size > 0) {
        element.animate(
          [
            { opacity: 0, transform: "translateY(-18px) scale(0.98)" },
            { opacity: 1, transform: "translateY(0) scale(1)" },
          ],
          { duration: 320, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
        );
      }
    }

    previousCardTopsRef.current = currentTops;
    previousLayoutKeyRef.current = visibleSignalLayoutKey;
    previousSignalIdsRef.current = new Set(visibleSignalIds);
  });

  useEffect(() => {
    activeCardRef.current?.scrollIntoView({
      block: activeCardScrollBlock,
      behavior: "smooth",
    });
  }, [activeCardScrollBlock, activeSignal?.id]);

  const isMobileSheet = variant === "mobileSheet";

  return (
    <aside
      className={
        isDarkTheme
          ? isMobileSheet
            ? "flex h-full min-h-0 flex-col overflow-hidden rounded-t-[28px] border border-b-0 border-white/[0.085] bg-[#181A20] shadow-[0_-18px_54px_rgba(0,0,0,0.38)]"
            : "flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#181A20]"
          : isMobileSheet
            ? "flex h-full min-h-0 flex-col overflow-hidden rounded-t-[28px] border border-b-0 border-[#D5E4EF] bg-white shadow-[0_-18px_54px_rgba(15,23,42,0.16)]"
            : "flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-[#E5EAF0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.035)]"
      }
    >
      {isMobileSheet ? (
        <div
          aria-hidden="true"
          className={
            isDarkTheme
              ? "mx-auto mt-2 h-1 w-10 rounded-full bg-white/[0.18]"
              : "mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300"
          }
        />
      ) : null}
      <div
        className={
          isDarkTheme
            ? "flex min-h-[48px] items-center justify-between gap-3 border-b border-white/[0.075] bg-white/[0.055] px-4 py-2 sm:px-5 lg:py-1.5"
            : "flex min-h-[48px] items-center justify-between gap-3 border-b border-[#E5EAF0] bg-white px-4 py-2 sm:px-5 lg:py-1.5"
        }
      >
        <div className="min-w-0">
          <h2
            className={
              isDarkTheme
                ? "text-base font-semibold tracking-tight text-slate-50"
                : "text-base font-semibold tracking-tight text-slate-950"
            }
          >
            {copy.kol.title}
          </h2>
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>
      <KolPanelFilters
        isDarkTheme={isDarkTheme}
        kolFilter={effectiveKolFilter}
        kolOptions={kolOptions}
        directionFilter={effectiveDirectionFilter}
        directionOptions={directionOptions}
        statusFilter={effectiveStatusFilter}
        statusOptions={STATUS_FILTER_OPTIONS}
        symbolFilter={effectiveSymbolFilter}
        symbolOptions={symbolOptions}
        copy={copy}
        onKolFilterChange={setKolFilter}
        onDirectionFilterChange={setDirectionFilter}
        onStatusFilterChange={setStatusFilter}
        onSymbolFilterChange={setSymbolFilter}
      />
      {statsSummary ? (
        <KolStatsSummaryPanel
          isDarkTheme={isDarkTheme}
          summary={statsSummary}
        />
      ) : null}
      <div
        ref={scrollAreaRef}
        className={
          isDarkTheme
            ? "kol-scroll-area kol-scroll-area-dark mr-2 min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#12161D] pb-3 pl-3 pr-1 pt-2"
            : "kol-scroll-area mr-2 min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#FAFBFD] pb-3 pl-3 pr-1 pt-2"
        }
      >
        {sourceStatus.isLoading && signals.length === 0 ? (
          <KolPanelLoadingState copy={copy} isDarkTheme={isDarkTheme} />
        ) : null}
        {sourceStatus.error ? (
          <KolPanelSourceState
            isDarkTheme={isDarkTheme}
            sourceTitle={copy.kol.sourceTitle}
            message={
              signals.length > 0
                ? copy.kol.sourceErrorWithCache
                : copy.kol.sourceErrorWithoutCache
            }
            statusText={`${copy.common.errorPrefix}：${sourceStatus.error}`}
            tone="risk"
          />
        ) : null}
        {!sourceStatus.isLoading && !sourceStatus.error && signals.length === 0 ? (
          <KolPanelSourceState
            isDarkTheme={isDarkTheme}
            sourceTitle={copy.kol.sourceTitle}
            message={copy.kol.noSignalsMessage}
            statusText={copy.kol.noSignalsStatus}
            tone="pending"
          />
        ) : null}
        {watchedSources.length > 0 ? (
          <WatchedKolSources
            copy={copy}
            isDarkTheme={isDarkTheme}
            sources={watchedSources}
            onSourceOpen={(source) => {
              setKolFilter(source.name);
              setSymbolFilter(ALL_SYMBOL_FILTER);
              setDirectionFilter(ALL_DIRECTION_FILTER);
              setStatusFilter(ALL_STATUS_FILTER);
              onSignalSelect(source.latestSignal);
            }}
          />
        ) : null}
        {visibleSignals.length === 0 && signals.length > 0 ? (
          <FilterEmptyState copy={copy} isDarkTheme={isDarkTheme} />
        ) : null}
        {visibleSignals.map((signal, index) => {
          const isActive = signal.id === activeSignal?.id;
          const setCardRef = (element: HTMLDivElement | null) => {
            if (element) {
              cardRefs.current.set(signal.id, element);
              if (isActive) {
                activeCardRef.current = element;
              }
              return;
            }

            cardRefs.current.delete(signal.id);
            if (isActive) {
              activeCardRef.current = null;
            }
          };

          return (
            <KolSignalCard
              key={signal.id}
              cardRef={setCardRef}
              copy={copy}
              index={index}
              isActive={isActive}
              isDarkTheme={isDarkTheme}
              isFlipped={flippedSignalIds.has(signal.id)}
              isWatchlisted={watchlistedSourceKeys?.has(createKolSourceWatchKey(signal.source_name)) ?? false}
              paperPositionError={paperPositionErrorsBySymbol[signal.symbol] ?? null}
              paperPositionRecord={paperPositionsBySignalId[signal.id] ?? null}
              signal={signal}
              onFollowRequest={onFollowRequest}
              onFlipToggle={() => {
                setFlippedSignalIds((currentSignalIds) => {
                  const nextSignalIds = new Set(currentSignalIds);
                  if (nextSignalIds.has(signal.id)) {
                    nextSignalIds.delete(signal.id);
                  } else {
                    nextSignalIds.add(signal.id);
                  }
                  return nextSignalIds;
                });
              }}
              onSelect={() => onSignalSelect(signal)}
              onSourceWatchToggle={onSourceWatchToggle}
            />
          );
        })}
      </div>
    </aside>
  );
}
