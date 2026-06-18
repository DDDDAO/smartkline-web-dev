"use client";

import { useMemo, type ReactNode } from "react";
import type { TradingFoxPosition, TradingFoxStrategyCurve, TradingFoxStrategyDetail } from "@/lib/tradingfox-control-plane";
import { PerformanceCurveChart, PerformanceCurveLoadingOverlay, PerformanceCurveWindowSelector, adaptTradingFoxStrategyCurvePoints, formatPerformanceCurveDate, formatPerformanceCurvePercent, getLatestPerformanceCurvePoint, getPerformanceCurveMetricValue, getPerformanceCurveToneClassName } from "@/components/charts/performance-curve";
import { finiteNumberOrNull, formatDetailCurrency, formatDetailDate, formatSignedDetailCurrency, formatSignedPercent, formatSummaryLeverage, formatUnsignedPercent, getPnlClassName, getPositionSideBucket, positiveFiniteNumberOrNull } from "./formatters";
import type { CopyPositionMarkPricesBySymbol, NormalizedSummaryPosition, PositionSummaryModel, PositionSummaryTotals, SignalSourcePosition, StrategyCopy, StrategyDetailCurveWindow } from "./strategy-detail-shared";

export function PositionSummaryPanel({
  isDarkTheme,
  strategyCopy,
  summary,
}: {
  isDarkTheme: boolean;
  strategyCopy: StrategyCopy;
  summary: PositionSummaryModel;
}) {
  const containerClassName = isDarkTheme
    ? "mt-3 rounded-2xl border border-white/[0.075] bg-[#111820] p-2.5"
    : "mt-3 rounded-2xl border border-[#E5EAF0] bg-white p-2.5";
  const pnlValue = summary.unrealizedPnl ?? 0;
  const pnlRateValue = summary.totalPnlRate ?? 0;
  const longRatioClassName = isDarkTheme ? "text-emerald-300" : "text-emerald-600";

  return (
    <div className={containerClassName}>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        <PositionSummaryMetric isDarkTheme={isDarkTheme} label={strategyCopy.positionCount}>
          {summary.positionCount}
        </PositionSummaryMetric>
        <PositionSummaryMetric isDarkTheme={isDarkTheme} label={strategyCopy.availableTotalMargin}>
          <span className={longRatioClassName}>{formatDetailCurrency(summary.availableMargin)}</span>
          <span className={isDarkTheme ? "text-slate-500" : "text-slate-400"}>/</span>
          <span>{formatDetailCurrency(summary.totalMargin)}</span>
        </PositionSummaryMetric>
        <PositionSummaryMetric isDarkTheme={isDarkTheme} label={strategyCopy.totalNotionalValue}>
          {formatDetailCurrency(summary.totalNotional)}
        </PositionSummaryMetric>
        <PositionSummaryMetric isDarkTheme={isDarkTheme} label={strategyCopy.totalLeverage}>
          {formatSummaryLeverage(summary.totalLeverage)}
        </PositionSummaryMetric>
        <PositionSummaryMetric
          isDarkTheme={isDarkTheme}
          label={strategyCopy.unrealizedPnl}
          valueClassName={getPnlClassName(isDarkTheme, pnlValue)}
        >
          {formatSignedDetailCurrency(summary.unrealizedPnl)}
        </PositionSummaryMetric>
        <PositionSummaryMetric
          isDarkTheme={isDarkTheme}
          label={strategyCopy.totalPnlRate}
          valueClassName={getPnlClassName(isDarkTheme, pnlRateValue)}
        >
          {formatSignedPercent(summary.totalPnlRate)}
        </PositionSummaryMetric>
        <PositionSummaryMetric isDarkTheme={isDarkTheme} label={strategyCopy.longRatio} valueClassName={longRatioClassName}>
          {formatUnsignedPercent(summary.longRatio)}
        </PositionSummaryMetric>
        <PositionSummaryMetric isDarkTheme={isDarkTheme} label={strategyCopy.shortRatio} valueClassName="text-[#ff2d3d]">
          {formatUnsignedPercent(summary.shortRatio)}
        </PositionSummaryMetric>
      </div>
    </div>
  );
}

