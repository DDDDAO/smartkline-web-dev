import { resolveKlineChartMetrics } from "./chart-metrics";
import type { KlineChartProps } from "./chart-props";
import { createSignalEventRenderKey } from "./signal-event-labels";
import { useKlineChartDataEffects } from "./use-kline-chart-data-effects";
import { useKlineChartFocusEffects } from "./use-kline-chart-focus-effects";
import { useKlineChartRefs } from "./use-kline-chart-refs";
import { useKlineChartSubscriptions } from "./use-kline-chart-subscriptions";

export function useKlineChart(props: KlineChartProps) {
  const isCompactLayout = props.isCompactLayout ?? false;
  const chartMetrics = resolveKlineChartMetrics(isCompactLayout);
  const {
    refs,
    setTradeMarkerTooltip,
    tradeMarkerTooltip,
  } = useKlineChartRefs(props, chartMetrics);
  const eventLabelRenderKey = `${createSignalEventRenderKey(props.candles, props.eventSignals, props.theme, props.language, props.activeSignal?.id ?? null)}:${props.priceColorMode}:${isCompactLayout ? "compact" : "desktop"}`;

  useKlineChartSubscriptions({
    isCompactLayout,
    refs,
    setTradeMarkerTooltip,
  });
  useKlineChartDataEffects({
    eventLabelRenderKey,
    isCompactLayout,
    props,
    refs,
  });
  useKlineChartFocusEffects({ props, refs });

  return {
    containerRef: refs.containerRef,
    currentPriceTagRef: refs.currentPriceTagRef,
    hiddenSignalHintRef: refs.hiddenSignalHintRef,
    hoveredCandleInfoRef: refs.hoveredCandleInfoRef,
    isCompactLayout,
    labelOverlayRef: refs.labelOverlayRef,
    lifecycleOverlayRef: refs.lifecycleOverlayRef,
    signalDataGuideTargetRef: refs.signalDataGuideTargetRef,
    tradeMarkerTooltip,
  };
}
