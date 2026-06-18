import { getWorkspaceCopy, type WorkspaceLanguage } from "@/i18n/workspace";
import type { ChartTheme, KlineSignalBiasSummary } from "./types";

export function SignalBiasSummaryOverlay({
  language,
  summary,
  theme,
}: {
  language: WorkspaceLanguage;
  summary: KlineSignalBiasSummary | null;
  theme: ChartTheme;
}) {
  if (!summary || summary.totalCount === 0) {
    return null;
  }

  const copy = getWorkspaceCopy(language);
  const isDarkTheme = theme === "dark";
  const shellClassName = isDarkTheme
    ? "pointer-events-none absolute left-3 top-8 z-[35] max-w-[calc(100%-7rem)] overflow-hidden rounded-full border border-white/[0.08] bg-[#161B24]/86 px-2.5 py-1.5 text-[10px] font-bold text-slate-200 shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:left-4 sm:top-9 sm:text-[11px]"
    : "pointer-events-none absolute left-3 top-8 z-[35] max-w-[calc(100%-7rem)] overflow-hidden rounded-full border border-slate-200/90 bg-white/92 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:left-4 sm:top-9 sm:text-[11px]";
  const mutedClassName = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const barTrackClassName = isDarkTheme ? "bg-white/[0.08]" : "bg-slate-100";

  return (
    <div className={shellClassName}>
      <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
        <span className={mutedClassName}>{copy.kline.signalBiasTitle}</span>
        <span className="text-emerald-500">{copy.kline.signalBiasLong(summary.longPercent, summary.longCount)}</span>
        <span className="text-rose-500">{copy.kline.signalBiasShort(summary.shortPercent, summary.shortCount)}</span>
        <span className={mutedClassName}>{copy.kline.signalBiasSample(summary.totalCount)}</span>
        <span className={`hidden h-1.5 w-16 overflow-hidden rounded-full sm:flex ${barTrackClassName}`}>
          <span className="h-full bg-emerald-500/90" style={{ width: `${summary.longPercent}%` }} />
          <span className="h-full bg-rose-500/80" style={{ width: `${summary.shortPercent}%` }} />
        </span>
      </div>
    </div>
  );
}
