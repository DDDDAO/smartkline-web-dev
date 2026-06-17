"use client";

import { useCallback } from "react";
import { EMPTY_COPY_TRADING_TRADE_MARKERS } from "./signal-workspace/signal-workspace-helpers";
import type { KlineInterval } from "@/app/_types/market";
import { useSignalWorkspaceTradingActionHandlers, type SignalWorkspaceTradingActionHandlers } from "./signal-workspace-trading-action-handlers";
import { type SignalWorkspaceState } from "./signal-workspace-state";
import type { SignalWorkspacePrimaryActions } from "./signal-workspace-primary-actions";
import type { SignalWorkspaceSecondaryActions } from "./signal-workspace-secondary-actions";

export function useSignalWorkspaceTradingActions(context: SignalWorkspaceState & SignalWorkspacePrimaryActions & SignalWorkspaceSecondaryActions) {
  const {
    isIntelTab,
    isTopSignalsTab,
    activeSignal,
    activeChartPaperPosition,
    topSignalsTradeMarkers,
    chartFocusTimeRequest,
    setChartFocusSignalRequestKey,
    setChartFocusTimeRequest,
    setInterval,
  } = context;

  const handlers = useSignalWorkspaceTradingActionHandlers(context);

  const isChartSplitProductTab = isIntelTab || isTopSignalsTab;
  const chartActiveSignal = isIntelTab ? activeSignal : null;
  const chartActivePaperPosition = isIntelTab ? activeChartPaperPosition : null;
  const chartSignals = isIntelTab ? context.signals : [];
  const chartTopSignalsTradeMarkers = topSignalsTradeMarkers;
  const chartTradeMarkers = isTopSignalsTab
    ? chartTopSignalsTradeMarkers
    : EMPTY_COPY_TRADING_TRADE_MARKERS;
  const chartFocusTime = isTopSignalsTab ? chartFocusTimeRequest : null;

  const handleIntervalChange = useCallback((nextInterval: KlineInterval) => {
    setChartFocusSignalRequestKey(null);
    setChartFocusTimeRequest(null);
    setInterval(nextInterval);
  }, []);

  const handleFocusSignalRequestHandled = useCallback(() => {
    setChartFocusSignalRequestKey(null);
  }, []);

  const handleFocusTimeRequestHandled = useCallback(() => {
    setChartFocusTimeRequest(null);
  }, []);

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
