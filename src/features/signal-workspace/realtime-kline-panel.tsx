import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { intervals } from "@/lib/demo-data";
import { createSignalAiSummary } from "@/lib/signal-ai-summary";
import { getWorkspaceCopy, type WorkspaceLanguage } from "@/i18n/workspace";
import {
  CHART_CANDLE_PAGE_LIMIT,
  fetchHistoricalCandles,
  prependHistoricalCandles,
  subscribeToBinanceKlines,
  upsertCandle,
  upsertCandles,
} from "@/lib/binance-market-data";
import type { KlineChartProps } from "@/components/charts/kline-chart";
import type { ChartTheme, ChartTimeFocusRequest, KlineSignalBiasSummary, PriceColorMode } from "@/components/charts/kline-chart/types";
import type { PaperPositionRecord } from "@/lib/paper-position";
import type { CopyTradingTradeMarker } from "@/types/copy-trading";
import type { KlineInterval, MarketCandle, MarketSymbol } from "@/types/market";
import type { StructuredSignal } from "@/types/signal";
import { SymbolSearchInput } from "./symbol-search-input";

const LATEST_CANDLE_BACKFILL_INTERVAL_MS = 60_000;
const LATEST_CANDLE_BACKFILL_LIMIT = 3;
const MARKET_CANDLE_UPDATE_NOTIFY_INTERVAL_MS = 1_000;
const EMPTY_MARKET_CANDLES: readonly MarketCandle[] = [];
const KlineChart = dynamic<KlineChartProps>(
  () => import("@/components/charts/kline-chart").then((module) => module.KlineChart),
  { loading: () => null },
);

