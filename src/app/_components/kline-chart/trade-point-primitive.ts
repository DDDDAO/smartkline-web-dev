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

const TRADE_POINT_RADIUS = 12;
const TRADE_POINT_ACTIVE_RADIUS = 15;
const TRADE_POINT_EDGE_PADDING = 18;
const TRADE_POINT_STACK_GAP = 26;
const HOVER_OBJECT_ID_PREFIX = "kline-trade-point:";

type AvatarCacheEntry = {
  image: HTMLImageElement | null;
  status: "error" | "loading" | "ready";
};

type DrawnTradePoint = {
  avatarUrl: string | null;
  fallbackLabel: string;
  id: string;
  isActive: boolean;
  label: "B" | "S";
  radius: number;
  side: "buy" | "sell";
  title: string;
  x: number;
  y: number;
};

export type KlineTradePointMarker = {
  avatarUrl: string | null;
  id: string;
  label: "B" | "S";
  price: number;
  side: "buy" | "sell";
  signalId: string;
  sourceTimeMs: number;
  title: string;
  traderName: string;
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
 * The trade point overlay follows AlphaFox's market chart approach: draw the
 * signal source avatar at the exact price/time coordinate instead of using
 * axis-only price lines. This keeps buy/sell evidence visible while the user
 * pans or zooms the chart.
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
    this.paneView.setRequestUpdate(requestUpdate);
    this.updateAllViews();
  }

  detached() {
    this.attachedContext = null;
    this.paneView.setRequestUpdate(null);
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

  setRequestUpdate(requestUpdate: (() => void) | null) {
    this.rendererInstance.setRequestUpdate(requestUpdate);
  }

  hitTest(x: number, y: number): PrimitiveHoveredItem | null {
    const item = [...this.items].reverse().find((candidate) => {
      const distance = Math.hypot(x - candidate.x, y - candidate.y);
      return distance <= candidate.radius + 4;
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
  private avatarCache = new Map<string, AvatarCacheEntry>();
  private requestUpdate: (() => void) | null = null;
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
          requestAvatarUpdate: () => this.requestUpdate?.(),
          theme: this.state.theme,
          x: item.x * horizontalPixelRatio,
          y: item.y * verticalPixelRatio,
          avatarCache: this.avatarCache,
        });
      }
      ctx.restore();
    });
  }

  update(state: TradePointPrimitiveDrawingState) {
    this.state = state;
  }

  setRequestUpdate(requestUpdate: (() => void) | null) {
    this.requestUpdate = requestUpdate;
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
    const nearestCandle = findNearestCandle(candles, marker.sourceTimeMs);
    if (!nearestCandle) {
      return [];
    }

    const x = context.chart.timeScale().timeToCoordinate(nearestCandle.time);
    const priceY = context.series.priceToCoordinate(marker.price);
    if (x === null || priceY === null) {
      return [];
    }

    const normalizedX = Number(x);
    if (normalizedX < -TRADE_POINT_EDGE_PADDING || normalizedX > paneSize.width + TRADE_POINT_EDGE_PADDING) {
      return [];
    }

    const stackKey = `${nearestCandle.sourceTimeMs}:${marker.side}`;
    const stackIndex = stackIndexes.get(stackKey) ?? 0;
    stackIndexes.set(stackKey, stackIndex + 1);
    const radius = marker.signalId === activeSignalId ? TRADE_POINT_ACTIVE_RADIUS : TRADE_POINT_RADIUS;

    return [{
      avatarUrl: marker.avatarUrl,
      fallbackLabel: createFallbackLabel(marker.traderName),
      id: marker.id,
      isActive: marker.signalId === activeSignalId,
      label: marker.label,
      radius,
      side: marker.side,
      title: marker.title,
      x: normalizedX,
      y: clampPointY(Number(priceY) + createStackOffset(marker.side, stackIndex), paneSize.height, radius),
    }];
  });

  return { items, theme };
}

