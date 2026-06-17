import type {
  CopyTradingReturnCurvePoint,
} from "@/app/_types/copy-trading";
import type {
  SignalCenterReturnCurvePoint,
  SignalCenterReturnCurveResponse,
} from "./types";
import { parseNumber } from "./parsers";

export function adaptSignalCenterReturnCurvePoints(
  response: SignalCenterReturnCurveResponse,
): CopyTradingReturnCurvePoint[] {
  return trimLeadingFlatReturnCurvePoints(adaptSignalCenterReturnCurvePointList(readSignalCenterReturnCurvePointList(response)));
}

export function readSignalCenterReturnCurvePointList(
  response: SignalCenterReturnCurveResponse,
): readonly SignalCenterReturnCurvePoint[] {
  if (Array.isArray(response.points)) {
    return response.points;
  }

  if (Array.isArray(response.curve)) {
    return response.curve;
  }

  if (Array.isArray(response.items)) {
    return response.items;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (response.data && typeof response.data === "object") {
    if (Array.isArray(response.data.points)) {
      return response.data.points;
    }

    if (Array.isArray(response.data.curve)) {
      return response.data.curve;
    }

    if (Array.isArray(response.data.items)) {
      return response.data.items;
    }
  }

  return [];
}

export function readSignalCenterReturnCurveTimestamp(point: SignalCenterReturnCurvePoint): number | null {
  const rawTimestamp = point.timestamp
    ?? point.time
    ?? point.statTime
    ?? point.stat_time
    ?? point.date;
  if (typeof rawTimestamp === "string" && Number.isNaN(Number(rawTimestamp))) {
    const parsedTime = Date.parse(rawTimestamp);
    return Number.isFinite(parsedTime) ? parsedTime : null;
  }

  const timestamp = parseNumber(rawTimestamp);
  if (timestamp === null) {
    return null;
  }

  return Math.abs(timestamp) < 1_000_000_000_000 ? timestamp * 1_000 : timestamp;
}

export function readSignalCenterReturnCurveValue(point: SignalCenterReturnCurvePoint): number | null {
  return parseRatioNumber(point.value)
    ?? parseRatioNumber(point.roi)
    ?? parseRatioNumber(point.ratio)
    ?? parseRatioNumber(point.returnRate)
    ?? parseRatioNumber(point.return_rate)
    ?? parseRatioNumber(point.pnlRate)
    ?? parseRatioNumber(point.pnl_rate)
    ?? parsePercentNumber(point.roiPercent)
    ?? parsePercentNumber(point.roi_percent)
    ?? parsePercentNumber(point.returnPercent)
    ?? parsePercentNumber(point.return_percent);
}

export function readSignalCenterPnlCurveValue(point: SignalCenterReturnCurvePoint): number | null {
  return parseNumber(point.value)
    ?? parseNumber(point.pnl)
    ?? parseNumber(point.pnlAmount)
    ?? parseNumber(point.pnl_amount)
    ?? parseNumber(point.totalPnl)
    ?? parseNumber(point.total_pnl)
    ?? parseNumber(point.amount);
}

export function parseRatioNumber(value: unknown): number | null {
  if (typeof value === "string" && value.trim().endsWith("%")) {
    return parsePercentNumber(value);
  }

  return parseNumber(value);
}

export function parsePercentNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(/%$/, ""));
    return Number.isFinite(parsed) ? parsed / 100 : null;
  }

  const parsed = parseNumber(value);
  return parsed === null ? null : parsed / 100;
}

export function parsePercentageRatio(value: unknown): number | null {
  if (typeof value === "string" && value.trim().endsWith("%")) {
    return parsePercentNumber(value);
  }

  const parsed = parseNumber(value);
  return parsed === null ? null : parsed / 100;
}

export function trimLeadingFlatReturnCurvePoints(
  points: readonly CopyTradingReturnCurvePoint[],
): CopyTradingReturnCurvePoint[] {
  let startIndex = 0;
  while (startIndex < points.length && points[startIndex]?.value === 0) {
    startIndex += 1;
  }

  return startIndex === 0 ? [...points] : points.slice(startIndex);
}

export function adaptListSignalSourceMetricPnlCurve(
  points: readonly SignalCenterReturnCurvePoint[],
): SignalCenterReturnCurvePoint[] {
  return points.flatMap((point) => {
    const timestamp = readSignalCenterReturnCurveTimestamp(point);
    const value = readSignalCenterPnlCurveValue(point);
    if (timestamp === null || value === null) {
      return [];
    }

    return [{ timestamp, value }];
  });
}

export function adaptListSignalSourceMetricReturnCurve(
  points: readonly SignalCenterReturnCurvePoint[],
): SignalCenterReturnCurvePoint[] {
  return points.flatMap((point) => {
    const timestamp = readSignalCenterReturnCurveTimestamp(point);
    const value = parsePercentageRatio(
      point.value
        ?? point.roi
        ?? point.returnPercent
        ?? point.return_percent
        ?? point.roiPercent
        ?? point.roi_percent,
    );
    if (timestamp === null || value === null) {
      return [];
    }

    return [{ timestamp, value }];
  });
}

export function adaptSignalCenterPnlCurvePointList(
  points: readonly SignalCenterReturnCurvePoint[],
): CopyTradingReturnCurvePoint[] {
  return trimLeadingFlatReturnCurvePoints(points
    .flatMap((point) => {
      const timestamp = readSignalCenterReturnCurveTimestamp(point);
      const value = readSignalCenterPnlCurveValue(point);
      if (timestamp === null || value === null) {
        return [];
      }

      return [{ timestamp, value }];
    })
    .sort((left, right) => left.timestamp - right.timestamp));
}

export function adaptSignalCenterReturnCurvePointList(
  points: readonly SignalCenterReturnCurvePoint[],
): CopyTradingReturnCurvePoint[] {
  return points
    .flatMap((point) => {
      const timestamp = readSignalCenterReturnCurveTimestamp(point);
      const value = readSignalCenterReturnCurveValue(point);
      if (timestamp === null || value === null) {
        return [];
      }

      return [{ timestamp, value }];
    })
    .sort((left, right) => left.timestamp - right.timestamp);
}
