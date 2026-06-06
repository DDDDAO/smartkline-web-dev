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
  const hiddenSignalHintRef = useRef<HTMLDivElement | null>(null);
  const labelOverlayRef = useRef<HTMLDivElement | null>(null);
  const lifecycleOverlayRef = useRef<HTMLDivElement | null>(null);
  const signalDataGuideTargetRef = useRef<HTMLDivElement | null>(null);
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
  const activeSignalRef = useRef(activeSignal);
  const themeRef = useRef(theme);
  const onEventSignalSelectRef = useRef(onEventSignalSelect);
  const eventLabelRenderKey = createSignalEventRenderKey(candles, eventSignals, theme, activeSignal?.id ?? null);

  useEffect(() => {
    canLoadOlderHistoryRef.current = canLoadOlderHistory;
    isLoadingOlderHistoryRef.current = isLoadingOlderHistory;
    onLoadOlderHistoryRef.current = onLoadOlderHistory;
    eventSignalsRef.current = eventSignals;
    candlesRef.current = candles;
    activePaperPositionRef.current = activePaperPosition;
    activeSignalRef.current = activeSignal;
    themeRef.current = theme;
    onEventSignalSelectRef.current = onEventSignalSelect;
  }, [activePaperPosition, activeSignal, canLoadOlderHistory, candles, eventSignals, isLoadingOlderHistory, onEventSignalSelect, onLoadOlderHistory, theme]);

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
        fontSize: 11,
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
      const hasHiddenEventSignals = renderSignalEventLabels({
        activeSignal: activeSignalRef.current,
        candles: candlesRef.current,
        chart,
        overlay: labelOverlayRef.current,
        signals: eventSignalsRef.current,
        onSignalSelect: onEventSignalSelectRef.current,
        theme: themeRef.current,
      });
      const hasHiddenLifecycleSignals = renderPaperPositionLifecycleLabels({
        candles: candlesRef.current,
        chart,
        overlay: lifecycleOverlayRef.current,
        paperPosition: activePaperPositionRef.current,
        series: candleSeries,
        signal: activeSignalRef.current,
        theme: themeRef.current,
      });
      if (lifecycleOverlayRef.current) {
        lifecycleOverlayRef.current.dataset.lifecycleHiddenRight = String(hasHiddenLifecycleSignals);
      }
      updateSignalDataGuideTarget({
        annotationOverlay: lifecycleOverlayRef.current,
        candles: candlesRef.current,
        element: signalDataGuideTargetRef.current,
        paperPosition: activePaperPositionRef.current,
        series: candleSeries,
        signal: activeSignalRef.current,
      });
      renderHiddenSignalHint({
        element: hiddenSignalHintRef.current,
        isDarkTheme: themeRef.current === "dark",
        isVisible: hasHiddenEventSignals || hasHiddenLifecycleSignals,
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
        fontSize: 11,
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
      labelOverlayRef.current?.removeAttribute("data-signal-event-hidden-right");
      lifecycleOverlayRef.current?.removeAttribute("data-lifecycle-hidden-right");
      renderHiddenSignalHint({ element: hiddenSignalHintRef.current, isDarkTheme: theme === "dark", isVisible: false });
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
    const hasHiddenEventSignals = renderSignalEventLabels({
      activeSignal: activeSignalRef.current,
      candles: candlesRef.current,
      chart: chartRef.current,
      overlay: labelOverlayRef.current,
      signals: eventSignalsRef.current,
      onSignalSelect: onEventSignalSelectRef.current,
      theme: themeRef.current,
    });
    renderHiddenSignalHint({
      element: hiddenSignalHintRef.current,
      isDarkTheme: themeRef.current === "dark",
      isVisible: hasHiddenEventSignals || lifecycleOverlayRef.current?.dataset.lifecycleHiddenRight === "true",
    });
    updateSignalDataGuideTarget({
      annotationOverlay: lifecycleOverlayRef.current,
      candles: candlesRef.current,
      element: signalDataGuideTargetRef.current,
      paperPosition: activePaperPositionRef.current,
      series: candleSeriesRef.current,
      signal: activeSignalRef.current,
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
      ? createSignalPriceLines(activeSignal, candles.at(-1)?.close, theme).map((line) => series.createPriceLine(line))
      : [];

    signalRayPrimitiveRef.current?.applyOptions({
      candles,
      paperPosition: activePaperPosition,
      signal: activeSignal,
      signalAiSummary: aiSummary,
      theme,
    });
    const hasHiddenLifecycleSignals = renderPaperPositionLifecycleLabels({
      candles,
      chart: chartRef.current,
      overlay: lifecycleOverlayRef.current,
      paperPosition: activePaperPosition,
      series,
      signal: activeSignal,
      theme,
    });
    if (lifecycleOverlayRef.current) {
      lifecycleOverlayRef.current.dataset.lifecycleHiddenRight = String(hasHiddenLifecycleSignals);
    }
    renderHiddenSignalHint({
      element: hiddenSignalHintRef.current,
      isDarkTheme: theme === "dark",
      isVisible: hasHiddenLifecycleSignals || labelOverlayRef.current?.dataset.signalEventHiddenRight === "true",
    });
    updateSignalDataGuideTarget({
      annotationOverlay: lifecycleOverlayRef.current,
      candles,
      element: signalDataGuideTargetRef.current,
      paperPosition: activePaperPosition,
      series,
      signal: activeSignal,
    });
  }, [activePaperPosition, activeSignal, aiSummary, candles, theme]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div ref={signalDataGuideTargetRef} data-guide-target="kline-signal-data" aria-hidden="true" className="pointer-events-none absolute z-10" />
      <div data-guide-target="kline-kol-avatars" aria-hidden="true" className="pointer-events-none absolute bottom-2 left-4 right-[124px] z-10 h-28" />
      <div ref={hiddenSignalHintRef} aria-hidden="true" className="hidden" />
      <div ref={labelOverlayRef} className="pointer-events-none absolute inset-0 z-20 overflow-hidden" />
      <div ref={lifecycleOverlayRef} className="pointer-events-none absolute inset-0 z-30 overflow-hidden" />
      <AiSignalSummaryOverlay summary={aiSummary} theme={theme} />
    </div>
  );
}

function updateSignalDataGuideTarget(input: {
  annotationOverlay: HTMLDivElement | null;
  candles: readonly MarketCandle[];
  element: HTMLDivElement | null;
  paperPosition: PaperPositionRecord | null;
  series: ISeriesApi<"Candlestick"> | null;
  signal: StructuredSignal | null;
}): void {
  const { annotationOverlay, candles, element, paperPosition, series, signal } = input;
  const container = element?.parentElement;
  if (!element || !container) {
    return;
  }

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  if (containerWidth <= 0 || containerHeight <= 0) {
    return;
  }

  const fallbackLeft = 24;
  const fallbackTop = Math.round(containerHeight * 0.26);
  const fallbackWidth = Math.max(180, containerWidth - fallbackLeft - 4);
  const fallbackHeight = Math.max(180, Math.round(containerHeight * 0.42));

  if (!series || !signal) {
    applyGuideTargetStyle(element, {
      height: fallbackHeight,
      left: fallbackLeft,
      top: fallbackTop,
      width: fallbackWidth,
    });
    return;
  }

  const priceCoordinates = collectSignalGuidePrices(signal, paperPosition, candles)
    .flatMap((price) => {
      const coordinate = series.priceToCoordinate(price);
      const numericCoordinate = coordinate === null ? null : Number(coordinate);
      return numericCoordinate !== null && Number.isFinite(numericCoordinate) ? [numericCoordinate] : [];
    });

  if (priceCoordinates.length === 0) {
    applyGuideTargetStyle(element, {
      height: fallbackHeight,
      left: fallbackLeft,
      top: fallbackTop,
      width: fallbackWidth,
    });
    return;
  }

  const annotationRect = collectSignalAnnotationRect(container, annotationOverlay);
  const verticalCoordinates = annotationRect
    ? [...priceCoordinates, annotationRect.top, annotationRect.bottom]
    : priceCoordinates;
  const minY = Math.min(...verticalCoordinates);
  const maxY = Math.max(...verticalCoordinates);
  const verticalPadding = 58;
  const minHeight = 172;
  const rawTop = minY - verticalPadding;
  const rawBottom = maxY + verticalPadding;
  const height = Math.min(Math.max(rawBottom - rawTop, minHeight), Math.max(180, containerHeight - 110));
  const centerY = (minY + maxY) / 2;
  const top = clamp(centerY - height / 2, 54, Math.max(54, containerHeight - height - 40));
  const rightEdge = containerWidth - 4;
  const annotationLeft = annotationRect ? Math.max(0, annotationRect.left - 88) : Math.round(containerWidth * 0.06);
  const left = clamp(Math.min(24, annotationLeft), 0, Math.max(0, rightEdge - 300));
  const width = Math.max(180, rightEdge - left);

  applyGuideTargetStyle(element, { height, left, top, width });
}

function collectSignalAnnotationRect(
  container: HTMLElement,
  overlay: HTMLDivElement | null,
): { bottom: number; left: number; right: number; top: number } | null {
  if (!overlay) {
    return null;
  }

  const containerRect = container.getBoundingClientRect();
  let bottom = Number.NEGATIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;

  for (const element of overlay.querySelectorAll<HTMLElement>('[data-guide-annotation="kline-signal"]')) {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    bottom = Math.max(bottom, rect.bottom - containerRect.top);
    left = Math.min(left, rect.left - containerRect.left);
    right = Math.max(right, rect.right - containerRect.left);
    top = Math.min(top, rect.top - containerRect.top);
  }

  if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(top) || !Number.isFinite(bottom)) {
    return null;
  }

  return {
    bottom: clamp(bottom, 0, container.clientHeight),
    left: clamp(left, 0, container.clientWidth),
    right: clamp(right, 0, container.clientWidth),
    top: clamp(top, 0, container.clientHeight),
  };
}

