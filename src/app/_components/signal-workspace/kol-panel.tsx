import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { MarketSymbol } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";
import type { KolSignalSourceStatus } from "./types";
import { KolSignalSourceNotice, SignalField, SourceAvatar, SymbolIcon, TelegramSignalMessage } from "./card-ui";
import { PaperPositionSummary, formatSignalPaperPositionStatus, getSignalDirectionBadgeClass, getSignalPaperPositionBadgeClass } from "./paper-position-summary";

const ALL_SYMBOL_FILTER = "全部";
const ALL_DIRECTION_FILTER = "全部";
const ALL_KOL_FILTER = "全部";
const UNAUTHENTICATED_DELAY_DAYS = 3;

export function KolPanel({
  activeSignal,
  isLoggedIn,
  isDarkTheme,
  onTelegramLogin,
  paperPositionErrorsBySymbol,
  paperPositionsBySignalId,
  headerAction,
  sourceStatus,
  signals,
  onSignalSelect,
}: {
  activeSignal: StructuredSignal | null;
  isLoggedIn: boolean;
  isDarkTheme: boolean;
  onTelegramLogin: () => void;
  paperPositionErrorsBySymbol: Readonly<Record<string, string>>;
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>;
  headerAction?: ReactNode;
  sourceStatus: KolSignalSourceStatus;
  signals: readonly StructuredSignal[];
  onSignalSelect: (signal: StructuredSignal) => void;
}) {
  const activeCardRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const previousCardRectsRef = useRef(new Map<string, DOMRect>());
  const previousSignalIdsRef = useRef(new Set<string>());
  const [flippedSignalIds, setFlippedSignalIds] = useState<ReadonlySet<string>>(() => new Set());
  const [symbolFilter, setSymbolFilter] = useState<string>(ALL_SYMBOL_FILTER);
  const [directionFilter, setDirectionFilter] = useState<string>(ALL_DIRECTION_FILTER);
  const [kolFilter, setKolFilter] = useState<string>(ALL_KOL_FILTER);
  const symbolOptions = useMemo(() => createUniqueOptions(signals.map((signal) => signal.symbol)), [signals]);
  const directionOptions = useMemo(() => createUniqueOptions(signals.map((signal) => signal.direction)), [signals]);
  const kolOptions = useMemo(() => createUniqueOptions(signals.map((signal) => signal.source_name)), [signals]);
  const effectiveSymbolFilter = symbolFilter !== ALL_SYMBOL_FILTER && symbolOptions.includes(symbolFilter) ? symbolFilter : ALL_SYMBOL_FILTER;
  const effectiveDirectionFilter = directionFilter !== ALL_DIRECTION_FILTER && directionOptions.includes(directionFilter as StructuredSignal["direction"]) ? directionFilter : ALL_DIRECTION_FILTER;
  const effectiveKolFilter = kolFilter !== ALL_KOL_FILTER && kolOptions.includes(kolFilter) ? kolFilter : ALL_KOL_FILTER;
  const visibleSignals = useMemo(() => signals.filter((signal) => {
    const matchesSymbol = effectiveSymbolFilter === ALL_SYMBOL_FILTER || signal.symbol === effectiveSymbolFilter;
    const matchesDirection = effectiveDirectionFilter === ALL_DIRECTION_FILTER || signal.direction === effectiveDirectionFilter;
    const matchesKol = effectiveKolFilter === ALL_KOL_FILTER || signal.source_name === effectiveKolFilter;

    return matchesSymbol && matchesDirection && matchesKol;
  }), [effectiveDirectionFilter, effectiveKolFilter, effectiveSymbolFilter, signals]);
  const renderedSignals = useMemo(() => (
    isLoggedIn ? visibleSignals : visibleSignals.slice(0, 1)
  ), [isLoggedIn, visibleSignals]);

  useLayoutEffect(() => {
    const previousRects = previousCardRectsRef.current;
    const previousSignalIds = previousSignalIdsRef.current;
    const currentRects = new Map<string, DOMRect>();

    for (const signal of renderedSignals) {
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
    previousSignalIdsRef.current = new Set(renderedSignals.map((signal) => signal.id));
  }, [renderedSignals]);

  useEffect(() => {
    activeCardRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeSignal?.id]);

  return (
    <aside className={isDarkTheme ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#181A20]" : "flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-[#E5EAF0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.035)]"}>
      <div className={isDarkTheme ? "flex min-h-[48px] items-center justify-between gap-3 border-b border-white/[0.075] bg-white/[0.055] px-5 py-1.5" : "flex min-h-[48px] items-center justify-between gap-3 border-b border-[#E5EAF0] bg-white px-5 py-1.5"}>
        <div className="min-w-0">
          <h2 className={isDarkTheme ? "text-base font-semibold tracking-tight text-slate-50" : "text-base font-semibold tracking-tight text-slate-950"}>KOL 信息</h2>
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
        onKolFilterChange={setKolFilter}
        onDirectionFilterChange={setDirectionFilter}
        onSymbolFilterChange={setSymbolFilter}
      />
      <div className={isDarkTheme ? "kol-scroll-area kol-scroll-area-dark mr-2 min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#12161D] pb-3 pl-3 pr-1 pt-2" : "kol-scroll-area mr-2 min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#FAFBFD] pb-3 pl-3 pr-1 pt-2"}>
        <KolSignalSourceNotice isDarkTheme={isDarkTheme} signalCount={signals.length} status={sourceStatus} />
        {visibleSignals.length === 0 && signals.length > 0 ? (
          <FilterEmptyState isDarkTheme={isDarkTheme} />
        ) : null}
        {renderedSignals.map((signal, index) => {
          const entryText = formatKolEntryText(signal);
          const paperPositionError = paperPositionErrorsBySymbol[signal.symbol] ?? null;
          const paperPositionRecord = paperPositionsBySignalId[signal.id] ?? null;
          const takeProfitText = formatTakeProfitText(signal.take_profit);
          const isActive = signal.id === activeSignal?.id;
          const isFlipped = flippedSignalIds.has(signal.id);
          const isDelayedSample = !isLoggedIn;
          const displaySignal = isDelayedSample ? createDelayedDisplaySignal(signal) : signal;
          const cardClassName = getSignalCardClassName({ isActive, isDarkTheme, paperPositionRecord });
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
              <div className={`signal-card-flipper ${isFlipped ? "is-flipped" : ""}`}>
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
                      <SourceAvatar isDarkTheme={isDarkTheme} name={signal.source_name} url={signal.source_avatar_url} />
                      <div className="min-w-0 flex-1">
                        <div className={isDarkTheme ? "truncate text-sm font-semibold text-slate-50" : "truncate text-sm font-semibold text-slate-950"}>{signal.source_name}</div>
                        <div className={isDarkTheme ? "mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-400" : "mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500"}>
                          <span className="min-w-0 truncate whitespace-nowrap">{signal.source_type} · {formatSignalDisplayTime(displaySignal)}</span>

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
                      <span>查看情报源</span>
                      <ChevronRightIcon />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className={isDarkTheme ? "inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-1 text-slate-200" : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700"}>
                      <SymbolIcon symbol={signal.symbol} />
                      {formatSymbolLabel(signal.symbol)}
                    </span>
                    <span className={getSignalDirectionBadgeClass(isDarkTheme, signal.direction)}>{signal.direction === "long" ? "多" : "空"}</span>
                    <span className={getSignalPaperPositionBadgeClass(isDarkTheme, paperPositionRecord)}>
                      {formatSignalPaperPositionStatus(paperPositionRecord, paperPositionError)}
                    </span>
                  </div>


                  <div className="signal-card-field-layer mt-3 grid grid-cols-2 gap-2 text-xs">
                    <SignalField isDarkTheme={isDarkTheme} label="入场/触发" value={entryText} />
                    <SignalField isDarkTheme={isDarkTheme} label="止损" value={signal.stop_loss?.toLocaleString("en-US") ?? "--"} />
                    <SignalField isDarkTheme={isDarkTheme} label="止盈" value={takeProfitText} />
                    <SignalField isDarkTheme={isDarkTheme} label="条件" value={signal.confirmation ?? "结构化喊单"} />
                  </div>

                  <PaperPositionSummary
                    error={paperPositionError}
                    isActive={isActive}
                    isDarkTheme={isDarkTheme}
                    record={paperPositionRecord}
                  />
                </div>
                <div className={`${backCardClassName} motion-fx-3-card-face-back signal-card-face signal-card-back`}>
                  <div className="motion-fx-3-back-panel flex h-full min-h-0 flex-col">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className={isDarkTheme ? "text-sm font-bold text-slate-50" : "text-sm font-bold text-slate-950"}>情报源回放</div>
                      <button
                        className={rawButtonClassName}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFlip();
                        }}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <span>返回</span>
                        <ChevronRightIcon />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                      <TelegramSignalMessage isDarkTheme={isDarkTheme} signal={displaySignal} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!isLoggedIn && renderedSignals.length > 0 ? (
          <LoggedOutKolNotice
            isDarkTheme={isDarkTheme}
            onTelegramLogin={onTelegramLogin}
          />
        ) : null}
      </div>
    </aside>
  );
}

function KolPanelFilters({
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
  const containerClassName = isDarkTheme ? "bg-[#12161D] px-3 pb-2 pt-3" : "bg-[#FAFBFD] px-3 pb-2 pt-3";
  const [openFilter, setOpenFilter] = useState<"kol" | "direction" | "symbol" | null>(null);

  return (
    <div className={containerClassName}>
      <div className="grid grid-cols-3 gap-1.5">
        <FilterDropdown
          id="kol-source-filter"
          allLabel={ALL_KOL_FILTER}
          isOpen={openFilter === "kol"}
          isDarkTheme={isDarkTheme}
          label="KOL"
          options={kolOptions}
          value={kolFilter}
          onOpenChange={(isOpen) => setOpenFilter(isOpen ? "kol" : null)}
          onChange={onKolFilterChange}
        />
        <FilterDropdown
          id="kol-direction-filter"
          allLabel={ALL_DIRECTION_FILTER}
          isOpen={openFilter === "direction"}
          isDarkTheme={isDarkTheme}
          label="多空"
          options={directionOptions}
          value={directionFilter}
          optionLabel={formatDirectionLabel}
          renderIcon={(option) => option === ALL_DIRECTION_FILTER ? null : <DirectionFilterDot direction={option as StructuredSignal["direction"]} />}
          onOpenChange={(isOpen) => setOpenFilter(isOpen ? "direction" : null)}
          onChange={onDirectionFilterChange}
        />
        <FilterDropdown
          id="kol-symbol-filter"
          allLabel={ALL_SYMBOL_FILTER}
          isOpen={openFilter === "symbol"}
          isDarkTheme={isDarkTheme}
          label="币种"
          options={symbolOptions}
          value={symbolFilter}
          optionLabel={formatSymbolFilterLabel}
          renderIcon={(option) => option === ALL_SYMBOL_FILTER ? null : <SymbolIcon symbol={option} />}
          onOpenChange={(isOpen) => setOpenFilter(isOpen ? "symbol" : null)}
          onChange={onSymbolFilterChange}
        />
      </div>
    </div>
  );
}

function FilterDropdown<T extends string>({
  allLabel,
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
  const optionClassName = (isSelected: boolean) => (
    isSelected
      ? isDarkTheme
        ? "flex h-8 w-full items-center gap-2 rounded-xl bg-[#00A6F4]/15 px-2 text-left text-[11px] font-semibold text-sky-200"
        : "flex h-8 w-full items-center gap-2 rounded-xl bg-[#EAF8FE] px-2 text-left text-[11px] font-semibold text-[#007DB8]"
      : isDarkTheme
        ? "flex h-8 w-full items-center gap-2 rounded-xl px-2 text-left text-[11px] font-medium text-slate-300 transition hover:bg-white/[0.08]"
        : "flex h-8 w-full items-center gap-2 rounded-xl px-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
  );
  const selectedText = value === allLabel ? "全部" : optionLabel(value as T);
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
        <span className={isDarkTheme ? "shrink-0 text-slate-500" : "shrink-0 text-slate-400"}>{label}</span>
        {renderIcon?.(value)}
        <span className="min-w-0 flex-1 truncate text-left whitespace-nowrap">{selectedText}</span>
        <svg aria-hidden="true" className={`h-3 w-3 shrink-0 transition ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24">
          <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
      {isOpen ? (
        <div aria-labelledby={id} className={menuClassName} role="listbox" tabIndex={-1}>
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
                <span className="min-w-0 truncate">{option === allLabel ? "全部" : optionLabel(option as T)}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function DirectionFilterDot({ direction }: { direction: StructuredSignal["direction"] }) {
  return (
    <span className={direction === "long" ? "h-2 w-2 shrink-0 rounded-full bg-[#72D4B0]" : "h-2 w-2 shrink-0 rounded-full bg-[#F08A92]"} />
  );
}

function FilterEmptyState({ isDarkTheme }: { isDarkTheme: boolean }) {
  return (
    <div className={isDarkTheme ? "rounded-2xl border border-[#2A2E38] bg-[#0B0E11] p-4 text-xs leading-5 text-slate-400" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-4 text-xs leading-5 text-slate-500"}>
      当前筛选条件下没有 KOL 信号。
    </div>
  );
}

function createUniqueOptions<T extends string>(values: readonly T[]): T[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function createDelayedDisplaySignal(signal: StructuredSignal): StructuredSignal {
  return {
    ...signal,
    created_at: shiftSignalCreatedAt(signal.created_at, -UNAUTHENTICATED_DELAY_DAYS),
    raw_text: `【三天前延迟样例】${signal.raw_text}`,
  };
}

function shiftSignalCreatedAt(createdAt: string, dayOffset: number): string {
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) {
    return createdAt;
  }

  const shiftedDate = new Date(timestamp + dayOffset * 24 * 60 * 60 * 1_000);
  return formatDateTimeWithUtc8Offset(shiftedDate);
}

function formatDateTimeWithUtc8Offset(date: Date): string {
  const utc8Date = new Date(date.getTime() + 8 * 60 * 60 * 1_000);
  const year = utc8Date.getUTCFullYear();
  const month = padTimePart(utc8Date.getUTCMonth() + 1);
  const day = padTimePart(utc8Date.getUTCDate());
  const hours = padTimePart(utc8Date.getUTCHours());
  const minutes = padTimePart(utc8Date.getUTCMinutes());
  const seconds = padTimePart(utc8Date.getUTCSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
}

function formatSignalDisplayTime(signal: StructuredSignal): string {
  return signal.created_at.replace("T", " ").slice(0, 16);
}

function LoggedOutKolNotice({
  isDarkTheme,
  onTelegramLogin,
}: {
  isDarkTheme: boolean;
  onTelegramLogin: () => void;
}) {
  const titleClassName = isDarkTheme ? "text-sm font-medium text-slate-300" : "text-sm font-medium text-slate-500";
  const buttonClassName = "rounded-full bg-[#00A6F4] px-5 py-1.5 text-sm font-semibold text-white transition hover:bg-[#0097DD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A6F4]/30";

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-3 py-5 text-center">
      <p className={titleClassName}>登录以查看更多实时情报</p>
      <button className={buttonClassName} type="button" onClick={onTelegramLogin}>
        Telegram 登录
      </button>
    </div>
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
  const baseClassName = "relative w-full cursor-pointer overflow-hidden rounded-[18px] border p-3.5 text-left transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5";
  const themeSurfaceClassName = isDarkTheme ? "signal-card-surface-dark" : "signal-card-surface-light";
  const statusVisualClassName = getSignalCardStatusVisualClassName({ isActive, paperPositionRecord });

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
  if (!paperPositionRecord) {
    return "";
  }

  const activeClassName = isActive ? " signal-card-left-active" : "";

  if (paperPositionRecord.status === "entered") {
    return `signal-card-left-status signal-card-left-live${activeClassName}`;
  }

  if (paperPositionRecord.status === "not-entered") {
    return `signal-card-left-status signal-card-left-pending${activeClassName}`;
  }

  if (paperPositionRecord.status !== "exited") {
    return "";
  }

  if (paperPositionRecord.exitReason === "stop-loss") {
    return `signal-card-left-status signal-card-left-risk${activeClassName}`;
  }

  if (paperPositionRecord.exitReason === "take-profit") {
    return `signal-card-left-status signal-card-left-target${activeClassName}`;
  }

  return "";
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
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
    </svg>
  );
}

function formatSymbolFilterLabel(symbol: MarketSymbol): string {
  return formatSymbolLabel(symbol);
}

function formatKolEntryText(signal: StructuredSignal): string {
  if (signal.entry_min !== null && signal.entry_max !== null) {
    return `${signal.entry_min.toLocaleString("en-US")}-${signal.entry_max.toLocaleString("en-US")}`;
  }

  if (signal.trigger_price !== null) {
    return signal.trigger_price.toLocaleString("en-US");
  }

  return "市价";
}

function formatTakeProfitText(takeProfits: readonly number[]): string {
  return takeProfits.length > 0
    ? takeProfits.map((price, index) => `止盈${index + 1}: ${price.toLocaleString("en-US")}`).join(" / ")
    : "--";
}

function formatSymbolLabel(symbol: string): string {
  return symbol.replace("/USDT:USDT", "");
}

function formatDirectionLabel(direction: StructuredSignal["direction"]): string {
  return direction === "long" ? "多头" : "空头";
}

function padTimePart(value: number): string {
  return String(value).padStart(2, "0");
}
