import { settleTradingFoxRequest } from "./http";
import type { TradingFoxCopyStrategyCurveWindow, TradingFoxStrategyCurve } from "./types";
import { isRecord, normalizeOptionalText, numberOrNull, positiveNumberOrNull } from "./value-utils";

export async function settleTradingFoxStrategyCurveRequest(
  traderId: number,
  window: TradingFoxCopyStrategyCurveWindow,
): Promise<{ error?: string; value?: unknown }> {
  const primaryResponse = await settleTradingFoxRequest<unknown>(`/v1/traders/${traderId}/strategy-curve?window=${encodeURIComponent(window)}&limit=240`);
  if (primaryResponse.value !== undefined) {
    return primaryResponse;
  }

  const snapshotResponse = await settleTradingFoxRequest<unknown>(`/v1/traders/${traderId}/account-snapshots?window=${encodeURIComponent(window)}&limit=240`);
  return snapshotResponse.value !== undefined ? snapshotResponse : primaryResponse;
}

export function normalizeTradingFoxStrategyCurveError(error: string | undefined): string | undefined {
  if (!error) {
    return undefined;
  }

  return /(?:not found|route not found)/iu.test(error) || isTradingFoxSignalSourcePositionsCacheError(error)
    ? undefined
    : error;
}

function isTradingFoxSignalSourcePositionsCacheError(error: string): boolean {
  const normalizedError = error.toLowerCase();
  return normalizedError.includes("signal source positions cache error")
    || normalizedError.includes("信号源仓位缓存已过期");
}

export function readTradingFoxStrategyCurvePayload(...sources: readonly unknown[]): unknown {
  for (const source of sources) {
    const payload = readTradingFoxStrategyCurvePayloadFromSource(source);
    if (payload !== undefined) {
      return payload;
    }
  }

  return undefined;
}

export function readTradingFoxStrategyCurvePayloadFromSource(source: unknown): unknown {
  if (!isRecord(source)) {
    return Array.isArray(source) ? source : undefined;
  }

  /**
   * The current strategy-curve endpoint returns the curve envelope directly.
   * Keeping the envelope preserves baseEquity/currency/updatedAt instead of
   * adapting only the nested points array.
   */
  if (hasTradingFoxStrategyCurvePointList(source)) {
    return source;
  }

  const candidates = [
    source.strategyCurve,
    source.strategy_curve,
    source.performanceCurve,
    source.performance_curve,
    source.accountSnapshots,
    source.account_snapshots,
    source.snapshots,
    source.curve,
    source.points,
    source.items,
    source.data,
  ];
  return candidates.find((candidate) => candidate !== undefined && candidate !== null);
}

function hasTradingFoxStrategyCurvePointList(source: Record<string, unknown>): boolean {
  return [
    source.points,
    source.items,
    source.curve,
    source.snapshots,
    source.accountSnapshots,
    source.account_snapshots,
    source.data,
    source.pnlCurve,
    source.pnl_curve,
    source.pnlPoints,
    source.pnl_points,
    source.roiCurve,
    source.roi_curve,
    source.roiPoints,
    source.roi_points,
    source.returnCurve,
    source.return_curve,
  ].some(Array.isArray);
}

export function adaptTradingFoxStrategyCurve(
  payload: unknown,
  options: {
    baseEquity?: number;
  },
): TradingFoxStrategyCurve | null {
  const pointSources = readTradingFoxStrategyCurvePointSources(payload);
  const rawPoints = [...pointSources.combined, ...pointSources.roi, ...pointSources.pnl];
  const explicitBaseEquity = readTradingFoxCurveBaseEquity(payload);
  const baseEquity = positiveNumberOrNull(explicitBaseEquity)
    ?? positiveNumberOrNull(options.baseEquity)
    ?? firstPositiveEquity(rawPoints);

  const pointsByTimestamp = new Map<string, TradingFoxStrategyCurve["points"][number]>();
  for (const point of pointSources.combined) {
    mergeTradingFoxStrategyCurvePoint(pointsByTimestamp, normalizeTradingFoxStrategyCurvePoint(point, "combined", baseEquity));
  }
  for (const point of pointSources.roi) {
    mergeTradingFoxStrategyCurvePoint(pointsByTimestamp, normalizeTradingFoxStrategyCurvePoint(point, "roi", baseEquity));
  }
  for (const point of pointSources.pnl) {
    mergeTradingFoxStrategyCurvePoint(pointsByTimestamp, normalizeTradingFoxStrategyCurvePoint(point, "pnl", baseEquity));
  }

  const points = Array.from(pointsByTimestamp.values())
    .filter((point) => point.roi !== null || point.pnl !== null)
    .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));
  if (points.length === 0) {
    return null;
  }

  return {
    ...(baseEquity !== null ? { baseEquity } : {}),
    currency: readTradingFoxCurveCurrency(payload) ?? points.find((point) => point.currency)?.currency,
    points,
    updatedAt: readTradingFoxCurveUpdatedAt(payload)
      ?? points[points.length - 1]?.timestamp
      ?? new Date().toISOString(),
  };
}

