import type { NextRequest } from "next/server";
import {
  createLoggedInAuthMeResponse,
  createLoggedOutAuthMeResponse,
  type TelegramAuthMeResponse,
  type TelegramAuthSession,
} from "@/lib/auth/telegram-auth";

const DEFAULT_BACKEND_API_BASE_URL = "https://api.smartkline.com";

export type BackendAuthMeResponse =
  | {
      isLoggedIn: false;
      user: null;
      roles: string[];
      referral: null;
    }
  | {
      isLoggedIn: true;
      user: {
        id: string;
        status: string;
        customerTier: string;
        telegram: {
          avatarUrl?: string;
          id?: string;
          name?: string;
          username?: string;
        } | null;
      };
      roles: string[];
      referral: {
        dashboardAccess: boolean;
        personalCode: string | null;
        planCode: string;
        tier: string;
      };
    };

export type BackendAwareAuthMeResponse = TelegramAuthMeResponse & {
  backendUserId?: string;
  customerTier?: string;
  referral?: BackendAuthMeResponse["referral"];
  roles?: string[];
};

export class BackendAuthProxyError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "BackendAuthProxyError";
  }
}

export function createBackendAuthUrl(path: string): URL {
  return new URL(path.replace(/^\/+/, ""), `${resolveBackendApiBaseUrl()}/`);
}

export function createBackendRequestHeaders(request: NextRequest): Headers {
  return createCookieForwardingHeaders(request);
}

export async function fetchBackendAuthMe(request: NextRequest): Promise<BackendAuthMeResponse> {
  const response = await fetch(createBackendAuthUrl("/auth/me"), {
    cache: "no-store",
    headers: createCookieForwardingHeaders(request),
  });

  if (!response.ok) {
    throw new BackendAuthProxyError("Backend auth session lookup failed.", response.status);
  }

  return await response.json() as BackendAuthMeResponse;
}

export async function fetchBackendLogout(request: NextRequest): Promise<Response> {
  return await fetch(createBackendAuthUrl("/auth/logout"), {
    cache: "no-store",
    headers: createCookieForwardingHeaders(request),
    method: "POST",
  });
}

export async function requireBackendAuthSession(request: NextRequest): Promise<TelegramAuthSession> {
  const authMe = await fetchBackendAuthMe(request);

  if (!authMe.isLoggedIn) {
    throw new BackendAuthProxyError("Authentication required.", 401);
  }

  return mapBackendAuthMeToTelegramSession(authMe);
}

export function mapBackendAuthMeResponse(authMe: BackendAuthMeResponse): BackendAwareAuthMeResponse {
  if (!authMe.isLoggedIn) {
    return createLoggedOutAuthMeResponse();
  }

  return {
    ...createLoggedInAuthMeResponse(mapBackendAuthMeToTelegramSession(authMe)),
    backendUserId: authMe.user.id,
    customerTier: authMe.user.customerTier,
    referral: authMe.referral,
    roles: authMe.roles,
  };
}

export function appendBackendSetCookieHeaders(response: Response, targetHeaders: Headers): void {
  for (const setCookie of readSetCookieHeaders(response.headers)) {
    targetHeaders.append("Set-Cookie", setCookie);
  }
}

function mapBackendAuthMeToTelegramSession(authMe: Extract<BackendAuthMeResponse, { isLoggedIn: true }>): TelegramAuthSession {
  const telegram = authMe.user.telegram;
  const telegramScopedId = telegram?.id ? `telegram:${telegram.id}` : authMe.user.id;

  return {
    provider: "telegram",
    user: {
      avatarUrl: telegram?.avatarUrl,
      id: telegramScopedId,
      name: telegram?.name,
      telegramId: telegram?.id,
      username: telegram?.username,
    },
  };
}

function createCookieForwardingHeaders(request: NextRequest): Headers {
  const headers = new Headers({ Accept: "application/json" });
  const cookieHeader = request.headers.get("cookie");

  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  return headers;
}

function readSetCookieHeaders(headers: Headers): string[] {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (getSetCookie) {
    return getSetCookie.call(headers);
  }

  const singleHeader = headers.get("set-cookie");
  return singleHeader ? [singleHeader] : [];
}

function resolveBackendApiBaseUrl(): string {
  const rawBaseUrl = process.env.SMARTKLINE_BACKEND_API_BASE_URL?.trim() || DEFAULT_BACKEND_API_BASE_URL;
  return new URL(rawBaseUrl).toString().replace(/\/$/u, "");
}
