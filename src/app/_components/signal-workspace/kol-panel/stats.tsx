import type { KolStatsGroupModel, KolStatsMetricModel, KolStatsSummaryModel } from "./shared";
import { getKolStatsMetricValueClassName } from "./model";

export function KolStatsSummaryPanel({
  isDarkTheme,
  summary,
}: {
  isDarkTheme: boolean;
  summary: KolStatsSummaryModel;
}) {
  const containerClassName = isDarkTheme
    ? "bg-[#12161D] px-3 pb-2"
    : "bg-[#FAFBFD] px-3 pb-2";
  const panelClassName = isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2.5"
    : "rounded-2xl border border-[#E5EAF0] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.025)]";
  const titleClassName = isDarkTheme
    ? "min-w-0 truncate text-[11px] font-semibold text-slate-200"
    : "min-w-0 truncate text-[11px] font-semibold text-slate-700";
  const metaClassName = isDarkTheme
    ? "shrink-0 text-[10px] font-medium text-slate-500"
    : "shrink-0 text-[10px] font-medium text-slate-400";

  return (
    <div className={containerClassName}>
      <div className={panelClassName}>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className={titleClassName}>{summary.title}</div>
          <div className={metaClassName}>{summary.meta}</div>
        </div>
        {summary.groups.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {summary.groups.map((group) => (
              <KolStatsGroupRow
                key={group.kolName}
                group={group}
                isDarkTheme={isDarkTheme}
              />
            ))}
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {summary.metrics.map((metric) => (
              <KolStatsMetric
                key={metric.label}
                isDarkTheme={isDarkTheme}
                metric={metric}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function KolStatsGroupRow({
  group,
  isDarkTheme,
}: {
  group: KolStatsGroupModel;
  isDarkTheme: boolean;
}) {
  const rowClassName = isDarkTheme
    ? "grid grid-cols-[minmax(0,1fr)_42px_50px_58px] items-center gap-2 rounded-xl bg-white/[0.035] px-2 py-1.5"
    : "grid grid-cols-[minmax(0,1fr)_42px_50px_58px] items-center gap-2 rounded-xl bg-slate-50 px-2 py-1.5";
  const nameClassName = isDarkTheme
    ? "truncate text-[11px] font-semibold text-slate-200"
    : "truncate text-[11px] font-semibold text-slate-700";
  const mutedClassName = isDarkTheme
    ? "truncate text-right text-[10px] font-medium text-slate-500"
    : "truncate text-right text-[10px] font-medium text-slate-400";
  const totalClassName = getKolStatsMetricValueClassName(
    isDarkTheme,
    group.totalPnlTone,
  );

  return (
    <div className={rowClassName}>
      <div className={nameClassName}>{group.kolName}</div>
      <div className={mutedClassName}>{group.closedText}</div>
      <div className={mutedClassName}>{group.exitBreakdownText}</div>
      <div className={`${totalClassName} text-right`}>{group.totalPnlText}</div>
    </div>
  );
}

export function KolStatsMetric({
  isDarkTheme,
  metric,
}: {
  isDarkTheme: boolean;
  metric: KolStatsMetricModel;
}) {
  const labelClassName = isDarkTheme
    ? "truncate text-[10px] leading-4 text-slate-500"
    : "truncate text-[10px] leading-4 text-slate-400";
  const valueClassName = getKolStatsMetricValueClassName(
    isDarkTheme,
    metric.tone,
  );

  return (
    <div className="min-w-0">
      <div className={labelClassName}>{metric.label}</div>
      <div className={valueClassName}>{metric.value}</div>
    </div>
  );
}
