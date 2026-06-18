"use client";

import { useEffect } from "react";

import { markets } from "@/lib/demo-data";
import { fetchUsdtPerpetualMarkets } from "@/lib/binance-market-data";
import { getTradingFoxErrorMessage } from "@/lib/tradingfox-errors";
import {
  createEmptyWorkspaceWatchlist,
  parseWorkspaceWatchlistValue,
  serializeWorkspaceWatchlist,
  WORKSPACE_WATCHLIST_STORAGE_KEY,
} from "@/lib/workspace-watchlist";
import { hasSeenOnboardingGuide } from "../onboarding-guide";
import {
  NOTIFICATION_DISMISS_MS,
  PNL_COLOR_MODE_STORAGE_KEY,
  LOGGED_OUT_AUTH_ME,
  readWorkspaceRouteStateFromLocation,
  WORKSPACE_PRODUCT_TAB_STORAGE_KEY,
  isWorkspaceProductTab,
  requestTradingFoxAccount,
  readStoredMarioStrategies,
} from "../signal-workspace-helpers";
import type { SignalWorkspaceState } from "./signal-workspace-state";
import type { SignalWorkspacePrimaryActionHandlers } from "./signal-workspace-primary-action-handlers";

export function useSignalWorkspacePrimaryActionLifecycle(
  context: SignalWorkspaceState & SignalWorkspacePrimaryActionHandlers,
) {
  const {
    copy,
    copyRef,
    setAuthMe,
    setIsAuthLoading,
    isAuthLoading,
    authMe,
    isPrivateWorkspaceTab,
    isTradingFoxAccountLoaded,
    setIsTradingFoxAccountLoaded,
    setPrototypeApiConnections,
    setPrototypeStrategies,
    applyTradingFoxAccount,
    setIsTradingFoxLoading,
    setWorkspaceNotification,
    setPnlColorMode,
    pnlColorMode,
    isPnlColorModeHydrated,
    setIsPnlColorModeHydrated,
    setActiveProductTab,
    isProductTabHydrated,
    setIsProductTabHydrated,
    setWatchlist,
    watchlist,
    isWatchlistHydrated,
    setIsWatchlistHydrated,
    workspaceNotification,
    setIsWorkspaceMotionVisible,
    shouldLoadMarketOptions,
    setMarketOptions,
    setSymbol,
    rightPanelExitTimeoutRef,
    onboardingOpenTimeoutRef,
    hasEvaluatedAutoOnboardingRef,
    isTopSignalsKolPanel,
    kolSignalSourceStatus,
    startOnboardingGuide,
    startTelegramLogin,
    isWorkspaceMotionVisible,
    updateWorkspaceRouteUrl,
    applyWorkspaceRouteState,
    activeProductTab,
    marioStrategiesStorageKey,
    isMarioStrategiesHydrated,
    setIsMarioStrategiesHydrated,
    setPrototypeMarioStrategies,
    prototypeMarioStrategies,
  } = context;

  useEffect(() => {
    copyRef.current = copy;
  }, [copy, copyRef]);

  useEffect(() => {
    let isMounted = true;

    const refreshAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) {
          throw new Error("Unable to load auth session.");
        }

        const nextAuthMe = await response.json();
        if (isMounted) {
          setAuthMe(nextAuthMe);
        }
      } catch {
        if (isMounted) {
          setAuthMe(LOGGED_OUT_AUTH_ME);
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    void refreshAuth();

    return () => {
      isMounted = false;
    };
  }, [setAuthMe, setIsAuthLoading, copyRef]);

  useEffect(() => {
    if (
      isAuthLoading ||
      !isProductTabHydrated ||
      !isPrivateWorkspaceTab ||
      authMe.isLoggedIn
    ) {
      return;
    }

    startTelegramLogin(
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
  }, [
    authMe.isLoggedIn,
    isAuthLoading,
    isPrivateWorkspaceTab,
    isProductTabHydrated,
    startTelegramLogin,
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadTradingFoxAccount = async () => {
      if (isAuthLoading) {
        return;
      }

      if (!authMe.isLoggedIn) {
        setIsTradingFoxAccountLoaded(false);
        setPrototypeApiConnections([]);
        setPrototypeStrategies([]);
        return;
      }

      if (!isPrivateWorkspaceTab || isTradingFoxAccountLoaded) {
        return;
      }

      setIsTradingFoxLoading(true);
      try {
        const account = await requestTradingFoxAccount("/api/tradingfox/account");
        if (isMounted) {
          applyTradingFoxAccount(account);
        }
      } catch (error) {
        if (isMounted) {
          setWorkspaceNotification({
            id: `tradingfox-account-error-${Date.now()}`,
            kind: "error",
            message: getTradingFoxErrorMessage(error, copyRef.current),
            meta: "TradingFox",
            title: copyRef.current.workspace.accountCenter.api.title,
          });
        }
      } finally {
        if (isMounted) {
          setIsTradingFoxLoading(false);
        }
      }
    };

    void loadTradingFoxAccount();

    return () => {
      isMounted = false;
    };
  }, [
    applyTradingFoxAccount,
    authMe.isLoggedIn,
    copyRef,
    isAuthLoading,
    isPrivateWorkspaceTab,
    isTradingFoxAccountLoaded,
    setIsTradingFoxAccountLoaded,
    setIsTradingFoxLoading,
    setPrototypeApiConnections,
    setPrototypeStrategies,
    setWorkspaceNotification,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const storedMode = window.localStorage.getItem(PNL_COLOR_MODE_STORAGE_KEY);
        if (storedMode === "positiveGreen" || storedMode === "positiveRed") {
          setPnlColorMode(storedMode);
        } else if (storedMode !== null) {
          window.localStorage.removeItem(PNL_COLOR_MODE_STORAGE_KEY);
        }
      } catch {
        // Keep the default PnL color mode when local storage is unavailable.
      } finally {
        setIsPnlColorModeHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [setIsPnlColorModeHydrated, setPnlColorMode]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const routeState = readWorkspaceRouteStateFromLocation();
      if (routeState.tab) {
        applyWorkspaceRouteState(routeState);
        setIsProductTabHydrated(true);
        return;
      }

      try {
        const storedProductTab = window.localStorage.getItem(
          WORKSPACE_PRODUCT_TAB_STORAGE_KEY,
        );
        if (isWorkspaceProductTab(storedProductTab)) {
          setActiveProductTab(storedProductTab);
        } else if (storedProductTab !== null) {
          window.localStorage.removeItem(WORKSPACE_PRODUCT_TAB_STORAGE_KEY);
        }
      } catch {
        // Keep the default tab when local storage is unavailable.
      } finally {
        setIsProductTabHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [applyWorkspaceRouteState, setActiveProductTab, setIsProductTabHydrated]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const rawWatchlist = window.localStorage.getItem(WORKSPACE_WATCHLIST_STORAGE_KEY);
        const result = parseWorkspaceWatchlistValue(rawWatchlist);
        setWatchlist(result.watchlist);
        setIsWatchlistHydrated(true);
        if (result.shouldRewrite) {
          window.localStorage.setItem(
            WORKSPACE_WATCHLIST_STORAGE_KEY,
            serializeWorkspaceWatchlist(result.watchlist),
          );
        }
      } catch {
        setWatchlist(createEmptyWorkspaceWatchlist());
        setIsWatchlistHydrated(true);
        try {
          window.localStorage.removeItem(WORKSPACE_WATCHLIST_STORAGE_KEY);
        } catch {
          // Ignore storage failures in private browsing or restricted webviews.
        }
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [setWatchlist, setIsWatchlistHydrated]);

  useEffect(() => {
    if (!isWatchlistHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(
        WORKSPACE_WATCHLIST_STORAGE_KEY,
        serializeWorkspaceWatchlist(watchlist),
      );
    } catch {
      // Ignore storage failures in private browsing or restricted webviews.
    }
  }, [isWatchlistHydrated, watchlist]);

  useEffect(() => {
    if (!isProductTabHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(WORKSPACE_PRODUCT_TAB_STORAGE_KEY, activeProductTab);
    } catch {
      // Ignore storage failures in private browsing or restricted webviews.
    }
  }, [activeProductTab, isProductTabHydrated]);

  useEffect(() => {
    if (!isPnlColorModeHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(PNL_COLOR_MODE_STORAGE_KEY, pnlColorMode);
    } catch {
      // Ignore storage failures in private browsing or restricted webviews.
    }
  }, [isPnlColorModeHydrated, pnlColorMode]);

  useEffect(() => {
    updateWorkspaceRouteUrl("replace");
  }, [updateWorkspaceRouteUrl]);

  useEffect(() => {
    const handlePopState = () => {
      applyWorkspaceRouteState(readWorkspaceRouteStateFromLocation(), "topSignals");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [applyWorkspaceRouteState]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsWorkspaceMotionVisible(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [setIsWorkspaceMotionVisible]);

  useEffect(() => {
    return () => {
      clearWindowTimeoutRef(rightPanelExitTimeoutRef);
      clearWindowTimeoutRef(onboardingOpenTimeoutRef);
    };
  }, [onboardingOpenTimeoutRef, rightPanelExitTimeoutRef]);

  useEffect(() => {
    if (!workspaceNotification) {
      return;
    }

    const timeout = window.setTimeout(() => setWorkspaceNotification(null), NOTIFICATION_DISMISS_MS);
    return () => window.clearTimeout(timeout);
  }, [setWorkspaceNotification, workspaceNotification]);

  useEffect(() => {
    if (
      !isTopSignalsKolPanel
      || hasEvaluatedAutoOnboardingRef.current
      || !isWorkspaceMotionVisible
      || kolSignalSourceStatus.isLoading
    ) {
      return;
    }

    hasEvaluatedAutoOnboardingRef.current = true;
    if (hasSeenOnboardingGuide()) {
      return;
    }

    const timeoutId = window.setTimeout(startOnboardingGuide, 0);
    return () => window.clearTimeout(timeoutId);
  }, [
    isTopSignalsKolPanel,
    hasEvaluatedAutoOnboardingRef,
    isWorkspaceMotionVisible,
    kolSignalSourceStatus.isLoading,
    startOnboardingGuide,
  ]);

  useEffect(() => {
    if (!shouldLoadMarketOptions) {
      return;
    }

    let isActive = true;

    fetchUsdtPerpetualMarkets()
      .then((loadedMarkets) => {
        if (!isActive) {
          return;
        }

        setMarketOptions(loadedMarkets);
        setSymbol((currentSymbol) =>
          loadedMarkets.includes(currentSymbol)
            ? currentSymbol
            : loadedMarkets[0],
        );
      })
      .catch(() => {
        if (isActive) {
          setMarketOptions(markets);
        }
      });

    return () => {
      isActive = false;
    };
  }, [shouldLoadMarketOptions, setMarketOptions, setSymbol]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!marioStrategiesStorageKey) {
        setPrototypeMarioStrategies([]);
        setIsMarioStrategiesHydrated(false);
        return;
      }

      setPrototypeMarioStrategies(readStoredMarioStrategies(marioStrategiesStorageKey));
      setIsMarioStrategiesHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [marioStrategiesStorageKey, setIsMarioStrategiesHydrated, setPrototypeMarioStrategies]);

  useEffect(() => {
    if (!marioStrategiesStorageKey || !isMarioStrategiesHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(
        marioStrategiesStorageKey,
        JSON.stringify(prototypeMarioStrategies),
      );
    } catch {
      // Ignore storage failures in private browsing or restricted webviews.
    }
  }, [isMarioStrategiesHydrated, marioStrategiesStorageKey, prototypeMarioStrategies]);

  return {};
}

export type SignalWorkspacePrimaryActionLifecycle = ReturnType<typeof useSignalWorkspacePrimaryActionLifecycle>;

function clearWindowTimeoutRef(timeoutRef: { current: number | null }) {
  if (timeoutRef.current !== null) {
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
}
