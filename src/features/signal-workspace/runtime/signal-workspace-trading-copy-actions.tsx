"use client";

import { useCallback } from "react";

import { getTradingFoxErrorMessage } from "@/lib/tradingfox-errors";
import type { TradingFoxAccountResponse } from "@/lib/tradingfox-control-plane";
import type { CopyTradingTrader } from "@/types/copy-trading";
import type {
  CopyTradingPrototypeTarget,
  PrototypeConnectionSaveInput,
} from "../copy-trading-prototype";
import {
  createEmptyPrototypeApiConnection,
  mapTradingFoxConnectorToPrototypeConnection,
  requestTradingFoxAccount,
} from "../signal-workspace-helpers";
import type { SignalWorkspacePrimaryActions } from "./signal-workspace-primary-actions";
import type { SignalWorkspaceSecondaryActions } from "./signal-workspace-secondary-actions";
import type { SignalWorkspaceState } from "./signal-workspace-state";

export function useSignalWorkspaceTradingCopyActions(
  context: SignalWorkspaceState &
    SignalWorkspacePrimaryActions &
    SignalWorkspaceSecondaryActions,
) {
  const {
    applyTradingFoxAccount,
    authMe,
    copyRef,
    handleProductTabChange,
    isTradingFoxAccountLoaded,
    language,
    pendingCopyTradingTarget,
    prototypeApiConnection,
    prototypeApiConnections,
    prototypeStrategyList,
    setCopyTradingTarget,
    setIsApiSetupOpen,
    setIsTradingFoxLoading,
    setPendingCopyTradingTarget,
    setWatchlist,
    setWorkspaceNotification,
    startTelegramLogin,
  } = context;

  const handleTopSignalSourceWatchToggle = useCallback(
    (trader: CopyTradingTrader) => {
      setWatchlist((currentWatchlist) => {
        const isAlreadyWatched = currentWatchlist.topSignalSources.some(
          (source) => source.id === trader.trader_id,
        );

        if (isAlreadyWatched) {
          return {
            ...currentWatchlist,
            topSignalSources: currentWatchlist.topSignalSources.filter(
              (source) => source.id !== trader.trader_id,
            ),
          };
        }

        return {
          ...currentWatchlist,
          topSignalSources: [
            {
              avatarUrl: trader.avatar,
              favoritedAt: new Date().toISOString(),
              id: trader.trader_id,
              name: trader.name,
              platform: trader.platform,
            },
            ...currentWatchlist.topSignalSources,
          ],
        };
      });
    },
    [setWatchlist],
  );

  const handleCopyTradingRequest = useCallback(
    async (target: CopyTradingPrototypeTarget) => {
      if (!authMe.isLoggedIn) {
        startTelegramLogin();
        return;
      }

      if (!isTradingFoxAccountLoaded) {
        setIsTradingFoxLoading(true);
        try {
          const account = await requestTradingFoxAccount("/api/tradingfox/account");
          const connectors =
            account.connectors ?? (account.connector ? [account.connector] : []);
          const nextApiConnection =
            connectors
              .map((connector) =>
                mapTradingFoxConnectorToPrototypeConnection(connector, language),
              )[0] ?? createEmptyPrototypeApiConnection();
          applyTradingFoxAccount(account);

          if (nextApiConnection.status !== "connected") {
            setPendingCopyTradingTarget(target);
            handleProductTabChange("accountManagement");
            setIsApiSetupOpen(true);
            return;
          }

          setCopyTradingTarget(target);
        } catch (error) {
          setWorkspaceNotification({
            id: `tradingfox-account-error-${Date.now()}`,
            kind: "error",
            message: getTradingFoxErrorMessage(error, copyRef.current),
            meta: "TradingFox",
            title: copyRef.current.workspace.accountCenter.api.title,
          });
        } finally {
          setIsTradingFoxLoading(false);
        }
        return;
      }

      if (prototypeApiConnection.status !== "connected") {
        setPendingCopyTradingTarget(target);
        handleProductTabChange("accountManagement");
        setIsApiSetupOpen(true);
        return;
      }

      setCopyTradingTarget(target);
    },
    [
      applyTradingFoxAccount,
      authMe.isLoggedIn,
      copyRef,
      handleProductTabChange,
      isTradingFoxAccountLoaded,
      language,
      prototypeApiConnection.status,
      setCopyTradingTarget,
      setIsApiSetupOpen,
      setIsTradingFoxLoading,
      setPendingCopyTradingTarget,
      setWorkspaceNotification,
      startTelegramLogin,
    ],
  );

  const handleMockStrategyCopy = useCallback(
    (strategyName: string) => {
      setWorkspaceNotification({
        id: `mock-strategy-copy-${Date.now()}`,
        kind: "success",
        message: copyRef.current.workspace.strategySquare.mockNotice,
        meta: strategyName,
        title: copyRef.current.workspace.strategySquare.copiedAction,
      });
    },
    [copyRef, setWorkspaceNotification],
  );

  const handleTradingFoxConnectorBound = useCallback(
    (account: TradingFoxAccountResponse, accountName: string) => {
      applyTradingFoxAccount(account);
      setWorkspaceNotification({
        id: `api-connected-${Date.now()}`,
        kind: "success",
        message: copyRef.current.workspace.accountCenter.apiSetup.connectedToast,
        meta: account.connector?.name ?? accountName,
        title: copyRef.current.workspace.accountCenter.api.title,
      });

      if (pendingCopyTradingTarget) {
        setCopyTradingTarget(pendingCopyTradingTarget);
        setPendingCopyTradingTarget(null);
      }
    },
    [
      applyTradingFoxAccount,
      copyRef,
      pendingCopyTradingTarget,
      setCopyTradingTarget,
      setPendingCopyTradingTarget,
      setWorkspaceNotification,
    ],
  );

  const handlePrototypeConnectionSave = useCallback(
    async (input: PrototypeConnectionSaveInput): Promise<boolean> => {
      if (!authMe.isLoggedIn) {
        startTelegramLogin();
        return false;
      }

      setIsTradingFoxLoading(true);
      try {
        const account = await requestTradingFoxAccount("/api/tradingfox/connectors", {
          body: JSON.stringify({
            accountName: input.accountName,
            apiKey: input.apiKey,
            exchangePlatform: input.exchangePlatform,
            ipAddress: input.ipAddress,
            isMock: input.isMock,
            mockMarginBalance: input.mockMarginBalance,
            password: input.password,
            privateKey: input.privateKey,
            secret: input.secret,
            walletAddress: input.walletAddress,
          }),
          method: "POST",
        });
        handleTradingFoxConnectorBound(account, input.accountName);
        return true;
      } catch (error) {
        setWorkspaceNotification({
          id: `api-connect-error-${Date.now()}`,
          kind: "error",
          message: getTradingFoxErrorMessage(error, copyRef.current),
          meta: input.accountName,
          title: copyRef.current.workspace.accountCenter.api.title,
        });
        return false;
      } finally {
        setIsTradingFoxLoading(false);
      }
    },
    [
      authMe.isLoggedIn,
      copyRef,
      handleTradingFoxConnectorBound,
      setIsTradingFoxLoading,
      setWorkspaceNotification,
      startTelegramLogin,
    ],
  );

  const handlePrototypeConnectionDelete = useCallback(
    async (connectionId: number) => {
      if (!authMe.isLoggedIn) {
        startTelegramLogin();
        return;
      }

      const connection =
        prototypeApiConnections.find((item) => item.id === connectionId) ?? null;
      const attachedStrategy =
        prototypeStrategyList.find(
          (strategy) => strategy.exchangeConnectorId === connectionId,
        ) ?? null;
      if (attachedStrategy) {
        setWorkspaceNotification({
          id: `api-delete-blocked-${Date.now()}`,
          kind: "error",
          message: copyRef.current.workspace.accountCenter.api
            .deleteBlockedByStrategy,
          meta: connection?.accountName ?? `#${connectionId}`,
          title: copyRef.current.workspace.accountCenter.api.title,
        });
        return;
      }

      setIsTradingFoxLoading(true);
      try {
        const account = await requestTradingFoxAccount(
          `/api/tradingfox/connectors/${encodeURIComponent(String(connectionId))}`,
          { method: "DELETE" },
        );
        applyTradingFoxAccount(account);
        setWorkspaceNotification({
          id: `api-delete-${Date.now()}`,
          kind: "success",
          message: copyRef.current.workspace.accountCenter.api.deleteSuccess,
          meta: connection?.accountName ?? `#${connectionId}`,
          title: copyRef.current.workspace.accountCenter.api.title,
        });
      } catch (error) {
        setWorkspaceNotification({
          id: `api-delete-error-${Date.now()}`,
          kind: "error",
          message: getTradingFoxErrorMessage(error, copyRef.current),
          meta: connection?.accountName ?? `#${connectionId}`,
          title: copyRef.current.workspace.accountCenter.api.title,
        });
      } finally {
        setIsTradingFoxLoading(false);
      }
    },
    [
      applyTradingFoxAccount,
      authMe.isLoggedIn,
      copyRef,
      prototypeApiConnections,
      prototypeStrategyList,
      setIsTradingFoxLoading,
      setWorkspaceNotification,
      startTelegramLogin,
    ],
  );

  const handleApiSetupOpenChange = useCallback(
    (isOpen: boolean) => {
      setIsApiSetupOpen(isOpen);
      if (!isOpen) {
        setPendingCopyTradingTarget(null);
      }
    },
    [setIsApiSetupOpen, setPendingCopyTradingTarget],
  );

  return {
    handleApiSetupOpenChange,
    handleCopyTradingRequest,
    handleMockStrategyCopy,
    handlePrototypeConnectionDelete,
    handlePrototypeConnectionSave,
    handleTopSignalSourceWatchToggle,
    handleTradingFoxConnectorBound,
  };
}

export type SignalWorkspaceTradingCopyActions = ReturnType<
  typeof useSignalWorkspaceTradingCopyActions
>;
