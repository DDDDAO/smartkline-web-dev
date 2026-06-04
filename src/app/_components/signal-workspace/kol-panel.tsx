import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { MarketSymbol } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";
import type { KolSignalSourceStatus } from "./types";
import { KolSignalSourceNotice, SignalField, SourceAvatar } from "./card-ui";
import { PaperPositionSummary, formatSignalPaperPositionStatus, getSignalDirectionBadgeClass, getSignalPaperPositionBadgeClass } from "./paper-position-summary";
import { RawSignalDialog } from "./raw-signal-dialog";

const ALL_SYMBOL_FILTER = "全部币种";
const ALL_STATUS_FILTER = "全部状态";
const ALL_KOL_FILTER = "全部KOL";

export function KolPanel({
  activeSignal,
  isDarkTheme,
  paperPositionErrorsBySymbol,
  paperPositionsBySignalId,
  sourceStatus,
  signals,
  onSignalSelect,
}: {
  activeSignal: StructuredSignal | null;
  isDarkTheme: boolean;
  paperPositionErrorsBySymbol: Readonly<Record<string, string>>;
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>;
  sourceStatus: KolSignalSourceStatus;
  signals: readonly StructuredSignal[];
  onSignalSelect: (signal: StructuredSignal) => void;
}) {
  const activeCardRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const previousCardRectsRef = useRef(new Map<string, DOMRect>());
  const previousSignalIdsRef = useRef(new Set<string>());
  const [rawSignalDialogSignal, setRawSignalDialogSignal] = useState<StructuredSignal | null>(null);
  const [symbolFilter, setSymbolFilter] = useState<string>(ALL_SYMBOL_FILTER);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS_FILTER);
  const [kolFilter, setKolFilter] = useState<string>(ALL_KOL_FILTER);
  const symbolOptions = useMemo(() => createUniqueOptions(signals.map((signal) => signal.symbol)), [signals]);
  const statusOptions = useMemo(() => createUniqueOptions(signals.map((signal) => getSignalStatusFilterValue(signal, paperPositionsBySignalId, paperPositionErrorsBySymbol))), [paperPositionErrorsBySymbol, paperPositionsBySignalId, signals]);
  const kolOptions = useMemo(() => createUniqueOptions(signals.map((signal) => signal.source_name)), [signals]);
  const effectiveSymbolFilter = symbolFilter !== ALL_SYMBOL_FILTER && symbolOptions.includes(symbolFilter) ? symbolFilter : ALL_SYMBOL_FILTER;
  const effectiveStatusFilter = statusFilter !== ALL_STATUS_FILTER && statusOptions.includes(statusFilter) ? statusFilter : ALL_STATUS_FILTER;
  const effectiveKolFilter = kolFilter !== ALL_KOL_FILTER && kolOptions.includes(kolFilter) ? kolFilter : ALL_KOL_FILTER;
  const visibleSignals = useMemo(() => signals.filter((signal) => {
    const matchesSymbol = effectiveSymbolFilter === ALL_SYMBOL_FILTER || signal.symbol === effectiveSymbolFilter;
    const matchesStatus = effectiveStatusFilter === ALL_STATUS_FILTER || getSignalStatusFilterValue(signal, paperPositionsBySignalId, paperPositionErrorsBySymbol) === effectiveStatusFilter;
    const matchesKol = effectiveKolFilter === ALL_KOL_FILTER || signal.source_name === effectiveKolFilter;

    return matchesSymbol && matchesStatus && matchesKol;
  }), [effectiveKolFilter, effectiveStatusFilter, effectiveSymbolFilter, paperPositionErrorsBySymbol, paperPositionsBySignalId, signals]);

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
    previousSignalIdsRef.current = new Set(visibleSignals.map((signal) => signal.id));
  }, [visibleSignals]);

  useEffect(() => {
    activeCardRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeSignal?.id]);

  useEffect(() => {
    if (!rawSignalDialogSignal) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setRawSignalDialogSignal(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [rawSignalDialogSignal]);

  return (
    <aside className={isDarkTheme ? "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm" : "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"}>
      <div className={isDarkTheme ? "border-b border-slate-800 px-4 py-3" : "border-b border-slate-200 px-4 py-3"}>
        <h2 className={isDarkTheme ? "text-base font-semibold text-slate-50" : "text-base font-semibold text-slate-950"}>KOL 信息区</h2>
      </div>
      <KolPanelFilters
        isDarkTheme={isDarkTheme}
        kolFilter={effectiveKolFilter}
        kolOptions={kolOptions}
        statusFilter={effectiveStatusFilter}
        statusOptions={statusOptions}
        symbolFilter={effectiveSymbolFilter}
        symbolOptions={symbolOptions}
        onKolFilterChange={setKolFilter}
        onStatusFilterChange={setStatusFilter}
        onSymbolFilterChange={setSymbolFilter}
      />
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <KolSignalSourceNotice isDarkTheme={isDarkTheme} signalCount={signals.length} status={sourceStatus} />
        {visibleSignals.length === 0 && signals.length > 0 ? (
          <FilterEmptyState isDarkTheme={isDarkTheme} />
        ) : null}
        {visibleSignals.map((signal) => {
          const entryText = formatKolEntryText(signal);
          const paperPositionError = paperPositionErrorsBySymbol[signal.symbol] ?? null;
          const paperPositionRecord = paperPositionsBySignalId[signal.id] ?? null;
          const takeProfitText = formatTakeProfitText(signal.take_profit);
          const isActive = signal.id === activeSignal?.id;
          const cardClassName = isActive
            ? isDarkTheme ? "w-full cursor-pointer rounded-2xl border border-cyan-500 bg-cyan-950/40 p-3 text-left shadow-sm" : "w-full cursor-pointer rounded-2xl border border-cyan-400 bg-cyan-50 p-3 text-left shadow-sm"
            : isDarkTheme ? "w-full cursor-pointer rounded-2xl border border-slate-800 bg-slate-950 p-3 text-left shadow-sm transition hover:border-slate-700" : "w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50";
          const rawButtonClassName = isDarkTheme
            ? "shrink-0 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:border-cyan-500 hover:text-cyan-300"
            : "shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700";
          const handleSelect = () => onSignalSelect(signal);
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
              className={`${cardClassName} will-change-transform`}
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
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <SourceAvatar isDarkTheme={isDarkTheme} name={signal.source_name} url={signal.source_avatar_url} />
                  <div className="min-w-0">
                    <div className={isDarkTheme ? "truncate text-sm font-semibold text-slate-50" : "truncate text-sm font-semibold text-slate-950"}>{signal.source_name}</div>
                    <div className={isDarkTheme ? "mt-1 text-xs text-slate-400" : "mt-1 text-xs text-slate-500"}>{signal.source_type} · {signal.created_at.replace("T", " ").slice(0, 16)}</div>
                  </div>
                </div>
                <button
                  className={rawButtonClassName}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setRawSignalDialogSignal(signal);
                  }}
                >
                  查看原始信息
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className={isDarkTheme ? "rounded-full bg-slate-800 px-2 py-1 text-slate-200" : "rounded-full bg-slate-100 px-2 py-1 text-slate-700"}>{formatSymbolLabel(signal.symbol)}</span>
                <span className={getSignalDirectionBadgeClass(isDarkTheme, signal.direction)}>{signal.direction === "long" ? "多" : "空"}</span>
                <span className={getSignalPaperPositionBadgeClass(isDarkTheme, paperPositionRecord)}>
                  {formatSignalPaperPositionStatus(paperPositionRecord, paperPositionError)}
                </span>
              </div>


              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <SignalField isDarkTheme={isDarkTheme} label="入场/触发" value={entryText} />
                <SignalField isDarkTheme={isDarkTheme} label="止损" value={signal.stop_loss?.toLocaleString("en-US") ?? "--"} />
                <SignalField isDarkTheme={isDarkTheme} label="止盈" value={takeProfitText} />
                <SignalField isDarkTheme={isDarkTheme} label="条件" value={signal.confirmation ?? "结构化喊单"} />
              </div>

              <PaperPositionSummary
                error={paperPositionError}
                isDarkTheme={isDarkTheme}
                record={paperPositionRecord}
              />

            </div>
          );
        })}
      </div>
      {rawSignalDialogSignal ? (
        <RawSignalDialog
          isDarkTheme={isDarkTheme}
          signal={rawSignalDialogSignal}
          onClose={() => setRawSignalDialogSignal(null)}
        />
      ) : null}
    </aside>
  );
}

