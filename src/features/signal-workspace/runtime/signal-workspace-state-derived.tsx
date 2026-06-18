"use client";

import { useDeferredValue, useMemo } from "react";

import {
  applyCopyTradingLatestPrices,
  createCopyTradingTradeMarkers,
  isActiveCopyTradingTrader,
} from "@/app/_lib/copy-trading-radar-api";
import {
  computePaperPositionRecord,
  type PaperPositionRecord,
} from "@/app/_lib/paper-position";
import {
  createCopyTradingPrototypeTargets,
  createPrioritizedPaperPositionSignals,
  createTopSignalsSignalBiasSummary,
  EMPTY_COPY_TRADING_TRADE_MARKERS,
  EMPTY_MARKET_SYMBOL_LIST,
  MARIO_STRATEGIES_STORAGE_PREFIX,
  PAPER_POSITION_PRICE_UPDATE_INTERVAL_MS,
  sortSignalsForKolPanel,
  TOP_SIGNAL_PRICE_UPDATE_INTERVAL_MS,
} from "../signal-workspace-helpers";
import {
  readBinanceMiniTickerPrice,
  useBinanceMiniTickerPrices,
} from "../use-binance-mini-ticker-prices";
import { usePaperPositionCandles } from "../use-paper-position-candles";
import type { SignalWorkspaceStateBase } from "./signal-workspace-state-base";

