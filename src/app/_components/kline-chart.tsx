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
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AiSignalSummaryOverlay } from "./kline-chart/ai-signal-summary-overlay";
import { renderPaperPositionLifecycleLabels } from "./kline-chart/paper-position-lifecycle-labels";
import { createChartPalette } from "./kline-chart/palette";
import { createSignalPriceLines, KLINE_PRICE_FORMAT, toVolumeData } from "./kline-chart/series-data";
import { createSignalEventRenderKey, renderSignalEventLabels } from "./kline-chart/signal-event-labels";
import { createSignalFocusRequestKey } from "./kline-chart/signal-focus";
import { SignalPriceRayPrimitive } from "./kline-chart/signal-price-ray-primitive";
import { readTradePointMarkerId, TradePointPrimitive, type KlineTradePointMarker } from "./kline-chart/trade-point-primitive";
import type { ChartTheme, ChartTimeFocusRequest, KlineSignalBiasSummary, PriceColorMode } from "./kline-chart/types";
import { getWorkspaceCopy, type WorkspaceLanguage } from "@/app/_lib/i18n";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { SignalAiSummary } from "@/app/_lib/signal-ai-summary";
import type { KlineInterval, MarketCandle } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";
export { createSignalFocusRequestKey } from "./kline-chart/signal-focus";
export type { ChartTheme } from "./kline-chart/types";

export type KlineChartProps = {
  activePaperPosition: PaperPositionRecord | null;
  activeSignal: StructuredSignal | null;
  activeSignalDrawingReady: boolean;
  aiSummary: SignalAiSummary | null;
  candles: readonly MarketCandle[];
  canLoadOlderHistory: boolean;
  eventSignals: readonly StructuredSignal[];
  focusSignalRequestKey: string | null;
  focusTimeRequest?: ChartTimeFocusRequest | null;
  interval: KlineInterval;
  isCompactLayout?: boolean;
  isLoadingOlderHistory: boolean;
  language: WorkspaceLanguage;
  priceColorMode: PriceColorMode;
  signalBiasSummary?: KlineSignalBiasSummary | null;
  theme: ChartTheme;
  tradeMarkers: readonly KlineTradePointMarker[];
  onEventSignalSelect: (signal: StructuredSignal) => void;
  onFocusSignalRequestHandled: () => void;
  onFocusTimeRequestHandled?: () => void;
  onLoadOlderHistory: () => void;
  onTradeMarkerSelect?: (markerId: string) => void;
};

const LEFT_EDGE_HISTORY_THRESHOLD_BARS = 80;
const RIGHT_EDGE_FOLLOW_THRESHOLD_BARS = 2;
const CANDLE_COUNTDOWN_UPDATE_MS = 1_000;
const MAX_INCREMENTAL_CANDLE_UPDATES = 8;
const DESKTOP_CHART_METRICS = {
  currentPriceTagFontSize: 13,
  currentPriceTagHeight: 42,
  currentPriceTagLineHeight: 15,
  currentPriceTagWidth: 76,
  initialVisibleCandleCount: 240,
  priceScaleTickMarkDensity: 4.5,
  rightPriceScaleWidth: 96,
} as const;
const COMPACT_CHART_METRICS = {
  currentPriceTagFontSize: 12,
  currentPriceTagHeight: 38,
  currentPriceTagLineHeight: 14,
  currentPriceTagWidth: 68,
  initialVisibleCandleCount: 104,
  priceScaleTickMarkDensity: 2.6,
  rightPriceScaleWidth: 68,
} as const;
const KLINE_INTERVAL_MS_BY_INTERVAL: Record<KlineInterval, number> = {
  "1d": 86_400_000,
  "1h": 3_600_000,
  "1m": 60_000,
  "4h": 14_400_000,
  "5m": 300_000,
  "15m": 900_000,
};

type TradeMarkerTooltipState = {
  containerHeight: number;
  containerWidth: number;
  marker: KlineTradePointMarker;
  x: number;
  y: number;
};

type HoveredCandleInfo = Pick<MarketCandle, "close" | "high" | "low" | "open">;

type HoveredCandleInfoPair = {
  label: HTMLSpanElement;
  value: HTMLSpanElement;
};

type HoveredCandleInfoChildren = {
  amplitude: HoveredCandleInfoPair;
  close: HoveredCandleInfoPair;
  high: HoveredCandleInfoPair;
  low: HoveredCandleInfoPair;
  open: HoveredCandleInfoPair;
  change: HTMLSpanElement;
};

type KlineChartMetrics = {
  currentPriceTagFontSize: number;
  currentPriceTagHeight: number;
  currentPriceTagLineHeight: number;
  currentPriceTagWidth: number;
  initialVisibleCandleCount: number;
  priceScaleTickMarkDensity: number;
  rightPriceScaleWidth: number;
};

const hoveredCandleInfoChildrenByElement = new WeakMap<HTMLDivElement, HoveredCandleInfoChildren>();

function resolveKlineChartMetrics(isCompactLayout: boolean): KlineChartMetrics {
  return isCompactLayout ? COMPACT_CHART_METRICS : DESKTOP_CHART_METRICS;
}

function createKlineInteractionOptions(isCompactLayout: boolean) {
  return {
    handleScale: {
      axisDoubleClickReset: {
        price: true,
        time: true,
      },
      axisPressedMouseMove: {
        price: !isCompactLayout,
        time: true,
      },
      mouseWheel: true,
      pinch: true,
    },
    handleScroll: {
      horzTouchDrag: true,
      mouseWheel: true,
      pressedMouseMove: true,
      vertTouchDrag: !isCompactLayout,
    },
    kineticScroll: {
      mouse: false,
      touch: true,
    },
  };
}

