"use client";

import dynamic from "next/dynamic";
import * as SelectPrimitive from "@radix-ui/react-select";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getTradingFoxErrorMessage } from "@/app/_lib/tradingfox-errors";
import { WORKSPACE_COPY, type WorkspaceCopy, type WorkspaceLanguage } from "@/app/_lib/i18n";
import { intervals } from "@/app/_lib/demo-data";
import {
  fetchHistoricalCandles,
  prependHistoricalCandles,
} from "@/app/_lib/binance-market-data";
import { toCopyTradingMarketSymbol } from "@/app/_lib/copy-trading-radar-api";
import type { TelegramSessionUser } from "@/app/_lib/auth/telegram-auth";
import type { TradingFoxPosition, TradingFoxStrategyCurve, TradingFoxStrategyDetail } from "@/app/_lib/tradingfox-control-plane";
import type { KlineChartProps } from "@/app/_components/kline-chart";
import type { ChartTimeFocusRequest } from "@/app/_components/kline-chart/types";
import type { CopyTradingTradeMarker } from "@/app/_types/copy-trading";
import type { KlineInterval, MarketCandle, MarketSymbol } from "@/app/_types/market";
import { SourceAvatar } from "../card-ui";
import {
  EMPTY_MARKET_CANDLES,
  EMPTY_STRUCTURED_SIGNALS,
  KLINE_INTERVAL_MS_BY_INTERVAL,
  TRADE_HISTORY_KLINE_CANDLE_LIMIT,
} from "./constants";
import {
  finiteNumberOrNull,
  formatDetailCurrency,
  formatDetailDate,
  formatDetailNumber,
  formatLeverage,
  formatPositionSide,
  formatSignedDetailCurrency,
  formatSignedPercent,
  formatSummaryLeverage,
  formatUnsignedPercent,
  getPnlClassName,
  getPositionSideBucket,
  getSideClassName,
  numberOrZero,
  positiveFiniteNumberOrNull,
} from "./formatters";
import { TelegramUserAvatar } from "./telegram-user-avatar";
import type { PrototypeStrategy } from "./types";

const KlineChart = dynamic<KlineChartProps>(
  () => import("@/app/_components/kline-chart").then((module) => module.KlineChart),
  { loading: () => null },
);

const STRATEGY_CURVE_HEIGHT = 120;
const STRATEGY_CURVE_MAX_RENDER_POINTS = 160;
const STRATEGY_CURVE_PADDING = 10;
const STRATEGY_CURVE_WIDTH = 360;
const STRATEGY_CURVE_METRICS: readonly StrategyCurveMetric[] = ["roi", "pnl"];

type StrategyCopy = WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
type StrategyCurveMetric = "roi" | "pnl";
type SignalSourcePosition = TradingFoxStrategyDetail["signalSources"][number]["positions"][number];
type TradingFoxOrderItem = NonNullable<TradingFoxStrategyDetail["orderHistory"]>["items"][number];
type TradingFoxSignalSourceOrderItem = NonNullable<TradingFoxStrategyDetail["orderHistory"]>["signalSourceOrders"][number];
type TradingFoxTradeLogItem = NonNullable<TradingFoxStrategyDetail["orderHistory"]>["tradeLogs"][number];
type CopyPositionMarkPricesBySymbol = ReadonlyMap<string, number>;
type SignalSourceIdentityById = ReadonlyMap<string, TradeHistorySourceIdentity>;

export const EMPTY_TRADING_FOX_POSITIONS: readonly TradingFoxPosition[] = [];

type StrategyCurveRenderPoint = {
  timestampMs: number;
  value: number;
};

type TradeHistorySourceIdentity = {
  avatarUrl: string | null;
  id: string;
  name: string;
};

export type TradeHistoryRow = {
  action: string | undefined;
  id: string;
  kind: "me" | "signalSource" | "tradeLog";
  order: TradingFoxOrderItem | null;
  price: number | null;
  quantity: number | null;
  side: string | undefined;
  signalSourceOrder: TradingFoxSignalSourceOrderItem | null;
  source: TradeHistorySourceIdentity;
  sourceTimeMs: number;
  status: string | undefined;
  symbol: string;
  timestamp: string;
  tradeLog: TradingFoxTradeLogItem | null;
};

type TradeHistorySymbolOption = {
  count: number;
  label: string;
  symbol: MarketSymbol;
};

type PositionSummaryModel = {
  availableMargin: number | null;
  longRatio: number | null;
  positionCount: number;
  shortRatio: number | null;
  totalLeverage: number | null;
  totalMargin: number | null;
  totalNotional: number | null;
  totalPnlRate: number | null;
  unrealizedPnl: number | null;
};

type NormalizedSummaryPosition = {
  margin: number | null;
  notional: number | null;
  pnl: number | null;
  side: string | undefined;
};

