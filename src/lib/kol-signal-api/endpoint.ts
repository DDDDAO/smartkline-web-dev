import {
  CONFIGURED_API_BASE_URL,
  CONFIGURED_INCREMENTAL_ENDPOINT,
  CONFIGURED_MOCK_MODE,
  CONFIGURED_REST_ENDPOINT,
  DEFAULT_REMOTE_API_BASE_URL,
  KOL_SIGNAL_HISTORY_DAYS,
  KOL_SIGNAL_HISTORY_LIMIT,
  KOL_SIGNALS_INCREMENTAL_LIMIT,
  KOL_SIGNALS_INCREMENTAL_PATH,
  KOL_SIGNALS_REST_PATH,
  LOCAL_INCREMENTAL_ENDPOINT,
  LOCAL_REST_ENDPOINT,
} from "./constants";
import type { ResolvedKolSignalEndpoint } from "./types";

export function shouldUseDevMockKolSignals(): boolean {
  if (CONFIGURED_MOCK_MODE === "true") {
    return true;
  }

  if (CONFIGURED_MOCK_MODE === "false") {
    return false;
  }

  return process.env.NODE_ENV === "development" && !CONFIGURED_REST_ENDPOINT && !CONFIGURED_API_BASE_URL;
}

export function resolveKolSignalsEndpoint(): ResolvedKolSignalEndpoint | null {
  if (CONFIGURED_REST_ENDPOINT) {
    return { shouldFallbackOnFailure: false, url: CONFIGURED_REST_ENDPOINT };
  }

  const configuredApiBaseEndpoint = createKolSignalsEndpoint(
    CONFIGURED_API_BASE_URL,
    KOL_SIGNALS_REST_PATH,
    KOL_SIGNAL_HISTORY_LIMIT,
  );
  if (configuredApiBaseEndpoint) {
    return { shouldFallbackOnFailure: false, url: configuredApiBaseEndpoint };
  }

  const localEndpoint = resolveLocalEndpoint(LOCAL_REST_ENDPOINT);
  if (localEndpoint) {
    return { shouldFallbackOnFailure: true, url: localEndpoint };
  }

  const defaultRemoteEndpoint = createKolSignalsEndpoint(
    DEFAULT_REMOTE_API_BASE_URL,
    KOL_SIGNALS_REST_PATH,
    KOL_SIGNAL_HISTORY_LIMIT,
  );
  return defaultRemoteEndpoint ? { shouldFallbackOnFailure: false, url: defaultRemoteEndpoint } : null;
}

export function resolveKolSignalsIncrementalEndpoint(): ResolvedKolSignalEndpoint | null {
  if (CONFIGURED_INCREMENTAL_ENDPOINT) {
    return { shouldFallbackOnFailure: false, url: CONFIGURED_INCREMENTAL_ENDPOINT };
  }

  const configuredApiBaseEndpoint = createKolSignalsEndpoint(
    CONFIGURED_API_BASE_URL,
    KOL_SIGNALS_INCREMENTAL_PATH,
    KOL_SIGNALS_INCREMENTAL_LIMIT,
  );
  if (configuredApiBaseEndpoint) {
    return { shouldFallbackOnFailure: false, url: configuredApiBaseEndpoint };
  }

  const localEndpoint = resolveLocalEndpoint(LOCAL_INCREMENTAL_ENDPOINT);
  if (localEndpoint) {
    return { shouldFallbackOnFailure: true, url: localEndpoint };
  }

  const defaultRemoteEndpoint = createKolSignalsEndpoint(
    DEFAULT_REMOTE_API_BASE_URL,
    KOL_SIGNALS_INCREMENTAL_PATH,
    KOL_SIGNALS_INCREMENTAL_LIMIT,
  );
  return defaultRemoteEndpoint ? { shouldFallbackOnFailure: false, url: defaultRemoteEndpoint } : null;
}

export function createKolSignalsEndpoint(apiBaseUrl: string | undefined, path: string, limit: string): string | null {
  if (!apiBaseUrl) {
    return null;
  }

  try {
    const normalizedApiBaseUrl = normalizeKolSignalsApiBaseUrl(apiBaseUrl);
    const baseUrl = normalizedApiBaseUrl.endsWith("/") ? normalizedApiBaseUrl : `${normalizedApiBaseUrl}/`;
    const url = new URL(path.replace(/^\//u, ""), baseUrl);
    url.searchParams.set("limit", limit);
    return url.toString();
  } catch {
    return null;
  }
}

export function appendKolSignalsHistoryParams(endpoint: string): string {
  const url = new URL(endpoint, "https://smartkline.local");
  url.searchParams.set("since", createKolSignalsHistorySinceParam());
  url.searchParams.set("limit", KOL_SIGNAL_HISTORY_LIMIT);
  return endpoint.startsWith("/") ? `${url.pathname}${url.search}` : url.toString();
}

export function appendKolSignalsSinceParam(endpoint: string, createdAt: string): string {
  const url = new URL(endpoint, "https://smartkline.local");
  url.searchParams.set("since", createdAt);
  return endpoint.startsWith("/") ? `${url.pathname}${url.search}` : url.toString();
}

export function createKolSignalsHistorySinceParam(): string {
  return new Date(Date.now() - KOL_SIGNAL_HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function normalizeKolSignalsApiBaseUrl(apiBaseUrl: string): string {
  const url = new URL(apiBaseUrl);
  if (url.hostname === "api.smartkline.com" && (url.pathname === "" || url.pathname === "/")) {
    url.pathname = "/kol";
  }

  return url.toString();
}

function resolveLocalEndpoint(endpoint: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return ["localhost", "127.0.0.1"].includes(window.location.hostname) ? endpoint : null;
}