export function KlineChart({
  activePaperPosition,
  activeSignal,
  activeSignalDrawingReady,
  aiSummary,
  candles,
  canLoadOlderHistory,
  eventSignals,
  focusSignalRequestKey,
  focusTimeRequest = null,
  interval,
  isCompactLayout = false,
  isLoadingOlderHistory,
  language,
  priceColorMode,
  signalBiasSummary = null,
  theme,
  tradeMarkers,
  onLoadOlderHistory,
  onEventSignalSelect,
  onFocusSignalRequestHandled,
  onFocusTimeRequestHandled,
  onTradeMarkerSelect,
}: KlineChartProps) {
  const chartMetrics = resolveKlineChartMetrics(isCompactLayout);
  const [tradeMarkerTooltip, setTradeMarkerTooltip] = useState<TradeMarkerTooltipState | null>(null);
  const tradeMarkerTooltipRef = useRef<TradeMarkerTooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoveredCandleInfoRef = useRef<HTMLDivElement | null>(null);
  const hiddenSignalHintRef = useRef<HTMLDivElement | null>(null);
  const currentPriceTagRef = useRef<HTMLDivElement | null>(null);
  const labelOverlayRef = useRef<HTMLDivElement | null>(null);
  const lifecycleOverlayRef = useRef<HTMLDivElement | null>(null);
  const signalDataGuideTargetRef = useRef<HTMLDivElement | null>(null);
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
  const tradeMarkersByIdRef = useRef<ReadonlyMap<string, KlineTradePointMarker>>(new Map());
  const candlesRef = useRef(candles);
  const renderedCandlesRef = useRef<readonly MarketCandle[]>([]);
  const renderedThemeRef = useRef<ChartTheme>(theme);
  const renderedPriceColorModeRef = useRef<PriceColorMode>(priceColorMode);
  const activePaperPositionRef = useRef(activePaperPosition);
  const activeSignalRef = useRef(activeSignal);
  const activeSignalDrawingReadyRef = useRef(activeSignalDrawingReady);
  const chartMetricsRef = useRef(chartMetrics);
  const themeRef = useRef(theme);
  const priceColorModeRef = useRef(priceColorMode);
  const languageRef = useRef(language);
  const currentCandleCountdownTextRef = useRef("");
  const onEventSignalSelectRef = useRef(onEventSignalSelect);
  const onTradeMarkerSelectRef = useRef(onTradeMarkerSelect);
  const handledFocusSignalRequestKeyRef = useRef<string | null>(null);
  const handledFocusTimeRequestKeyRef = useRef<string | null>(null);
  const eventLabelRenderKey = `${createSignalEventRenderKey(candles, eventSignals, theme, language, activeSignal?.id ?? null)}:${priceColorMode}:${isCompactLayout ? "compact" : "desktop"}`;

  useEffect(() => {
    tradeMarkerTooltipRef.current = tradeMarkerTooltip;
  }, [tradeMarkerTooltip]);

  useEffect(() => {
    canLoadOlderHistoryRef.current = canLoadOlderHistory;
    isLoadingOlderHistoryRef.current = isLoadingOlderHistory;
    onLoadOlderHistoryRef.current = onLoadOlderHistory;
    eventSignalsRef.current = eventSignals;
    tradeMarkersRef.current = tradeMarkers;
    tradeMarkersByIdRef.current = createTradeMarkerLookup(tradeMarkers);
    candlesRef.current = candles;
    activePaperPositionRef.current = activePaperPosition;
    activeSignalRef.current = activeSignal;
    activeSignalDrawingReadyRef.current = activeSignalDrawingReady;
    chartMetricsRef.current = chartMetrics;
    themeRef.current = theme;
    priceColorModeRef.current = priceColorMode;
    languageRef.current = language;
    onEventSignalSelectRef.current = onEventSignalSelect;
    onTradeMarkerSelectRef.current = onTradeMarkerSelect;
  }, [activePaperPosition, activeSignal, activeSignalDrawingReady, canLoadOlderHistory, candles, chartMetrics, eventSignals, isLoadingOlderHistory, language, onEventSignalSelect, onLoadOlderHistory, onTradeMarkerSelect, priceColorMode, theme, tradeMarkers]);

  useEffect(() => {
    const updateCountdown = () => {
      const latestCandle = candlesRef.current.at(-1) ?? null;
      const countdownText = formatKlineCandleCountdown(latestCandle, interval);
      currentCandleCountdownTextRef.current = countdownText;
      renderCurrentPriceTag({
        candle: latestCandle,
        countdownText,
        element: currentPriceTagRef.current,
        metrics: chartMetricsRef.current,
        priceColorMode: priceColorModeRef.current,
        series: candleSeriesRef.current,
      });
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, CANDLE_COUNTDOWN_UPDATE_MS);

    return () => window.clearInterval(intervalId);
  }, [interval]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const hoveredCandleInfoElement = hoveredCandleInfoRef.current;
    const palette = createChartPalette(themeRef.current, priceColorModeRef.current);
    const currentChartMetrics = chartMetricsRef.current;
    const chart = createChart(container, {
      autoSize: true,
      ...createKlineInteractionOptions(isCompactLayout),
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
        minimumWidth: currentChartMetrics.rightPriceScaleWidth,
        tickMarkDensity: currentChartMetrics.priceScaleTickMarkDensity,
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
      priceFormat: KLINE_PRICE_FORMAT,
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

    const signalRayPrimitive = new SignalPriceRayPrimitive();
    const tradePointPrimitive = new TradePointPrimitive();
    candleSeries.attachPrimitive(signalRayPrimitive);
    candleSeries.attachPrimitive(tradePointPrimitive);

    let overlayRenderFrameId: number | null = null;
    let tradePointRenderFrameId: number | null = null;
    let crosshairRenderFrameId: number | null = null;
    let pendingCrosshairParam: MouseEventParams<Time> | null = null;
    const renderChartOverlays = () => {
      const drawableSignal = activeSignalDrawingReadyRef.current
        ? activeSignalRef.current
        : null;
      const drawablePaperPosition = activeSignalDrawingReadyRef.current
        ? activePaperPositionRef.current
        : null;
      const hasHiddenEventSignals = renderSignalEventLabels({
        activeSignal: activeSignalRef.current,
        candles: candlesRef.current,
        chart,
        overlay: labelOverlayRef.current,
        signals: eventSignalsRef.current,
        language: languageRef.current,
        onSignalSelect: onEventSignalSelectRef.current,
        theme: themeRef.current,
      });
      const hasHiddenLifecycleSignals = renderPaperPositionLifecycleLabels({
        candles: candlesRef.current,
        chart,
        overlay: lifecycleOverlayRef.current,
        language: languageRef.current,
        paperPosition: drawablePaperPosition,
        series: candleSeries,
        signal: drawableSignal,
        theme: themeRef.current,
      });
      if (lifecycleOverlayRef.current) {
        lifecycleOverlayRef.current.dataset.lifecycleHiddenRight = String(hasHiddenLifecycleSignals);
      }
      updateSignalDataGuideTarget({
        annotationOverlay: lifecycleOverlayRef.current,
        candles: candlesRef.current,
        element: signalDataGuideTargetRef.current,
        paperPosition: drawablePaperPosition,
        series: candleSeries,
        signal: drawableSignal,
      });
      renderCurrentPriceTag({
        candle: candlesRef.current.at(-1) ?? null,
        countdownText: currentCandleCountdownTextRef.current,
        element: currentPriceTagRef.current,
        metrics: chartMetricsRef.current,
        priceColorMode: priceColorModeRef.current,
        series: candleSeries,
      });
      renderHiddenSignalHint({
        element: hiddenSignalHintRef.current,
        isDarkTheme: themeRef.current === "dark",
        isVisible: hasHiddenEventSignals || hasHiddenLifecycleSignals,
      });
    };

    const scheduleChartOverlayRender = () => {
      if (overlayRenderFrameId !== null) {
        return;
      }

      overlayRenderFrameId = window.requestAnimationFrame(() => {
        overlayRenderFrameId = null;
        renderChartOverlays();
      });
    };

    const scheduleTradePointRender = () => {
      if (tradePointRenderFrameId !== null) {
        return;
      }

      tradePointRenderFrameId = window.requestAnimationFrame(() => {
        tradePointRenderFrameId = null;
        tradePointPrimitive.refresh();
      });
    };

    const handleVisibleLogicalRangeChange = (logicalRange: LogicalRange | null) => {
      scheduleChartOverlayRender();
      scheduleTradePointRender();

      if (!logicalRange || !canLoadOlderHistoryRef.current || isLoadingOlderHistoryRef.current) {
        return;
      }

      if (logicalRange.from < LEFT_EDGE_HISTORY_THRESHOLD_BARS) {
        onLoadOlderHistoryRef.current();
      }
    };

    const handleChartClick = (param: MouseEventParams<Time>) => {
      const markerId = readTradePointMarkerId(readMouseEventObjectId(param));
      if (!markerId) {
        return;
      }

      if (onTradeMarkerSelectRef.current) {
        onTradeMarkerSelectRef.current(markerId);
        return;
      }

      const marker = tradeMarkersByIdRef.current.get(markerId);
      const signal = marker
        ? eventSignalsRef.current.find((item) => item.id === marker.signalId) ?? (activeSignalRef.current?.id === marker.signalId ? activeSignalRef.current : null)
        : null;
      if (signal) {
        onEventSignalSelectRef.current(signal);
      }
    };

    const updateTradeMarkerTooltip = (nextTooltip: TradeMarkerTooltipState | null) => {
      if (areTradeMarkerTooltipsEqual(tradeMarkerTooltipRef.current, nextTooltip)) {
        return;
      }

      tradeMarkerTooltipRef.current = nextTooltip;
      setTradeMarkerTooltip(nextTooltip);
    };

    const renderCrosshairMove = (param: MouseEventParams<Time>) => {
      renderHoveredCandleInfo({
        candles: candlesRef.current,
        element: hoveredCandleInfoElement,
        language: languageRef.current,
        param,
        priceColorMode: priceColorModeRef.current,
        series: candleSeries,
        theme: themeRef.current,
      });

      const markerId = readTradePointMarkerId(readMouseEventObjectId(param));
      if (!markerId || !param.point) {
        updateTradeMarkerTooltip(null);
        return;
      }

      const marker = tradeMarkersByIdRef.current.get(markerId);
      if (!marker) {
        updateTradeMarkerTooltip(null);
        return;
      }

      updateTradeMarkerTooltip({
        containerHeight: container.clientHeight,
        containerWidth: container.clientWidth,
        marker,
        x: param.point.x,
        y: param.point.y,
      });
    };

    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      pendingCrosshairParam = param;
      if (crosshairRenderFrameId !== null) {
        return;
      }

      crosshairRenderFrameId = window.requestAnimationFrame(() => {
        crosshairRenderFrameId = null;
        const nextParam = pendingCrosshairParam;
        pendingCrosshairParam = null;
        if (nextParam) {
          renderCrosshairMove(nextParam);
        }
      });
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
    chart.subscribeClick(handleChartClick);
    chart.subscribeCrosshairMove(handleCrosshairMove);
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    signalRayPrimitiveRef.current = signalRayPrimitive;
    tradePointPrimitiveRef.current = tradePointPrimitive;

    return () => {
      if (overlayRenderFrameId !== null) {
        window.cancelAnimationFrame(overlayRenderFrameId);
      }
      if (tradePointRenderFrameId !== null) {
        window.cancelAnimationFrame(tradePointRenderFrameId);
      }
      if (crosshairRenderFrameId !== null) {
        window.cancelAnimationFrame(crosshairRenderFrameId);
      }
      hideHoveredCandleInfo(hoveredCandleInfoElement);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
      chart.unsubscribeClick(handleChartClick);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
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
      renderedCandlesRef.current = [];
      renderedThemeRef.current = themeRef.current;
      renderedPriceColorModeRef.current = priceColorModeRef.current;
    };
  }, [isCompactLayout]);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    if (!chart || !candleSeries) {
      return;
    }

    const palette = createChartPalette(theme, priceColorMode);
    const currentChartMetrics = chartMetricsRef.current;

    chart.applyOptions({
      ...createKlineInteractionOptions(isCompactLayout),
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
        minimumWidth: currentChartMetrics.rightPriceScaleWidth,
        tickMarkDensity: currentChartMetrics.priceScaleTickMarkDensity,
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
      priceFormat: KLINE_PRICE_FORMAT,
      priceLineVisible: false,
      wickUpColor: palette.up,
      wickDownColor: palette.down,
    });
  }, [isCompactLayout, priceColorMode, theme]);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) {
      return;
    }

    if (candles.length === 0) {
      candleSeriesRef.current.setData([]);
      volumeSeriesRef.current.setData([]);
      signalRayPrimitiveRef.current?.applyOptions({ candles, language: languageRef.current, paperPosition: null, signal: null, theme });
      tradePointPrimitiveRef.current?.applyOptions({ activeSignalId: null, candles, markers: [], theme });
      hideHoveredCandleInfo(hoveredCandleInfoRef.current);
      labelOverlayRef.current?.replaceChildren();
      lifecycleOverlayRef.current?.replaceChildren();
      labelOverlayRef.current?.removeAttribute("data-signal-event-hidden-right");
      lifecycleOverlayRef.current?.removeAttribute("data-lifecycle-hidden-right");
      renderCurrentPriceTag({
        candle: null,
        countdownText: "",
        element: currentPriceTagRef.current,
        metrics: chartMetricsRef.current,
        priceColorMode,
        series: candleSeriesRef.current,
      });
      renderHiddenSignalHint({ element: hiddenSignalHintRef.current, isDarkTheme: theme === "dark", isVisible: false });
      hasFittedContentRef.current = false;
      renderedCandlesRef.current = [];
      renderedThemeRef.current = theme;
      renderedPriceColorModeRef.current = priceColorMode;
      return;
    }

    const previousCandles = renderedCandlesRef.current;
    const hasThemeChanged = renderedThemeRef.current !== theme;
    const hasPriceColorModeChanged = renderedPriceColorModeRef.current !== priceColorMode;
    const previousVisibleRange = chartRef.current?.timeScale().getVisibleLogicalRange() ?? null;
    const preservedVisibleRange = resolveVisibleLogicalRangeAfterCandlesChange({
      nextCandles: candles,
      previousCandles,
      previousVisibleRange,
    });

    applyCandlesToSeries({
      candleSeries: candleSeriesRef.current,
      forceReplace: hasThemeChanged || hasPriceColorModeChanged,
      nextCandles: candles,
      priceColorMode,
      previousCandles,
      theme,
      volumeSeries: volumeSeriesRef.current,
    });
    renderCurrentPriceTag({
      candle: candles.at(-1) ?? null,
      countdownText: currentCandleCountdownTextRef.current,
      element: currentPriceTagRef.current,
      metrics: chartMetricsRef.current,
      priceColorMode,
      series: candleSeriesRef.current,
    });

    if (!hasFittedContentRef.current) {
      const lastCandleIndex = candles.length - 1;
      const initialVisibleCandleCount =
        chartMetricsRef.current.initialVisibleCandleCount;
      chartRef.current?.timeScale().setVisibleLogicalRange({
        from: Math.max(0, lastCandleIndex - initialVisibleCandleCount + 1),
        to: lastCandleIndex,
      });
      hasFittedContentRef.current = true;
    } else if (preservedVisibleRange) {
      chartRef.current?.timeScale().setVisibleLogicalRange(preservedVisibleRange);
    }

    renderedCandlesRef.current = candles;
    renderedThemeRef.current = theme;
    renderedPriceColorModeRef.current = priceColorMode;
  }, [candles, isCompactLayout, priceColorMode, theme]);

  useEffect(() => {
    const drawableSignal = activeSignalDrawingReadyRef.current
      ? activeSignalRef.current
      : null;
    const drawablePaperPosition = activeSignalDrawingReadyRef.current
      ? activePaperPositionRef.current
      : null;
    const hasHiddenEventSignals = renderSignalEventLabels({
      activeSignal: activeSignalRef.current,
      candles: candlesRef.current,
      chart: chartRef.current,
      overlay: labelOverlayRef.current,
      signals: eventSignalsRef.current,
      language: languageRef.current,
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
      paperPosition: drawablePaperPosition,
      series: candleSeriesRef.current,
      signal: drawableSignal,
    });
  }, [eventLabelRenderKey]);

  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) {
      return;
    }

    const drawableSignal = activeSignalDrawingReady ? activeSignal : null;
    const drawablePaperPosition = activeSignalDrawingReady
      ? activePaperPosition
      : null;

    for (const priceLine of priceLineRefs.current) {
      series.removePriceLine(priceLine);
    }

    priceLineRefs.current = createSignalPriceLines(
      drawableSignal,
      drawablePaperPosition,
      candles.at(-1),
      language,
      priceColorMode,
    ).map((line) => series.createPriceLine(line));

    signalRayPrimitiveRef.current?.applyOptions({
      candles,
      language,
      paperPosition: drawablePaperPosition,
      signal: drawableSignal,
      theme,
    });
    tradePointPrimitiveRef.current?.applyOptions({
      activeSignalId: activeSignal?.id ?? null,
      candles,
      markers: tradeMarkers,
      theme,
    });
    const hasHiddenLifecycleSignals = renderPaperPositionLifecycleLabels({
      candles,
      chart: chartRef.current,
      overlay: lifecycleOverlayRef.current,
      language,
      paperPosition: drawablePaperPosition,
      series,
      signal: drawableSignal,
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
      paperPosition: drawablePaperPosition,
      series,
      signal: drawableSignal,
    });
  }, [activePaperPosition, activeSignal, activeSignalDrawingReady, candles, isCompactLayout, language, priceColorMode, theme, tradeMarkers]);

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
     * Focus remains command-driven so same-symbol selection keeps the user's
     * chart viewport, while cross-symbol selection opens around the event.
     */
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, targetIndex - 52),
      to: Math.min(candles.length - 1, targetIndex + 52),
    });
    handledFocusSignalRequestKeyRef.current = focusSignalRequestKey;
    onFocusSignalRequestHandled();
  }, [activeSignal, candles, focusSignalRequestKey, onFocusSignalRequestHandled]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !focusTimeRequest || candles.length === 0) {
      return;
    }

    if (handledFocusTimeRequestKeyRef.current === focusTimeRequest.key) {
      return;
    }

    const targetIndex = findNearestCandleIndex(candles, focusTimeRequest.sourceTimeMs);
    if (targetIndex === -1) {
      return;
    }

    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, targetIndex - 52),
      to: Math.min(candles.length - 1, targetIndex + 52),
    });
    handledFocusTimeRequestKeyRef.current = focusTimeRequest.key;
    onFocusTimeRequestHandled?.();
  }, [candles, focusTimeRequest, onFocusTimeRequestHandled]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div
        ref={hoveredCandleInfoRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-2 z-40 hidden max-w-[calc(100%-7rem)] overflow-hidden whitespace-nowrap text-[11px] font-semibold tracking-tight sm:left-4 sm:top-3 sm:text-xs lg:text-sm"
      />
      <div ref={signalDataGuideTargetRef} data-guide-target="kline-signal-data" aria-hidden="true" className="pointer-events-none absolute z-10" />
      <div data-guide-target="kline-kol-avatars" aria-hidden="true" className="pointer-events-none absolute bottom-2 left-3 right-[86px] z-10 h-24 lg:left-4 lg:right-[102px] lg:h-28" />
      <div ref={hiddenSignalHintRef} aria-hidden="true" className="hidden" />
      <div
        ref={currentPriceTagRef}
        aria-hidden="true"
        className="pointer-events-none absolute z-40 opacity-0"
      />
      <div ref={labelOverlayRef} className="pointer-events-none absolute inset-0 z-20 overflow-hidden" />
      <div ref={lifecycleOverlayRef} className="pointer-events-none absolute inset-0 z-30 overflow-hidden" />
      <AiSignalSummaryOverlay
        isCompactLayout={isCompactLayout}
        language={language}
        summary={aiSummary}
        theme={theme}
      />
      <SignalBiasSummaryOverlay
        language={language}
        summary={signalBiasSummary}
        theme={theme}
      />
      {tradeMarkerTooltip ? (
        <TradeMarkerTooltip
          language={language}
          marker={tradeMarkerTooltip.marker}
          style={createTradeMarkerTooltipStyle(tradeMarkerTooltip)}
          theme={theme}
        />
      ) : null}
    </div>
  );
}


