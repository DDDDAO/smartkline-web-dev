"use client";

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type Logical,
  type LogicalRange,
} from "lightweight-charts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_MINI_KLINE_INTERVAL,
  MINI_KLINE_HISTORY_LOAD_THRESHOLD_BARS,
  MINI_KLINE_INTERVALS,
  MINI_KLINE_LIMIT,
} from "./constants";
import type { ThemeClasses } from "./theme";
import {
  clampAxisBadgeTop,
  formatAxisPrice,
  formatLivePrice,
  formatMiniKlineCountdown,
  formatPercent,
  formatSignedPercent,
  getCandleAmplitudePercent,
  getCandleChangePercent,
  getKlineChangeTone,
  isAbortError,
} from "./utils";
import {
  fetchHistoricalCandles,
  prependHistoricalCandles,
  subscribeToBinanceKlines,
  upsertCandle,
} from "@/app/_lib/binance-market-data";
import type { KlineInterval, MarketCandle } from "@/app/_types/market";

export function MiniKlineCard({ currentNow, isDarkTheme, price, symbol, theme }: {
  currentNow: number;
  isDarkTheme: boolean;
  price: number | null;
  symbol: string;
  theme: ThemeClasses;
}) {
  const [interval, setInterval] = useState<KlineInterval>(DEFAULT_MINI_KLINE_INTERVAL);
  const marketSymbol = useMemo(() => `${symbol}/USDT:USDT`, [symbol]);
  const [candles, setCandles] = useState<MarketCandle[]>([]);
  const [hoveredCandle, setHoveredCandle] = useState<MarketCandle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canLoadOlderHistory, setCanLoadOlderHistory] = useState(true);
  const [isLoadingOlderHistory, setIsLoadingOlderHistory] = useState(false);
  const [axisBadgeTop, setAxisBadgeTop] = useState<number | null>(null);
  const isLoadingOlderHistoryRef = useRef(false);
  const olderHistoryAbortControllerRef = useRef<AbortController | null>(null);
  const latestCandle = candles.at(-1) ?? null;
  const displayCandle = hoveredCandle ?? latestCandle;
  const displayPrice = price ?? latestCandle?.close ?? null;
  const candleCountdown = formatMiniKlineCountdown(latestCandle, interval, currentNow);

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | null = null;
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
      if (!isActive) {
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      setHoveredCandle(null);
      setAxisBadgeTop(null);
      setCanLoadOlderHistory(true);
      setIsLoadingOlderHistory(false);
      isLoadingOlderHistoryRef.current = false;
      olderHistoryAbortControllerRef.current?.abort();
      olderHistoryAbortControllerRef.current = null;
      fetchHistoricalCandles(marketSymbol, interval, {
        limit: MINI_KLINE_LIMIT,
        signal: abortController.signal,
      })
        .then((historicalCandles) => {
          if (!isActive) {
            return;
          }

          setCandles(historicalCandles);
          setLoadError(null);
          unsubscribe = subscribeToBinanceKlines(marketSymbol, interval, {
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
              if (isActive) {
                setCandles((currentCandles) => upsertCandle(currentCandles, nextCandle));
              }
            },
          });
        })
        .catch((error: unknown) => {
          if (isActive && !isAbortError(error)) {
            setCandles([]);
            setLoadError(error instanceof Error ? error.message : String(error));
          }
        })
        .finally(() => {
          if (isActive) {
            setIsLoading(false);
          }
        });
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      abortController.abort();
      olderHistoryAbortControllerRef.current?.abort();
      olderHistoryAbortControllerRef.current = null;
      unsubscribe?.();
    };
  }, [interval, marketSymbol]);

  const loadOlderHistory = useCallback(() => {
    if (isLoading || !canLoadOlderHistory || isLoadingOlderHistoryRef.current) {
      return;
    }

    const oldestCandle = candles[0];
    if (!oldestCandle) {
      return;
    }

    const abortController = new AbortController();
    olderHistoryAbortControllerRef.current?.abort();
    olderHistoryAbortControllerRef.current = abortController;
    isLoadingOlderHistoryRef.current = true;
    setIsLoadingOlderHistory(true);

    fetchHistoricalCandles(marketSymbol, interval, {
      limit: MINI_KLINE_LIMIT,
      signal: abortController.signal,
      untilMs: oldestCandle.sourceTimeMs,
    })
      .then((olderCandles) => {
        if (olderCandles.length === 0) {
          setCanLoadOlderHistory(false);
          return;
        }

        setLoadError(null);
        setCandles((currentCandles) => prependHistoricalCandles(currentCandles, olderCandles));
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (olderHistoryAbortControllerRef.current === abortController) {
          olderHistoryAbortControllerRef.current = null;
        }
        if (!abortController.signal.aborted) {
          isLoadingOlderHistoryRef.current = false;
          setIsLoadingOlderHistory(false);
        }
      });
  }, [canLoadOlderHistory, candles, interval, isLoading, marketSymbol]);

  return (
    <section className={theme.klineCard}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className={theme.klineIntervalGroup}>
          {MINI_KLINE_INTERVALS.map((item) => (
            <button
              key={item}
              className={item === interval ? theme.klineIntervalButtonActive : theme.klineIntervalButton}
              type="button"
              onClick={() => setInterval(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        <KlineMetric label="开盘" theme={theme} value={displayCandle ? formatLivePrice(displayCandle.open) : "--"} />
        <KlineMetric label="收盘" theme={theme} value={displayCandle ? formatLivePrice(displayCandle.close) : "--"} />
        <KlineMetric label="现价" theme={theme} value={formatLivePrice(displayPrice)} />
        <KlineMetric label="振幅" theme={theme} value={displayCandle ? formatPercent(getCandleAmplitudePercent(displayCandle)) : "--"} />
        <KlineMetric
          label="涨幅"
          tone={displayCandle ? getKlineChangeTone(displayCandle) : undefined}
          theme={theme}
          value={displayCandle ? formatSignedPercent(getCandleChangePercent(displayCandle)) : "--"}
        />
      </div>

      <div className="relative">
        <MiniKlineChart
          axisPrice={displayPrice}
          canLoadOlderHistory={canLoadOlderHistory}
          candles={candles}
          isDarkTheme={isDarkTheme}
          isLoadingOlderHistory={isLoadingOlderHistory}
          key={`${marketSymbol}-${interval}`}
          theme={theme}
          onAxisBadgeTopChange={setAxisBadgeTop}
          onHoverCandle={setHoveredCandle}
          onLoadOlderHistory={loadOlderHistory}
        />
        <div className={theme.klineAxisBadge} style={{ top: axisBadgeTop === null ? "50%" : `${clampAxisBadgeTop(axisBadgeTop)}px` }}>
          <div className="text-[13px] font-black leading-none tracking-[-0.03em]">{formatAxisPrice(displayPrice)}</div>
          <div className="mt-0.5 text-[11px] font-black leading-none tabular-nums tracking-[-0.02em]">{candleCountdown}</div>
        </div>
      </div>
      {isLoading || loadError ? (
        <div className={theme.klineMessage}>{isLoading ? "加载中" : "K 线暂不可用"}</div>
      ) : null}
    </section>
  );
}

function KlineMetric({ label, theme, tone, value }: { label: string; theme: ThemeClasses; tone?: "down" | "up"; value: string }) {
  return (
    <div className={theme.klineMetric}>
      <div className={theme.microLabel}>{label}</div>
      <div className={`mt-0.5 truncate text-sm font-black tracking-[-0.02em] ${tone === "up" ? "text-[#00d4aa]" : tone === "down" ? "text-[#ff4757]" : ""}`}>{value}</div>
    </div>
  );
}

function MiniKlineChart({
  axisPrice,
  candles,
  canLoadOlderHistory,
  isDarkTheme,
  isLoadingOlderHistory,
  onAxisBadgeTopChange,
  onHoverCandle,
  onLoadOlderHistory,
  theme,
}: {
  axisPrice: number | null;
  canLoadOlderHistory: boolean;
  candles: readonly MarketCandle[];
  isDarkTheme: boolean;
  isLoadingOlderHistory: boolean;
  onAxisBadgeTopChange: (coordinate: number | null) => void;
  onHoverCandle: (candle: MarketCandle | null) => void;
  onLoadOlderHistory: () => void;
  theme: ThemeClasses;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const latestPriceLineRef = useRef<IPriceLine | null>(null);
  const candlesRef = useRef<readonly MarketCandle[]>(candles);
  const renderedCandlesRef = useRef<readonly MarketCandle[]>([]);
  const hasInitializedRangeRef = useRef(false);
  const canLoadOlderHistoryRef = useRef(canLoadOlderHistory);
  const isLoadingOlderHistoryRef = useRef(isLoadingOlderHistory);
  const onAxisBadgeTopChangeRef = useRef(onAxisBadgeTopChange);
  const onHoverCandleRef = useRef(onHoverCandle);
  const onLoadOlderHistoryRef = useRef(onLoadOlderHistory);

  useEffect(() => {
    candlesRef.current = candles;
    canLoadOlderHistoryRef.current = canLoadOlderHistory;
    isLoadingOlderHistoryRef.current = isLoadingOlderHistory;
    onLoadOlderHistoryRef.current = onLoadOlderHistory;
  }, [canLoadOlderHistory, candles, isLoadingOlderHistory, onLoadOlderHistory]);

  useEffect(() => {
    onAxisBadgeTopChangeRef.current = onAxisBadgeTopChange;
  }, [onAxisBadgeTopChange]);

  useEffect(() => {
    onHoverCandleRef.current = onHoverCandle;
  }, [onHoverCandle]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const palette = createMiniKlinePalette(isDarkTheme);
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        attributionLogo: false,
        background: { type: ColorType.Solid, color: palette.background },
        fontSize: 10,
        textColor: palette.text,
      },
      grid: {
        horzLines: { color: palette.grid },
        vertLines: { color: palette.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        horzLine: { color: palette.crosshair, labelBackgroundColor: palette.crosshairLabel, style: LineStyle.Dashed, width: 1 },
        vertLine: { color: palette.crosshair, labelBackgroundColor: palette.crosshairLabel, style: LineStyle.Dashed, width: 1 },
      },
      handleScale: {
        axisDoubleClickReset: {
          price: true,
          time: true,
        },
        axisPressedMouseMove: {
          price: false,
          time: true,
        },
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        horzTouchDrag: true,
        mouseWheel: true,
        pressedMouseMove: true,
        vertTouchDrag: false,
      },
      rightPriceScale: {
        borderColor: palette.border,
        minimumWidth: 62,
        scaleMargins: { bottom: 0.12, top: 0.12 },
      },
      timeScale: {
        borderColor: palette.border,
        rightOffset: 2,
        timeVisible: true,
        secondsVisible: false,
      },
    });
    const candleSeries = chart.addSeries(CandlestickSeries, {
      borderVisible: false,
      downColor: "#ff4757",
      lastValueVisible: false,
      priceLineVisible: false,
      upColor: "#00d4aa",
      wickDownColor: "#ff4757",
      wickUpColor: "#00d4aa",
    });

    const handleVisibleLogicalRangeChange = (logicalRange: LogicalRange | null) => {
      if (!logicalRange || !canLoadOlderHistoryRef.current || isLoadingOlderHistoryRef.current) {
        return;
      }

      if (logicalRange.from < MINI_KLINE_HISTORY_LOAD_THRESHOLD_BARS) {
        onLoadOlderHistoryRef.current();
      }
    };

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        onHoverCandleRef.current(null);
        return;
      }

      const hoveredCandle = candlesRef.current.find((candle) => String(candle.time) === String(param.time)) ?? null;
      onHoverCandleRef.current(hoveredCandle);
    });
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    return () => {
      chartRef.current = null;
      candleSeriesRef.current = null;
      latestPriceLineRef.current = null;
      renderedCandlesRef.current = [];
      hasInitializedRangeRef.current = false;
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
      chart.remove();
      onAxisBadgeTopChangeRef.current(null);
      onHoverCandleRef.current(null);
    };
  }, [isDarkTheme]);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    if (!chart || !candleSeries) {
      return;
    }

    const previousCandles = renderedCandlesRef.current;
    const previousVisibleRange = chart.timeScale().getVisibleLogicalRange();
    const preservedVisibleRange = resolveMiniKlineVisibleLogicalRange({
      nextCandles: candles,
      previousCandles,
      previousVisibleRange,
    });

    candleSeries.setData(candles.map(toMiniKlineCandleData));
    if (candles.length > 0 && !hasInitializedRangeRef.current) {
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, candles.length - MINI_KLINE_LIMIT),
        to: candles.length - 1,
      });
      hasInitializedRangeRef.current = true;
    } else if (preservedVisibleRange) {
      chart.timeScale().setVisibleLogicalRange(preservedVisibleRange);
    }

    renderedCandlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) {
      return;
    }

    if (latestPriceLineRef.current) {
      series.removePriceLine(latestPriceLineRef.current);
      latestPriceLineRef.current = null;
    }

    if (axisPrice !== null && Number.isFinite(axisPrice)) {
      latestPriceLineRef.current = series.createPriceLine({
        axisLabelVisible: false,
        color: "#35bd85",
        lineStyle: LineStyle.Dashed,
        lineVisible: true,
        lineWidth: 1,
        price: axisPrice,
        title: "",
      });
    }

    const coordinate = axisPrice === null ? null : series.priceToCoordinate(axisPrice) ?? null;
    onAxisBadgeTopChange(coordinate);
  }, [axisPrice, candles, onAxisBadgeTopChange]);

  return <div ref={containerRef} className={theme.miniKlineCanvas} />;
}

