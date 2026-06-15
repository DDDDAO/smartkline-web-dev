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
import type { ChartTheme } from "@/app/_components/kline-chart/types";
import type { CopyTradingDirection, CopyTradingEventType } from "@/app/_types/copy-trading";
import type { MarketCandle, MarketSymbol } from "@/app/_types/market";

const TRADE_POINT_MARKER_DIAMETER = 25;
const TRADE_POINT_ACTIVE_MARKER_DIAMETER = 29;
const TRADE_POINT_EDGE_PADDING = 18;
const TRADE_POINT_CANDLE_GAP = 7;
const TRADE_POINT_POINTER_SIZE = 5;
const TRADE_POINT_STACK_GAP = 30;
const TRADE_POINT_TEXT_MARKER_HEIGHT = 24;
const TRADE_POINT_TEXT_MARKER_PADDING_X = 9;
const TRADE_POINT_VISIBLE_RANGE_PADDING_BARS = 24;
const TRADE_POINT_MAX_MARKERS_PER_CANDLE_SIDE = 4;
const TRADE_POINT_MAX_VISIBLE_MARKERS = 360;
const HOVER_OBJECT_ID_PREFIX = "kline-trade-point:";

type DrawnTradePoint = {
  actionLabel?: string;
  avatarImage: HTMLImageElement | null;
  avatarUrl: string | null;
  detail?: string;
  direction?: CopyTradingDirection;
  eventType?: CopyTradingEventType;
  id: string;
  initials: string;
  isActive: boolean;
  occurredAtText?: string;
  priceText?: string | null;
  side: "buy" | "sell";
  signalId: string;
  textMarkerLabel: string | null;
  title: string;
  traderName?: string;
  width: number;
  height: number;
  x: number;
  y: number;
};