function readMouseEventObjectId(param: MouseEventParams<Time>): unknown {
  return param.hoveredInfo?.objectId ?? param.hoveredObjectId;
}

function createTradeMarkerLookup(markers: readonly KlineTradePointMarker[]): ReadonlyMap<string, KlineTradePointMarker> {
  if (markers.length === 0) {
    return new Map();
  }

  return new Map(markers.map((marker) => [marker.id, marker]));
}

function areTradeMarkerTooltipsEqual(
  left: TradeMarkerTooltipState | null,
  right: TradeMarkerTooltipState | null,
): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.marker.id === right.marker.id
    && left.containerHeight === right.containerHeight
    && left.containerWidth === right.containerWidth
    && Math.round(left.x) === Math.round(right.x)
    && Math.round(left.y) === Math.round(right.y);
}

function SignalBiasSummaryOverlay({
  language,
  summary,
  theme,
}: {
  language: WorkspaceLanguage;
  summary: KlineSignalBiasSummary | null;
  theme: ChartTheme;
}) {
  if (!summary || summary.totalCount === 0) {
    return null;
  }

  const copy = getWorkspaceCopy(language);
  const isDarkTheme = theme === "dark";
  const shellClassName = isDarkTheme
    ? "pointer-events-none absolute left-3 top-8 z-[35] max-w-[calc(100%-7rem)] overflow-hidden rounded-full border border-white/[0.08] bg-[#161B24]/86 px-2.5 py-1.5 text-[10px] font-bold text-slate-200 shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:left-4 sm:top-9 sm:text-[11px]"
    : "pointer-events-none absolute left-3 top-8 z-[35] max-w-[calc(100%-7rem)] overflow-hidden rounded-full border border-slate-200/90 bg-white/92 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:left-4 sm:top-9 sm:text-[11px]";
  const mutedClassName = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const barTrackClassName = isDarkTheme ? "bg-white/[0.08]" : "bg-slate-100";

  return (
    <div className={shellClassName}>
      <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
        <span className={mutedClassName}>{copy.kline.signalBiasTitle}</span>
        <span className="text-emerald-500">{copy.kline.signalBiasLong(summary.longPercent, summary.longCount)}</span>
        <span className="text-rose-500">{copy.kline.signalBiasShort(summary.shortPercent, summary.shortCount)}</span>
        <span className={mutedClassName}>{copy.kline.signalBiasSample(summary.totalCount)}</span>
        <span className={`hidden h-1.5 w-16 overflow-hidden rounded-full sm:flex ${barTrackClassName}`}>
          <span className="h-full bg-emerald-500/90" style={{ width: `${summary.longPercent}%` }} />
          <span className="h-full bg-rose-500/80" style={{ width: `${summary.shortPercent}%` }} />
        </span>
      </div>
    </div>
  );
}

