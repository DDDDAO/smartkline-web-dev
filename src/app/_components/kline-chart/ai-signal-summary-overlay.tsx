import type { SignalAiHighlightTone, SignalAiSummary } from "@/app/_lib/signal-ai-summary";
import type { ChartTheme } from "@/app/_components/kline-chart";

export function AiSignalSummaryOverlay({
  summary,
  theme,
}: {
  summary: SignalAiSummary | null;
  theme: ChartTheme;
}) {
  if (!summary || summary.totalCount === 0) {
    return null;
  }

  const isDarkTheme = theme === "dark";
  const containerClassName = isDarkTheme
    ? "pointer-events-auto absolute left-4 top-4 z-30 w-[min(360px,calc(100%-2rem))] rounded-2xl border border-slate-700/80 bg-slate-950/86 p-3 text-slate-100 shadow-2xl backdrop-blur-md"
    : "pointer-events-auto absolute left-4 top-4 z-30 w-[min(360px,calc(100%-2rem))] rounded-2xl border border-slate-200/90 bg-white/88 p-3 text-slate-950 shadow-xl backdrop-blur-md";
  const mutedClassName = isDarkTheme ? "text-slate-400" : "text-slate-500";

  return (
    <div className={containerClassName}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={isDarkTheme ? "text-xs font-semibold text-cyan-300" : "text-xs font-semibold text-cyan-700"}>AI 窗口情报总结</div>
          <div className={`mt-1 text-xs leading-5 ${mutedClassName}`}>{summary.summaryText}</div>
        </div>
        <span className={isDarkTheme ? "rounded-full bg-slate-900 px-2 py-1 text-[11px] font-bold text-slate-300" : "rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600"}>
          {summary.totalCount} 条
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-full bg-rose-500/20">
        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${summary.longPercent}%` }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] font-semibold">
        <span className="text-emerald-500">多 {summary.longPercent}%</span>
        <span className="text-rose-500">空 {summary.shortPercent}%</span>
      </div>

      <div className={isDarkTheme ? "mt-2 rounded-xl border border-slate-800 bg-slate-900/70 px-2.5 py-2 text-[11px] text-slate-400" : "mt-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-[11px] text-slate-500"}>
        图上斜纹区是窗口统计，实心色块是当前信号计划。
      </div>

      {summary.highlights.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {summary.highlights.slice(0, 3).map((range) => (
            <span key={`${range.label}-${range.minPrice}-${range.maxPrice}`} className={createHighlightBadgeClass(isDarkTheme, range.tone)}>
              {range.label} {formatPrice(range.minPrice)}-{formatPrice(range.maxPrice)}
            </span>
          ))}
        </div>
      ) : null}

      {summary.highFrequencyPrices.length > 0 ? (
        <div className={`mt-2 text-[11px] ${mutedClassName}`}>
          高频价位：{summary.highFrequencyPrices.map(formatPrice).join(" / ")}
        </div>
      ) : null}
    </div>
  );
}

function createHighlightBadgeClass(isDarkTheme: boolean, tone: SignalAiHighlightTone): string {
  const baseClassName = "rounded-full border px-2 py-1 text-[10px] font-bold";
  const toneClassNames: Record<SignalAiHighlightTone, { dark: string; light: string }> = {
    disagreement: {
      dark: "border-violet-800/70 bg-violet-950/55 text-violet-300",
      light: "border-violet-100 bg-violet-50 text-violet-700",
    },
    long: {
      dark: "border-emerald-800/70 bg-emerald-950/55 text-emerald-300",
      light: "border-emerald-100 bg-emerald-50 text-emerald-700",
    },
    risk: {
      dark: "border-rose-800/70 bg-rose-950/55 text-rose-300",
      light: "border-rose-100 bg-rose-50 text-rose-700",
    },
    short: {
      dark: "border-red-800/70 bg-red-950/55 text-red-300",
      light: "border-red-100 bg-red-50 text-red-700",
    },
    target: {
      dark: "border-teal-800/70 bg-teal-950/55 text-teal-300",
      light: "border-teal-100 bg-teal-50 text-teal-700",
    },
  };

  return `${baseClassName} ${isDarkTheme ? toneClassNames[tone].dark : toneClassNames[tone].light}`;
}

function formatPrice(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: value >= 1_000 ? 1 : 4 });
}
