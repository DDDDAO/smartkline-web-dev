"use client";

import type { TelegramSessionUser } from "@/app/_lib/auth/telegram-auth";
import type { WorkspaceCopy } from "@/i18n/workspace";

export function AccountEntryButton({
  copy,
  isAuthLoading,
  isDarkTheme,
  telegramUser,
  onOpen,
}: {
  copy: WorkspaceCopy;
  isAuthLoading: boolean;
  isDarkTheme: boolean;
  telegramUser: TelegramSessionUser | null;
  onOpen: () => void;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const className = isDarkTheme
    ? "group inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.075] bg-white/[0.035] p-0 text-left text-slate-200 transition hover:bg-white/[0.08] hover:text-slate-50 sm:h-10 sm:w-auto sm:justify-start sm:gap-2 sm:py-1 sm:pl-1 sm:pr-3"
    : "group inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D5E4EF] bg-white p-0 text-left text-slate-700 shadow-sm transition hover:border-[#BFE7FB] hover:bg-[#F4FBFF] hover:text-slate-950 sm:h-10 sm:w-auto sm:justify-start sm:gap-2 sm:py-1 sm:pl-1 sm:pr-3";

  return (
    <button aria-label={accountCopy.drawer.openAccount} className={className} type="button" onClick={onOpen}>
      <TelegramUserAvatar
        isDarkTheme={isDarkTheme}
        user={telegramUser}
      />
      <span className="hidden min-w-0 sm:block">
        <span className="block max-w-[112px] truncate text-xs font-black leading-tight">
          {isAuthLoading ? accountCopy.user.loading : getTelegramUserDisplayName(telegramUser, accountCopy.user.loginAction)}
        </span>
        <span className={isDarkTheme ? "block max-w-[112px] truncate text-[10px] font-bold leading-tight text-slate-500" : "block max-w-[112px] truncate text-[10px] font-bold leading-tight text-slate-500"}>
          {telegramUser?.username ? `@${telegramUser.username}` : accountCopy.user.demoSubtitle}
        </span>
      </span>
    </button>
  );
}

function TelegramUserAvatar({
  isDarkTheme,
  user,
}: {
  isDarkTheme: boolean;
  user: TelegramSessionUser | null;
}) {
  const colorClassName = isDarkTheme
    ? "bg-sky-400/15 text-sky-200"
    : "bg-[#EAF8FE] text-[#008DCC]";
  const avatarStyle = user?.avatarUrl ? { backgroundImage: `url("${user.avatarUrl}")` } : undefined;

  return (
    <span
      aria-hidden="true"
      className={`grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-cover bg-center text-[10px] font-black sm:h-8 sm:w-8 sm:text-[11px] ${colorClassName}`}
      style={avatarStyle}
    >
      {user?.avatarUrl ? null : getTelegramUserInitials(user)}
    </span>
  );
}

function getTelegramUserDisplayName(user: TelegramSessionUser | null, fallback: string): string {
  return user?.username ? `@${user.username}` : (user?.name ?? fallback);
}

function getTelegramUserInitials(user: TelegramSessionUser | null): string {
  const label = user?.username ?? user?.name ?? "SK";
  const letters = label
    .replace(/^@/u, "")
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return letters || "SK";
}