function renderHoveredCandleInfo(input: {
  candles: readonly MarketCandle[];
  element: HTMLDivElement | null;
  language: WorkspaceLanguage;
  param: MouseEventParams<Time>;
  priceColorMode: PriceColorMode;
  series: ISeriesApi<"Candlestick">;
  theme: ChartTheme;
}): void {
  const { candles, element, language, param, priceColorMode, series, theme } = input;
  if (!element || !param.point) {
    hideHoveredCandleInfo(element);
    return;
  }

  const candle = readHoveredCandleInfo(param, series) ?? readHoveredCandleInfoFromTime(param.time, candles);
  if (!candle) {
    hideHoveredCandleInfo(element);
    return;
  }

  const labels = getHoveredCandleLabels(language);
  const change = candle.close - candle.open;
  const changeRatio = candle.open !== 0 ? change / candle.open : null;
  const amplitudeRatio = candle.open !== 0 ? (candle.high - candle.low) / candle.open : null;
  const valueColor = getHoveredCandleValueColor(change, theme, priceColorMode);
  const labelColor = theme === "dark" ? "#E5E7EB" : "#111827";
  const children = ensureHoveredCandleInfoChildren(element);

  element.style.alignItems = "center";
  element.style.display = "flex";
  element.style.fontVariantNumeric = "tabular-nums";
  element.style.gap = "10px";
  element.style.lineHeight = "1.2";
  element.style.opacity = "1";
  element.style.textShadow = theme === "dark" ? "0 1px 2px rgba(0,0,0,0.45)" : "0 1px 0 rgba(255,255,255,0.72)";

  setHoveredCandlePair(children.open, labels.open, formatKlineOhlcValue(candle.open), labelColor, valueColor);
  setHoveredCandlePair(children.high, labels.high, formatKlineOhlcValue(candle.high), labelColor, valueColor);
  setHoveredCandlePair(children.low, labels.low, formatKlineOhlcValue(candle.low), labelColor, valueColor);
  setHoveredCandlePair(children.close, labels.close, formatKlineOhlcValue(candle.close), labelColor, valueColor);
  setHoveredCandlePair(children.amplitude, labels.amplitude, formatKlinePercent(amplitudeRatio), labelColor, valueColor);
  children.change.textContent = `${formatSignedKlineDelta(change)} (${formatSignedKlinePercent(changeRatio)})`;
  children.change.style.color = valueColor;
}

