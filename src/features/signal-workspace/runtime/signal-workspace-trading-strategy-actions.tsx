"use client";

import { useCallback } from "react";

import { getTradingFoxErrorMessage } from "@/app/_lib/tradingfox-errors";
import type { StructuredSignal } from "@/app/_types/signal";
import type {
  PrototypeStrategyCreateInput,
  PrototypeStrategySettingsUpdateInput,
  PrototypeStrategyStatus,
} from "../copy-trading-prototype";
import type { SignalWorkspacePrimaryActions } from "./signal-workspace-primary-actions";
import type { SignalWorkspaceSecondaryActions } from "./signal-workspace-secondary-actions";
import type { SignalWorkspaceState } from "./signal-workspace-state";
import type { SignalWorkspaceTradingCopyActions } from "./signal-workspace-trading-copy-actions";
import { requestTradingFoxAccount } from "../signal-workspace-helpers";

export function useSignalWorkspaceTradingStrategyActions(
  context: SignalWorkspaceState &
    SignalWorkspacePrimaryActions &
    SignalWorkspaceSecondaryActions &
    SignalWorkspaceTradingCopyActions,
) {
  const {
    applyTradingFoxAccount,
    authMe,
    copyRef,
    handleProductTabChange,
    handleSignalSelect,
    prototypeMarioStrategies,
    prototypeStrategies,
    setCopyTradingTarget,
    setIsCommunityConversionOpen,
    setIsTradingFoxLoading,
    setPrototypeMarioStrategies,
    setPrototypeStrategies,
    setWorkspaceNotification,
    startTelegramLogin,
  } = context;

  const requestPrototypeCopyStrategyStart = useCallback(
    async (input: {
      exchangeConnectorId: number;
      strategyName: string;
      stopLossPercent: number;
      takeProfitPercent: number;
      target: Parameters<
        SignalWorkspaceTradingCopyActions["handleCopyTradingRequest"]
      >[0];
    }) => {
      const account = await requestTradingFoxAccount("/api/tradingfox/copy-strategies", {
        body: JSON.stringify({
          avatarUrl: input.target.trader.avatar,
          eventsCount: input.target.eventsCount,
          exchangeConnectorId: input.exchangeConnectorId,
          platform: input.target.trader.platform,
          positionsCount: input.target.positionsCount,
          signalSourceId: input.target.trader.trader_id,
          stopLossPercent: input.stopLossPercent,
          strategyName: input.strategyName,
          takeProfitPercent: input.takeProfitPercent,
          traderName: input.target.trader.name,
        }),
        method: "POST",
      });
      applyTradingFoxAccount(account);
      handleProductTabChange("strategyManagement");
    },
    [applyTradingFoxAccount, handleProductTabChange],
  );

  const handlePrototypeStrategyStart = useCallback(
    async (input: Parameters<typeof requestPrototypeCopyStrategyStart>[0]) => {
      if (!authMe.isLoggedIn) {
        startTelegramLogin();
        return;
      }

      setIsTradingFoxLoading(true);
      try {
        await requestPrototypeCopyStrategyStart(input);
        setCopyTradingTarget(null);
        setWorkspaceNotification({
          id: `copy-strategy-created-${Date.now()}`,
          kind: "success",
          message:
            copyRef.current.workspace.accountCenter.strategyCreate
              .copyTradingCreatedToast,
          meta: input.strategyName,
          title: copyRef.current.workspace.accountCenter.copyTrading.start,
        });
      } catch (error) {
        setWorkspaceNotification({
          id: `copy-strategy-error-${Date.now()}`,
          kind: "error",
          message: getTradingFoxErrorMessage(error, copyRef.current),
          meta: input.strategyName,
          title: copyRef.current.workspace.accountCenter.copyTrading.start,
        });
      } finally {
        setIsTradingFoxLoading(false);
      }
    },
    [
      authMe.isLoggedIn,
      copyRef,
      requestPrototypeCopyStrategyStart,
      setCopyTradingTarget,
      setIsTradingFoxLoading,
      setWorkspaceNotification,
      startTelegramLogin,
    ],
  );

  const requestPrototypeStrategyCreate = useCallback(
    async (input: PrototypeStrategyCreateInput) => {
      const account = await requestTradingFoxAccount("/api/tradingfox/traders", {
        body: JSON.stringify({
          autoStart: input.autoStart,
          config: input.config,
          configSchemaVersion: input.configSchemaVersion,
          copyTrading: input.copyTrading,
          exchangeConnectorId: input.exchangeConnectorId,
          strategyDefinitionId: input.strategyDefinitionId,
          strategyName: input.strategyName,
        }),
        method: "POST",
      });
      applyTradingFoxAccount(account);
      handleProductTabChange("strategyManagement");
    },
    [applyTradingFoxAccount, handleProductTabChange],
  );

  const handlePrototypeStrategyCreate = useCallback(
    async (input: PrototypeStrategyCreateInput) => {
      if (!authMe.isLoggedIn) {
        startTelegramLogin();
        throw new Error(
          copyRef.current.workspace.accountCenter.strategyCreate.loginRequired,
        );
      }

      setIsTradingFoxLoading(true);
      try {
        await requestPrototypeStrategyCreate(input);
        const strategyCreateCopy =
          copyRef.current.workspace.accountCenter.strategyCreate;
        setWorkspaceNotification({
          id: `strategy-created-${Date.now()}`,
          kind: "success",
          message: getStrategyCreateSuccessMessage(input, strategyCreateCopy),
          meta: input.strategyName,
          title: strategyCreateCopy.modalTitle,
        });
      } catch (error) {
        setWorkspaceNotification({
          id: `strategy-create-error-${Date.now()}`,
          kind: "error",
          message: getTradingFoxErrorMessage(error, copyRef.current),
          meta: input.strategyName,
          title: copyRef.current.workspace.accountCenter.strategyCreate.modalTitle,
        });
        throw error;
      } finally {
        setIsTradingFoxLoading(false);
      }
    },
    [
      authMe.isLoggedIn,
      copyRef,
      requestPrototypeStrategyCreate,
      setIsTradingFoxLoading,
      setWorkspaceNotification,
      startTelegramLogin,
    ],
  );

  const handlePrototypeStrategyStatusChange = useCallback(
    async (strategyId: string, status: PrototypeStrategyStatus) => {
      if (
        prototypeMarioStrategies.some((strategy) => strategy.id === strategyId)
      ) {
        setPrototypeMarioStrategies((currentStrategies) =>
          currentStrategies.map((strategy) =>
            strategy.id === strategyId ? { ...strategy, status } : strategy,
          ),
        );
        return;
      }

      const previousStrategies = prototypeStrategies;
      setPrototypeStrategies((currentStrategies) =>
        currentStrategies.map((strategy) =>
          strategy.id === strategyId ? { ...strategy, status } : strategy,
        ),
      );

      try {
        const account = await requestTradingFoxAccount(
          `/api/tradingfox/copy-strategies/${encodeURIComponent(strategyId)}`,
          {
            body: JSON.stringify({ status }),
            method: "PATCH",
          },
        );
        applyTradingFoxAccount(account);
      } catch (error) {
        setPrototypeStrategies(previousStrategies);
        setWorkspaceNotification({
          id: `copy-strategy-status-error-${Date.now()}`,
          kind: "error",
          message: getTradingFoxErrorMessage(error, copyRef.current),
          meta: strategyId,
          title: copyRef.current.workspace.accountCenter.strategy.title,
        });
        throw error;
      }
    },
    [
      applyTradingFoxAccount,
      copyRef,
      prototypeMarioStrategies,
      prototypeStrategies,
      setPrototypeMarioStrategies,
      setPrototypeStrategies,
      setWorkspaceNotification,
    ],
  );

  const handlePrototypeStrategyDelete = useCallback(
    async (strategyId: string) => {
      if (
        prototypeMarioStrategies.some((strategy) => strategy.id === strategyId)
      ) {
        setPrototypeMarioStrategies((currentStrategies) =>
          currentStrategies.filter((strategy) => strategy.id !== strategyId),
        );
        setWorkspaceNotification({
          id: `mario-strategy-delete-${Date.now()}`,
          kind: "success",
          message: copyRef.current.workspace.accountCenter.strategy.deleteSuccess,
          meta: strategyId,
          title: copyRef.current.workspace.accountCenter.strategy.title,
        });
        return;
      }

      const previousStrategies = prototypeStrategies;
      setPrototypeStrategies((currentStrategies) =>
        currentStrategies.filter((strategy) => strategy.id !== strategyId),
      );

      try {
        const account = await requestTradingFoxAccount(
          `/api/tradingfox/copy-strategies/${encodeURIComponent(strategyId)}`,
          { method: "DELETE" },
        );
        applyTradingFoxAccount(account);
        setWorkspaceNotification({
          id: `copy-strategy-delete-${Date.now()}`,
          kind: "success",
          message: copyRef.current.workspace.accountCenter.strategy.deleteSuccess,
          meta: strategyId,
          title: copyRef.current.workspace.accountCenter.strategy.title,
        });
      } catch (error) {
        setPrototypeStrategies(previousStrategies);
        setWorkspaceNotification({
          id: `copy-strategy-delete-error-${Date.now()}`,
          kind: "error",
          message: getTradingFoxErrorMessage(error, copyRef.current),
          meta: strategyId,
          title: copyRef.current.workspace.accountCenter.strategy.title,
        });
        throw error;
      }
    },
    [
      applyTradingFoxAccount,
      copyRef,
      prototypeMarioStrategies,
      prototypeStrategies,
      setPrototypeMarioStrategies,
      setPrototypeStrategies,
      setWorkspaceNotification,
    ],
  );

  const handlePrototypeStrategySettingsUpdate = useCallback(
    async (input: PrototypeStrategySettingsUpdateInput) => {
      const strategyName = input.strategyName.trim();
      if (!strategyName) {
        throw new Error(
          copyRef.current.workspace.accountCenter.strategy.settingsNameRequired,
        );
      }

      if (
        prototypeMarioStrategies.some(
          (strategy) => strategy.id === input.strategyId,
        )
      ) {
        setPrototypeMarioStrategies((currentStrategies) =>
          currentStrategies.map((strategy) =>
            strategy.id === input.strategyId
              ? {
                  ...strategy,
                  stopLossPercent: input.stopLossPercent,
                  takeProfitPercent: input.takeProfitPercent,
                  traderName: strategyName,
                }
              : strategy,
          ),
        );
        setWorkspaceNotification({
          id: `mario-strategy-settings-${Date.now()}`,
          kind: "success",
          message: copyRef.current.workspace.accountCenter.strategy.settingsSaved,
          meta: strategyName,
          title: copyRef.current.workspace.accountCenter.strategy.title,
        });
        return;
      }

      if (!authMe.isLoggedIn) {
        startTelegramLogin();
        throw new Error(
          copyRef.current.workspace.accountCenter.strategyCreate.loginRequired,
        );
      }

      const previousStrategies = prototypeStrategies;
      setPrototypeStrategies((currentStrategies) =>
        currentStrategies.map((strategy) =>
          strategy.id === input.strategyId
            ? {
                ...strategy,
                stopLossPercent: input.stopLossPercent,
                takeProfitPercent: input.takeProfitPercent,
                traderName: strategyName,
              }
            : strategy,
        ),
      );

      try {
        const requestBody: Record<string, unknown> = {
          strategyName,
        };
        if (input.config !== undefined) {
          requestBody.config = input.config;
          requestBody.configSchemaVersion = input.configSchemaVersion;
          requestBody.strategyDefinitionId = input.strategyDefinitionId;
        } else {
          requestBody.stopLossPercent = input.stopLossPercent;
          requestBody.takeProfitPercent = input.takeProfitPercent;
        }
        const account = await requestTradingFoxAccount(
          `/api/tradingfox/traders/${encodeURIComponent(
            input.strategyId,
          )}`,
          {
            body: JSON.stringify(requestBody),
            method: "PATCH",
          },
        );
        applyTradingFoxAccount(account);
        setWorkspaceNotification({
          id: `copy-strategy-settings-${Date.now()}`,
          kind: "success",
          message: copyRef.current.workspace.accountCenter.strategy.settingsSaved,
          meta: strategyName,
          title: copyRef.current.workspace.accountCenter.strategy.title,
        });
      } catch (error) {
        setPrototypeStrategies(previousStrategies);
        setWorkspaceNotification({
          id: `copy-strategy-settings-error-${Date.now()}`,
          kind: "error",
          message: getTradingFoxErrorMessage(error, copyRef.current),
          meta: strategyName || input.strategyId,
          title: copyRef.current.workspace.accountCenter.strategy.title,
        });
        throw error;
      }
    },
    [
      applyTradingFoxAccount,
      authMe.isLoggedIn,
      copyRef,
      prototypeMarioStrategies,
      prototypeStrategies,
      setPrototypeMarioStrategies,
      setPrototypeStrategies,
      setWorkspaceNotification,
      startTelegramLogin,
    ],
  );

  const openCommunityConversion = useCallback(
    (signal: StructuredSignal) => {
      handleSignalSelect(signal);
      setIsCommunityConversionOpen(true);
    },
    [handleSignalSelect, setIsCommunityConversionOpen],
  );

  const handleKolCommunityConversionOpen = useCallback(
    (_sourceName: string, signal?: StructuredSignal) => {
      if (signal) {
        handleSignalSelect(signal);
      }
      setIsCommunityConversionOpen(true);
    },
    [handleSignalSelect, setIsCommunityConversionOpen],
  );

  return {
    handleKolCommunityConversionOpen,
    handlePrototypeStrategyCreate,
    handlePrototypeStrategyDelete,
    handlePrototypeStrategySettingsUpdate,
    handlePrototypeStrategyStart,
    handlePrototypeStrategyStatusChange,
    openCommunityConversion,
    requestPrototypeCopyStrategyStart,
  };
}

function getStrategyCreateSuccessMessage(
  input: PrototypeStrategyCreateInput,
  strategyCreateCopy: {
    copyTradingCreatedToast: string;
    marioCreatedToast: string;
    strategyCreatedToast: string;
  },
): string {
  if (input.strategyType === "copyTrading") {
    return strategyCreateCopy.copyTradingCreatedToast;
  }
  if (input.strategyType === "mario") {
    return strategyCreateCopy.marioCreatedToast;
  }
  return strategyCreateCopy.strategyCreatedToast;
}

export type SignalWorkspaceTradingStrategyActions = ReturnType<
  typeof useSignalWorkspaceTradingStrategyActions
>;
