"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { type MarketSymbol } from "@/app/_types/market";
import type { TradingFoxAccountResponse } from "@/app/_lib/tradingfox-control-plane";
import {
  createWorkspaceRouteUrl,
  mapTradingFoxConnectorToPrototypeConnection,
  openExternalTelegramUrl,
  TELEGRAM_DISCUSSION_GROUP_URL,
  LOGGED_OUT_AUTH_ME,
} from "./signal-workspace/signal-workspace-helpers";
import type {
  TopSignalsWorkspacePanel,
  WorkspaceProductTab,
  WorkspaceRouteState,
} from "./signal-workspace/signal-workspace-helpers";
import type { SignalWorkspaceState } from "./signal-workspace-state";
import { getAppLocaleFromWorkspaceLanguage } from "@/i18n/workspace";
import { replacePathnameLocale } from "@/i18n/locales";

export function useSignalWorkspacePrimaryActionHandlers(
  context: SignalWorkspaceState,
) {
  const {
    setActiveProductTab,
    setIsRightPanelCollapsed,
    setIsMobileKolSheetOpen,
    setIsOnboardingOpen,
    isCompactLayout,
    onboardingOpenTimeoutRef,
    setAuthMe,
    setIsTradingFoxAccountLoaded,
    setPrototypeApiConnections,
    setPrototypeStrategies,
    setPrototypeMarioStrategies,
    language,
    setPnlColorMode,
    setTheme,
    setActiveSignalId,
    setTopSignalsSourceFilterId,
    setActiveTopSignalSourceId,
    setExplicitTopSignalSourceId,
    setActiveTopSignalTradeEventId,
    setTopSignalsPanel,
    pendingRouteTopSignalTradeEventIdRef,
    setActiveAccountStrategyId,
    isProductTabHydrated,
    activeProductTab,
    explicitTopSignalSourceId,
    topSignalsSourceFilterId,
    topSignalsPanel,
    activeAccountStrategyId,
    activeSignalId,
    activeTopSignalTradeEventId,
    symbol,
    setSymbol,
    setIsCommunityConversionOpen,
  } = context;

  const startOnboardingGuide = useCallback(() => {
    setActiveProductTab("topSignals");
    setTopSignalsPanel("kol");
    setIsRightPanelCollapsed(false);
    if (isCompactLayout) {
      setIsMobileKolSheetOpen(true);
    }
    if (onboardingOpenTimeoutRef.current !== null) {
      window.clearTimeout(onboardingOpenTimeoutRef.current);
    }

    onboardingOpenTimeoutRef.current = window.setTimeout(() => {
      setIsOnboardingOpen(true);
      onboardingOpenTimeoutRef.current = null;
    }, 180);
  }, [
    isCompactLayout,
    onboardingOpenTimeoutRef,
    setActiveProductTab,
    setTopSignalsPanel,
    setIsMobileKolSheetOpen,
    setIsOnboardingOpen,
    setIsRightPanelCollapsed,
  ]);

  const handleTelegramDiscussionJoin = useCallback(() => {
    openExternalTelegramUrl(TELEGRAM_DISCUSSION_GROUP_URL);
  }, []);

  const startTelegramLogin = useCallback((redirectPath?: string) => {
    const resolvedRedirectPath = redirectPath
      ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.assign(`/api/auth/login?redirect=${encodeURIComponent(resolvedRedirectPath)}`);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        credentials: "same-origin",
        method: "POST",
      });
    } finally {
      setAuthMe(LOGGED_OUT_AUTH_ME);
      setIsTradingFoxAccountLoaded(false);
      setPrototypeApiConnections([]);
      setPrototypeStrategies([]);
      setPrototypeMarioStrategies([]);
    }
  }, [
    setAuthMe,
    setIsTradingFoxAccountLoaded,
    setPrototypeApiConnections,
    setPrototypeStrategies,
    setPrototypeMarioStrategies,
  ]);

  const applyTradingFoxAccount = useCallback((account: TradingFoxAccountResponse) => {
    const connectors = account.connectors ?? (account.connector ? [account.connector] : []);
    setPrototypeApiConnections(
      connectors.map((connector) => mapTradingFoxConnectorToPrototypeConnection(connector, language)),
    );
    setPrototypeStrategies(account.strategies);
    setIsTradingFoxAccountLoaded(true);
  }, [
    language,
    setIsTradingFoxAccountLoaded,
    setPrototypeApiConnections,
    setPrototypeStrategies,
  ]);

  const handleCommunityModalJoin = useCallback(() => {
    handleTelegramDiscussionJoin();
    setIsCommunityConversionOpen(false);
  }, [handleTelegramDiscussionJoin, setIsCommunityConversionOpen]);

  const toggleTheme = useCallback(() =>
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light")),
  [setTheme],
  );

  const togglePnlColorMode = useCallback(() => {
    setPnlColorMode((currentMode) =>
      currentMode === "positiveGreen" ? "positiveRed" : "positiveGreen",
    );
  }, [setPnlColorMode]);

  const router = useRouter();

  const toggleLanguage = useCallback(() => {
    const nextLanguage = language === "zh-CN" ? "en-US" : "zh-CN";
    const nextLocale = getAppLocaleFromWorkspaceLanguage(nextLanguage);
    const nextPathname = replacePathnameLocale(window.location.pathname, nextLocale);
    router.push(`${nextPathname}${window.location.search}${window.location.hash}`);
  }, [language, router]);

  const applyWorkspaceRouteState = useCallback((
    routeState: WorkspaceRouteState,
    fallbackTab?: WorkspaceProductTab,
  ) => {
    const nextTab = routeState.tab ?? fallbackTab;
    if (nextTab) {
      setActiveProductTab(nextTab);
    }

    if (routeState.symbol) {
      setSymbol(routeState.symbol);
    }

    if (routeState.signalId) {
      setActiveSignalId(routeState.signalId);
    }

    if (routeState.tab === "topSignals") {
      setTopSignalsPanel(routeState.topSignalsPanel);
      if (routeState.topSignalsPanel === "lead") {
        setTopSignalsSourceFilterId(routeState.topSignalSourceId || "all");
        setActiveTopSignalSourceId(routeState.topSignalSourceId);
        setExplicitTopSignalSourceId(routeState.topSignalSourceId);
        setActiveTopSignalTradeEventId(routeState.topSignalTradeEventId);
        pendingRouteTopSignalTradeEventIdRef.current = routeState.topSignalTradeEventId;
      } else {
        pendingRouteTopSignalTradeEventIdRef.current = "";
      }
    } else {
      pendingRouteTopSignalTradeEventIdRef.current = "";
    }

    setActiveAccountStrategyId(routeState.tab === "strategyManagement" ? routeState.accountStrategyId : "");
  }, [
    pendingRouteTopSignalTradeEventIdRef,
    setActiveProductTab,
    setActiveTopSignalSourceId,
    setActiveTopSignalTradeEventId,
    setActiveAccountStrategyId,
    setTopSignalsPanel,
    setActiveSignalId,
    setExplicitTopSignalSourceId,
    setTopSignalsSourceFilterId,
    setSymbol,
  ]);

  const updateWorkspaceRouteUrl = useCallback((
    mode: "push" | "replace",
    overrides?: {
      accountStrategyId?: string;
      tab?: WorkspaceProductTab;
      symbol?: MarketSymbol;
      signalId?: string;
      topSignalSourceId?: string;
      topSignalTradeEventId?: string;
      topSignalsPanel?: TopSignalsWorkspacePanel;
    },
  ) => {
    if (!isProductTabHydrated) {
      return;
    }

    const nextTab = overrides?.tab ?? activeProductTab;
    const hasTopSignalSourceOverride = Object.prototype.hasOwnProperty.call(
      overrides ?? {},
      "topSignalSourceId",
    );
    const nextTopSignalSourceId = hasTopSignalSourceOverride
      ? (overrides?.topSignalSourceId ?? "")
      : explicitTopSignalSourceId
        || (topSignalsSourceFilterId !== "all" ? topSignalsSourceFilterId : "");
    const nextAccountStrategyId = Object.prototype.hasOwnProperty.call(
      overrides ?? {},
      "accountStrategyId",
    )
      ? (overrides?.accountStrategyId ?? "")
      : activeAccountStrategyId;
    const nextTopSignalsPanel = overrides?.topSignalsPanel ?? topSignalsPanel;
    const nextTopSignalTradeEventId = Object.prototype.hasOwnProperty.call(
      overrides ?? {},
      "topSignalTradeEventId",
    )
      ? (overrides?.topSignalTradeEventId ?? "")
      : activeTopSignalTradeEventId;
    const nextUrl = createWorkspaceRouteUrl({
      accountStrategyId: nextAccountStrategyId,
      activeSignalId: overrides?.signalId ?? activeSignalId,
      currentPathname: window.location.pathname,
      symbol: overrides?.symbol ?? symbol,
      tab: nextTab,
      topSignalSourceId: nextTopSignalSourceId,
      topSignalTradeEventId: nextTopSignalTradeEventId,
      topSignalsPanel: nextTopSignalsPanel,
    });
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl === nextUrl) {
      return;
    }

    window.history[mode === "push" ? "pushState" : "replaceState"](null, "", nextUrl);
  }, [
    activeAccountStrategyId,
    activeProductTab,
    activeSignalId,
    activeTopSignalTradeEventId,
    explicitTopSignalSourceId,
    isProductTabHydrated,
    symbol,
    topSignalsPanel,
    topSignalsSourceFilterId,
  ]);

  return {
    startOnboardingGuide,
    handleTelegramDiscussionJoin,
    startTelegramLogin,
    handleLogout,
    applyTradingFoxAccount,
    handleCommunityModalJoin,
    toggleTheme,
    togglePnlColorMode,
    toggleLanguage,
    applyWorkspaceRouteState,
    updateWorkspaceRouteUrl,
  };
}

export type SignalWorkspacePrimaryActionHandlers = ReturnType<typeof useSignalWorkspacePrimaryActionHandlers>;
