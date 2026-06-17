import type { IChartApi } from "lightweight-charts";
import type { ChartTheme } from "@/app/_components/kline-chart/types";
import type { MarketCandle } from "@/app/_types/market";
import { TradePointAvatarImageCache } from "./avatar-cache";
import {
  TRADE_POINT_ACTIVE_MARKER_DIAMETER,
  TRADE_POINT_CANDLE_GAP,
  TRADE_POINT_EDGE_PADDING,
  TRADE_POINT_MARKER_DIAMETER,
  TRADE_POINT_MAX_MARKERS_PER_CANDLE_SIDE,
  TRADE_POINT_MAX_VISIBLE_MARKERS,
  TRADE_POINT_POINTER_SIZE,
  TRADE_POINT_STACK_GAP,
  TRADE_POINT_TEXT_MARKER_HEIGHT,
  TRADE_POINT_VISIBLE_RANGE_PADDING_BARS,
} from "./constants";
import {
  getMarkerInitials,
  measureTradePointTextMarkerWidth,
  resolveTradePointTextMarkerLabel,
} from "./style";
import type {
  AttachedContext,
  DrawnTradePoint,
  KlineTradePointMarker,
  TradePointCandleCoordinates,
  TradePointPrimitiveDrawingState,
  VisibleTradeMarkerTimeRange,
} from "./types";

export function createTradePointDrawingState(input: {
  activeSignalId: string | null;
  avatarImages: TradePointAvatarImageCache;
  candles: readonly MarketCandle[];
  context: AttachedContext | null;
  markers: readonly KlineTradePointMarker[];
  theme: ChartTheme;
}): TradePointPrimitiveDrawingState {
  const { activeSignalId, avatarImages, candles, context, markers, theme } = input;
  if (!context || candles.length === 0 || markers.length === 0) {
    return { items: [], theme };
  }

  const paneSize = context.chart.paneSize(0);
  const stackIndexes = new Map<string, number>();
  const anchorCandlesByMarkerTime = new Map<number, MarketCandle | null>();
  const coordinatesByCandleTime = new Map<number, TradePointCandleCoordinates | null>();
  const visibleSourceTimeRange = resolveVisibleSourceTimeRange(context.chart, candles);
  const visibleMarkers = selectVisibleTradeMarkers(markers, visibleSourceTimeRange);
  const items: DrawnTradePoint[] = [];
  let visibleMarkerCount = 0;

  /**
   * Signal Center can return thousands of trade events. The chart is only
   * readable with a bounded number of visible avatar points, so we keep the
   * latest points near each candle and avoid doing image/canvas work for the
   * overflow. The full trade history remains available in the right panel.
   */
  for (let index = visibleMarkers.length - 1; index >= 0; index -= 1) {
    const marker = visibleMarkers[index];
    const isActive = marker.signalId === activeSignalId;
    if (!isActive && visibleMarkerCount >= TRADE_POINT_MAX_VISIBLE_MARKERS) {
      continue;
    }

    const anchorCandle = getCachedPrecedingCandle(anchorCandlesByMarkerTime, candles, marker.sourceTimeMs);
    if (!anchorCandle) {
      continue;
    }

    const coordinates = getCachedTradePointCandleCoordinates(coordinatesByCandleTime, context, anchorCandle);
    if (!coordinates) {
      continue;
    }

    const normalizedX = coordinates.x;
    if (normalizedX < -TRADE_POINT_EDGE_PADDING || normalizedX > paneSize.width + TRADE_POINT_EDGE_PADDING) {
      continue;
    }

    const stackKey = `${Math.round(normalizedX)}:${marker.side}`;
    const currentStackIndex = stackIndexes.get(stackKey) ?? 0;
    if (!isActive && currentStackIndex >= TRADE_POINT_MAX_MARKERS_PER_CANDLE_SIDE) {
      continue;
    }

    stackIndexes.set(stackKey, currentStackIndex + 1);
    const textMarkerLabel = resolveTradePointTextMarkerLabel(marker);
    const width = textMarkerLabel
      ? measureTradePointTextMarkerWidth(textMarkerLabel, isActive)
      : isActive ? TRADE_POINT_ACTIVE_MARKER_DIAMETER : TRADE_POINT_MARKER_DIAMETER;
    const height = textMarkerLabel
      ? TRADE_POINT_TEXT_MARKER_HEIGHT + (isActive ? 2 : 0)
      : width;
    const avatarUrl = marker.avatarUrl ?? null;
    const candleBoundaryY = marker.side === "buy" ? coordinates.buyBoundaryY : coordinates.sellBoundaryY;

    items.push({
      actionLabel: marker.actionLabel,
      avatarImage: avatarImages.getImage(avatarUrl, context.requestUpdate),
      avatarUrl,
      detail: marker.detail,
      direction: marker.direction,
      eventType: marker.eventType,
      id: marker.id,
      initials: getMarkerInitials(marker.traderName ?? marker.title),
      isActive,
      occurredAtText: marker.occurredAtText,
      priceText: marker.priceText,
      side: marker.side,
      signalId: marker.signalId,
      textMarkerLabel,
      title: marker.title,
      traderName: marker.traderName,
      width,
      height,
      x: normalizedX,
      y: clampPointY(
        candleBoundaryY + createStackOffset(marker.side, currentStackIndex, height),
        paneSize.height,
        height,
      ),
    });
    if (!isActive) {
      visibleMarkerCount += 1;
    }
  }

  items.reverse();
  return { items, theme };
}

