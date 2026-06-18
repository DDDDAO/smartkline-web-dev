import { useState } from "react";
import { getWorkspaceCopy, type WorkspaceLanguage } from "@/i18n/workspace";
import type { ChartTheme } from "@/components/charts/kline-chart/types";
import type { SignalAiHighlightTone, SignalAiSummary } from "@/lib/signal-ai-summary";

export function AiSignalSummaryOverlay({
  isCompactLayout = false,
  language,
  summary,
  theme,
}: {
  isCompactLayout?: boolean;
  language: WorkspaceLanguage;
  summary: SignalAiSummary | null;
  theme: ChartTheme;
}) {
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  if (!summary || summary.totalCount === 0) {
    return null;
  }

  const isDarkTheme = theme === "dark";
  const copy = getWorkspaceCopy(language);
  const wrapperClassName = "group pointer-events-auto absolute left-3 top-12 z-30 lg:left-4 lg:top-14";
  const triggerClassName = isDarkTheme
    ? "motion-fx-9-surface inline-flex h-9 items-center rounded-full border border-white/[0.075] bg-[#161B24]/92 px-3 text-xs font-medium text-slate-200 shadow-[0_12px_30px_rgba(0,0,0,0.24)] outline-none backdrop-blur-xl hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-[#1B2230] focus-visible:border-sky-500/40 lg:h-10 lg:px-4"
    : "motion-fx-9-surface inline-flex h-9 items-center rounded-full border border-slate-200/90 bg-white/98 px-3 text-xs font-medium text-slate-700 shadow-[0_10px_28px_rgba(15,23,42,0.08)] outline-none backdrop-blur-xl hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white focus-visible:border-sky-200 lg:h-10 lg:px-4";
  const panelBaseClassName = isDarkTheme
    ? "motion-fx-9-surface absolute left-0 top-11 max-h-[min(54dvh,420px)] w-[min(340px,calc(100vw-1.5rem))] overflow-y-auto rounded-[22px] border border-white/[0.075] bg-[#161B24]/96 p-3.5 text-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl lg:top-12 lg:max-h-none lg:w-[min(420px,calc(100vw-2rem))] lg:overflow-visible lg:rounded-[24px] lg:p-5"
    : "motion-fx-9-surface absolute left-0 top-11 max-h-[min(54dvh,420px)] w-[min(340px,calc(100vw-1.5rem))] overflow-y-auto rounded-[22px] border border-slate-200/90 bg-white/98 p-3.5 text-slate-950 shadow-[0_20px_52px_rgba(15,23,42,0.10)] backdrop-blur-xl lg:top-12 lg:max-h-none lg:w-[min(420px,calc(100vw-2rem))] lg:overflow-visible lg:rounded-[24px] lg:p-5";
  const panelVisibilityClassName = isCompactLayout
    ? isMobilePanelOpen
      ? "pointer-events-auto translate-y-0 opacity-100"
      : "pointer-events-none translate-y-1 opacity-0"
    : "pointer-events-none translate-y-1 opacity-0 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100";
  const panelClassName = `${panelBaseClassName} ${panelVisibilityClassName}`;
  const mutedClassName = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const countClassName = isDarkTheme
    ? "rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-slate-200"
    : "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700";
  const metricCardClassName = isDarkTheme
    ? "rounded-[18px] border border-white/[0.075] bg-white/[0.035] px-3 py-2.5 lg:rounded-[20px] lg:px-4 lg:py-3"
    : "rounded-[18px] border border-slate-200/90 bg-slate-50/80 px-3 py-2.5 lg:rounded-[20px] lg:px-4 lg:py-3";
  const metricLabelClassName = isDarkTheme ? "text-[11px] font-medium text-slate-500" : "text-[11px] font-medium text-slate-400";
  const frequencyBlockClassName = isDarkTheme
    ? "mt-4 rounded-[20px] border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[12px] leading-6 text-slate-400"
    : "mt-4 rounded-[20px] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-[12px] leading-6 text-slate-500";
  const longBarWidth = Math.max(summary.longPercent, summary.shortPercent > 0 ? 0 : 8);
  const shortBarWidth = Math.max(summary.shortPercent, summary.longPercent > 0 ? 0 : 8);

  return (
    <div className={wrapperClassName}>
      <button
        aria-describedby="ai-signal-summary-panel"
        aria-expanded={isCompactLayout ? isMobilePanelOpen : undefined}
        aria-label={copy.ai.ariaLabel}
        className={triggerClassName}
        data-guide-target="ai-summary-button"
        title={copy.ai.title}
        type="button"
        onClick={() => {
          if (isCompactLayout) {
            setIsMobilePanelOpen((isOpen) => !isOpen);
          }
        }}
      >
        <span>{copy.ai.label}</span>
      </button>

      <div className={panelClassName} id="ai-signal-summary-panel">
        <div className="flex items-start justify-between gap-4">
          <p className={`min-w-0 flex-1 text-[13px] leading-6 ${mutedClassName}`}>
            {summary.summaryText}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <span className={countClassName}>{copy.ai.count(summary.totalCount)}</span>
            {isCompactLayout ? (
              <button
                className={isDarkTheme ? "grid h-7 w-7 place-items-center rounded-full bg-white/[0.06] text-slate-400" : "grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-slate-500"}
                type="button"
                onClick={() => setIsMobilePanelOpen(false)}
              >
                <span className="sr-only">{copy.common.close}</span>
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 lg:gap-3">
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
