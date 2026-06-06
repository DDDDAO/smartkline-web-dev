import { getWorkspaceCopy, type WorkspaceLanguage } from "@/app/_lib/i18n";
import type { ChartTheme } from "@/app/_components/kline-chart";
import type { SignalAiHighlightTone, SignalAiSummary } from "@/app/_lib/signal-ai-summary";

export function AiSignalSummaryOverlay({
  language,
  summary,
  theme,
}: {
  language: WorkspaceLanguage;
  summary: SignalAiSummary | null;
  theme: ChartTheme;
}) {
  if (!summary || summary.totalCount === 0) {
    return null;
  }

  const isDarkTheme = theme === "dark";
  const copy = getWorkspaceCopy(language);
  const wrapperClassName = "group pointer-events-auto absolute left-4 top-4 z-30";
  const triggerClassName = isDarkTheme
    ? "motion-fx-9-surface inline-flex h-10 items-center rounded-full border border-white/[0.075] bg-[#161B24]/92 px-4 text-xs font-medium text-slate-200 shadow-[0_12px_30px_rgba(0,0,0,0.24)] outline-none backdrop-blur-xl hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-[#1B2230] focus-visible:border-sky-500/40"
    : "motion-fx-9-surface inline-flex h-10 items-center rounded-full border border-slate-200/90 bg-white/98 px-4 text-xs font-medium text-slate-700 shadow-[0_10px_28px_rgba(15,23,42,0.08)] outline-none backdrop-blur-xl hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white focus-visible:border-sky-200";
  const panelBaseClassName = isDarkTheme
    ? "motion-fx-9-surface absolute left-0 top-12 w-[min(420px,calc(100vw-2rem))] rounded-[24px] border border-white/[0.075] bg-[#161B24]/96 p-5 text-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl"
    : "motion-fx-9-surface absolute left-0 top-12 w-[min(420px,calc(100vw-2rem))] rounded-[24px] border border-slate-200/90 bg-white/98 p-5 text-slate-950 shadow-[0_20px_52px_rgba(15,23,42,0.10)] backdrop-blur-xl";
  const panelVisibilityClassName = "pointer-events-none translate-y-1 opacity-0 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100";
  const panelClassName = `${panelBaseClassName} ${panelVisibilityClassName}`;
  const mutedClassName = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const countClassName = isDarkTheme
    ? "rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-slate-200"
    : "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700";
  const metricCardClassName = isDarkTheme
    ? "rounded-[20px] border border-white/[0.075] bg-white/[0.035] px-4 py-3"
    : "rounded-[20px] border border-slate-200/90 bg-slate-50/80 px-4 py-3";
  const metricLabelClassName = isDarkTheme ? "text-[11px] font-medium text-slate-500" : "text-[11px] font-medium text-slate-400";
  const frequencyBlockClassName = isDarkTheme
    ? "mt-4 rounded-[20px] border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[12px] leading-6 text-slate-400"
    : "mt-4 rounded-[20px] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-[12px] leading-6 text-slate-500";
  const longBarWidth = Math.max(summary.longPercent, summary.shortPercent > 0 ? 0 : 8);
  const shortBarWidth = Math.max(summary.shortPercent, summary.longPercent > 0 ? 0 : 8);

  return (
    <div className={wrapperClassName}>
      <div
        aria-describedby="ai-signal-summary-panel"
        aria-label={copy.ai.ariaLabel}
        className={triggerClassName}
        data-guide-target="ai-summary-button"
        role="note"
        title={copy.ai.title}
      >
        <span>{copy.ai.label}</span>
      </div>

      <div className={panelClassName} id="ai-signal-summary-panel">
        <div className="flex items-start justify-between gap-4">
          <p className={`min-w-0 flex-1 text-[13px] leading-6 ${mutedClassName}`}>
            {summary.summaryText}
          </p>
          <span className={countClassName}>{copy.ai.count(summary.totalCount)}</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className={metricCardClassName}>
            <div className={metricLabelClassName}>{copy.ai.long}</div>
            <div className="mt-2 text-[15px] font-semibold text-emerald-500">{summary.longPercent}%</div>
          </div>
          <div className={metricCardClassName}>
            <div className={metricLabelClassName}>{copy.ai.short}</div>
            <div className="mt-2 text-[15px] font-semibold text-rose-500">{summary.shortPercent}%</div>
          </div>
          <div className={metricCardClassName}>
            <div className={metricLabelClassName}>{copy.ai.sample}</div>
            <div className={isDarkTheme ? "mt-2 text-[15px] font-semibold text-slate-100" : "mt-2 text-[15px] font-semibold text-slate-800"}>
              {summary.totalCount}
            </div>
          </div>
        </div>

        <div className={isDarkTheme ? "mt-4 overflow-hidden rounded-full bg-white/[0.06]" : "mt-4 overflow-hidden rounded-full bg-slate-100"}>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full">
            <div className="bg-emerald-500/90" style={{ width: `${longBarWidth}%` }} />
            <div className="bg-rose-500/75" style={{ width: `${shortBarWidth}%` }} />
          </div>
        </div>

        {summary.highlights.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {summary.highlights.slice(0, 3).map((range) => (
              <span key={`${range.label}-${range.minPrice}-${range.maxPrice}`} className={createHighlightBadgeClass(isDarkTheme, range.tone)}>
                {range.label} {formatPrice(range.minPrice)}-{formatPrice(range.maxPrice)}
              </span>
            ))}
          </div>
        ) : null}

        {summary.highFrequencyPrices.length > 0 ? (
          <div className={frequencyBlockClassName}>
            <span className={isDarkTheme ? "font-semibold text-slate-200" : "font-semibold text-slate-800"}>{copy.ai.highFrequencyPrices}</span>
            <span className="mx-1 text-slate-400">·</span>
            {summary.highFrequencyPrices.map(formatPrice).join(" / ")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function createHighlightBadgeClass(isDarkTheme: boolean, tone: SignalAiHighlightTone): string {
  const baseClassName = "rounded-full border px-3 py-1.5 text-[11px] font-medium";
  const toneClassNames: Record<SignalAiHighlightTone, { dark: string; light: string }> = {
    disagreement: {
      dark: "border-violet-400/18 bg-violet-400/10 text-violet-200",
      light: "border-violet-200 bg-violet-50 text-violet-700",
    },
    long: {
      dark: "border-emerald-400/18 bg-emerald-400/10 text-emerald-200",
      light: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    risk: {
      dark: "border-amber-400/18 bg-amber-400/10 text-amber-200",
      light: "border-amber-200 bg-amber-50 text-amber-700",
    },
    short: {
      dark: "border-rose-400/18 bg-rose-400/10 text-rose-200",
      light: "border-rose-200 bg-rose-50 text-rose-700",
    },
    target: {
      dark: "border-cyan-400/18 bg-cyan-400/10 text-cyan-200",
      light: "border-cyan-200 bg-cyan-50 text-cyan-700",
    },
  };

  return `${baseClassName} ${isDarkTheme ? toneClassNames[tone].dark : toneClassNames[tone].light}`;
}

function formatPrice(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: value >= 1_000 ? 1 : 4 });
}
