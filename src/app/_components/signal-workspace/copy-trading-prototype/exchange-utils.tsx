"use client";

import Image from "next/image";
import { useState } from "react";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { EXCHANGES, type PrototypeExchange, type PrototypeExchangeId } from "./constants";

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
