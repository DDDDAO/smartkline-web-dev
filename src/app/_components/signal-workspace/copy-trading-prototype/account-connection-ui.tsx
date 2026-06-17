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
import { ExchangeIcon, getExchangeById, getExchangeName } from "./exchange-utils";

export function ApiConnectionCard({
  accountCopy,
  apiConnection,
  isDisabled,
  isDarkTheme,
  onDelete,
}: {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  apiConnection: PrototypeApiConnection;
  isDisabled: boolean;
  isDarkTheme: boolean;
  onDelete: (connectionId: number) => Promise<void> | void;
}) {
  const exchangeLabel = getConnectionExchangeLabel(accountCopy, apiConnection);
  const exchange = getConnectionExchange(apiConnection);

  return (
    <div className={isDarkTheme ? "rounded-3xl border border-white/[0.075] bg-white/[0.035] p-3" : "rounded-3xl border border-[#E5EAF0] bg-white p-3 shadow-sm"}>
      <div className="flex items-start gap-3">
        <AccountConnectionExchangeIcon
          exchange={exchange}
          fallback={getConnectionFallback(apiConnection)}
          isDarkTheme={isDarkTheme}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black">{apiConnection.accountName}</div>
              <div className={isDarkTheme ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-slate-500"}>
                #{apiConnection.id} · {accountCopy.api.updatedAt}: {apiConnection.connectedAtLabel || "--"}
              </div>
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                {apiConnection.isMock ? (
                  <span className={isDarkTheme ? "rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-200" : "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700"}>
                    {accountCopy.api.mockBadge}
                  </span>
                ) : null}
                {apiConnection.recommended ? (
                  <span className={isDarkTheme ? "rounded-full bg-sky-300/15 px-2 py-0.5 text-[10px] font-black text-sky-100" : "rounded-full bg-[#DDF5FF] px-2 py-0.5 text-[10px] font-black text-[#007DB8]"}>
                    {accountCopy.apiSetup.recommendedBadge}
                  </span>
                ) : null}
                {apiConnection.bindingLabel && !apiConnection.isMock ? (
                  <span className={isDarkTheme ? "rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-black text-slate-300" : "rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-black text-slate-600"}>
                    {apiConnection.bindingLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              className={getDangerButtonClassName(isDarkTheme)}
              disabled={isDisabled}
              type="button"
              onClick={() => void onDelete(apiConnection.id)}
            >
              {accountCopy.api.deleteAction}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniMetric isDarkTheme={isDarkTheme} label={accountCopy.api.accountType} value={exchangeLabel} />
            <MiniMetric
              isDarkTheme={isDarkTheme}
              label={accountCopy.api.accountBalance}
              value={formatAccountBalance(apiConnection.accountBalance)}
            />
          </div>
          {apiConnection.whitelistIp ? (
            <div className={isDarkTheme ? "mt-3 rounded-2xl border border-emerald-300/10 bg-[#0F141B]/60 px-3 py-2" : "mt-3 rounded-2xl border border-emerald-100 bg-white/70 px-3 py-2"}>
              <div className={isDarkTheme ? "text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200/60" : "text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700/60"}>
                {accountCopy.apiSetup.whitelistIp}
              </div>
              <div className={isDarkTheme ? "mt-1 font-mono text-xs font-black text-emerald-100" : "mt-1 font-mono text-xs font-black text-emerald-800"}>
                {apiConnection.whitelistIp}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ExchangeResourceLinks({
  accountCopy,
  exchange,
  isDarkTheme,
}: {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  exchange: PrototypeExchange;
  isDarkTheme: boolean;
}) {
  const links: Array<{ href: string; label: string }> = [];
  if (exchange.registrationUrl) {
    links.push({ href: exchange.registrationUrl, label: accountCopy.apiSetup.registerRebate });
  }
  if (exchange.apiManagementUrl) {
    links.push({ href: exchange.apiManagementUrl, label: accountCopy.apiSetup.createApi });
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex shrink-0 flex-nowrap gap-2 xl:ml-auto xl:justify-end">
      {links.map((link) => (
        <a
          key={link.label}
          className={getExchangeResourceLinkClassName(isDarkTheme)}
          href={link.href}
          rel="noreferrer"
          target="_blank"
        >
          <span className="whitespace-nowrap">{link.label}</span>
          <ExternalLinkGlyph />
        </a>
      ))}
    </div>
  );
}

export function AccountConnectionExchangeIcon({
  exchange,
  fallback,
  isDarkTheme,
}: {
  exchange: PrototypeExchange | null;
  fallback: string;
  isDarkTheme: boolean;
}) {
  const logoPath = exchange?.logoPath ?? "";
  const [failedLogoPath, setFailedLogoPath] = useState<string | null>(null);
  const canShowLogo = Boolean(logoPath) && failedLogoPath !== logoPath;
  const shellClassName = isDarkTheme
    ? "relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[16px] bg-emerald-400/10 text-xs font-black text-emerald-200"
    : "relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[16px] bg-white text-xs font-black text-emerald-700 shadow-sm";

  return (
    <div className={shellClassName}>
      <span className="leading-none">{fallback}</span>
      {canShowLogo ? (
        <Image
          alt=""
          className="absolute h-8 w-8 rounded-[10px] object-contain"
          height={32}
          loading="lazy"
          src={logoPath}
          unoptimized
          width={32}
          onError={() => setFailedLogoPath(logoPath)}
        />
      ) : null}
    </div>
  );
}

export function TradingAccountSelect({
  accountCopy,
  connections,
  isDarkTheme,
  value,
  onChange,
}: {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  connections: readonly PrototypeApiConnection[];
  isDarkTheme: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedConnection = connections.find((connection) => String(connection.id) === value) ?? connections[0];

  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger
        className={isDarkTheme
          ? "mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-left text-sm font-bold text-slate-100 outline-none transition hover:bg-white/[0.055] focus:border-sky-400/45 focus:ring-2 focus:ring-sky-400/10 data-[placeholder]:text-slate-500"
          : "mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[#D5E4EF] bg-white px-3 py-2 text-left text-sm font-bold text-slate-950 shadow-sm outline-none transition hover:bg-[#F8FAFC] focus:border-[#7DBEFF] focus:ring-2 focus:ring-[#16AFF5]/10 data-[placeholder]:text-slate-400"}
      >
        <TradingAccountOptionContent accountCopy={accountCopy} connection={selectedConnection} isDarkTheme={isDarkTheme} />
        <SelectPrimitive.Icon asChild>
          <span aria-hidden="true" className={isDarkTheme ? "text-xs text-slate-500" : "text-xs text-slate-400"}>⌄</span>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={isDarkTheme
            ? "z-[130] max-h-[260px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-white/[0.075] bg-[#111820] p-1 text-slate-100 shadow-[0_18px_44px_rgba(0,0,0,0.38)]"
            : "z-[130] max-h-[260px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-[#D5E4EF] bg-white p-1 text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.14)]"}
          position="popper"
          sideOffset={8}
        >
          <SelectPrimitive.Viewport className="grid gap-1">
            {connections.map((connection) => (
              <SelectPrimitive.Item
                key={connection.id}
                className={isDarkTheme
                  ? "flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none transition data-[highlighted]:bg-white/[0.055] data-[state=checked]:bg-sky-400/10 data-[state=checked]:text-sky-100"
                  : "flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none transition data-[highlighted]:bg-[#F8FAFC] data-[state=checked]:bg-[#EAF8FE] data-[state=checked]:text-[#007DB8]"}
                value={String(connection.id)}
              >
                <SelectPrimitive.ItemText asChild>
                  <TradingAccountOptionContent accountCopy={accountCopy} connection={connection} isDarkTheme={isDarkTheme} />
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="text-xs font-black">✓</SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function TradingAccountOptionContent({
  accountCopy,
  connection,
  isDarkTheme,
}: {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  connection: PrototypeApiConnection;
  isDarkTheme: boolean;
}) {
  const exchangeLabel = getConnectionExchangeLabel(accountCopy, connection);

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black">{connection.accountName}</span>
        <span className={isDarkTheme ? "mt-0.5 block truncate text-xs font-semibold text-slate-500" : "mt-0.5 block truncate text-xs font-semibold text-slate-500"}>
          {exchangeLabel} · {formatAccountBalance(connection.accountBalance)}
        </span>
      </span>
      {connection.isMock ? (
        <span className={isDarkTheme ? "shrink-0 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-200" : "shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700"}>
          {accountCopy.api.mockBadge}
        </span>
      ) : null}
      {connection.recommended ? (
        <span className={isDarkTheme ? "shrink-0 rounded-full bg-sky-300/15 px-2 py-0.5 text-[10px] font-black text-sky-100" : "shrink-0 rounded-full bg-[#DDF5FF] px-2 py-0.5 text-[10px] font-black text-[#007DB8]"}>
          {accountCopy.apiSetup.recommendedBadge}
        </span>
      ) : null}
    </span>
  );
}

export function getConnectionExchangeLabel(
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"],
  connection: PrototypeApiConnection,
): string {
  const exchange = getConnectionExchange(connection);

  return exchange
    ? getExchangeName(accountCopy, exchange.id)
    : connection.exchangePlatform || accountCopy.exchanges.mockExchange;
}

export function getConnectionFallback(connection: PrototypeApiConnection): string {
  return getConnectionExchange(connection)?.fallback ?? createExchangeFallback(connection.exchangePlatform);
}

export function getConnectionExchange(connection: PrototypeApiConnection): PrototypeExchange | null {
  const normalizedPlatform = normalizeConnectionExchangePlatform(connection.exchangePlatform);
  if (connection.isMock && isBinanceDemoConnectionPlatform(connection.exchangePlatform)) {
    return getExchangeById("binanceDemo");
  }

  return EXCHANGES.find((exchange) =>
    normalizeConnectionExchangePlatform(exchange.connectorExchangePlatform) === normalizedPlatform
      && (connection.isMock ? exchange.mode === "demo" : exchange.mode === "api"),
  ) ?? null;
}

export function isBinanceDemoConnectionPlatform(value: string): boolean {
  const normalizedPlatform = normalizeConnectionExchangePlatform(value);
  return normalizedPlatform === "binance" || normalizedPlatform === "binancedemo" || normalizedPlatform === "bn";
}

export function normalizeConnectionExchangePlatform(value: string): string {
  return value.replace(/[\s_-]/gu, "").toLowerCase();
}

export function createExchangeFallback(exchangePlatform: string): string {
  const fallback = exchangePlatform.replace(/[^a-z0-9]/giu, "").slice(0, 2).toUpperCase();
  return fallback || "API";

}
