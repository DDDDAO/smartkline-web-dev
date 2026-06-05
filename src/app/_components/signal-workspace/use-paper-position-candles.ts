import { useEffect, useMemo, useState } from "react";
import {
  HISTORICAL_CANDLE_LIMIT,
  fetchHistoricalCandles,
} from "@/app/_lib/binance-market-data";
import type { KlineInterval, MarketCandle, MarketSymbol } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";

const PAPER_POSITION_INTERVAL: KlineInterval = "15m";

type SignalCoverageGroup = {
  earliestSignalTimeMs: number | null;
  newestSignalTimeMs: number | null;
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
   * Paper-position state is confirmed from a fixed 15m history window. Chart
   * markers are recalculated separately from the currently visible interval.
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

    for (const group of signalGroups) {
      fetchPaperPositionCandles(
        group.symbol,
        PAPER_POSITION_INTERVAL,
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
  return JSON.stringify(signalGroups.map((group) => [group.symbol, group.earliestSignalTimeMs, group.newestSignalTimeMs]));
}

function parseSignalCoverageKey(signalCoverageKey: string): SignalCoverageGroup[] {
  const serializedGroups = JSON.parse(signalCoverageKey) as [MarketSymbol, number | null, number | null][];
  return serializedGroups.map(([symbol, earliestSignalTimeMs, newestSignalTimeMs]) => ({
    earliestSignalTimeMs,
    newestSignalTimeMs,
    symbol,
  }));
}

function createSignalCoverageGroups(signals: readonly StructuredSignal[]): SignalCoverageGroup[] {
  const signalTimeRangeBySymbol = new Map<MarketSymbol, { earliestSignalTimeMs: number | null; newestSignalTimeMs: number | null }>();

  for (const signal of signals) {
    const signalTimeMs = getSignalTimeMs(signal);
    const currentRange = signalTimeRangeBySymbol.get(signal.symbol);

    if (!currentRange) {
      signalTimeRangeBySymbol.set(signal.symbol, {
        earliestSignalTimeMs: signalTimeMs,
        newestSignalTimeMs: signalTimeMs,
      });
      continue;
    }

    if (signalTimeMs === null) {
      continue;
    }

    if (currentRange.earliestSignalTimeMs === null || signalTimeMs < currentRange.earliestSignalTimeMs) {
      currentRange.earliestSignalTimeMs = signalTimeMs;
    }

    if (currentRange.newestSignalTimeMs === null || signalTimeMs > currentRange.newestSignalTimeMs) {
      currentRange.newestSignalTimeMs = signalTimeMs;
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
  signal?: AbortSignal,
): Promise<MarketCandle[]> {
  return fetchHistoricalCandles(symbol, interval, {
    limit: HISTORICAL_CANDLE_LIMIT,
    signal,
  });
}

function getSignalTimeMs(signal: StructuredSignal): number | null {
  const signalTimeMs = Date.parse(signal.created_at);

  return Number.isFinite(signalTimeMs) ? signalTimeMs : null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