function readTradingFoxStrategyCurvePointSources(payload: unknown): {
  combined: Record<string, unknown>[];
  pnl: Record<string, unknown>[];
  roi: Record<string, unknown>[];
} {
  if (Array.isArray(payload)) {
    return {
      combined: payload.filter(isRecord),
      pnl: [],
      roi: [],
    };
  }

  if (!isRecord(payload)) {
    return {
      combined: [],
      pnl: [],
      roi: [],
    };
  }

  return {
    combined: firstRecordList(payload.points, payload.items, payload.curve, payload.snapshots, payload.accountSnapshots, payload.account_snapshots, payload.data),
    pnl: firstRecordList(payload.pnlCurve, payload.pnl_curve, payload.pnlPoints, payload.pnl_points),
    roi: firstRecordList(payload.roiCurve, payload.roi_curve, payload.roiPoints, payload.roi_points, payload.returnCurve, payload.return_curve),
  };
}

function normalizeTradingFoxStrategyCurvePoint(
  point: Record<string, unknown>,
  metric: "combined" | "pnl" | "roi",
  baseEquity: number | null,
): TradingFoxStrategyCurve["points"][number] | null {
  const timestamp = normalizeTradingFoxCurveTimestamp(
    point.timestamp
      ?? point.time
      ?? point.statTime
      ?? point.stat_time
      ?? point.createdAt
      ?? point.created_at
      ?? point.snapshotTime
      ?? point.snapshot_time
      ?? point.date,
  );
  if (!timestamp) {
    return null;
  }

  const pointMetric = readTradingFoxCurvePointMetric(point) ?? metric;
  const equity = numberOrNull(point.equity ?? point.accountEquity ?? point.account_equity ?? point.marginBalance ?? point.margin_balance);
  const explicitPnl = readTradingFoxCurvePnl(point, pointMetric);
  const pnl = pointMetric === "roi" ? null : explicitPnl ?? calculateTradingFoxCurvePnlFromEquity(equity, baseEquity);
  const explicitRoi = readTradingFoxCurveRoi(point, pointMetric);
  const roi = pointMetric === "pnl" ? null : explicitRoi ?? calculateTradingFoxCurveRoi(pnl, baseEquity);
  const currency = normalizeOptionalText(point.currency ?? point.asset ?? point.quoteAsset ?? point.quote_asset);

  return {
    ...(currency ? { currency } : {}),
    equity,
    pnl,
    roi,
    timestamp,
  };
}

function readTradingFoxCurvePointMetric(point: Record<string, unknown>): "pnl" | "roi" | null {
  const metric = normalizeOptionalText(point.metric ?? point.dataType ?? point.data_type ?? point.type).toLowerCase();
  if (metric.includes("roi") || metric.includes("return")) {
    return "roi";
  }
  if (metric.includes("pnl") || metric.includes("profit")) {
    return "pnl";
  }
  return null;
}

function mergeTradingFoxStrategyCurvePoint(
  pointsByTimestamp: Map<string, TradingFoxStrategyCurve["points"][number]>,
  point: TradingFoxStrategyCurve["points"][number] | null,
): void {
  if (!point) {
    return;
  }

  const currentPoint = pointsByTimestamp.get(point.timestamp);
  if (!currentPoint) {
    pointsByTimestamp.set(point.timestamp, point);
    return;
  }

  pointsByTimestamp.set(point.timestamp, {
    currency: currentPoint.currency ?? point.currency,
    equity: currentPoint.equity ?? point.equity,
    pnl: currentPoint.pnl ?? point.pnl,
    roi: currentPoint.roi ?? point.roi,
    timestamp: point.timestamp,
  });
}

function firstRecordList(...values: readonly unknown[]): Record<string, unknown>[] {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }

    const nestedPayload = readTradingFoxStrategyCurvePayloadFromSource(value);
    if (Array.isArray(nestedPayload)) {
      return nestedPayload.filter(isRecord);
    }
  }

  return [];
}

