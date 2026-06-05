import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { MarketSymbol } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";
import type { KolSignalSourceStatus } from "./types";
import { KolSignalSourceNotice, SignalField, SourceAvatar, TelegramSignalMessage } from "./card-ui";
import { PaperPositionSummary, formatSignalPaperPositionStatus, getSignalDirectionBadgeClass, getSignalPaperPositionBadgeClass } from "./paper-position-summary";
import { RawSignalDialog } from "./raw-signal-dialog";

const ALL_SYMBOL_FILTER = "全部币种";
const ALL_DIRECTION_FILTER = "全部多空";
const ALL_KOL_FILTER = "全部KOL";
const UNAUTHENTICATED_DELAY_DAYS = 3;

export function KolPanel({
  activeSignal,
  isLoggedIn,
  isDarkTheme,
  onTelegramLogin,
  paperPositionErrorsBySymbol,
  paperPositionsBySignalId,
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
  sourceStatus: KolSignalSourceStatus;
  signals: readonly StructuredSignal[];
  onSignalSelect: (signal: StructuredSignal) => void;
}) {
  const activeCardRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const previousCardRectsRef = useRef(new Map<string, DOMRect>());
  const previousSignalIdsRef = useRef(new Set<string>());
  const [rawSignalDialogSignal, setRawSignalDialogSignal] = useState<StructuredSignal | null>(null);
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
  const headerStatusClassName = isLoggedIn
    ? isDarkTheme ? "shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300" : "shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700"
    : isDarkTheme ? "shrink-0 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-black text-amber-300" : "shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700";

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
    <aside className={isDarkTheme ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm" : "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"}>
      <div className={isDarkTheme ? "border-b border-slate-800 px-4 py-3" : "border-b border-slate-200 px-4 py-3"}>
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className={isDarkTheme ? "text-base font-semibold text-slate-50" : "text-base font-semibold text-slate-950"}>KOL 信息区</h2>
              <p className={isDarkTheme ? "mt-1 text-[11px] leading-4 text-slate-500" : "mt-1 text-[11px] leading-4 text-slate-400"}>
                最新结构化情报与筛选器集中在这里。
              </p>
            </div>
            <span className={headerStatusClassName}>
              {isLoggedIn ? "实时接入" : "延迟样例"}
            </span>
          </div>
        </div>
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
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <KolSignalSourceNotice isDarkTheme={isDarkTheme} signalCount={signals.length} status={sourceStatus} />
        {visibleSignals.length === 0 && signals.length > 0 ? (
          <FilterEmptyState isDarkTheme={isDarkTheme} />
        ) : null}
        {visibleSignals.map((signal, index) => {
          const entryText = formatKolEntryText(signal);
          const paperPositionError = paperPositionErrorsBySymbol[signal.symbol] ?? null;
          const paperPositionRecord = paperPositionsBySignalId[signal.id] ?? null;
          const takeProfitText = formatTakeProfitText(signal.take_profit);
          const isActive = signal.id === activeSignal?.id;
          const isFlipped = flippedSignalIds.has(signal.id);
          const isLocked = !isLoggedIn && index < 3;
          const isDelayedSample = !isLoggedIn && !isLocked;
          const displaySignal = isDelayedSample ? createDelayedDisplaySignal(signal) : signal;
          const cardClassName = getSignalCardClassName({ isActive, isDarkTheme, isLocked, record: paperPositionRecord });
          const backCardClassName = getSignalCardBackClassName(isDarkTheme, paperPositionRecord);
          const rawButtonClassName = isDarkTheme
            ? "shrink-0 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:border-cyan-500 hover:text-cyan-300"
            : "shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700";
          const handleSelect = () => {
            if (isLocked) {
              onTelegramLogin();
              return;
            }

            onSignalSelect(signal);
          };
          const toggleFlip = () => {
            if (isLocked) {
              onTelegramLogin();
              return;
            }

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
            >
              <div className={`signal-card-flipper ${isFlipped ? "is-flipped" : ""}`}>
                <div
                  className={`${cardClassName} signal-card-face`}
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
                        <div className={isDarkTheme ? "mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400" : "mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500"}>
                          <span>{signal.source_type} · {formatSignalDisplayTime(displaySignal)}</span>
                          {isLocked ? (
                            <span className={isDarkTheme ? "rounded-full bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-black text-cyan-300" : "rounded-full bg-cyan-50 px-1.5 py-0.5 text-[10px] font-black text-cyan-700"}>
                              最新情报
                            </span>
                          ) : null}
                          {isDelayedSample ? (
                            <span className={isDarkTheme ? "rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-black text-amber-300" : "rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-black text-amber-700"}>
                              三天前样例
                            </span>
                          ) : null}
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
                    >
                      查看情报源
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

                  {isLocked ? <LockedSignalOverlay isDarkTheme={isDarkTheme} onTelegramLogin={onTelegramLogin} /> : null}
                </div>
                <div className={`${backCardClassName} signal-card-face signal-card-back`}>
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className={isDarkTheme ? "text-sm font-bold text-slate-50" : "text-sm font-bold text-slate-950"}>情报源回放</div>
                      <div className="flex gap-2">
                        <button
                          className={rawButtonClassName}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setRawSignalDialogSignal(displaySignal);
                          }}
                        >
                          放大
                        </button>
                        <button
                          className={rawButtonClassName}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleFlip();
                          }}
                        >
                          返回
                        </button>
                      </div>
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
  const containerClassName = isDarkTheme ? "border-b border-slate-800 bg-slate-900/95 px-3 py-3" : "border-b border-slate-200 bg-white px-3 py-3";

  return (
    <div className={containerClassName}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        <FilterSelect
          id="kol-source-filter"
          allLabel={ALL_KOL_FILTER}
          isDarkTheme={isDarkTheme}
          label="KOL"
          options={kolOptions}
          value={kolFilter}
          onChange={onKolFilterChange}
        />
        <FilterSelect
          id="kol-direction-filter"
          allLabel={ALL_DIRECTION_FILTER}
          isDarkTheme={isDarkTheme}
          label="多空"
          options={directionOptions}
          value={directionFilter}
          optionLabel={formatDirectionLabel}
          onChange={onDirectionFilterChange}
        />
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

function LockedSignalOverlay({
  isDarkTheme,
  onTelegramLogin,
}: {
  isDarkTheme: boolean;
  onTelegramLogin: () => void;
}) {
  return (
    <div className={isDarkTheme ? "absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-slate-950/55 px-5 backdrop-blur-[3px]" : "absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/52 px-5 backdrop-blur-[3px]"}>
      <div className={isDarkTheme ? "rounded-2xl border border-cyan-500/35 bg-slate-950/90 p-4 text-center shadow-2xl" : "rounded-2xl border border-cyan-200 bg-white/92 p-4 text-center shadow-2xl"}>
        <div className={isDarkTheme ? "text-sm font-black text-slate-50" : "text-sm font-black text-slate-950"}>登录解锁最新情报</div>
        <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-500"}>
          未登录仅展示延迟样例，接入 Telegram 群后查看实时信源。
        </p>
        <button
          className="mt-3 rounded-full bg-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onTelegramLogin();
          }}
        >
          Telegram 登录
        </button>
      </div>
    </div>
  );
}

function getSignalCardClassName({
  isActive,
  isDarkTheme,
  isLocked,
  record,
}: {
  isActive: boolean;
  isDarkTheme: boolean;
  isLocked: boolean;
  record: PaperPositionRecord | null;
}): string {
  const baseClassName = "relative w-full cursor-pointer overflow-hidden rounded-2xl border p-3 text-left shadow-sm transition";
  const activeClassName = isActive ? " ring-2 ring-cyan-400/65" : "";
  const lockedClassName = isLocked ? " min-h-[274px]" : "";

  if (record?.status === "entered") {
    const isNegative = record.pnlPercent !== null && record.pnlPercent < 0;
    const toneClassName = isDarkTheme
      ? isNegative ? "border-rose-800/70 bg-rose-950/28 hover:border-rose-600" : "border-emerald-800/70 bg-emerald-950/28 hover:border-emerald-600"
      : isNegative ? "border-rose-200 bg-rose-50/86 hover:border-rose-300" : "border-emerald-200 bg-emerald-50/86 hover:border-emerald-300";
    return `${baseClassName} ${toneClassName}${activeClassName}${lockedClassName}`;
  }

  if (record?.status === "exited") {
    const isStopLoss = record.exitReason === "stop-loss";
    const toneClassName = isDarkTheme
      ? isStopLoss ? "border-rose-900/70 bg-slate-950 hover:border-rose-700" : "border-emerald-900/70 bg-slate-950 hover:border-emerald-700"
      : isStopLoss ? "border-rose-200 bg-white hover:bg-rose-50/70" : "border-emerald-200 bg-white hover:bg-emerald-50/70";
    return `${baseClassName} ${toneClassName}${activeClassName}${lockedClassName}`;
  }

  if (record?.status === "not-entered") {
    const toneClassName = isDarkTheme
      ? "border-amber-800/70 bg-amber-950/24 hover:border-amber-600"
      : "border-amber-200 bg-amber-50/78 hover:border-amber-300";
    return `${baseClassName} ${toneClassName}${activeClassName}${lockedClassName}`;
  }

  const defaultClassName = isDarkTheme
    ? "border-slate-800 bg-slate-950 hover:border-slate-700"
    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50";
  return `${baseClassName} ${defaultClassName}${activeClassName}${lockedClassName}`;
}

function getSignalCardBackClassName(isDarkTheme: boolean, record: PaperPositionRecord | null): string {
  const baseClassName = "w-full rounded-2xl border p-3 shadow-sm";
  if (record?.status === "entered") {
    return isDarkTheme
      ? `${baseClassName} border-cyan-800/70 bg-slate-950`
      : `${baseClassName} border-cyan-200 bg-white`;
  }

  return isDarkTheme
    ? `${baseClassName} border-slate-800 bg-slate-950`
    : `${baseClassName} border-slate-200 bg-white`;
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