export type KlineTradePointMarker = {
  actionLabel?: string;
  avatarUrl?: string | null;
  detail?: string;
  direction?: CopyTradingDirection;
  eventType?: CopyTradingEventType;
  id: string;
  occurredAtText?: string;
  price: number | null;
  priceText?: string | null;
  side: "buy" | "sell";
  signalId: string;
  sourceTimeMs: number;
  symbol?: MarketSymbol;
  title: string;
  traderName?: string;
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

type CachedAvatarImage = {
  image: HTMLImageElement | null;
  status: "error" | "loading" | "ready";
};

type TradePointCandleCoordinates = {
  buyBoundaryY: number;
  sellBoundaryY: number;
  x: number;
};

/**
 * Source-owned trade points stay as avatar markers. User-owned strategy history
 * orders can opt into plain BUY/SELL labels by omitting the avatar and passing a
 * BUY/SELL action label, matching the KOL signal entry/exit marker language.
 */
export class TradePointPrimitive implements ISeriesPrimitive<Time> {
  private readonly avatarImages = new TradePointAvatarImageCache();
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

  refresh() {
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
      avatarImages: this.avatarImages,
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

class TradePointAvatarImageCache {
  private readonly images = new Map<string, CachedAvatarImage>();

  getImage(url: string | null | undefined, requestUpdate: (() => void) | undefined): HTMLImageElement | null {
    if (!url) {
      return null;
    }

    const cachedImage = this.images.get(url);
    if (cachedImage) {
      return cachedImage.status === "ready" ? cachedImage.image : null;
    }

    const image = new Image();
    this.images.set(url, { image, status: "loading" });
    image.decoding = "async";
    image.onload = () => {
      this.images.set(url, { image, status: "ready" });
      requestUpdate?.();
    };
    image.onerror = () => {
      this.images.set(url, { image: null, status: "error" });
      requestUpdate?.();
    };
    image.src = url;
    return null;
  }
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
    let item: DrawnTradePoint | null = null;
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      const candidate = this.items[index];
      if (candidate && Math.hypot(x - candidate.x, y - candidate.y) <= candidate.width / 2 + TRADE_POINT_POINTER_SIZE + 5) {
        item = candidate;
        break;
      }
    }

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

    const stackKey = `${anchorCandle.sourceTimeMs}:${marker.side}`;
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
  if (cache.has(candle.sourceTimeMs)) {
    return cache.get(candle.sourceTimeMs) ?? null;
  }

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
  cache.set(candle.sourceTimeMs, coordinates);
  return coordinates;
}

function selectVisibleTradeMarkers(
  markers: readonly KlineTradePointMarker[],
  visibleSourceTimeRange: { fromMs: number; toMs: number } | null,
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

function drawTradePoint(ctx: CanvasRenderingContext2D, input: {
  item: DrawnTradePoint;
  pixelRatio: number;
  theme: ChartTheme;
  x: number;
  y: number;
}) {
  const { item, pixelRatio, theme, x, y } = input;
  const colors = item.textMarkerLabel
    ? getTradePointTextMarkerColors(item.side, theme)
    : getTradePointColors(item.side, theme);
  const markerHeight = item.height * pixelRatio;
  const radius = markerHeight / 2;
  const pointerSize = TRADE_POINT_POINTER_SIZE * pixelRatio;

  ctx.save();
  if (item.isActive) {
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12 * pixelRatio;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  drawMarkerPointer(ctx, item.side, x, y, radius, pointerSize, colors.border, pixelRatio);
  if (item.textMarkerLabel) {
    drawTextMarkerBadge(ctx, { colors, item, pixelRatio, radius, x, y });
  } else {
    drawAvatarCircle(ctx, {
      colors,
      item,
      pixelRatio,
      radius,
      theme,
      x,
      y,
    });
  }
  ctx.restore();
}

function drawTextMarkerBadge(ctx: CanvasRenderingContext2D, input: {
  colors: ReturnType<typeof getTradePointColors>;
  item: DrawnTradePoint;
  pixelRatio: number;
  radius: number;
  x: number;
  y: number;
}) {
  const { colors, item, pixelRatio, radius, x, y } = input;
  const width = item.width * pixelRatio;
  const height = item.height * pixelRatio;
  const left = x - width / 2;
  const top = y - height / 2;
  const borderRadius = radius;
  const label = item.textMarkerLabel ?? item.initials;

  ctx.beginPath();
  ctx.roundRect(left, top, width, height, borderRadius);
  ctx.fillStyle = colors.border;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = Math.max(1, 1.2 * pixelRatio);
  ctx.strokeStyle = colors.innerRing;
  ctx.stroke();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `900 ${Math.max(10, 11 * pixelRatio)}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y + 0.4 * pixelRatio);
}

function drawAvatarCircle(ctx: CanvasRenderingContext2D, input: {
  colors: ReturnType<typeof getTradePointColors>;
  item: DrawnTradePoint;
  pixelRatio: number;
  radius: number;
  theme: ChartTheme;
  x: number;
  y: number;
}) {
  const { colors, item, pixelRatio, radius, theme, x, y } = input;
  const borderWidth = (item.isActive ? 3 : 2.2) * pixelRatio;
  const innerRadius = Math.max(1, radius - borderWidth);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = colors.surface;
  ctx.fill();
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = colors.border;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
  ctx.clip();

  if (item.avatarImage?.complete && item.avatarImage.naturalWidth > 0) {
    drawCoverImage(ctx, item.avatarImage, x - innerRadius, y - innerRadius, innerRadius * 2, innerRadius * 2);
  } else {
    const fallbackGradient = ctx.createLinearGradient(x - innerRadius, y - innerRadius, x + innerRadius, y + innerRadius);
    const fallbackColors = getAvatarFallbackColors(item.traderName ?? item.title, theme);
    fallbackGradient.addColorStop(0, fallbackColors[0]);
    fallbackGradient.addColorStop(1, fallbackColors[1]);
    ctx.fillStyle = fallbackGradient;
    ctx.fillRect(x - innerRadius, y - innerRadius, innerRadius * 2, innerRadius * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `900 ${Math.max(9, 10.5 * pixelRatio)}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.initials, x, y + 0.4 * pixelRatio);
  }

  ctx.restore();

  ctx.shadowColor = "transparent";
  ctx.beginPath();
  ctx.arc(x, y, radius - borderWidth / 2, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, 0.7 * pixelRatio);
  ctx.strokeStyle = colors.innerRing;
  ctx.stroke();
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawMarkerPointer(
  ctx: CanvasRenderingContext2D,
  side: "buy" | "sell",
  x: number,
  y: number,
  radius: number,
  pointerSize: number,
  fill: string,
  pixelRatio: number,
) {
  ctx.beginPath();
  if (side === "buy") {
    const top = y - radius + 1 * pixelRatio;
    ctx.moveTo(x - pointerSize, top);
    ctx.lineTo(x + pointerSize, top);
    ctx.lineTo(x, top - pointerSize);
  } else {
    const bottom = y + radius - 1 * pixelRatio;
    ctx.moveTo(x - pointerSize, bottom);
    ctx.lineTo(x + pointerSize, bottom);
    ctx.lineTo(x, bottom + pointerSize);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function resolveVisibleSourceTimeRange(chart: IChartApi, candles: readonly MarketCandle[]): { fromMs: number; toMs: number } | null {
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

  return {
    fromMs: fromCandle.sourceTimeMs,
    toMs: toCandle.sourceTimeMs,
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

function resolveTradePointTextMarkerLabel(marker: KlineTradePointMarker): string | null {
  if (marker.avatarUrl) {
    return null;
  }

  const label = marker.actionLabel?.trim().toUpperCase();
  return label === "BUY" || label === "SELL" ? label : null;
}

function measureTradePointTextMarkerWidth(label: string, isActive: boolean): number {
  return label.length * 7 + TRADE_POINT_TEXT_MARKER_PADDING_X * 2 + (isActive ? 4 : 0);
}

function getMarkerInitials(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "S";
  }

  const characters = Array.from(trimmedValue.replace(/\s+/gu, ""));
  return (characters[0] ?? "S").toUpperCase();
}

function getAvatarFallbackColors(value: string, theme: ChartTheme): [string, string] {
  const palettes: Array<[string, string]> = theme === "dark"
    ? [
      ["#38bdf8", "#2563eb"],
      ["#22d3ee", "#7c3aed"],
      ["#34d399", "#0ea5e9"],
      ["#fb7185", "#7c3aed"],
      ["#f59e0b", "#ef4444"],
    ]
    : [
      ["#38bdf8", "#818cf8"],
      ["#60a5fa", "#22d3ee"],
      ["#93c5fd", "#a78bfa"],
      ["#67e8f9", "#0ea5e9"],
      ["#7dd3fc", "#c4b5fd"],
    ];

  return palettes[Math.abs(hashString(value)) % palettes.length] ?? palettes[0];
}

function hashString(value: string): number {
  return Array.from(value).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
}

function getTradePointColors(side: "buy" | "sell", theme: ChartTheme) {
  const isBuy = side === "buy";

  if (theme === "dark") {
    return {
      border: isBuy ? "#22c55e" : "#ef4444",
      glow: isBuy ? "rgba(34, 197, 94, 0.45)" : "rgba(239, 68, 68, 0.45)",
      innerRing: "rgba(255,255,255,0.28)",
      surface: "#181A20",
    };
  }

  return {
    border: isBuy ? "#16a34a" : "#dc2626",
    glow: isBuy ? "rgba(22, 163, 74, 0.32)" : "rgba(220, 38, 38, 0.30)",
    innerRing: "rgba(255,255,255,0.78)",
    surface: "#FFFFFF",
  };
}

function getTradePointTextMarkerColors(side: "buy" | "sell", theme: ChartTheme) {
  const isBuy = side === "buy";
  const border = isBuy ? "#2FBD85" : "#F6465D";

  return {
    border,
    glow: isBuy
      ? theme === "dark" ? "rgba(47, 189, 133, 0.38)" : "rgba(47, 189, 133, 0.28)"
      : theme === "dark" ? "rgba(246, 70, 93, 0.38)" : "rgba(246, 70, 93, 0.28)",
    innerRing: "rgba(255,255,255,0.82)",
    surface: "#FFFFFF",
  };
}
