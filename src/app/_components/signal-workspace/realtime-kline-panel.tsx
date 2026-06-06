import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDemoCandles, intervals } from "@/app/_lib/demo-data";
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
  const [resolvedRequestKey, setResolvedRequestKey] = useState("");
  const [canLoadOlderHistory, setCanLoadOlderHistory] = useState(true);
  const [isLoadingOlderHistory, setIsLoadingOlderHistory] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const candlesRef = useRef<readonly MarketCandle[]>([]);
  const isLoadingOlderHistoryRef = useRef(false);
  const isDarkTheme = theme === "dark";
  const requestKey = `${symbol}:${interval}`;
  const isInitialLoading = resolvedRequestKey !== requestKey;
  const chartEventSignals = useMemo(() => signals.filter((signal) => signal.symbol === symbol), [signals, symbol]);
  const aiSummary = useMemo(() => activeSignal ? createSignalAiSummary([activeSignal]) : null, [activeSignal]);

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
        setResolvedRequestKey(requestKey);
      })
      .catch((error: unknown) => {
        if (isActive) {
          setCandles(createDemoCandles(symbol, interval));
          setCanLoadOlderHistory(false);
          setLoadError(error instanceof Error ? error.message : String(error));
          setResolvedRequestKey(requestKey);
        }
      });

    return () => {
      isActive = false;
    };
  }, [interval, requestKey, symbol]);

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
    <section className={isDarkTheme ? "flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#181A20]" : "flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[24px] border border-[#E5EAF0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.035)]"}>
      <div className={isDarkTheme ? "flex min-h-[48px] flex-wrap items-center justify-between gap-3 border-b border-white/[0.075] bg-white/[0.055] px-5 py-1.5" : "flex min-h-[48px] flex-wrap items-center justify-between gap-3 border-b border-[#E5EAF0] bg-white px-5 py-1.5"}>
        <div>
          <h1 className={isDarkTheme ? "text-base font-semibold tracking-tight text-slate-50" : "text-base font-semibold tracking-tight text-slate-950"}>K线看盘</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <SymbolSearchInput
            key={symbol}
            isDarkTheme={isDarkTheme}
            marketOptions={marketOptions}
            symbol={symbol}
            onSymbolChange={onSymbolChange}
          />
          <div className={isDarkTheme ? "flex h-[30px] items-center gap-1 rounded-full border border-white/[0.075] bg-white/[0.035] p-0.5" : "flex h-[30px] items-center gap-1 rounded-full border border-[#E5EAF0] bg-[#F8FAFC] p-0.5"}>
            {intervals.map((item) => (
              <button
                key={item}
                className={item === interval ? "h-6 rounded-full bg-[#00A6F4] px-3 text-xs font-semibold text-white" : isDarkTheme ? "h-6 rounded-full px-3 text-xs font-medium text-slate-400 hover:bg-white/[0.08] hover:text-slate-100" : "h-6 rounded-full px-3 text-xs font-medium text-slate-500 hover:bg-white hover:text-slate-950"}
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
        {isInitialLoading ? <KlineLoadingOverlay isDarkTheme={isDarkTheme} /> : null}
        {loadError ? (
          <MarketDataFallbackNotice
            error={loadError}
            hasCandles={candles.length > 0}
            isDarkTheme={isDarkTheme}
          />
        ) : null}
      </div>
    </section>
  );
}

function KlineLoadingOverlay({ isDarkTheme }: { isDarkTheme: boolean }) {
  const shellClassName = isDarkTheme
    ? "pointer-events-none absolute inset-0 z-30 bg-[#181A20]/88"
    : "pointer-events-none absolute inset-0 z-30 bg-white/86";
  const barClassName = "kline-loading-bar rounded-[1px] bg-[#00A6F4]";

  return (
    <div className={`${shellClassName} flex items-center justify-center`}>
      <div className="flex items-end justify-center gap-[5px]">
        <div className={`${barClassName} h-[8px] w-[4px]`} style={{ animationDelay: "-0.32s" }} />
        <div className={`${barClassName} h-[8px] w-[4px]`} style={{ animationDelay: "-0.24s" }} />
        <div className={`${barClassName} h-[8px] w-[4px]`} style={{ animationDelay: "-0.16s" }} />
        <div className={`${barClassName} h-[14px] w-[4px]`} style={{ animationDelay: "-0.08s" }} />
        <div className={`${barClassName} h-[20px] w-[4px]`} style={{ animationDelay: "0s" }} />
      </div>
    </div>
  );
}

function MarketDataFallbackNotice({
  error,
  hasCandles,
  isDarkTheme,
}: {
  error: string;
  hasCandles: boolean;
  isDarkTheme: boolean;
}) {
  const containerClassName = isDarkTheme
    ? "pointer-events-none absolute right-4 top-4 z-40 max-w-md rounded-2xl border border-amber-500/20 bg-[#181A20]/94 px-3 py-2 text-xs text-amber-100 shadow-[0_12px_32px_rgba(0,0,0,0.22)] backdrop-blur-xl"
    : "pointer-events-none absolute right-4 top-4 z-40 max-w-md rounded-2xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-xs text-amber-800 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl";
  const mutedClassName = isDarkTheme ? "mt-1 text-[11px] leading-4 text-amber-200/70" : "mt-1 text-[11px] leading-4 text-amber-700/75";

  return (
    <div className={containerClassName}>
      <div className="font-bold">
        {hasCandles ? "实时行情源暂不可用，已切换演示行情" : "行情源暂不可用"}
      </div>
      <div className={mutedClassName}>
        原因：当前网络无法访问 Binance Futures 行情源（{error}）。
      </div>
    </div>
  );
}
