import type { ISeriesApi } from "lightweight-charts";
import type { PaperPositionRecord } from "@/lib/paper-position";
import type { MarketCandle } from "@/types/market";
import type { StructuredSignal } from "@/types/signal";

export function updateSignalDataGuideTarget(input: {
  annotationOverlay: HTMLDivElement | null;
  candles: readonly MarketCandle[];
  element: HTMLDivElement | null;
  paperPosition: PaperPositionRecord | null;
  series: ISeriesApi<"Candlestick"> | null;
  signal: StructuredSignal | null;
}): void {
  const { annotationOverlay, candles, element, paperPosition, series, signal } = input;
  const container = element?.parentElement;
  if (!element || !container) {
    return;
  }

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  if (containerWidth <= 0 || containerHeight <= 0) {
    return;
  }

  const fallbackLeft = 24;
  const fallbackTop = Math.round(containerHeight * 0.26);
  const fallbackWidth = Math.max(180, containerWidth - fallbackLeft - 4);
  const fallbackHeight = Math.max(180, Math.round(containerHeight * 0.42));

  if (!series || !signal) {
    applyGuideTargetStyle(element, {
      height: fallbackHeight,
      left: fallbackLeft,
      top: fallbackTop,
      width: fallbackWidth,
    });
    return;
  }

  const priceCoordinates = collectSignalGuidePrices(signal, paperPosition, candles)
    .flatMap((price) => {
      const coordinate = series.priceToCoordinate(price);
      const numericCoordinate = coordinate === null ? null : Number(coordinate);
      return numericCoordinate !== null && Number.isFinite(numericCoordinate) ? [numericCoordinate] : [];
    });

  if (priceCoordinates.length === 0) {
    applyGuideTargetStyle(element, {
      height: fallbackHeight,
      left: fallbackLeft,
      top: fallbackTop,
      width: fallbackWidth,
    });
    return;
  }

  const annotationRect = collectSignalAnnotationRect(container, annotationOverlay);
  const verticalCoordinates = annotationRect
    ? [...priceCoordinates, annotationRect.top, annotationRect.bottom]
    : priceCoordinates;
  const minY = Math.min(...verticalCoordinates);
  const maxY = Math.max(...verticalCoordinates);
  const verticalPadding = 58;
  const minHeight = 172;
  const rawTop = minY - verticalPadding;
  const rawBottom = maxY + verticalPadding;
  const height = Math.min(Math.max(rawBottom - rawTop, minHeight), Math.max(180, containerHeight - 110));
  const centerY = (minY + maxY) / 2;
  const top = clamp(centerY - height / 2, 54, Math.max(54, containerHeight - height - 40));
  const rightEdge = containerWidth - 4;
  const annotationLeft = annotationRect ? Math.max(0, annotationRect.left - 88) : Math.round(containerWidth * 0.06);
  const left = clamp(Math.min(24, annotationLeft), 0, Math.max(0, rightEdge - 300));
  const width = Math.max(180, rightEdge - left);

  applyGuideTargetStyle(element, { height, left, top, width });
}

function collectSignalAnnotationRect(
  container: HTMLElement,
  overlay: HTMLDivElement | null,
): { bottom: number; left: number; right: number; top: number } | null {
  if (!overlay) {
    return null;
  }

  const containerRect = container.getBoundingClientRect();
  let bottom = Number.NEGATIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;

  for (const element of overlay.querySelectorAll<HTMLElement>('[data-guide-annotation="kline-signal"]')) {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    bottom = Math.max(bottom, rect.bottom - containerRect.top);
    left = Math.min(left, rect.left - containerRect.left);
    right = Math.max(right, rect.right - containerRect.left);
    top = Math.min(top, rect.top - containerRect.top);
  }

  if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(top) || !Number.isFinite(bottom)) {
    return null;
  }

  return {
    bottom: clamp(bottom, 0, container.clientHeight),
    left: clamp(left, 0, container.clientWidth),
    right: clamp(right, 0, container.clientWidth),
    top: clamp(top, 0, container.clientHeight),
  };
}

function collectSignalGuidePrices(
  signal: StructuredSignal,
  paperPosition: PaperPositionRecord | null,
  candles: readonly MarketCandle[],
): number[] {
  const prices = [
    signal.entry_min,
    signal.entry_max,
    signal.trigger_price,
    signal.stop_loss,
    ...signal.take_profit,
    paperPosition?.entryPrice ?? null,
    paperPosition?.exitPrice ?? null,
    paperPosition?.currentPrice ?? null,
    candles.at(-1)?.close ?? null,
  ];

  return prices.filter((price): price is number => price !== null && Number.isFinite(price) && price > 0);
}

function applyGuideTargetStyle(
  element: HTMLDivElement,
  rect: { height: number; left: number; top: number; width: number },
): void {
  element.style.left = `${rect.left}px`;
  element.style.top = `${rect.top}px`;
  element.style.width = `${rect.width}px`;
  element.style.height = `${rect.height}px`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
