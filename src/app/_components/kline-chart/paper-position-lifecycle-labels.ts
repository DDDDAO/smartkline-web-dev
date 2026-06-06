import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { getWorkspaceCopy, type WorkspaceLanguage } from "@/app/_lib/i18n";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { MarketCandle } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";
import type { ChartTheme } from "@/app/_components/kline-chart";

const LIFECYCLE_BADGE_RADIUS = 14;
const RIGHT_PRICE_SCALE_RESERVED_WIDTH = 118;
const HOLDING_RECTANGLE_MIN_HEIGHT = 28;
const HOLDING_RECTANGLE_VERTICAL_PADDING = 8;

type LifecycleTradeSide = "buy" | "sell";

type LifecyclePoint = {
  markerPoint: { x: number; y: number };
  pricePoint: { x: number; y: number };
  side: LifecycleTradeSide;
};

export function renderPaperPositionLifecycleLabels(input: {
  candles: readonly MarketCandle[];
  chart: IChartApi | null;
  overlay: HTMLDivElement | null;
  language: WorkspaceLanguage;
  paperPosition: PaperPositionRecord | null;
  series: ISeriesApi<"Candlestick"> | null;
  signal: StructuredSignal | null;
  theme: ChartTheme;
}): boolean {
  const { candles, chart, language, overlay, paperPosition, series, signal, theme } = input;
  if (!chart || !overlay || !paperPosition || !series || candles.length === 0) {
    overlay?.replaceChildren();
    return false;
  }

  if (signal && paperPosition.signalId !== signal.id) {
    overlay.replaceChildren();
    return false;
  }

  overlay.replaceChildren();
  let hasHiddenRightLifecyclePoint = false;

  const entryPoint = createEntryLifecyclePoint({ candles, chart, paperPosition, series, signal });
  const exitPoint = createExitLifecyclePoint({ candles, chart, paperPosition, series, signal });

  if (paperPosition.status === "exited" && entryPoint && exitPoint && isExitAfterEntry(paperPosition)) {
    overlay.appendChild(createHoldingRangeElement({ endPoint: exitPoint.pricePoint, overlay, startPoint: entryPoint.pricePoint, theme }));
  }

  for (const lifecyclePoint of [entryPoint, exitPoint]) {
    if (!lifecyclePoint) {
      continue;
    }

    if (isLifecyclePointInsideChartPane(lifecyclePoint.markerPoint, overlay)) {
      overlay.appendChild(createLifecycleBadge({ language, point: lifecyclePoint.markerPoint, side: lifecyclePoint.side, theme }));
    } else if (isLifecyclePointPastRightEdge(lifecyclePoint.markerPoint, overlay)) {
      hasHiddenRightLifecyclePoint = true;
    }
  }

  return hasHiddenRightLifecyclePoint;
}

function createEntryLifecyclePoint(input: {
  candles: readonly MarketCandle[];
  chart: IChartApi;
  paperPosition: PaperPositionRecord;
  series: ISeriesApi<"Candlestick">;
  signal: StructuredSignal | null;
}): LifecyclePoint | null {
  const { candles, chart, paperPosition, series, signal } = input;
  if (paperPosition.entryPrice === null || paperPosition.entryTimeMs === null) {
    return null;
  }

  const anchor = resolveChartAnchor({ candles, chart, price: paperPosition.entryPrice, series, sourceTimeMs: paperPosition.entryTimeMs });
  if (!anchor) {
    return null;
  }

  const side = resolveEntryLifecycleSide(signal);
  return { markerPoint: createMarkerPoint(anchor, side), pricePoint: anchor.pricePoint, side };
}

