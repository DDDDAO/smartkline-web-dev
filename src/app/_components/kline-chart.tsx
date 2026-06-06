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
import { useEffect, useRef, useState } from "react";
import { AiSignalSummaryOverlay } from "./kline-chart/ai-signal-summary-overlay";
import { renderPaperPositionLifecycleLabels } from "./kline-chart/paper-position-lifecycle-labels";
import { createChartPalette } from "./kline-chart/palette";
import { createSignalPriceLines, KLINE_PRICE_FORMAT, toVolumeData } from "./kline-chart/series-data";
import { createSignalEventRenderKey, renderSignalEventLabels } from "./kline-chart/signal-event-labels";
import { SignalPriceRayPrimitive } from "./kline-chart/signal-price-ray-primitive";
import { readTradePointMarkerId, TradePointPrimitive, type KlineTradePointMarker } from "./kline-chart/trade-point-primitive";
import type { WorkspaceLanguage } from "@/app/_lib/i18n";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { SignalAiSummary } from "@/app/_lib/signal-ai-summary";
import type { KlineInterval, MarketCandle } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";

export type ChartTheme = "light" | "dark";

type KlineChartProps = {
  activePaperPosition: PaperPositionRecord | null;
  activeSignal: StructuredSignal | null;
  activeSignalDrawingReady: boolean;
  aiSummary: SignalAiSummary | null;
  candles: readonly MarketCandle[];
  canLoadOlderHistory: boolean;
  eventSignals: readonly StructuredSignal[];
  focusSignalRequestKey: string | null;
  interval: KlineInterval;
  isLoadingOlderHistory: boolean;
  language: WorkspaceLanguage;
  theme: ChartTheme;
  tradeMarkers: readonly KlineTradePointMarker[];
  onEventSignalSelect: (signal: StructuredSignal) => void;
  onFocusSignalRequestHandled: () => void;
  onLoadOlderHistory: () => void;
};

const LEFT_EDGE_HISTORY_THRESHOLD_BARS = 80;
const INITIAL_VISIBLE_CANDLE_COUNT = 240;
const RIGHT_EDGE_FOLLOW_THRESHOLD_BARS = 2;
const CANDLE_COUNTDOWN_UPDATE_MS = 1_000;
const RIGHT_PRICE_SCALE_WIDTH = 132;
const CURRENT_PRICE_TAG_HEIGHT = 74;
const KLINE_INTERVAL_MS_BY_INTERVAL: Record<KlineInterval, number> = {
  "1d": 86_400_000,
  "1h": 3_600_000,
  "1m": 60_000,
  "4h": 14_400_000,
  "5m": 300_000,
  "15m": 900_000,
};

