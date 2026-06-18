"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { PriceColorMode } from "@/components/charts/kline-chart/types";
import type {
  PerformanceCurveMetric,
  PerformanceCurveMetricLabels,
  PerformanceCurvePoint,
  PerformanceCurveStrokeMode,
  PerformanceCurveValueFormatters,
} from "./types";
import {
  formatPerformanceCurveAssetAmount,
  formatPerformanceCurvePercent,
  formatPerformanceCurveTime,
  getLatestPerformanceCurvePoint,
  getPerformanceCurveMetricValue,
  getPerformanceCurveStrokeColor,
} from "./utils";

type PerformanceCurveDatum = PerformanceCurvePoint & {
  primaryValue: number | null;
};

type PerformanceCurveChartProps = {
  ariaLabel: string;
  className?: string;
  isDarkTheme: boolean;
  metricLabels?: PerformanceCurveMetricLabels;
  pnlColorMode?: PriceColorMode;
  points: readonly PerformanceCurvePoint[];
  primaryMetric: PerformanceCurveMetric;
  showValueAxis?: boolean;
  strokeMode?: PerformanceCurveStrokeMode;
  tooltipMetrics?: readonly PerformanceCurveMetric[];
  valueFormatters?: PerformanceCurveValueFormatters;
};

type PerformanceCurveTooltipProps = {
  active?: boolean;
  isDarkTheme: boolean;
  metricLabels: Required<PerformanceCurveMetricLabels>;
  payload?: Array<{ payload?: PerformanceCurveDatum }>;
  tooltipMetrics: readonly PerformanceCurveMetric[];
  valueFormatters: Required<PerformanceCurveValueFormatters>;
};

const DEFAULT_METRIC_LABELS: Required<PerformanceCurveMetricLabels> = {
  pnl: "PnL",
  roi: "ROI",
};
const DEFAULT_VALUE_FORMATTERS: Required<PerformanceCurveValueFormatters> = {
  pnl: (value, point) => formatPerformanceCurveAssetAmount(value, point?.asset ?? point?.currency ?? undefined),
  roi: (value) => formatPerformanceCurvePercent(value),
};
const VALUE_AXIS_WIDTH = 56;

const CartesianGrid = dynamic(() => import("recharts").then((module) => module.CartesianGrid), { ssr: false });
const Line = dynamic(() => import("recharts").then((module) => module.Line), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((module) => module.LineChart), { ssr: false });
const ReferenceLine = dynamic(() => import("recharts").then((module) => module.ReferenceLine), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((module) => module.ResponsiveContainer), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((module) => module.Tooltip), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((module) => module.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((module) => module.YAxis), { ssr: false });
const COMPACT_AXIS_NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  notation: "compact",
});
const STANDARD_AXIS_NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  notation: "standard",
});

