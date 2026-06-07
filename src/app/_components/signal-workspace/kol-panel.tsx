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
  const previousCardRectsRef = useRef(new Map<string, DOMRect>());
  const previousSignalIdsRef = useRef(new Set<string>());
  const [flippedSignalIds, setFlippedSignalIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [symbolFilter, setSymbolFilter] = useState<string>(ALL_SYMBOL_FILTER);
  const [directionFilter, setDirectionFilter] =
    useState<string>(ALL_DIRECTION_FILTER);
  const [kolFilter, setKolFilter] = useState<string>(ALL_KOL_FILTER);
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
  const visibleSignals = useMemo(
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
  useLayoutEffect(() => {
    const previousRects = previousCardRectsRef.current;
    const previousSignalIds = previousSignalIdsRef.current;
    const currentRects = new Map<string, DOMRect>();

    for (const signal of visibleSignals) {
      const element = cardRefs.current.get(signal.id);
      if (!element) {
        continue;
      }

      const currentRect = element.getBoundingClientRect();
      const previousRect = previousRects.get(signal.id);
      currentRects.set(signal.id, currentRect);

      if (previousRect) {
        const deltaY = previousRect.top - currentRect.top;
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

      if (previousSignalIds.size > 0) {
        element.animate(
          [
            { opacity: 0, transform: "translateY(-18px) scale(0.98)" },
            { opacity: 1, transform: "translateY(0) scale(1)" },
          ],
          { duration: 320, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
        );
      }
    }

    previousCardRectsRef.current = currentRects;
    previousSignalIdsRef.current = new Set(
      visibleSignals.map((signal) => signal.id),
    );
  }, [visibleSignals]);

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
        symbolFilter={effectiveSymbolFilter}
        symbolOptions={symbolOptions}
        copy={copy}
        onKolFilterChange={setKolFilter}
        onDirectionFilterChange={setDirectionFilter}
        onSymbolFilterChange={setSymbolFilter}
      />
      <div
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
  symbolFilter,
  symbolOptions,
  onDirectionFilterChange,
  onKolFilterChange,
  onSymbolFilterChange,
}: {
  copy: WorkspaceCopy;
  directionFilter: string;
  directionOptions: readonly StructuredSignal["direction"][];
  isDarkTheme: boolean;
  kolFilter: string;
  kolOptions: readonly string[];
  symbolFilter: string;
  symbolOptions: readonly MarketSymbol[];
  onDirectionFilterChange: (value: string) => void;
  onKolFilterChange: (value: string) => void;
  onSymbolFilterChange: (value: string) => void;
}) {
  const containerClassName = isDarkTheme
    ? "bg-[#12161D] px-3 pb-2 pt-3"
    : "bg-[#FAFBFD] px-3 pb-2 pt-3";
  const [openFilter, setOpenFilter] = useState<
    "kol" | "direction" | "symbol" | null
  >(null);

  return (
    <div className={containerClassName}>
      <div className="grid grid-cols-3 gap-1.5">
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