export function KlineChart({
  activePaperPosition,
  activeSignal,
  activeSignalDrawingReady,
  aiSummary,
  candles,
  canLoadOlderHistory,
  eventSignals,
  focusSignalRequestKey,
  interval,
  isLoadingOlderHistory,
  language,
  theme,
  tradeMarkers,
  onLoadOlderHistory,
  onEventSignalSelect,
  onFocusSignalRequestHandled,
}: KlineChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
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
  const candlesRef = useRef(candles);
  const renderedCandlesRef = useRef<readonly MarketCandle[]>([]);
  const activePaperPositionRef = useRef(activePaperPosition);
  const activeSignalRef = useRef(activeSignal);
  const activeSignalDrawingReadyRef = useRef(activeSignalDrawingReady);
  const themeRef = useRef(theme);
  const languageRef = useRef(language);
  const currentCandleCountdownTextRef = useRef("");
  const onEventSignalSelectRef = useRef(onEventSignalSelect);
  const [currentCandleCountdownText, setCurrentCandleCountdownText] = useState("");
  const handledFocusSignalRequestKeyRef = useRef<string | null>(null);
  const eventLabelRenderKey = createSignalEventRenderKey(candles, eventSignals, theme, language, activeSignal?.id ?? null);

  useEffect(() => {
    canLoadOlderHistoryRef.current = canLoadOlderHistory;
    isLoadingOlderHistoryRef.current = isLoadingOlderHistory;
    onLoadOlderHistoryRef.current = onLoadOlderHistory;
    eventSignalsRef.current = eventSignals;
    tradeMarkersRef.current = tradeMarkers;
    candlesRef.current = candles;
    activePaperPositionRef.current = activePaperPosition;
    activeSignalRef.current = activeSignal;
    activeSignalDrawingReadyRef.current = activeSignalDrawingReady;
    themeRef.current = theme;
    languageRef.current = language;
    onEventSignalSelectRef.current = onEventSignalSelect;
  }, [activePaperPosition, activeSignal, activeSignalDrawingReady, canLoadOlderHistory, candles, eventSignals, isLoadingOlderHistory, language, onEventSignalSelect, onLoadOlderHistory, theme, tradeMarkers]);

  useEffect(() => {
    currentCandleCountdownTextRef.current = currentCandleCountdownText;
  }, [currentCandleCountdownText]);

  useEffect(() => {
    const updateCountdown = () => {
      setCurrentCandleCountdownText(formatKlineCandleCountdown(candles.at(-1) ?? null, interval));
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, CANDLE_COUNTDOWN_UPDATE_MS);

    return () => window.clearInterval(intervalId);
  }, [candles, interval]);

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
        minimumWidth: RIGHT_PRICE_SCALE_WIDTH,
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

    const handleVisibleLogicalRangeChange = (logicalRange: LogicalRange | null) => {
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
        series: candleSeries,
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
        minimumWidth: RIGHT_PRICE_SCALE_WIDTH,
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
      priceFormat: KLINE_PRICE_FORMAT,
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
      signalRayPrimitiveRef.current?.applyOptions({ candles, language, paperPosition: null, signal: null, theme });
      tradePointPrimitiveRef.current?.applyOptions({ activeSignalId: null, candles, markers: [], theme });
      labelOverlayRef.current?.replaceChildren();
      lifecycleOverlayRef.current?.replaceChildren();
      labelOverlayRef.current?.removeAttribute("data-signal-event-hidden-right");
      lifecycleOverlayRef.current?.removeAttribute("data-lifecycle-hidden-right");
      renderCurrentPriceTag({
        candle: null,
        countdownText: "",
        element: currentPriceTagRef.current,
        series: candleSeriesRef.current,
      });
      renderHiddenSignalHint({ element: hiddenSignalHintRef.current, isDarkTheme: theme === "dark", isVisible: false });
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
  }, [candles, language, theme]);

  useEffect(() => {
    renderCurrentPriceTag({
      candle: candles.at(-1) ?? null,
      countdownText: currentCandleCountdownText,
      element: currentPriceTagRef.current,
      series: candleSeriesRef.current,
    });
  }, [candles, currentCandleCountdownText]);

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
  }, [activePaperPosition, activeSignal, activeSignalDrawingReady, candles, language, theme, tradeMarkers]);

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

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div ref={signalDataGuideTargetRef} data-guide-target="kline-signal-data" aria-hidden="true" className="pointer-events-none absolute z-10" />
      <div data-guide-target="kline-kol-avatars" aria-hidden="true" className="pointer-events-none absolute bottom-2 left-4 right-[138px] z-10 h-28" />
      <div ref={hiddenSignalHintRef} aria-hidden="true" className="hidden" />
      <div
        ref={currentPriceTagRef}
        aria-hidden="true"
        className="pointer-events-none absolute z-40 opacity-0"
      />
      <div ref={labelOverlayRef} className="pointer-events-none absolute inset-0 z-20 overflow-hidden" />
      <div ref={lifecycleOverlayRef} className="pointer-events-none absolute inset-0 z-30 overflow-hidden" />
      <AiSignalSummaryOverlay language={language} summary={aiSummary} theme={theme} />
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

function renderCurrentPriceTag(input: {
  candle: MarketCandle | null;
  countdownText: string;
  element: HTMLDivElement | null;
  series: ISeriesApi<"Candlestick"> | null;
}): void {
  const { candle, countdownText, element, series } = input;
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

  const tagColor = getCurrentCandleColor(candle);
  const containerHeight = container.clientHeight;
  const top = clampNumber(
    coordinate - CURRENT_PRICE_TAG_HEIGHT / 2,
    4,
    Math.max(4, containerHeight - CURRENT_PRICE_TAG_HEIGHT - 4),
  );
  const priceText = document.createElement("span");
  const countdown = document.createElement("span");

  priceText.textContent = KLINE_PRICE_FORMAT.formatter(candle.close);
  priceText.style.fontSize = "20px";
  priceText.style.lineHeight = "22px";

  countdown.textContent = countdownText;
  countdown.style.fontSize = "20px";
  countdown.style.lineHeight = "22px";
  countdown.style.opacity = "0.96";

  element.replaceChildren(priceText, countdown);
  element.style.alignItems = "center";
  element.style.background = tagColor;
  element.style.borderRadius = "8px";
  element.style.boxShadow = "0 10px 22px rgba(15, 23, 42, 0.14)";
  element.style.color = "#FFFFFF";
  element.style.display = "flex";
  element.style.flexDirection = "column";
  element.style.fontVariantNumeric = "tabular-nums";
  element.style.fontWeight = "700";
  element.style.gap = "4px";
  element.style.justifyContent = "center";
  element.style.letterSpacing = "-0.02em";
  element.style.minHeight = `${CURRENT_PRICE_TAG_HEIGHT}px`;
  element.style.overflow = "hidden";
  element.style.padding = "8px 12px";
  element.style.right = "0px";
  element.style.textAlign = "center";
  element.style.top = `${Math.round(top)}px`;
  element.style.whiteSpace = "nowrap";
  element.style.width = `${RIGHT_PRICE_SCALE_WIDTH}px`;
  element.style.opacity = "1";
}

function hideCurrentPriceTag(element: HTMLDivElement | null): void {
  if (!element) {
    return;
  }

  element.style.opacity = "0";
}

function getCurrentCandleColor(candle: MarketCandle): string {
  return candle.close >= candle.open ? "#2FBD85" : "#F6465D";
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
