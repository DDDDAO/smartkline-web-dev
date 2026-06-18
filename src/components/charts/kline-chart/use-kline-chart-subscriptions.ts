/* eslint-disable react-hooks/exhaustive-deps, react-hooks/immutability -- Lightweight Charts keeps imperative chart objects in refs, and these split lifecycle hooks intentionally mirror the original single-component mutation model. */
import { useEffect } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  createChart,
  type LogicalRange,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";
import { renderPaperPositionLifecycleLabels } from "./paper-position-lifecycle-labels";
import { renderSignalEventLabels } from "./signal-event-labels";
import { SignalPriceRayPrimitive } from "./signal-price-ray-primitive";
import { readTradePointMarkerId, TradePointPrimitive } from "./trade-point-primitive";
import { createKlineCandlestickSeriesOptions, createKlineChartOptions } from "./chart-options";
import { LEFT_EDGE_HISTORY_THRESHOLD_BARS } from "./candle-series-updates";
import { renderCurrentPriceTag } from "./current-price-tag";
import { renderHiddenSignalHint } from "./hidden-signal-hint";
import { hideHoveredCandleInfo, renderHoveredCandleInfo } from "./hovered-candle-info";
import { readMouseEventObjectId } from "./mouse-event";
import type { KlineChartRuntimeRefs } from "./runtime-types";
import { updateSignalDataGuideTarget } from "./signal-data-guide-target";
import { areTradeMarkerTooltipsEqual, type TradeMarkerTooltipState } from "./trade-marker-tooltip";

export function useKlineChartSubscriptions({
  isCompactLayout,
  refs,
  setTradeMarkerTooltip,
}: {
  isCompactLayout: boolean;
  refs: KlineChartRuntimeRefs;
  setTradeMarkerTooltip: (nextTooltip: TradeMarkerTooltipState | null) => void;
}) {
  useEffect(() => {
    const container = refs.containerRef.current;
    if (!container) {
      return;
    }

    const hoveredCandleInfoElement = refs.hoveredCandleInfoRef.current;
    const chart = createChart(container, createKlineChartOptions(
      refs.themeRef.current,
      refs.priceColorModeRef.current,
      refs.chartMetricsRef.current,
      isCompactLayout,
    ));

    const candleSeries = chart.addSeries(CandlestickSeries, createKlineCandlestickSeriesOptions(
      refs.themeRef.current,
      refs.priceColorModeRef.current,
    ));

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
      const drawableSignal = refs.activeSignalDrawingReadyRef.current
        ? refs.activeSignalRef.current
        : null;
      const drawablePaperPosition = refs.activeSignalDrawingReadyRef.current
        ? refs.activePaperPositionRef.current
        : null;
      const hasHiddenEventSignals = renderSignalEventLabels({
        activeSignal: refs.activeSignalRef.current,
        candles: refs.candlesRef.current,
        chart,
        overlay: refs.labelOverlayRef.current,
        signals: refs.eventSignalsRef.current,
        language: refs.languageRef.current,
        onSignalSelect: refs.onEventSignalSelectRef.current,
        theme: refs.themeRef.current,
      });
      const hasHiddenLifecycleSignals = renderPaperPositionLifecycleLabels({
        candles: refs.candlesRef.current,
        chart,
        overlay: refs.lifecycleOverlayRef.current,
        language: refs.languageRef.current,
        paperPosition: drawablePaperPosition,
        series: candleSeries,
        signal: drawableSignal,
        theme: refs.themeRef.current,
      });
      if (refs.lifecycleOverlayRef.current) {
        refs.lifecycleOverlayRef.current.dataset.lifecycleHiddenRight = String(hasHiddenLifecycleSignals);
      }
      updateSignalDataGuideTarget({
        annotationOverlay: refs.lifecycleOverlayRef.current,
        candles: refs.candlesRef.current,
        element: refs.signalDataGuideTargetRef.current,
        paperPosition: drawablePaperPosition,
        series: candleSeries,
        signal: drawableSignal,
      });
      renderCurrentPriceTag({
        candle: refs.candlesRef.current.at(-1) ?? null,
        countdownText: refs.currentCandleCountdownTextRef.current,
        element: refs.currentPriceTagRef.current,
        metrics: refs.chartMetricsRef.current,
        priceColorMode: refs.priceColorModeRef.current,
        series: candleSeries,
      });
      renderHiddenSignalHint({
        element: refs.hiddenSignalHintRef.current,
        isDarkTheme: refs.themeRef.current === "dark",
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

      if (!logicalRange || !refs.canLoadOlderHistoryRef.current || refs.isLoadingOlderHistoryRef.current) {
        return;
      }

      if (logicalRange.from < LEFT_EDGE_HISTORY_THRESHOLD_BARS) {
        refs.onLoadOlderHistoryRef.current();
      }
    };

    const handleChartClick = (param: MouseEventParams<Time>) => {
      const markerId = readTradePointMarkerId(readMouseEventObjectId(param));
      if (!markerId) {
        return;
      }

      if (refs.onTradeMarkerSelectRef.current) {
        refs.onTradeMarkerSelectRef.current(markerId);
        return;
      }

      const marker = refs.tradeMarkersByIdRef.current.get(markerId);
      const signal = marker
        ? refs.eventSignalsRef.current.find((item) => item.id === marker.signalId) ?? (refs.activeSignalRef.current?.id === marker.signalId ? refs.activeSignalRef.current : null)
        : null;
      if (signal) {
        refs.onEventSignalSelectRef.current(signal);
      }
    };

    const updateTradeMarkerTooltip = (nextTooltip: TradeMarkerTooltipState | null) => {
      if (areTradeMarkerTooltipsEqual(refs.tradeMarkerTooltipRef.current, nextTooltip)) {
        return;
      }

      refs.tradeMarkerTooltipRef.current = nextTooltip;
      setTradeMarkerTooltip(nextTooltip);
    };

    const renderCrosshairMove = (param: MouseEventParams<Time>) => {
      renderHoveredCandleInfo({
        candles: refs.candlesRef.current,
        element: hoveredCandleInfoElement,
        language: refs.languageRef.current,
        param,
        priceColorMode: refs.priceColorModeRef.current,
        series: candleSeries,
        theme: refs.themeRef.current,
      });

      const markerId = readTradePointMarkerId(readMouseEventObjectId(param));
      if (!markerId || !param.point) {
        updateTradeMarkerTooltip(null);
        return;
      }

      const marker = refs.tradeMarkersByIdRef.current.get(markerId);
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
    refs.chartRef.current = chart;
    refs.candleSeriesRef.current = candleSeries;
    refs.volumeSeriesRef.current = volumeSeries;
    refs.signalRayPrimitiveRef.current = signalRayPrimitive;
    refs.tradePointPrimitiveRef.current = tradePointPrimitive;

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
      refs.chartRef.current = null;
      refs.candleSeriesRef.current = null;
      refs.volumeSeriesRef.current = null;
      refs.signalRayPrimitiveRef.current = null;
      refs.tradePointPrimitiveRef.current = null;
      refs.priceLineRefs.current = [];
      refs.hasFittedContentRef.current = false;
      refs.renderedCandlesRef.current = [];
      refs.renderedThemeRef.current = refs.themeRef.current;
      refs.renderedPriceColorModeRef.current = refs.priceColorModeRef.current;
    };
  }, [isCompactLayout]);
}
