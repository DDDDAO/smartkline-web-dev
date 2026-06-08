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
import type { MarketSymbol } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";
import type { KolSignalSourceStatus } from "./types";
import {
  SignalField,
  SourceAvatar,
  SymbolIcon,
  TelegramSignalMessage,
} from "./card-ui";
import {
  PaperPositionSummary,
  getPaperPositionBadgeClass,
  formatSignalPaperPositionStatus,
  getSignalDirectionBadgeClass,
  getSignalPaperPositionBadgeClass,
} from "./paper-position-summary";

const ALL_SYMBOL_FILTER = "__all_symbols__";
const ALL_DIRECTION_FILTER = "__all_directions__";
const ALL_KOL_FILTER = "__all_kols__";
const ALL_STATUS_FILTER = "__all_statuses__";
const STATUS_FILTER_OPTIONS = [
  "closed",
  "entered",
  "not-entered",
  "take-profit",
  "stop-loss",
] as const;
const KOL_STATS_SAMPLE_LIMIT = 20;
const KOL_STATS_GROUP_LIMIT = 4;

type StatusFilterOption = (typeof STATUS_FILTER_OPTIONS)[number];

type KolStatsSummaryModel = {
  groups: KolStatsGroupModel[];
  metrics: KolStatsMetricModel[];
  meta: string;
  title: string;
};

type KolStatsGroupModel = {
  closedText: string;
  exitBreakdownText: string;
  kolName: string;
  totalPnlText: string;
  totalPnlTone?: "default" | "negative" | "positive";
};

