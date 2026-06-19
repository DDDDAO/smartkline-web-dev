import type { CopyTradingDirection } from "@/types/copy-trading";

import type { PnlColorMode } from "./helpers";

export function getTopSignalCardClassName(isDarkTheme: boolean, isActive: boolean, tone: "live" | "muted" | "pending"): string {
  const surfaceClassName = isDarkTheme ? "signal-card-surface-dark" : "signal-card-surface-light";
  const toneClassName = tone === "live" ? "signal-card-left-live" : tone === "pending" ? "signal-card-left-pending" : "signal-card-left-muted";
  const activeClassName = isActive ? " signal-card-left-active" : "";
  const baseClassName = "relative w-full cursor-pointer overflow-hidden rounded-[18px] border p-3.5 text-left transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5";

  if (isActive) {
    const activeThemeClassName = isDarkTheme
      ? "border-white/[0.12] bg-white/[0.055] shadow-[0_5px_14px_rgba(0,0,0,0.14)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.18)]"
      : "border-[#D4D4D8] bg-white shadow-[0_4px_12px_rgba(15,23,42,0.05)] hover:shadow-[0_5px_14px_rgba(15,23,42,0.07)]";
    return `${baseClassName} ${surfaceClassName} ${activeThemeClassName} signal-card-left-status ${toneClassName}${activeClassName}`;
  }

  const defaultThemeClassName = isDarkTheme
    ? "border-white/[0.075] bg-white/[0.035] hover:border-white/[0.12] hover:shadow-[0_5px_14px_rgba(0,0,0,0.18)]"
    : "border-[#E8E8EC] bg-white hover:border-[#D4D4D8] hover:shadow-[0_5px_14px_rgba(15,23,42,0.07)]";

  return `${baseClassName} ${surfaceClassName} ${defaultThemeClassName} signal-card-left-status ${toneClassName}${activeClassName}`;
}

export function getTopSignalCardBackClassName(isDarkTheme: boolean): string {
  const surfaceClassName = isDarkTheme ? "signal-card-surface-dark" : "signal-card-surface-light";
  const themeClassName = isDarkTheme
    ? "w-full rounded-[18px] border border-white/[0.075] bg-[#181A20] p-3.5"
    : "w-full rounded-[18px] border border-[#E8E8EC] bg-white p-3.5";

  return `${themeClassName} signal-card-left-status ${surfaceClassName} signal-card-left-live`;
}

export function getTopSignalStateCardClassName(isDarkTheme: boolean, tone: "loading" | "pending" | "risk"): string {
  const surfaceClassName = isDarkTheme ? "signal-card-surface-dark" : "signal-card-surface-light";
  const toneClassName = tone === "loading" ? "signal-card-left-loading" : tone === "risk" ? "signal-card-left-risk" : "signal-card-left-pending";
  const baseClassName = "signal-card-left-status relative w-full overflow-hidden rounded-[18px] border p-3.5 text-left";
  const themeClassName = isDarkTheme
    ? "border-white/[0.075] bg-white/[0.035]"
    : "border-[#E8E8EC] bg-white";

  return `${baseClassName} ${surfaceClassName} ${themeClassName} ${toneClassName}`;
}

export function getStatusBadgeClassName(isDarkTheme: boolean, tone: "live" | "loading" | "risk"): string {
  if (tone === "risk") {
    return isDarkTheme ? "rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-200" : "rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700";
  }

  if (tone === "loading") {
    return isDarkTheme ? "rounded-full bg-indigo-400/15 px-2 py-0.5 text-[10px] font-bold text-indigo-200" : "rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold text-[#4F46E5]";
  }

  return isDarkTheme ? "rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200" : "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700";
}

export function getDirectionBadgeClassName(isDarkTheme: boolean, direction: CopyTradingDirection): string {
  if (direction === "long") {
    return isDarkTheme ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-300" : "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700";
  }

  return isDarkTheme ? "rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-black text-rose-300" : "rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700";
}

export function getNeutralBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-1 text-slate-200"
    : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700";
}

export function getPnlClassName(isDarkTheme: boolean, value: number | null, pnlColorMode: PnlColorMode): string {
  if (value !== null && value > 0) {
    return getPositivePnlTextClassName(isDarkTheme, pnlColorMode, "text-xs");
  }

  if (value !== null && value < 0) {
    return getNegativePnlTextClassName(isDarkTheme, pnlColorMode, "text-xs");
  }

  return isDarkTheme ? "text-xs font-black text-slate-300" : "text-xs font-black text-slate-600";
}

export function getPnlFieldClassName(isDarkTheme: boolean, value: number | null, pnlColorMode: PnlColorMode): string {
  if (value !== null && value > 0) {
    return getPositivePnlTextClassName(isDarkTheme, pnlColorMode, "mt-1 truncate");
  }

  if (value !== null && value < 0) {
    return getNegativePnlTextClassName(isDarkTheme, pnlColorMode, "mt-1 truncate");
  }

  return isDarkTheme ? "mt-1 truncate text-slate-200" : "mt-1 truncate text-slate-800";
}

export function getPnlRatioClassName(isDarkTheme: boolean, value: number | null, pnlColorMode: PnlColorMode): string {
  if (value !== null && value > 0) {
    return getPositivePnlTextClassName(isDarkTheme, pnlColorMode, "mt-1 text-[10px]");
  }

  if (value !== null && value < 0) {
    return getNegativePnlTextClassName(isDarkTheme, pnlColorMode, "mt-1 text-[10px]");
  }

  return isDarkTheme ? "mt-1 text-[10px] text-slate-500" : "mt-1 text-[10px] text-slate-400";
}

export function getPositivePnlTextClassName(isDarkTheme: boolean, pnlColorMode: PnlColorMode, prefixClassName: string): string {
  const colorClassName = pnlColorMode === "positiveGreen"
    ? isDarkTheme ? "text-emerald-300" : "text-emerald-600"
    : isDarkTheme ? "text-rose-300" : "text-rose-600";

  return `${prefixClassName} font-black ${colorClassName}`;
}

export function getNegativePnlTextClassName(isDarkTheme: boolean, pnlColorMode: PnlColorMode, prefixClassName: string): string {
  const colorClassName = pnlColorMode === "positiveGreen"
    ? isDarkTheme ? "text-rose-300" : "text-rose-600"
    : isDarkTheme ? "text-emerald-300" : "text-emerald-600";

  return `${prefixClassName} font-black ${colorClassName}`;
}
