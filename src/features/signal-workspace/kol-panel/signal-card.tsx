"use client";

import type { WorkspaceCopy } from "@/i18n/workspace";
import type { PaperPositionRecord } from "@/lib/paper-position";
import type { StructuredSignal } from "@/types/signal";
import { FavoriteStarButton, SignalField, SourceAvatar, SymbolIcon, TelegramSignalMessage } from "../card-ui";
import { PaperPositionSummary, formatSignalPaperPositionStatus, getSignalDirectionBadgeClass, getSignalPaperPositionBadgeClass } from "../paper-position-summary";
import { ChevronRightIcon, formatKolEntryText, formatSignalDisplayTime, formatSymbolLabel, formatTakeProfitText, getSignalCardBackClassName, getSignalCardClassName } from "./styles";

export function KolSignalCard({
  cardRef,
  copy,
  index,
  isActive,
  isDarkTheme,
  isFlipped,
  isWatchlisted,
  paperPositionError,
  paperPositionRecord,
  signal,
  onFollowRequest,
  onFlipToggle,
  onSelect,
  onSourceWatchToggle,
}: {
  cardRef: (element: HTMLDivElement | null) => void;
  copy: WorkspaceCopy;
  index: number;
  isActive: boolean;
  isDarkTheme: boolean;
  isFlipped: boolean;
  isWatchlisted: boolean;
  paperPositionError: string | null;
  paperPositionRecord: PaperPositionRecord | null;
  signal: StructuredSignal;
  onFollowRequest?: (signal: StructuredSignal) => void;
  onFlipToggle: () => void;
  onSelect: () => void;
  onSourceWatchToggle?: (signal: StructuredSignal) => void;
}) {
  const entryText = formatKolEntryText(signal, copy);
  const takeProfitText = formatTakeProfitText(signal.take_profit, copy);
  const cardClassName = getSignalCardClassName({ isActive, isDarkTheme, paperPositionRecord });
  const backCardClassName = getSignalCardBackClassName(isDarkTheme);
  const rawButtonClassName = isDarkTheme
    ? "motion-fx-3-raw-button inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-slate-400 transition hover:bg-white/[0.08] hover:text-sky-300"
    : "motion-fx-3-raw-button inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-slate-400 transition hover:bg-[#EAF8FE] hover:text-[#008DCC]";

  return (
    <div ref={cardRef} className="signal-card-scene will-change-transform" data-guide-target={index === 0 ? "kol-first-card" : undefined}>
      <div className={`signal-card-flipper ${isFlipped ? "is-flipped" : ""}`}>
        <div className={`${cardClassName} motion-fx-3-card-face-front signal-card-face`} role="button" tabIndex={0} onClick={onSelect} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }}>
          <div className="motion-fx-3-front-panel flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <SourceAvatar isDarkTheme={isDarkTheme} name={signal.source_name} url={signal.source_avatar_url} />
              <div className="min-w-0 flex-1">
                <div className={isDarkTheme ? "truncate text-sm font-semibold text-slate-50" : "truncate text-sm font-semibold text-slate-950"}>{signal.source_name}</div>
                <div className={isDarkTheme ? "mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-400" : "mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500"}>
                  <span className="min-w-0 truncate whitespace-nowrap">{formatSignalDisplayTime(signal)}</span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button className={rawButtonClassName} type="button" onClick={(event) => { event.stopPropagation(); onFlipToggle(); }} onKeyDown={(event) => event.stopPropagation()}>
                <span>{copy.kol.viewSource}</span>
                <ChevronRightIcon />
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className={isDarkTheme ? "inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-1 text-slate-200" : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700"}>
              <SymbolIcon symbol={signal.symbol} />
              {formatSymbolLabel(signal.symbol)}
            </span>
            <span className={getSignalDirectionBadgeClass(isDarkTheme, signal.direction)}>{copy.kol.directionShort[signal.direction]}</span>
            <span className={getSignalPaperPositionBadgeClass(isDarkTheme, paperPositionRecord)}>{formatSignalPaperPositionStatus(paperPositionRecord, paperPositionError, copy.paper)}</span>
            {onSourceWatchToggle ? (
              <FavoriteStarButton activeLabel={copy.workspace.watchlist.removeFavorite} inactiveLabel={copy.workspace.watchlist.addFavorite} isActive={isWatchlisted} isDarkTheme={isDarkTheme} onToggle={() => onSourceWatchToggle(signal)} />
            ) : null}
          </div>

          <div className="signal-card-field-layer mt-3 grid grid-cols-2 gap-2 text-xs">
            <SignalField isDarkTheme={isDarkTheme} label={copy.kol.entry} value={entryText} />
            <SignalField isDarkTheme={isDarkTheme} label={copy.kol.stopLoss} value={signal.stop_loss?.toLocaleString("en-US") ?? "--"} />
            <SignalField isDarkTheme={isDarkTheme} label={copy.kol.takeProfit} value={takeProfitText} />
            <SignalField isDarkTheme={isDarkTheme} label={copy.kol.condition} value={signal.confirmation ?? copy.kol.conditionFallback} />
          </div>

          <PaperPositionSummary copy={copy.paper} error={paperPositionError} isActive={isActive} isDarkTheme={isDarkTheme} record={paperPositionRecord} />
          {onFollowRequest ? <FollowSignalStrip copy={copy} isDarkTheme={isDarkTheme} signal={signal} onFollowRequest={onFollowRequest} /> : null}
        </div>
        <div className={`${backCardClassName} motion-fx-3-card-face-back signal-card-face signal-card-back`}>
          <div className="motion-fx-3-back-panel flex h-full min-h-0 flex-col">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className={isDarkTheme ? "text-sm font-bold text-slate-50" : "text-sm font-bold text-slate-950"}>{copy.kol.replayTitle}</div>
              <button className={rawButtonClassName} type="button" onClick={(event) => { event.stopPropagation(); onFlipToggle(); }} onKeyDown={(event) => event.stopPropagation()}>
                <span>{copy.kol.back}</span>
                <ChevronRightIcon />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TelegramSignalMessage copy={copy.kol} isDarkTheme={isDarkTheme} signal={signal} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FollowSignalStrip({ copy, isDarkTheme, signal, onFollowRequest }: { copy: WorkspaceCopy; isDarkTheme: boolean; signal: StructuredSignal; onFollowRequest: (signal: StructuredSignal) => void }) {
  const stripClassName = isDarkTheme ? "mt-3 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-3" : "mt-3 rounded-2xl border border-[#CDEFFF] bg-[#F1FBFF] p-3";
  const labelClassName = isDarkTheme ? "text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-300" : "text-[11px] font-semibold uppercase tracking-[0.08em] text-[#087EBB]";
  const metaClassName = isDarkTheme ? "mt-1 text-xs font-medium text-slate-300" : "mt-1 text-xs font-medium text-slate-600";
  const buttonClassName = isDarkTheme ? "mt-3 inline-flex h-9 w-full items-center justify-center rounded-full border border-sky-400/25 bg-sky-400/15 px-3 text-xs font-semibold text-sky-200 transition hover:bg-sky-400/20" : "mt-3 inline-flex h-9 w-full items-center justify-center rounded-full bg-[#00A6F4] px-3 text-xs font-semibold text-white transition hover:bg-[#0097DD]";

  return (
    <div className={stripClassName}>
      <div className={labelClassName}>{copy.workspace.followConversion.signalCardLabel}</div>
      <div className={metaClassName}>{copy.workspace.followConversion.signalCardMeta}</div>
      <button className={buttonClassName} type="button" onClick={(event) => { event.stopPropagation(); onFollowRequest(signal); }} onKeyDown={(event) => event.stopPropagation()}>
        {copy.workspace.followConversion.signalCardCta}
      </button>
    </div>
  );
}