function createExitLifecyclePoint(input: {
  candles: readonly MarketCandle[];
  chart: IChartApi;
  paperPosition: PaperPositionRecord;
  series: ISeriesApi<"Candlestick">;
  signal: StructuredSignal | null;
}): LifecyclePoint | null {
  const { candles, chart, paperPosition, series, signal } = input;
  const exitPrice = paperPosition.exitPrice;
  const exitTimeMs = paperPosition.exitTimeMs;

  if (paperPosition.status !== "exited" || paperPosition.entryTimeMs === null || exitPrice === null || exitTimeMs === null) {
    return null;
  }

  const anchor = resolveChartAnchor({ candles, chart, price: exitPrice, series, sourceTimeMs: exitTimeMs });
  if (!anchor) {
    return null;
  }

  const side = resolveExitLifecycleSide(signal);
  return { markerPoint: createMarkerPoint(anchor, side), pricePoint: anchor.pricePoint, side };
}

function resolveEntryLifecycleSide(signal: StructuredSignal | null): LifecycleTradeSide {
  return signal?.direction === "short" ? "sell" : "buy";
}

function resolveExitLifecycleSide(signal: StructuredSignal | null): LifecycleTradeSide {
  return signal?.direction === "short" ? "buy" : "sell";
}

function isExitAfterEntry(paperPosition: PaperPositionRecord): boolean {
  return paperPosition.entryTimeMs !== null && paperPosition.exitTimeMs !== null && paperPosition.exitTimeMs > paperPosition.entryTimeMs;
}

function isLifecyclePointInsideChartPane(point: { x: number; y: number }, overlay: HTMLDivElement): boolean {
  const minX = LIFECYCLE_BADGE_RADIUS;
  const maxX = Math.max(minX, overlay.clientWidth - RIGHT_PRICE_SCALE_RESERVED_WIDTH - LIFECYCLE_BADGE_RADIUS);
  return point.x >= minX && point.x <= maxX;
}

function isLifecyclePointPastRightEdge(point: { x: number; y: number }, overlay: HTMLDivElement): boolean {
  const maxX = Math.max(LIFECYCLE_BADGE_RADIUS, overlay.clientWidth - RIGHT_PRICE_SCALE_RESERVED_WIDTH - LIFECYCLE_BADGE_RADIUS);
  return point.x > maxX;
}

function resolveChartAnchor(input: {
  candles: readonly MarketCandle[];
  chart: IChartApi;
  price: number;
  series: ISeriesApi<"Candlestick">;
  sourceTimeMs: number;
}): { candleHighPoint: { x: number; y: number }; candleLowPoint: { x: number; y: number }; pricePoint: { x: number; y: number } } | null {
  const nearestCandle = findNearestCandle(input.candles, input.sourceTimeMs);
  if (!nearestCandle) {
    return null;
  }

  const x = input.chart.timeScale().timeToCoordinate(nearestCandle.time);
  const priceY = input.series.priceToCoordinate(input.price);
  const highY = input.series.priceToCoordinate(nearestCandle.high);
  const lowY = input.series.priceToCoordinate(nearestCandle.low);
  if (x === null || priceY === null || highY === null || lowY === null) {
    return null;
  }

  const numericX = Number(x);
  return {
    candleHighPoint: { x: numericX, y: Number(highY) },
    candleLowPoint: { x: numericX, y: Number(lowY) },
    pricePoint: { x: numericX, y: Number(priceY) },
  };
}

function createMarkerPoint(
  anchor: { candleHighPoint: { x: number; y: number }; candleLowPoint: { x: number; y: number } },
  side: LifecycleTradeSide,
): { x: number; y: number } {
  return side === "buy" ? anchor.candleLowPoint : anchor.candleHighPoint;
}

function findNearestCandle(candles: readonly MarketCandle[], sourceTimeMs: number): MarketCandle | null {
  if (!Number.isFinite(sourceTimeMs)) {
    return null;
  }

  let nearestCandle = candles[0];
  let nearestDistance = Math.abs(nearestCandle.sourceTimeMs - sourceTimeMs);

  for (const candle of candles) {
    const distance = Math.abs(candle.sourceTimeMs - sourceTimeMs);
    if (distance < nearestDistance) {
      nearestCandle = candle;
      nearestDistance = distance;
    }
  }

  return nearestCandle;
}

