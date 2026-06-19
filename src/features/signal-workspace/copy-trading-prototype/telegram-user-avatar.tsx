import type { TelegramSessionUser } from "@/lib/auth/telegram-auth";

export function TelegramUserAvatar({
  isDarkTheme,
  size,
  user,
}: {
  isDarkTheme: boolean;
  size: "compact" | "large" | "table";
  user: TelegramSessionUser | null;
}) {
  const baseClassName = size === "large"
    ? "grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-cover bg-center text-sm font-black"
    : size === "table"
      ? "grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-cover bg-center text-xs font-black"
      : "grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-cover bg-center text-[10px] font-black sm:h-8 sm:w-8 sm:text-[11px]";
  const colorClassName = isDarkTheme
    ? "bg-indigo-400/15 text-indigo-200"
    : "bg-[#EEF2FF] text-[#4F46E5]";
  const avatarStyle = user?.avatarUrl ? { backgroundImage: `url("${user.avatarUrl}")` } : undefined;

  return (
    <span
      aria-hidden="true"
      className={`${baseClassName} ${colorClassName}`}
      style={avatarStyle}
    >
      {user?.avatarUrl ? null : getTelegramUserInitials(user)}
    </span>
  );
}

export function getTelegramUserDisplayName(user: TelegramSessionUser | null, fallback: string): string {
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