function readTradingFoxCurvePnl(point: Record<string, unknown>, metric: "combined" | "pnl" | "roi"): number | null {
  const realizedPnl = numberOrNull(point.realizedPnl ?? point.realized_pnl);
  const unrealizedPnl = numberOrNull(point.unrealizedPnl ?? point.unrealized_pnl ?? point.unPnl ?? point.un_pnl);
  const combinedPnl = realizedPnl !== null || unrealizedPnl !== null
    ? (realizedPnl ?? 0) + (unrealizedPnl ?? 0)
    : null;

  const pnl = numberOrNull(
    point.pnl
      ?? point.pnlAmount
      ?? point.pnl_amount
      ?? point.totalPnl
      ?? point.total_pnl
      ?? point.profit
      ?? point.profitAmount
      ?? point.profit_amount,
  ) ?? combinedPnl;

  return pnl ?? (metric === "pnl" ? numberOrNull(point.value) : null);
}

function readTradingFoxCurveRoi(point: Record<string, unknown>, metric: "combined" | "pnl" | "roi"): number | null {
  /**
   * The control-plane strategy-curve contract exposes roi as a percentage.
   * Rate-suffixed legacy fields are the ratio-style values that still need
   * percent normalization.
   */
  const percentValue = firstNumberOrNull(
    point.roi,
    point.roiPercent,
    point.roi_percent,
    point.returnPercent,
    point.return_percent,
    point.pnlPercent,
    point.pnl_percent,
  );
  if (percentValue !== null) {
    return percentValue;
  }

  const rateValue = firstTradingFoxCurveRateAsPercent(
    point.returnRate,
    point.return_rate,
    point.pnlRate,
    point.pnl_rate,
    point.profitRate,
    point.profit_rate,
  );
  if (rateValue !== null) {
    return rateValue;
  }

  return metric === "roi" ? normalizeTradingFoxCurveRateAsPercent(point.value) : null;
}

function calculateTradingFoxCurvePnlFromEquity(equity: number | null, baseEquity: number | null): number | null {
  if (equity === null || baseEquity === null) {
    return null;
  }
  return equity - baseEquity;
}

function calculateTradingFoxCurveRoi(pnl: number | null, baseEquity: number | null): number | null {
  if (pnl === null || baseEquity === null || baseEquity <= 0) {
    return null;
  }
  return (pnl / baseEquity) * 100;
}

function readTradingFoxCurveBaseEquity(payload: unknown): number | null {
  if (!isRecord(payload)) {
    return null;
  }

  return numberOrNull(payload.baseEquity ?? payload.base_equity ?? payload.initialEquity ?? payload.initial_equity);
}

function readTradingFoxCurveCurrency(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  return normalizeOptionalText(payload.currency ?? payload.asset ?? payload.quoteAsset ?? payload.quote_asset) || undefined;
}

function readTradingFoxCurveUpdatedAt(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  return normalizeTradingFoxCurveTimestamp(payload.updatedAt ?? payload.updated_at) ?? undefined;
}

function firstNumberOrNull(...values: readonly unknown[]): number | null {
  for (const value of values) {
    const number = numberOrNull(value);
    if (number !== null) {
      return number;
    }
  }

  return null;
}

function firstTradingFoxCurveRateAsPercent(...values: readonly unknown[]): number | null {
  for (const value of values) {
    const normalizedValue = normalizeTradingFoxCurveRateAsPercent(value);
    if (normalizedValue !== null) {
      return normalizedValue;
    }
  }

  return null;
}

function normalizeTradingFoxCurveRateAsPercent(value: unknown): number | null {
  const number = numberOrNull(value);
  if (number === null) {
    return null;
  }

  /**
   * Trading backends often expose ROI/rate fields as ratios while percent-suffixed
   * fields are already percentages. The strategy detail UI formats percent units,
   * so ratio-looking values are normalized before rendering.
   */
  return typeof value === "string" && value.trim().endsWith("%")
    ? number
    : Math.abs(number) <= 1
      ? number * 100
      : number;
}

function firstPositiveEquity(points: readonly Record<string, unknown>[]): number | null {
  for (const point of points) {
    const equity = positiveNumberOrNull(point.equity ?? point.accountEquity ?? point.account_equity ?? point.marginBalance ?? point.margin_balance);
    if (equity !== null) {
      return equity;
    }
  }

  return null;
}

function normalizeTradingFoxCurveTimestamp(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = Math.abs(value) < 1_000_000_000_000 ? value * 1_000 : value;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const trimmedValue = value.trim();
  const numericValue = Number(trimmedValue);
  if (Number.isFinite(numericValue)) {
    return normalizeTradingFoxCurveTimestamp(numericValue);
  }

  const date = new Date(trimmedValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
