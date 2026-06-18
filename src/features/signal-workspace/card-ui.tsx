"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { getResolvedKolAvatarUrl } from "@/lib/kol-avatar";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { StructuredSignal } from "@/types/signal";

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
  const iconUrl = createBinanceAssetIconProxyUrl(symbolName);
  const [loadedIconUrl, setLoadedIconUrl] = useState<string | null>(null);
  const sizeClassName = size === "md" ? "h-5 w-5 text-[10px]" : "h-4 w-4 text-[9px]";
  const pixelSize = size === "md" ? 20 : 16;

  return (
    <span
      aria-hidden="true"
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full font-black text-white ${sizeClassName}`}
      style={createAvatarFallbackStyle(symbolName)}
    >
      <span className="leading-none">{getSymbolIconGlyph(symbolName)}</span>
      <Image
        alt=""
        className="absolute inset-0 h-full w-full rounded-full object-cover transition-opacity duration-150"
        height={pixelSize}
        loading="lazy"
        src={iconUrl}
        style={{ opacity: loadedIconUrl === iconUrl ? 1 : 0 }}
        unoptimized
        width={pixelSize}
        onError={() => {
          setLoadedIconUrl((currentIconUrl) => currentIconUrl === iconUrl ? null : currentIconUrl);
        }}
        onLoad={() => {
          setLoadedIconUrl(iconUrl);
        }}
      />
    </span>
  );
}

export function FavoriteStarButton({
  activeLabel,
  inactiveLabel,
  isActive,
  isDarkTheme,
  size = "default",
  onToggle,
}: {
  activeLabel: string;
  inactiveLabel: string;
  isActive: boolean;
  isDarkTheme: boolean;
  size?: "compact" | "default";
  onToggle: () => void;
}) {
  const label = isActive ? activeLabel : inactiveLabel;
  const sizeClassName = size === "compact" ? "h-7 w-7" : "h-8 w-8";
  const iconClassName = size === "compact" ? "h-3.5 w-3.5" : "h-4 w-4";
  const className = isActive
    ? isDarkTheme
      ? `grid ${sizeClassName} shrink-0 place-items-center rounded-full border border-amber-300/30 bg-amber-300/14 text-amber-200 transition hover:bg-amber-300/20`
      : `grid ${sizeClassName} shrink-0 place-items-center rounded-full border border-amber-200 bg-amber-50 text-amber-500 transition hover:bg-amber-100`
    : isDarkTheme
      ? `grid ${sizeClassName} shrink-0 place-items-center rounded-full border border-white/[0.075] bg-white/[0.035] text-slate-500 transition hover:border-amber-300/30 hover:bg-amber-300/10 hover:text-amber-200`
      : `grid ${sizeClassName} shrink-0 place-items-center rounded-full border border-[#E5EAF0] bg-white text-slate-400 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-500`;

  return (
    <button
      aria-label={label}
      aria-pressed={isActive}
      className={className}
      title={label}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <svg
        aria-hidden="true"
        className={iconClassName}
        fill={isActive ? "currentColor" : "none"}
        viewBox="0 0 24 24"
      >
        <path
          d="m12 3.4 2.63 5.34 5.9.86-4.27 4.16 1.01 5.87L12 16.86l-5.27 2.77 1.01-5.87L3.47 9.6l5.9-.86L12 3.4Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </button>
  );
}

export function getSymbolBaseAsset(symbol: string): string {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const [marketPair] = normalizedSymbol.split(":");
  const [baseAsset] = marketPair.split("/");

  return baseAsset.replace(/USDT$/, "").trim();
}

function createBinanceAssetIconProxyUrl(symbol: string): string {
  return `/api/binance-asset-icons/${encodeURIComponent(symbol)}`;
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

export function SignalField({
  isDarkTheme,
  label,
  value,
  valueClassName,
}: {
  isDarkTheme: boolean;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  const valueRef = useRef<HTMLDivElement | null>(null);
  const [isValueTruncated, setIsValueTruncated] = useState(false);
  const fieldClassName = isDarkTheme
    ? "signal-field-card group relative rounded-2xl border border-white/[0.075] bg-white/[0.035] px-2 py-2"
    : "signal-field-card group relative rounded-2xl border border-[#E5EAF0] bg-white px-2 py-2";
  const defaultValueClassName = isDarkTheme ? "mt-1 truncate text-slate-200" : "mt-1 truncate text-slate-800";
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
      <div ref={valueRef} className={valueClassName ?? defaultValueClassName}>{value}</div>
      {isValueTruncated ? (
        <div className={tooltipClassName} role="tooltip">
          <div className={isDarkTheme ? "text-slate-500" : "text-slate-400"}>{label}</div>
          <div className="mt-1 whitespace-normal break-words">{value}</div>
        </div>
      ) : null}
    </div>
  );
}
