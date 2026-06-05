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
  type LogicalRange,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import { AiSignalSummaryOverlay } from "./kline-chart/ai-signal-summary-overlay";
import { ChartPaperPositionOverlay } from "./kline-chart/paper-position-overlay";
import { renderPaperPositionLifecycleLabels } from "./kline-chart/paper-position-lifecycle-labels";
import { createChartPalette } from "./kline-chart/palette";
import { createSignalPriceLines, toVolumeData } from "./kline-chart/series-data";
import { createSignalEventRenderKey, renderSignalEventLabels } from "./kline-chart/signal-event-labels";
import { SignalPriceRayPrimitive } from "./kline-chart/signal-price-ray-primitive";
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
  isLoadingOlderHistory: boolean;
  theme: ChartTheme;
  onEventSignalSelect: (signal: StructuredSignal) => void;
  onLoadOlderHistory: () => void;
};

const LEFT_EDGE_HISTORY_THRESHOLD_BARS = 80;

export function KlineChart({
  activePaperPosition,
  activeSignal,
  aiSummary,
  candles,
  canLoadOlderHistory,
  eventSignals,
  isLoadingOlderHistory,
  theme,
  onLoadOlderHistory,
  onEventSignalSelect,
}: KlineChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const labelOverlayRef = useRef<HTMLDivElement | null>(null);
  const lifecycleOverlayRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const priceLineRefs = useRef<IPriceLine[]>([]);
  const signalRayPrimitiveRef = useRef<SignalPriceRayPrimitive | null>(null);
  const hasFittedContentRef = useRef(false);
  const canLoadOlderHistoryRef = useRef(canLoadOlderHistory);
  const isLoadingOlderHistoryRef = useRef(isLoadingOlderHistory);
  const onLoadOlderHistoryRef = useRef(onLoadOlderHistory);
  const eventSignalsRef = useRef(eventSignals);
  const candlesRef = useRef(candles);
  const activePaperPositionRef = useRef(activePaperPosition);
  const themeRef = useRef(theme);
  const onEventSignalSelectRef = useRef(onEventSignalSelect);
  const eventLabelRenderKey = createSignalEventRenderKey(candles, eventSignals, theme);

  useEffect(() => {
    canLoadOlderHistoryRef.current = canLoadOlderHistory;
    isLoadingOlderHistoryRef.current = isLoadingOlderHistory;
    onLoadOlderHistoryRef.current = onLoadOlderHistory;
    eventSignalsRef.current = eventSignals;
    candlesRef.current = candles;
    activePaperPositionRef.current = activePaperPosition;
    themeRef.current = theme;
    onEventSignalSelectRef.current = onEventSignalSelect;
  }, [activePaperPosition, canLoadOlderHistory, candles, eventSignals, isLoadingOlderHistory, onEventSignalSelect, onLoadOlderHistory, theme]);

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
      renderPaperPositionLifecycleLabels({
        candles: candlesRef.current,
        chart,
        overlay: lifecycleOverlayRef.current,
        paperPosition: activePaperPositionRef.current,
        series: candleSeries,
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
    candleSeries.attachPrimitive(signalRayPrimitive);

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    signalRayPrimitiveRef.current = signalRayPrimitive;

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
      candleSeries.detachPrimitive(signalRayPrimitive);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      signalRayPrimitiveRef.current = null;
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
      signalRayPrimitiveRef.current?.applyOptions({ candles, paperPosition: null, signal: null, signalAiSummary: null, theme });
      labelOverlayRef.current?.replaceChildren();
      lifecycleOverlayRef.current?.replaceChildren();
      hasFittedContentRef.current = false;
      return;
    }

    candleSeriesRef.current.setData([...candles]);
    volumeSeriesRef.current.setData(candles.map((candle) => toVolumeData(candle, theme)));

    if (!hasFittedContentRef.current) {
      chartRef.current?.timeScale().fitContent();
      hasFittedContentRef.current = true;
    }
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
      signalAiSummary: aiSummary,
      theme,
    });
    renderPaperPositionLifecycleLabels({
      candles,
      chart: chartRef.current,
      overlay: lifecycleOverlayRef.current,
      paperPosition: activePaperPosition,
      series,
      theme,
    });
  }, [activePaperPosition, activeSignal, aiSummary, candles, theme]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div ref={labelOverlayRef} className="pointer-events-none absolute inset-0 z-20 overflow-hidden" />
      <div ref={lifecycleOverlayRef} className="pointer-events-none absolute inset-0 z-30 overflow-hidden" />
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
