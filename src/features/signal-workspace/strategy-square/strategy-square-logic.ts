import type { WorkspaceCopy, WorkspaceLanguage } from "@/i18n/workspace";
import type { PnlColorMode } from "../top-signals-panel";
import {
  CURVE_HEIGHT,
  CURVE_PADDING,
  CURVE_WIDTH,
  MOCK_CURVE_START_MS,
  MOCK_CURVE_STEP_MS,
  RECOMMENDED_STRATEGY_LIMIT,
  WINDOW_METRIC_MULTIPLIERS,
  type StrategyPaginationItem,
  type StrategyRecommendationSection,
  type StrategySquareFeaturedMetric,
  type StrategySquareItem,
  type StrategySquareLocalizedContent,
  type StrategySquareReturnPoint,
  type StrategySquareRiskLevel,
  type StrategySquareSortKey,
  type StrategySquareType,
  type StrategySquareWindow,
} from "./strategy-square-data";

export function createRecommendationSections(
  strategies: readonly StrategySquareItem[],
  panelCopy: WorkspaceCopy["workspace"]["strategySquare"],
): StrategyRecommendationSection[] {
  return [
    {
      description: panelCopy.metrics.profit30dUsd,
      featuredMetric: "profit",
      key: "highPnl",
      sortKey: "profit",
      strategies: strategies.slice().sort((left, right) => right.metrics.profit30dUsd - left.metrics.profit30dUsd).slice(0, RECOMMENDED_STRATEGY_LIMIT),
      title: panelCopy.rankings.highPnl,
    },
    {
      description: panelCopy.metrics.returnRate,
      featuredMetric: "returnRate",
      key: "highReturn",
      sortKey: "returnRate",
      strategies: strategies.slice().sort((left, right) => compareNullableDesc(left.metrics.returnRate, right.metrics.returnRate)).slice(0, RECOMMENDED_STRATEGY_LIMIT),
      title: panelCopy.rankings.topReturn,
    },
    {
      description: panelCopy.metrics.maxDrawdown30d,
      featuredMetric: "drawdown",
      key: "lowDrawdown",
      sortKey: "drawdown",
      strategies: strategies.slice().sort((left, right) => compareNullableAsc(left.metrics.maxDrawdown, right.metrics.maxDrawdown)).slice(0, RECOMMENDED_STRATEGY_LIMIT),
      title: panelCopy.rankings.lowDrawdown,
    },
  ];
}

export function createMockCurve(values: readonly number[]): StrategySquareReturnPoint[] {
  return values.map((value, index) => ({
    timestamp: MOCK_CURVE_START_MS + index * MOCK_CURVE_STEP_MS,
    value,
  }));
}

export function createPaginationItems(currentPage: number, totalPages: number): StrategyPaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pinnedPages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const pageNumbers = [...pinnedPages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
  const items: StrategyPaginationItem[] = [];

  for (const page of pageNumbers) {
    const previousItem = items[items.length - 1];
    if (typeof previousItem === "number") {
      const gap = page - previousItem;
      if (gap === 2) {
        items.push(previousItem + 1);
      } else if (gap > 2) {
        items.push("ellipsis");
      }
    }
    items.push(page);
  }

  return items;
}

export function compareStrategies(left: StrategySquareItem, right: StrategySquareItem, sortKey: StrategySquareSortKey, window: StrategySquareWindow): number {
  const leftMetrics = getWindowAdjustedMetrics(left, window);
  const rightMetrics = getWindowAdjustedMetrics(right, window);
  if (sortKey === "profit") {
    return rightMetrics.profit30dUsd - leftMetrics.profit30dUsd
      || compareNullableDesc(leftMetrics.returnRate, rightMetrics.returnRate)
      || left.id.localeCompare(right.id);
  }

  if (sortKey === "drawdown") {
    return compareNullableAsc(leftMetrics.maxDrawdown, rightMetrics.maxDrawdown)
      || compareNullableDesc(leftMetrics.returnRate, rightMetrics.returnRate)
      || left.id.localeCompare(right.id);
  }

  if (sortKey === "newest") {
    return Date.parse(right.createdAt) - Date.parse(left.createdAt)
      || left.id.localeCompare(right.id);
  }

  return compareNullableDesc(leftMetrics.returnRate, rightMetrics.returnRate)
    || compareNullableAsc(leftMetrics.maxDrawdown, rightMetrics.maxDrawdown)
    || left.id.localeCompare(right.id);
}

