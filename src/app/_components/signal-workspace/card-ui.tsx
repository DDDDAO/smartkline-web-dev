"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { getResolvedKolAvatarUrl } from "@/app/_lib/kol-avatar";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { StructuredSignal } from "@/app/_types/signal";

export function SourceAvatar({
  isDarkTheme,
  name,
  url,
}: {
  isDarkTheme: boolean;
  name: string;
  url: string | null;
}) {
  const avatarUrl = getResolvedKolAvatarUrl(name, url);
  const avatarStyle: CSSProperties = {
    backgroundImage: `url("${avatarUrl}")`,
    backgroundPosition: "center",
    backgroundSize: "cover",
  };
  const className = isDarkTheme
    ? "block h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-[#181A20] bg-slate-200"
    : "block h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-200";

  return (
    <span aria-hidden="true" className={className}>
      <span className="block h-full w-full" style={avatarStyle} />
    </span>
  );
}

export function SymbolIcon({
  size = "sm",
  symbol,
}: {
  size?: "md" | "sm";
  symbol: string;
}) {
  const symbolName = getSymbolBaseAsset(symbol);
  const knownIcon = getKnownSymbolIcon(symbolName);
  const sizeClassName = size === "md" ? "h-5 w-5 text-[10px]" : "h-4 w-4 text-[9px]";

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full font-black text-white ${sizeClassName}`}
      style={knownIcon?.style ?? createAvatarFallbackStyle(symbolName)}
    >
      {knownIcon?.content ?? getSymbolIconGlyph(symbolName)}
    </span>
  );
}

export function getSymbolBaseAsset(symbol: string): string {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const [marketPair] = normalizedSymbol.split(":");
  const [baseAsset] = marketPair.split("/");

  return baseAsset.replace(/USDT$/, "").trim();
}

type KnownSymbolIcon = {
  content: ReactNode;
  style: CSSProperties;
};

/**
 * Binance exposes asset metadata, but its logo CDN blocks cross-origin hotlinks
 * in Chromium through ORB/CORP. Rendering the common symbols locally keeps the
 * filter usable instead of showing a white circle when a remote image is denied.
 */
function getKnownSymbolIcon(symbol: string): KnownSymbolIcon | null {
  const symbolName = symbol.toUpperCase();
  const textIcon = (label: string, background: string, fontSize = "0.92em"): KnownSymbolIcon => ({
    content: <span className="leading-none" style={{ fontSize }}>{label}</span>,
    style: { background },
  });

  const icons: Record<string, KnownSymbolIcon> = {
    ADA: textIcon("A", "#3468D1"),
    AVAX: textIcon("A", "#E84142"),
    BNB: {
      content: <BnbSymbolGlyph />,
      style: { background: "#F3BA2F" },
    },
    BTC: textIcon("₿", "#F7931A", "1.02em"),
    DOGE: textIcon("Ð", "#C2A633", "1em"),
    ETH: {
      content: <EthereumSymbolGlyph />,
      style: { background: "linear-gradient(135deg, #6B8AFF, #8A5CF6)" },
    },
    EUR: textIcon("€", "linear-gradient(135deg, #2563EB, #60A5FA)", "1em"),
    LINK: {
      content: <ChainlinkSymbolGlyph />,
      style: { background: "#2A5ADA" },
    },
    LITE: textIcon("Li", "linear-gradient(135deg, #60A5FA, #A78BFA)", "0.72em"),
    LTC: textIcon("Ł", "#345D9D", "1em"),
    SOL: {
      content: <SolanaSymbolGlyph />,
      style: { background: "#14151A" },
    },
    TON: {
      content: <TonSymbolGlyph />,
      style: { background: "#0098EA" },
    },
    USDT: textIcon("₮", "#26A17B", "1em"),
    XRP: textIcon("X", "#23292F"),
  };

  return icons[symbolName] ?? null;
}

function EthereumSymbolGlyph() {
  return (
    <svg aria-hidden="true" className="h-[78%] w-[78%]" fill="none" viewBox="0 0 24 24">
      <path d="M12 2 5.5 12.2 12 9.3l6.5 2.9L12 2Z" fill="#F5F7FF" opacity="0.92" />
      <path d="M5.5 13.5 12 22l6.5-8.5L12 17.1 5.5 13.5Z" fill="#C9D5FF" opacity="0.95" />
      <path d="m12 9.3-6.5 2.9L12 15.8l6.5-3.6L12 9.3Z" fill="#FFFFFF" />
    </svg>
  );
}

function BnbSymbolGlyph() {
  return (
    <svg aria-hidden="true" className="h-[78%] w-[78%]" fill="none" viewBox="0 0 24 24">
      <path d="M12 3.2 15.1 6.3 12 9.4 8.9 6.3 12 3.2Z" fill="#181A20" />
      <path d="M6.3 8.9 9.4 12 6.3 15.1 3.2 12 6.3 8.9Z" fill="#181A20" />
      <path d="M17.7 8.9 20.8 12l-3.1 3.1-3.1-3.1 3.1-3.1Z" fill="#181A20" />
      <path d="M12 14.6 15.1 17.7 12 20.8 8.9 17.7 12 14.6Z" fill="#181A20" />
      <path d="M12 9.2 14.8 12 12 14.8 9.2 12 12 9.2Z" fill="#181A20" />
    </svg>
  );
}

function SolanaSymbolGlyph() {
  return (
    <svg aria-hidden="true" className="h-[78%] w-[78%]" fill="none" viewBox="0 0 24 24">
      <path d="M6.2 6.5h11.6l-2 2.5H4.2l2-2.5Z" fill="url(#solana-a)" />
      <path d="M4.2 10.8h11.6l2 2.4H6.2l-2-2.4Z" fill="url(#solana-b)" />
      <path d="M6.2 15h11.6l-2 2.5H4.2l2-2.5Z" fill="url(#solana-c)" />
      <defs>
        <linearGradient id="solana-a" x1="4.2" x2="17.8" y1="8" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient id="solana-b" x1="4.2" x2="17.8" y1="12" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient id="solana-c" x1="4.2" x2="17.8" y1="16.5" y2="16.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ChainlinkSymbolGlyph() {
  return (
    <svg aria-hidden="true" className="h-[78%] w-[78%]" fill="none" viewBox="0 0 24 24">
      <path d="m12 3.7 7 4v8l-7 4-7-4v-8l7-4Z" stroke="#FFFFFF" strokeWidth="3" />
    </svg>
  );
}

function TonSymbolGlyph() {
  return (
    <svg aria-hidden="true" className="h-[78%] w-[78%]" fill="none" viewBox="0 0 24 24">
      <path d="M4.4 6.2h15.2L12 19.5 4.4 6.2Z" fill="#FFFFFF" />
      <path d="M7.4 8.3h9.2L12 16.4 7.4 8.3Z" fill="#0098EA" opacity="0.38" />
    </svg>
  );
}

function getSymbolIconGlyph(symbol: string): string {
  const symbolName = symbol.toUpperCase();

  return symbolName.slice(0, 1) || "?";
}

function createAvatarFallbackStyle(name: string): CSSProperties {
  const palettes = [
    ["#38bdf8", "#818cf8"],
    ["#60a5fa", "#22d3ee"],
    ["#93c5fd", "#a78bfa"],
    ["#67e8f9", "#0ea5e9"],
    ["#7dd3fc", "#c4b5fd"],
    ["#5eead4", "#38bdf8"],
  ];
  const palette = palettes[Math.abs(hashString(name)) % palettes.length];

  return {
    background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
  };
}

function hashString(value: string): number {
  return Array.from(value).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
}

export function TelegramSignalMessage({
  copy,
  isDarkTheme,
  signal,
}: {
  copy: WorkspaceCopy["kol"];
  isDarkTheme: boolean;
  signal: StructuredSignal;
}) {
  const messageTime = formatTelegramMessageDateTime(signal.created_at);
  const shellClassName = isDarkTheme
    ? "flex min-h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1722]"
    : "flex min-h-full overflow-hidden rounded-2xl border border-[#d7e7d8] bg-[#dceccd]";
  const wallpaperStyle: CSSProperties = {
    backgroundImage: isDarkTheme
      ? 'linear-gradient(rgba(8, 17, 27, 0.72), rgba(8, 17, 27, 0.72)), url("/tg-background-dark.png")'
      : 'linear-gradient(rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.22)), url("/tg-background-light.png")',
    backgroundPosition: "center",
    backgroundRepeat: "repeat",
    backgroundSize: "cover",
  };
  const headerNameClassName = isDarkTheme ? "truncate text-xs font-bold text-slate-50" : "truncate text-xs font-bold text-[#1F3B34]";
  const headerMetaClassName = isDarkTheme ? "mt-0.5 truncate text-[10px] text-slate-300" : "mt-0.5 truncate text-[10px] text-[#5F7D73]";
  const bubbleClassName = isDarkTheme
    ? "relative mt-3 rounded-[20px] rounded-tl-md border border-white/[0.08] bg-[#181A20]/95 px-3 py-3 text-slate-100 shadow-[0_8px_22px_rgba(0,0,0,0.20)]"
    : "relative mt-3 rounded-[20px] rounded-tl-md bg-white px-3 py-3 text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.10)]";
  const traceMetaClassName = isDarkTheme ? "mt-3 flex items-center justify-between gap-3 text-[10px] font-medium text-slate-400" : "mt-3 flex items-center justify-between gap-3 text-[10px] font-medium text-slate-400";
  const sourceTypeClassName = isDarkTheme
    ? "rounded-full border border-white/[0.08] bg-[#181A20]/90 px-2 py-0.5 text-[10px] font-semibold text-slate-200"
    : "rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-[#52766C]";

  return (
    <div className={shellClassName}>
      <div className="min-h-full flex-1 p-3" style={wallpaperStyle}>
        <div className="flex items-center gap-2">
          <SourceAvatar isDarkTheme={isDarkTheme} name={signal.source_name} url={signal.source_avatar_url} />
          <div className="min-w-0 flex-1">
            <div className={headerNameClassName}>{signal.source_name}</div>
            <div className={headerMetaClassName}>{copy.telegramChannel} {String.fromCharCode(0x00B7)} {messageTime}</div>
          </div>
          <span className={sourceTypeClassName}>{formatKolSourceType(signal.source_type, copy)}</span>
        </div>

        <div className={bubbleClassName}>
          <div className="whitespace-pre-wrap text-xs leading-5">{signal.raw_text}</div>
          <div className={traceMetaClassName}>
            <span>{copy.traceableSource}</span>
            <span className="font-bold text-[#00A6F4]">{String.fromCharCode(0x2713, 0x2713)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function formatKolSourceType(sourceType: string, copy: WorkspaceCopy["kol"]): string {
  if (sourceType === "\u5F00\u4ED3\u4FE1\u53F7") {
    return copy.sourceTypes.opening;
  }

  if (sourceType === "\u5171\u632F\u4FE1\u53F7") {
    return copy.sourceTypes.resonance;
  }

  return sourceType;
}

function formatTelegramMessageDateTime(createdAt: string): string {
  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return createdAt.replace("T", " ").slice(0, 16);
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const hours = String(parsedDate.getHours()).padStart(2, "0");
  const minutes = String(parsedDate.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function SignalField({ isDarkTheme, label, value }: { isDarkTheme: boolean; label: string; value: string }) {
  const valueRef = useRef<HTMLDivElement | null>(null);
  const [isValueTruncated, setIsValueTruncated] = useState(false);
  const fieldClassName = isDarkTheme
    ? "signal-field-card group relative rounded-2xl border border-white/[0.075] bg-white/[0.035] px-2 py-2"
    : "signal-field-card group relative rounded-2xl border border-[#E5EAF0] bg-white px-2 py-2";
  const tooltipClassName = isDarkTheme
    ? "motion-fx-9-tooltip signal-field-tooltip pointer-events-none invisible absolute left-0 top-0 min-h-full w-full rounded-2xl border border-white/[0.10] bg-[#181A20] px-2 py-2 text-xs leading-4 text-slate-100 opacity-0 shadow-[0_14px_36px_rgba(0,0,0,0.34)] group-hover:visible group-hover:opacity-100"
    : "motion-fx-9-tooltip signal-field-tooltip pointer-events-none invisible absolute left-0 top-0 min-h-full w-full rounded-2xl border border-[#E5EAF0] bg-white px-2 py-2 text-xs leading-4 text-slate-800 opacity-0 shadow-[0_14px_36px_rgba(15,23,42,0.14)] group-hover:visible group-hover:opacity-100";

  useEffect(() => {
    const element = valueRef.current;
    if (!element) {
      return;
    }

    const updateTruncationState = () => {
      setIsValueTruncated(element.scrollWidth > element.clientWidth + 1);
    };

    updateTruncationState();
    const resizeObserver = new ResizeObserver(updateTruncationState);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [value]);

  return (
    <div className={fieldClassName} aria-label={isValueTruncated ? `${label}: ${value}` : undefined}>
      <div className={isDarkTheme ? "text-slate-500" : "text-slate-400"}>{label}</div>
      <div ref={valueRef} className={isDarkTheme ? "mt-1 truncate text-slate-200" : "mt-1 truncate text-slate-800"}>{value}</div>
      {isValueTruncated ? (
        <div className={tooltipClassName} role="tooltip">
          <div className={isDarkTheme ? "text-slate-500" : "text-slate-400"}>{label}</div>
          <div className="mt-1 whitespace-normal break-words">{value}</div>
        </div>
      ) : null}
    </div>
  );
}
