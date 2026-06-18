import type { CopyTradingReturnCurvePoint } from "@/app/_types/copy-trading";
import type { PriceColorMode } from "@/components/charts/kline-chart/types";
import type { TradingFoxStrategyCurve } from "@/app/_lib/tradingfox-control-plane";
import type { PerformanceCurveMetric, PerformanceCurvePoint } from "./types";

const DEFAULT_ASSET = "USDT";

export function adaptTradingFoxStrategyCurvePoints(curve: TradingFoxStrategyCurve | null): PerformanceCurvePoint[] {
  return normalizePerformanceCurvePoints((curve?.points ?? []).flatMap((point) => {
    const timestamp = Date.parse(point.timestamp);
    if (!Number.isFinite(timestamp)) {
      return [];
    }

    return [{
      currency: point.currency ?? curve?.currency ?? null,
      pnl: finiteNumberOrNull(point.pnl),
      roi: tradingFoxPercentToRatio(point.roi),
      timestamp,
    }];
  }));
}

export function adaptMetricCurvePoints(
  points: readonly CopyTradingReturnCurvePoint[],
  metric: PerformanceCurveMetric,
): PerformanceCurvePoint[] {
  return normalizePerformanceCurvePoints(points.flatMap((point) => {
    if (!Number.isFinite(point.timestamp) || !Number.isFinite(point.value)) {
      return [];
    }

    return [{
      [metric]: point.value,
      timestamp: point.timestamp,
    } as PerformanceCurvePoint];
  }));
}

export function mergeReturnAndPnlCurvePoints({
  asset,
  pnlCurve,
  returnCurve,
}: {
  asset?: string | null;
  pnlCurve: readonly CopyTradingReturnCurvePoint[];
  returnCurve: readonly CopyTradingReturnCurvePoint[];
}): PerformanceCurvePoint[] {
  const pointsByTimestamp = new Map<number, PerformanceCurvePoint>();

  for (const point of returnCurve) {
    if (!Number.isFinite(point.timestamp) || !Number.isFinite(point.value)) {
      continue;
    }
    pointsByTimestamp.set(point.timestamp, {
      ...(asset ? { asset } : {}),
      roi: point.value,
      timestamp: point.timestamp,
    });
  }

  for (const point of pnlCurve) {
    if (!Number.isFinite(point.timestamp) || !Number.isFinite(point.value)) {
      continue;
    }
    const existing = pointsByTimestamp.get(point.timestamp);
    pointsByTimestamp.set(point.timestamp, {
      ...(asset ? { asset } : {}),
      ...existing,
      pnl: point.value,
      timestamp: point.timestamp,
    });
  }

  return normalizePerformanceCurvePoints([...pointsByTimestamp.values()]);
}

export function adaptValueCurvePoints(
  points: readonly { timestamp: number; value: number }[],
  metric: PerformanceCurveMetric,
): PerformanceCurvePoint[] {
  return normalizePerformanceCurvePoints(points.flatMap((point) => {
    if (!Number.isFinite(point.timestamp) || !Number.isFinite(point.value)) {
      return [];
    }

    return [{
      [metric]: point.value,
      timestamp: point.timestamp,
    } as PerformanceCurvePoint];
  }));
}

export function normalizePerformanceCurvePoints(points: readonly PerformanceCurvePoint[]): PerformanceCurvePoint[] {
  return points
    .filter((point) => Number.isFinite(point.timestamp) && (isFiniteMetricValue(point.roi) || isFiniteMetricValue(point.pnl)))
    .slice()
    .sort((left, right) => left.timestamp - right.timestamp);
}

export function getLatestPerformanceCurvePoint(
  points: readonly PerformanceCurvePoint[],
  metric: PerformanceCurveMetric,
): PerformanceCurvePoint | null {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    if (isFiniteMetricValue(point?.[metric])) {
      return point ?? null;
    }
  }
  return null;
}

export function getPerformanceCurveMetricValue(point: PerformanceCurvePoint | null | undefined, metric: PerformanceCurveMetric): number | null {
  return finiteNumberOrNull(point?.[metric]);
}

export function formatPerformanceCurveDate(value: number | null): string {
  const date = createValidDate(value);
  if (!date) {
    return "--";
  }

  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatPerformanceCurveTime(value: number | null): string {
  const date = createValidDate(value);
  if (!date) {
    return "--";
  }

  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatPerformanceCurvePercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const normalized = Math.abs(value) < 0.00005 ? 0 : value;
  const sign = normalized > 0 ? "+" : "";
  return `${sign}${(normalized * 100).toFixed(2)}%`;
}

export function formatPerformanceCurveAssetAmount(value: number | null, asset = DEFAULT_ASSET): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const normalized = Math.abs(value) < 0.0000005 ? 0 : value;
  const sign = normalized > 0 ? "+" : "";
  const absValue = Math.abs(normalized);
  const fractionDigits = absValue >= 100 ? 2 : absValue >= 1 ? 3 : 4;
  return `${sign}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 2,
  }).format(normalized)} ${asset}`;
}

export function getPerformanceCurveToneClassName(
  isDarkTheme: boolean,
  value: number | null,
  pnlColorMode: PriceColorMode = "positiveGreen",
): string {
  if (value === null || !Number.isFinite(value) || Math.abs(value) < 0.00005) {
    return isDarkTheme ? "text-slate-300" : "text-slate-700";
  }

  const isPositive = value > 0;
  const shouldUseGainColor = pnlColorMode === "positiveGreen" ? isPositive : !isPositive;
  if (shouldUseGainColor) {
    return isDarkTheme ? "text-emerald-300" : "text-emerald-600";
  }

  return isDarkTheme ? "text-rose-300" : "text-rose-600";
}

export function getPerformanceCurveStrokeColor(
  isDarkTheme: boolean,
  value: number | null,
  pnlColorMode: PriceColorMode = "positiveGreen",
): string {
  if (value === null || !Number.isFinite(value) || Math.abs(value) < 0.00005) {
    return isDarkTheme ? "#94A3B8" : "#64748B";
  }

  const isPositive = value > 0;
  const shouldUseGainColor = pnlColorMode === "positiveGreen" ? isPositive : !isPositive;
  return shouldUseGainColor ? "#2FBD85" : "#F6465D";
}

function createValidDate(value: number | null): Date | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function tradingFoxPercentToRatio(value: number | null | undefined): number | null {
  const numberValue = finiteNumberOrNull(value);
  return numberValue === null ? null : numberValue / 100;
}

function finiteNumberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isFiniteMetricValue(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