function createMiniKlinePalette(isDarkTheme: boolean) {
  return {
    background: isDarkTheme ? "#20202a" : "#f8fafc",
    border: isDarkTheme ? "rgba(255,255,255,0.08)" : "#dfe7f1",
    crosshair: isDarkTheme ? "rgba(248,250,252,0.42)" : "rgba(17,24,39,0.34)",
    crosshairLabel: isDarkTheme ? "#f8fafc" : "#111827",
    grid: isDarkTheme ? "rgba(255,255,255,0.045)" : "rgba(15,23,42,0.055)",
    text: isDarkTheme ? "#a0a0b0" : "#667085",
  };
}

function toMiniKlineCandleData(candle: MarketCandle) {
  return {
    close: candle.close,
    high: candle.high,
    low: candle.low,
    open: candle.open,
    time: candle.time,
  };
}

function resolveMiniKlineVisibleLogicalRange({ nextCandles, previousCandles, previousVisibleRange }: {
  nextCandles: readonly MarketCandle[];
  previousCandles: readonly MarketCandle[];
  previousVisibleRange: LogicalRange | null;
}): LogicalRange | null {
  if (!previousVisibleRange || previousCandles.length === 0 || nextCandles.length === 0) {
    return null;
  }

  const previousFirstCandle = previousCandles[0];
  if (!previousFirstCandle) {
    return previousVisibleRange;
  }

  const firstPreviousCandleNextIndex = nextCandles.findIndex(
    (candle) => candle.sourceTimeMs === previousFirstCandle.sourceTimeMs,
  );
  if (firstPreviousCandleNextIndex > 0) {
    return {
      from: (previousVisibleRange.from + firstPreviousCandleNextIndex) as Logical,
      to: (previousVisibleRange.to + firstPreviousCandleNextIndex) as Logical,
    };
  }

  const wasFollowingLatest = previousVisibleRange.to >= previousCandles.length - 2;
  const appendedCandleCount = nextCandles.length - previousCandles.length;
  if (wasFollowingLatest && appendedCandleCount > 0) {
    return {
      from: (previousVisibleRange.from + appendedCandleCount) as Logical,
      to: (previousVisibleRange.to + appendedCandleCount) as Logical,
    };
  }

  return previousVisibleRange;
}
