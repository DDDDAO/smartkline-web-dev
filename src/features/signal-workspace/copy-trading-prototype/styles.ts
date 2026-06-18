import type { PrototypeStrategyStatus } from "./types";

export function getPrimaryButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "inline-flex min-h-10 items-center justify-center rounded-2xl bg-sky-400 px-4 text-sm font-black text-slate-950 shadow-sm transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-45"
    : "inline-flex min-h-10 items-center justify-center rounded-2xl bg-[#16AFF5] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#008DCC] disabled:cursor-not-allowed disabled:opacity-45";
}

export function getExchangeResourceLinkClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "inline-flex h-9 min-w-[74px] items-center justify-center gap-1.5 rounded-xl border border-white/[0.075] bg-white/[0.08] px-3 text-xs font-black text-slate-200 transition hover:border-sky-300/25 hover:bg-white/[0.12] hover:text-slate-50"
    : "inline-flex h-9 min-w-[74px] items-center justify-center gap-1.5 rounded-xl border border-[#D5E4EF] bg-[#F8FAFC] px-3 text-xs font-black text-slate-700 shadow-sm transition hover:border-[#BFE7FB] hover:bg-white hover:text-slate-950";
}

export function getWhitelistCopyButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/[0.085] bg-white/[0.04] text-slate-300 transition hover:border-sky-300/25 hover:bg-white/[0.08] hover:text-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
    : "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#D5E4EF] bg-white text-slate-500 shadow-sm transition hover:border-[#BFE7FB] hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45";
}

export function getModalSectionClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-[24px] border border-white/[0.075] bg-white/[0.035] p-4"
    : "rounded-[24px] border border-[#E5EAF0] bg-white p-4 shadow-sm";
}

export function getErrorPanelClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "whitespace-pre-line break-words rounded-[24px] border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100"
    : "whitespace-pre-line break-words rounded-[24px] border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-700";
}

export function getInlineErrorClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "mt-3 whitespace-pre-line break-words text-xs leading-5 text-rose-200"
    : "mt-3 whitespace-pre-line break-words text-xs leading-5 text-rose-700";
}

export function getExchangeButtonClassName(isDarkTheme: boolean, enabled: boolean, isSelected: boolean): string {
  if (enabled && isSelected) {
    return isDarkTheme
      ? "flex min-w-[220px] items-center gap-3 rounded-2xl lg:w-full border border-sky-400/30 bg-sky-400/10 px-3 py-3 text-left text-sky-100 shadow-[0_0_0_3px_rgba(56,189,248,0.10)]"
      : "flex min-w-[220px] items-center gap-3 rounded-2xl lg:w-full border border-[#B7E8FC] bg-[#EAF8FE] px-3 py-3 text-left text-[#007DB8] shadow-[0_0_0_3px_rgba(22,175,245,0.10)]";
  }

  if (enabled) {
    return isDarkTheme
      ? "flex min-w-[220px] items-center gap-3 rounded-2xl lg:w-full border border-transparent px-3 py-3 text-left text-slate-300 transition hover:border-white/[0.075] hover:bg-white/[0.055]"
      : "flex min-w-[220px] items-center gap-3 rounded-2xl lg:w-full border border-transparent px-3 py-3 text-left text-slate-700 transition hover:border-[#E5EAF0] hover:bg-white";
  }

  return isDarkTheme
    ? "flex min-w-[220px] cursor-not-allowed items-center gap-3 rounded-2xl lg:w-full border border-transparent px-3 py-3 text-left text-slate-500 opacity-55"
    : "flex min-w-[220px] cursor-not-allowed items-center gap-3 rounded-2xl lg:w-full border border-transparent px-3 py-3 text-left text-slate-500 opacity-60";
}