function getCachedPrecedingCandle(
  cache: Map<number, MarketCandle | null>,
  candles: readonly MarketCandle[],
  sourceTimeMs: number,
): MarketCandle | null {
  if (cache.has(sourceTimeMs)) {
    return cache.get(sourceTimeMs) ?? null;
  }

  const candle = findPrecedingCandle(candles, sourceTimeMs);
  cache.set(sourceTimeMs, candle);
  return candle;
}

function getCachedTradePointCandleCoordinates(
  cache: Map<number, TradePointCandleCoordinates | null>,
  context: AttachedContext,
  candle: MarketCandle,
): TradePointCandleCoordinates | null {
  const cacheKey = candle.sourceTimeMs;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) ?? null;
  }

  /**
   * Trade markers are bucketed into the containing candle. On a 5m chart, a
   * 23-minute trade belongs to the 20-minute candle, so the marker must use the
   * candle open coordinate instead of interpolating toward the next 25-minute
   * bar. Interpolation pushes latest in-progress 5m/15m trades past the right
   * edge and makes them disappear.
   */
  const x = toNumberCoordinate(context.chart.timeScale().timeToCoordinate(candle.time));
  const buyBoundaryY = context.series.priceToCoordinate(candle.low);
  const sellBoundaryY = context.series.priceToCoordinate(candle.high);
  const coordinates = x === null || buyBoundaryY === null || sellBoundaryY === null
    ? null
    : {
      buyBoundaryY: Number(buyBoundaryY),
      sellBoundaryY: Number(sellBoundaryY),
      x,
    };
  cache.set(cacheKey, coordinates);
  return coordinates;
}

function selectVisibleTradeMarkers(
  markers: readonly KlineTradePointMarker[],
  visibleSourceTimeRange: VisibleTradeMarkerTimeRange | null,
): readonly KlineTradePointMarker[] {
  if (!visibleSourceTimeRange) {
    return markers;
  }

  if (visibleSourceTimeRange.fromMs > visibleSourceTimeRange.toMs || markers.length === 0) {
    return [];
  }

  const lastMarker = markers.at(-1);
  if (markers.length > 1 && lastMarker && markers[0].sourceTimeMs <= lastMarker.sourceTimeMs) {
    return markers.slice(
      lowerBoundTradeMarkerTime(markers, visibleSourceTimeRange.fromMs),
      upperBoundTradeMarkerTime(markers, visibleSourceTimeRange.toMs),
    );
  }

  return markers.filter((marker) => marker.sourceTimeMs >= visibleSourceTimeRange.fromMs && marker.sourceTimeMs <= visibleSourceTimeRange.toMs);
}

