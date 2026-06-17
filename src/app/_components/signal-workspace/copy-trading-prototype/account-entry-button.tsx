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
import { createSignalSourceTargetById, formatDefaultCopyStrategyName, NotificationSettingsPlaceholder, ApiConnectionCard, StrategyCreateLayer, TradingAccountSelect, PercentInput, PrototypeInput, ExchangeIcon, ExchangeResourceLinks, getExchangeById, getExchangeName, HyperliquidAgentWalletPanel, WhitelistIpCopyPanel, requestTradingFoxConnectorWhitelistIP, requestHyperliquidAgentBindingStart, requestHyperliquidAgentBindingComplete, findHyperliquidSigningAction, signHyperliquidTypedData, resolveFollowedSignalSourceDisplay } from "./copy-trading-prototype-helpers";

export function AccountEntryButton({
  copy,
  isAuthLoading,
  isDarkTheme,
  telegramUser,
  onOpen,
}: {
  copy: WorkspaceCopy;
  isAuthLoading: boolean;
  isDarkTheme: boolean;
  telegramUser: TelegramSessionUser | null;
  onOpen: () => void;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const className = isDarkTheme
    ? "group inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.075] bg-white/[0.035] p-0 text-left text-slate-200 transition hover:bg-white/[0.08] hover:text-slate-50 sm:h-10 sm:w-auto sm:justify-start sm:gap-2 sm:py-1 sm:pl-1 sm:pr-3"
    : "group inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D5E4EF] bg-white p-0 text-left text-slate-700 shadow-sm transition hover:border-[#BFE7FB] hover:bg-[#F4FBFF] hover:text-slate-950 sm:h-10 sm:w-auto sm:justify-start sm:gap-2 sm:py-1 sm:pl-1 sm:pr-3";

  return (
    <button aria-label={accountCopy.drawer.openAccount} className={className} type="button" onClick={onOpen}>
      <TelegramUserAvatar
        isDarkTheme={isDarkTheme}
        size="compact"
        user={telegramUser}
      />
      <span className="hidden min-w-0 sm:block">
        <span className="block max-w-[112px] truncate text-xs font-black leading-tight">
          {isAuthLoading ? accountCopy.user.loading : getTelegramUserDisplayName(telegramUser, accountCopy.user.loginAction)}
        </span>
        <span className={isDarkTheme ? "block max-w-[112px] truncate text-[10px] font-bold leading-tight text-slate-500" : "block max-w-[112px] truncate text-[10px] font-bold leading-tight text-slate-500"}>
          {telegramUser?.username ? `@${telegramUser.username}` : accountCopy.user.demoSubtitle}
        </span>
      </span>
    </button>
  );
}

