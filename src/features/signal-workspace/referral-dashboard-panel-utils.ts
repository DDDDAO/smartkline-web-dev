import type { WorkspaceLanguage } from "@/i18n/workspace";

export function formatRate(rateBps: number): string {
  return `${(rateBps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

export function formatMoney(amount: string, currency: string): string {
  const numericAmount = Number(amount);
  const formattedAmount = Number.isFinite(numericAmount)
    ? numericAmount.toLocaleString("en-US", { maximumFractionDigits: 8 })
    : amount;
  return `${formattedAmount} ${currency}`;
}

export function formatDate(value: string, language: WorkspaceLanguage): string {
  return new Date(value).toLocaleString(language === "zh-CN" ? "zh-CN" : "en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}

export function createSmartKlineInviteUrl(personalCode: string, language: WorkspaceLanguage): string {
  const url = new URL("/api/referral/invite", window.location.origin);
  url.searchParams.set("ref", personalCode);
  url.searchParams.set("redirect", `/${language === "en-US" ? "en" : "zh"}/referrals`);
  return url.toString();
}

export function getCardClassName(isDarkTheme: boolean, spacing: string): string {
  return isDarkTheme
    ? `gap-0 rounded-[28px] border-white/[0.075] bg-white/[0.035] ${spacing} text-slate-100 shadow-none`
    : `gap-0 rounded-[28px] border-[#E8E8EC] bg-white ${spacing} text-slate-950 shadow-sm`;
}

export function getEyebrowClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "text-xs font-black uppercase tracking-[0.24em] text-indigo-200"
    : "text-xs font-black uppercase tracking-[0.24em] text-[#4F46E5]";
}

export function getMutedTextClassName(isDarkTheme: boolean, className: string): string {
  return `${className} ${isDarkTheme ? "text-slate-400" : "text-slate-600"}`;
}

export function getPrimaryButtonClassName(isDarkTheme: boolean, className = ""): string {
  return isDarkTheme
    ? `${className} rounded-2xl bg-indigo-400 text-slate-950 hover:bg-indigo-300`
    : `${className} rounded-2xl bg-[#6366F1] text-white hover:bg-[#4F46E5]`;
}

export function getSoftButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-2xl border-white/[0.075] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
    : "rounded-2xl border-[#E8E8EC] bg-white text-slate-700 hover:border-[#C7D2FE] hover:bg-[#F5F5FF] hover:text-slate-950";
}

export function getUserBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "flex min-w-0 items-center gap-3 rounded-3xl border border-white/[0.075] bg-white/[0.035] p-3"
    : "flex min-w-0 items-center gap-3 rounded-3xl border border-[#E8E8EC] bg-[#FAFAFA] p-3";
}

export function getPillClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "inline-flex rounded-full border border-indigo-300/20 bg-indigo-300/10 px-3 py-1 text-xs font-black text-indigo-100"
    : "inline-flex rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-3 py-1 text-xs font-black text-[#4F46E5]";
}

export function getInlineMetricClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "flex items-center justify-between rounded-2xl border border-white/[0.075] bg-[#181A20] px-3 py-2 text-sm"
    : "flex items-center justify-between rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 py-2 text-sm";
}

export function getCopyRowClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.075] bg-[#181A20] p-3"
    : "flex min-w-0 items-center gap-3 rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] p-3";
}

export function getListRowClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "flex items-center justify-between gap-3 rounded-2xl border border-white/[0.075] bg-[#181A20] p-3"
    : "flex items-center justify-between gap-3 rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] p-3";
}
