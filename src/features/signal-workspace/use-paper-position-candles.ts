import { useEffect, useMemo, useState } from "react";
import {
  HISTORICAL_CANDLE_LIMIT,
  fetchHistoricalCandles,
  subscribeToBinanceKlines,
  upsertCandle,
} from "@/lib/binance-market-data";
import type { KlineInterval, MarketCandle, MarketSymbol } from "@/types/market";
import type { StructuredSignal } from "@/types/signal";

const PAPER_POSITION_INTERVAL: KlineInterval = "1m";
const PAPER_POSITION_MAX_CANDLE_PAGES = 15;

type SignalCoverageGroup = {
  earliestSignalTimeMs: number | null;
  symbol: MarketSymbol;
};

export type PaperPositionMarketCandleUpdate = {
  candles: readonly MarketCandle[];
  interval: KlineInterval;
  symbol: MarketSymbol;
};

export function usePaperPositionCandles(
  signals: readonly StructuredSignal[],
  latestMarketCandleUpdate: PaperPositionMarketCandleUpdate | null,
): {
  candlesBySymbol: Record<string, MarketCandle[]>;
  errorsBySymbol: Record<string, string>;
  latestPricesBySymbol: Record<string, number>;
} {
  /**
   * Paper-position lifecycle is confirmed from a fixed 1m stream. Larger chart
   * intervals lose the intrabar order, so they should only display these events
   * instead of recomputing entry/exit from their own OHLC range.
   */
  const [candlesBySymbol, setCandlesBySymbol] = useState<Record<string, MarketCandle[]>>({});
  const [errorsBySymbol, setErrorsBySymbol] = useState<Record<string, string>>({});
  const signalCoverageKey = useMemo(() => createSignalCoverageKey(signals), [signals]);
  const signalGroups = useMemo(() => parseSignalCoverageKey(signalCoverageKey), [signalCoverageKey]);
  const activeSymbols = useMemo(() => new Set(signalGroups.map((group) => group.symbol)), [signalGroups]);
  const visibleCandlesBySymbol = useMemo(() => filterRecordByKeys(candlesBySymbol, activeSymbols), [activeSymbols, candlesBySymbol]);
  const visibleErrorsBySymbol = useMemo(() => filterRecordByKeys(errorsBySymbol, activeSymbols), [activeSymbols, errorsBySymbol]);
  const visibleLatestPricesBySymbol = useMemo(
    () => createLatestPriceRecord(latestMarketCandleUpdate, activeSymbols),
    [activeSymbols, latestMarketCandleUpdate],
  );

  useEffect(() => {
    let isActive = true;
    const abortController = new AbortController();
    const unsubscribeList: Array<() => void> = [];

    for (const group of signalGroups) {
      fetchPaperPositionCandles(
        group.symbol,
        PAPER_POSITION_INTERVAL,
        group.earliestSignalTimeMs,
        abortController.signal,
      )
        .then((historicalCandles) => {
          if (!isActive) {
            return;
          }

          setCandlesBySymbol((currentCandlesBySymbol) => ({
            ...currentCandlesBySymbol,
            [group.symbol]: historicalCandles,
          }));
          setErrorsBySymbol((currentErrorsBySymbol) => removeRecordKey(currentErrorsBySymbol, group.symbol));

          const unsubscribe = subscribeToBinanceKlines(group.symbol, PAPER_POSITION_INTERVAL, {
            onOpen: () => {
              if (isActive) {
                setErrorsBySymbol((currentErrorsBySymbol) => removeRecordKey(currentErrorsBySymbol, group.symbol));
              }
            },
            onError: (error) => {
              if (isActive) {
                setErrorsBySymbol((currentErrorsBySymbol) => ({
                  ...currentErrorsBySymbol,
                  [group.symbol]: error.message,
                }));
              }
            },
            onCandle: (nextCandle) => {
              if (!isActive) {
                return;
              }

              setCandlesBySymbol((currentCandlesBySymbol) => ({
                ...currentCandlesBySymbol,
                [group.symbol]: upsertCandle(currentCandlesBySymbol[group.symbol] ?? [], nextCandle),
              }));
            },
          });
          unsubscribeList.push(unsubscribe);
        })
        .catch((error: unknown) => {
          if (isActive && !isAbortError(error)) {
            setErrorsBySymbol((currentErrorsBySymbol) => ({
              ...currentErrorsBySymbol,
              [group.symbol]: error instanceof Error ? error.message : String(error),
            }));
          }
        });
    }

    return () => {
      isActive = false;
      abortController.abort();
      for (const unsubscribe of unsubscribeList) {
        unsubscribe();
      }
    };
  }, [signalGroups]);

  return {
    candlesBySymbol: visibleCandlesBySymbol,
    errorsBySymbol: visibleErrorsBySymbol,
    latestPricesBySymbol: visibleLatestPricesBySymbol,
  };
}

