import { useMemo, useState } from "react";

import type { WorkspaceCopy } from "@/i18n/workspace";
import {
  PerformanceCurveChart,
  PerformanceCurveLoadingOverlay,
  adaptMetricCurvePoints,
  formatPerformanceCurveDate,
  formatPerformanceCurvePercent,
  getPerformanceCurveMetricValue,
  mergeReturnAndPnlCurvePoints,
  type PerformanceCurveValueFormatters,
} from "@/components/charts/performance-curve";
import type { CopyTradingTrader } from "@/types/copy-trading";
import type {
  PnlColorMode,
  TopSignalPerformanceWindow,
} from "./helpers";
import {
  formatDisplayTime,
  formatSignedAssetAmount,
  formatSignedPercent,
  getPnlClassName,
} from "./helpers";
import {
  TOP_SIGNAL_PERFORMANCE_CURVE_METRICS,
  type TopSignalPerformanceCurveMetric,
} from "./constants";

const TOP_SIGNAL_PERFORMANCE_TOOLTIP_METRICS = ["roi", "pnl"] as const;

export function TopSignalPerformanceCurveCard({
  copy,
  isDarkTheme,
  isPerformanceLoading,
  performance,
  performanceWindow,
  pnlColorMode,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  isPerformanceLoading: boolean;
  performance: CopyTradingTrader["performance"];
  performanceWindow: TopSignalPerformanceWindow;
  pnlColorMode: PnlColorMode;
}) {
  const [activeMetric, setActiveMetric] = useState<TopSignalPerformanceCurveMetric>("roi");
  const panelCopy = copy.workspace.topSignals;
  const isPnlMetric = activeMetric === "pnl";
  const performanceAsset = performance?.copier_pnl_asset || "USDT";
  const curvePoints = useMemo(() => mergeReturnAndPnlCurvePoints({
    asset: performanceAsset,
    pnlCurve: performance?.pnl_curve ?? [],
    returnCurve: performance?.return_curve ?? [],
  }), [performance?.pnl_curve, performance?.return_curve, performanceAsset]);
  const points = useMemo(() => (
    isPnlMetric
      ? adaptMetricCurvePoints(performance?.pnl_curve ?? [], "pnl")
      : adaptMetricCurvePoints(performance?.return_curve ?? [], "roi")
  ), [isPnlMetric, performance?.pnl_curve, performance?.return_curve]);
  const latestPoint = points.length > 0 ? points[points.length - 1] : null;
  const metaText = performance?.updated_at
    ? panelCopy.updatedAt(formatDisplayTime(performance.updated_at))
    : panelCopy.performanceHint;
  const cardClassName = isDarkTheme
    ? "mt-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3"
    : "mt-3 rounded-2xl border border-[#E8E8EC] bg-white p-3";
  const curveMetricLabels = useMemo(() => ({ pnl: panelCopy.pnl, roi: panelCopy.roi }), [panelCopy.pnl, panelCopy.roi]);
  const curveValueFormatters = useMemo<PerformanceCurveValueFormatters>(() => ({
    pnl: (value, point) => formatSignedAssetAmount(value, point?.asset || performanceAsset),
    roi: (value) => formatPerformanceCurvePercent(value),
  }), [performanceAsset]);
  const latestValue =
    (latestPoint
      ? getPerformanceCurveMetricValue(latestPoint, isPnlMetric ? "pnl" : "roi")
      : null) ?? (isPnlMetric ? performance?.pnl : performance?.roi) ?? null;
  const latestClassName = getPnlClassName(isDarkTheme, latestValue, pnlColorMode);
  const titleText = isPnlMetric ? panelCopy.pnlCurve : panelCopy.returnCurve;
  const latestLabel = isPnlMetric ? panelCopy.pnlCurveLatest : panelCopy.returnCurveLatest;
  const latestValueText = isPnlMetric
    ? formatSignedAssetAmount(latestValue, performanceAsset)
    : formatSignedPercent(latestValue);
  const emptyText = isPnlMetric ? panelCopy.pnlCurveEmpty : panelCopy.returnCurveEmpty;
  const loadingText = isPnlMetric ? panelCopy.pnlCurveLoading : panelCopy.returnCurveLoading;
  const windowLabel = panelCopy.performanceWindows[performanceWindow] ?? performance?.window ?? performanceWindow;
  const metricToggleShellClassName = isDarkTheme
    ? "inline-flex rounded-full border border-white/[0.075] bg-[#0F131A] p-0.5"
    : "inline-flex rounded-full border border-[#E8E8EC] bg-[#FAFAFA] p-0.5";

  return (
    <div className={cardClassName}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={isDarkTheme ? "text-xs font-bold text-slate-100" : "text-xs font-bold text-slate-900"}>
            {titleText}
          </div>
          <div className={isDarkTheme ? "mt-1 truncate text-[10px] font-medium text-slate-500" : "mt-1 truncate text-[10px] font-medium text-slate-400"}>
            {metaText}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={latestClassName}>{latestValueText}</div>
          <div className={isDarkTheme ? "mt-1 text-[10px] text-slate-500" : "mt-1 text-[10px] text-slate-400"}>
            {latestLabel}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className={isDarkTheme ? "text-[10px] font-medium text-slate-500" : "text-[10px] font-medium text-slate-400"}>
          {windowLabel}
        </div>
        <div aria-label={panelCopy.curveMetricSwitch} className={metricToggleShellClassName} role="group">
          {TOP_SIGNAL_PERFORMANCE_CURVE_METRICS.map((metric) => {
            const isActive = metric === activeMetric;
            const buttonClassName = isActive
              ? "rounded-full bg-[#6366F1] px-2.5 py-1 text-[10px] font-black text-white shadow-[0_6px_14px_rgba(99,102,241,0.18)]"
              : isDarkTheme
                ? "rounded-full px-2.5 py-1 text-[10px] font-bold text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100"
                : "rounded-full px-2.5 py-1 text-[10px] font-bold text-slate-500 transition hover:bg-white hover:text-slate-900";
            return (
              <button
                key={metric}
                aria-pressed={isActive}
                className={buttonClassName}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveMetric(metric);
                }}
              >
                {metric === "pnl" ? panelCopy.pnl : panelCopy.roi}
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative mt-3 h-[92px] overflow-hidden rounded-xl">
        {points.length > 0 ? (
          <>
            <PerformanceCurveChart
              ariaLabel={titleText}
              isDarkTheme={isDarkTheme}
              metricLabels={curveMetricLabels}
              pnlColorMode={pnlColorMode}
              points={curvePoints}
              primaryMetric={isPnlMetric ? "pnl" : "roi"}
              tooltipMetrics={TOP_SIGNAL_PERFORMANCE_TOOLTIP_METRICS}
              valueFormatters={curveValueFormatters}
            />
            {isPerformanceLoading ? (
              <PerformanceCurveLoadingOverlay
                isDarkTheme={isDarkTheme}
                label={loadingText}
              />
            ) : null}
          </>
        ) : isPerformanceLoading ? (
          <div className={isDarkTheme ? "relative h-full rounded-xl border border-white/[0.06] bg-[#181A20]" : "relative h-full rounded-xl border border-[#E8E8EC] bg-[#FAFAFA]"}>
            <PerformanceCurveLoadingOverlay isDarkTheme={isDarkTheme} label={loadingText} />
          </div>
        ) : (
          <div className={isDarkTheme ? "flex h-full items-center justify-center rounded-xl border border-white/[0.06] bg-[#181A20] px-3 text-center text-xs text-slate-500" : "flex h-full items-center justify-center rounded-xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 text-center text-xs text-slate-500"}>
            {emptyText}
          </div>
        )}
      </div>
      {points.length > 0 ? (
        <div className={isDarkTheme ? "mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-500" : "mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-400"}>
          <span>{formatPerformanceCurveDate(points[0]?.timestamp ?? null)}</span>
          <span className="truncate">{titleText}</span>
          <span>{formatPerformanceCurveDate(latestPoint?.timestamp ?? null)}</span>
        </div>
      ) : null}
    </div>
  );
}
