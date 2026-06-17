"use client";

import Image from "next/image";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect, useSignTypedData } from "wagmi";
import { useEffect, useMemo, useRef, useState } from "react";
import { getTradingFoxErrorMessage } from "@/app/_lib/tradingfox-errors";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import { isWalletConnectConfigured } from "@/app/_lib/wallet-connect";
import type { TelegramSessionUser } from "@/app/_lib/auth/telegram-auth";
import type { TradingFoxAccountResponse, TradingFoxHyperliquidAgentBindingStartResponse, TradingFoxHyperliquidSigningAction } from "@/app/_lib/tradingfox-control-plane";
import { SourceAvatar } from "../card-ui";
import { StrategyDetailView } from "./strategy-detail-view";
import { StrategySettingsDialog } from "./strategy-settings-dialog";
import { TelegramUserAvatar, getTelegramUserDisplayName } from "./telegram-user-avatar";
import { EXCHANGES, HYPERLIQUID_DEPOSIT_URL, MOCK_MARGIN_BALANCE_MAX, MOCK_MARGIN_BALANCE_PRESETS, NOTIFICATION_CHANNELS, type PrototypeExchange, type PrototypeExchangeId } from "./constants";
import type { AccountCenterPrototypeProps, AccountManagementTab, CopyTradingPrototypeModalProps, CopyTradingPrototypeTarget, PrototypeApiConnection, PrototypeConnectionSaveInput, PrototypeStrategy, PrototypeStrategyCreateInput, PrototypeStrategySettingsUpdateInput, PrototypeStrategyStatus, PrototypeStrategyType } from "./types";
import { formatAccountBalance, formatDetailCurrency, formatSignedDetailCurrency, getPnlClassName, numberOrZero } from "./formatters";
import { CheckGlyph, CopyGlyph, ExternalLinkGlyph } from "./icons";
import { MiniMetric } from "./mini-metric";
import { getPrototypeStrategyType, getStrategyStatusLabel } from "./strategy-helpers";
import { getAccountCenterTabButtonClassName, getDangerButtonClassName, getExchangeButtonClassName, getExchangeResourceLinkClassName, getIconButtonClassName, getInlineErrorClassName, getLabelClassName, getModalSectionClassName, getNotificationIconClassName, getNotificationUnavailableBadgeClassName, getPrimaryButtonClassName, getSoftButtonClassName, getStrategyStatusClassName, getStrategyTypeOptionClassName, getWhitelistCopyButtonClassName } from "./styles";
import type { SignTypedDataMutateAsync as SignTypedDataAsync, SignTypedDataVariables as WagmiSignTypedDataVariables } from "wagmi/query";

export function createSignalSourceTargetById(
  sources: readonly CopyTradingPrototypeTarget[],
): Map<string, CopyTradingPrototypeTarget> {
  return new Map(sources.map((source) => [source.trader.trader_id, source]));
}

export function formatDefaultCopyStrategyName(
  target: CopyTradingPrototypeTarget | null,
  typeLabel: string,
): string {
  const sourceName = target?.trader.name.trim() ?? "";
  if (!sourceName) {
    return "";
  }

  return `${sourceName} ${typeLabel}`.trim();
}

type FollowedSignalSourceDisplay = {
  avatarUrl: string | null;
  id: string;
  name: string;
  platform: string;
};

export function resolveFollowedSignalSourceDisplay(
  strategy: PrototypeStrategy,
  followedSignalSource: CopyTradingPrototypeTarget | null | undefined,
  unknownLabel: string,
): FollowedSignalSourceDisplay {
  if (followedSignalSource) {
    return {
      avatarUrl: followedSignalSource.trader.avatar || null,
      id: followedSignalSource.trader.trader_id,
      name: followedSignalSource.trader.name || followedSignalSource.trader.trader_id || unknownLabel,
      platform: followedSignalSource.trader.platform,
    };
  }

  const id = strategy.traderId.trim();
  const fallbackPlatform = strategy.platform === "Copy Trading" ? "" : strategy.platform;

  return {
    avatarUrl: strategy.signalSourceAvatarUrl || strategy.avatarUrl || null,
    id,
    name: strategy.signalSourceName?.trim() || id || unknownLabel,
    platform: strategy.signalSourcePlatform?.trim() || fallbackPlatform,
  };
}
