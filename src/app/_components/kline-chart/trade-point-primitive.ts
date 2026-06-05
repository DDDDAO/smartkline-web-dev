import type {
  IChartApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  PrimitiveHoveredItem,
  SeriesAttachedParameter,
  Time,
} from "lightweight-charts";
import type { ChartTheme } from "@/app/_components/kline-chart";
import type { MarketCandle } from "@/app/_types/market";

const TRADE_POINT_MARKER_WIDTH = 20;
const TRADE_POINT_MARKER_HEIGHT = 18;
const TRADE_POINT_ACTIVE_MARKER_WIDTH = 23;
const TRADE_POINT_ACTIVE_MARKER_HEIGHT = 20;
const TRADE_POINT_EDGE_PADDING = 18;
const TRADE_POINT_CANDLE_GAP = 7;
const TRADE_POINT_POINTER_SIZE = 5;
const TRADE_POINT_STACK_GAP = 24;
const HOVER_OBJECT_ID_PREFIX = "kline-trade-point:";

type DrawnTradePoint = {
  height: number;
  id: string;
  isActive: boolean;
  label: "B" | "S";
  side: "buy" | "sell";
  title: string;
  width: number;
  x: number;
  y: number;
};

export type KlineTradePointMarker = {
  id: string;
  label: "B" | "S";
  price: number;
  side: "buy" | "sell";
  signalId: string;
  sourceTimeMs: number;
  title: string;
};

type TradePointPrimitiveOptions = {
  activeSignalId: string | null;
  candles: readonly MarketCandle[];
  markers: readonly KlineTradePointMarker[];
  theme: ChartTheme;
};

type TradePointPrimitiveDrawingState = {
  items: readonly DrawnTradePoint[];
  theme: ChartTheme;
};

type AttachedContext = {
  chart: IChartApi;
  requestUpdate: () => void;
  series: ISeriesApi<"Candlestick", Time>;
};

/**
 * The trade point overlay draws Binance-style B/S execution flags near the
 * candle high or low. Keeping the marker anchored to the candle body prevents
 * avatars or exact-price bubbles from hiding the wick at dense zoom levels.
 */
export class TradePointPrimitive implements ISeriesPrimitive<Time> {
  private readonly paneView = new TradePointPaneView();
  private readonly paneViewList: readonly IPrimitivePaneView[] = [this.paneView];
  private attachedContext: AttachedContext | null = null;
  private options: TradePointPrimitiveOptions = {
    activeSignalId: null,
    candles: [],
    markers: [],
    theme: "light",
  };

  applyOptions(options: TradePointPrimitiveOptions) {
    this.options = options;
    this.updateAllViews();
    this.attachedContext?.requestUpdate();
  }

  attached({ chart, requestUpdate, series }: SeriesAttachedParameter<Time>) {
    this.attachedContext = {
      chart,
      requestUpdate,
      series: series as ISeriesApi<"Candlestick", Time>,
    };
    this.updateAllViews();
  }

  detached() {
    this.attachedContext = null;
    this.paneView.update({ items: [], theme: this.options.theme });
  }

  updateAllViews() {
    this.paneView.update(createTradePointDrawingState({
      activeSignalId: this.options.activeSignalId,
      candles: this.options.candles,
      context: this.attachedContext,
      markers: this.options.markers,
      theme: this.options.theme,
    }));
  }

  hitTest(x: number, y: number): PrimitiveHoveredItem | null {
    return this.paneView.hitTest(x, y);
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return this.paneViewList;
  }
}

export function toTradePointHoverObjectId(markerId: string): string {
  return `${HOVER_OBJECT_ID_PREFIX}${markerId}`;
}

export function readTradePointMarkerId(value: unknown): string | null {
  return typeof value === "string" && value.startsWith(HOVER_OBJECT_ID_PREFIX)
    ? value.slice(HOVER_OBJECT_ID_PREFIX.length)
    : null;
}

class TradePointPaneView implements IPrimitivePaneView {
  private readonly rendererInstance = new TradePointRenderer();
  private items: readonly DrawnTradePoint[] = [];

  renderer(): IPrimitivePaneRenderer {
    return this.rendererInstance;
  }

  update(state: TradePointPrimitiveDrawingState) {
    this.items = state.items;
    this.rendererInstance.update(state);
  }

  hitTest(x: number, y: number): PrimitiveHoveredItem | null {
    const item = [...this.items].reverse().find((candidate) => {
      return Math.abs(x - candidate.x) <= candidate.width / 2 + 4
        && Math.abs(y - candidate.y) <= candidate.height / 2 + TRADE_POINT_POINTER_SIZE + 4;
    });

    if (!item) {
      return null;
    }

    return {
      externalId: toTradePointHoverObjectId(item.id),
      cursorStyle: "pointer",
      zOrder: "top",
    };
  }