function hideHoveredCandleInfo(element: HTMLDivElement | null): void {
  if (!element) {
    return;
  }

  element.style.opacity = "0";
  element.style.display = "none";
}

function readHoveredCandleInfo(param: MouseEventParams<Time>, series: ISeriesApi<"Candlestick">): HoveredCandleInfo | null {
  return normalizeHoveredCandleInfo(param.seriesData.get(series));
}

function readHoveredCandleInfoFromTime(time: Time | undefined, candles: readonly MarketCandle[]): HoveredCandleInfo | null {
  if (typeof time !== "number") {
    return null;
  }

  return candles.find((candle) => candle.time === time) ?? null;
}

function normalizeHoveredCandleInfo(value: unknown): HoveredCandleInfo | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Record<keyof HoveredCandleInfo, unknown>>;
  const open = Number(candidate.open);
  const high = Number(candidate.high);
  const low = Number(candidate.low);
  const close = Number(candidate.close);

  if (![open, high, low, close].every(Number.isFinite)) {
    return null;
  }

  return { close, high, low, open };
}

function ensureHoveredCandleInfoChildren(element: HTMLDivElement): HoveredCandleInfoChildren {
  const cachedChildren = hoveredCandleInfoChildrenByElement.get(element);
  if (cachedChildren) {
    return cachedChildren;
  }

  const open = createHoveredCandleInfoPair("open");
  const high = createHoveredCandleInfoPair("high");
  const low = createHoveredCandleInfoPair("low");
  const close = createHoveredCandleInfoPair("close");
  const amplitude = createHoveredCandleInfoPair("amplitude");
  const change = document.createElement("span");
  change.dataset.ohlcChange = "true";
  change.style.display = "inline-block";
  change.style.fontWeight = "700";

  const children = {
    open,
    high,
    low,
    close,
    amplitude,
    change,
  };

  element.replaceChildren(open.group, high.group, low.group, close.group, amplitude.group, change);
  hoveredCandleInfoChildrenByElement.set(element, children);
  return children;
}

