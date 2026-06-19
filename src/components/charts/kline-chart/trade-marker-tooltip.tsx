import type { CSSProperties } from "react";
import type { WorkspaceLanguage } from "@/i18n/workspace";
import type { ChartTheme } from "./types";
import { KLINE_PRICE_FORMAT } from "./series-data";
import type { KlineTradePointMarker } from "./trade-point-primitive";

export type TradeMarkerTooltipState = {
  containerHeight: number;
  containerWidth: number;
  marker: KlineTradePointMarker;
  x: number;
  y: number;
};

export function createTradeMarkerLookup(markers: readonly KlineTradePointMarker[]): ReadonlyMap<string, KlineTradePointMarker> {
  if (markers.length === 0) {
    return new Map();
  }

  return new Map(markers.map((marker) => [marker.id, marker]));
}

export function areTradeMarkerTooltipsEqual(
  left: TradeMarkerTooltipState | null,
  right: TradeMarkerTooltipState | null,
): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.marker.id === right.marker.id
    && left.containerHeight === right.containerHeight
    && left.containerWidth === right.containerWidth
    && Math.round(left.x) === Math.round(right.x)
    && Math.round(left.y) === Math.round(right.y);
}

export function TradeMarkerTooltip({
  language,
  marker,
  style,
  theme,
}: {
  language: WorkspaceLanguage;
  marker: KlineTradePointMarker;
  style: CSSProperties;
  theme: ChartTheme;
}) {
  const isDarkTheme = theme === "dark";
  const sideLabel = formatTradeMarkerSide(marker.side, language);
  const actionLabel = formatTradeMarkerAction(marker, language);
  const directionLabel = marker.direction ? formatTradeMarkerDirection(marker.direction, language) : null;
  const avatarStyle = marker.avatarUrl ? { backgroundImage: `url("${marker.avatarUrl}")` } : undefined;
  const shellClassName = isDarkTheme
    ? "pointer-events-none absolute z-50 w-[264px] rounded-2xl border border-white/[0.10] bg-[#181A20]/96 p-3 text-slate-100 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl"
    : "pointer-events-none absolute z-50 w-[264px] rounded-2xl border border-[#E8E8EC] bg-white/96 p-3 text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.16)] backdrop-blur-xl";
  const mutedClassName = isDarkTheme ? "text-slate-400" : "text-slate-500";

  return (
    <div className={shellClassName} style={style}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={getTradeMarkerTooltipAvatarClassName(isDarkTheme, marker.side)}>
          <span className="block h-full w-full bg-cover bg-center" style={avatarStyle}>
            {!marker.avatarUrl ? getTradeMarkerInitial(marker) : null}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-black">{marker.traderName ?? marker.title}</div>
          <div className={`mt-0.5 truncate text-[10px] font-medium ${mutedClassName}`}>{marker.occurredAtText ?? "--"}</div>
        </div>
        <span className={getTradeMarkerTooltipSideClassName(isDarkTheme, marker.side)}>{sideLabel}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={getTradeMarkerTooltipActionClassName(isDarkTheme)}>{actionLabel}</span>
        {directionLabel ? <span className={getTradeMarkerTooltipDirectionClassName(isDarkTheme, marker.direction)}>{directionLabel}</span> : null}
        <span className={isDarkTheme ? "text-[10px] font-bold text-slate-300" : "text-[10px] font-bold text-slate-600"}>{String(marker.symbol)}</span>
      </div>
      <div className={`mt-2 text-[11px] leading-4 ${mutedClassName}`}>
        {formatTradeMarkerPriceLabel(language)} {formatTradeMarkerPrice(marker)}
      </div>
      {marker.detail ? (
        <p className={isDarkTheme ? "mt-2 max-h-12 overflow-hidden text-[11px] leading-4 text-slate-300" : "mt-2 max-h-12 overflow-hidden text-[11px] leading-4 text-slate-600"}>
          {marker.detail}
        </p>
      ) : null}
    </div>
  );
}

