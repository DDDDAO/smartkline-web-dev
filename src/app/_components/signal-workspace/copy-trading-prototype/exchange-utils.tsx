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

export function ExchangeIcon({ enabled, exchange, isDarkTheme }: { enabled: boolean; exchange: PrototypeExchange; isDarkTheme: boolean }) {
  const [failedLogoPath, setFailedLogoPath] = useState<string | null>(null);
  const canShowLogo = exchange.logoPath && failedLogoPath !== exchange.logoPath;

  const shellClassName = enabled
    ? isDarkTheme ? "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-sky-400/15 text-xs font-black text-sky-200" : "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-[#EAF8FE] text-xs font-black text-[#008DCC]"
    : isDarkTheme ? "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-white/[0.06] text-xs font-black text-slate-500" : "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-slate-100 text-xs font-black text-slate-400";

  return (
    <span className={shellClassName}>
      <span className="leading-none">{exchange.fallback}</span>
      {canShowLogo ? (
        <Image
          alt=""
          className={`absolute h-8 w-8 rounded-[10px] object-contain transition-opacity ${enabled ? "" : "opacity-55 grayscale"}`}
          height={32}
          loading="lazy"
          src={exchange.logoPath}
          unoptimized
          width={32}
          onError={() => setFailedLogoPath(exchange.logoPath)}
        />
      ) : null}
    </span>
  );
}

export function getExchangeById(exchangeId: PrototypeExchangeId): PrototypeExchange {
  return EXCHANGES.find((exchange) => exchange.id === exchangeId) ?? EXCHANGES[0];
}

export function getExchangeName(accountCopy: WorkspaceCopy["workspace"]["accountCenter"], id: PrototypeExchangeId): string {
  return accountCopy.exchanges[id];
}