function createLatestPriceRecord(
  latestMarketCandleUpdate: PaperPositionMarketCandleUpdate | null,
  activeSymbols: ReadonlySet<string>,
): Record<string, number> {
  if (!latestMarketCandleUpdate || !activeSymbols.has(latestMarketCandleUpdate.symbol)) {
    return {};
  }

  const latestCandle = latestMarketCandleUpdate.candles.at(-1);
  if (!latestCandle || !Number.isFinite(latestCandle.close) || latestCandle.close <= 0) {
    return {};
  }

  return { [latestMarketCandleUpdate.symbol]: latestCandle.close };
}

function createSignalCoverageKey(signals: readonly StructuredSignal[]): string {
  const signalGroups = createSignalCoverageGroups(signals);
  return JSON.stringify(signalGroups.map((group) => [group.symbol, group.earliestSignalTimeMs]));
}

function parseSignalCoverageKey(signalCoverageKey: string): SignalCoverageGroup[] {
  const serializedGroups = JSON.parse(signalCoverageKey) as [MarketSymbol, number | null][];
  return serializedGroups.map(([symbol, earliestSignalTimeMs]) => ({
    earliestSignalTimeMs,
    symbol,
  }));
}

function createSignalCoverageGroups(signals: readonly StructuredSignal[]): SignalCoverageGroup[] {
  const signalTimeRangeBySymbol = new Map<MarketSymbol, { earliestSignalTimeMs: number | null }>();

  for (const signal of signals) {
    const signalTimeMs = getSignalTimeMs(signal);
    const currentRange = signalTimeRangeBySymbol.get(signal.symbol);

    if (!currentRange) {
      signalTimeRangeBySymbol.set(signal.symbol, {
        earliestSignalTimeMs: signalTimeMs,
      });
      continue;
    }

    if (signalTimeMs === null) {
      continue;
    }

    if (currentRange.earliestSignalTimeMs === null || signalTimeMs < currentRange.earliestSignalTimeMs) {
      currentRange.earliestSignalTimeMs = signalTimeMs;
    }
  }

  return Array.from(signalTimeRangeBySymbol.entries())
    .map(([symbol, range]) => ({ ...range, symbol }))
    .sort((left, right) => left.symbol.localeCompare(right.symbol));
}

function filterRecordByKeys<T>(record: Record<string, T>, keys: ReadonlySet<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => keys.has(key)));
}

function removeRecordKey<T>(record: Record<string, T>, keyToRemove: string): Record<string, T> {
  if (!(keyToRemove in record)) {
    return record;
  }

  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== keyToRemove));
}

async function fetchPaperPositionCandles(
  symbol: MarketSymbol,
  interval: KlineInterval,
  earliestSignalTimeMs: number | null,
  signal?: AbortSignal,
): Promise<MarketCandle[]> {
  let candles = await fetchHistoricalCandles(symbol, interval, {
    limit: HISTORICAL_CANDLE_LIMIT,
    signal,
  });

  if (earliestSignalTimeMs === null) {
    return candles;
  }

  for (let pageIndex = 1; pageIndex < PAPER_POSITION_MAX_CANDLE_PAGES; pageIndex += 1) {
    const oldestCandle = candles[0];
    if (!oldestCandle || oldestCandle.sourceTimeMs <= earliestSignalTimeMs) {
      break;
    }

    const olderCandles = await fetchHistoricalCandles(symbol, interval, {
      limit: HISTORICAL_CANDLE_LIMIT,
      signal,
      untilMs: oldestCandle.sourceTimeMs,
    });
    if (olderCandles.length === 0) {
      break;
    }

    candles = mergeCandles(olderCandles, candles);
  }

  return candles;
}

function mergeCandles(leftCandles: readonly MarketCandle[], rightCandles: readonly MarketCandle[]): MarketCandle[] {
  const candlesByTime = new Map<number, MarketCandle>();
  for (const candle of leftCandles) {
    candlesByTime.set(candle.sourceTimeMs, candle);
  }
  for (const candle of rightCandles) {
    candlesByTime.set(candle.sourceTimeMs, candle);
  }

  return Array.from(candlesByTime.values()).sort((left, right) => left.sourceTimeMs - right.sourceTimeMs);
}

function getSignalTimeMs(signal: StructuredSignal): number | null {
  const signalTimeMs = Date.parse(signal.created_at);

  return Number.isFinite(signalTimeMs) ? signalTimeMs : null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
