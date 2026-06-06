"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { KolSignalSourceStatus } from "./types";
import { getResolvedKolAvatarUrl } from "@/app/_lib/kol-avatar";
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

export function SymbolIcon({ symbol }: { symbol: string }) {
  const symbolName = symbol.replace("/USDT:USDT", "").replace("USDT", "");
  const label = getSymbolIconGlyph(symbolName);
  const style = createAvatarFallbackStyle(symbolName);

  return (
    <span
      aria-hidden="true"
      className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-black text-white"
      style={style}
    >
      {label}
    </span>
  );
}

function getSymbolIconGlyph(symbol: string): string {
  const symbolName = symbol.toUpperCase();
  const glyphs: Record<string, string> = {
    BTC: "B",
    ETH: "E",
    SOL: "S",
    BNB: "N",
    XRP: "X",
    DOGE: "D",
    ADA: "A",
    AVAX: "V",
    LINK: "L",
    TON: "T",
  };

  return glyphs[symbolName] ?? (symbolName.slice(0, 1) || "?");
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
  isDarkTheme,
  signal,
}: {
  isDarkTheme: boolean;
  signal: StructuredSignal;
}) {
  const messageTime = formatTelegramMessageDateTime(signal.created_at);
  const telegramChannelLabel = "Telegram \u7FA4\u6D88\u606F";
  const traceableLabel = "\u539F\u59CB\u4FE1\u6E90 \u00B7 \u53EF\u8FFD\u6EAF";
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
            <div className={headerMetaClassName}>{telegramChannelLabel} {String.fromCharCode(0x00B7)} {messageTime}</div>
          </div>
          <span className={sourceTypeClassName}>{signal.source_type}</span>
        </div>

        <div className={bubbleClassName}>
          <div className="whitespace-pre-wrap text-xs leading-5">{signal.raw_text}</div>
          <div className={traceMetaClassName}>
            <span>{traceableLabel}</span>
            <span className="font-bold text-[#00A6F4]">{String.fromCharCode(0x2713, 0x2713)}</span>
          </div>
        </div>
      </div>
    </div>
  );
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

export function KolSignalSourceNotice({
  isDarkTheme,
  signalCount,
  status,
}: {
  isDarkTheme: boolean;
  signalCount: number;
  status: KolSignalSourceStatus;
}) {
  if (status.error) {
    const message = signalCount > 0
      ? "KOL 信源实时连接异常，当前展示最近一次成功加载的数据。"
      : "KOL 信源接口请求失败，当前没有展示备用样例。请检查 API 域名、HTTPS 连接和 CORS 配置。";

    return (
      <div className={isDarkTheme ? "rounded-2xl border border-rose-900/70 bg-rose-950/40 p-3 text-xs leading-5 text-rose-200" : "rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700"}>
        {message}错误：{status.error}
      </div>
    );
  }

  if (status.isLoading) {
    return (
      <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3 text-xs text-slate-400" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3 text-xs text-slate-500"}>
        正在加载 KOL 信源接口…
      </div>
    );
  }

  if (signalCount === 0) {
    return (
      <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3 text-xs text-slate-400" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3 text-xs text-slate-500"}>
        当前接口没有返回 KOL 信号。
      </div>
    );
  }

  return null;
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
