"use client";

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type Logical,
  type LogicalRange,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";
import { useEffect, useMemo, useRef } from "react";
import { AiSignalSummaryOverlay } from "./kline-chart/ai-signal-summary-overlay";
import { ChartPaperPositionOverlay } from "./kline-chart/paper-position-overlay";
import { createChartPalette } from "./kline-chart/palette";
import { createSignalPriceLines, toVolumeData } from "./kline-chart/series-data";
import { createSignalEventRenderKey, renderSignalEventLabels } from "./kline-chart/signal-event-labels";
import { SignalPriceRayPrimitive } from "./kline-chart/signal-price-ray-primitive";
import { readTradePointMarkerId, TradePointPrimitive, type KlineTradePointMarker } from "./kline-chart/trade-point-primitive";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { SignalAiSummary } from "@/app/_lib/signal-ai-summary";
import type { MarketCandle } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";

export type ChartTheme = "light" | "dark";

type KlineChartProps = {
  activePaperPosition: PaperPositionRecord | null;
  activeSignal: StructuredSignal | null;
  aiSummary: SignalAiSummary | null;
  candles: readonly MarketCandle[];
  canLoadOlderHistory: boolean;
  eventSignals: readonly StructuredSignal[];
  focusSignalRequestKey: string | null;
  isLoadingOlderHistory: boolean;
  theme: ChartTheme;
  tradeMarkers: readonly KlineTradePointMarker[];
  onEventSignalSelect: (signal: StructuredSignal) => void;
  onFocusSignalRequestHandled: () => void;
  onLoadOlderHistory: () => void;
};

const LEFT_EDGE_HISTORY_THRESHOLD_BARS = 80;
const INITIAL_VISIBLE_CANDLE_COUNT = 240;
const RIGHT_EDGE_FOLLOW_THRESHOLD_BARS = 2;

