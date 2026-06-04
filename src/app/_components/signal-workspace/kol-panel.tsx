import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { StructuredSignal } from "@/app/_types/signal";
import type { KolSignalSourceStatus } from "./types";
import { KolSignalSourceNotice, SignalField, SourceAvatar } from "./card-ui";
import { PaperPositionSummary, formatSignalPaperPositionStatus, getSignalDirectionBadgeClass, getSignalPaperPositionBadgeClass } from "./paper-position-summary";
import { RawSignalDialog } from "./raw-signal-dialog";

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


  useLayoutEffect(() => {
    const previousRects = previousCardRectsRef.current;
    const previousSignalIds = previousSignalIdsRef.current;
    const currentRects = new Map<string, DOMRect>();

    for (const signal of signals) {
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
    previousSignalIdsRef.current = new Set(signals.map((signal) => signal.id));
  }, [signals]);

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
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <KolSignalSourceNotice isDarkTheme={isDarkTheme} signalCount={signals.length} status={sourceStatus} />
        {signals.map((signal) => {
          const entryText = formatKolEntryText(signal);
          const paperPositionError = paperPositionErrorsBySymbol[signal.symbol] ?? null;
          const paperPositionRecord = paperPositionsBySignalId[signal.id] ?? null;
          const takeProfitText = signal.take_profit.length > 0
            ? signal.take_profit.map((price) => price.toLocaleString("en-US")).join(" / ")
            : "--";
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
                <span className={isDarkTheme ? "rounded-full bg-slate-800 px-2 py-1 text-slate-200" : "rounded-full bg-slate-100 px-2 py-1 text-slate-700"}>{signal.symbol.replace("/USDT:USDT", "")}</span>
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


function formatKolEntryText(signal: StructuredSignal): string {
  if (signal.entry_min !== null && signal.entry_max !== null) {
    return `${signal.entry_min.toLocaleString("en-US")}-${signal.entry_max.toLocaleString("en-US")}`;
  }

  if (signal.trigger_price !== null) {
    return signal.trigger_price.toLocaleString("en-US");
  }

  return "市价";
}