export function useSignalWorkspaceStateDerived(base: SignalWorkspaceStateBase) {
  const {
    activeProductTab,
    activeSignalId,
    authMe,
    isProductTabHydrated,
    isRightPanelCollapsed,
    latestMarketCandleUpdate,
    prototypeApiConnections,
    prototypeMarioStrategies,
    prototypeStrategies,
    signals,
    symbol,
    theme,
    topSignalsPanel,
    topSignalsSnapshot,
    topSignalsSourceFilterId,
    watchlist,
  } = base;

  const activeSignal =
    signals.find((signal) => signal.id === activeSignalId) ??
    signals[0] ??
    null;
  const isTopSignalsTab = activeProductTab === "topSignals";
  const isTopSignalsLeadPanel =
    isTopSignalsTab && topSignalsPanel === "lead";
  const isTopSignalsKolPanel = isTopSignalsTab && topSignalsPanel === "kol";
  const isStrategySquareTab = activeProductTab === "strategySquare";
  const isStrategyManagementTab = activeProductTab === "strategyManagement";
  const isAccountManagementTab = activeProductTab === "accountManagement";
  const isPrivateWorkspaceTab = isStrategyManagementTab || isAccountManagementTab;
  const shouldUsePaperPositions = isTopSignalsKolPanel;
  const kolSignals = useMemo(() => sortSignalsForKolPanel(signals), [signals]);
  const watchlistedKolSourceKeys = useMemo(
    () => new Set(watchlist.kolSources.map((source) => source.key)),
    [watchlist.kolSources],
  );
  const paperPositionSignals = useMemo(
    () =>
      createPrioritizedPaperPositionSignals({
        activeSignal,
        signals: kolSignals,
        shouldUsePaperPositions,
        watchlistedKolSourceKeys,
      }),
    [
      activeSignal,
      kolSignals,
      shouldUsePaperPositions,
      watchlistedKolSourceKeys,
    ],
  );
  const watchlistedTopSignalSourceIds = useMemo(
    () => new Set(watchlist.topSignalSources.map((source) => source.id)),
    [watchlist.topSignalSources],
  );
  const topSignalMiniTickerSymbols = useMemo(() => {
    if (!isTopSignalsLeadPanel || !topSignalsSnapshot) {
      return EMPTY_MARKET_SYMBOL_LIST;
    }

    return Array.from(
      new Set(topSignalsSnapshot.positions.map((position) => position.symbol)),
    );
  }, [isTopSignalsLeadPanel, topSignalsSnapshot]);
  const { latestPricesBySymbol: topSignalMiniTickerPricesBySymbol } =
    useBinanceMiniTickerPrices(topSignalMiniTickerSymbols, {
      updateIntervalMs: TOP_SIGNAL_PRICE_UPDATE_INTERVAL_MS,
    });
  const deferredTopSignalMiniTickerPricesBySymbol = useDeferredValue(
    topSignalMiniTickerPricesBySymbol,
  );
  const topSignalsDisplaySnapshot = useMemo(
    () =>
      topSignalsSnapshot
        ? applyCopyTradingLatestPrices(
            topSignalsSnapshot,
            deferredTopSignalMiniTickerPricesBySymbol,
          )
        : null,
    [deferredTopSignalMiniTickerPricesBySymbol, topSignalsSnapshot],
  );
  const topSignalsActiveSourceIds = useMemo(
    () =>
      new Set(
        topSignalsSnapshot?.traders
          .filter(isActiveCopyTradingTrader)
          .map((trader) => trader.trader_id) ?? [],
      ),
    [topSignalsSnapshot],
  );
  const copyTradingSignalSourceTargets = useMemo(
    () => createCopyTradingPrototypeTargets(topSignalsSnapshot),
    [topSignalsSnapshot],
  );
  const prototypeStrategyList = useMemo(
    () => [...prototypeMarioStrategies, ...prototypeStrategies],
    [prototypeMarioStrategies, prototypeStrategies],
  );
  const marioStrategiesStorageKey = authMe.telegramUser?.id
    ? `${MARIO_STRATEGIES_STORAGE_PREFIX}:${authMe.telegramUser.id}`
    : "";
  const effectiveTopSignalsSourceFilterId =
    topSignalsSourceFilterId === "all" ||
    topSignalsActiveSourceIds.has(topSignalsSourceFilterId)
      ? topSignalsSourceFilterId
      : "all";
  const allTopSignalsTradeMarkers = useMemo(() => {
    if (!topSignalsSnapshot) {
      return EMPTY_COPY_TRADING_TRADE_MARKERS;
    }

    return createCopyTradingTradeMarkers(topSignalsSnapshot);
  }, [topSignalsSnapshot]);
  const topSignalsTradeMarkers = useMemo(() => {
    if (effectiveTopSignalsSourceFilterId === "all") {
      return allTopSignalsTradeMarkers;
    }

    return allTopSignalsTradeMarkers.filter(
      (marker) => marker.traderId === effectiveTopSignalsSourceFilterId,
    );
  }, [allTopSignalsTradeMarkers, effectiveTopSignalsSourceFilterId]);
  const topSignalsEventsById = useMemo(
    () =>
      new Map(
        topSignalsSnapshot?.events.map((event) => [event.event_id, event]) ??
          [],
      ),
    [topSignalsSnapshot],
  );
  const topSignalsSignalBiasSummary = useMemo(
    () => createTopSignalsSignalBiasSummary(topSignalsSnapshot, symbol),
    [symbol, topSignalsSnapshot],
  );
  const hasConnectedPrototypeApiConnection = useMemo(
    () =>
      prototypeApiConnections.some(
        (connection) => connection.status === "connected",
      ),
    [prototypeApiConnections],
  );
  const shouldLoadMarketOptions = isTopSignalsTab;
  const shouldLoadKolSignals =
    isProductTabHydrated && isTopSignalsKolPanel;
  const shouldLoadAccountSignalSources =
    isPrivateWorkspaceTab &&
    hasConnectedPrototypeApiConnection &&
    topSignalsSnapshot === null;
  const shouldLoadTopSignalsSnapshot =
    isTopSignalsLeadPanel || shouldLoadAccountSignalSources;
  const {
    candlesBySymbol: paperPositionCandlesBySymbol,
    errorsBySymbol: paperPositionErrorsBySymbol,
    latestPricesBySymbol: paperPositionLatestPricesBySymbol,
  } = usePaperPositionCandles(
    paperPositionSignals,
    shouldUsePaperPositions ? latestMarketCandleUpdate : null,
  );
  const paperPositionMiniTickerSymbols = useMemo(
    () => paperPositionSignals.map((signal) => signal.symbol),
    [paperPositionSignals],
  );
  const { latestPricesBySymbol: paperPositionMiniTickerPricesBySymbol } =
    useBinanceMiniTickerPrices(paperPositionMiniTickerSymbols, {
      updateIntervalMs: PAPER_POSITION_PRICE_UPDATE_INTERVAL_MS,
    });
  const paperPositionsBySignalId = useMemo(() => {
    const recordsBySignalId: Record<string, PaperPositionRecord> = {};

    for (const signal of paperPositionSignals) {
      const candles = paperPositionCandlesBySymbol[signal.symbol];
      if (candles && candles.length > 0) {
        const miniTickerPrice = readBinanceMiniTickerPrice(
          paperPositionMiniTickerPricesBySymbol,
          signal.symbol,
        );
        recordsBySignalId[signal.id] = computePaperPositionRecord(
          signal,
          candles,
          {
            currentPriceOverride:
              miniTickerPrice ??
              paperPositionLatestPricesBySymbol[signal.symbol] ??
              null,
          },
        );
      }
    }

    return recordsBySignalId;
  }, [
    paperPositionCandlesBySymbol,
    paperPositionLatestPricesBySymbol,
    paperPositionMiniTickerPricesBySymbol,
    paperPositionSignals,
  ]);
  const activeChartPaperPosition = activeSignal
    ? (paperPositionsBySignalId[activeSignal.id] ?? null)
    : null;
  const isActiveChartPaperPositionReady = activeSignal
    ? Object.prototype.hasOwnProperty.call(
        paperPositionsBySignalId,
        activeSignal.id,
      )
    : false;
  const isDarkTheme = theme === "dark";
  const pageHeightClassName = isPrivateWorkspaceTab
    ? "min-h-dvh overflow-y-auto"
    : "min-h-dvh overflow-y-auto lg:h-screen lg:overflow-hidden";
  const workspaceBodyClassName = isPrivateWorkspaceTab
    ? "min-w-0 flex-1"
    : "min-w-0 flex-1 lg:min-h-0 lg:overflow-hidden";
  const pageClassName = isDarkTheme
    ? `flex w-full flex-col overflow-x-hidden bg-[#0B0E11] text-slate-100 ${pageHeightClassName}`
    : `flex w-full flex-col overflow-x-hidden bg-[#F1F4F8] text-slate-900 ${pageHeightClassName}`;
  const workspaceGridClassName = isRightPanelCollapsed
    ? "motion-fx-7-workspace-grid relative flex min-h-0 flex-col gap-3 p-3 pb-28 lg:grid lg:h-full lg:p-4 lg:pb-4 lg:grid-cols-[minmax(0,1fr)]"
    : "motion-fx-7-workspace-grid relative flex min-h-0 flex-col gap-3 p-3 pb-28 lg:grid lg:h-full lg:gap-4 lg:p-4 lg:pb-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]";

  return {
    activeChartPaperPosition,
    activeSignal,
    allTopSignalsTradeMarkers,
    copyTradingSignalSourceTargets,
    effectiveTopSignalsSourceFilterId,
    isAccountManagementTab,
    isActiveChartPaperPositionReady,
    isDarkTheme,
    isPrivateWorkspaceTab,
    isStrategyManagementTab,
    isStrategySquareTab,
    isTopSignalsKolPanel,
    isTopSignalsLeadPanel,
    isTopSignalsTab,
    kolSignals,
    marioStrategiesStorageKey,
    pageClassName,
    pageHeightClassName,
    paperPositionCandlesBySymbol,
    paperPositionErrorsBySymbol,
    paperPositionLatestPricesBySymbol,
    paperPositionMiniTickerPricesBySymbol,
    paperPositionSignals,
    paperPositionsBySignalId,
    prototypeStrategyList,
    shouldLoadAccountSignalSources,
    shouldLoadKolSignals,
    shouldLoadMarketOptions,
    shouldLoadTopSignalsSnapshot,
    shouldUsePaperPositions,
    topSignalMiniTickerPricesBySymbol,
    topSignalMiniTickerSymbols,
    topSignalsActiveSourceIds,
    topSignalsDisplaySnapshot,
    topSignalsEventsById,
    topSignalsSignalBiasSummary,
    topSignalsTradeMarkers,
    watchlistedKolSourceKeys,
    watchlistedTopSignalSourceIds,
    workspaceBodyClassName,
    workspaceGridClassName,
  };
}

export type SignalWorkspaceStateDerived = ReturnType<
  typeof useSignalWorkspaceStateDerived
>;
