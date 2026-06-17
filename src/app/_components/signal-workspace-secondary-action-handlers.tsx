"use client";

import { useCallback } from "react";

import { createSignalFocusRequestKey } from "@/app/_components/kline-chart";
import { toCopyTradingMarketSymbol } from "@/app/_lib/copy-trading-radar-api";
import { createKolSourceWatchKey } from "@/app/_lib/workspace-watchlist";
import type {
  CopyTradingEvent,
  CopyTradingPosition,
  CopyTradingTradeMarker,
} from "@/app/_types/copy-trading";
import type { MarketSymbol } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";
import type { WorkspaceProductTab } from "./signal-workspace/product-tabs";
import type { SignalWorkspacePrimaryActions } from "./signal-workspace-primary-actions";
import type { SignalWorkspaceState } from "./signal-workspace-state";

export function useSignalWorkspaceSecondaryActionHandlers(
  context: SignalWorkspaceState & SignalWorkspacePrimaryActions,
) {
  const {
    activeAccountStrategyId,
    activeProductTab,
    authMe,
    isRightPanelCollapsed,
    isRightPanelExiting,
    pendingRouteTopSignalTradeEventIdRef,
    rightPanelExitTimeoutRef,
    setActiveAccountStrategyId,
    setActiveProductTab,
    setActiveSignalId,
    setActiveTopSignalSourceId,
    setActiveTopSignalTradeEventId,
    setChartFocusSignalRequestKey,
    setChartFocusTimeRequest,
    setExplicitTopSignalSourceId,
    setIsRightPanelCollapsed,
    setIsRightPanelExiting,
    setSymbol,
    setTopSignalsSourceFilterId,
    setWatchlist,
    signals,
    startTelegramLogin,
    topSignalsActiveSourceIds,
    topSignalsEventsById,
    updateWorkspaceRouteUrl,
  } = context;

  const toggleRightPanel = () => {
    if (isRightPanelExiting) {
      return;
    }

    if (isRightPanelCollapsed) {
      setIsRightPanelCollapsed(false);
      return;
    }

    setIsRightPanelExiting(true);
    rightPanelExitTimeoutRef.current = window.setTimeout(() => {
      setIsRightPanelCollapsed(true);
      setIsRightPanelExiting(false);
      rightPanelExitTimeoutRef.current = null;
    }, 220);
  };

  const handleSignalSelect = useCallback(
    (signal: StructuredSignal) => {
      setChartFocusSignalRequestKey(createSignalFocusRequestKey(signal));
      setChartFocusTimeRequest(null);
      setActiveSignalId(signal.id);
      setSymbol(signal.symbol);
      updateWorkspaceRouteUrl("replace", {
        signalId: signal.id,
        symbol: signal.symbol,
      });
    },
    [
      setActiveSignalId,
      setChartFocusSignalRequestKey,
      setChartFocusTimeRequest,
      setSymbol,
      updateWorkspaceRouteUrl,
    ],
  );

  const handleSymbolChange = useCallback(
    (nextSymbol: MarketSymbol) => {
      const nextSignal = signals.find((signal) => signal.symbol === nextSymbol);
      setChartFocusSignalRequestKey(null);
      setChartFocusTimeRequest(null);
      setSymbol(nextSymbol);
      setActiveSignalId(nextSignal?.id ?? "");
      if (activeProductTab === "topSignals") {
        setActiveTopSignalTradeEventId("");
        pendingRouteTopSignalTradeEventIdRef.current = "";
      }
      updateWorkspaceRouteUrl("replace", {
        signalId: nextSignal?.id ?? "",
        symbol: nextSymbol,
      });
    },
    [
      activeProductTab,
      pendingRouteTopSignalTradeEventIdRef,
      setActiveSignalId,
      setActiveTopSignalTradeEventId,
      setChartFocusSignalRequestKey,
      setChartFocusTimeRequest,
      setSymbol,
      signals,
      updateWorkspaceRouteUrl,
    ],
  );

  const handleProductTabChange = useCallback(
    (nextTab: WorkspaceProductTab) => {
      setActiveProductTab(nextTab);
      if (nextTab !== "accountManagement") {
        setActiveAccountStrategyId("");
      }
      if (nextTab !== "topSignals") {
        pendingRouteTopSignalTradeEventIdRef.current = "";
      }
      updateWorkspaceRouteUrl("push", {
        accountStrategyId:
          nextTab === "accountManagement" ? activeAccountStrategyId : "",
        tab: nextTab,
      });
    },
    [
      activeAccountStrategyId,
      pendingRouteTopSignalTradeEventIdRef,
      setActiveAccountStrategyId,
      setActiveProductTab,
      updateWorkspaceRouteUrl,
    ],
  );

  const handleAccountEntry = useCallback(() => {
    if (authMe.isLoggedIn) {
      handleProductTabChange("accountManagement");
      return;
    }

    startTelegramLogin();
  }, [authMe.isLoggedIn, handleProductTabChange, startTelegramLogin]);

  const handleAccountStrategyRouteChange = useCallback(
    (strategyId: string | null, mode: "push" | "replace" = "push") => {
      const nextStrategyId = strategyId ?? "";
      setActiveProductTab("accountManagement");
      setActiveAccountStrategyId(nextStrategyId);
      updateWorkspaceRouteUrl(mode, {
        accountStrategyId: nextStrategyId,
        tab: "accountManagement",
      });
    },
    [setActiveAccountStrategyId, setActiveProductTab, updateWorkspaceRouteUrl],
  );

  const handleTopSignalSourceSelect = useCallback(
    (sourceId: string) => {
      setActiveTopSignalSourceId(sourceId);
      setExplicitTopSignalSourceId(sourceId);
      setActiveTopSignalTradeEventId("");
      pendingRouteTopSignalTradeEventIdRef.current = "";
      updateWorkspaceRouteUrl("replace", {
        tab: "topSignals",
        topSignalSourceId: sourceId,
      });
    },
    [
      pendingRouteTopSignalTradeEventIdRef,
      setActiveTopSignalSourceId,
      setActiveTopSignalTradeEventId,
      setExplicitTopSignalSourceId,
      updateWorkspaceRouteUrl,
    ],
  );

  const handleTopSignalSourceFilterChange = useCallback(
    (sourceId: string) => {
      setTopSignalsSourceFilterId(sourceId);
      setExplicitTopSignalSourceId(sourceId === "all" ? "" : sourceId);
      pendingRouteTopSignalTradeEventIdRef.current = "";
      if (sourceId !== "all") {
        setActiveTopSignalSourceId(sourceId);
      }
      setActiveTopSignalTradeEventId("");
      updateWorkspaceRouteUrl("replace", {
        tab: "topSignals",
        topSignalSourceId: sourceId === "all" ? "" : sourceId,
      });
    },
    [
      pendingRouteTopSignalTradeEventIdRef,
      setActiveTopSignalSourceId,
      setActiveTopSignalTradeEventId,
      setExplicitTopSignalSourceId,
      setTopSignalsSourceFilterId,
      updateWorkspaceRouteUrl,
    ],
  );

  const handleTopSignalPositionSelect = useCallback(
    (position: CopyTradingPosition) => {
      const nextSymbol = toCopyTradingMarketSymbol(position.symbol);
      setActiveTopSignalSourceId(position.trader_id);
      setExplicitTopSignalSourceId(position.trader_id);
      if (topSignalsActiveSourceIds.has(position.trader_id)) {
        setTopSignalsSourceFilterId(position.trader_id);
      }
      setActiveTopSignalTradeEventId("");
      pendingRouteTopSignalTradeEventIdRef.current = "";
      setChartFocusSignalRequestKey(null);
      setChartFocusTimeRequest(null);
      setSymbol(nextSymbol);
      updateWorkspaceRouteUrl("replace", {
        symbol: nextSymbol,
        tab: "topSignals",
        topSignalSourceId: position.trader_id,
      });
    },
    [
      pendingRouteTopSignalTradeEventIdRef,
      setActiveTopSignalSourceId,
      setActiveTopSignalTradeEventId,
      setChartFocusSignalRequestKey,
      setChartFocusTimeRequest,
      setExplicitTopSignalSourceId,
      setSymbol,
      setTopSignalsSourceFilterId,
      topSignalsActiveSourceIds,
      updateWorkspaceRouteUrl,
    ],
  );

  const handleTopSignalTradeSelect = useCallback(
    (event: CopyTradingEvent) => {
      const eventTimeMs = Date.parse(event.occurred_at);
      const nextSymbol = toCopyTradingMarketSymbol(event.symbol);
      setActiveTopSignalSourceId(event.trader_id);
      setExplicitTopSignalSourceId(event.trader_id);
      if (topSignalsActiveSourceIds.has(event.trader_id)) {
        setTopSignalsSourceFilterId(event.trader_id);
      }
      setActiveTopSignalTradeEventId(event.event_id);
      pendingRouteTopSignalTradeEventIdRef.current = "";
      setChartFocusSignalRequestKey(null);
      setSymbol(nextSymbol);

      if (Number.isFinite(eventTimeMs)) {
        setChartFocusTimeRequest({
          key: `top-signal-trade:${event.event_id}:${eventTimeMs}`,
          sourceTimeMs: eventTimeMs,
        });
      } else {
        setChartFocusTimeRequest(null);
      }
      updateWorkspaceRouteUrl("replace", {
        symbol: nextSymbol,
        tab: "topSignals",
        topSignalSourceId: event.trader_id,
      });
    },
    [
      pendingRouteTopSignalTradeEventIdRef,
      setActiveTopSignalSourceId,
      setActiveTopSignalTradeEventId,
      setChartFocusSignalRequestKey,
      setChartFocusTimeRequest,
      setExplicitTopSignalSourceId,
      setSymbol,
      setTopSignalsSourceFilterId,
      topSignalsActiveSourceIds,
      updateWorkspaceRouteUrl,
    ],
  );

  const handleTopSignalTradeMarkerSelect = useCallback(
    (marker: CopyTradingTradeMarker) => {
      const event = topSignalsEventsById.get(marker.eventId);
      if (event) {
        handleTopSignalTradeSelect(event);
      }
    },
    [handleTopSignalTradeSelect, topSignalsEventsById],
  );

  const handleKolSourceWatchToggle = useCallback(
    (signal: StructuredSignal) => {
      const sourceKey = createKolSourceWatchKey(signal.source_name);
      if (!sourceKey) {
        return;
      }

      setWatchlist((currentWatchlist) => {
        const isAlreadyWatched = currentWatchlist.kolSources.some(
          (source) => source.key === sourceKey,
        );

        if (isAlreadyWatched) {
          return {
            ...currentWatchlist,
            kolSources: currentWatchlist.kolSources.filter(
              (source) => source.key !== sourceKey,
            ),
          };
        }

        return {
          ...currentWatchlist,
          kolSources: [
            {
              avatarUrl: signal.source_avatar_url,
              favoritedAt: new Date().toISOString(),
              key: sourceKey,
              name: signal.source_name,
              sourceType: signal.source_type,
            },
            ...currentWatchlist.kolSources,
          ],
        };
      });
    },
    [setWatchlist],
  );

  return {
    handleAccountEntry,
    handleAccountStrategyRouteChange,
    handleKolSourceWatchToggle,
    handleProductTabChange,
    handleSignalSelect,
    handleSymbolChange,
    handleTopSignalPositionSelect,
    handleTopSignalSourceFilterChange,
    handleTopSignalSourceSelect,
    handleTopSignalTradeMarkerSelect,
    handleTopSignalTradeSelect,
    toggleRightPanel,
  };
}

export type SignalWorkspaceSecondaryActionHandlers = ReturnType<
  typeof useSignalWorkspaceSecondaryActionHandlers
>;