export function KlineChart({
  activePaperPosition,
  activeSignal,
  aiSummary,
  candles,
  canLoadOlderHistory,
  eventSignals,
  focusSignalRequestKey,
  isLoadingOlderHistory,
  theme,
  tradeMarkers,
  onLoadOlderHistory,
  onEventSignalSelect,
  onFocusSignalRequestHandled,
}: KlineChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const labelOverlayRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const priceLineRefs = useRef<IPriceLine[]>([]);
  const signalRayPrimitiveRef = useRef<SignalPriceRayPrimitive | null>(null);
  const tradePointPrimitiveRef = useRef<TradePointPrimitive | null>(null);
  const hasFittedContentRef = useRef(false);
  const canLoadOlderHistoryRef = useRef(canLoadOlderHistory);
  const isLoadingOlderHistoryRef = useRef(isLoadingOlderHistory);
  const onLoadOlderHistoryRef = useRef(onLoadOlderHistory);
  const eventSignalsRef = useRef(eventSignals);
  const tradeMarkersRef = useRef(tradeMarkers);
  const candlesRef = useRef(candles);
  const renderedCandlesRef = useRef<readonly MarketCandle[]>([]);
  const activeSignalRef = useRef(activeSignal);
  const themeRef = useRef(theme);
  const onEventSignalSelectRef = useRef(onEventSignalSelect);
  const handledFocusSignalRequestKeyRef = useRef<string | null>(null);
  const eventLabelRenderKey = createSignalEventRenderKey(candles, eventSignals, theme);
  const paperTradeMarkers = useMemo(() => createPaperPositionTradeMarkers(activePaperPosition, activeSignal), [activePaperPosition, activeSignal]);
  const renderedTradeMarkers = useMemo(
    () => paperTradeMarkers.length > 0 ? [...tradeMarkers, ...paperTradeMarkers] : tradeMarkers,
    [paperTradeMarkers, tradeMarkers],
  );

  useEffect(() => {
    canLoadOlderHistoryRef.current = canLoadOlderHistory;
    isLoadingOlderHistoryRef.current = isLoadingOlderHistory;
    onLoadOlderHistoryRef.current = onLoadOlderHistory;
    eventSignalsRef.current = eventSignals;
    tradeMarkersRef.current = renderedTradeMarkers;
    candlesRef.current = candles;
    activeSignalRef.current = activeSignal;
    themeRef.current = theme;
    onEventSignalSelectRef.current = onEventSignalSelect;
  }, [activePaperPosition, activeSignal, canLoadOlderHistory, candles, eventSignals, isLoadingOlderHistory, onEventSignalSelect, onLoadOlderHistory, renderedTradeMarkers, theme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const palette = createChartPalette(themeRef.current);
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: palette.background },
        textColor: palette.text,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: palette.grid },
        horzLines: { color: palette.grid },
      },
      rightPriceScale: {
        borderColor: palette.border,
        minimumWidth: 118,
        tickMarkDensity: 4.5,
      },
      timeScale: {
        borderColor: palette.border,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: palette.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: palette.crosshairLabel },
        horzLine: { color: palette.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: palette.crosshairLabel },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: palette.up,
      downColor: palette.down,
      borderVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      wickUpColor: palette.up,
      wickDownColor: palette.down,
    });

    candleSeries.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.24 } });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });

    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    const handleVisibleLogicalRangeChange = (logicalRange: LogicalRange | null) => {
      renderSignalEventLabels({
        candles: candlesRef.current,
        chart,
        overlay: labelOverlayRef.current,
        signals: eventSignalsRef.current,
        onSignalSelect: onEventSignalSelectRef.current,
        theme: themeRef.current,
      });

      if (!logicalRange || !canLoadOlderHistoryRef.current || isLoadingOlderHistoryRef.current) {
        return;
      }

      if (logicalRange.from < LEFT_EDGE_HISTORY_THRESHOLD_BARS) {
        onLoadOlderHistoryRef.current();
      }
    };

    const signalRayPrimitive = new SignalPriceRayPrimitive();
    const tradePointPrimitive = new TradePointPrimitive();
    candleSeries.attachPrimitive(signalRayPrimitive);
    candleSeries.attachPrimitive(tradePointPrimitive);

    const handleChartClick = (param: MouseEventParams<Time>) => {
      const markerId = readTradePointMarkerId(param.hoveredObjectId);
      if (!markerId) {
        return;
      }

      const marker = tradeMarkersRef.current.find((item) => item.id === markerId);
      const signal = marker
        ? eventSignalsRef.current.find((item) => item.id === marker.signalId) ?? (activeSignalRef.current?.id === marker.signalId ? activeSignalRef.current : null)
        : null;
      if (signal) {
        onEventSignalSelectRef.current(signal);
      }
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
    chart.subscribeClick(handleChartClick);
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    signalRayPrimitiveRef.current = signalRayPrimitive;
    tradePointPrimitiveRef.current = tradePointPrimitive;

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
      chart.unsubscribeClick(handleChartClick);
      candleSeries.detachPrimitive(signalRayPrimitive);
      candleSeries.detachPrimitive(tradePointPrimitive);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      signalRayPrimitiveRef.current = null;
      tradePointPrimitiveRef.current = null;
      priceLineRefs.current = [];
      hasFittedContentRef.current = false;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    if (!chart || !candleSeries) {
      return;
    }

    const palette = createChartPalette(theme);

    chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: palette.background },
        textColor: palette.text,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: palette.grid },
        horzLines: { color: palette.grid },
      },
      rightPriceScale: {
        borderColor: palette.border,
        minimumWidth: 118,
        tickMarkDensity: 4.5,
      },
      timeScale: {
        borderColor: palette.border,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: palette.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: palette.crosshairLabel },
        horzLine: { color: palette.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: palette.crosshairLabel },
      },
    });

    candleSeries.applyOptions({
      upColor: palette.up,
      downColor: palette.down,
      borderVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      wickUpColor: palette.up,
      wickDownColor: palette.down,
    });
  }, [theme]);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) {
      return;
    }

    if (candles.length === 0) {
      candleSeriesRef.current.setData([]);
      volumeSeriesRef.current.setData([]);
      signalRayPrimitiveRef.current?.applyOptions({ candles, paperPosition: null, signal: null, theme });
      tradePointPrimitiveRef.current?.applyOptions({ activeSignalId: null, candles, markers: [], theme });
      labelOverlayRef.current?.replaceChildren();
      hasFittedContentRef.current = false;
      renderedCandlesRef.current = [];
      return;
    }

    const previousCandles = renderedCandlesRef.current;
    const previousVisibleRange = chartRef.current?.timeScale().getVisibleLogicalRange() ?? null;
    const preservedVisibleRange = resolveVisibleLogicalRangeAfterCandlesChange({
      nextCandles: candles,
      previousCandles,
      previousVisibleRange,
    });

    candleSeriesRef.current.setData([...candles]);
    volumeSeriesRef.current.setData(candles.map((candle) => toVolumeData(candle, theme)));

    if (!hasFittedContentRef.current) {
      const lastCandleIndex = candles.length - 1;
      chartRef.current?.timeScale().setVisibleLogicalRange({
        from: Math.max(0, lastCandleIndex - INITIAL_VISIBLE_CANDLE_COUNT + 1),
        to: lastCandleIndex,
      });
      hasFittedContentRef.current = true;
    } else if (preservedVisibleRange) {
      chartRef.current?.timeScale().setVisibleLogicalRange(preservedVisibleRange);
    }

    renderedCandlesRef.current = candles;
  }, [candles, theme]);

  useEffect(() => {
    renderSignalEventLabels({
      candles: candlesRef.current,
      chart: chartRef.current,
      overlay: labelOverlayRef.current,
      signals: eventSignalsRef.current,
      onSignalSelect: onEventSignalSelectRef.current,
      theme: themeRef.current,
    });
  }, [eventLabelRenderKey]);

  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) {
      return;
    }

    for (const priceLine of priceLineRefs.current) {
      series.removePriceLine(priceLine);
    }

    priceLineRefs.current = activeSignal
      ? createSignalPriceLines(activeSignal, candles.at(-1)?.close).map((line) => series.createPriceLine(line))
      : [];

    signalRayPrimitiveRef.current?.applyOptions({
      candles,
      paperPosition: activePaperPosition,
      signal: activeSignal,
      theme,
    });
    tradePointPrimitiveRef.current?.applyOptions({
      activeSignalId: activeSignal?.id ?? null,
      candles,
      markers: renderedTradeMarkers,
      theme,
    });
  }, [activePaperPosition, activeSignal, aiSummary, candles, renderedTradeMarkers, theme]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !activeSignal || !focusSignalRequestKey || candles.length === 0) {
      return;
    }

    if (focusSignalRequestKey !== createSignalFocusRequestKey(activeSignal)) {
      return;
    }

    if (handledFocusSignalRequestKeyRef.current === focusSignalRequestKey) {
      return;
    }

    const targetIndex = findNearestCandleIndex(candles, Date.parse(activeSignal.created_at));
    if (targetIndex === -1) {
      return;
    }

    /**
     * Focus is intentionally command-driven. Same-symbol signal selection only
     * redraws overlays; cross-symbol signal selection sends a one-shot request
     * so the newly loaded market opens around the selected event.
     */
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, targetIndex - 52),
      to: Math.min(candles.length - 1, targetIndex + 52),
    });
    handledFocusSignalRequestKeyRef.current = focusSignalRequestKey;
    onFocusSignalRequestHandled();
  }, [activeSignal, candles, focusSignalRequestKey, onFocusSignalRequestHandled]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div ref={labelOverlayRef} className="pointer-events-none absolute inset-0 z-20 overflow-hidden" />
      <AiSignalSummaryOverlay summary={aiSummary} theme={theme} />
      {candles.length > 0 && activePaperPosition ? (
        <ChartPaperPositionOverlay
          paperPosition={activePaperPosition}
          signal={activeSignal}
          theme={theme}
        />
      ) : null}
    </div>
  );
}