export function getStrategyCardPrimaryMetric(
  metrics: StrategySquareItem["metrics"],
  panelCopy: WorkspaceCopy["workspace"]["strategySquare"],
  featuredMetric: StrategySquareFeaturedMetric,
  window: StrategySquareWindow,
): { label: string; toneValue: number | null; value: string } {
  if (featuredMetric === "returnRate") {
    return {
      label: panelCopy.metrics.returnRate,
      toneValue: metrics.returnRate,
      value: formatSignedPercent(metrics.returnRate),
    };
  }

  if (featuredMetric === "drawdown") {
    return {
      label: panelCopy.metrics.maxDrawdown,
      toneValue: null,
      value: formatPercent(metrics.maxDrawdown),
    };
  }

  return {
    label: panelCopy.windowedProfitUsd(panelCopy.windows[window]),
    toneValue: metrics.profit30dUsd,
    value: formatCurrencyNumber(metrics.profit30dUsd),
  };
}

export function getStrategyCardSecondaryMetric(
  metrics: StrategySquareItem["metrics"],
  panelCopy: WorkspaceCopy["workspace"]["strategySquare"],
  featuredMetric: StrategySquareFeaturedMetric,
  window: StrategySquareWindow,
): { label: string; toneValue: number | null; value: string } {
  if (featuredMetric === "returnRate") {
    return {
      label: panelCopy.windowedProfitUsd(panelCopy.windows[window]),
      toneValue: metrics.profit30dUsd,
      value: formatCurrencyNumber(metrics.profit30dUsd),
    };
  }

  return {
    label: panelCopy.metrics.returnRate,
    toneValue: metrics.returnRate,
    value: formatSignedPercent(metrics.returnRate),
  };
}

export function getStrategyContent(strategy: StrategySquareItem, language: WorkspaceLanguage): StrategySquareLocalizedContent {
  return strategy.content[language] ?? strategy.content["en-US"];
}

export function getWindowAdjustedMetrics(strategy: StrategySquareItem, window: StrategySquareWindow): StrategySquareItem["metrics"] {
  const multipliers = WINDOW_METRIC_MULTIPLIERS[window];
  return {
    ...strategy.metrics,
    maxDrawdown: multiplyNullable(strategy.metrics.maxDrawdown, multipliers.drawdown),
    profit30dUsd: strategy.metrics.profit30dUsd * multipliers.profit,
    returnRate: multiplyNullable(strategy.metrics.returnRate, multipliers.returnRate),
    tradeCount: Math.max(1, Math.round(strategy.metrics.tradeCount * multipliers.trades)),
  };
}

export function multiplyNullable(value: number | null, multiplier: number): number | null {
  return value === null ? null : value * multiplier;
}

export function compareNullableDesc(left: number | null, right: number | null): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return right - left;
}

export function compareNullableAsc(left: number | null, right: number | null): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return left - right;
}

export function createCurveRenderPoints(points: readonly StrategySquareReturnPoint[]): { x: number; y: number }[] {
  const normalizedPoints = points.filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.value));
  if (normalizedPoints.length === 0) {
    return [];
  }

  const { max, min } = getCurveValueRange(normalizedPoints);
  const valueRange = max - min;
  const xRange = CURVE_WIDTH - CURVE_PADDING * 2;
  const yRange = CURVE_HEIGHT - CURVE_PADDING * 2;

  return normalizedPoints.map((point, index) => {
    const xRatio = normalizedPoints.length === 1 ? 1 : index / (normalizedPoints.length - 1);
    const yRatio = valueRange === 0 ? 0.5 : (max - point.value) / valueRange;
    return {
      x: CURVE_PADDING + xRatio * xRange,
      y: CURVE_PADDING + yRatio * yRange,
    };
  });
}

