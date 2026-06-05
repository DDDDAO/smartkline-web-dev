import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { intervals } from "@/app/_lib/demo-data";
import { createSignalAiSummary } from "@/app/_lib/signal-ai-summary";
import {
  HISTORICAL_CANDLE_LIMIT,
  fetchHistoricalCandles,
  prependHistoricalCandles,
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
}) {
  const [candles, setCandles] = useState<MarketCandle[]>([]);
  const [canLoadOlderHistory, setCanLoadOlderHistory] = useState(true);
  const [isLoadingOlderHistory, setIsLoadingOlderHistory] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const candlesRef = useRef<readonly MarketCandle[]>([]);
  const isLoadingOlderHistoryRef = useRef(false);
  const isDarkTheme = theme === "dark";
  const chartEventSignals = useMemo(() => signals.filter((signal) => signal.symbol === symbol), [signals, symbol]);
  const aiSummary = useMemo(() => createSignalAiSummary(chartEventSignals), [chartEventSignals]);

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    isLoadingOlderHistoryRef.current = isLoadingOlderHistory;
  }, [isLoadingOlderHistory]);

  useEffect(() => {
    let isActive = true;
    fetchHistoricalCandles(symbol, interval, { limit: HISTORICAL_CANDLE_LIMIT })
      .then((historicalCandles) => {
        if (!isActive) {
          return;
        }

        setCandles(historicalCandles);
        setCanLoadOlderHistory(historicalCandles.length >= HISTORICAL_CANDLE_LIMIT);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      isActive = false;
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
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <KlineChart
          activePaperPosition={activePaperPosition}
          activeSignal={activeSignal}
          aiSummary={aiSummary}
          candles={candles}
          canLoadOlderHistory={canLoadOlderHistory}
          eventSignals={chartEventSignals}
          isLoadingOlderHistory={isLoadingOlderHistory}
          theme={theme}
          onEventSignalSelect={onSignalSelect}
          onLoadOlderHistory={loadOlderHistory}
        />
        {loadError && candles.length === 0 ? (
          <MarketEnvironmentGuide error={loadError} isDarkTheme={isDarkTheme} />
        ) : loadError ? (
          <div className={isDarkTheme ? "pointer-events-none absolute right-4 top-4 z-40 max-w-md rounded-xl border border-rose-900/70 bg-rose-950/80 px-3 py-2 text-xs text-rose-200 shadow-sm backdrop-blur" : "pointer-events-none absolute right-4 top-4 z-40 max-w-md rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 shadow-sm"}>
            行情连接异常：{loadError}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MarketEnvironmentGuide({ error, isDarkTheme }: { error: string; isDarkTheme: boolean }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center px-6">
      <div className={isDarkTheme ? "max-w-lg rounded-3xl border border-slate-700 bg-slate-950/92 p-6 text-slate-100 shadow-2xl backdrop-blur" : "max-w-lg rounded-3xl border border-slate-200 bg-white/94 p-6 text-slate-950 shadow-2xl backdrop-blur"}>
        <div className={isDarkTheme ? "text-sm font-bold text-cyan-300" : "text-sm font-bold text-cyan-700"}>行情图加载失败</div>
        <h3 className="mt-2 text-xl font-black">请检查地区网络环境</h3>
        <p className={isDarkTheme ? "mt-3 text-sm leading-6 text-slate-300" : "mt-3 text-sm leading-6 text-slate-600"}>
          当前行情图加载失败，可能与地区网络环境有关。请切换网络地区或开启可访问 Binance 行情源的网络环境后重试。
        </p>
        <div className={isDarkTheme ? "mt-4 rounded-2xl bg-slate-900 p-3 text-xs leading-5 text-slate-400" : "mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-500"}>
          <div>建议环境：可访问 Binance USDⓈ-M Futures REST 行情源。</div>
          <div>当前错误：{error}</div>
        </div>
      </div>
    </div>
  );
}
