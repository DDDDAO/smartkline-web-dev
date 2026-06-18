import { useEffect, useRef, useState } from "react";
import type { IChartApi, IPriceLine, ISeriesApi } from "lightweight-charts";
import type { KlineChartProps } from "./chart-props";
import type { KlineChartMetrics } from "./chart-metrics";
import type { KlineChartRuntimeRefs } from "./runtime-types";
import type { SignalPriceRayPrimitive } from "./signal-price-ray-primitive";
import type { KlineTradePointMarker, TradePointPrimitive } from "./trade-point-primitive";
import { createTradeMarkerLookup, type TradeMarkerTooltipState } from "./trade-marker-tooltip";
import type { ChartTheme, PriceColorMode } from "./types";
import type { MarketCandle } from "@/app/_types/market";

export function useKlineChartRefs(
  props: KlineChartProps,
  chartMetrics: KlineChartMetrics,
): {
  refs: KlineChartRuntimeRefs;
  setTradeMarkerTooltip: (nextTooltip: TradeMarkerTooltipState | null) => void;
  tradeMarkerTooltip: TradeMarkerTooltipState | null;
} {
  const {
    activePaperPosition,
    activeSignal,
    activeSignalDrawingReady,
    candles,
    canLoadOlderHistory,
    eventSignals,
    isLoadingOlderHistory,
    language,
    onEventSignalSelect,
    onLoadOlderHistory,
    onTradeMarkerSelect,
    priceColorMode,
    theme,
    tradeMarkers,
  } = props;
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

  return {
    refs: {
      activePaperPositionRef,
      activeSignalDrawingReadyRef,
      activeSignalRef,
      candleSeriesRef,
      candlesRef,
      canLoadOlderHistoryRef,
      chartMetricsRef,
      chartRef,
      containerRef,
      currentCandleCountdownTextRef,
      currentPriceTagRef,
      eventSignalsRef,
      handledFocusSignalRequestKeyRef,
      handledFocusTimeRequestKeyRef,
      hasFittedContentRef,
      hiddenSignalHintRef,
      hoveredCandleInfoRef,
      isLoadingOlderHistoryRef,
      labelOverlayRef,
      languageRef,
      lifecycleOverlayRef,
      onEventSignalSelectRef,
      onLoadOlderHistoryRef,
      onTradeMarkerSelectRef,
      priceColorModeRef,
      priceLineRefs,
      renderedCandlesRef,
      renderedPriceColorModeRef,
      renderedThemeRef,
      signalDataGuideTargetRef,
      signalRayPrimitiveRef,
      themeRef,
      tradeMarkerTooltipRef,
      tradeMarkersByIdRef,
      tradeMarkersRef,
      tradePointPrimitiveRef,
      volumeSeriesRef,
    },
    setTradeMarkerTooltip,
    tradeMarkerTooltip,
  };
}