function createHoveredCandleInfoPair(key: string): HoveredCandleInfoPair & { group: HTMLSpanElement } {
  const group = document.createElement("span");
  const label = document.createElement("span");
  const value = document.createElement("span");

  group.dataset.ohlcGroup = key;
  group.style.display = "inline-flex";
  group.style.fontWeight = "700";
  group.style.gap = "0";
  group.style.minWidth = "0";
  label.dataset.ohlcLabel = "true";
  value.dataset.ohlcValue = "true";

  group.replaceChildren(label, value);
  return { group, label, value };
}

function setHoveredCandlePair(
  pair: HoveredCandleInfoPair,
  label: string,
  value: string,
  labelColor: string,
  valueColor: string,
): void {
  pair.label.textContent = label;
  pair.label.style.color = labelColor;
  pair.value.textContent = value;
  pair.value.style.color = valueColor;
}

function getHoveredCandleLabels(language: WorkspaceLanguage): { amplitude: string; close: string; high: string; low: string; open: string } {
  if (language === "en-US") {
    return { amplitude: "Amp=", close: "C=", high: "H=", low: "L=", open: "O=" };
  }

  return { amplitude: "振幅=", close: "收=", high: "高=", low: "低=", open: "开=" };
}

function getHoveredCandleValueColor(change: number, theme: ChartTheme, priceColorMode: PriceColorMode): string {
  if (change > 0) {
    return createChartPalette(theme, priceColorMode).up;
  }

  if (change < 0) {
    return createChartPalette(theme, priceColorMode).down;
  }

  return theme === "dark" ? "#CBD5E1" : "#334155";
}

function formatKlineOhlcValue(value: number): string {
  return KLINE_PRICE_FORMAT.formatter(value);
}

function formatSignedKlineDelta(value: number): string {
  if (value === 0) {
    return "0";
  }

  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${KLINE_PRICE_FORMAT.formatter(Math.abs(value))}`;
}

function formatSignedKlinePercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${(Math.abs(value) * 100).toFixed(2)}%`;
}

function formatKlinePercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return `${(value * 100).toFixed(2)}%`;
}

function TradeMarkerTooltip({
  language,
  marker,
  style,
  theme,
}: {
  language: WorkspaceLanguage;
  marker: KlineTradePointMarker;
  style: CSSProperties;
  theme: ChartTheme;
}) {
  const isDarkTheme = theme === "dark";
  const sideLabel = formatTradeMarkerSide(marker.side, language);
  const actionLabel = formatTradeMarkerAction(marker, language);
  const directionLabel = marker.direction ? formatTradeMarkerDirection(marker.direction, language) : null;
  const avatarStyle = marker.avatarUrl ? { backgroundImage: `url("${marker.avatarUrl}")` } : undefined;
  const shellClassName = isDarkTheme
    ? "pointer-events-none absolute z-50 w-[264px] rounded-2xl border border-white/[0.10] bg-[#181A20]/96 p-3 text-slate-100 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl"
    : "pointer-events-none absolute z-50 w-[264px] rounded-2xl border border-[#D5E4EF] bg-white/96 p-3 text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.16)] backdrop-blur-xl";
  const mutedClassName = isDarkTheme ? "text-slate-400" : "text-slate-500";

  return (
    <div className={shellClassName} style={style}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={getTradeMarkerTooltipAvatarClassName(isDarkTheme, marker.side)}>
          <span className="block h-full w-full bg-cover bg-center" style={avatarStyle}>
            {!marker.avatarUrl ? getTradeMarkerInitial(marker) : null}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-black">{marker.traderName ?? marker.title}</div>
          <div className={`mt-0.5 truncate text-[10px] font-medium ${mutedClassName}`}>{marker.occurredAtText ?? "--"}</div>
        </div>
        <span className={getTradeMarkerTooltipSideClassName(isDarkTheme, marker.side)}>{sideLabel}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={getTradeMarkerTooltipActionClassName(isDarkTheme)}>{actionLabel}</span>
        {directionLabel ? <span className={getTradeMarkerTooltipDirectionClassName(isDarkTheme, marker.direction)}>{directionLabel}</span> : null}
        <span className={isDarkTheme ? "text-[10px] font-bold text-slate-300" : "text-[10px] font-bold text-slate-600"}>{String(marker.symbol)}</span>
      </div>
      <div className={`mt-2 text-[11px] leading-4 ${mutedClassName}`}>
        {formatTradeMarkerPriceLabel(language)} {formatTradeMarkerPrice(marker)}
      </div>
      {marker.detail ? (
        <p className={isDarkTheme ? "mt-2 max-h-12 overflow-hidden text-[11px] leading-4 text-slate-300" : "mt-2 max-h-12 overflow-hidden text-[11px] leading-4 text-slate-600"}>
          {marker.detail}
        </p>
      ) : null}
    </div>
  );
}