type PositionSummaryTotals = {
  longRatio: number | null;
  positionCount: number;
  shortRatio: number | null;
  totalNotional: number | null;
  totalPnl: number | null;
  usedMargin: number | null;
};

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
  curve,
  curveError,
  isDarkTheme,
  strategyCopy,
}: {
  curve: TradingFoxStrategyCurve | null;
  curveError?: string;
  isDarkTheme: boolean;
  strategyCopy: StrategyCopy;
}) {
  const [activeMetric, setActiveMetric] = useState<StrategyCurveMetric>("roi");
  const renderPoints = useMemo(
    () => createStrategyCurveRenderPoints(curve, activeMetric),
    [activeMetric, curve],
  );
  const latestPoint = renderPoints[renderPoints.length - 1] ?? null;
  const latestClassName = getPnlClassName(isDarkTheme, latestPoint?.value ?? 0);
  const title = activeMetric === "roi" ? strategyCopy.roiCurve : strategyCopy.pnlCurve;
  const latestLabel = activeMetric === "roi" ? strategyCopy.latestRoi : strategyCopy.latestPnl;
  const latestText = activeMetric === "roi"
    ? formatSignedPercent(latestPoint?.value ?? null)
    : formatSignedDetailCurrency(latestPoint?.value ?? null);
  const shellClassName = isDarkTheme
    ? "rounded-[24px] border border-white/[0.075] bg-white/[0.035] p-4"
    : "rounded-[24px] border border-[#E5EAF0] bg-white p-4 shadow-sm";
  const toggleShellClassName = isDarkTheme
    ? "inline-flex rounded-full border border-white/[0.075] bg-[#0F141B] p-0.5"
    : "inline-flex rounded-full border border-[#D5E4EF] bg-[#F8FAFC] p-0.5";
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
            {latestLabel}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className={isDarkTheme ? "text-[10px] font-black uppercase tracking-[0.12em] text-slate-500" : "text-[10px] font-black uppercase tracking-[0.12em] text-slate-400"}>
          {strategyCopy.curveMetric}
        </div>
        <div aria-label={strategyCopy.curveMetric} className={toggleShellClassName} role="group">
          {STRATEGY_CURVE_METRICS.map((metric) => {
            const isActive = metric === activeMetric;
            const buttonClassName = isActive
              ? "rounded-full bg-[#00A6F4] px-3 py-1.5 text-xs font-black text-white shadow-[0_6px_14px_rgba(0,166,244,0.18)]"
              : isDarkTheme
                ? "rounded-full px-3 py-1.5 text-xs font-black text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100"
                : "rounded-full px-3 py-1.5 text-xs font-black text-slate-500 transition hover:bg-white hover:text-slate-900";
            return (
              <button
                key={metric}
                aria-pressed={isActive}
                className={buttonClassName}
                type="button"
                onClick={() => setActiveMetric(metric)}
              >
                {metric === "roi" ? strategyCopy.roi : strategyCopy.pnl}
              </button>
            );
          })}
        </div>
      </div>
      <div className={isDarkTheme ? "mt-3 h-[140px] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111820]" : "mt-3 h-[140px] overflow-hidden rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC]"}>
        {renderPoints.length > 0 ? (
          <StrategyPerformanceCurveChart
            ariaLabel={title}
            isDarkTheme={isDarkTheme}
            points={renderPoints}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs font-bold text-slate-500">
            {strategyCopy.curveEmpty}
          </div>
        )}
      </div>
      {renderPoints.length > 0 ? (
        <div className={isDarkTheme ? "mt-2 flex items-center justify-between gap-3 text-[10px] font-bold text-slate-500" : "mt-2 flex items-center justify-between gap-3 text-[10px] font-bold text-slate-400"}>
          <span>{formatStrategyCurveDate(renderPoints[0]?.timestampMs ?? null)}</span>
          <span>{title}</span>
          <span>{formatStrategyCurveDate(latestPoint?.timestampMs ?? null)}</span>
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

function StrategyPerformanceCurveChart({
  ariaLabel,
  isDarkTheme,
  points,
}: {
  ariaLabel: string;
  isDarkTheme: boolean;
  points: readonly StrategyCurveRenderPoint[];
}) {
  const sampledPoints = sampleStrategyCurvePoints(points, STRATEGY_CURVE_MAX_RENDER_POINTS);
  const renderPoints = createStrategyCurveSvgPoints(sampledPoints);
  if (renderPoints.length === 0) {
    return null;
  }

  const latestValue = sampledPoints[sampledPoints.length - 1]?.value ?? 0;
  const pathData = createStrategyCurvePath(renderPoints);
  const zeroLineY = calculateStrategyCurveZeroLineY(sampledPoints);
  const strokeColor = getStrategyCurveStrokeColor(isDarkTheme, latestValue);
  const gridColor = isDarkTheme ? "rgba(148,163,184,0.22)" : "rgba(148,163,184,0.30)";
  const endPoint = renderPoints[renderPoints.length - 1];

  return (
    <svg
      aria-label={ariaLabel}
      className="h-full w-full overflow-visible"
      role="img"
      viewBox={`0 0 ${STRATEGY_CURVE_WIDTH} ${STRATEGY_CURVE_HEIGHT}`}
    >
      {zeroLineY !== null ? (
        <line
          stroke={gridColor}
          strokeDasharray="4 4"
          strokeWidth="1"
          x1={STRATEGY_CURVE_PADDING}
          x2={STRATEGY_CURVE_WIDTH - STRATEGY_CURVE_PADDING}
          y1={zeroLineY}
          y2={zeroLineY}
        />
      ) : null}
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.6"
      />
      {endPoint ? <circle cx={endPoint.x} cy={endPoint.y} fill={strokeColor} r="3.5" /> : null}
    </svg>
  );
}

function createStrategyCurveRenderPoints(
  curve: TradingFoxStrategyCurve | null,
  metric: StrategyCurveMetric,
): StrategyCurveRenderPoint[] {
  return (curve?.points ?? [])
    .flatMap((point) => {
      const value = metric === "roi" ? point.roi : point.pnl;
      const timestampMs = Date.parse(point.timestamp);
      if (value === null || !Number.isFinite(value) || !Number.isFinite(timestampMs)) {
        return [];
      }

      return [{ timestampMs, value }];
    })
    .sort((left, right) => left.timestampMs - right.timestampMs);
}

function sampleStrategyCurvePoints(
  points: readonly StrategyCurveRenderPoint[],
  maxPoints: number,
): StrategyCurveRenderPoint[] {
  if (points.length <= maxPoints) {
    return [...points];
  }

  const sampledPoints: StrategyCurveRenderPoint[] = [];
  const lastIndex = points.length - 1;
  const sampleCount = Math.max(2, maxPoints);
  const usedIndexes = new Set<number>();
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const pointIndex = Math.round((sampleIndex / (sampleCount - 1)) * lastIndex);
    if (!usedIndexes.has(pointIndex)) {
      sampledPoints.push(points[pointIndex]);
      usedIndexes.add(pointIndex);
    }
  }

  return sampledPoints;
}

function createStrategyCurveSvgPoints(points: readonly StrategyCurveRenderPoint[]): { x: number; y: number }[] {
  if (points.length === 0) {
    return [];
  }

  const { max, min } = getStrategyCurveValueRange(points);
  const valueRange = max - min;
  const xRange = STRATEGY_CURVE_WIDTH - STRATEGY_CURVE_PADDING * 2;
  const yRange = STRATEGY_CURVE_HEIGHT - STRATEGY_CURVE_PADDING * 2;

  return points.map((point, index) => {
    const xRatio = points.length === 1 ? 1 : index / (points.length - 1);
    const yRatio = valueRange === 0 ? 0.5 : (max - point.value) / valueRange;
    return {
      x: STRATEGY_CURVE_PADDING + xRatio * xRange,
      y: STRATEGY_CURVE_PADDING + yRatio * yRange,
    };
  });
}

function createStrategyCurvePath(points: readonly { x: number; y: number }[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${formatStrategyCurveSvgNumber(point.x)} ${formatStrategyCurveSvgNumber(point.y)}`)
    .join(" ");
}

function calculateStrategyCurveZeroLineY(points: readonly StrategyCurveRenderPoint[]): number | null {
  if (points.length === 0) {
    return null;
  }

  const { max, min } = getStrategyCurveValueRange(points);
  if (min > 0 || max < 0) {
    return null;
  }

  const valueRange = max - min;
  const yRange = STRATEGY_CURVE_HEIGHT - STRATEGY_CURVE_PADDING * 2;
  const yRatio = valueRange === 0 ? 0.5 : max / valueRange;
  return STRATEGY_CURVE_PADDING + yRatio * yRange;
}

function getStrategyCurveValueRange(points: readonly StrategyCurveRenderPoint[]): { max: number; min: number } {
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

function getStrategyCurveStrokeColor(isDarkTheme: boolean, value: number): string {
  if (Math.abs(value) < 0.00005) {
    return isDarkTheme ? "#94A3B8" : "#64748B";
  }

  return value > 0
    ? isDarkTheme ? "#34D399" : "#059669"
    : isDarkTheme ? "#FB7185" : "#E11D48";
}

function formatStrategyCurveDate(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

function formatStrategyCurveSvgNumber(value: number): string {
  return value.toFixed(2);
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

function getSignalSourcePositionMarkPrice(
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

function getSignalSourcePositionPnl(
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

export function CopyPositionTable({
  isDarkTheme,
  positions,
  strategyCopy,
}: {
  isDarkTheme: boolean;
  positions: readonly TradingFoxPosition[];
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
}) {
  return (
    <div className="kol-scroll-area mt-3 overflow-x-auto">
      <table className="min-w-[860px] w-full border-collapse text-left text-sm">
        <thead>
          <tr className={isDarkTheme ? "border-b border-white/[0.075] text-xs font-black text-slate-500" : "border-b border-[#DDE8F0] text-xs font-black text-slate-500"}>
            <th className="px-3 py-3">Symbol</th>
            <th className="px-3 py-3">{strategyCopy.positionSide}</th>
            <th className="px-3 py-3">{strategyCopy.notional}</th>
            <th className="px-3 py-3">{strategyCopy.contracts}</th>
            <th className="px-3 py-3">{strategyCopy.leverage}</th>
            <th className="px-3 py-3">{strategyCopy.entryPrice}</th>
            <th className="px-3 py-3">{strategyCopy.markPrice}</th>
            <th className="px-3 py-3">PNL</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position, index) => {
            const pnl = numberOrZero(position.unrealizedPnl);
            return (
              <tr key={`${position.symbol}-${position.side}-${index}`} className={isDarkTheme ? "border-b border-white/[0.06] last:border-0" : "border-b border-[#DDE8F0] last:border-0"}>
                <td className="px-3 py-4 font-black underline underline-offset-2">{position.symbol}</td>
                <td className={`px-3 py-4 font-black ${getSideClassName(isDarkTheme, position.side)}`}>{formatPositionSide(position.side)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailCurrency(position.notional)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(position.contracts)}</td>
                <td className="px-3 py-4 font-semibold">{formatLeverage(position.leverage)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(position.entryPrice)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(position.markPrice)}</td>
                <td className={`px-3 py-4 font-black ${getPnlClassName(isDarkTheme, pnl)}`}>{formatSignedDetailCurrency(pnl)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SignalSourcePositionTable({
  copyPositionMarkPricesBySymbol,
  isDarkTheme,
  positions,
  strategyCopy,
}: {
  copyPositionMarkPricesBySymbol: CopyPositionMarkPricesBySymbol;
  isDarkTheme: boolean;
  positions: readonly TradingFoxStrategyDetail["signalSources"][number]["positions"][number][];
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
}) {
  return (
    <div className="kol-scroll-area mt-3 overflow-x-auto">
      <table className="min-w-[760px] w-full border-collapse text-left text-sm">
        <thead>
          <tr className={isDarkTheme ? "border-b border-white/[0.075] text-xs font-black text-slate-500" : "border-b border-[#DDE8F0] text-xs font-black text-slate-500"}>
            <th className="px-3 py-3">Symbol</th>
            <th className="px-3 py-3">{strategyCopy.positionSide}</th>
            <th className="px-3 py-3">{strategyCopy.positionSize}</th>
            <th className="px-3 py-3">{strategyCopy.leverage}</th>
            <th className="px-3 py-3">{strategyCopy.entryPrice}</th>
            <th className="px-3 py-3">{strategyCopy.markPrice}</th>
            <th className="px-3 py-3">PNL</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position, index) => {
            const markPrice = getSignalSourcePositionMarkPrice(position, copyPositionMarkPricesBySymbol);
            const pnl = getSignalSourcePositionPnl(position, copyPositionMarkPricesBySymbol);
            return (
              <tr key={`${position.symbol}-${position.positionSide}-${index}`} className={isDarkTheme ? "border-b border-white/[0.06] last:border-0" : "border-b border-[#DDE8F0] last:border-0"}>
                <td className="px-3 py-4 font-black underline underline-offset-2">{position.symbol}</td>
                <td className={`px-3 py-4 font-black ${getSideClassName(isDarkTheme, position.positionSide)}`}>{formatPositionSide(position.positionSide)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(position.positionSize)}</td>
                <td className="px-3 py-4 font-semibold">{formatLeverage(position.leverage)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(position.entryPrice)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(markPrice)}</td>
                <td className={`px-3 py-4 font-black ${getPnlClassName(isDarkTheme, pnl ?? 0)}`}>{formatSignedDetailCurrency(pnl)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function createSignalSourceIdentityById(
  signalSources: readonly TradingFoxStrategyDetail["signalSources"][number][],
  strategy: PrototypeStrategy,
): SignalSourceIdentityById {
  const identities = new Map<string, TradeHistorySourceIdentity>();
  const fallbackSignalSourceName = strategy.signalSourceName || strategy.traderId;
  const fallbackSignalSourceAvatarUrl = strategy.signalSourceAvatarUrl || strategy.avatarUrl || null;
  signalSources.forEach((source) => {
    const sourceId = source.signalSourceId.trim();
    if (!sourceId) {
      return;
    }
    identities.set(sourceId, {
      avatarUrl: null,
      id: sourceId,
      name: source.name || fallbackSignalSourceName || sourceId,
    });
  });

  const strategySignalSourceId = strategy.traderId.trim();
  if (strategySignalSourceId) {
    const existingIdentity = identities.get(strategySignalSourceId);
    identities.set(strategySignalSourceId, {
      avatarUrl: existingIdentity?.avatarUrl ?? fallbackSignalSourceAvatarUrl,
      id: strategySignalSourceId,
      name: existingIdentity?.name || fallbackSignalSourceName || strategySignalSourceId,
    });
  }

  return identities;
}

export function createTradeHistoryRows({
  orders,
  signalSourceIdentityById,
  signalSourceOrders,
  strategy,
  tradeLogs,
}: {
  orders: readonly TradingFoxOrderItem[];
  signalSourceIdentityById: SignalSourceIdentityById;
  signalSourceOrders: readonly TradingFoxSignalSourceOrderItem[];
  strategy: PrototypeStrategy;
  tradeLogs: readonly TradingFoxTradeLogItem[];
}): TradeHistoryRow[] {
  return [
    ...orders.map((order) => createMyTradeHistoryRow(order, strategy)),
    ...signalSourceOrders.map((order) => createSignalSourceTradeHistoryRow(order, signalSourceIdentityById, strategy)),
    ...tradeLogs.map((log) => createTradeLogHistoryRow(log, signalSourceIdentityById, strategy)),
  ].sort(compareTradeHistoryRows);
}

function createMyTradeHistoryRow(order: TradingFoxOrderItem, strategy: PrototypeStrategy): TradeHistoryRow {
  return {
    action: order.side,
    id: `me:${order.clientOrderId}`,
    kind: "me",
    order,
    price: finiteNumberOrNull(order.price),
    quantity: finiteNumberOrNull(order.contractAmount),
    side: order.side,
    signalSourceOrder: null,
    source: {
      avatarUrl: strategy.avatarUrl || null,
      id: strategy.traderId,
      name: strategy.traderName,
    },
    sourceTimeMs: getTimestampMs(order.timestamp),
    status: order.status,
    symbol: order.symbol,
    timestamp: order.timestamp,
    tradeLog: null,
  };
}

function createSignalSourceTradeHistoryRow(
  order: TradingFoxSignalSourceOrderItem,
  signalSourceIdentityById: SignalSourceIdentityById,
  strategy: PrototypeStrategy,
): TradeHistoryRow {
  const fallbackName = order.signalSourceName || strategy.signalSourceName || strategy.traderId || order.signalSourceId;
  const source = signalSourceIdentityById.get(order.signalSourceId) ?? {
    avatarUrl: null,
    id: order.signalSourceId || strategy.traderId,
    name: fallbackName,
  };
  const sourceTimestamp = order.timestamp || order.sourceTimestamp || "";

  return {
    action: order.action,
    id: `source:${order.eventId || `${order.signalSourceId}:${order.symbol}:${sourceTimestamp}`}`,
    kind: "signalSource",
    order: null,
    price: getSignalSourceOrderPrice(order),
    quantity: getSignalSourceOrderQuantity(order),
    side: order.side,
    signalSourceOrder: order,
    source: {
      ...source,
      name: resolveTradeHistorySourceName(order.signalSourceName || source.name, source.id, fallbackName),
    },
    sourceTimeMs: getTimestampMs(sourceTimestamp),
    status: undefined,
    symbol: order.symbol,
    timestamp: sourceTimestamp,
    tradeLog: null,
  };
}

function createTradeLogHistoryRow(
  log: TradingFoxTradeLogItem,
  signalSourceIdentityById: SignalSourceIdentityById,
  strategy: PrototypeStrategy,
): TradeHistoryRow {
  const trade = log.ssTradeInfo ?? {};
  const config = log.ssConfig ?? {};
  const orderData = log.orderData ?? {};
  const sourceId = firstString(
    trade.signalSourceId,
    trade.signalSourceID,
    config.signalSourceId,
    config.signalSourceID,
    strategy.traderId,
  );
  const fallbackName = firstString(
    trade.signalSourceName,
    trade.sourceName,
    config.signalSourceName,
    config.sourceName,
    strategy.signalSourceName,
    strategy.traderId,
    sourceId,
  );
  const source = signalSourceIdentityById.get(sourceId) ?? {
    avatarUrl: null,
    id: sourceId,
    name: fallbackName,
  };
  const timestamp = firstString(trade.timestamp, trade.signalTimestamp, log.timestamp);
  const side = getTradeLogSide(log);

  return {
    action: log.type,
    id: `trade-log:${log.id}`,
    kind: "tradeLog",
    order: null,
    price: firstFiniteNumber(trade.price, orderData.orderPrice, orderData.price, orderData.markPrice),
    quantity: getTradeLogQuantity(log),
    side,
    signalSourceOrder: null,
    source: {
      ...source,
      name: resolveTradeHistorySourceName(source.name, source.id, fallbackName),
    },
    sourceTimeMs: getTimestampMs(timestamp),
    status: getTradeLogReason(log),
    symbol: firstString(trade.symbol, orderData.symbol) || "--",
    timestamp,
    tradeLog: log,
  };
}

function resolveTradeHistorySourceName(preferredName: string | undefined, sourceId: string, fallbackName: string): string {
  const normalizedPreferredName = firstString(preferredName);
  if (normalizedPreferredName && !isOpaqueSignalSourceId(normalizedPreferredName)) {
    return normalizedPreferredName;
  }

  const normalizedFallbackName = firstString(fallbackName);
  if (normalizedFallbackName && !isOpaqueSignalSourceId(normalizedFallbackName)) {
    return normalizedFallbackName;
  }

  return normalizedPreferredName || normalizedFallbackName || sourceId;
}

function isOpaqueSignalSourceId(value: string): boolean {
  return /^(?:信号源[:：]\s*)?(?:bn|mx)-[\da-z-]+$/iu.test(value.trim());
}

function compareTradeHistoryRows(left: TradeHistoryRow, right: TradeHistoryRow): number {
  if (left.sourceTimeMs !== right.sourceTimeMs) {
    return right.sourceTimeMs - left.sourceTimeMs;
  }
  if (left.kind !== right.kind) {
    return getTradeHistoryRowKindRank(left.kind) - getTradeHistoryRowKindRank(right.kind);
  }
  return left.id.localeCompare(right.id);
}

export function filterTradeHistoryRowsByStrategyStart(rows: readonly TradeHistoryRow[], strategy: PrototypeStrategy): TradeHistoryRow[] {
  const startedAtMs = getStrategyStartedAtMs(strategy);
  if (startedAtMs === null) {
    return [...rows];
  }

  return rows.filter((row) => row.sourceTimeMs >= startedAtMs);
}

function getStrategyStartedAtMs(strategy: PrototypeStrategy): number | null {
  const timestamp = Date.parse(strategy.startedAt ?? "");
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getTradeHistoryRowKindRank(kind: TradeHistoryRow["kind"]): number {
  switch (kind) {
    case "signalSource":
      return 0;
    case "me":
      return 1;
    case "tradeLog":
      return 2;
  }
}

function getTimestampMs(value: string | undefined): number {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getSignalSourceOrderQuantity(order: TradingFoxSignalSourceOrderItem): number | null {
  const quantity = firstFiniteNumber(
    order.deltaQty,
    order.metadata?.deltaQty,
    order.metadata?.delta_qty,
  );
  if (quantity !== null) {
    return Math.abs(quantity);
  }

  const previousQuantity = firstFiniteNumber(
    order.prevQty,
    order.metadata?.prevQty,
    order.metadata?.prev_qty,
  );
  const currentQuantity = firstFiniteNumber(
    order.currQty,
    order.metadata?.currQty,
    order.metadata?.curr_qty,
  );
  if (previousQuantity !== null && currentQuantity !== null) {
    return Math.abs(currentQuantity - previousQuantity);
  }
  if (currentQuantity !== null) {
    return Math.abs(currentQuantity);
  }

  return null;
}

function getSignalSourceOrderPrice(order: TradingFoxSignalSourceOrderItem): number | null {
  return firstFiniteNumber(
    order.price,
    order.metadata?.eventPrice,
    order.metadata?.event_price,
    order.metadata?.price,
    order.metadata?.executedPrice,
    order.metadata?.executed_price,
    order.metadata?.orderPrice,
    order.metadata?.order_price,
    order.metadata?.avgPrice,
    order.metadata?.avg_price,
    order.markPrice,
    order.metadata?.markPrice,
    order.metadata?.mark_price,
    order.entryPrice,
    order.metadata?.entryPrice,
    order.metadata?.entry_price,
  );
}

function getTradeLogQuantity(log: TradingFoxTradeLogItem): number | null {
  const trade = log.ssTradeInfo ?? {};
  const orderData = log.orderData ?? {};
  const quantity = firstFiniteNumber(trade.amountAbsolute, trade.nomAmount, orderData.contractAmount, orderData.amount);
  return quantity === null ? null : Math.abs(quantity);
}

function getTradeLogSide(log: TradingFoxTradeLogItem): string | undefined {
  const trade = log.ssTradeInfo ?? {};
  const orderData = log.orderData ?? {};
  const explicitSide = firstString(orderData.side, orderData.ccxtOrderSide, orderData.CCXTOrderSide);
  if (explicitSide) {
    return explicitSide;
  }

  const amount = firstFiniteNumber(trade.nomAmount);
  if (amount === null) {
    return undefined;
  }
  if (amount > 0) {
    return "buy";
  }
  if (amount < 0) {
    return "sell";
  }
  return undefined;
}

function getTradeLogReason(log: TradingFoxTradeLogItem): string {
  const additional = log.additionalInfo ?? {};
  return firstString(additional.skipReason, additional.errorCode, log.errorMessage, log.type) || "--";
}

function firstFiniteNumber(...values: readonly unknown[]): number | null {
  for (const value of values) {
    const number = finiteNumberOrNull(value);
    if (number !== null) {
      return number;
    }
  }
  return null;
}

function firstString(...values: readonly unknown[]): string {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        return trimmedValue;
      }
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

export function TradeHistoryKlinePanel({
  copy,
  interval,
  isDarkTheme,
  row,
  rows,
  strategy,
  telegramUser,
  onIntervalChange,
}: {
  copy: WorkspaceCopy;
  interval: KlineInterval;
  isDarkTheme: boolean;
  row: TradeHistoryRow;
  rows: readonly TradeHistoryRow[];
  strategy: PrototypeStrategy;
  telegramUser: TelegramSessionUser | null;
  onIntervalChange: (interval: KlineInterval) => void;
}) {
  const [candleState, setCandleState] = useState<{
    canLoadOlderHistory: boolean;
    candles: readonly MarketCandle[];
    error: string;
    key: string;
  }>({
    canLoadOlderHistory: false,
    candles: EMPTY_MARKET_CANDLES,
    error: "",
    key: "",
  });
  const [isLoadingOlderHistory, setIsLoadingOlderHistory] = useState(false);
  const rowSymbol = toCopyTradingMarketSymbol(row.symbol);
  const [selectedSymbol, setSelectedSymbol] = useState<MarketSymbol>(rowSymbol);
  const symbolOptions = useMemo(() => createTradeHistorySymbolOptions(rows), [rows]);
  const selectedSymbolOption = symbolOptions.find((option) => option.symbol === selectedSymbol) ?? null;
  const symbol = selectedSymbolOption?.symbol ?? symbolOptions[0]?.symbol ?? rowSymbol;
  const anchorRow = rowSymbol === symbol ? row : findTradeHistoryRowForSymbol(rows, symbol) ?? row;
  const chartKey = `${anchorRow.id}:${symbol}:${interval}`;
  const candles = candleState.key === chartKey ? candleState.candles : EMPTY_MARKET_CANDLES;
  const canLoadOlderHistory = candleState.key === chartKey ? candleState.canLoadOlderHistory : false;
  const loadError = candleState.key === chartKey ? candleState.error : "";
  const language = resolveWorkspaceLanguage(copy);

  useEffect(() => {
    setSelectedSymbol(rowSymbol);
  }, [rowSymbol]);

  const tradeMarkers = useMemo(
    () => createTradeHistoryTradeMarkers({
      rows,
      selectedSymbol: symbol,
      strategy,
      strategyCopy: copy.workspace.accountCenter.strategy,
      telegramUser,
    }),
    [copy.workspace.accountCenter.strategy, rows, strategy, symbol, telegramUser],
  );
  const focusTimeRequest = useMemo<ChartTimeFocusRequest | null>(() => {
    const sourceTimeMs = Date.parse(anchorRow.timestamp);
    if (!Number.isFinite(sourceTimeMs)) {
      return null;
    }

    return {
      key: `copy-strategy-row:${anchorRow.id}:${symbol}:${interval}:${sourceTimeMs}`,
      sourceTimeMs,
    };
  }, [anchorRow.id, anchorRow.timestamp, interval, symbol]);

  useEffect(() => {
    let isActive = true;
    const abortController = new AbortController();
    const sourceTimeMs = Date.parse(anchorRow.timestamp);
    const requestKey = chartKey;

    fetchHistoricalCandles(symbol, interval, {
      limit: TRADE_HISTORY_KLINE_CANDLE_LIMIT,
      signal: abortController.signal,
      untilMs: resolveInitialTradeHistoryKlineUntilMs(sourceTimeMs, interval),
    })
      .then((historicalCandles) => {
        if (!isActive) {
          return;
        }

        setCandleState({
          canLoadOlderHistory: historicalCandles.length >= TRADE_HISTORY_KLINE_CANDLE_LIMIT,
          candles: historicalCandles,
          error: "",
          key: requestKey,
        });
      })
      .catch((error: unknown) => {
        if (isActive && !isAbortError(error)) {
          setCandleState({
            canLoadOlderHistory: false,
            candles: EMPTY_MARKET_CANDLES,
            error: error instanceof Error ? error.message : String(error),
            key: requestKey,
          });
        }
      });

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [anchorRow.timestamp, chartKey, interval, symbol]);

  const loadOlderHistory = useCallback(async () => {
    if (isLoadingOlderHistory || !canLoadOlderHistory) {
      return;
    }

    const oldestCandle = candles.at(0);
    if (!oldestCandle) {
      return;
    }

    setIsLoadingOlderHistory(true);
    try {
      const olderCandles = await fetchHistoricalCandles(symbol, interval, {
        limit: TRADE_HISTORY_KLINE_CANDLE_LIMIT,
        untilMs: oldestCandle.sourceTimeMs,
      });
      setCandleState((currentState) => {
        if (currentState.key !== chartKey) {
          return currentState;
        }

        return {
          canLoadOlderHistory: olderCandles.length >= TRADE_HISTORY_KLINE_CANDLE_LIMIT,
          candles: prependHistoricalCandles(currentState.candles, olderCandles),
          error: "",
          key: chartKey,
        };
      });
    } catch (error: unknown) {
      setCandleState((currentState) => currentState.key === chartKey
        ? {
          ...currentState,
          error: error instanceof Error ? error.message : String(error),
        }
        : currentState);
    } finally {
      setIsLoadingOlderHistory(false);
    }
  }, [canLoadOlderHistory, candles, chartKey, interval, isLoadingOlderHistory, symbol]);

  return (
    <div className={isDarkTheme ? "mt-3 overflow-hidden rounded-3xl border border-white/[0.075] bg-[#181A20]" : "mt-3 overflow-hidden rounded-3xl border border-[#DDE8F0] bg-white"}>
      <div className={isDarkTheme ? "flex flex-col gap-3 border-b border-white/[0.075] bg-white/[0.035] px-4 py-3 sm:flex-row sm:items-center sm:justify-between" : "flex flex-col gap-3 border-b border-[#E5EAF0] bg-[#F8FAFC] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TradeHistoryKlineSymbolSelect
              isDarkTheme={isDarkTheme}
              options={symbolOptions}
              value={symbol}
              onChange={setSelectedSymbol}
            />
            <div className="text-sm font-black">{copy.workspace.accountCenter.strategy.tradeHistoryKlineTitle}</div>
          </div>
          <div className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-500"}>
            {symbol} · {formatDetailDate(anchorRow.timestamp)}
          </div>
        </div>
        <div className={isDarkTheme ? "inline-flex w-max items-center gap-1 rounded-full border border-white/[0.075] bg-white/[0.035] p-0.5" : "inline-flex w-max items-center gap-1 rounded-full border border-[#E5EAF0] bg-white p-0.5"}>
          {intervals.map((item) => (
            <button
              key={item}
              className={item === interval ? "h-8 rounded-full bg-[#00A6F4] px-3 text-xs font-bold text-white" : isDarkTheme ? "h-8 rounded-full px-3 text-xs font-bold text-slate-400 transition hover:bg-white/[0.08] hover:text-slate-100" : "h-8 rounded-full px-3 text-xs font-bold text-slate-500 transition hover:bg-[#F1F7FB] hover:text-slate-950"}
              type="button"
              onClick={() => onIntervalChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-[420px] min-h-[320px]">
        <KlineChart
          activePaperPosition={null}
          activeSignal={null}
          activeSignalDrawingReady={false}
          aiSummary={null}
          candles={candles}
          canLoadOlderHistory={canLoadOlderHistory}
          eventSignals={EMPTY_STRUCTURED_SIGNALS}
          focusSignalRequestKey={null}
          focusTimeRequest={focusTimeRequest}
          interval={interval}
          isLoadingOlderHistory={isLoadingOlderHistory}
          language={language}
          priceColorMode="positiveGreen"
          signalBiasSummary={null}
          theme={isDarkTheme ? "dark" : "light"}
          tradeMarkers={tradeMarkers}
          onEventSignalSelect={() => undefined}
          onFocusSignalRequestHandled={() => undefined}
          onFocusTimeRequestHandled={() => undefined}
          onLoadOlderHistory={loadOlderHistory}
        />
        {candles.length === 0 && !loadError ? (
          <div className={isDarkTheme ? "pointer-events-none absolute inset-0 grid place-items-center bg-[#181A20]/78 text-xs font-bold text-slate-500" : "pointer-events-none absolute inset-0 grid place-items-center bg-white/78 text-xs font-bold text-slate-500"}>
            {copy.paper.loading}
          </div>
        ) : null}
        {loadError ? (
          <div className={isDarkTheme ? "absolute right-4 top-4 z-30 max-w-md rounded-2xl border border-amber-500/20 bg-[#181A20]/94 px-3 py-2 text-xs text-amber-100 shadow-[0_12px_32px_rgba(0,0,0,0.22)] backdrop-blur-xl" : "absolute right-4 top-4 z-30 max-w-md rounded-2xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-xs text-amber-800 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl"}>
            {copy.realtime.errorInline(loadError)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TradeHistoryKlineSymbolSelect({
  isDarkTheme,
  options,
  value,
  onChange,
}: {
  isDarkTheme: boolean;
  options: readonly TradeHistorySymbolOption[];
  value: MarketSymbol;
  onChange: (value: MarketSymbol) => void;
}) {
  const selectedOption = options.find((option) => option.symbol === value) ?? options[0] ?? {
    count: 0,
    label: value,
    symbol: value,
  };
  const triggerClassName = isDarkTheme
    ? "inline-flex h-8 min-w-28 items-center justify-between gap-2 rounded-full border border-white/[0.075] bg-white/[0.055] px-3 text-xs font-black text-slate-100 outline-none transition hover:bg-white/[0.08] focus:border-sky-400/45 focus:ring-2 focus:ring-sky-400/10"
    : "inline-flex h-8 min-w-28 items-center justify-between gap-2 rounded-full border border-[#D5E4EF] bg-white px-3 text-xs font-black text-slate-950 shadow-sm outline-none transition hover:bg-[#F8FAFC] focus:border-[#7DBEFF] focus:ring-2 focus:ring-[#16AFF5]/10";
  const pillClassName = isDarkTheme
    ? "inline-flex h-8 min-w-28 items-center rounded-full border border-white/[0.075] bg-white/[0.055] px-3 text-xs font-black text-slate-100"
    : "inline-flex h-8 min-w-28 items-center rounded-full border border-[#D5E4EF] bg-white px-3 text-xs font-black text-slate-950 shadow-sm";

  if (options.length <= 1) {
    return <span className={pillClassName}>{selectedOption.label}</span>;
  }

  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger aria-label="Trade history symbol" className={triggerClassName}>
        <SelectPrimitive.Value>{selectedOption.label}</SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <span aria-hidden="true" className={isDarkTheme ? "text-[10px] text-slate-500" : "text-[10px] text-slate-400"}>⌄</span>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={isDarkTheme
            ? "z-[140] max-h-[260px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-white/[0.075] bg-[#111820] p-1 text-slate-100 shadow-[0_18px_44px_rgba(0,0,0,0.38)]"
            : "z-[140] max-h-[260px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-[#D5E4EF] bg-white p-1 text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.14)]"}
          position="popper"
          sideOffset={8}
        >
          <SelectPrimitive.Viewport className="grid gap-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.symbol}
                className={isDarkTheme
                  ? "flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-bold outline-none transition data-[highlighted]:bg-white/[0.055] data-[state=checked]:bg-sky-400/10 data-[state=checked]:text-sky-100"
                  : "flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-bold outline-none transition data-[highlighted]:bg-[#F8FAFC] data-[state=checked]:bg-[#EAF8FE] data-[state=checked]:text-[#007DB8]"}
                value={option.symbol}
              >
                <SelectPrimitive.ItemText asChild>
                  <span>{option.label}</span>
                </SelectPrimitive.ItemText>
                <span className={isDarkTheme ? "text-[10px] text-slate-500" : "text-[10px] text-slate-400"}>
                  {option.count}
                </span>
                <SelectPrimitive.ItemIndicator className="text-xs font-black">✓</SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function TradeHistoryTable({
  activeKlineRowId,
  copy,
  isDarkTheme,
  rows,
  strategyCopy,
  telegramUser,
  onRowKlineOpen,
}: {
  activeKlineRowId: string | null;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  rows: readonly TradeHistoryRow[];
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  telegramUser: TelegramSessionUser | null;
  onRowKlineOpen: (row: TradeHistoryRow) => void;
}) {
  return (
    <div className="kol-scroll-area mt-3 overflow-x-auto">
      <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
        <thead>
          <tr className={isDarkTheme ? "border-b border-white/[0.075] text-xs font-black text-slate-500" : "border-b border-[#DDE8F0] text-xs font-black text-slate-500"}>
            <th className="px-3 py-3">{strategyCopy.orderTime}</th>
            <th className="px-3 py-3">{strategyCopy.orderSource}</th>
            <th className="px-3 py-3">{strategyCopy.orderPair}</th>
            <th className="px-3 py-3">{strategyCopy.orderSide}</th>
            <th className="px-3 py-3">{strategyCopy.referencePrice}</th>
            <th className="px-3 py-3">{strategyCopy.orderQuantity}</th>
            <th className="px-3 py-3">{strategyCopy.notional}</th>
            <th className="px-3 py-3">{strategyCopy.tradeStatus}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const notional = row.price !== null && row.quantity !== null ? row.price * row.quantity : null;
            const isActiveKlineRow = row.id === activeKlineRowId;
            return (
              <tr key={row.id} className={getTradeHistoryRowClassName(isDarkTheme, row.kind, isActiveKlineRow)}>
                <td className="px-3 py-4 font-semibold">{formatDetailDate(row.timestamp)}</td>
                <td className="px-3 py-4">
                  <TradeHistorySourceCell isDarkTheme={isDarkTheme} row={row} strategyCopy={strategyCopy} telegramUser={telegramUser} />
                </td>
                <td className="px-3 py-4 font-black">
                  <button
                    className={isActiveKlineRow ? "rounded-full bg-sky-400/15 px-2 py-1 text-sky-400" : "rounded-full px-2 py-1 underline underline-offset-2 transition hover:bg-sky-400/10 hover:text-sky-400"}
                    type="button"
                    onClick={() => onRowKlineOpen(row)}
                  >
                    {row.symbol}
                  </button>
                </td>
                <td className={`px-3 py-4 font-black ${getTradeHistorySideClassName(isDarkTheme, row)}`}>{formatTradeHistoryAction(row, strategyCopy)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(row.price)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(row.quantity)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailCurrency(notional)}</td>
                <td className={getTradeHistoryStatusClassName(isDarkTheme, row)}>{formatTradeHistoryStatus(row, copy)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TradeHistorySourceCell({
  isDarkTheme,
  row,
  strategyCopy,
  telegramUser,
}: {
  isDarkTheme: boolean;
  row: TradeHistoryRow;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  telegramUser: TelegramSessionUser | null;
}) {
  if (row.kind === "me") {
    return (
      <div className="inline-flex items-center gap-2">
        {telegramUser ? (
          <TelegramUserAvatar isDarkTheme={isDarkTheme} size="table" user={telegramUser} />
        ) : (
          <span className={isDarkTheme ? "grid h-8 w-8 place-items-center rounded-full bg-sky-400/15 text-xs font-black text-sky-200" : "grid h-8 w-8 place-items-center rounded-full bg-[#EAF8FE] text-xs font-black text-[#008DCC]"}>
            {strategyCopy.orderSourceMe}
          </span>
        )}
        <div className="min-w-0">
          <div className="text-sm font-black">{strategyCopy.orderSourceMe}</div>
          <div className={isDarkTheme ? "mt-0.5 max-w-36 truncate text-[10px] font-semibold text-slate-500" : "mt-0.5 max-w-36 truncate text-[10px] font-semibold text-slate-400"}>{row.source.name}</div>
        </div>
      </div>
    );
  }

  const sourceDisplayName = row.source.name || row.source.id;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <SourceAvatar isDarkTheme={isDarkTheme} name={sourceDisplayName} url={row.source.avatarUrl} />
      <div className="min-w-0">
        <div className="max-w-44 truncate text-sm font-black">{sourceDisplayName}</div>
        {row.kind === "tradeLog" ? (
          <div className={isDarkTheme ? "mt-0.5 max-w-44 truncate text-[10px] font-semibold text-slate-500" : "mt-0.5 max-w-44 truncate text-[10px] font-semibold text-slate-400"}>
            {`${strategyCopy.tradeEventNoOrder} #${row.tradeLog?.id ?? "--"}`}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getTradeHistoryRowClassName(isDarkTheme: boolean, kind: TradeHistoryRow["kind"], isActive: boolean): string {
  if (kind === "tradeLog") {
    if (isActive) {
      return isDarkTheme
        ? "border-b border-rose-400/20 bg-rose-400/[0.08] shadow-[inset_3px_0_0_rgba(251,113,133,0.85)] last:border-0"
        : "border-b border-rose-200 bg-rose-50 shadow-[inset_3px_0_0_#f43f5e] last:border-0";
    }
    return isDarkTheme
      ? "border-b border-white/[0.06] bg-rose-400/[0.035] shadow-[inset_3px_0_0_rgba(251,113,133,0.6)] last:border-0"
      : "border-b border-[#F3D3DA] bg-rose-50/70 shadow-[inset_3px_0_0_#fb7185] last:border-0";
  }

  if (kind === "signalSource") {
    if (isActive) {
      return isDarkTheme
        ? "border-b border-sky-400/20 bg-sky-400/[0.08] shadow-[inset_3px_0_0_rgba(56,189,248,0.75)] last:border-0"
        : "border-b border-[#B7E8FC] bg-[#EAF8FE] shadow-[inset_3px_0_0_#00A6F4] last:border-0";
    }
    return isDarkTheme
      ? "border-b border-white/[0.06] bg-white/[0.025] shadow-[inset_3px_0_0_rgba(148,163,184,0.35)] last:border-0"
      : "border-b border-[#DDE8F0] bg-[#F8FAFC] shadow-[inset_3px_0_0_#CBD5E1] last:border-0";
  }

  if (isActive) {
    return isDarkTheme
      ? "border-b border-sky-400/20 bg-sky-400/[0.08] last:border-0"
      : "border-b border-[#B7E8FC] bg-[#EAF8FE] last:border-0";
  }
  return isDarkTheme ? "border-b border-white/[0.06] last:border-0" : "border-b border-[#DDE8F0] last:border-0";
}

export function RowsPaginationControls({
  canGoNext,
  canGoPrevious,
  isDarkTheme,
  nextLabel,
  previousLabel,
  rangeLabel,
  onNext,
  onPrevious,
}: {
  canGoNext: boolean;
  canGoPrevious: boolean;
  isDarkTheme: boolean;
  nextLabel: string;
  previousLabel: string;
  rangeLabel: string;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const buttonClassName = isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-[11px] font-bold text-sky-200 transition hover:border-sky-400/25 hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:opacity-45"
    : "rounded-2xl border border-[#B7E8FC] bg-white px-3 py-2 text-[11px] font-bold text-[#008DCC] transition hover:bg-[#EAF8FE] disabled:cursor-not-allowed disabled:opacity-45";
  const rangeClassName = isDarkTheme
    ? "text-center text-[10px] font-semibold text-slate-500"
    : "text-center text-[10px] font-semibold text-slate-400";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <button className={buttonClassName} disabled={!canGoPrevious} type="button" onClick={onPrevious}>
        {previousLabel}
      </button>
      <span className={rangeClassName}>{rangeLabel}</span>
      <button className={buttonClassName} disabled={!canGoNext} type="button" onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  );
}

function createTradeHistorySymbolOptions(rows: readonly TradeHistoryRow[]): TradeHistorySymbolOption[] {
  const options = new Map<MarketSymbol, TradeHistorySymbolOption>();
  for (const row of rows) {
    const rawSymbol = row.symbol.trim();
    if (!rawSymbol || rawSymbol === "--") {
      continue;
    }

    const symbol = toCopyTradingMarketSymbol(rawSymbol);
    const existingOption = options.get(symbol);
    if (existingOption) {
      existingOption.count += 1;
      continue;
    }

    options.set(symbol, {
      count: 1,
      label: rawSymbol,
      symbol,
    });
  }
  return Array.from(options.values());
}

function findTradeHistoryRowForSymbol(rows: readonly TradeHistoryRow[], symbol: MarketSymbol): TradeHistoryRow | null {
  return rows.find((row) => toCopyTradingMarketSymbol(row.symbol) === symbol) ?? null;
}

function createTradeHistoryTradeMarkers({
  rows,
  selectedSymbol,
  strategy,
  strategyCopy,
  telegramUser,
}: {
  rows: readonly TradeHistoryRow[];
  selectedSymbol: MarketSymbol;
  strategy: PrototypeStrategy;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  telegramUser: TelegramSessionUser | null;
}): CopyTradingTradeMarker[] {
  return rows
    .filter((row) => row.kind === "me" && toCopyTradingMarketSymbol(row.symbol) === selectedSymbol)
    .map((row) => createTradeHistoryTradeMarker(row, strategy, strategyCopy, telegramUser))
    .filter((marker): marker is CopyTradingTradeMarker => marker !== null)
    .sort((left, right) => left.sourceTimeMs - right.sourceTimeMs);
}

function createTradeHistoryTradeMarker(
  row: TradeHistoryRow,
  strategy: PrototypeStrategy,
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"],
  telegramUser: TelegramSessionUser | null,
): CopyTradingTradeMarker | null {
  const sourceTimeMs = Date.parse(row.timestamp);
  if (!Number.isFinite(sourceTimeMs)) {
    return null;
  }

  const price = row.price;
  const side = getTradeHistoryMarkerSide(row);
  const traderName = getTradeHistoryUserMarkerName(telegramUser, strategyCopy.orderSourceMe);
  const actionLabel = strategyCopy.orderSourceMe;
  const priceText = price === null ? null : formatDetailNumber(price);
  const priceSuffix = priceText ? ` @ ${priceText}` : "";

  return {
    actionLabel,
    avatarUrl: telegramUser?.avatarUrl ?? null,
    detail: `${formatDetailDate(row.timestamp)} · ${formatOrderStatus(row.status, strategyCopy)}`,
    direction: side === "buy" ? "long" : "short",
    eventId: row.id,
    eventType: "open",
    id: `copy-strategy-row:${row.id}`,
    occurredAtText: formatDetailDate(row.timestamp),
    price,
    priceText,
    side,
    signalId: `copy-strategy-row:${row.id}`,
    sourceTimeMs,
    symbol: toCopyTradingMarketSymbol(row.symbol),
    title: `${traderName} ${row.symbol}${priceSuffix}`,
    traderId: strategy.traderId,
    traderName,
  };
}

function getTradeHistoryUserMarkerName(user: TelegramSessionUser | null, fallback: string): string {
  const name = user?.name?.trim();
  if (name) {
    return name;
  }

  const username = user?.username?.trim();
  if (username) {
    return username.startsWith("@") ? username : `@${username}`;
  }

  return fallback;
}

function normalizeOrderTradeMarkerSide(value: string | undefined): "buy" | "sell" {
  const normalizedValue = (value ?? "").trim().toUpperCase();
  return normalizedValue.includes("SELL") || normalizedValue.includes("SHORT") ? "sell" : "buy";
}

function getTradeHistoryMarkerSide(row: TradeHistoryRow): "buy" | "sell" {
  if (row.kind === "signalSource") {
    return normalizeOrderTradeMarkerSide(row.signalSourceOrder?.side || row.action);
  }
  return normalizeOrderTradeMarkerSide(row.action);
}

function resolveInitialTradeHistoryKlineUntilMs(sourceTimeMs: number, interval: KlineInterval): number | undefined {
  if (!Number.isFinite(sourceTimeMs)) {
    return undefined;
  }

  return sourceTimeMs + KLINE_INTERVAL_MS_BY_INTERVAL[interval] * 120;
}

export function createOpenEndedPageRangeLabel(pageOffset: number, visibleCount: number): string {
  if (visibleCount <= 0) {
    return "0 / 0";
  }

  return `${pageOffset + 1}-${pageOffset + visibleCount}`;
}

function resolveWorkspaceLanguage(copy: WorkspaceCopy): WorkspaceLanguage {
  return copy === WORKSPACE_COPY["en-US"] ? "en-US" : "zh-CN";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}


function formatOrderSide(value: string | undefined, strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"]): string {
  const normalizedValue = (value ?? "").toLowerCase();
  if (normalizedValue.includes("buy")) {
    return strategyCopy.orderOpenLong;
  }
  if (normalizedValue.includes("sell")) {
    return strategyCopy.orderOpenShort;
  }
  return value || "--";
}

function formatTradeHistoryAction(row: TradeHistoryRow, strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"]): string {
  if (row.kind === "me") {
    return formatOrderSide(row.action, strategyCopy);
  }
  if (row.kind === "tradeLog") {
    return row.side ? formatOrderSide(row.side, strategyCopy) : strategyCopy.tradeEventNoOrder;
  }

  const normalizedAction = (row.action ?? "").toLowerCase();
  const normalizedSide = row.side?.toLowerCase() ?? "";
  const isShort = normalizedSide.includes("short") || normalizedSide.includes("sell") || normalizedAction.includes("short");
  if (normalizedAction.includes("close")) {
    return isShort ? strategyCopy.orderCloseShort : strategyCopy.orderCloseLong;
  }
  if (normalizedAction.includes("reduce")) {
    return isShort ? strategyCopy.orderReduceShort : strategyCopy.orderReduceLong;
  }
  if (normalizedAction.includes("add") || normalizedAction.includes("increase")) {
    return isShort ? strategyCopy.orderAddShort : strategyCopy.orderAddLong;
  }
  if (normalizedAction.includes("open")) {
    return isShort ? strategyCopy.orderOpenShort : strategyCopy.orderOpenLong;
  }
  if (normalizedSide.includes("short") || normalizedSide.includes("sell")) {
    return strategyCopy.orderOpenShort;
  }
  if (normalizedSide.includes("long") || normalizedSide.includes("buy")) {
    return strategyCopy.orderOpenLong;
  }
  return row.action || row.signalSourceOrder?.side || "--";
}

function getTradeHistorySideClassName(isDarkTheme: boolean, row: TradeHistoryRow): string {
  if (row.kind === "tradeLog" && !row.side) {
    return isDarkTheme ? "text-rose-300" : "text-rose-600";
  }
  return getSideClassName(isDarkTheme, row.side || row.action);
}

function formatTradeHistoryStatus(row: TradeHistoryRow, copy: WorkspaceCopy): string {
  const strategyCopy = copy.workspace.accountCenter.strategy;
  if (row.kind === "me") {
    return formatOrderStatus(row.status, strategyCopy);
  }
  if (row.kind === "tradeLog") {
    return row.status ? getTradingFoxErrorMessage(row.status, copy) : strategyCopy.tradeEventNoOrder;
  }
  return "--";
}

function getTradeHistoryStatusClassName(isDarkTheme: boolean, row: TradeHistoryRow): string {
  if (row.kind === "me") {
    return isDarkTheme ? "px-3 py-4 font-black text-emerald-300" : "px-3 py-4 font-black text-emerald-600";
  }
  if (row.kind === "tradeLog") {
    return isDarkTheme ? "px-3 py-4 font-black text-rose-300" : "px-3 py-4 font-black text-rose-600";
  }
  return isDarkTheme ? "px-3 py-4 font-semibold text-slate-500" : "px-3 py-4 font-semibold text-slate-400";
}

function formatOrderStatus(value: string | undefined, strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"]): string {
  const normalizedValue = (value ?? "").toLowerCase();
  if (normalizedValue === "closed" || normalizedValue === "filled") {
    return strategyCopy.orderStatusCompleted;
  }
  return value || "--";
}