export function createCurvePath(points: readonly { x: number; y: number }[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

export function calculateZeroLineY(points: readonly StrategySquareReturnPoint[]): number | null {
  if (points.length === 0) {
    return null;
  }

  const { max, min } = getCurveValueRange(points);
  if (min > 0 || max < 0) {
    return null;
  }

  const valueRange = max - min;
  const yRange = CURVE_HEIGHT - CURVE_PADDING * 2;
  const yRatio = valueRange === 0 ? 0.5 : max / valueRange;
  return CURVE_PADDING + yRatio * yRange;
}

export function getCurveValueRange(points: readonly StrategySquareReturnPoint[]): { max: number; min: number } {
  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  if (minValue !== maxValue) {
    return { max: maxValue, min: minValue };
  }

  const padding = Math.max(0.01, Math.abs(minValue) * 0.08);
  return {
    max: maxValue + padding,
    min: minValue - padding,
  };
}

export function getCurveStrokeColor(isDarkTheme: boolean, value: number, pnlColorMode: PnlColorMode): string {
  if (Math.abs(value) < 0.00005) {
    return isDarkTheme ? "#94A3B8" : "#64748B";
  }

  const shouldUseGainColor = value > 0;
  const isGreenGain = pnlColorMode === "positiveGreen";
  if (shouldUseGainColor === isGreenGain) {
    return isDarkTheme ? "#34D399" : "#10B981";
  }

  return isDarkTheme ? "#FB7185" : "#F43F5E";
}

export function getStoreTabButtonClassName(isDarkTheme: boolean, isActive: boolean): string {
  const baseClassName = "motion-fx-1-nav-button flex h-10 min-w-0 items-center justify-center rounded-xl px-3 text-sm font-black transition";
  if (isActive) {
    return isDarkTheme
      ? `${baseClassName} bg-[#00A6F4] text-white shadow-[0_10px_24px_rgba(0,166,244,0.24)]`
      : `${baseClassName} bg-white text-[#008DCC] shadow-sm`;
  }

  return `${baseClassName} ${isDarkTheme ? "text-slate-500 hover:bg-white/[0.05] hover:text-slate-200" : "text-slate-500 hover:bg-white hover:text-slate-900"}`;
}

export function getPaginationPageButtonClassName(isDarkTheme: boolean, isActive: boolean): string {
  const baseClassName = "motion-fx-3-raw-button grid h-9 min-w-9 place-items-center rounded-xl px-3 text-xs font-black transition";
  if (isActive) {
    return isDarkTheme
      ? `${baseClassName} bg-[#00A6F4] text-white shadow-[0_10px_24px_rgba(0,166,244,0.2)]`
      : `${baseClassName} bg-[#00A6F4] text-white shadow-sm shadow-sky-500/20`;
  }

  return isDarkTheme
    ? `${baseClassName} border border-white/[0.075] bg-white/[0.035] text-slate-300 hover:border-sky-400/25 hover:bg-sky-400/10 hover:text-sky-100`
    : `${baseClassName} border border-[#E5EAF0] bg-white text-slate-600 shadow-sm hover:border-[#B7E8FC] hover:bg-[#EAF8FE] hover:text-[#008DCC]`;
}

export function getMockBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-md bg-sky-400/15 px-2 py-0.5 text-[10px] font-black text-sky-200"
    : "rounded-md bg-[#EAF8FE] px-2 py-0.5 text-[10px] font-black text-[#008DCC]";
}

export function getTypeBadgeClassName(isDarkTheme: boolean, strategyType: StrategySquareType): string {
  const toneClassName = strategyType === "mario"
    ? isDarkTheme ? "bg-violet-400/15 text-violet-200" : "bg-violet-50 text-violet-700"
    : strategyType === "copyTrading"
      ? isDarkTheme ? "bg-sky-400/15 text-sky-200" : "bg-[#EAF8FE] text-[#008DCC]"
      : strategyType === "snowball"
        ? isDarkTheme ? "bg-amber-400/15 text-amber-200" : "bg-amber-50 text-amber-700"
        : isDarkTheme ? "bg-emerald-400/15 text-emerald-200" : "bg-emerald-50 text-emerald-700";

  return `rounded-md px-2 py-0.5 text-[10px] font-black ${toneClassName}`;
}

export function getRiskBadgeClassName(isDarkTheme: boolean, riskLevel: StrategySquareRiskLevel): string {
  if (riskLevel === "high") {
    return isDarkTheme ? "rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-200" : "rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700";
  }

  if (riskLevel === "medium") {
    return isDarkTheme ? "rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-200" : "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700";
  }

  return isDarkTheme ? "rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-bold text-sky-200" : "rounded-full bg-[#EAF8FE] px-2 py-0.5 text-[10px] font-bold text-[#008DCC]";
}

export function getRankBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "absolute -bottom-1 -right-1 rounded-full border border-[#181A20] bg-[#00A6F4] px-1 py-0.5 text-[8px] font-black text-white sm:px-1.5 sm:text-[10px]"
    : "absolute -bottom-1 -right-1 rounded-full border border-white bg-[#00A6F4] px-1 py-0.5 text-[8px] font-black text-white sm:px-1.5 sm:text-[10px]";
}