function createHoldingRangeElement(input: {
  endPoint: { x: number; y: number };
  overlay: HTMLDivElement;
  startPoint: { x: number; y: number };
  theme: ChartTheme;
}): HTMLDivElement {
  const { endPoint, overlay, startPoint, theme } = input;
  const maxX = Math.max(0, overlay.clientWidth - RIGHT_PRICE_SCALE_RESERVED_WIDTH);
  const left = Math.max(0, Math.min(startPoint.x, endPoint.x));
  const right = Math.min(maxX, Math.max(startPoint.x, endPoint.x));
  const centerY = (startPoint.y + endPoint.y) / 2;
  const rawTop = Math.min(startPoint.y, endPoint.y) - HOLDING_RECTANGLE_VERTICAL_PADDING;
  const rawBottom = Math.max(startPoint.y, endPoint.y) + HOLDING_RECTANGLE_VERTICAL_PADDING;
  const height = Math.max(HOLDING_RECTANGLE_MIN_HEIGHT, rawBottom - rawTop);
  const top = Math.max(12, centerY - height / 2);
  const element = document.createElement("div");

  element.setAttribute("aria-hidden", "true");
  element.dataset.guideAnnotation = "kline-signal";
  element.style.position = "absolute";
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  element.style.width = `${Math.max(8, right - left)}px`;
  element.style.height = `${height}px`;
  element.style.background = theme === "dark" ? "rgba(0, 166, 244, 0.14)" : "rgba(0, 166, 244, 0.12)";
  element.style.pointerEvents = "none";
  element.style.zIndex = "24";
  return element;
}

function createLifecycleBadge(input: {
  language: WorkspaceLanguage;
  point: { x: number; y: number };
  side: LifecycleTradeSide;
  theme: ChartTheme;
}): HTMLDivElement {
  const copy = getWorkspaceCopy(input.language);
  const wrapper = document.createElement("div");
  const badge = document.createElement("div");
  const arrow = document.createElement("div");
  const isBuy = input.side === "buy";
  const isSell = input.side === "sell";
  const color = isBuy ? "#2FBD85" : "#F6465D";
  const isBelow = isBuy;

  wrapper.title = isSell ? copy.kline.lifecycleSell : copy.kline.lifecycleBuy;
  wrapper.dataset.guideAnnotation = "kline-signal";
  wrapper.style.position = "absolute";
  wrapper.style.left = `${input.point.x}px`;
  wrapper.style.top = `${input.point.y + (isBelow ? 9 : -9)}px`;
  wrapper.style.transform = isBelow ? "translateX(-50%)" : "translate(-50%, -100%)";
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = isBelow ? "column" : "column-reverse";
  wrapper.style.alignItems = "center";
  wrapper.style.gap = "3px";
  wrapper.style.pointerEvents = "none";
  wrapper.style.zIndex = "36";

  arrow.style.width = "0";
  arrow.style.height = "0";
  arrow.style.borderLeft = "5px solid transparent";
  arrow.style.borderRight = "5px solid transparent";
  if (isBelow) {
    arrow.style.borderBottom = `6px solid ${color}`;
  } else {
    arrow.style.borderTop = `6px solid ${color}`;
  }

  badge.textContent = isBuy ? "B" : "S";
  badge.style.display = "grid";
  badge.style.placeItems = "center";
  badge.style.width = "24px";
  badge.style.height = "24px";
  badge.style.borderRadius = "999px";
  badge.style.border = "none";
  badge.style.background = color;
  badge.style.boxShadow = input.theme === "dark" ? `0 8px 20px ${hexToRgba(color, 0.30)}` : `0 8px 18px ${hexToRgba(color, 0.24)}`;
  badge.style.color = "#ffffff";
  badge.style.fontSize = "11px";
  badge.style.fontWeight = "900";
  badge.style.lineHeight = "1";

  wrapper.append(arrow, badge);
  return wrapper;
}

function hexToRgba(hex: string, alpha: number): string {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