function findNearestCandleIndex(candles: readonly MarketCandle[], sourceTimeMs: number): number {
  if (!Number.isFinite(sourceTimeMs) || candles.length === 0) {
    return -1;
  }

  let nearestIndex = 0;
  let nearestDistance = Math.abs(candles[0].sourceTimeMs - sourceTimeMs);

  for (let index = 1; index < candles.length; index += 1) {
    const distance = Math.abs(candles[index].sourceTimeMs - sourceTimeMs);
    if (distance < nearestDistance) {
      nearestIndex = index;
      nearestDistance = distance;
    }
  }

  return nearestIndex;
}

export function createSignalFocusRequestKey(signal: StructuredSignal): string {
  return `${signal.id}:${signal.symbol}:${signal.created_at}`;
}

function resolveVisibleLogicalRangeAfterCandlesChange({
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

function createPaperPositionTradeMarkers(
  paperPosition: PaperPositionRecord | null,
  signal: StructuredSignal | null,
): KlineTradePointMarker[] {
  if (!paperPosition || !signal) {
    return [];
  }

  const markers: KlineTradePointMarker[] = [];

  if (paperPosition.entryPrice !== null && paperPosition.entryTimeMs !== null) {
    const side = signal.direction === "long" ? "buy" : "sell";
    markers.push({
      avatarUrl: signal.source_avatar_url,
      id: `paper-trade-point:${signal.id}:entry`,
      label: side === "buy" ? "B" : "S",
      price: paperPosition.entryPrice,
      side,
      signalId: signal.id,
      sourceTimeMs: paperPosition.entryTimeMs,
      title: `${signal.source_name} ${side === "buy" ? "买入" : "卖出"} ${signal.symbol} @ ${formatTradePointPrice(paperPosition.entryPrice)}`,
      traderName: signal.source_name,
    });
  }

  if (paperPosition.exitPrice !== null && paperPosition.exitTimeMs !== null) {
    const side = signal.direction === "long" ? "sell" : "buy";
    markers.push({
      avatarUrl: signal.source_avatar_url,
      id: `paper-trade-point:${signal.id}:exit`,
      label: side === "buy" ? "B" : "S",
      price: paperPosition.exitPrice,
      side,
      signalId: signal.id,
      sourceTimeMs: paperPosition.exitTimeMs,
      title: `${signal.source_name} ${side === "buy" ? "买入平仓" : "卖出平仓"} ${signal.symbol} @ ${formatTradePointPrice(paperPosition.exitPrice)}`,
      traderName: signal.source_name,
    });
  }

  return markers;
}

function formatTradePointPrice(value: number): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Math.abs(value) >= 1_000 ? 2 : 6,
  });
}
