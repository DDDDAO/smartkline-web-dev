import type { WorkspaceCopy } from "@/i18n/workspace";
import pillStyles from "../signal-pill.module.css";
import { SourceAvatar, SymbolIcon } from "../card-ui";
import { getPaperPositionBadgeClass, formatSignalPaperPositionStatus, getSignalDirectionBadgeClass, getSignalPaperPositionBadgeClass } from "../paper-position-summary";
import type { WatchedKolSourceModel } from "./shared";
import { formatSymbolLabel } from "./styles";

export function WatchedKolSources({
  copy,
  isDarkTheme,
  onSourceOpen,
  sources,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onSourceOpen: (source: WatchedKolSourceModel) => void;
  sources: readonly WatchedKolSourceModel[];
}) {
  const shellClassName = isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3"
    : "rounded-2xl border border-[#E8E8EC] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.025)]";
  const cardClassName = isDarkTheme
    ? "min-w-0 overflow-hidden rounded-2xl border border-white/[0.075] bg-[#111113] px-3 py-2 text-left transition hover:border-indigo-500/30 hover:bg-white/[0.055]"
    : "min-w-0 overflow-hidden rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 py-2 text-left transition hover:border-[#C7D2FE] hover:bg-[#F5F5FF]";

  return (
    <section className={shellClassName}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={isDarkTheme ? "text-xs font-black text-slate-50" : "text-xs font-black text-slate-950"}>
          {copy.workspace.watchlist.favoriteKols}
        </h3>
        <span className={isDarkTheme ? "text-[10px] font-medium text-slate-500" : "text-[10px] font-medium text-slate-400"}>
          {copy.workspace.watchlist.favoriteCount(sources.length)}
        </span>
      </div>
      <div className="mt-2 grid max-h-[292px] grid-cols-2 gap-2 overflow-y-auto pr-1">
        {sources.map((source) => (
          <button
            key={source.key}
            className={cardClassName}
            type="button"
            onClick={() => onSourceOpen(source)}
          >
            <div className="flex min-w-0 items-center gap-2">
              <SourceAvatar
                isDarkTheme={isDarkTheme}
                name={source.name}
                url={source.avatarUrl}
              />
              <div className="min-w-0 flex-1">
                <div className={isDarkTheme ? "truncate text-xs font-black text-slate-50" : "truncate text-xs font-black text-slate-950"}>
                  {source.name}
                </div>
              </div>
            </div>
            <div className={isDarkTheme ? "mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] text-slate-500" : "mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] text-slate-500"}>
              <span className={getSignalDirectionBadgeClass(isDarkTheme, source.latestSignal.direction)}>
                {copy.kol.directionShort[source.latestSignal.direction]}
              </span>
              <span className={getSignalPaperPositionBadgeClass(isDarkTheme, source.paperPositionRecord)}>
                {formatSignalPaperPositionStatus(source.paperPositionRecord, null, copy.paper)}
              </span>
            </div>
            <div className={isDarkTheme ? "mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-300" : "mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700"}>
              <SymbolIcon symbol={source.latestSignal.symbol} />
              <span>{formatSymbolLabel(source.latestSignal.symbol)}</span>
              <span className={isDarkTheme ? "text-slate-600" : "text-slate-400"}>·</span>
              <span>{copy.workspace.watchlist.signalCount(source.signalCount)}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
export function FilterEmptyState({ copy, isDarkTheme }: { copy: WorkspaceCopy; isDarkTheme: boolean }) {
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

export function KolPanelLoadingState({ copy, isDarkTheme }: { copy: WorkspaceCopy; isDarkTheme: boolean }) {
  const avatarClassName = isDarkTheme
    ? "h-10 w-10 shrink-0 rounded-full border-2 border-[#111113] bg-white/[0.08]"
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

export function KolPanelSourceState({
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
        ? `${pillStyles.pill} ${pillStyles.statusBadge} ${pillStyles.statusLive} ${isDarkTheme ? pillStyles.dark : ""}`
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

export function getKolPanelStateCardClassName(
  isDarkTheme: boolean,
  tone: "loading" | "pending" | "risk",
): string {
  const baseClassName =
    "signal-card-left-status relative w-full overflow-hidden rounded-[18px] border p-3.5 text-left";
  const themeClassName = isDarkTheme
    ? "signal-card-surface-dark border-white/[0.075] bg-white/[0.035]"
    : "signal-card-surface-light border-[#E8E8EC] bg-white";
  const toneClassName =
    tone === "risk"
      ? "signal-card-left-risk"
      : tone === "loading"
        ? "signal-card-left-loading"
        : "signal-card-left-pending";

  return `${baseClassName} ${themeClassName} ${toneClassName}`;
}