export function PerformanceCurveChart({
  ariaLabel,
  className = "h-full w-full",
  isDarkTheme,
  metricLabels,
  pnlColorMode = "positiveGreen",
  points,
  primaryMetric,
  showValueAxis = true,
  strokeMode = "pnl",
  tooltipMetrics = [primaryMetric],
  valueFormatters,
}: PerformanceCurveChartProps) {
  const data = useMemo(
    () => points
      .map((point) => ({
        ...point,
        primaryValue: getPerformanceCurveMetricValue(point, primaryMetric),
      }))
      .filter((point) => point.primaryValue !== null),
    [points, primaryMetric],
  );
  const latestPoint = getLatestPerformanceCurvePoint(data, primaryMetric);
  const latestValue = getPerformanceCurveMetricValue(latestPoint, primaryMetric);
  const strokeColor = strokeMode === "brand"
    ? (isDarkTheme ? "#38BDF8" : "#00A6F4")
    : getPerformanceCurveStrokeColor(isDarkTheme, latestValue, pnlColorMode);
  const gridColor = isDarkTheme ? "rgba(148,163,184,0.20)" : "rgba(148,163,184,0.28)";
  const cursorColor = isDarkTheme ? "rgba(125,211,252,0.44)" : "rgba(0,166,244,0.28)";
  const axisColor = isDarkTheme ? "rgba(203,213,225,0.72)" : "rgba(71,85,105,0.78)";
  const mergedMetricLabels = { ...DEFAULT_METRIC_LABELS, ...metricLabels };
  const mergedValueFormatters = { ...DEFAULT_VALUE_FORMATTERS, ...valueFormatters };
  const shouldShowZeroLine = data.some((point) => (point.primaryValue ?? 0) < 0) && data.some((point) => (point.primaryValue ?? 0) > 0);

  if (data.length === 0) {
    return null;
  }

  return (
    <figure aria-label={ariaLabel} className={`m-0 ${className}`}>
      <ResponsiveContainer height="100%" width="100%">
        <LineChart
          data={data}
          margin={{ bottom: 4, left: 8, right: showValueAxis ? 0 : 8, top: 8 }}
        >
          <CartesianGrid stroke={gridColor} strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="timestamp"
            domain={["dataMin", "dataMax"]}
            hide
            scale="time"
            type="number"
          />
          {showValueAxis ? (
            <YAxis
              allowDataOverflow={false}
              axisLine={false}
              dataKey="primaryValue"
              domain={createPaddedDomain}
              orientation="right"
              tick={{
                fill: axisColor,
                fontSize: 10,
                fontWeight: 800,
              }}
              tickCount={4}
              tickFormatter={(value) => formatValueAxisTick(value, primaryMetric)}
              tickLine={false}
              tickMargin={4}
              type="number"
              width={VALUE_AXIS_WIDTH}
            />
          ) : (
            <YAxis
              allowDataOverflow={false}
              dataKey="primaryValue"
              domain={createPaddedDomain}
              hide
              type="number"
            />
          )}
          {shouldShowZeroLine ? (
            <ReferenceLine stroke={gridColor} strokeDasharray="4 4" y={0} />
          ) : null}
          <Tooltip
            content={(
              <PerformanceCurveTooltip
                isDarkTheme={isDarkTheme}
                metricLabels={mergedMetricLabels}
                tooltipMetrics={tooltipMetrics}
                valueFormatters={mergedValueFormatters}
              />
            )}
            cursor={{ stroke: cursorColor, strokeWidth: 1.5 }}
            isAnimationActive={false}
          />
          <Line
            activeDot={{ r: 4, stroke: strokeColor, strokeWidth: 2 }}
            dataKey="primaryValue"
            dot={false}
            isAnimationActive={false}
            stroke={strokeColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.6}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}

export function PerformanceCurveWindowSelector<WindowValue extends string>({
  activeWindow,
  ariaLabel,
  isDarkTheme,
  labels,
  onWindowChange,
  windows,
}: {
  activeWindow: WindowValue;
  ariaLabel: string;
  isDarkTheme: boolean;
  labels: Readonly<Record<WindowValue, string>>;
  windows: readonly WindowValue[];
  onWindowChange: (window: WindowValue) => void;
}) {
  const shellClassName = isDarkTheme
    ? "inline-flex rounded-full border border-white/[0.075] bg-[#0F141B] p-0.5"
    : "inline-flex rounded-full border border-[#D5E4EF] bg-[#F8FAFC] p-0.5";

  return (
    <div aria-label={ariaLabel} className={shellClassName} role="toolbar">
      {windows.map((window) => {
        const isActive = window === activeWindow;
        const buttonClassName = isActive
          ? "rounded-full bg-[#00A6F4] px-2.5 py-1.5 text-[11px] font-black text-white shadow-[0_6px_14px_rgba(0,166,244,0.18)]"
          : isDarkTheme
            ? "rounded-full px-2.5 py-1.5 text-[11px] font-black text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100"
            : "rounded-full px-2.5 py-1.5 text-[11px] font-black text-slate-500 transition hover:bg-white hover:text-slate-900";

        return (
          <button
            key={window}
            aria-pressed={isActive}
            className={buttonClassName}
            type="button"
            onClick={() => onWindowChange(window)}
          >
            {labels[window]}
          </button>
        );
      })}
    </div>
  );
}

export function PerformanceCurveLoadingOverlay({
  isDarkTheme,
  label,
}: {
  isDarkTheme: boolean;
  label: string;
}) {
  const shellClassName = isDarkTheme
    ? "pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl border border-sky-400/10 bg-[#111820]/78 backdrop-blur-[2px]"
    : "pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl border border-sky-100 bg-white/78 backdrop-blur-[2px]";
  const labelClassName = isDarkTheme ? "mt-2 text-[10px] font-bold text-slate-400" : "mt-2 text-[10px] font-bold text-slate-500";
  const barClassName = "kline-loading-bar rounded-[1px] bg-[#00A6F4]";

  return (
    <div className={shellClassName}>
      <div className="grid justify-items-center">
        <div aria-hidden="true" className="flex items-end justify-center gap-[4px]">
          <div className={`${barClassName} h-[6px] w-[3px]`} style={{ animationDelay: "-0.32s" }} />
          <div className={`${barClassName} h-[10px] w-[3px]`} style={{ animationDelay: "-0.24s" }} />
          <div className={`${barClassName} h-[16px] w-[3px]`} style={{ animationDelay: "-0.16s" }} />
          <div className={`${barClassName} h-[12px] w-[3px]`} style={{ animationDelay: "-0.08s" }} />
        </div>
        <div className={labelClassName}>{label}</div>
      </div>
    </div>
  );
}

function PerformanceCurveTooltip({
  active,
  isDarkTheme,
  metricLabels,
  payload,
  tooltipMetrics,
  valueFormatters,
}: PerformanceCurveTooltipProps) {
  if (!active) {
    return null;
  }

  const point = payload?.[0]?.payload ?? null;
  if (!point) {
    return null;
  }

  const shellClassName = isDarkTheme
    ? "rounded-2xl border border-white/[0.10] bg-[#0B1118]/95 px-3 py-2 text-xs shadow-2xl shadow-black/30 backdrop-blur"
    : "rounded-2xl border border-[#D8E5EF] bg-white/95 px-3 py-2 text-xs shadow-xl shadow-slate-900/10 backdrop-blur";
  const timeClassName = isDarkTheme ? "text-[10px] font-bold text-slate-500" : "text-[10px] font-bold text-slate-400";
  const labelClassName = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const valueClassName = isDarkTheme ? "font-black text-slate-100" : "font-black text-slate-950";

  return (
    <div className={shellClassName}>
      <div className={timeClassName}>{formatPerformanceCurveTime(point.timestamp)}</div>
      <div className="mt-2 grid gap-1.5">
        {tooltipMetrics.map((metric) => {
          const value = getPerformanceCurveMetricValue(point, metric);
          return (
            <div key={metric} className="flex min-w-36 items-center justify-between gap-4">
              <span className={labelClassName}>{metricLabels[metric]}</span>
              <span className={valueClassName}>{valueFormatters[metric](value, point)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function createPaddedDomain([
  minValue,
  maxValue,
]: readonly [number, number]): [number, number] {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return [0, 1];
  }

  if (minValue === maxValue) {
    const padding = Math.max(0.01, Math.abs(minValue) * 0.08);
    return [minValue - padding, maxValue + padding];
  }

  const padding = Math.max(0.01, (maxValue - minValue) * 0.08);
  return [minValue - padding, maxValue + padding];
}

function formatValueAxisTick(value: unknown, metric: PerformanceCurveMetric): string {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return "";
  }

  return metric === "roi"
    ? formatCompactAxisPercent(numberValue)
    : formatCompactAxisNumber(numberValue);
}

function formatCompactAxisPercent(value: number): string {
  const normalized = Math.abs(value) < 0.00005 ? 0 : value;
  if (normalized === 0) {
    return "0%";
  }

  const percent = normalized * 100;
  const absPercent = Math.abs(percent);
  const fractionDigits = absPercent >= 100 ? 0 : absPercent >= 10 ? 1 : 2;
  return `${percent > 0 ? "+" : ""}${percent.toFixed(fractionDigits)}%`;
}

function formatCompactAxisNumber(value: number): string {
  const normalized = Math.abs(value) < 0.0000005 ? 0 : value;
  if (normalized === 0) {
    return "0";
  }

  const absValue = Math.abs(normalized);
  const formatter = absValue >= 1_000 ? COMPACT_AXIS_NUMBER_FORMATTER : STANDARD_AXIS_NUMBER_FORMATTER;
  const compactValue = formatter.format(absValue);

  return `${normalized > 0 ? "+" : "-"}${compactValue}`;
}
