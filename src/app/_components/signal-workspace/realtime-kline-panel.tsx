import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { intervals } from "@/app/_lib/demo-data";
import {
  HISTORICAL_CANDLE_LIMIT,
  fetchHistoricalCandles,
  prependHistoricalCandles,
  subscribeToBinanceKlines,
  upsertCandle,
} from "@/app/_lib/binance-market-data";
import { KlineChart, type ChartTheme } from "@/app/_components/kline-chart";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { KlineInterval, MarketCandle, MarketSymbol } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";
import { SymbolSearchInput } from "./symbol-search-input";

export function RealtimeKlinePanel({
  activePaperPosition,
  activeSignal,
  interval,
  marketOptions,
  symbol,
  signals,
  theme,
  onIntervalChange,
  onSymbolChange,
  onSignalSelect,
  onThemeToggle,
}: {
  activePaperPosition: PaperPositionRecord | null;
  activeSignal: StructuredSignal | null;
  interval: KlineInterval;
  marketOptions: readonly MarketSymbol[];
  symbol: MarketSymbol;
  signals: readonly StructuredSignal[];
  theme: ChartTheme;
  onIntervalChange: (interval: KlineInterval) => void;
  onSymbolChange: (symbol: MarketSymbol) => void;
  onSignalSelect: (signal: StructuredSignal) => void;
  onThemeToggle: () => void;
}) {
  const [candles, setCandles] = useState<MarketCandle[]>([]);
  const [canLoadOlderHistory, setCanLoadOlderHistory] = useState(true);
  const [isLoadingOlderHistory, setIsLoadingOlderHistory] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const candlesRef = useRef<readonly MarketCandle[]>([]);
  const isLoadingOlderHistoryRef = useRef(false);
  const isDarkTheme = theme === "dark";
  const chartEventSignals = useMemo(() => signals.filter((signal) => signal.symbol === symbol), [signals, symbol]);

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    isLoadingOlderHistoryRef.current = isLoadingOlderHistory;
  }, [isLoadingOlderHistory]);

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | null = null;

    fetchHistoricalCandles(symbol, interval, { limit: HISTORICAL_CANDLE_LIMIT })
      .then((historicalCandles) => {
        if (!isActive) {
          return;
        }

        setCandles(historicalCandles);
        setCanLoadOlderHistory(historicalCandles.length >= HISTORICAL_CANDLE_LIMIT);
        setLoadError(null);
        unsubscribe = subscribeToBinanceKlines(symbol, interval, {
          onOpen: () => {
            if (isActive) {
              setLoadError(null);
            }
          },
          onError: (error) => {
            if (isActive) {
              setLoadError(error.message);
            }
          },
          onCandle: (nextCandle) => {
            if (!isActive) {
              return;
            }

            setCandles((currentCandles) => upsertCandle(currentCandles, nextCandle));
          },
        });
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, [interval, symbol]);

  const loadOlderHistory = useCallback(async () => {
    if (isLoadingOlderHistoryRef.current || !canLoadOlderHistory) {
      return;
    }

    const oldestLoadedCandle = candlesRef.current.at(0);
    if (!oldestLoadedCandle) {
      return;
    }

    isLoadingOlderHistoryRef.current = true;
    setIsLoadingOlderHistory(true);

    try {
      const olderCandles = await fetchHistoricalCandles(symbol, interval, {
        limit: HISTORICAL_CANDLE_LIMIT,
        untilMs: oldestLoadedCandle.sourceTimeMs,
      });

      if (olderCandles.length === 0) {
        setCanLoadOlderHistory(false);
        return;
      }

      setCandles((currentCandles) => prependHistoricalCandles(currentCandles, olderCandles));
      setCanLoadOlderHistory(olderCandles.length >= HISTORICAL_CANDLE_LIMIT);
      setLoadError(null);
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      isLoadingOlderHistoryRef.current = false;
      setIsLoadingOlderHistory(false);
    }
  }, [canLoadOlderHistory, interval, symbol]);

  return (
    <section className={isDarkTheme ? "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm" : "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"}>
      <div className={isDarkTheme ? "flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3" : "flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"}>
        <div>
          <h1 className={isDarkTheme ? "text-base font-semibold text-slate-50" : "text-base font-semibold text-slate-950"}>K线看盘区</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <SymbolSearchInput
            key={symbol}
            isDarkTheme={isDarkTheme}
            marketOptions={marketOptions}
            symbol={symbol}
            onSymbolChange={onSymbolChange}
          />
          <div className={isDarkTheme ? "flex gap-1 rounded-xl border border-slate-700 bg-slate-950 p-1" : "flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"}>
            {intervals.map((item) => (
              <button
                key={item}
                className={item === interval ? "rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white" : isDarkTheme ? "rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100" : "rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-white hover:text-slate-950"}
                onClick={() => onIntervalChange(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <AnimatedThemeToggler isDarkTheme={isDarkTheme} onThemeToggle={onThemeToggle} />
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <KlineChart
          activePaperPosition={activePaperPosition}
          activeSignal={activeSignal}
          candles={candles}
          canLoadOlderHistory={canLoadOlderHistory}
          eventSignals={chartEventSignals}
          isLoadingOlderHistory={isLoadingOlderHistory}
          theme={theme}
          onEventSignalSelect={onSignalSelect}
          onLoadOlderHistory={loadOlderHistory}
        />
        {loadError ? (
          <div className="pointer-events-none absolute left-4 top-4 max-w-md rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 shadow-sm">
            {loadError}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function AnimatedThemeToggler({
  isDarkTheme,
  onThemeToggle,
}: {
  isDarkTheme: boolean;
  onThemeToggle: () => void;
}) {
  const className = isDarkTheme
    ? "grid h-9 w-9 place-items-center rounded-xl border border-slate-700 bg-slate-950 text-slate-100 transition hover:bg-slate-800"
    : "grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50";

  return (
    <button
      aria-label={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
      className={className}
      type="button"
      onClick={(event) => {
        const originX = event.clientX;
        const originY = event.clientY;

        if (!document.startViewTransition) {
          onThemeToggle();
          return;
        }

        const transition = document.startViewTransition(() => {
          flushSync(onThemeToggle);
        });

        void transition.ready.then(() => {
          const endRadius = Math.hypot(
            Math.max(originX, window.innerWidth - originX),
            Math.max(originY, window.innerHeight - originY),
          );

          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${originX}px ${originY}px)`,
                `circle(${endRadius}px at ${originX}px ${originY}px)`,
              ],
            },
            {
              duration: 820,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            },
          );

          document.documentElement.animate(
            { opacity: [1, 0.82, 0] },
            {
              duration: 820,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-old(root)",
            },
          );
        });
      }}
    >
      {isDarkTheme ? (
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
          <path d="M12 3v2.25M12 18.75V21M4.22 4.22l1.59 1.59M18.19 18.19l1.59 1.59M3 12h2.25M18.75 12H21M4.22 19.78l1.59-1.59M18.19 5.81l1.59-1.59" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ) : (
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
          <path d="M20.5 14.3A8.2 8.2 0 0 1 9.7 3.5 8.2 8.2 0 1 0 20.5 14.3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      )}
    </button>
  );
}