function collectSignalGuidePrices(
  signal: StructuredSignal,
  paperPosition: PaperPositionRecord | null,
  candles: readonly MarketCandle[],
): number[] {
  const prices = [
    signal.entry_min,
    signal.entry_max,
    signal.trigger_price,
    signal.stop_loss,
    ...signal.take_profit,
    paperPosition?.entryPrice ?? null,
    paperPosition?.exitPrice ?? null,
    paperPosition?.currentPrice ?? null,
    candles.at(-1)?.close ?? null,
  ];

  return prices.filter((price): price is number => price !== null && Number.isFinite(price) && price > 0);
}

function applyGuideTargetStyle(
  element: HTMLDivElement,
  rect: { height: number; left: number; top: number; width: number },
): void {
  element.style.left = `${rect.left}px`;
  element.style.top = `${rect.top}px`;
  element.style.width = `${rect.width}px`;
  element.style.height = `${rect.height}px`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function renderHiddenSignalHint(input: {
  element: HTMLDivElement | null;
  isDarkTheme: boolean;
  isVisible: boolean | undefined;
}) {
  const { element, isDarkTheme, isVisible } = input;
  if (!element) {
    return;
  }

  element.classList.toggle("hidden", !isVisible);
  element.style.color = isDarkTheme ? "rgba(148, 163, 184, 0.96)" : "rgba(51, 65, 85, 0.92)";
}