function PositionSummaryMetric({
  children,
  isDarkTheme,
  label,
  valueClassName,
}: {
  children: ReactNode;
  isDarkTheme: boolean;
  label: string;
  valueClassName?: string;
}) {
  const containerClassName = isDarkTheme ? "min-w-0 overflow-hidden rounded-xl bg-white/[0.035] px-2 py-1.5" : "min-w-0 overflow-hidden rounded-xl bg-[#F8FAFC] px-2 py-1.5";
  const labelClassName = isDarkTheme ? "truncate text-[10px] font-black leading-4 text-slate-400" : "truncate text-[10px] font-black leading-4 text-slate-700";
  const neutralValueClassName = isDarkTheme ? "text-slate-50" : "text-slate-950";
  const defaultValueClassName = "mt-0.5 flex min-w-0 items-baseline gap-x-0.5 overflow-hidden whitespace-nowrap text-[13px] font-black leading-4 sm:text-sm";

  return (
    <div className={containerClassName}>
      <div className={labelClassName}>{label}</div>
      <div className={`${defaultValueClassName} ${valueClassName ?? neutralValueClassName}`}>{children}</div>
    </div>
  );
}

export function StrategyPerformanceCurvePanel({
  activeWindow,
  curve,
  curveError,
  curveWindows,
  isCurveLoading = false,
  isDarkTheme,
  strategyCopy,
  onWindowChange,
}: {
  activeWindow: StrategyDetailCurveWindow;
  curve: TradingFoxStrategyCurve | null;
  curveError?: string;
  curveWindows: readonly StrategyDetailCurveWindow[];
  isCurveLoading?: boolean;
  isDarkTheme: boolean;
  strategyCopy: StrategyCopy;
  onWindowChange: (window: StrategyDetailCurveWindow) => void;
}) {
  const points = useMemo(() => adaptTradingFoxStrategyCurvePoints(curve), [curve]);
  const latestPoint = getLatestPerformanceCurvePoint(points, "roi");
  const latestValue = getPerformanceCurveMetricValue(latestPoint, "roi");
  const latestClassName = getPerformanceCurveToneClassName(isDarkTheme, latestValue);
  const title = strategyCopy.roiCurve;
  const latestText = formatPerformanceCurvePercent(latestValue);
  const shellClassName = isDarkTheme
    ? "rounded-[24px] border border-white/[0.075] bg-white/[0.035] p-4"
    : "rounded-[24px] border border-[#E5EAF0] bg-white p-4 shadow-sm";
  const chartShellClassName = isDarkTheme
    ? "relative mt-3 h-[140px] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111820]"
    : "relative mt-3 h-[140px] overflow-hidden rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC]";
  const hintText = curve?.updatedAt ? strategyCopy.curveUpdatedAt(formatDetailDate(curve.updatedAt)) : strategyCopy.curveHint;

  return (
    <section className={shellClassName}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black">{title}</div>
          <div className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-500"}>
            {hintText}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-sm font-black ${latestClassName}`}>{latestText}</div>
          <div className={isDarkTheme ? "mt-1 text-[10px] font-bold text-slate-500" : "mt-1 text-[10px] font-bold text-slate-400"}>
            {strategyCopy.latestRoi}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className={isDarkTheme ? "text-[10px] font-black uppercase tracking-[0.12em] text-slate-500" : "text-[10px] font-black uppercase tracking-[0.12em] text-slate-400"}>
          {strategyCopy.curveWindow}
        </div>
        <PerformanceCurveWindowSelector
          activeWindow={activeWindow}
          ariaLabel={strategyCopy.curveWindow}
          isDarkTheme={isDarkTheme}
          labels={strategyCopy.curveWindows}
          windows={curveWindows}
          onWindowChange={onWindowChange}
        />
      </div>
      <div className={chartShellClassName}>
        {points.length > 0 ? (
          <>
            <PerformanceCurveChart
              ariaLabel={title}
              isDarkTheme={isDarkTheme}
              metricLabels={{
                pnl: strategyCopy.pnl,
                roi: strategyCopy.roi,
              }}
              points={points}
              primaryMetric="roi"
              tooltipMetrics={["roi", "pnl"]}
            />
            {isCurveLoading ? <PerformanceCurveLoadingOverlay isDarkTheme={isDarkTheme} label={strategyCopy.curveLoading} /> : null}
          </>
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs font-bold text-slate-500">
            {isCurveLoading ? strategyCopy.curveLoading : strategyCopy.curveEmpty}
          </div>
        )}
      </div>
      {points.length > 0 ? (
        <div className={isDarkTheme ? "mt-2 flex items-center justify-between gap-3 text-[10px] font-bold text-slate-500" : "mt-2 flex items-center justify-between gap-3 text-[10px] font-bold text-slate-400"}>
          <span>{formatPerformanceCurveDate(points[0]?.timestamp ?? null)}</span>
          <span>{strategyCopy.curveWindows[activeWindow]}</span>
          <span>{formatPerformanceCurveDate(latestPoint?.timestamp ?? null)}</span>
        </div>
      ) : null}
      {curveError ? (
        <p className={isDarkTheme ? "mt-3 text-xs leading-5 text-amber-200" : "mt-3 text-xs leading-5 text-amber-700"}>
          {strategyCopy.curveError}: {curveError}
        </p>
      ) : null}
    </section>
  );
}

export function createCopyPositionSummary(detail: TradingFoxStrategyDetail): PositionSummaryModel {
  const totals = summarizePositions(detail.positions.map((position) => {
    const notional = getCopyPositionNotional(position);
    const leverage = finiteNumberOrNull(position.leverage);
    return {
      margin: calculatePositionMargin(notional, leverage),
      notional,
      pnl: getCopyPositionPnl(position),
      side: position.side,
    };
  }));
  const totalMargin = finiteNumberOrNull(detail.account?.usdtTotal)
    ?? finiteNumberOrNull(detail.account?.equity)
    ?? totals.usedMargin;
  const availableMargin = finiteNumberOrNull(detail.account?.usdtFree)
    ?? calculateAvailableMargin(totalMargin, totals.usedMargin);

  return createPositionSummaryModel({ availableMargin, totalMargin, totals });
}

export function createSignalSourcePositionSummary(
  source: TradingFoxStrategyDetail["signalSources"][number],
  copyPositionMarkPricesBySymbol: CopyPositionMarkPricesBySymbol,
): PositionSummaryModel {
  const totals = summarizePositions(source.positions.map((position) => {
    const notional = getSignalSourcePositionNotional(position, copyPositionMarkPricesBySymbol);
    const leverage = finiteNumberOrNull(position.leverage);
    return {
      margin: calculatePositionMargin(notional, leverage),
      notional,
      pnl: getSignalSourcePositionPnl(position, copyPositionMarkPricesBySymbol),
      side: position.positionSide,
    };
  }));
  const totalMargin = finiteNumberOrNull(source.marginBalance) ?? totals.usedMargin;
  const availableMargin = calculateAvailableMargin(totalMargin, totals.usedMargin);

  return createPositionSummaryModel({ availableMargin, totalMargin, totals });
}

function createPositionSummaryModel(input: {
  availableMargin: number | null;
  totalMargin: number | null;
  totals: PositionSummaryTotals;
}): PositionSummaryModel {
  const { availableMargin, totalMargin, totals } = input;
  const marginBase = positiveFiniteNumberOrNull(totalMargin) ?? positiveFiniteNumberOrNull(totals.usedMargin);
  const totalLeverage = totals.totalNotional !== null && totals.totalNotional > 0 && marginBase !== null
    ? totals.totalNotional / marginBase
    : totals.totalNotional === 0
      ? 0
      : null;
  const totalPnlRate = totals.totalPnl !== null && marginBase !== null
    ? (totals.totalPnl / marginBase) * 100
    : totals.totalPnl === 0
      ? 0
      : null;

  return {
    availableMargin,
    longRatio: totals.longRatio,
    positionCount: totals.positionCount,
    shortRatio: totals.shortRatio,
    totalLeverage,
    totalMargin,
    totalNotional: totals.totalNotional,
    totalPnlRate,
    unrealizedPnl: totals.totalPnl,
  };
}

function summarizePositions(positions: readonly NormalizedSummaryPosition[]): PositionSummaryTotals {
  let hasMargin = false;
  let hasNotional = positions.length === 0;
  let hasPnl = positions.length === 0;
  let longCount = 0;
  let longNotional = 0;
  let shortCount = 0;
  let shortNotional = 0;
  let totalNotional = 0;
  let totalPnl = 0;
  let usedMargin = 0;

  positions.forEach((position) => {
    const notional = positiveFiniteNumberOrNull(position.notional);
    const margin = positiveFiniteNumberOrNull(position.margin);
    const sideBucket = getPositionSideBucket(position.side);

    if (notional !== null) {
      hasNotional = true;
      totalNotional += notional;
    }

    if (margin !== null) {
      hasMargin = true;
      usedMargin += margin;
    }

    if (position.pnl !== null) {
      hasPnl = true;
      totalPnl += position.pnl;
    }

    if (sideBucket === "long") {
      longCount += 1;
      longNotional += notional ?? 0;
    } else if (sideBucket === "short") {
      shortCount += 1;
      shortNotional += notional ?? 0;
    }
  });

  const directionalNotional = longNotional + shortNotional;
  const directionalCount = longCount + shortCount;
  const longRatio = directionalNotional > 0
    ? (longNotional / directionalNotional) * 100
    : directionalCount > 0
      ? (longCount / directionalCount) * 100
      : null;
  const shortRatio = longRatio === null ? null : 100 - longRatio;

  return {
    longRatio,
    positionCount: positions.length,
    shortRatio,
    totalNotional: hasNotional ? totalNotional : null,
    totalPnl: hasPnl ? totalPnl : null,
    usedMargin: hasMargin ? usedMargin : null,
  };
}

function getCopyPositionNotional(position: TradingFoxPosition): number | null {
  const explicitNotional = finiteNumberOrNull(position.notional);
  if (explicitNotional !== null) {
    return Math.abs(explicitNotional);
  }

  const contracts = finiteNumberOrNull(position.contracts);
  const price = finiteNumberOrNull(position.markPrice) ?? finiteNumberOrNull(position.entryPrice);
  if (contracts === null || price === null) {
    return null;
  }

  return Math.abs(contracts * price);
}

export function createCopyPositionMarkPricesBySymbol(positions: readonly TradingFoxPosition[]): CopyPositionMarkPricesBySymbol {
  const markPricesBySymbol = new Map<string, number>();

  positions.forEach((position) => {
    const symbol = normalizePositionSymbolForMarkPriceLookup(position.symbol);
    const markPrice = finiteNumberOrNull(position.markPrice);
    if (symbol && markPrice !== null) {
      markPricesBySymbol.set(symbol, markPrice);
    }
  });

  return markPricesBySymbol;
}

function normalizePositionSymbolForMarkPriceLookup(value: string | undefined): string {
  const normalizedValue = (value ?? "").trim().toUpperCase();
  if (!normalizedValue) {
    return "";
  }

  const symbolWithoutSettlement = normalizedValue.split(":")[0] ?? normalizedValue;
  return symbolWithoutSettlement.replace(/[\s/_-]/gu, "");
}

export function getSignalSourcePositionMarkPrice(
  position: SignalSourcePosition,
  copyPositionMarkPricesBySymbol: CopyPositionMarkPricesBySymbol,
): number | null {
  const copiedMarkPrice = copyPositionMarkPricesBySymbol.get(normalizePositionSymbolForMarkPriceLookup(position.symbol));
  return copiedMarkPrice ?? finiteNumberOrNull(position.markPrice);
}

function getSignalSourcePositionNotional(
  position: SignalSourcePosition,
  copyPositionMarkPricesBySymbol: CopyPositionMarkPricesBySymbol,
): number | null {
  const size = finiteNumberOrNull(position.positionSize);
  const price = getSignalSourcePositionMarkPrice(position, copyPositionMarkPricesBySymbol) ?? finiteNumberOrNull(position.entryPrice);
  if (size === null || price === null) {
    return null;
  }

  return Math.abs(size * price);
}

function getCopyPositionPnl(position: TradingFoxPosition): number | null {
  const explicitPnl = finiteNumberOrNull(position.unrealizedPnl);
  if (explicitPnl !== null) {
    return explicitPnl;
  }

  return calculatePositionPnl({
    entryPrice: finiteNumberOrNull(position.entryPrice),
    markPrice: finiteNumberOrNull(position.markPrice),
    quantity: finiteNumberOrNull(position.contracts),
    side: position.side,
  });
}

export function getSignalSourcePositionPnl(
  position: SignalSourcePosition,
  copyPositionMarkPricesBySymbol: CopyPositionMarkPricesBySymbol,
): number | null {
  return calculatePositionPnl({
    entryPrice: finiteNumberOrNull(position.entryPrice),
    markPrice: getSignalSourcePositionMarkPrice(position, copyPositionMarkPricesBySymbol),
    quantity: finiteNumberOrNull(position.positionSize),
    side: position.positionSide,
  });
}

function calculatePositionPnl(input: {
  entryPrice: number | null;
  markPrice: number | null;
  quantity: number | null;
  side: string | undefined;
}): number | null {
  const { entryPrice, markPrice, quantity, side } = input;
  const sideBucket = getPositionSideBucket(side);
  if (entryPrice === null || markPrice === null || quantity === null || sideBucket === null) {
    return null;
  }

  const priceMove = sideBucket === "long" ? markPrice - entryPrice : entryPrice - markPrice;
  return priceMove * Math.abs(quantity);
}

function calculatePositionMargin(notional: number | null, leverage: number | null): number | null {
  if (notional === null || leverage === null || leverage <= 0) {
    return null;
  }

  return Math.abs(notional) / leverage;
}

function calculateAvailableMargin(totalMargin: number | null, usedMargin: number | null): number | null {
  if (totalMargin === null || usedMargin === null) {
    return null;
  }

  return Math.max(totalMargin - usedMargin, 0);
}
