"use client";

import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TelegramSessionUser } from "@/lib/auth/telegram-auth";
import { TelegramUserAvatar, getTelegramUserDisplayName } from "./telegram-user-avatar";

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
        size="compact"
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