function drawTradePoint(ctx: CanvasRenderingContext2D, input: {
  avatarCache: Map<string, AvatarCacheEntry>;
  item: DrawnTradePoint;
  pixelRatio: number;
  requestAvatarUpdate: () => void;
  theme: ChartTheme;
  x: number;
  y: number;
}) {
  const { avatarCache, item, pixelRatio, requestAvatarUpdate, theme, x, y } = input;
  const radius = item.radius * pixelRatio;
  const colors = getTradePointColors(item.side, theme);

  ctx.save();
  if (item.isActive) {
    ctx.beginPath();
    ctx.fillStyle = colors.glow;
    ctx.arc(x, y, radius + 7 * pixelRatio, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.fillStyle = colors.background;
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = item.isActive ? 3 * pixelRatio : 2 * pixelRatio;
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const image = readAvatarImage(avatarCache, item.avatarUrl, requestAvatarUpdate);
  if (image?.complete && image.naturalWidth > 0) {
    drawAvatar(ctx, image, x, y, radius - 2 * pixelRatio);
  } else {
    drawFallbackText(ctx, item.fallbackLabel, x, y, colors.text, pixelRatio, item.isActive);
  }

  drawSideBadge(ctx, item.label, x, y, radius, pixelRatio, colors.side);
  ctx.restore();
}

function drawAvatar(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, radius: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  const diameter = radius * 2;
  ctx.drawImage(image, x - radius, y - radius, diameter, diameter);
  ctx.restore();
}

function drawFallbackText(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  color: string,
  pixelRatio: number,
  isActive: boolean,
) {
  ctx.fillStyle = color;
  ctx.font = `${isActive ? 800 : 700} ${isActive ? 12 * pixelRatio : 11 * pixelRatio}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y + 0.5 * pixelRatio);
}

function drawSideBadge(
  ctx: CanvasRenderingContext2D,
  label: "B" | "S",
  x: number,
  y: number,
  radius: number,
  pixelRatio: number,
  color: string,
) {
  const badgeRadius = 6.5 * pixelRatio;
  const badgeX = x + radius * 0.66;
  const badgeY = y + radius * 0.66;

  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5 * pixelRatio;
  ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${7.5 * pixelRatio}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, badgeX, badgeY + 0.4 * pixelRatio);
}

function readAvatarImage(
  avatarCache: Map<string, AvatarCacheEntry>,
  avatarUrl: string | null,
  requestUpdate: () => void,
): HTMLImageElement | null {
  if (!avatarUrl || typeof Image === "undefined") {
    return null;
  }

  const cached = avatarCache.get(avatarUrl);
  if (cached) {
    return cached.status === "error" ? null : cached.image;
  }

  const image = new Image();
  image.onload = () => {
    avatarCache.set(avatarUrl, { image, status: "ready" });
    requestUpdate();
  };
  image.onerror = () => {
    avatarCache.set(avatarUrl, { image: null, status: "error" });
    requestUpdate();
  };
  image.src = avatarUrl;
  avatarCache.set(avatarUrl, { image, status: "loading" });
  return image;
}

function findNearestCandle(candles: readonly MarketCandle[], sourceTimeMs: number): MarketCandle | null {
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

  const left = candles[Math.max(0, high)];
  const right = candles[Math.min(candles.length - 1, low)];
  if (!left) {
    return right ?? null;
  }
  if (!right) {
    return left;
  }

  return Math.abs(left.sourceTimeMs - sourceTimeMs) <= Math.abs(right.sourceTimeMs - sourceTimeMs) ? left : right;
}

function createStackOffset(side: "buy" | "sell", stackIndex: number): number {
  if (stackIndex === 0) {
    return 0;
  }

  return side === "buy" ? stackIndex * TRADE_POINT_STACK_GAP : stackIndex * -TRADE_POINT_STACK_GAP;
}

function clampPointY(y: number, paneHeight: number, radius: number): number {
  const minY = radius + 6;
  const maxY = Math.max(minY, paneHeight - radius - 6);
  return Math.min(Math.max(y, minY), maxY);
}

function createFallbackLabel(value: string): string {
  return value.trim().slice(0, 1).toUpperCase() || "T";
}

function getTradePointColors(side: "buy" | "sell", theme: ChartTheme) {
  const isBuy = side === "buy";

  if (theme === "dark") {
    return {
      background: isBuy ? "rgba(5, 46, 22, 0.98)" : "rgba(69, 10, 10, 0.98)",
      border: isBuy ? "#22c55e" : "#f87171",
      glow: isBuy ? "rgba(34, 197, 94, 0.22)" : "rgba(248, 113, 113, 0.22)",
      side: isBuy ? "#16a34a" : "#dc2626",
      text: isBuy ? "#bbf7d0" : "#fecaca",
    };
  }

  return {
    background: isBuy ? "rgba(240, 253, 244, 0.99)" : "rgba(254, 242, 242, 0.99)",
    border: isBuy ? "#16a34a" : "#dc2626",
    glow: isBuy ? "rgba(34, 197, 94, 0.22)" : "rgba(220, 38, 38, 0.20)",
    side: isBuy ? "#16a34a" : "#dc2626",
    text: isBuy ? "#166534" : "#991b1b",
  };
}