function createTradeMarkerTooltipStyle(tooltip: TradeMarkerTooltipState): CSSProperties {
  const xOffset = tooltip.containerWidth > 0 && tooltip.x > tooltip.containerWidth - 286 ? "calc(-100% - 12px)" : "12px";
  const yOffset = tooltip.containerHeight > 0 && tooltip.y > tooltip.containerHeight - 170 ? "calc(-100% - 12px)" : "12px";

  return {
    left: Math.round(tooltip.x),
    top: Math.round(tooltip.y),
    transform: `translate(${xOffset}, ${yOffset})`,
  };
}

function formatTradeMarkerSide(side: "buy" | "sell", language: WorkspaceLanguage): string {
  if (language === "en-US") {
    return side === "buy" ? "Buy" : "Sell";
  }

  return side === "buy" ? "买入" : "卖出";
}

function formatTradeMarkerDirection(direction: "long" | "short", language: WorkspaceLanguage): string {
  if (language === "en-US") {
    return direction === "long" ? "Long" : "Short";
  }

  return direction === "long" ? "多" : "空";
}

function formatTradeMarkerAction(marker: KlineTradePointMarker, language: WorkspaceLanguage): string {
  if (marker.actionLabel === "BUY" || marker.actionLabel === "SELL") {
    return marker.actionLabel;
  }

  if (!marker.eventType || language !== "en-US") {
    return marker.actionLabel ?? marker.title;
  }

  const labels: Record<NonNullable<KlineTradePointMarker["eventType"]>, string> = {
    add: "Add",
    close: "Close",
    losing_streak: "Losing streak",
    open: "Open",
    oversized_position: "Oversized",
    reduce: "Reduce",
    reverse: "Reverse",
    stop_loss: "Stop loss",
    take_profit: "Take profit",
    trailing_stop: "Trailing stop",
  };
  return labels[marker.eventType] ?? marker.actionLabel ?? marker.title;
}

function formatTradeMarkerPriceLabel(language: WorkspaceLanguage): string {
  return language === "en-US" ? "Price" : "价格";
}

function formatTradeMarkerPrice(marker: KlineTradePointMarker): string {
  if (marker.priceText) {
    return marker.priceText;
  }

  return marker.price !== null && Number.isFinite(marker.price)
    ? KLINE_PRICE_FORMAT.formatter(marker.price)
    : "--";
}

function getTradeMarkerInitial(marker: KlineTradePointMarker): string {
  const value = marker.traderName ?? marker.title;
  return Array.from(value.trim().replace(/\s+/gu, ""))[0]?.toUpperCase() ?? "S";
}

function getTradeMarkerTooltipAvatarClassName(isDarkTheme: boolean, side: "buy" | "sell"): string {
  const sideClassName = side === "buy" ? "border-emerald-400" : "border-rose-400";
  const themeClassName = isDarkTheme ? "bg-slate-800 text-slate-50" : "bg-sky-100 text-sky-700";
  return `grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border-2 ${sideClassName} ${themeClassName} text-xs font-black`;
}

function getTradeMarkerTooltipSideClassName(isDarkTheme: boolean, side: "buy" | "sell"): string {
  if (side === "buy") {
    return isDarkTheme
      ? "rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black text-emerald-200"
      : "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700";
  }

  return isDarkTheme
    ? "rounded-full bg-rose-400/15 px-2 py-0.5 text-[10px] font-black text-rose-200"
    : "rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700";
}

function getTradeMarkerTooltipActionClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-slate-200"
    : "rounded-full border border-[#E5EAF0] bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-bold text-slate-700";
}

function getTradeMarkerTooltipDirectionClassName(isDarkTheme: boolean, direction: "long" | "short" | undefined): string {
  if (direction === "long") {
    return isDarkTheme
      ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-300"
      : "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700";
  }

  return isDarkTheme
    ? "rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-black text-rose-300"
    : "rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700";
}

function findNearestCandleIndex(candles: readonly MarketCandle[], sourceTimeMs: number): number {
  if (!Number.isFinite(sourceTimeMs) || candles.length === 0) {
    return -1;
  }

  let lowIndex = 0;
  let highIndex = candles.length - 1;

  while (lowIndex <= highIndex) {
    const middleIndex = Math.floor((lowIndex + highIndex) / 2);
    const middleTimeMs = candles[middleIndex].sourceTimeMs;

    if (middleTimeMs === sourceTimeMs) {
      return middleIndex;
    }

    if (middleTimeMs < sourceTimeMs) {
      lowIndex = middleIndex + 1;
    } else {
      highIndex = middleIndex - 1;
    }
  }

  if (lowIndex >= candles.length) {
    return candles.length - 1;
  }

  if (highIndex < 0) {
    return 0;
  }

  return sourceTimeMs - candles[highIndex].sourceTimeMs <= candles[lowIndex].sourceTimeMs - sourceTimeMs
    ? highIndex
    : lowIndex;
}

