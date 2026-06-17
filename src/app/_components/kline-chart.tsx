"use client";

import { AiSignalSummaryOverlay } from "./kline-chart/ai-signal-summary-overlay";
import type { KlineChartProps } from "./kline-chart/chart-props";
import { SignalBiasSummaryOverlay } from "./kline-chart/signal-bias-summary-overlay";
import { createTradeMarkerTooltipStyle, TradeMarkerTooltip } from "./kline-chart/trade-marker-tooltip";
import { useKlineChart } from "./kline-chart/use-kline-chart";

export { createSignalFocusRequestKey } from "./kline-chart/signal-focus";
export type { KlineChartProps } from "./kline-chart/chart-props";
export type { ChartTheme } from "./kline-chart/types";


export function KlineChart(props: KlineChartProps) {
  const {
    containerRef,
    currentPriceTagRef,
    hiddenSignalHintRef,
    hoveredCandleInfoRef,
    isCompactLayout,
    labelOverlayRef,
    lifecycleOverlayRef,
    signalDataGuideTargetRef,
    tradeMarkerTooltip,
  } = useKlineChart(props);

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
        language={props.language}
        summary={props.aiSummary}
        theme={props.theme}
      />
      <SignalBiasSummaryOverlay
        language={props.language}
        summary={props.signalBiasSummary ?? null}
        theme={props.theme}
      />
      {tradeMarkerTooltip ? (
        <TradeMarkerTooltip
          language={props.language}
          marker={tradeMarkerTooltip.marker}
          style={createTradeMarkerTooltipStyle(tradeMarkerTooltip)}
          theme={props.theme}
        />
      ) : null}
    </div>
  );
}