export const RealtimeKlinePanel = memo(function RealtimeKlinePanel({
  activePaperPosition,
  activeSignal,
  focusSignalRequestKey,
  focusTimeRequest,
  isActivePaperPositionReady,
  isCompactLayout,
  interval,
  language,
  marketOptions,
  priceColorMode,
  signalBiasSummary,
  symbol,
  signals,
  theme,
  tradeMarkers,
  onIntervalChange,
  onSymbolChange,
  onSignalSelect,
  onFocusSignalRequestHandled,
  onFocusTimeRequestHandled,
  onMarketCandleUpdate,
  onTradeMarkerSelect,
}: {
  activePaperPosition: PaperPositionRecord | null;
  activeSignal: StructuredSignal | null;
  focusSignalRequestKey: string | null;
  focusTimeRequest?: ChartTimeFocusRequest | null;
  isActivePaperPositionReady: boolean;
  isCompactLayout: boolean;
  interval: KlineInterval;
  language: WorkspaceLanguage;
  marketOptions: readonly MarketSymbol[];
  priceColorMode: PriceColorMode;
  signalBiasSummary?: KlineSignalBiasSummary | null;
  symbol: MarketSymbol;
  signals: readonly StructuredSignal[];
  theme: ChartTheme;
  tradeMarkers: readonly CopyTradingTradeMarker[];
  onIntervalChange: (interval: KlineInterval) => void;
  onSymbolChange: (symbol: MarketSymbol) => void;
  onSignalSelect: (signal: StructuredSignal) => void;
  onFocusSignalRequestHandled: () => void;
  onFocusTimeRequestHandled?: () => void;
  onMarketCandleUpdate?: (update: { candles: readonly MarketCandle[]; interval: KlineInterval; symbol: MarketSymbol }) => void;
  onTradeMarkerSelect?: (marker: CopyTradingTradeMarker) => void;
}) {
  const [candles, setCandles] = useState<MarketCandle[]>([]);
  const [canLoadOlderHistory, setCanLoadOlderHistory] = useState(true);
  const [isLoadingOlderHistory, setIsLoadingOlderHistory] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const candlesRef = useRef<readonly MarketCandle[]>([]);
  const isLoadingOlderHistoryRef = useRef(false);
  const isDarkTheme = theme === "dark";
  const copy = getWorkspaceCopy(language);
  const isInitialLoading = candles.length === 0 && !loadError;
  const chartEventSignals = useMemo(() => signals.filter((signal) => signal.symbol === symbol), [signals, symbol]);
  const chartRawTradeMarkers = useMemo(() => tradeMarkers.filter((marker) => marker.symbol === symbol), [symbol, tradeMarkers]);
  const hasTradeMarkersMissingPrice = useMemo(
    () => chartRawTradeMarkers.some((marker) => marker.price === null || !Number.isFinite(marker.price)),
    [chartRawTradeMarkers],
  );
  const fallbackTradeMarkerCandles = hasTradeMarkersMissingPrice ? candles : EMPTY_MARKET_CANDLES;
  const chartTradeMarkers = useMemo(
    () => hasTradeMarkersMissingPrice
      ? withCandleFallbackTradeMarkerPrices(chartRawTradeMarkers, fallbackTradeMarkerCandles)
      : chartRawTradeMarkers,
    [chartRawTradeMarkers, fallbackTradeMarkerCandles, hasTradeMarkersMissingPrice],
  );
  const chartTradeMarkersById = useMemo(
    () => new Map(chartTradeMarkers.map((marker) => [marker.id, marker])),
    [chartTradeMarkers],
  );
  const aiSummary = useMemo(() => createSignalAiSummary(chartEventSignals, language), [chartEventSignals, language]);

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    isLoadingOlderHistoryRef.current = isLoadingOlderHistory;
  }, [isLoadingOlderHistory]);

  useEffect(() => {
    let isActive = true;
    const abortController = new AbortController();
    let unsubscribe: (() => void) | null = null;
    let latestBackfillIntervalId: number | null = null;
    let realtimeCandleFrameId: number | null = null;
    let pendingRealtimeCandle: MarketCandle | null = null;
    let lastMarketCandleNotifiedAtMs = 0;

    const notifyMarketCandleUpdate = (nextCandle: MarketCandle) => {
      if (!onMarketCandleUpdate) {
        return;
      }

      const nowMs = Date.now();
      if (nowMs - lastMarketCandleNotifiedAtMs < MARKET_CANDLE_UPDATE_NOTIFY_INTERVAL_MS) {
        return;
      }

      lastMarketCandleNotifiedAtMs = nowMs;
      onMarketCandleUpdate({ candles: [nextCandle], interval, symbol });
    };

    const flushRealtimeCandle = () => {
      realtimeCandleFrameId = null;
      const nextCandle = pendingRealtimeCandle;
      pendingRealtimeCandle = null;
      if (!isActive || !nextCandle) {
        return;
      }

      setCandles((currentCandles) => upsertCandle(currentCandles, nextCandle));
      notifyMarketCandleUpdate(nextCandle);
    };

    const scheduleRealtimeCandle = (nextCandle: MarketCandle) => {
      pendingRealtimeCandle = nextCandle;
      if (realtimeCandleFrameId !== null) {
        return;
      }

      realtimeCandleFrameId = window.requestAnimationFrame(flushRealtimeCandle);
    };

    const backfillLatestCandles = () => {
      fetchHistoricalCandles(symbol, interval, {
        limit: LATEST_CANDLE_BACKFILL_LIMIT,
        signal: abortController.signal,
      })
        .then((latestCandles) => {
          if (!isActive) {
            return;
          }

          if (latestCandles.length > 0) {
            setCandles((currentCandles) => upsertCandles(currentCandles, latestCandles));
            onMarketCandleUpdate?.({ candles: latestCandles, interval, symbol });
          }
          setLoadError(null);
        })
        .catch((error: unknown) => {
          if (isActive && !isAbortError(error)) {
            setLoadError(error instanceof Error ? error.message : String(error));
          }
        });
    };

    fetchHistoricalCandles(symbol, interval, {
      limit: CHART_CANDLE_PAGE_LIMIT,
      signal: abortController.signal,
    })
      .then((historicalCandles) => {
        if (!isActive) {
          return;
        }

        setCandles(historicalCandles);
        setCanLoadOlderHistory(historicalCandles.length >= CHART_CANDLE_PAGE_LIMIT);
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

            scheduleRealtimeCandle(nextCandle);
          },
        });
        latestBackfillIntervalId = window.setInterval(backfillLatestCandles, LATEST_CANDLE_BACKFILL_INTERVAL_MS);
      })
      .catch((error: unknown) => {
        if (isActive && !isAbortError(error)) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      isActive = false;
      abortController.abort();
      if (latestBackfillIntervalId !== null) {
        window.clearInterval(latestBackfillIntervalId);
      }
      if (realtimeCandleFrameId !== null) {
        window.cancelAnimationFrame(realtimeCandleFrameId);
      }
      unsubscribe?.();
    };
  }, [interval, onMarketCandleUpdate, symbol]);

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
        limit: CHART_CANDLE_PAGE_LIMIT,
        untilMs: oldestLoadedCandle.sourceTimeMs,
      });

      if (olderCandles.length === 0) {
        setCanLoadOlderHistory(false);
        return;
      }

      setCandles((currentCandles) => prependHistoricalCandles(currentCandles, olderCandles));
      setCanLoadOlderHistory(olderCandles.length >= CHART_CANDLE_PAGE_LIMIT);
      setLoadError(null);
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      isLoadingOlderHistoryRef.current = false;
      setIsLoadingOlderHistory(false);
    }
  }, [canLoadOlderHistory, interval, symbol]);

  return (
    <section className={isDarkTheme ? "flex h-[calc(100dvh-11.25rem)] min-h-[360px] w-full flex-1 flex-col overflow-hidden rounded-[22px] border border-white/[0.075] bg-[#181A20] lg:h-full lg:min-h-0 lg:rounded-[24px]" : "flex h-[calc(100dvh-11.25rem)] min-h-[360px] w-full flex-1 flex-col overflow-hidden rounded-[22px] border border-[#E8E8EC] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.035)] lg:h-full lg:min-h-0 lg:rounded-[24px]"}>
      <div className={isDarkTheme ? "relative z-50 flex min-h-[48px] items-start justify-start border-b border-white/[0.075] bg-white/[0.055] px-3 py-3 sm:px-5 lg:items-center lg:py-1.5" : "relative z-50 flex min-h-[48px] items-start justify-start border-b border-[#E8E8EC] bg-white px-3 py-3 sm:px-5 lg:items-center lg:py-1.5"}>
        <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-start lg:w-auto">
          <SymbolSearchInput
            key={symbol}
            isDarkTheme={isDarkTheme}
            language={language}
            marketOptions={marketOptions}
            symbol={symbol}
            onSymbolChange={onSymbolChange}
          />
          <div className="min-w-0 overflow-x-auto pb-0.5">
            <div className={isDarkTheme ? "inline-flex h-[30px] min-w-max items-center gap-1 rounded-full border border-white/[0.075] bg-white/[0.035] p-0.5 lg:h-9" : "inline-flex h-[30px] min-w-max items-center gap-1 rounded-full border border-[#E8E8EC] bg-[#FAFAFA] p-0.5 lg:h-9"}>
              {intervals.map((item) => (
                <button
                  key={item}
                  className={item === interval ? "h-6 rounded-full bg-[#6366F1] px-3 text-xs font-semibold text-white lg:h-8 lg:px-4 lg:text-sm" : isDarkTheme ? "h-6 rounded-full px-3 text-xs font-medium text-slate-400 hover:bg-white/[0.08] hover:text-slate-100 lg:h-8 lg:px-4 lg:text-sm" : "h-6 rounded-full px-3 text-xs font-medium text-slate-500 hover:bg-white hover:text-slate-950 lg:h-8 lg:px-4 lg:text-sm"}
                  type="button"
                  onClick={() => onIntervalChange(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <KlineChart
          activePaperPosition={activePaperPosition}
          activeSignalDrawingReady={isActivePaperPositionReady}
          activeSignal={activeSignal}
          aiSummary={aiSummary}
          language={language}
          candles={candles}
          canLoadOlderHistory={canLoadOlderHistory}
          eventSignals={chartEventSignals}
          focusSignalRequestKey={focusSignalRequestKey}
          focusTimeRequest={focusTimeRequest}
          interval={interval}
          isCompactLayout={isCompactLayout}
          isLoadingOlderHistory={isLoadingOlderHistory}
          priceColorMode={priceColorMode}
          signalBiasSummary={signalBiasSummary ?? null}
          theme={theme}
          tradeMarkers={chartTradeMarkers}
          onEventSignalSelect={onSignalSelect}
          onFocusSignalRequestHandled={onFocusSignalRequestHandled}
          onFocusTimeRequestHandled={onFocusTimeRequestHandled}
          onLoadOlderHistory={loadOlderHistory}
          onTradeMarkerSelect={onTradeMarkerSelect
            ? (markerId) => {
              const marker = chartTradeMarkersById.get(markerId);
              if (marker) {
                onTradeMarkerSelect(marker);
              }
            }
            : undefined}
        />
        {isInitialLoading ? <KlineLoadingOverlay isDarkTheme={isDarkTheme} /> : null}
        {loadError && candles.length === 0 ? (
          <MarketEnvironmentGuide copy={copy} error={loadError} isDarkTheme={isDarkTheme} />
        ) : loadError ? (
          <div className={isDarkTheme ? "pointer-events-none absolute right-4 top-4 z-40 max-w-md rounded-2xl border border-amber-500/20 bg-[#181A20]/94 px-3 py-2 text-xs text-amber-100 shadow-[0_12px_32px_rgba(0,0,0,0.22)] backdrop-blur-xl" : "pointer-events-none absolute right-4 top-4 z-40 max-w-md rounded-2xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-xs text-amber-800 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl"}>
            {copy.realtime.errorInline(loadError)}
          </div>
        ) : null}
      </div>
    </section>
  );
});

function KlineLoadingOverlay({ isDarkTheme }: { isDarkTheme: boolean }) {
  const shellClassName = isDarkTheme
    ? "pointer-events-none absolute inset-0 z-30 bg-[#181A20]/88"
    : "pointer-events-none absolute inset-0 z-30 bg-white/86";
  const barClassName = "kline-loading-bar rounded-[1px] bg-[#6366F1]";

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

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function withCandleFallbackTradeMarkerPrices(
  markers: readonly CopyTradingTradeMarker[],
  candles: readonly MarketCandle[],
): CopyTradingTradeMarker[] {
  if (markers.length === 0) {
    return [];
  }

  return markers.map((marker) => {
    if (marker.price !== null && Number.isFinite(marker.price)) {
      return marker;
    }

    const candle = findPrecedingCandle(candles, marker.sourceTimeMs);
    if (!candle || !Number.isFinite(candle.close)) {
      return marker;
    }

    return {
      ...marker,
      price: candle.close,
      priceText: formatTradeMarkerFallbackPrice(candle.close),
      title: marker.title.includes("@")
        ? marker.title
        : `${marker.title} @ ${formatTradeMarkerFallbackPrice(candle.close)}`,
    };
  });
}

function findPrecedingCandle(candles: readonly MarketCandle[], sourceTimeMs: number): MarketCandle | null {
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

  return candles[Math.max(0, high)] ?? candles[0] ?? null;
}

function formatTradeMarkerFallbackPrice(value: number): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Math.abs(value) >= 1_000 ? 2 : Math.abs(value) >= 1 ? 4 : 6,
  });
}

function MarketEnvironmentGuide({ copy, error, isDarkTheme }: { copy: ReturnType<typeof getWorkspaceCopy>; error: string; isDarkTheme: boolean }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center px-6">
      <div className={isDarkTheme ? "w-[min(640px,calc(100vw-3rem))] rounded-3xl border border-slate-700 bg-slate-950/92 p-6 text-slate-100 shadow-2xl backdrop-blur" : "w-[min(640px,calc(100vw-3rem))] rounded-3xl border border-slate-200 bg-white/94 p-6 text-slate-950 shadow-2xl backdrop-blur"}>
        <div className="text-sm font-bold text-[#6366F1]">{copy.realtime.guideEyebrow}</div>
        <h3 className="mt-2 text-xl font-black">{copy.realtime.guideTitle}</h3>
        <div className={isDarkTheme ? "mt-3 text-[13px] leading-6 text-slate-300" : "mt-3 text-[13px] leading-6 text-slate-600"}>
          <p className="whitespace-nowrap">
            {"\u5efa\u8bae\u5207\u6362\u81f3"}
            <span className="font-bold text-[#6366F1]">{copy.realtime.guideEnvironment}</span>
            {"\u7684\u7f51\u7edc\u73af\u5883\u540e\u91cd\u8bd5\u3002"}
          </p>
        </div>
        <div className={isDarkTheme ? "mt-4 rounded-2xl bg-slate-900 p-3 text-xs leading-5 text-slate-400" : "mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-500"}>
          <div>{copy.realtime.guideCurrentError(error)}</div>
        </div>
      </div>
    </div>
  );
}