type KolStatsMetricModel = {
  label: string;
  tone?: "default" | "negative" | "positive";
  value: string;
};

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
        {visibleSignals.length === 0 && signals.length > 0 ? (
          <FilterEmptyState copy={copy} isDarkTheme={isDarkTheme} />
        ) : null}
        {visibleSignals.map((signal, index) => {
          const entryText = formatKolEntryText(signal, copy);
          const paperPositionError =
            paperPositionErrorsBySymbol[signal.symbol] ?? null;
          const paperPositionRecord =
            paperPositionsBySignalId[signal.id] ?? null;
          const takeProfitText = formatTakeProfitText(signal.take_profit, copy);
          const isActive = signal.id === activeSignal?.id;
          const isFlipped = flippedSignalIds.has(signal.id);
          const cardClassName = getSignalCardClassName({
            isActive,
            isDarkTheme,
            paperPositionRecord,
          });
          const backCardClassName = getSignalCardBackClassName(isDarkTheme);
          const rawButtonClassName = isDarkTheme
            ? "motion-fx-3-raw-button inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-slate-400 transition hover:bg-white/[0.08] hover:text-sky-300"
            : "motion-fx-3-raw-button inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-slate-400 transition hover:bg-[#EAF8FE] hover:text-[#008DCC]";
          const handleSelect = () => {
            onSignalSelect(signal);
          };
          const toggleFlip = () => {
            setFlippedSignalIds((currentSignalIds) => {
              const nextSignalIds = new Set(currentSignalIds);
              if (nextSignalIds.has(signal.id)) {
                nextSignalIds.delete(signal.id);
              } else {
                nextSignalIds.add(signal.id);
              }

              return nextSignalIds;
            });
          };
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
            <div
              key={signal.id}
              ref={setCardRef}
              className="signal-card-scene will-change-transform"
              data-guide-target={index === 0 ? "kol-first-card" : undefined}
            >
              <div
                className={`signal-card-flipper ${isFlipped ? "is-flipped" : ""}`}
              >
                <div
                  className={`${cardClassName} motion-fx-3-card-face-front signal-card-face`}
                  role="button"
                  tabIndex={0}
                  onClick={handleSelect}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleSelect();
                    }
                  }}
                >
                  <div className="motion-fx-3-front-panel flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <SourceAvatar
                        isDarkTheme={isDarkTheme}
                        name={signal.source_name}
                        url={signal.source_avatar_url}
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className={
                            isDarkTheme
                              ? "truncate text-sm font-semibold text-slate-50"
                              : "truncate text-sm font-semibold text-slate-950"
                          }
                        >
                          {signal.source_name}
                        </div>
                        <div
                          className={
                            isDarkTheme
                              ? "mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-400"
                              : "mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500"
                          }
                        >
                          <span className="min-w-0 truncate whitespace-nowrap">
                            {formatSignalDisplayTime(signal)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      className={rawButtonClassName}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFlip();
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <span>{copy.kol.viewSource}</span>
                      <ChevronRightIcon />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span
                      className={
                        isDarkTheme
                          ? "inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-1 text-slate-200"
                          : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700"
                      }
                    >
                      <SymbolIcon symbol={signal.symbol} />
                      {formatSymbolLabel(signal.symbol)}
                    </span>
                    <span
                      className={getSignalDirectionBadgeClass(
                        isDarkTheme,
                        signal.direction,
                      )}
                    >
                      {copy.kol.directionShort[signal.direction]}
                    </span>
                    <span
                      className={getSignalPaperPositionBadgeClass(
                        isDarkTheme,
                        paperPositionRecord,
                      )}
                    >
                      {formatSignalPaperPositionStatus(
                        paperPositionRecord,
                        paperPositionError,
                        copy.paper,
                      )}
                    </span>
                  </div>

                  <div className="signal-card-field-layer mt-3 grid grid-cols-2 gap-2 text-xs">
                    <SignalField
                      isDarkTheme={isDarkTheme}
                      label={copy.kol.entry}
                      value={entryText}
                    />
                    <SignalField
                      isDarkTheme={isDarkTheme}
                      label={copy.kol.stopLoss}
                      value={signal.stop_loss?.toLocaleString("en-US") ?? "--"}
                    />
                    <SignalField
                      isDarkTheme={isDarkTheme}
                      label={copy.kol.takeProfit}
                      value={takeProfitText}
                    />
                    <SignalField
                      isDarkTheme={isDarkTheme}
                      label={copy.kol.condition}
                      value={signal.confirmation ?? copy.kol.conditionFallback}
                    />
                  </div>

                  <PaperPositionSummary
                    copy={copy.paper}
                    error={paperPositionError}
                    isActive={isActive}
                    isDarkTheme={isDarkTheme}
                    record={paperPositionRecord}
                  />
                </div>
                <div
                  className={`${backCardClassName} motion-fx-3-card-face-back signal-card-face signal-card-back`}
                >
                  <div className="motion-fx-3-back-panel flex h-full min-h-0 flex-col">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div
                        className={
                          isDarkTheme
                            ? "text-sm font-bold text-slate-50"
                            : "text-sm font-bold text-slate-950"
                        }
                      >
                        {copy.kol.replayTitle}
                      </div>
                      <button
                        className={rawButtonClassName}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFlip();
                        }}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <span>{copy.kol.back}</span>
                        <ChevronRightIcon />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                      <TelegramSignalMessage
                        copy={copy.kol}
                        isDarkTheme={isDarkTheme}
                        signal={signal}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function KolPanelFilters({
  copy,
  directionFilter,
  directionOptions,
  isDarkTheme,
  kolFilter,
  kolOptions,
  statusFilter,
  statusOptions,
  symbolFilter,
  symbolOptions,
  onDirectionFilterChange,
  onKolFilterChange,
  onStatusFilterChange,
  onSymbolFilterChange,
}: {
  copy: WorkspaceCopy;
  directionFilter: string;
  directionOptions: readonly StructuredSignal["direction"][];
  isDarkTheme: boolean;
  kolFilter: string;
  kolOptions: readonly string[];
  statusFilter: string;
  statusOptions: readonly StatusFilterOption[];
  symbolFilter: string;
  symbolOptions: readonly MarketSymbol[];
  onDirectionFilterChange: (value: string) => void;
  onKolFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSymbolFilterChange: (value: string) => void;
}) {
  const containerClassName = isDarkTheme
    ? "bg-[#12161D] px-3 pb-2 pt-3"
    : "bg-[#FAFBFD] px-3 pb-2 pt-3";
  const [openFilter, setOpenFilter] = useState<
    "kol" | "direction" | "status" | "symbol" | null
  >(null);

  return (
    <div className={containerClassName}>
      <div className="grid grid-cols-2 gap-2">
        <FilterDropdown
          id="kol-source-filter"
          allLabel={ALL_KOL_FILTER}
          allText={copy.common.all}
          isOpen={openFilter === "kol"}
          isDarkTheme={isDarkTheme}
          label={copy.kol.filters.kol}
          options={kolOptions}
          value={kolFilter}
          onOpenChange={(isOpen) => setOpenFilter(isOpen ? "kol" : null)}
          onChange={onKolFilterChange}
        />
        <FilterDropdown
          id="kol-direction-filter"
          allLabel={ALL_DIRECTION_FILTER}
          allText={copy.common.all}
          isOpen={openFilter === "direction"}
          isDarkTheme={isDarkTheme}
          label={copy.kol.direction}
          options={directionOptions}
          value={directionFilter}
          optionLabel={(direction) => formatDirectionLabel(direction, copy)}
          renderIcon={(option) =>
            option === ALL_DIRECTION_FILTER ? null : (
              <DirectionFilterDot
                direction={option as StructuredSignal["direction"]}
              />
            )
          }
          onOpenChange={(isOpen) => setOpenFilter(isOpen ? "direction" : null)}
          onChange={onDirectionFilterChange}
        />
        <FilterDropdown
          id="kol-status-filter"
          allLabel={ALL_STATUS_FILTER}
          allText={copy.common.all}
          isOpen={openFilter === "status"}
          isDarkTheme={isDarkTheme}
          label={copy.kol.filters.status}
          options={statusOptions}
          value={statusFilter}
          optionLabel={(status) => formatStatusFilterLabel(status, copy)}
          renderIcon={(option) =>
            option === ALL_STATUS_FILTER ? null : (
              <StatusFilterDot status={option as StatusFilterOption} />
            )
          }
          onOpenChange={(isOpen) => setOpenFilter(isOpen ? "status" : null)}
          onChange={onStatusFilterChange}
        />
        <FilterDropdown
          id="kol-symbol-filter"
          allLabel={ALL_SYMBOL_FILTER}
          allText={copy.common.all}
          isOpen={openFilter === "symbol"}
          isDarkTheme={isDarkTheme}
          label={copy.kol.filters.symbol}
          options={symbolOptions}
          value={symbolFilter}
          optionLabel={formatSymbolFilterLabel}
          renderIcon={(option) =>
            option === ALL_SYMBOL_FILTER ? null : (
              <SymbolIcon size="md" symbol={option} />
            )
          }
          onOpenChange={(isOpen) => setOpenFilter(isOpen ? "symbol" : null)}
          onChange={onSymbolFilterChange}
        />
      </div>
    </div>
  );
}