function formatKlineCandleCountdown(candle: MarketCandle | null, interval: KlineInterval): string {
  if (!candle || !Number.isFinite(candle.sourceTimeMs)) {
    return "";
  }

  const intervalMs = KLINE_INTERVAL_MS_BY_INTERVAL[interval];
  const remainingSeconds = Math.max(
    0,
    Math.ceil((candle.sourceTimeMs + intervalMs - Date.now()) / 1_000),
  );
  const hours = Math.floor(remainingSeconds / 3_600);
  const minutes = Math.floor((remainingSeconds % 3_600) / 60);
  const seconds = remainingSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function applyCandlesToSeries(input: {
  candleSeries: ISeriesApi<"Candlestick">;
  forceReplace: boolean;
  nextCandles: readonly MarketCandle[];
  priceColorMode: PriceColorMode;
  previousCandles: readonly MarketCandle[];
  theme: ChartTheme;
  volumeSeries: ISeriesApi<"Histogram">;
}): void {
  const {
    candleSeries,
    forceReplace,
    nextCandles,
    priceColorMode,
    previousCandles,
    theme,
    volumeSeries,
  } = input;
  const incrementalUpdateStartIndex = forceReplace
    ? -1
    : resolveIncrementalCandleUpdateStartIndex(previousCandles, nextCandles);

  if (incrementalUpdateStartIndex === -1) {
    candleSeries.setData(nextCandles.slice());
    volumeSeries.setData(nextCandles.map((candle) => toVolumeData(candle, theme, priceColorMode)));
    return;
  }

  if (incrementalUpdateStartIndex === nextCandles.length) {
    return;
  }

  const changedCandleCount = nextCandles.length - incrementalUpdateStartIndex;
  if (changedCandleCount > MAX_INCREMENTAL_CANDLE_UPDATES) {
    candleSeries.setData(nextCandles.slice());
    volumeSeries.setData(nextCandles.map((candle) => toVolumeData(candle, theme, priceColorMode)));
    return;
  }

  for (let index = incrementalUpdateStartIndex; index < nextCandles.length; index += 1) {
    const nextCandle = nextCandles[index];
    const isHistoricalUpdate = index < previousCandles.length - 1;
    candleSeries.update(nextCandle, isHistoricalUpdate);
    volumeSeries.update(toVolumeData(nextCandle, theme, priceColorMode), isHistoricalUpdate);
  }
}

function resolveIncrementalCandleUpdateStartIndex(
  previousCandles: readonly MarketCandle[],
  nextCandles: readonly MarketCandle[],
): number {
  if (previousCandles.length === 0 || nextCandles.length < previousCandles.length) {
    return -1;
  }

  if (previousCandles[0]?.sourceTimeMs !== nextCandles[0]?.sourceTimeMs) {
    return -1;
  }

  const previousLastCandle = previousCandles.at(-1);
  if (!previousLastCandle) {
    return -1;
  }

  for (let index = previousCandles.length; index < nextCandles.length; index += 1) {
    if (nextCandles[index].sourceTimeMs <= previousLastCandle.sourceTimeMs) {
      return -1;
    }
  }

  let changedStartIndex = Math.min(previousCandles.length, nextCandles.length) - 1;
  while (
    changedStartIndex >= 0
    && areMarketCandlesEqual(previousCandles[changedStartIndex], nextCandles[changedStartIndex])
  ) {
    changedStartIndex -= 1;
  }

  if (changedStartIndex === -1) {
    return previousCandles.length;
  }

  if (previousCandles[changedStartIndex].sourceTimeMs !== nextCandles[changedStartIndex]?.sourceTimeMs) {
    return -1;
  }

  return changedStartIndex;
}

function areMarketCandlesEqual(left: MarketCandle, right: MarketCandle): boolean {
  return (
    left.sourceTimeMs === right.sourceTimeMs &&
    left.open === right.open &&
    left.high === right.high &&
    left.low === right.low &&
    left.close === right.close &&
    left.volume === right.volume
  );
}

function renderCurrentPriceTag(input: {
  candle: MarketCandle | null;
  countdownText: string;
  element: HTMLDivElement | null;
  metrics: KlineChartMetrics;
  priceColorMode: PriceColorMode;
  series: ISeriesApi<"Candlestick"> | null;
}): void {
  const { candle, countdownText, element, metrics, priceColorMode, series } = input;
  const container = element?.parentElement;
  if (!element || !container || !series || !candle || !countdownText) {
    hideCurrentPriceTag(element);
    return;
  }

  const coordinate = series.priceToCoordinate(candle.close);
  if (coordinate === null || !Number.isFinite(coordinate)) {
    hideCurrentPriceTag(element);
    return;
  }

  const tagColor = getCurrentCandleColor(candle, priceColorMode);
  const containerHeight = container.clientHeight;
  const top = clampNumber(
    coordinate - metrics.currentPriceTagHeight / 2,
    4,
    Math.max(4, containerHeight - metrics.currentPriceTagHeight - 4),
  );
  const { countdown, priceText } = ensureCurrentPriceTagChildren(element);

  priceText.textContent = KLINE_PRICE_FORMAT.formatter(candle.close);
  priceText.style.fontSize = `${metrics.currentPriceTagFontSize}px`;
  priceText.style.lineHeight = `${metrics.currentPriceTagLineHeight}px`;

  countdown.textContent = countdownText;
  countdown.style.fontSize = `${metrics.currentPriceTagFontSize}px`;
  countdown.style.lineHeight = `${metrics.currentPriceTagLineHeight}px`;

  element.style.alignItems = "flex-start";
  element.style.background = tagColor;
  element.style.borderRadius = "6px";
  element.style.boxShadow = "0 8px 18px rgba(15, 23, 42, 0.12)";
  element.style.color = "#FFFFFF";
  element.style.display = "flex";
  element.style.flexDirection = "column";
  element.style.fontVariantNumeric = "tabular-nums";
  element.style.fontWeight = "700";
  element.style.gap = "1px";
  element.style.justifyContent = "center";
  element.style.letterSpacing = "-0.02em";
  element.style.minHeight = `${metrics.currentPriceTagHeight}px`;
  element.style.overflow = "hidden";
  element.style.padding = "5px 8px";
  element.style.right = `${metrics.rightPriceScaleWidth - metrics.currentPriceTagWidth}px`;
  element.style.textAlign = "left";
  element.style.top = `${Math.round(top)}px`;
  element.style.whiteSpace = "nowrap";
  element.style.width = `${metrics.currentPriceTagWidth}px`;
  element.style.opacity = "1";
}

function ensureCurrentPriceTagChildren(element: HTMLDivElement): {
  countdown: HTMLSpanElement;
  priceText: HTMLSpanElement;
} {
  const firstChild = element.children.item(0);
  const secondChild = element.children.item(1);

  if (
    firstChild instanceof HTMLSpanElement &&
    secondChild instanceof HTMLSpanElement &&
    element.children.length === 2
  ) {
    return { countdown: secondChild, priceText: firstChild };
  }

  const priceText = document.createElement("span");
  const countdown = document.createElement("span");

  for (const child of [priceText, countdown]) {
    child.style.display = "block";
    child.style.fontFeatureSettings = "\"tnum\" 1, \"lnum\" 1";
    child.style.width = "100%";
  }
  countdown.style.opacity = "0.96";

  element.replaceChildren(priceText, countdown);
  return { countdown, priceText };
}

function hideCurrentPriceTag(element: HTMLDivElement | null): void {
  if (!element) {
    return;
  }

  element.style.opacity = "0";
}

function getCurrentCandleColor(candle: MarketCandle, priceColorMode: PriceColorMode): string {
  const up = priceColorMode === "positiveGreen" ? "#2FBD85" : "#F6465D";
  const down = priceColorMode === "positiveGreen" ? "#F6465D" : "#2FBD85";

  return candle.close >= candle.open ? up : down;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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