export function createTradeMarkerTooltipStyle(tooltip: TradeMarkerTooltipState): CSSProperties {
  const xOffset = tooltip.containerWidth > 0 && tooltip.x > tooltip.containerWidth - 286 ? "calc(-100% - 12px)" : "12px";
  const yOffset = tooltip.containerHeight > 0 && tooltip.y > tooltip.containerHeight - 170 ? "calc(-100% - 12px)" : "12px";

  return {
    left: Math.round(tooltip.x),
    top: Math.round(tooltip.y),
    transform: `translate(${xOffset}, ${yOffset})`,
  };
}

function formatTradeMarkerSide(side: "buy" | "sell", language: WorkspaceLanguage): string {
  if (language === "en-US") {
    return side === "buy" ? "Buy" : "Sell";
  }

  return side === "buy" ? "买入" : "卖出";
}

function formatTradeMarkerDirection(direction: "long" | "short", language: WorkspaceLanguage): string {
  if (language === "en-US") {
    return direction === "long" ? "Long" : "Short";
  }

  return direction === "long" ? "多" : "空";
}

function formatTradeMarkerAction(marker: KlineTradePointMarker, language: WorkspaceLanguage): string {
  if (marker.actionLabel === "BUY" || marker.actionLabel === "SELL") {
    return marker.actionLabel;
  }

  if (!marker.eventType || language !== "en-US") {
    return marker.actionLabel ?? marker.title;
  }

  const labels: Record<NonNullable<KlineTradePointMarker["eventType"]>, string> = {
    add: "Add",
    close: "Close",
    losing_streak: "Losing streak",
    open: "Open",
    oversized_position: "Oversized",
    reduce: "Reduce",
    reverse: "Reverse",
    stop_loss: "Stop loss",
    take_profit: "Take profit",
    trailing_stop: "Trailing stop",
  };
  return labels[marker.eventType] ?? marker.actionLabel ?? marker.title;
}

function formatTradeMarkerPriceLabel(language: WorkspaceLanguage): string {
  return language === "en-US" ? "Price" : "价格";
}

function formatTradeMarkerPrice(marker: KlineTradePointMarker): string {
  if (marker.priceText) {
    return marker.priceText;
  }

  return marker.price !== null && Number.isFinite(marker.price)
    ? KLINE_PRICE_FORMAT.formatter(marker.price)
    : "--";
}

function getTradeMarkerInitial(marker: KlineTradePointMarker): string {
  const value = marker.traderName ?? marker.title;
  return Array.from(value.trim().replace(/\s+/gu, ""))[0]?.toUpperCase() ?? "S";
}

function getTradeMarkerTooltipAvatarClassName(isDarkTheme: boolean, side: "buy" | "sell"): string {
  const sideClassName = side === "buy" ? "border-emerald-400" : "border-rose-400";
  const themeClassName = isDarkTheme ? "bg-slate-800 text-slate-50" : "bg-indigo-100 text-indigo-700";
  return `grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border-2 ${sideClassName} ${themeClassName} text-xs font-black`;
}

function getTradeMarkerTooltipSideClassName(isDarkTheme: boolean, side: "buy" | "sell"): string {
  if (side === "buy") {
    return isDarkTheme
      ? "rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black text-emerald-200"
      : "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700";
  }

  return isDarkTheme
    ? "rounded-full bg-rose-400/15 px-2 py-0.5 text-[10px] font-black text-rose-200"
    : "rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700";
}

function getTradeMarkerTooltipActionClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-slate-200"
    : "rounded-full border border-[#E8E8EC] bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-bold text-slate-700";
}

function getTradeMarkerTooltipDirectionClassName(isDarkTheme: boolean, direction: "long" | "short" | undefined): string {
  if (direction === "long") {
    return isDarkTheme
      ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-300"
      : "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700";
  }

  return isDarkTheme
    ? "rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-black text-rose-300"
    : "rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700";
}