function KolStatsSummaryPanel({
  isDarkTheme,
  summary,
}: {
  isDarkTheme: boolean;
  summary: KolStatsSummaryModel;
}) {
  const containerClassName = isDarkTheme
    ? "bg-[#12161D] px-3 pb-2"
    : "bg-[#FAFBFD] px-3 pb-2";
  const panelClassName = isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2.5"
    : "rounded-2xl border border-[#E5EAF0] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.025)]";
  const titleClassName = isDarkTheme
    ? "min-w-0 truncate text-[11px] font-semibold text-slate-200"
    : "min-w-0 truncate text-[11px] font-semibold text-slate-700";
  const metaClassName = isDarkTheme
    ? "shrink-0 text-[10px] font-medium text-slate-500"
    : "shrink-0 text-[10px] font-medium text-slate-400";

  return (
    <div className={containerClassName}>
      <div className={panelClassName}>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className={titleClassName}>{summary.title}</div>
          <div className={metaClassName}>{summary.meta}</div>
        </div>
        {summary.groups.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {summary.groups.map((group) => (
              <KolStatsGroupRow
                key={group.kolName}
                group={group}
                isDarkTheme={isDarkTheme}
              />
            ))}
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {summary.metrics.map((metric) => (
              <KolStatsMetric
                key={metric.label}
                isDarkTheme={isDarkTheme}
                metric={metric}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KolStatsGroupRow({
  group,
  isDarkTheme,
}: {
  group: KolStatsGroupModel;
  isDarkTheme: boolean;
}) {
  const rowClassName = isDarkTheme
    ? "grid grid-cols-[minmax(0,1fr)_42px_50px_58px] items-center gap-2 rounded-xl bg-white/[0.035] px-2 py-1.5"
    : "grid grid-cols-[minmax(0,1fr)_42px_50px_58px] items-center gap-2 rounded-xl bg-slate-50 px-2 py-1.5";
  const nameClassName = isDarkTheme
    ? "truncate text-[11px] font-semibold text-slate-200"
    : "truncate text-[11px] font-semibold text-slate-700";
  const mutedClassName = isDarkTheme
    ? "truncate text-right text-[10px] font-medium text-slate-500"
    : "truncate text-right text-[10px] font-medium text-slate-400";
  const totalClassName = getKolStatsMetricValueClassName(
    isDarkTheme,
    group.totalPnlTone,
  );

  return (
    <div className={rowClassName}>
      <div className={nameClassName}>{group.kolName}</div>
      <div className={mutedClassName}>{group.closedText}</div>
      <div className={mutedClassName}>{group.exitBreakdownText}</div>
      <div className={`${totalClassName} text-right`}>{group.totalPnlText}</div>
    </div>
  );
}

function KolStatsMetric({
  isDarkTheme,
  metric,
}: {
  isDarkTheme: boolean;
  metric: KolStatsMetricModel;
}) {
  const labelClassName = isDarkTheme
    ? "truncate text-[10px] leading-4 text-slate-500"
    : "truncate text-[10px] leading-4 text-slate-400";
  const valueClassName = getKolStatsMetricValueClassName(
    isDarkTheme,
    metric.tone,
  );

  return (
    <div className="min-w-0">
      <div className={labelClassName}>{metric.label}</div>
      <div className={valueClassName}>{metric.value}</div>
    </div>
  );
}

function FilterDropdown<T extends string>({
  allLabel,
  allText,
  id,
  isOpen,
  isDarkTheme,
  label,
  optionLabel = (value) => value,
  options,
  renderIcon,
  value,
  onOpenChange,
  onChange,
}: {
  allLabel: string;
  allText: string;
  id: string;
  isOpen: boolean;
  isDarkTheme: boolean;
  label: string;
  optionLabel?: (value: T) => string;
  options: readonly T[];
  renderIcon?: (value: string) => ReactNode;
  value: string;
  onOpenChange: (isOpen: boolean) => void;
  onChange: (value: string) => void;
}) {
  const buttonClassName = isDarkTheme
    ? "inline-flex h-7 w-full min-w-0 items-center gap-1 rounded-full border border-white/[0.075] bg-white/[0.035] px-2 text-xs font-medium text-slate-200 outline-none transition hover:border-sky-500/40 hover:bg-white/[0.08] focus-visible:border-[#00A6F4]"
    : "inline-flex h-7 w-full min-w-0 items-center gap-1 rounded-full border border-[#E5EAF0] bg-white px-2 text-xs font-medium text-slate-700 outline-none transition hover:border-[#B7E8FC] hover:bg-[#EAF8FE] focus-visible:border-[#00A6F4]";
  const menuClassName = isDarkTheme
    ? "motion-fx-9-surface absolute left-0 top-9 z-50 min-w-[150px] max-w-[260px] overflow-hidden rounded-2xl border border-white/[0.075] bg-[#181A20] p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.28)]"
    : "motion-fx-9-surface absolute left-0 top-9 z-50 min-w-[150px] max-w-[260px] overflow-hidden rounded-2xl border border-[#E5EAF0] bg-white p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.12)]";
  const optionClassName = (isSelected: boolean) =>
    isSelected
      ? isDarkTheme
        ? "flex h-8 w-full items-center gap-2 rounded-xl bg-[#00A6F4]/15 px-2 text-left text-[11px] font-semibold text-sky-200"
        : "flex h-8 w-full items-center gap-2 rounded-xl bg-[#EAF8FE] px-2 text-left text-[11px] font-semibold text-[#007DB8]"
      : isDarkTheme
        ? "flex h-8 w-full items-center gap-2 rounded-xl px-2 text-left text-[11px] font-medium text-slate-300 transition hover:bg-white/[0.08]"
        : "flex h-8 w-full items-center gap-2 rounded-xl px-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50";
  const selectedText = value === allLabel ? allText : optionLabel(value as T);
  const allOptions = [allLabel, ...options];

  return (
    <div
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onOpenChange(false);
        }
      }}
    >
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={buttonClassName}
        id={id}
        type="button"
        onClick={() => onOpenChange(!isOpen)}
      >
        <span
          className={
            isDarkTheme ? "shrink-0 text-slate-500" : "shrink-0 text-slate-400"
          }
        >
          {label}
        </span>
        {renderIcon?.(value)}
        <span className="min-w-0 flex-1 truncate text-left whitespace-nowrap">
          {selectedText}
        </span>
        <svg
          aria-hidden="true"
          className={`h-3 w-3 shrink-0 transition ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="m7 10 5 5 5-5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </button>
      {isOpen ? (
        <div
          aria-labelledby={id}
          className={menuClassName}
          role="listbox"
          tabIndex={-1}
        >
          {allOptions.map((option) => {
            const isSelected = option === value;
            return (
              <button
                key={option}
                aria-selected={isSelected}
                className={optionClassName(isSelected)}
                role="option"
                type="button"
                onClick={() => {
                  onChange(option);
                  onOpenChange(false);
                }}
              >
                {renderIcon?.(option)}
                <span className="min-w-0 truncate">
                  {option === allLabel ? allText : optionLabel(option as T)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function DirectionFilterDot({
  direction,
}: {
  direction: StructuredSignal["direction"];
}) {
  return (
    <span
      className={
        direction === "long"
          ? "h-2 w-2 shrink-0 rounded-full bg-[#72D4B0]"
          : "h-2 w-2 shrink-0 rounded-full bg-[#F08A92]"
      }
    />
  );
}

function StatusFilterDot({ status }: { status: StatusFilterOption }) {
  const colorClassName =
    status === "entered"
      ? "bg-[#16AFF5]"
      : status === "not-entered"
        ? "bg-[#FFD978]"
        : status === "stop-loss"
          ? "bg-[#F08A92]"
          : status === "take-profit"
            ? "bg-[#72D4B0]"
            : "bg-slate-400";

  return <span className={`h-2 w-2 shrink-0 rounded-full ${colorClassName}`} />;
}

function FilterEmptyState({ copy, isDarkTheme }: { copy: WorkspaceCopy; isDarkTheme: boolean }) {
  return (
    <KolPanelSourceState
      isDarkTheme={isDarkTheme}
      sourceTitle={copy.kol.sourceTitle}
      message={copy.kol.emptyMessage}
      statusText={copy.kol.emptyStatus}
      tone="pending"
    />
  );
}

function KolPanelLoadingState({ copy, isDarkTheme }: { copy: WorkspaceCopy; isDarkTheme: boolean }) {
  const avatarClassName = isDarkTheme
    ? "h-10 w-10 shrink-0 rounded-full border-2 border-[#181A20] bg-white/[0.08]"
    : "h-10 w-10 shrink-0 rounded-full border-2 border-white bg-slate-200";
  const lineClassName = isDarkTheme
    ? "rounded-full bg-white/[0.08]"
    : "rounded-full bg-slate-200/90";
  const mutedLineClassName = isDarkTheme
    ? "rounded-full bg-white/[0.055]"
    : "rounded-full bg-slate-100";

  return (
    <div aria-label={copy.kol.loadingAria} className="space-y-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="signal-card-scene">
          <div
            className={`${getKolPanelStateCardClassName(isDarkTheme, "loading")} motion-fx-3-card-face-front signal-card-face`}
          >
            <div className="motion-fx-3-front-panel animate-pulse">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className={avatarClassName} />
                  <div className="min-w-0 flex-1">
                    <div className={`${lineClassName} h-3.5 w-28`} />
                    <div className={`${mutedLineClassName} mt-2 h-2.5 w-40`} />
                  </div>
                </div>
                <div className={`${mutedLineClassName} h-8 w-24 rounded-full`} />
              </div>

              <div className="mt-3 flex gap-2">
                <div className={`${lineClassName} h-6 w-20 rounded-full`} />
                <div className={`${mutedLineClassName} h-6 w-12 rounded-full`} />
                <div className={`${mutedLineClassName} h-6 w-16 rounded-full`} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className={`${mutedLineClassName} h-12 rounded-2xl`} />
                <div className={`${mutedLineClassName} h-12 rounded-2xl`} />
                <div className={`${mutedLineClassName} h-12 rounded-2xl`} />
                <div className={`${mutedLineClassName} h-12 rounded-2xl`} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function KolPanelSourceState({
  isDarkTheme,
  message,
  sourceTitle = "KOL Source",
  statusText,
  tone,
}: {
  isDarkTheme: boolean;
  message: string;
  sourceTitle?: string;
  statusText: string;
  tone: "loading" | "pending" | "risk";
}) {
  const titleClassName = isDarkTheme
    ? "text-sm font-semibold text-slate-50"
    : "text-sm font-semibold text-slate-950";
  const messageClassName = isDarkTheme
    ? "mt-2 text-xs leading-5 text-slate-400"
    : "mt-2 text-xs leading-5 text-slate-500";
  const statusClassName =
    tone === "risk"
      ? getPaperPositionBadgeClass(isDarkTheme, "exited", null, "stop-loss")
      : tone === "loading"
        ? `kol-signal-pill kol-status-badge${isDarkTheme ? " kol-signal-pill-dark" : ""} kol-status-live`
        : getPaperPositionBadgeClass(isDarkTheme, "not-entered");

  return (
    <div className="signal-card-scene">
      <div
        className={`${getKolPanelStateCardClassName(isDarkTheme, tone)} motion-fx-3-card-face-front signal-card-face`}
      >
        <div className="motion-fx-3-front-panel">
          <div className="flex items-center justify-between gap-3">
            <span className={titleClassName}>{sourceTitle}</span>
            <span className={statusClassName}>{statusText}</span>
          </div>
          <p className={messageClassName}>{message}</p>
        </div>
      </div>
    </div>
  );
}

function getKolPanelStateCardClassName(
  isDarkTheme: boolean,
  tone: "loading" | "pending" | "risk",
): string {
  const baseClassName =
    "signal-card-left-status relative w-full overflow-hidden rounded-[18px] border p-3.5 text-left";
  const themeClassName = isDarkTheme
    ? "signal-card-surface-dark border-white/[0.075] bg-white/[0.035]"
    : "signal-card-surface-light border-[#E5EAF0] bg-white";
  const toneClassName =
    tone === "risk"
      ? "signal-card-left-risk"
      : tone === "loading"
        ? "signal-card-left-loading"
        : "signal-card-left-pending";

  return `${baseClassName} ${themeClassName} ${toneClassName}`;
}

function createUniqueOptions<T extends string>(values: readonly T[]): T[] {
  return Array.from(new Set(values)).sort((left, right) =>
    left.localeCompare(right),
  );
}

function isStatusFilterOption(value: string): value is StatusFilterOption {
  return STATUS_FILTER_OPTIONS.includes(value as StatusFilterOption);
}

function isStatusStatsFilter(
  value: StatusFilterOption | typeof ALL_STATUS_FILTER,
): boolean {
  return value === "closed" || value === "take-profit" || value === "stop-loss";
}

function matchesStatusFilter(
  record: PaperPositionRecord | null,
  statusFilter: StatusFilterOption,
): boolean {
  if (!record || record.status === "invalid") {
    return false;
  }

  if (statusFilter === "closed") {
    return record.status === "exited";
  }

  if (statusFilter === "entered") {
    return record.status === "entered";
  }

  if (statusFilter === "not-entered") {
    return record.status === "not-entered";
  }

  return record.status === "exited" && record.exitReason === statusFilter;
}

function createKolStatsSummary({
  baseFilteredSignals,
  copy,
  isStatusStatsFilter,
  paperPositionsBySignalId,
  selectedKolName,
  statusFilteredSignals,
}: {
  baseFilteredSignals: readonly StructuredSignal[];
  copy: WorkspaceCopy;
  isStatusStatsFilter: boolean;
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>;
  selectedKolName: string | null;
  statusFilteredSignals: readonly StructuredSignal[];
}): KolStatsSummaryModel | null {
  if (!selectedKolName && !isStatusStatsFilter) {
    return null;
  }

  const summarySignals = isStatusStatsFilter
    ? statusFilteredSignals
    : baseFilteredSignals;
  if (summarySignals.length === 0) {
    return null;
  }

  const sampledSignals = sortSignalsByCreatedAtDesc(summarySignals).slice(
    0,
    KOL_STATS_SAMPLE_LIMIT,
  );
  const stats = createKolStatsFromSignals(
    sampledSignals,
    paperPositionsBySignalId,
  );
  const groups = isStatusStatsFilter
    ? createKolStatsGroups(sampledSignals, paperPositionsBySignalId, copy)
    : [];
  const titlePrefix = selectedKolName ? `${selectedKolName} · ` : "";
  const title = `${titlePrefix}${
    isStatusStatsFilter
      ? copy.kol.stats.filteredTitle
      : copy.kol.stats.recentTitle
  }`;
  const metaParts = [copy.kol.stats.sample(sampledSignals.length)];
  if (isStatusStatsFilter) {
    metaParts.push(copy.kol.stats.kolCount(countUniqueKols(sampledSignals)));
  }

  return {
    groups,
    metrics: createKolStatsMetrics(stats, copy),
    meta: metaParts.join(" · "),
    title,
  };
}

function createKolStatsMetrics(
  stats: KolStatsModel,
  copy: WorkspaceCopy,
): KolStatsMetricModel[] {
  return [
    { label: copy.kol.stats.closed, value: String(stats.closedCount) },
    { label: copy.kol.stats.winRate, tone: getWinRateTone(stats.winRatePercent), value: formatPercent(stats.winRatePercent) },
    {
      label: copy.kol.stats.totalPnl,
      tone: getPercentTone(stats.totalPnlPercent),
      value: formatSignedPercent(stats.totalPnlPercent),
    },
    { label: copy.kol.stats.pending, value: String(stats.pendingCount) },
  ];
}

type KolStatsModel = {
  closedCount: number;
  pendingCount: number;
  stopLossCount: number;
  takeProfitCount: number;
  totalPnlPercent: number | null;
  winRatePercent: number | null;
};

function createKolStatsGroups(
  signals: readonly StructuredSignal[],
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>,
  copy: WorkspaceCopy,
): KolStatsGroupModel[] {
  const signalsByKol = new Map<string, StructuredSignal[]>();

  for (const signal of signals) {
    const currentSignals = signalsByKol.get(signal.source_name) ?? [];
    currentSignals.push(signal);
    signalsByKol.set(signal.source_name, currentSignals);
  }

  return Array.from(signalsByKol.entries())
    .map(([kolName, kolSignals]) => {
      const stats = createKolStatsFromSignals(kolSignals, paperPositionsBySignalId);
      return {
        closedText: `${copy.kol.stats.closed} ${stats.closedCount}`,
        exitBreakdownText: `${copy.kol.stats.profitLoss} ${stats.takeProfitCount}/${stats.stopLossCount}`,
        kolName,
        stats,
        totalPnlText: formatSignedPercent(stats.totalPnlPercent),
        totalPnlTone: getPercentTone(stats.totalPnlPercent),
      };
    })
    .sort((left, right) => {
      const closedSort = right.stats.closedCount - left.stats.closedCount;
      if (closedSort !== 0) {
        return closedSort;
      }

      return (
        (right.stats.totalPnlPercent ?? Number.NEGATIVE_INFINITY) -
        (left.stats.totalPnlPercent ?? Number.NEGATIVE_INFINITY)
      );
    })
    .slice(0, KOL_STATS_GROUP_LIMIT)
    .map((group) => ({
      closedText: group.closedText,
      exitBreakdownText: group.exitBreakdownText,
      kolName: group.kolName,
      totalPnlText: group.totalPnlText,
      totalPnlTone: group.totalPnlTone,
    }));
}

function createKolStatsFromSignals(
  signals: readonly StructuredSignal[],
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>,
): KolStatsModel {
  let closedCount = 0;
  let pendingCount = 0;
  let pnlSum = 0;
  let stopLossCount = 0;
  let takeProfitCount = 0;

  for (const signal of signals) {
    const record = paperPositionsBySignalId[signal.id] ?? null;
    if (!record || record.status !== "exited") {
      pendingCount += 1;
      continue;
    }

    closedCount += 1;
    if (record.exitReason === "take-profit") {
      takeProfitCount += 1;
    }
    if (record.exitReason === "stop-loss") {
      stopLossCount += 1;
    }
    if (record.pnlPercent !== null) {
      pnlSum += record.pnlPercent;
    }
  }

  return {
    closedCount,
    pendingCount,
    stopLossCount,
    takeProfitCount,
    totalPnlPercent: closedCount > 0 ? pnlSum : null,
    winRatePercent:
      closedCount > 0 ? (takeProfitCount / closedCount) * 100 : null,
  };
}

function countUniqueKols(signals: readonly StructuredSignal[]): number {
  return new Set(signals.map((signal) => signal.source_name)).size;
}

function sortSignalsByCreatedAtDesc(
  signals: readonly StructuredSignal[],
): StructuredSignal[] {
  return signals.slice().sort((left, right) => {
    const createdAtSort =
      Date.parse(right.created_at) - Date.parse(left.created_at);
    if (Number.isFinite(createdAtSort) && createdAtSort !== 0) {
      return createdAtSort;
    }

    return right.id.localeCompare(left.id);
  });
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return `${formatCompactPercentNumber(value)}%`;
}

function formatSignedPercent(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return `${value >= 0 ? "+" : ""}${formatCompactPercentNumber(value)}%`;
}

function formatCompactPercentNumber(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

function getPercentTone(value: number | null): KolStatsMetricModel["tone"] {
  if (value === null || value === 0) {
    return "default";
  }

  return value > 0 ? "positive" : "negative";
}

function getWinRateTone(value: number | null): KolStatsMetricModel["tone"] {
  if (value === null || value === 50) {
    return "default";
  }

  return value > 50 ? "positive" : "negative";
}

function getKolStatsMetricValueClassName(
  isDarkTheme: boolean,
  tone: KolStatsMetricModel["tone"] = "default",
): string {
  if (tone === "positive") {
    return isDarkTheme
      ? "truncate text-xs font-semibold leading-4 text-[#45DCA6]"
      : "truncate text-xs font-semibold leading-4 text-[#159B72]";
  }

  if (tone === "negative") {
    return isDarkTheme
      ? "truncate text-xs font-semibold leading-4 text-[#FF7586]"
      : "truncate text-xs font-semibold leading-4 text-[#D9515F]";
  }

  return isDarkTheme
    ? "truncate text-xs font-semibold leading-4 text-slate-200"
    : "truncate text-xs font-semibold leading-4 text-slate-800";
}

function getScrollContentTop(
  element: HTMLElement,
  scrollArea: HTMLElement | null,
): number {
  if (!scrollArea) {
    return element.getBoundingClientRect().top;
  }

  const elementRect = element.getBoundingClientRect();
  const scrollAreaRect = scrollArea.getBoundingClientRect();

  return elementRect.top - scrollAreaRect.top + scrollArea.scrollTop;
}

function getSignalCardClassName({
  isActive,
  isDarkTheme,
  paperPositionRecord,
}: {
  isActive: boolean;
  isDarkTheme: boolean;
  paperPositionRecord: PaperPositionRecord | null;
}): string {
  const baseClassName =
    "relative w-full cursor-pointer overflow-hidden rounded-[18px] border p-3.5 text-left transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5";
  const themeSurfaceClassName = isDarkTheme
    ? "signal-card-surface-dark"
    : "signal-card-surface-light";
  const statusVisualClassName = getSignalCardStatusVisualClassName({
    isActive,
    paperPositionRecord,
  });

  if (isActive) {
    const activeClassName = isDarkTheme
      ? "border-white/[0.12] bg-white/[0.055] shadow-[0_5px_14px_rgba(0,0,0,0.14)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.18)]"
      : "border-[#D8E0E8] bg-white shadow-[0_4px_12px_rgba(15,23,42,0.05)] hover:shadow-[0_5px_14px_rgba(15,23,42,0.07)]";
    return `${baseClassName} ${themeSurfaceClassName} ${activeClassName} ${statusVisualClassName}`;
  }

  const defaultClassName = isDarkTheme
    ? "border-white/[0.075] bg-white/[0.035] hover:border-white/[0.12] hover:shadow-[0_5px_14px_rgba(0,0,0,0.18)]"
    : "border-[#E5EAF0] bg-white hover:border-[#D8E0E8] hover:shadow-[0_5px_14px_rgba(15,23,42,0.07)]";
  return `${baseClassName} ${themeSurfaceClassName} ${defaultClassName} ${statusVisualClassName}`;
}

function getSignalCardStatusVisualClassName({
  isActive,
  paperPositionRecord,
}: {
  isActive: boolean;
  paperPositionRecord: PaperPositionRecord | null;
}): string {
  const activeClassName = isActive ? " signal-card-left-active" : "";

  if (!paperPositionRecord) {
    return `signal-card-left-status signal-card-left-loading${activeClassName}`;
  }

  if (paperPositionRecord.status === "entered") {
    return `signal-card-left-status signal-card-left-live${activeClassName}`;
  }

  if (paperPositionRecord.status === "not-entered") {
    return `signal-card-left-status signal-card-left-pending${activeClassName}`;
  }

  if (paperPositionRecord.status !== "exited") {
    return `signal-card-left-status signal-card-left-muted${activeClassName}`;
  }

  if (paperPositionRecord.exitReason === "stop-loss") {
    return `signal-card-left-status signal-card-left-risk${activeClassName}`;
  }

  if (paperPositionRecord.exitReason === "take-profit") {
    return `signal-card-left-status signal-card-left-target${activeClassName}`;
  }

  return `signal-card-left-status signal-card-left-muted${activeClassName}`;
}

function getSignalCardBackClassName(isDarkTheme: boolean): string {
  const baseClassName = "w-full rounded-[18px] border p-3.5";
  return isDarkTheme
    ? `${baseClassName} border-white/[0.075] bg-[#181A20]`
    : `${baseClassName} border-[#E5EAF0] bg-white`;
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="h-3 w-3" fill="none" viewBox="0 0 24 24">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function formatSymbolFilterLabel(symbol: MarketSymbol): string {
  return formatSymbolLabel(symbol);
}

function formatSignalDisplayTime(signal: StructuredSignal): string {
  return signal.created_at.replace("T", " ").slice(0, 16);
}

function formatKolEntryText(signal: StructuredSignal, copy: WorkspaceCopy): string {
  if (signal.entry_min !== null && signal.entry_max !== null) {
    return `${signal.entry_min.toLocaleString("en-US")}-${signal.entry_max.toLocaleString("en-US")}`;
  }

  if (signal.trigger_price !== null) {
    return signal.trigger_price.toLocaleString("en-US");
  }

  return copy.kol.marketPrice;
}

function formatTakeProfitText(takeProfits: readonly number[], copy: WorkspaceCopy): string {
  return takeProfits.length > 0
    ? takeProfits
        .map(
          (price, index) =>
            `${copy.kol.takeProfitLevel(index + 1)}: ${price.toLocaleString("en-US")}`,
        )
        .join(" / ")
    : "--";
}

function formatSymbolLabel(symbol: string): string {
  return symbol.replace("/USDT:USDT", "");
}

function formatDirectionLabel(
  direction: StructuredSignal["direction"],
  copy: WorkspaceCopy,
): string {
  return copy.kol.directionFull[direction];
}

function formatStatusFilterLabel(
  status: StatusFilterOption,
  copy: WorkspaceCopy,
): string {
  if (status === "closed") {
    return copy.kol.statusFilters.closed;
  }

  if (status === "entered") {
    return copy.paper.statusEntered;
  }

  if (status === "not-entered") {
    return copy.kol.statusFilters.notOpened;
  }

  if (status === "take-profit") {
    return copy.paper.statusExitedTakeProfit;
  }

  return copy.paper.statusExitedStopLoss;
}