  zOrder() {
    return "top" as const;
  }
}

class TradePointRenderer implements IPrimitivePaneRenderer {
  private state: TradePointPrimitiveDrawingState = { items: [], theme: "light" };

  draw(target: Parameters<IPrimitivePaneRenderer["draw"]>[0]) {
    target.useBitmapCoordinateSpace((scope) => {
      const ctx = scope.context;
      const pixelRatio = Math.max(scope.horizontalPixelRatio, scope.verticalPixelRatio);
      const horizontalPixelRatio = scope.horizontalPixelRatio;
      const verticalPixelRatio = scope.verticalPixelRatio;

      ctx.save();
      for (const item of this.state.items) {
        drawTradePoint(ctx, {
          item,
          pixelRatio,
          theme: this.state.theme,
          x: item.x * horizontalPixelRatio,
          y: item.y * verticalPixelRatio,
        });
      }
      ctx.restore();
    });
  }

  update(state: TradePointPrimitiveDrawingState) {
    this.state = state;
  }
}

function createTradePointDrawingState(input: {
  activeSignalId: string | null;
  candles: readonly MarketCandle[];
  context: AttachedContext | null;
  markers: readonly KlineTradePointMarker[];
  theme: ChartTheme;
}): TradePointPrimitiveDrawingState {
  const { activeSignalId, candles, context, markers, theme } = input;
  if (!context || candles.length === 0 || markers.length === 0) {
    return { items: [], theme };
  }

  const paneSize = context.chart.paneSize(0);
  const stackIndexes = new Map<string, number>();

  const items = markers.flatMap((marker) => {
    const anchorCandle = findContainingCandle(candles, marker.sourceTimeMs);
    if (!anchorCandle) {
      return [];
    }

    const x = resolveEventTimeCoordinate(context.chart, candles, marker.sourceTimeMs);
    const boundaryPrice = marker.side === "buy" ? anchorCandle.low : anchorCandle.high;
    const candleBoundaryY = context.series.priceToCoordinate(boundaryPrice);
    if (x === null || candleBoundaryY === null) {
      return [];
    }

    const normalizedX = Number(x);
    if (normalizedX < -TRADE_POINT_EDGE_PADDING || normalizedX > paneSize.width + TRADE_POINT_EDGE_PADDING) {
      return [];
    }

    const stackKey = `${Math.round(normalizedX)}:${marker.side}`;
    const stackIndex = stackIndexes.get(stackKey) ?? 0;
    stackIndexes.set(stackKey, stackIndex + 1);
    const isActive = marker.signalId === activeSignalId;
    const width = isActive ? TRADE_POINT_ACTIVE_MARKER_WIDTH : TRADE_POINT_MARKER_WIDTH;
    const height = isActive ? TRADE_POINT_ACTIVE_MARKER_HEIGHT : TRADE_POINT_MARKER_HEIGHT;

    return [{
      height,
      id: marker.id,
      isActive,
      label: marker.label,
      side: marker.side,
      title: marker.title,
      width,
      x: normalizedX,
      y: clampPointY(
        Number(candleBoundaryY) + createStackOffset(marker.side, stackIndex, height),
        paneSize.height,
        height,
      ),
    }];
  });

  return { items, theme };
}

