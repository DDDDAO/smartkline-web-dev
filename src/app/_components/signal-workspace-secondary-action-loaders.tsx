"use client";

import { useEffect, useRef } from "react";

import {
  createMarketAlignedMockCopyTradingRadarSnapshot,
  fetchCopyTradingRadarSnapshot,
  isActiveCopyTradingTrader,
  toCopyTradingMarketSymbol,
} from "@/app/_lib/copy-trading-radar-api";
import { fetchKolSignals, fetchKolSignalsAfter } from "@/app/_lib/kol-signal-api";
import type { CopyTradingRadarSnapshot } from "@/app/_types/copy-trading";
import type { StructuredSignal } from "@/app/_types/signal";
import {
  dedupeStructuredSignalsByPosition,
  formatKolSignalSourceError,
  getLatestStructuredSignalCreatedAt,
  KOL_SIGNAL_POLL_INTERVAL_MS,
  mergeIncomingSignals,
  TOP_SIGNALS_POLL_INTERVAL_MS,
} from "./signal-workspace/signal-workspace-helpers";
import type { SignalWorkspacePrimaryActions } from "./signal-workspace-primary-actions";
import type { SignalWorkspaceState } from "./signal-workspace-state";

export function useSignalWorkspaceSecondaryActionLoaders(
  context: SignalWorkspaceState & SignalWorkspacePrimaryActions,
) {
  const {
    activeProductTab,
    activeTopSignalTradeEventId,
    copyRef,
    isTopSignalsTab,
    pendingRouteTopSignalTradeEventIdRef,
    setActiveSignalId,
    setActiveTopSignalSourceId,
    setActiveTopSignalTradeEventId,
    setChartFocusSignalRequestKey,
    setChartFocusTimeRequest,
    setExplicitTopSignalSourceId,
    setKolSignalSourceStatus,
    setSignals,
    setSymbol,
    setTopSignalsSnapshot,
    setTopSignalsSourceFilterId,
    setTopSignalsSourceStatus,
    setWorkspaceNotification,
    shouldLoadKolSignals,
    shouldLoadTopSignalsSnapshot,
    topSignalPerformanceWindow,
    topSignalsSnapshot,
    topSignalSortKey,
  } = context;
  const latestKolSignalCreatedAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldLoadKolSignals) {
      return;
    }

    let isActive = true;
    let isPolling = false;
    let pollingIntervalId: number | null = null;

    const rememberLatestSignalCreatedAt = (
      nextSignals: readonly StructuredSignal[],
    ) => {
      const latestCreatedAt = getLatestStructuredSignalCreatedAt(nextSignals);
      if (!latestCreatedAt) {
        return;
      }

      const currentTimestamp = Date.parse(
        latestKolSignalCreatedAtRef.current ?? "",
      );
      const nextTimestamp = Date.parse(latestCreatedAt);
      if (
        !latestKolSignalCreatedAtRef.current ||
        !Number.isFinite(currentTimestamp) ||
        nextTimestamp > currentTimestamp
      ) {
        latestKolSignalCreatedAtRef.current = latestCreatedAt;
      }
    };

    const applyInitialSignals = (loadedSignals: StructuredSignal[]) => {
      if (!isActive) {
        return;
      }

      const sortedSignals = dedupeStructuredSignalsByPosition(loadedSignals);
      rememberLatestSignalCreatedAt(sortedSignals);
      setSignals(sortedSignals);
      setKolSignalSourceStatus({ error: null, isLoading: false });
      setActiveSignalId((currentActiveSignalId) =>
        sortedSignals.some((signal) => signal.id === currentActiveSignalId)
          ? currentActiveSignalId
          : (sortedSignals[0]?.id ?? ""),
      );
    };

    const applyIncomingSignals = (incomingSignals: StructuredSignal[]) => {
      if (!isActive || incomingSignals.length === 0) {
        return;
      }

      setSignals((currentSignals) => {
        const mergedSignals = mergeIncomingSignals(
          incomingSignals,
          currentSignals,
        );
        rememberLatestSignalCreatedAt(mergedSignals);
        return mergedSignals;
      });
      setKolSignalSourceStatus({ error: null, isLoading: false });
      setActiveSignalId(
        (currentActiveSignalId) =>
          currentActiveSignalId || incomingSignals[0]?.id || "",
      );
      const currentCopy = copyRef.current;
      setWorkspaceNotification({
        id: `kol-signal-poll-${Date.now()}`,
        kind: "info",
        message: currentCopy.workspace.signalUpdateMessage(incomingSignals.length),
        meta: currentCopy.workspace.signalUpdateMeta,
        title: currentCopy.workspace.signalUpdateTitle,
      });
    };

    const pollIncomingSignals = async () => {
      const latestCreatedAt = latestKolSignalCreatedAtRef.current;
      if (!isActive || isPolling || !latestCreatedAt) {
        return;
      }

      isPolling = true;
      try {
        const incomingSignals = await fetchKolSignalsAfter(latestCreatedAt);
        if (incomingSignals.length > 0) {
          applyIncomingSignals(incomingSignals);
        } else if (isActive) {
          setKolSignalSourceStatus({ error: null, isLoading: false });
        }
      } catch (error: unknown) {
        if (isActive) {
          setKolSignalSourceStatus({
            error: formatKolSignalSourceError(error),
            isLoading: false,
          });
        }
      } finally {
        isPolling = false;
      }
    };

    fetchKolSignals()
      .then((loadedSignals) => {
        applyInitialSignals(loadedSignals);
        pollingIntervalId = window.setInterval(() => {
          void pollIncomingSignals();
        }, KOL_SIGNAL_POLL_INTERVAL_MS);
      })
      .catch((error: unknown) => {
        if (isActive) {
          setSignals([]);
          setActiveSignalId("");
          setKolSignalSourceStatus({
            error: formatKolSignalSourceError(error),
            isLoading: false,
          });
        }
      });

    return () => {
      isActive = false;
      if (pollingIntervalId !== null) {
        window.clearInterval(pollingIntervalId);
      }
    };
  }, [
    copyRef,
    setActiveSignalId,
    setKolSignalSourceStatus,
    setSignals,
    setWorkspaceNotification,
    shouldLoadKolSignals,
  ]);

  useEffect(() => {
    if (!shouldLoadTopSignalsSnapshot) {
      return;
    }

    let isActive = true;
    let isPolling = false;
    let pollingIntervalId: number | null = null;

    const applySnapshot = (
      snapshot: CopyTradingRadarSnapshot,
      error: string | null,
    ) => {
      if (!isActive) {
        return;
      }

      setTopSignalsSnapshot(snapshot);
      setTopSignalsSourceStatus({ error, isLoading: false });
      const activeSourceIds = new Set(
        snapshot.traders
          .filter(isActiveCopyTradingTrader)
          .map((trader) => trader.trader_id),
      );
      setActiveTopSignalSourceId((currentSourceId) =>
        activeSourceIds.has(currentSourceId)
          ? currentSourceId
          : (snapshot.traders.find(isActiveCopyTradingTrader)?.trader_id ?? ""),
      );
      setTopSignalsSourceFilterId((currentSourceFilterId) =>
        currentSourceFilterId === "all" ||
        activeSourceIds.has(currentSourceFilterId)
          ? currentSourceFilterId
          : "all",
      );
      setActiveTopSignalTradeEventId((currentTradeEventId) =>
        snapshot.events.some((event) => event.event_id === currentTradeEventId)
          ? currentTradeEventId
          : "",
      );
    };

    const loadSnapshot = async (
      allowMockFallback: boolean,
      showLoading: boolean,
    ) => {
      if (!isActive || isPolling) {
        return;
      }

      isPolling = true;
      if (showLoading) {
        setTopSignalsSourceStatus({ error: null, isLoading: true });
      }
      try {
        const snapshot = await fetchCopyTradingRadarSnapshot({
          includePerformance: true,
          performanceWindow: topSignalPerformanceWindow,
          sortKey: topSignalSortKey,
        });
        applySnapshot(snapshot, null);
      } catch (error: unknown) {
        const message = formatKolSignalSourceError(error);
        if (!allowMockFallback) {
          if (isActive) {
            setTopSignalsSourceStatus({ error: message, isLoading: false });
          }
          return;
        }

        try {
          const mockSnapshot = await createMarketAlignedMockCopyTradingRadarSnapshot();
          applySnapshot(mockSnapshot, message);
        } catch {
          if (isActive) {
            setTopSignalsSnapshot(null);
            setActiveTopSignalSourceId("");
            setTopSignalsSourceStatus({ error: message, isLoading: false });
          }
        }
      } finally {
        isPolling = false;
      }
    };

    void loadSnapshot(isTopSignalsTab, true);
    if (isTopSignalsTab) {
      pollingIntervalId = window.setInterval(() => {
        void loadSnapshot(false, false);
      }, TOP_SIGNALS_POLL_INTERVAL_MS);
    }

    return () => {
      isActive = false;
      if (pollingIntervalId !== null) {
        window.clearInterval(pollingIntervalId);
      }
    };
  }, [
    isTopSignalsTab,
    setActiveTopSignalSourceId,
    setActiveTopSignalTradeEventId,
    setTopSignalsSnapshot,
    setTopSignalsSourceFilterId,
    setTopSignalsSourceStatus,
    shouldLoadTopSignalsSnapshot,
    topSignalPerformanceWindow,
    topSignalSortKey,
  ]);

  useEffect(() => {
    const pendingTradeEventId = pendingRouteTopSignalTradeEventIdRef.current;
    if (
      activeProductTab !== "topSignals" ||
      !topSignalsSnapshot ||
      !pendingTradeEventId ||
      pendingTradeEventId !== activeTopSignalTradeEventId
    ) {
      return;
    }

    const event = topSignalsSnapshot.events.find(
      (snapshotEvent) => snapshotEvent.event_id === pendingTradeEventId,
    );
    pendingRouteTopSignalTradeEventIdRef.current = "";
    if (!event) {
      return;
    }

    const eventTimeMs = Date.parse(event.occurred_at);
    const nextSymbol = toCopyTradingMarketSymbol(event.symbol);
    setActiveTopSignalSourceId(event.trader_id);
    setExplicitTopSignalSourceId(event.trader_id);
    setSymbol(nextSymbol);
    if (Number.isFinite(eventTimeMs)) {
      setChartFocusSignalRequestKey(null);
      setChartFocusTimeRequest({
        key: `top-signal-route:${event.event_id}:${eventTimeMs}`,
        sourceTimeMs: eventTimeMs,
      });
    }
  }, [
    activeProductTab,
    activeTopSignalTradeEventId,
    pendingRouteTopSignalTradeEventIdRef,
    setActiveTopSignalSourceId,
    setChartFocusSignalRequestKey,
    setChartFocusTimeRequest,
    setExplicitTopSignalSourceId,
    setSymbol,
    topSignalsSnapshot,
  ]);
}