export function getSoftBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "inline-flex rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-slate-300"
    : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600";
}

export function getTagClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-full bg-white/[0.055] px-2 py-0.5 text-[10px] font-bold text-slate-400"
    : "rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500";
}

export function getMockActionClassName(isDarkTheme: boolean, density: "compact" | "default" = "default"): string {
  if (density === "compact") {
    return isDarkTheme
      ? "motion-fx-3-raw-button inline-flex h-8 w-full items-center justify-center rounded-lg bg-sky-400/15 px-1 text-[10px] font-black text-sky-100 transition hover:bg-sky-400/20 sm:h-9 sm:rounded-xl sm:text-xs xl:h-10 xl:px-3 xl:text-sm"
      : "motion-fx-3-raw-button inline-flex h-8 w-full items-center justify-center rounded-lg bg-[#EAF8FE] px-1 text-[10px] font-black text-[#008DCC] transition hover:bg-[#D8F1FD] sm:h-9 sm:rounded-xl sm:text-xs xl:h-10 xl:px-3 xl:text-sm";
  }

  return isDarkTheme
    ? "motion-fx-3-raw-button inline-flex h-10 items-center justify-center rounded-xl bg-sky-400/15 px-3 text-sm font-black text-sky-100 transition hover:bg-sky-400/20"
    : "motion-fx-3-raw-button inline-flex h-10 items-center justify-center rounded-xl bg-[#EAF8FE] px-3 text-sm font-black text-[#008DCC] transition hover:bg-[#D8F1FD]";
}

export function getFollowActionClassName(isDarkTheme: boolean, density: "compact" | "default" = "default"): string {
  if (density === "compact") {
    return isDarkTheme
      ? "motion-fx-3-raw-button inline-flex h-8 w-full items-center justify-center rounded-lg bg-[#00A6F4] px-1 text-[10px] font-black text-white transition hover:bg-[#008DCC] sm:h-9 sm:rounded-xl sm:text-xs xl:h-10 xl:px-4 xl:text-sm"
      : "motion-fx-3-raw-button inline-flex h-8 w-full items-center justify-center rounded-lg bg-[#00A6F4] px-1 text-[10px] font-black text-white shadow-sm shadow-sky-500/20 transition hover:bg-[#008DCC] sm:h-9 sm:rounded-xl sm:text-xs xl:h-10 xl:px-4 xl:text-sm";
  }

  return isDarkTheme
    ? "motion-fx-3-raw-button inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#00A6F4] px-4 text-sm font-black text-white transition hover:bg-[#008DCC]"
    : "motion-fx-3-raw-button inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#00A6F4] px-4 text-sm font-black text-white shadow-sm shadow-sky-500/20 transition hover:bg-[#008DCC]";
}

export function getPnlTextClassName(isDarkTheme: boolean, value: number | null, pnlColorMode: PnlColorMode, prefixClassName: string): string {
  if (value !== null && value > 0) {
    return `${prefixClassName} font-black ${pnlColorMode === "positiveGreen" ? isDarkTheme ? "text-emerald-300" : "text-emerald-500" : isDarkTheme ? "text-rose-300" : "text-rose-500"}`;
  }

  if (value !== null && value < 0) {
    return `${prefixClassName} font-black ${pnlColorMode === "positiveGreen" ? isDarkTheme ? "text-rose-300" : "text-rose-500" : isDarkTheme ? "text-emerald-300" : "text-emerald-500"}`;
  }

  return isDarkTheme ? `${prefixClassName} font-black text-slate-300` : `${prefixClassName} font-black text-slate-600`;
}

export function formatCurrencyNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: Math.abs(value) >= 1_000 ? 2 : 2,
    minimumFractionDigits: 2,
  });
}

export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return `${(value * 100).toFixed(2)}%`;
}

export function formatSignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const normalizedValue = Math.abs(value) < 0.00005 ? 0 : value;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    signDisplay: "exceptZero",
    style: "percent",
  }).format(normalizedValue);
}
