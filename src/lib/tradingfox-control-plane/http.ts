import { createHash } from "node:crypto";
import type { TelegramAuthSession } from "@/lib/auth/telegram-auth";
import { TradingFoxApiError, TradingFoxConfigError } from "./types";
import { isRecord, stringValue } from "./value-utils";

const DEFAULT_TRADINGFOX_CONTROL_PLANE_API_BASE_URL = "https://api.smartkline.com/tradingfox-trader";

export function tradingFoxUserIdFromSession(session: TelegramAuthSession): number {
  const telegramId = session.user.telegramId;
  if (telegramId && /^\d+$/u.test(telegramId)) {
    const numericTelegramId = Number(telegramId);
    if (Number.isSafeInteger(numericTelegramId) && numericTelegramId > 0) {
      return numericTelegramId;
    }
  }

  const hash = createHash("sha256").update(session.user.id).digest();
  return hash.readUInt32BE(0) || 1;
}

export async function settleTradingFoxRequest<T>(path: string): Promise<{ error?: string; value?: T }> {
  try {
    return { value: await tradingFoxRequest<T>(path) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "TradingFox request failed." };
  }
}

export function settledTradingFoxSkipped<T>(): Promise<{ error?: string; value?: T }> {
  return Promise.resolve({});
}

export async function tradingFoxRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = resolveTradingFoxConfig();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${config.authToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildTradingFoxControlPlaneUrl(path, config.baseUrl), {
    ...init,
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    throw new TradingFoxApiError(await readTradingFoxError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return await response.json() as T;
}

function buildTradingFoxControlPlaneUrl(path: string, baseUrl: string): URL {
  return new URL(path.replace(/^\/+/u, ""), baseUrl);
}

function resolveTradingFoxConfig() {
  const baseUrl = (process.env.TRADINGFOX_CONTROL_PLANE_API_BASE_URL ?? DEFAULT_TRADINGFOX_CONTROL_PLANE_API_BASE_URL).trim();
  const authToken = process.env.TRADINGFOX_CONTROL_PLANE_AUTH_TOKEN?.trim();

  if (!authToken) {
    throw new TradingFoxConfigError("TRADINGFOX_CONTROL_PLANE_AUTH_TOKEN is not configured on the Next.js server.");
  }

  return {
    authToken,
    baseUrl: baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
  };
}

async function readTradingFoxError(response: Response): Promise<string> {
  try {
    const payload = await response.json() as unknown;
    if (isRecord(payload)) {
      const nestedError = isRecord(payload.error) ? payload.error : null;
      return stringValue(nestedError?.message) || stringValue(payload.message) || stringValue(payload.error) || `TradingFox request failed with status ${response.status}.`;
    }
  } catch {
    // Fall through to generic status text.
  }
  return response.statusText || `TradingFox request failed with status ${response.status}.`;
}