export function getAccountCenterTabButtonClassName(isDarkTheme: boolean, isActive: boolean): string {
  const baseClassName = "flex min-w-0 flex-col items-start rounded-2xl px-4 py-3 text-left transition";
  if (isActive) {
    return isDarkTheme
      ? `${baseClassName} border border-sky-400/25 bg-sky-400/10 text-sky-100 shadow-[0_0_0_3px_rgba(56,189,248,0.08)]`
      : `${baseClassName} border border-[#B7E8FC] bg-white text-[#007DB8] shadow-sm`;
  }

  return isDarkTheme
    ? `${baseClassName} border border-transparent text-slate-400 hover:border-white/[0.075] hover:bg-white/[0.055] hover:text-slate-100`
    : `${baseClassName} border border-transparent text-slate-500 hover:border-[#D5E4EF] hover:bg-white hover:text-slate-900`;
}

export function getNotificationConfigureButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-white/[0.075] bg-white/[0.04] px-4 text-sm font-black text-slate-200 shadow-sm transition hover:border-sky-300/25 hover:bg-white/[0.08] hover:text-slate-50"
    : "inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#D5E4EF] bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-[#BFE7FB] hover:bg-[#F4FBFF] hover:text-slate-950";
}

export function getNotificationSaveButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[#D97955] px-4 text-sm font-black text-slate-950 shadow-sm transition hover:bg-[#E08A67] disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[#C95F3F] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#B95034] disabled:cursor-not-allowed disabled:opacity-60";
}

export function getNotificationUnavailableBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "shrink-0 rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-black text-amber-300"
    : "shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700";
}

export function getNotificationModalIconClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/[0.075] bg-white/[0.035] text-slate-100"
    : "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#E5EAF0] bg-[#FAFBFD] text-slate-950";
}

export function getNotificationIconClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/[0.075] bg-white/[0.035] text-base"
    : "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#E5EAF0] bg-[#FAFBFD] text-base";
}

export function getSoftButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-white/[0.075] bg-white/[0.04] px-3 text-xs font-black text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
    : "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[#D5E4EF] bg-white px-3 text-xs font-black text-slate-700 transition hover:border-[#BFE7FB] hover:bg-[#F4FBFF] hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-45";
}

export function getDangerButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "inline-flex min-h-9 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 text-xs font-black text-rose-200 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-45"
    : "inline-flex min-h-9 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 px-3 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45";
}

export function getIconButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.075] bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50"
    : "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#E5EAF0] bg-white text-slate-500 transition hover:border-[#BFE7FB] hover:text-slate-900";
}

export function getLabelClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "text-xs font-black text-slate-300" : "text-xs font-black text-slate-700";
}

export function getStrategyTypeOptionClassName(isDarkTheme: boolean, isSelected: boolean): string {
  if (isSelected) {
    return isDarkTheme
      ? "rounded-2xl border border-sky-400/30 bg-sky-400/10 px-3 py-3 text-left text-sky-100 shadow-[0_0_0_3px_rgba(56,189,248,0.10)]"
      : "rounded-2xl border border-[#B7E8FC] bg-[#EAF8FE] px-3 py-3 text-left text-[#007DB8] shadow-[0_0_0_3px_rgba(22,175,245,0.10)]";
  }

  return isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-left text-slate-200 transition hover:bg-white/[0.055]"
    : "rounded-2xl border border-[#E5EAF0] bg-white px-3 py-3 text-left text-slate-900 transition hover:border-[#BFE7FB] hover:bg-[#F4FBFF]";
}

export function getStrategyStatusClassName(isDarkTheme: boolean, status: PrototypeStrategyStatus): string {
  if (status === "running") {
    return isDarkTheme ? "shrink-0 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black text-emerald-300" : "shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700";
  }
  if (status === "paused") {
    return isDarkTheme ? "shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-black text-amber-300" : "shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700";
  }
  if (status === "pending") {
    return isDarkTheme ? "shrink-0 rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-black text-sky-300" : "shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-700";
  }
  if (status === "failed") {
    return isDarkTheme ? "shrink-0 rounded-full bg-rose-400/15 px-2 py-0.5 text-[10px] font-black text-rose-300" : "shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700";
  }
  return isDarkTheme ? "shrink-0 rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-black text-slate-300" : "shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600";
}
