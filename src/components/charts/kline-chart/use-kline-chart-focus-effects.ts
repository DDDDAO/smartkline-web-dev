/* eslint-disable react-hooks/exhaustive-deps, react-hooks/immutability -- Lightweight Charts keeps imperative chart objects in refs, and these split lifecycle hooks intentionally mirror the original single-component mutation model. */
import { useEffect } from "react";
import { findNearestCandleIndex } from "./candle-series-updates";
import type { KlineChartProps } from "./chart-props";
import { createSignalFocusRequestKey } from "./signal-focus";
import type { KlineChartRuntimeRefs } from "./runtime-types";

export function useKlineChartFocusEffects({
  props,
  refs,
}: {
  props: KlineChartProps;
  refs: KlineChartRuntimeRefs;
}) {
  useEffect(() => {
    const chart = refs.chartRef.current;
    if (!chart || !props.activeSignal || !props.focusSignalRequestKey || props.candles.length === 0) {
      return;
    }

    if (props.focusSignalRequestKey !== createSignalFocusRequestKey(props.activeSignal)) {
      return;
    }

    if (refs.handledFocusSignalRequestKeyRef.current === props.focusSignalRequestKey) {
      return;
    }

    const targetIndex = findNearestCandleIndex(props.candles, Date.parse(props.activeSignal.created_at));
    if (targetIndex === -1) {
      return;
    }

    /**
     * Focus remains command-driven so same-symbol selection keeps the user's
     * chart viewport, while cross-symbol selection opens around the event.
     */
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, targetIndex - 52),
      to: Math.min(props.candles.length - 1, targetIndex + 52),
    });
    refs.handledFocusSignalRequestKeyRef.current = props.focusSignalRequestKey;
    props.onFocusSignalRequestHandled();
  }, [props.activeSignal, props.candles, props.focusSignalRequestKey, props.onFocusSignalRequestHandled]);

  useEffect(() => {
    const chart = refs.chartRef.current;
    if (!chart || !props.focusTimeRequest || props.candles.length === 0) {
      return;
    }

    if (refs.handledFocusTimeRequestKeyRef.current === props.focusTimeRequest.key) {
      return;
    }

    const targetIndex = findNearestCandleIndex(props.candles, props.focusTimeRequest.sourceTimeMs);
    if (targetIndex === -1) {
      return;
    }

    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, targetIndex - 52),
      to: Math.min(props.candles.length - 1, targetIndex + 52),
    });
    refs.handledFocusTimeRequestKeyRef.current = props.focusTimeRequest.key;
    props.onFocusTimeRequestHandled?.();
  }, [props.candles, props.focusTimeRequest, props.onFocusTimeRequestHandled]);
}
