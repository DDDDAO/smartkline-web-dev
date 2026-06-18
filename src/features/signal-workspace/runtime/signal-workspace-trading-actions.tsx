"use client";

import { useCallback } from "react";
import { EMPTY_COPY_TRADING_TRADE_MARKERS } from "../signal-workspace-helpers";
import type { KlineInterval } from "@/types/market";
import { useSignalWorkspaceTradingActionHandlers } from "./signal-workspace-trading-action-handlers";
import { type SignalWorkspaceState } from "./signal-workspace-state";
import type { SignalWorkspacePrimaryActions } from "./signal-workspace-primary-actions";
import type { SignalWorkspaceSecondaryActions } from "./signal-workspace-secondary-actions";

export function useSignalWorkspaceTradingActions(context: SignalWorkspaceState & SignalWorkspacePrimaryActions & SignalWorkspaceSecondaryActions) {
  const {
    isTopSignalsTab,
    isTopSignalsKolPanel,
    isTopSignalsLeadPanel,
    activeSignal,
    activeChartPaperPosition,
    topSignalsTradeMarkers,
    chartFocusTimeRequest,
    setChartFocusSignalRequestKey,
    setChartFocusTimeRequest,
    setInterval,
  } = context;

  const handlers = useSignalWorkspaceTradingActionHandlers(context);

  const isChartSplitProductTab = isTopSignalsTab;
  const chartActiveSignal = isTopSignalsKolPanel ? activeSignal : null;
  const chartActivePaperPosition = isTopSignalsKolPanel
    ? activeChartPaperPosition
    : null;
  const chartSignals = isTopSignalsKolPanel ? context.signals : [];
  const chartTopSignalsTradeMarkers = topSignalsTradeMarkers;
  const chartTradeMarkers = isTopSignalsLeadPanel
    ? chartTopSignalsTradeMarkers
    : EMPTY_COPY_TRADING_TRADE_MARKERS;
  const chartFocusTime = isTopSignalsLeadPanel ? chartFocusTimeRequest : null;

  const handleIntervalChange = useCallback((nextInterval: KlineInterval) => {
    setChartFocusSignalRequestKey(null);
    setChartFocusTimeRequest(null);
    setInterval(nextInterval);
  }, [setChartFocusSignalRequestKey, setChartFocusTimeRequest, setInterval]);

  const handleFocusSignalRequestHandled = useCallback(() => {
    setChartFocusSignalRequestKey(null);
  }, [setChartFocusSignalRequestKey]);

  const handleFocusTimeRequestHandled = useCallback(() => {
    setChartFocusTimeRequest(null);
  }, [setChartFocusTimeRequest]);

  return {
    ...handlers,
    isChartSplitProductTab,
    chartActiveSignal,
    chartActivePaperPosition,
    chartSignals,
    chartTopSignalsTradeMarkers,
    chartTradeMarkers,
    chartFocusTime,
    handleIntervalChange,
    handleFocusSignalRequestHandled,
    handleFocusTimeRequestHandled,
  };
}

export type SignalWorkspaceTradingActions = ReturnType<
  typeof useSignalWorkspaceTradingActions
>;