function drawTradePoint(ctx: CanvasRenderingContext2D, input: {
  item: DrawnTradePoint;
  pixelRatio: number;
  theme: ChartTheme;
  x: number;
  y: number;
}) {
  const { item, pixelRatio, theme, x, y } = input;
  const colors = getTradePointColors(item.side, theme);
  const width = item.width * pixelRatio;
  const height = item.height * pixelRatio;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const pointerSize = TRADE_POINT_POINTER_SIZE * pixelRatio;
  const radius = 4 * pixelRatio;
  const top = y - halfHeight;
  const bottom = y + halfHeight;

  ctx.save();
  if (item.isActive) {
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 10 * pixelRatio;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  drawMarkerPointer(ctx, item.side, x, top, bottom, pointerSize, colors.background, colors.border, pixelRatio);
  ctx.beginPath();
  ctx.fillStyle = colors.background;
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = item.isActive ? 1.6 * pixelRatio : 1.2 * pixelRatio;
  roundRect(ctx, x - halfWidth, top, width, height, radius);
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = "transparent";
  drawMarkerLabel(ctx, item.label, x, y, colors.text, pixelRatio, item.isActive);
  ctx.restore();
}

function drawMarkerPointer(
  ctx: CanvasRenderingContext2D,
  side: "buy" | "sell",
  x: number,
  top: number,
  bottom: number,
  pointerSize: number,
  fill: string,
  stroke: string,
  pixelRatio: number,
) {
  ctx.beginPath();
  if (side === "buy") {
    ctx.moveTo(x - pointerSize, top);
    ctx.lineTo(x + pointerSize, top);
    ctx.lineTo(x, top - pointerSize);
  } else {
    ctx.moveTo(x - pointerSize, bottom);
    ctx.lineTo(x + pointerSize, bottom);
    ctx.lineTo(x, bottom + pointerSize);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.2 * pixelRatio;
  ctx.fill();
  ctx.stroke();
}

function drawMarkerLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  color: string,
  pixelRatio: number,
  isActive: boolean,
) {
  ctx.fillStyle = color;
  ctx.font = `${isActive ? 900 : 800} ${isActive ? 13 * pixelRatio : 12 * pixelRatio}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y + 0.3 * pixelRatio);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function findContainingCandle(candles: readonly MarketCandle[], sourceTimeMs: number): MarketCandle | null {
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

function resolveEventTimeCoordinate(context: IChartApi, candles: readonly MarketCandle[], sourceTimeMs: number): number | null {
  if (!Number.isFinite(sourceTimeMs) || candles.length === 0) {
    return null;
  }

  const firstCandle = candles[0];
  const lastCandle = candles.at(-1);
  if (!firstCandle || !lastCandle) {
    return null;
  }

  if (sourceTimeMs <= firstCandle.sourceTimeMs) {
    return toNumberCoordinate(context.timeScale().timeToCoordinate(firstCandle.time));
  }

  const firstIndexAtOrAfter = findFirstCandleIndexAtOrAfter(candles, sourceTimeMs);
  const rightCandle = candles[firstIndexAtOrAfter];
  const leftCandle = rightCandle && rightCandle.sourceTimeMs >= sourceTimeMs
    ? candles[firstIndexAtOrAfter - 1]
    : lastCandle;

  if (!leftCandle) {
    return toNumberCoordinate(context.timeScale().timeToCoordinate(rightCandle?.time ?? firstCandle.time));
  }

  const leftCoordinate = toNumberCoordinate(context.timeScale().timeToCoordinate(leftCandle.time));
  if (leftCoordinate === null) {
    return null;
  }

  if (!rightCandle || rightCandle.sourceTimeMs < sourceTimeMs) {
    const previousCandle = candles[candles.length - 2];
    const previousCoordinate = previousCandle ? toNumberCoordinate(context.timeScale().timeToCoordinate(previousCandle.time)) : null;
    if (!previousCandle || previousCoordinate === null) {
      return leftCoordinate;
    }

    const timeSpanMs = leftCandle.sourceTimeMs - previousCandle.sourceTimeMs;
    if (timeSpanMs <= 0) {
      return leftCoordinate;
    }

    return leftCoordinate + (leftCoordinate - previousCoordinate) * ((sourceTimeMs - leftCandle.sourceTimeMs) / timeSpanMs);
  }

  const rightCoordinate = toNumberCoordinate(context.timeScale().timeToCoordinate(rightCandle.time));
  if (rightCoordinate === null) {
    return null;
  }

  const timeSpanMs = rightCandle.sourceTimeMs - leftCandle.sourceTimeMs;
  if (timeSpanMs <= 0) {
    return leftCoordinate;
  }

  return leftCoordinate + (rightCoordinate - leftCoordinate) * ((sourceTimeMs - leftCandle.sourceTimeMs) / timeSpanMs);
}

function findFirstCandleIndexAtOrAfter(candles: readonly MarketCandle[], sourceTimeMs: number): number {
  let low = 0;
  let high = candles.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (candles[middle].sourceTimeMs < sourceTimeMs) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
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

function getTradePointColors(side: "buy" | "sell", theme: ChartTheme) {
  const isBuy = side === "buy";

  if (theme === "dark") {
    return {
      background: isBuy ? "#16a34a" : "#dc2626",
      border: isBuy ? "#22c55e" : "#ef4444",
      glow: isBuy ? "rgba(34, 197, 94, 0.45)" : "rgba(239, 68, 68, 0.45)",
      text: "#ffffff",
    };
  }

  return {
    background: isBuy ? "#16a34a" : "#dc2626",
    border: isBuy ? "#15803d" : "#b91c1c",
    glow: isBuy ? "rgba(22, 163, 74, 0.32)" : "rgba(220, 38, 38, 0.30)",
    text: "#ffffff",
  };
}