function KolPanelFilters({
  isDarkTheme,
  kolFilter,
  kolOptions,
  statusFilter,
  statusOptions,
  symbolFilter,
  symbolOptions,
  onKolFilterChange,
  onStatusFilterChange,
  onSymbolFilterChange,
}: {
  isDarkTheme: boolean;
  kolFilter: string;
  kolOptions: readonly string[];
  statusFilter: string;
  statusOptions: readonly string[];
  symbolFilter: string;
  symbolOptions: readonly MarketSymbol[];
  onKolFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSymbolFilterChange: (value: string) => void;
}) {
  const containerClassName = isDarkTheme ? "border-b border-slate-800 bg-slate-900/95 px-3 py-3" : "border-b border-slate-200 bg-white px-3 py-3";

  return (
    <div className={containerClassName}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        <FilterSelect
          id="kol-symbol-filter"
          allLabel={ALL_SYMBOL_FILTER}
          isDarkTheme={isDarkTheme}
          label="币种"
          options={symbolOptions}
          value={symbolFilter}
          optionLabel={formatSymbolLabel}
          onChange={onSymbolFilterChange}
        />
        <FilterSelect
          id="kol-status-filter"
          allLabel={ALL_STATUS_FILTER}
          isDarkTheme={isDarkTheme}
          label="状态"
          options={statusOptions}
          value={statusFilter}
          onChange={onStatusFilterChange}
        />
        <FilterSelect
          id="kol-source-filter"
          allLabel={ALL_KOL_FILTER}
          isDarkTheme={isDarkTheme}
          label="KOL"
          options={kolOptions}
          value={kolFilter}
          onChange={onKolFilterChange}
        />
      </div>
    </div>
  );
}

