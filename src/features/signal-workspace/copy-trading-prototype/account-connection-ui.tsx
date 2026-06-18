"use client";

import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { EXCHANGES, type PrototypeExchange } from "./constants";
import type { PrototypeApiConnection } from "./types";
import { formatAccountBalance } from "./formatters";
import { ExternalLinkGlyph } from "./icons";
import { MiniMetric } from "./mini-metric";
import { getExchangeById, getExchangeName } from "./exchange-utils";

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
  const isBinanceDemoConnection = isBinanceDemoConnectionPlatform(apiConnection.exchangePlatform);

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
                  <Badge className={getSuccessBadgeClassName(isDarkTheme)}>
                    {accountCopy.api.mockBadge}
                  </Badge>
                ) : null}
                {isBinanceDemoConnection ? (
                  <Badge className={getSuccessBadgeClassName(isDarkTheme)}>
                    {accountCopy.apiSetup.demoBadge}
                  </Badge>
                ) : null}
                {apiConnection.recommended ? (
                  <Badge className={getInfoBadgeClassName(isDarkTheme)}>
                    {accountCopy.apiSetup.recommendedBadge}
                  </Badge>
                ) : null}
                {apiConnection.bindingLabel && !apiConnection.isMock ? (
                  <Badge className={getNeutralBadgeClassName(isDarkTheme)} variant="secondary">
                    {apiConnection.bindingLabel}
                  </Badge>
                ) : null}
              </div>
            </div>
            <Button
              className={getDangerButtonClassName(isDarkTheme)}
              disabled={isDisabled}
              size="sm"
              type="button"
              variant="destructive"
              onClick={() => void onDelete(apiConnection.id)}
            >
              {accountCopy.api.deleteAction}
            </Button>
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
        <Button
          asChild
          key={link.label}
          className={getExchangeResourceLinkClassName(isDarkTheme)}
          size="sm"
          variant="outline"
        >
          <a href={link.href} rel="noreferrer" target="_blank">
            <span className="whitespace-nowrap">{link.label}</span>
            <ExternalLinkGlyph />
          </a>
        </Button>
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
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={isDarkTheme
          ? "mt-2 min-h-12 rounded-2xl border-white/[0.075] bg-white/[0.035] py-2 text-left text-sm font-bold text-slate-100 hover:bg-white/[0.055] focus:ring-sky-400/10 data-[placeholder]:text-slate-500 [&>span]:line-clamp-none"
          : "mt-2 min-h-12 rounded-2xl border-[#D5E4EF] bg-white py-2 text-left text-sm font-bold text-slate-950 shadow-sm hover:bg-[#F8FAFC] focus:ring-[#16AFF5]/10 data-[placeholder]:text-slate-400 [&>span]:line-clamp-none"}
      >
        <TradingAccountOptionContent accountCopy={accountCopy} connection={selectedConnection} isDarkTheme={isDarkTheme} />
      </SelectTrigger>
      <SelectContent
        className={isDarkTheme
          ? "z-[130] max-h-[260px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-white/[0.075] bg-[#111820] p-1 text-slate-100 shadow-[0_18px_44px_rgba(0,0,0,0.38)]"
          : "z-[130] max-h-[260px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-[#D5E4EF] bg-white p-1 text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.14)]"}
        position="popper"
        sideOffset={8}
      >
        {connections.map((connection) => (
          <SelectItem
            key={connection.id}
            className={isDarkTheme
              ? "flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none transition data-[highlighted]:bg-white/[0.055] data-[state=checked]:bg-sky-400/10 data-[state=checked]:text-sky-100"
              : "flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none transition data-[highlighted]:bg-[#F8FAFC] data-[state=checked]:bg-[#EAF8FE] data-[state=checked]:text-[#007DB8]"}
            value={String(connection.id)}
          >
            <TradingAccountOptionContent accountCopy={accountCopy} connection={connection} isDarkTheme={isDarkTheme} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
  const isBinanceDemoConnection = isBinanceDemoConnectionPlatform(connection.exchangePlatform);

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black">{connection.accountName}</span>
        <span className={isDarkTheme ? "mt-0.5 block truncate text-xs font-semibold text-slate-500" : "mt-0.5 block truncate text-xs font-semibold text-slate-500"}>
          {exchangeLabel} · {formatAccountBalance(connection.accountBalance)}
        </span>
      </span>
      {connection.isMock ? (
        <Badge className={getSuccessBadgeClassName(isDarkTheme)}>
          {accountCopy.api.mockBadge}
        </Badge>
      ) : null}
      {isBinanceDemoConnection ? (
        <Badge className={getSuccessBadgeClassName(isDarkTheme)}>
          {accountCopy.apiSetup.demoBadge}
        </Badge>
      ) : null}
      {connection.recommended ? (
        <Badge className={getInfoBadgeClassName(isDarkTheme)}>
          {accountCopy.apiSetup.recommendedBadge}
        </Badge>
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
  if (isBinanceDemoConnectionPlatform(connection.exchangePlatform)) {
    return getExchangeById("binanceDemo");
  }

  return EXCHANGES.find((exchange) =>
    normalizeConnectionExchangePlatform(exchange.connectorExchangePlatform) === normalizedPlatform
      && (connection.isMock ? exchange.mode === "demo" : exchange.mode === "api"),
  ) ?? null;
}

export function isBinanceDemoConnectionPlatform(value: string): boolean {
  const normalizedPlatform = normalizeConnectionExchangePlatform(value);
  return normalizedPlatform === "binancedemo";
}

export function normalizeConnectionExchangePlatform(value: string): string {
  return value.replace(/[\s_-]/gu, "").toLowerCase();
}

export function createExchangeFallback(exchangePlatform: string): string {
  const fallback = exchangePlatform.replace(/[^a-z0-9]/giu, "").slice(0, 2).toUpperCase();
  return fallback || "API";

}

function getDangerButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "border border-rose-400/20 bg-rose-400/10 text-rose-200 hover:bg-rose-400/15"
    : "border border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100";
}

function getExchangeResourceLinkClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "h-9 min-w-[74px] rounded-xl border-white/[0.075] bg-white/[0.08] px-3 text-xs font-black text-slate-200 hover:border-sky-300/25 hover:bg-white/[0.12] hover:text-slate-50"
    : "h-9 min-w-[74px] rounded-xl border-[#D5E4EF] bg-[#F8FAFC] px-3 text-xs font-black text-slate-700 shadow-sm hover:border-[#BFE7FB] hover:bg-white hover:text-slate-950";
}

function getSuccessBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "shrink-0 rounded-full border-0 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-200"
    : "shrink-0 rounded-full border-0 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700";
}

function getInfoBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "shrink-0 rounded-full border-0 bg-sky-300/15 px-2 py-0.5 text-[10px] font-black text-sky-100"
    : "shrink-0 rounded-full border-0 bg-[#DDF5FF] px-2 py-0.5 text-[10px] font-black text-[#007DB8]";
}

function getNeutralBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "shrink-0 rounded-full border-0 bg-white/[0.06] px-2 py-0.5 text-[10px] font-black text-slate-300"
    : "shrink-0 rounded-full border-0 bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-black text-slate-600";
}
