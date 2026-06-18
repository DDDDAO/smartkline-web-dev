import type { TelegramAuthMeResponse } from "@/app/_lib/auth/telegram-auth";
import type { TradingFoxAccountResponse, TradingFoxConnector } from "@/app/_lib/tradingfox-control-plane";
import { getAppLocaleFromPathname, replacePathnameLocale, type AppLocale } from "@/i18n/locales";

const ACCOUNT_MANAGEMENT_ROUTE = "/account";

export const LOGGED_OUT_AUTH_ME: TelegramAuthMeResponse = {
  botBinding: "unbound",
  communityBinding: "unverified",
  isLoggedIn: false,
  notificationPermission: "none",
  sourceBindingCount: 0,
  telegramUser: null,
};

export type ApiKeySyncStatus = {
  label: string;
  tone: "bound" | "error" | "loading" | "unbound";
  title: string;
};

export async function requestAuthMe(): Promise<TelegramAuthMeResponse> {
  const response = await fetch("/api/auth/me", {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Unable to load auth session.");
  }

  return await response.json() as TelegramAuthMeResponse;
}

export async function requestTradingFoxAccount(): Promise<TradingFoxAccountResponse> {
  const response = await fetch("/api/tradingfox/account", {
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(errorPayload?.error || `TradingFox request failed with status ${response.status}.`);
  }

  return await response.json() as TradingFoxAccountResponse;
}

export function selectPrimaryConnector(account: TradingFoxAccountResponse): TradingFoxConnector | null {
  return account.connector ?? account.connectors[0] ?? null;
}

export function getApiKeySyncStatus(input: {
  connector: TradingFoxConnector | null;
  error: string;
  isAccountLoading: boolean;
  isAuthLoading: boolean;
  isLoggedIn: boolean;
}): ApiKeySyncStatus {
  if (input.isAuthLoading || input.isAccountLoading) {
    return {
      label: "同步中",
      tone: "loading",
      title: "正在同步登录和 API Key 绑定状态",
    };
  }

  if (input.error) {
    return {
      label: "同步失败",
      tone: "error",
      title: input.error,
    };
  }

  if (!input.isLoggedIn) {
    return {
      label: "未登录",
      tone: "unbound",
      title: "登录后可切换或绑定 API Key",
    };
  }

  if (!input.connector) {
    return {
      label: "未绑定",
      tone: "unbound",
      title: "当前账号尚未绑定 API Key",
    };
  }

  return {
    label: "已绑定",
    tone: "bound",
    title: `${input.connector.exchangePlatform} · ${input.connector.name}`,
  };
}

export function getAccountManagementPath(locale: AppLocale): string {
  return replacePathnameLocale(ACCOUNT_MANAGEMENT_ROUTE, locale);
}

export function getAccountManagementTarget(input: {
  currentPathname: string;
  isLoggedIn: boolean;
}): string {
  const accountManagementPath = getAccountManagementPath(
    getAppLocaleFromPathname(input.currentPathname),
  );

  if (input.isLoggedIn) {
    return accountManagementPath;
  }

  return `/api/auth/login?redirect=${encodeURIComponent(accountManagementPath)}`;
}
