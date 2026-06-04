import { useEffect, useMemo, useState } from "react";
import {
  HISTORICAL_CANDLE_LIMIT,
  fetchHistoricalCandles,
  prependHistoricalCandles,
  subscribeToBinanceKlines,
  upsertCandle,
} from "@/app/_lib/binance-market-data";
import type { KlineInterval, MarketCandle, MarketSymbol } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";

const PAPER_POSITION_INTERVAL: KlineInterval = "1m";

export function usePaperPositionCandles(signals: readonly StructuredSignal[]): {
  candlesBySymbol: Record<string, MarketCandle[]>;
  errorsBySymbol: Record<string, string>;
} {
  const [candlesBySymbol, setCandlesBySymbol] = useState<Record<string, MarketCandle[]>>({});
  const [errorsBySymbol, setErrorsBySymbol] = useState<Record<string, string>>({});
  const signalGroups = useMemo(() => groupSignalsBySymbol(signals), [signals]);
  const activeSymbols = useMemo(() => new Set(signalGroups.map((group) => group.symbol)), [signalGroups]);
  const visibleCandlesBySymbol = useMemo(() => filterRecordByKeys(candlesBySymbol, activeSymbols), [activeSymbols, candlesBySymbol]);
  const visibleErrorsBySymbol = useMemo(() => filterRecordByKeys(errorsBySymbol, activeSymbols), [activeSymbols, errorsBySymbol]);

  useEffect(() => {
    let isActive = true;
    const unsubscribeList: (() => void)[] = [];

    for (const group of signalGroups) {
      fetchHistoricalCandlesWithSignalCoverage(group.symbol, PAPER_POSITION_INTERVAL, group.signals)
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
          if (isActive) {
            setErrorsBySymbol((currentErrorsBySymbol) => ({
              ...currentErrorsBySymbol,
              [group.symbol]: error instanceof Error ? error.message : String(error),
            }));
          }
        });
    }

    return () => {
      isActive = false;
      for (const unsubscribe of unsubscribeList) {
        unsubscribe();
      }
    };
  }, [signalGroups]);

  return { candlesBySymbol: visibleCandlesBySymbol, errorsBySymbol: visibleErrorsBySymbol };
}

function groupSignalsBySymbol(signals: readonly StructuredSignal[]): { symbol: MarketSymbol; signals: StructuredSignal[] }[] {
  const signalsBySymbol = new Map<MarketSymbol, StructuredSignal[]>();

  for (const signal of signals) {
    const symbolSignals = signalsBySymbol.get(signal.symbol) ?? [];
    symbolSignals.push(signal);
    signalsBySymbol.set(signal.symbol, symbolSignals);
  }

  return Array.from(signalsBySymbol.entries()).map(([symbol, symbolSignals]) => ({ symbol, signals: symbolSignals }));
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

const MAX_INITIAL_HISTORY_PAGES = 4;

async function fetchHistoricalCandlesWithSignalCoverage(
  symbol: MarketSymbol,
  interval: KlineInterval,
  signals: readonly StructuredSignal[],
): Promise<MarketCandle[]> {
  let candles = await fetchHistoricalCandles(symbol, interval, { limit: HISTORICAL_CANDLE_LIMIT });
  const earliestSignalTimeMs = getEarliestSignalTimeMs(signals);
  let loadedPages = 1;

  while (
    earliestSignalTimeMs !== null
    && candles.length > 0
    && candles[0].sourceTimeMs > earliestSignalTimeMs
    && loadedPages < MAX_INITIAL_HISTORY_PAGES
  ) {
    const olderCandles = await fetchHistoricalCandles(symbol, interval, {
      limit: HISTORICAL_CANDLE_LIMIT,
      untilMs: candles[0].sourceTimeMs,
    });

    if (olderCandles.length === 0) {
      break;
    }

    candles = prependHistoricalCandles(candles, olderCandles);
    loadedPages += 1;
  }

  return candles;
}

function getEarliestSignalTimeMs(signals: readonly StructuredSignal[]): number | null {
  const signalTimes = signals
    .map((signal) => Date.parse(signal.created_at))
    .filter(Number.isFinite);

  return signalTimes.length > 0 ? Math.min(...signalTimes) : null;
}