function FilterSelect<T extends string>({
  allLabel,
  id,
  isDarkTheme,
  label,
  optionLabel = (value) => value,
  options,
  value,
  onChange,
}: {
  allLabel: string;
  id: string;
  isDarkTheme: boolean;
  label: string;
  optionLabel?: (value: T) => string;
  options: readonly T[];
  value: string;
  onChange: (value: string) => void;
}) {
  const labelClassName = isDarkTheme ? "mb-1 block text-[11px] font-semibold text-slate-500" : "mb-1 block text-[11px] font-semibold text-slate-400";
  const selectClassName = isDarkTheme
    ? "h-9 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 text-xs font-medium text-slate-200 outline-none transition focus:border-cyan-500"
    : "h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 outline-none transition focus:border-cyan-400";

  return (
    <label>
      <span className={labelClassName}>{label}</span>
      <select className={selectClassName} id={id} name={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value={allLabel}>{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>{optionLabel(option)}</option>
        ))}
      </select>
    </label>
  );
}

function FilterEmptyState({ isDarkTheme }: { isDarkTheme: boolean }) {
  return (
    <div className={isDarkTheme ? "rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-400" : "rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500"}>
      当前筛选条件下没有 KOL 信号。
    </div>
  );
}

function getSignalStatusFilterValue(
  signal: StructuredSignal,
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>,
  paperPositionErrorsBySymbol: Readonly<Record<string, string>>,
): string {
  return formatSignalPaperPositionStatus(paperPositionsBySignalId[signal.id] ?? null, paperPositionErrorsBySymbol[signal.symbol] ?? null);
}

function createUniqueOptions<T extends string>(values: readonly T[]): T[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
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
    ? takeProfits.map((price, index) => `止盈 ${index + 1}: ${price.toLocaleString("en-US")}`).join(" / ")
    : "--";
}

function formatSymbolLabel(symbol: string): string {
  return symbol.replace("/USDT:USDT", "");
}