function lowerBoundTradeMarkerTime(markers: readonly KlineTradePointMarker[], sourceTimeMs: number): number {
  let low = 0;
  let high = markers.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (markers[middle].sourceTimeMs < sourceTimeMs) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}

function upperBoundTradeMarkerTime(markers: readonly KlineTradePointMarker[], sourceTimeMs: number): number {
  let low = 0;
  let high = markers.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (markers[middle].sourceTimeMs <= sourceTimeMs) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}

function resolveVisibleSourceTimeRange(chart: IChartApi, candles: readonly MarketCandle[]): VisibleTradeMarkerTimeRange | null {
  const visibleRange = chart.timeScale().getVisibleLogicalRange();
  if (!visibleRange) {
    return null;
  }

  const visibleFrom = Number(visibleRange.from);
  const visibleTo = Number(visibleRange.to);
  if (!Number.isFinite(visibleFrom) || !Number.isFinite(visibleTo)) {
    return null;
  }

  if (visibleTo < 0 || visibleFrom > candles.length - 1) {
    return { fromMs: 1, toMs: 0 };
  }

  const fromIndex = Math.max(0, Math.floor(visibleFrom) - TRADE_POINT_VISIBLE_RANGE_PADDING_BARS);
  const toIndex = Math.min(candles.length - 1, Math.ceil(visibleTo) + TRADE_POINT_VISIBLE_RANGE_PADDING_BARS);
  const fromCandle = candles[fromIndex];
  const toCandle = candles[toIndex];
  if (!fromCandle || !toCandle) {
    return null;
  }
  /**
   * A visible bar covers its whole candle interval, not just its open time.
   * Without the interval tail, recent trades inside the still-open 5m/15m bar
   * are filtered out even though the containing candle is visible.
   */
  const toIntervalMs = Math.max(1, inferCandleIntervalMs(candles, toIndex));

  return {
    fromMs: fromCandle.sourceTimeMs,
    toMs: toCandle.sourceTimeMs + toIntervalMs - 1,
  };
}

function findPrecedingCandle(candles: readonly MarketCandle[], sourceTimeMs: number): MarketCandle | null {
  if (!Number.isFinite(sourceTimeMs) || candles.length === 0) {
    return null;
  }

  let low = 0;
  let high = candles.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candle = candles[middle];
    if (!candle || candle.sourceTimeMs === sourceTimeMs) {
      return candle ?? null;
    }

    if (candle.sourceTimeMs < sourceTimeMs) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return candles[Math.max(0, high)] ?? candles[0] ?? null;
}

function inferCandleIntervalMs(candles: readonly MarketCandle[], index: number): number {
  const current = candles[index];
  if (!current) {
    return 0;
  }

  const next = candles[index + 1];
  if (next && next.sourceTimeMs > current.sourceTimeMs) {
    return next.sourceTimeMs - current.sourceTimeMs;
  }

  const previous = candles[index - 1];
  if (previous && current.sourceTimeMs > previous.sourceTimeMs) {
    return current.sourceTimeMs - previous.sourceTimeMs;
  }

  return 0;
}

function toNumberCoordinate(coordinate: number | null): number | null {
  return coordinate === null ? null : Number(coordinate);
}

function createStackOffset(side: "buy" | "sell", stackIndex: number, markerHeight: number): number {
  const baseOffset = TRADE_POINT_CANDLE_GAP + TRADE_POINT_POINTER_SIZE + markerHeight / 2;
  const stackedOffset = baseOffset + stackIndex * TRADE_POINT_STACK_GAP;
  return side === "buy" ? stackedOffset : -stackedOffset;
}

function clampPointY(y: number, paneHeight: number, markerHeight: number): number {
  const markerHalfHeight = markerHeight / 2 + TRADE_POINT_POINTER_SIZE;
  const minY = markerHalfHeight + 6;
  const maxY = Math.max(minY, paneHeight - markerHalfHeight - 6);
  return Math.min(Math.max(y, minY), maxY);
}
