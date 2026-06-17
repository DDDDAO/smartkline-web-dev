import type { ISeriesApi, Logical, LogicalRange } from "lightweight-charts";
import type { MarketCandle } from "@/app/_types/market";
import { toVolumeData } from "./series-data";
import type { ChartTheme, PriceColorMode } from "./types";

export const LEFT_EDGE_HISTORY_THRESHOLD_BARS = 80;

const RIGHT_EDGE_FOLLOW_THRESHOLD_BARS = 2;
const MAX_INCREMENTAL_CANDLE_UPDATES = 8;

export function findNearestCandleIndex(candles: readonly MarketCandle[], sourceTimeMs: number): number {
  if (!Number.isFinite(sourceTimeMs) || candles.length === 0) {
    return -1;
  }

  let lowIndex = 0;
  let highIndex = candles.length - 1;

  while (lowIndex <= highIndex) {
    const middleIndex = Math.floor((lowIndex + highIndex) / 2);
    const middleTimeMs = candles[middleIndex].sourceTimeMs;

    if (middleTimeMs === sourceTimeMs) {
      return middleIndex;
    }

    if (middleTimeMs < sourceTimeMs) {
      lowIndex = middleIndex + 1;
    } else {
      highIndex = middleIndex - 1;
    }
  }

  if (lowIndex >= candles.length) {
    return candles.length - 1;
  }

  if (highIndex < 0) {
    return 0;
  }

  return sourceTimeMs - candles[highIndex].sourceTimeMs <= candles[lowIndex].sourceTimeMs - sourceTimeMs
    ? highIndex
    : lowIndex;
}

export function applyCandlesToSeries(input: {
  candleSeries: ISeriesApi<"Candlestick">;
  forceReplace: boolean;
  nextCandles: readonly MarketCandle[];
  priceColorMode: PriceColorMode;
  previousCandles: readonly MarketCandle[];
  theme: ChartTheme;
  volumeSeries: ISeriesApi<"Histogram">;
}): void {
  const {
    candleSeries,
    forceReplace,
    nextCandles,
    priceColorMode,
    previousCandles,
    theme,
    volumeSeries,
  } = input;
  const incrementalUpdateStartIndex = forceReplace
    ? -1
    : resolveIncrementalCandleUpdateStartIndex(previousCandles, nextCandles);

  if (incrementalUpdateStartIndex === -1) {
    candleSeries.setData(nextCandles.slice());
    volumeSeries.setData(nextCandles.map((candle) => toVolumeData(candle, theme, priceColorMode)));
    return;
  }

  if (incrementalUpdateStartIndex === nextCandles.length) {
    return;
  }

  const changedCandleCount = nextCandles.length - incrementalUpdateStartIndex;
  if (changedCandleCount > MAX_INCREMENTAL_CANDLE_UPDATES) {
    candleSeries.setData(nextCandles.slice());
    volumeSeries.setData(nextCandles.map((candle) => toVolumeData(candle, theme, priceColorMode)));
    return;
  }

  for (let index = incrementalUpdateStartIndex; index < nextCandles.length; index += 1) {
    const nextCandle = nextCandles[index];
    const isHistoricalUpdate = index < previousCandles.length - 1;
    candleSeries.update(nextCandle, isHistoricalUpdate);
    volumeSeries.update(toVolumeData(nextCandle, theme, priceColorMode), isHistoricalUpdate);
  }
}

export function resolveVisibleLogicalRangeAfterCandlesChange({
  nextCandles,
  previousCandles,
  previousVisibleRange,
}: {
  nextCandles: readonly MarketCandle[];
  previousCandles: readonly MarketCandle[];
  previousVisibleRange: LogicalRange | null;
}): LogicalRange | null {
  if (!previousVisibleRange || previousCandles.length === 0 || nextCandles.length === 0) {
    return null;
  }

  const prependedCandleCount = resolvePrependedCandleCount(previousCandles, nextCandles);
  if (prependedCandleCount > 0) {
    return {
      from: (previousVisibleRange.from + prependedCandleCount) as Logical,
      to: (previousVisibleRange.to + prependedCandleCount) as Logical,
    };
  }

  const previousLastCandle = previousCandles.at(-1);
  const nextLastCandle = nextCandles.at(-1);
  if (!previousLastCandle || !nextLastCandle) {
    return null;
  }

  const didAppendNewerCandles = nextLastCandle.sourceTimeMs > previousLastCandle.sourceTimeMs;
  if (!didAppendNewerCandles) {
    return previousVisibleRange;
  }

  return isViewingLatestCandle(previousVisibleRange, previousCandles.length)
    ? null
    : previousVisibleRange;
}

function resolveIncrementalCandleUpdateStartIndex(
  previousCandles: readonly MarketCandle[],
  nextCandles: readonly MarketCandle[],
): number {
  if (previousCandles.length === 0 || nextCandles.length < previousCandles.length) {
    return -1;
  }

  if (previousCandles[0]?.sourceTimeMs !== nextCandles[0]?.sourceTimeMs) {
    return -1;
  }

  const previousLastCandle = previousCandles.at(-1);
  if (!previousLastCandle) {
    return -1;
  }

  for (let index = previousCandles.length; index < nextCandles.length; index += 1) {
    if (nextCandles[index].sourceTimeMs <= previousLastCandle.sourceTimeMs) {
      return -1;
    }
  }

  let changedStartIndex = Math.min(previousCandles.length, nextCandles.length) - 1;
  while (
    changedStartIndex >= 0
    && areMarketCandlesEqual(previousCandles[changedStartIndex], nextCandles[changedStartIndex])
  ) {
    changedStartIndex -= 1;
  }

  if (changedStartIndex === -1) {
    return previousCandles.length;
  }

  if (previousCandles[changedStartIndex].sourceTimeMs !== nextCandles[changedStartIndex]?.sourceTimeMs) {
    return -1;
  }

  return changedStartIndex;
}

function areMarketCandlesEqual(left: MarketCandle, right: MarketCandle): boolean {
  return (
    left.sourceTimeMs === right.sourceTimeMs &&
    left.open === right.open &&
    left.high === right.high &&
    left.low === right.low &&
    left.close === right.close &&
    left.volume === right.volume
  );
}

function resolvePrependedCandleCount(previousCandles: readonly MarketCandle[], nextCandles: readonly MarketCandle[]): number {
  const previousFirstCandle = previousCandles[0];
  if (!previousFirstCandle) {
    return 0;
  }

  const previousFirstIndexInNextCandles = nextCandles.findIndex((candle) => candle.sourceTimeMs === previousFirstCandle.sourceTimeMs);
  return previousFirstIndexInNextCandles > 0 ? previousFirstIndexInNextCandles : 0;
}

function isViewingLatestCandle(visibleRange: LogicalRange, candleCount: number): boolean {
  return visibleRange.to >= candleCount - 1 - RIGHT_EDGE_FOLLOW_THRESHOLD_BARS;
}
