/* eslint-disable react-hooks/exhaustive-deps, react-hooks/immutability -- Lightweight Charts keeps imperative chart objects in refs, and these split lifecycle hooks intentionally mirror the original single-component mutation model. */
import { useEffect } from "react";
import { applyCandlesToSeries, resolveVisibleLogicalRangeAfterCandlesChange } from "./candle-series-updates";
import { createKlineCandlestickSeriesOptions, createKlineChartOptions } from "./chart-options";
import { CANDLE_COUNTDOWN_UPDATE_MS, formatKlineCandleCountdown, renderCurrentPriceTag } from "./current-price-tag";
import { renderHiddenSignalHint } from "./hidden-signal-hint";
import { hideHoveredCandleInfo } from "./hovered-candle-info";
import { renderPaperPositionLifecycleLabels } from "./paper-position-lifecycle-labels";
import { createSignalPriceLines } from "./series-data";
import { renderSignalEventLabels } from "./signal-event-labels";
import type { KlineChartProps } from "./chart-props";
import type { KlineChartRuntimeRefs } from "./runtime-types";
import { updateSignalDataGuideTarget } from "./signal-data-guide-target";

export function useKlineChartDataEffects({
  eventLabelRenderKey,
  isCompactLayout,
  props,
  refs,
}: {
  eventLabelRenderKey: string;
  isCompactLayout: boolean;
  props: KlineChartProps;
  refs: KlineChartRuntimeRefs;
}) {
  useEffect(() => {
    const updateCountdown = () => {
      const latestCandle = refs.candlesRef.current.at(-1) ?? null;
      const countdownText = formatKlineCandleCountdown(latestCandle, props.interval);
      refs.currentCandleCountdownTextRef.current = countdownText;
      renderCurrentPriceTag({
        candle: latestCandle,
        countdownText,
        element: refs.currentPriceTagRef.current,
        metrics: refs.chartMetricsRef.current,
        priceColorMode: refs.priceColorModeRef.current,
        series: refs.candleSeriesRef.current,
      });
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, CANDLE_COUNTDOWN_UPDATE_MS);

    return () => window.clearInterval(intervalId);
  }, [props.interval]);

  useEffect(() => {
    const chart = refs.chartRef.current;
    const candleSeries = refs.candleSeriesRef.current;
    if (!chart || !candleSeries) {
      return;
    }

    chart.applyOptions(createKlineChartOptions(
      props.theme,
      props.priceColorMode,
      refs.chartMetricsRef.current,
      isCompactLayout,
    ));

    candleSeries.applyOptions(createKlineCandlestickSeriesOptions(props.theme, props.priceColorMode));
  }, [isCompactLayout, props.priceColorMode, props.theme]);

  useEffect(() => {
    if (!refs.candleSeriesRef.current || !refs.volumeSeriesRef.current) {
      return;
    }

    if (props.candles.length === 0) {
      refs.candleSeriesRef.current.setData([]);
      refs.volumeSeriesRef.current.setData([]);
      refs.signalRayPrimitiveRef.current?.applyOptions({ candles: props.candles, language: refs.languageRef.current, paperPosition: null, signal: null, theme: props.theme });
      refs.tradePointPrimitiveRef.current?.applyOptions({ activeSignalId: null, candles: props.candles, markers: [], theme: props.theme });
      hideHoveredCandleInfo(refs.hoveredCandleInfoRef.current);
      refs.labelOverlayRef.current?.replaceChildren();
      refs.lifecycleOverlayRef.current?.replaceChildren();
      refs.labelOverlayRef.current?.removeAttribute("data-signal-event-hidden-right");
      refs.lifecycleOverlayRef.current?.removeAttribute("data-lifecycle-hidden-right");
      renderCurrentPriceTag({
        candle: null,
        countdownText: "",
        element: refs.currentPriceTagRef.current,
        metrics: refs.chartMetricsRef.current,
        priceColorMode: props.priceColorMode,
        series: refs.candleSeriesRef.current,
      });
      renderHiddenSignalHint({ element: refs.hiddenSignalHintRef.current, isDarkTheme: props.theme === "dark", isVisible: false });
      refs.hasFittedContentRef.current = false;
      refs.renderedCandlesRef.current = [];
      refs.renderedThemeRef.current = props.theme;
      refs.renderedPriceColorModeRef.current = props.priceColorMode;
      return;
    }

    const previousCandles = refs.renderedCandlesRef.current;
    const hasThemeChanged = refs.renderedThemeRef.current !== props.theme;
    const hasPriceColorModeChanged = refs.renderedPriceColorModeRef.current !== props.priceColorMode;
    const previousVisibleRange = refs.chartRef.current?.timeScale().getVisibleLogicalRange() ?? null;
    const preservedVisibleRange = resolveVisibleLogicalRangeAfterCandlesChange({
      nextCandles: props.candles,
      previousCandles,
      previousVisibleRange,
    });

    applyCandlesToSeries({
      candleSeries: refs.candleSeriesRef.current,
      forceReplace: hasThemeChanged || hasPriceColorModeChanged,
      nextCandles: props.candles,
      priceColorMode: props.priceColorMode,
      previousCandles,
      theme: props.theme,
      volumeSeries: refs.volumeSeriesRef.current,
    });
    renderCurrentPriceTag({
      candle: props.candles.at(-1) ?? null,
      countdownText: refs.currentCandleCountdownTextRef.current,
      element: refs.currentPriceTagRef.current,
      metrics: refs.chartMetricsRef.current,
      priceColorMode: props.priceColorMode,
      series: refs.candleSeriesRef.current,
    });

    if (!refs.hasFittedContentRef.current) {
      const lastCandleIndex = props.candles.length - 1;
      const initialVisibleCandleCount = refs.chartMetricsRef.current.initialVisibleCandleCount;
      refs.chartRef.current?.timeScale().setVisibleLogicalRange({
        from: Math.max(0, lastCandleIndex - initialVisibleCandleCount + 1),
        to: lastCandleIndex,
      });
      refs.hasFittedContentRef.current = true;
    } else if (preservedVisibleRange) {
      refs.chartRef.current?.timeScale().setVisibleLogicalRange(preservedVisibleRange);
    }

    refs.renderedCandlesRef.current = props.candles;
    refs.renderedThemeRef.current = props.theme;
    refs.renderedPriceColorModeRef.current = props.priceColorMode;
  }, [props.candles, isCompactLayout, props.priceColorMode, props.theme]);

  useEffect(() => {
    const drawableSignal = refs.activeSignalDrawingReadyRef.current
      ? refs.activeSignalRef.current
      : null;
    const drawablePaperPosition = refs.activeSignalDrawingReadyRef.current
      ? refs.activePaperPositionRef.current
      : null;
    const hasHiddenEventSignals = renderSignalEventLabels({
      activeSignal: refs.activeSignalRef.current,
      candles: refs.candlesRef.current,
      chart: refs.chartRef.current,
      overlay: refs.labelOverlayRef.current,
      signals: refs.eventSignalsRef.current,
      language: refs.languageRef.current,
      onSignalSelect: refs.onEventSignalSelectRef.current,
      theme: refs.themeRef.current,
    });
    renderHiddenSignalHint({
      element: refs.hiddenSignalHintRef.current,
      isDarkTheme: refs.themeRef.current === "dark",
      isVisible: hasHiddenEventSignals || refs.lifecycleOverlayRef.current?.dataset.lifecycleHiddenRight === "true",
    });
    updateSignalDataGuideTarget({
      annotationOverlay: refs.lifecycleOverlayRef.current,
      candles: refs.candlesRef.current,
      element: refs.signalDataGuideTargetRef.current,
      paperPosition: drawablePaperPosition,
      series: refs.candleSeriesRef.current,
      signal: drawableSignal,
    });
  }, [eventLabelRenderKey]);

  useEffect(() => {
    const series = refs.candleSeriesRef.current;
    if (!series) {
      return;
    }

    const drawableSignal = props.activeSignalDrawingReady ? props.activeSignal : null;
    const drawablePaperPosition = props.activeSignalDrawingReady
      ? props.activePaperPosition
      : null;

    for (const priceLine of refs.priceLineRefs.current) {
      series.removePriceLine(priceLine);
    }

    refs.priceLineRefs.current = createSignalPriceLines(
      drawableSignal,
      drawablePaperPosition,
      props.candles.at(-1),
      props.language,
      props.priceColorMode,
    ).map((line) => series.createPriceLine(line));

    refs.signalRayPrimitiveRef.current?.applyOptions({
      candles: props.candles,
      language: props.language,
      paperPosition: drawablePaperPosition,
      signal: drawableSignal,
      theme: props.theme,
    });
    refs.tradePointPrimitiveRef.current?.applyOptions({
      activeSignalId: props.activeSignal?.id ?? null,
      candles: props.candles,
      markers: props.tradeMarkers,
      theme: props.theme,
    });
    const hasHiddenLifecycleSignals = renderPaperPositionLifecycleLabels({
      candles: props.candles,
      chart: refs.chartRef.current,
      overlay: refs.lifecycleOverlayRef.current,
      language: props.language,
      paperPosition: drawablePaperPosition,
      series,
      signal: drawableSignal,
      theme: props.theme,
    });
    if (refs.lifecycleOverlayRef.current) {
      refs.lifecycleOverlayRef.current.dataset.lifecycleHiddenRight = String(hasHiddenLifecycleSignals);
    }
    renderHiddenSignalHint({
      element: refs.hiddenSignalHintRef.current,
      isDarkTheme: props.theme === "dark",
      isVisible: hasHiddenLifecycleSignals || refs.labelOverlayRef.current?.dataset.signalEventHiddenRight === "true",
    });
    updateSignalDataGuideTarget({
      annotationOverlay: refs.lifecycleOverlayRef.current,
      candles: props.candles,
      element: refs.signalDataGuideTargetRef.current,
      paperPosition: drawablePaperPosition,
      series,
      signal: drawableSignal,
    });
  }, [props.activePaperPosition, props.activeSignal, props.activeSignalDrawingReady, props.candles, isCompactLayout, props.language, props.priceColorMode, props.theme, props.tradeMarkers]);
}
