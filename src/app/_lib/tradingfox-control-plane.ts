import { createHash } from "node:crypto";
import type { TelegramAuthSession } from "@/app/_lib/auth/telegram-auth";

const DEFAULT_TRADINGFOX_CONTROL_PLANE_API_BASE_URL = "https://api.smartkline.com/tradingfox-trader";
const DEFAULT_MOCK_MARGIN_BALANCE = 10_000;

export type TradingFoxConnector = {
  id: number;
  userId: number;
  name: string;
  exchangePlatform: string;
  credentials: Record<string, unknown>;
  isMock: boolean;
  mockMarginBalance?: number;
  positionSideDual: boolean;
  dead: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TradingFoxTrader = {
  id: number;
  userId: number;
  name: string;
  traderType: string;
  exchangeConnectorId: number;
  enabled: boolean;
  configSchemaVersion: number;
  configRevision: number;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  runtime?: TradingFoxRuntimeStatus;
  desiredState?: string;
  runtimeState?: string;
  displayStatus?: string;
  statusMessage?: string;
};

export type TradingFoxRuntimeStatus = {
  traderId: number;
  exchangeConnectorId: number;
  workerId: string;
  state: string;
  traderType: string;
  traderName: string;
  errorMessage?: string;
  configRevision: number;
  updatedAt: string;
};

export type TradingFoxCopyStrategy = {
  apiAccountName: string;
  avatarUrl: string;
  createdAtLabel: string;
  eventsCount: number;
  id: string;
  platform: string;
  positionsCount: number;
  status: "running" | "paused" | "stopped";
  stopLossPercent: number;
  takeProfitPercent: number;
  traderId: string;
  traderName: string;
};

export type TradingFoxAccountResponse = {
  connector: TradingFoxConnector | null;
  strategies: TradingFoxCopyStrategy[];
};

export type TradingFoxAccountStatus = {
  equity: number;
  positionSideDual: boolean;
  usdtFree: number;
  usdtTotal: number;
  usdtUsed: number;
};

export type TradingFoxPosition = {
  symbol: string;
  side: string;
  contracts?: number;
  notional?: number;
  leverage?: number;
  unrealizedPnl?: number;
  entryPrice?: number;
  markPrice?: number;
};

export type TradingFoxSignalSource = {
  signalSourceId: string;
  signalType?: string;
  name?: string;
  marginBalance: number;
  status?: string;
  marginPercent: number;
  followSide?: string;
  positions: Array<{
    symbol: string;
    positionSide: string;
    positionSize: number;
    leverage: number;
    entryPrice: number;
    markPrice?: number;
    exchangePlatform?: string;
    skipTrade: boolean;
  }>;
};

export type TradingFoxOrderHistory = {
  items: Array<{
    clientOrderId: string;
    symbol: string;
    side: string;
    status?: string;
    price: string;
    contractAmount: string;
    leverage: number;
    isMock: boolean;
    timestamp: string;
    message?: string;
  }>;
  signalSourceOrders: Array<{
    eventId: string;
    signalSourceId: string;
    symbol: string;
    side: string;
    action: string;
    timestamp: string;
  }>;
  tradeLogs: Array<{
    id: number;
    type: string;
    errorMessage?: string;
    timestamp: string;
  }>;
};

export type TradingFoxStrategyDetail = {
  account: TradingFoxAccountStatus | null;
  accountError?: string;
  orderHistory: TradingFoxOrderHistory | null;
  orderHistoryError?: string;
  positions: TradingFoxPosition[];
  positionsError?: string;
  signalSources: TradingFoxSignalSource[];
  signalSourcesError?: string;
  strategy: TradingFoxCopyStrategy;
  trader: TradingFoxTrader;
};

export type CreateMockConnectorInput = {
  accountName?: string;
  mockMarginBalance?: number;
};

export type CreateCopyStrategyInput = {
  signalSourceId: string;
  traderName: string;
  platform: string;
  avatarUrl?: string;
  positionsCount?: number;
  eventsCount?: number;
  takeProfitPercent: number;
  stopLossPercent: number;
};

export type SyncCopyStrategyPositionsInput = {
  ratioPercent?: unknown;
};

export class TradingFoxConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TradingFoxConfigError";
  }
}

export class TradingFoxApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TradingFoxApiError";
    this.status = status;
  }
}

export async function getTradingFoxAccount(session: TelegramAuthSession): Promise<TradingFoxAccountResponse> {
  const userId = tradingFoxUserIdFromSession(session);
  const [connectors, traders] = await Promise.all([
    tradingFoxRequest<{ items: TradingFoxConnector[] }>(`/v1/exchange-connectors?userId=${userId}&dead=false`),
    tradingFoxRequest<{ items: TradingFoxTrader[] }>(`/v1/traders?userId=${userId}&traderType=COPY_TRADING`),
  ]);
  const connector = pickActiveMockConnector(connectors.items);

  return {
    connector,
    strategies: traders.items.map((trader) => mapCopyStrategy(trader, connector)).filter((strategy) => strategy !== null),
  };
}

export async function createTradingFoxMockConnector(
  session: TelegramAuthSession,
  input: CreateMockConnectorInput,
): Promise<TradingFoxAccountResponse> {
  const userId = tradingFoxUserIdFromSession(session);
  const accountName = normalizeOptionalText(input.accountName) || "Mock Exchange #1";
  const mockMarginBalance = normalizePositiveNumber(input.mockMarginBalance) ?? DEFAULT_MOCK_MARGIN_BALANCE;

  const existing = await tradingFoxRequest<{ items: TradingFoxConnector[] }>(`/v1/exchange-connectors?userId=${userId}&dead=false`);
  const activeMock = pickActiveMockConnector(existing.items);

  if (activeMock) {
    await tradingFoxRequest<TradingFoxConnector>(`/v1/exchange-connectors/${activeMock.id}`, {
      body: JSON.stringify({
        mockMarginBalance,
        name: accountName,
        positionSideDual: true,
      }),
      method: "PATCH",
    });
  } else {
    await tradingFoxRequest<TradingFoxConnector>("/v1/exchange-connectors", {
      body: JSON.stringify({
        credentials: {},
        exchangePlatform: "Mock",
        isMock: true,
        mockMarginBalance,
        name: accountName,
        positionSideDual: true,
        userId,
      }),
      method: "POST",
    });
  }

  return getTradingFoxAccount(session);
}

export async function createTradingFoxCopyStrategy(
  session: TelegramAuthSession,
  input: CreateCopyStrategyInput,
): Promise<TradingFoxAccountResponse> {
  const userId = tradingFoxUserIdFromSession(session);
  const account = await getTradingFoxAccount(session);
  const connector = account.connector;

  if (!connector) {
    throw new TradingFoxApiError("Bind a paper trading account before creating a copy strategy.", 409);
  }

  const signalSourceId = requireText(input.signalSourceId, "signalSourceId");
  const traderName = requireText(input.traderName, "traderName");
  const takeProfitPercent = normalizePositiveNumber(input.takeProfitPercent) ?? 20;
  const stopLossPercent = normalizePositiveNumber(input.stopLossPercent) ?? 10;

  await tradingFoxRequest<{ trader: TradingFoxTrader; runtimeStatus?: TradingFoxRuntimeStatus }>("/v1/traders", {
    body: JSON.stringify({
      autoStart: true,
      config: {
        leverage: 10,
        settings: {
          stopLossMargin: stopLossPercent,
          takeProfitMargin: takeProfitPercent,
        },
        signalSourceConfigs: [
          {
            followSide: "both",
            id: 1,
            marginPercent: 100,
            signalSourceID: signalSourceId,
            startTime: new Date().toISOString(),
            traderID: 0,
          },
        ],
        smartkline: {
          avatarUrl: normalizeOptionalText(input.avatarUrl),
          eventsCount: normalizeNonNegativeInteger(input.eventsCount),
          platform: normalizeOptionalText(input.platform) || "Copy Trading",
          positionsCount: normalizeNonNegativeInteger(input.positionsCount),
          signalSourceId,
          stopLossPercent,
          takeProfitPercent,
          traderName,
        },
      },
      configSchemaVersion: 1,
      exchangeConnectorId: connector.id,
      name: traderName,
      traderType: "COPY_TRADING",
      userId,
    }),
    method: "POST",
  });

  return getTradingFoxAccount(session);
}

export async function updateTradingFoxCopyStrategyStatus(
  session: TelegramAuthSession,
  strategyId: string,
  status: "running" | "paused" | "stopped",
): Promise<TradingFoxAccountResponse> {
  const traderId = parsePositiveInteger(strategyId, "strategyId");

  if (status === "running") {
    await tradingFoxRequest<{ runtimeStatus?: TradingFoxRuntimeStatus }>(`/v1/traders/${traderId}/start`, {
      body: JSON.stringify({ startType: "manual_start" }),
      method: "POST",
    });
  } else {
    await tradingFoxRequest<{ runtimeStatus?: TradingFoxRuntimeStatus }>(`/v1/traders/${traderId}/stop`, {
      body: JSON.stringify({ closePositions: false, stopType: "manual" }),
      method: "POST",
    });
  }

  return getTradingFoxAccount(session);
}

export async function getTradingFoxCopyStrategyDetail(
  session: TelegramAuthSession,
  strategyId: string,
): Promise<TradingFoxStrategyDetail> {
  const userId = tradingFoxUserIdFromSession(session);
  const traderId = parsePositiveInteger(strategyId, "strategyId");
  const account = await getTradingFoxAccount(session);
  const trader = await tradingFoxRequest<TradingFoxTrader>(`/v1/traders/${traderId}`);

  if (trader.userId !== userId || trader.traderType !== "COPY_TRADING") {
    throw new TradingFoxApiError("Copy strategy not found.", 404);
  }

  const strategy = mapCopyStrategy(trader, account.connector);
  if (!strategy) {
    throw new TradingFoxApiError("Copy strategy not found.", 404);
  }

  const [accountStatus, positions, signalSources, orderHistory] = await Promise.all([
    settleTradingFoxRequest<{ account: TradingFoxAccountStatus }>(`/v1/traders/${traderId}/account-status`),
    settleTradingFoxRequest<{ items: TradingFoxPosition[] }>(`/v1/traders/${traderId}/positions`),
    settleTradingFoxRequest<{ items: TradingFoxSignalSource[] }>(`/v1/traders/${traderId}/signal-source-positions`),
    settleTradingFoxRequest<TradingFoxOrderHistory>(`/v1/traders/${traderId}/orders?limit=50`),
  ]);

  return {
    account: accountStatus.value?.account ?? null,
    accountError: accountStatus.error,
    orderHistory: orderHistory.value ?? null,
    orderHistoryError: orderHistory.error,
    positions: positions.value?.items ?? [],
    positionsError: positions.error,
    signalSources: signalSources.value?.items ?? [],
    signalSourcesError: signalSources.error,
    strategy,
    trader,
  };
}

export async function syncTradingFoxCopyStrategyPositions(
  session: TelegramAuthSession,
  strategyId: string,
  input: SyncCopyStrategyPositionsInput,
): Promise<TradingFoxStrategyDetail> {
  const userId = tradingFoxUserIdFromSession(session);
  const traderId = parsePositiveInteger(strategyId, "strategyId");
  const ratioPercent = normalizePositiveNumber(input.ratioPercent);

  if (ratioPercent === undefined) {
    throw new TradingFoxApiError("ratioPercent must be a positive number.", 400);
  }

  const trader = await tradingFoxRequest<TradingFoxTrader>(`/v1/traders/${traderId}`);
  if (trader.userId !== userId || trader.traderType !== "COPY_TRADING") {
    throw new TradingFoxApiError("Copy strategy not found.", 404);
  }

  await tradingFoxRequest<{ runtimeStatus?: TradingFoxRuntimeStatus }>(`/v1/traders/${traderId}/sync-positions`, {
    body: JSON.stringify({ ratioPercent }),
    method: "POST",
  });

  return getTradingFoxCopyStrategyDetail(session, strategyId);
}

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

async function settleTradingFoxRequest<T>(path: string): Promise<{ error?: string; value?: T }> {
  try {
    return { value: await tradingFoxRequest<T>(path) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "TradingFox request failed." };
  }
}

async function tradingFoxRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
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

function pickActiveMockConnector(connectors: TradingFoxConnector[]): TradingFoxConnector | null {
  return connectors.find((connector) => !connector.dead && connector.exchangePlatform === "Mock" && connector.isMock) ?? null;
}

function mapCopyStrategy(trader: TradingFoxTrader, connector: TradingFoxConnector | null): TradingFoxCopyStrategy | null {
  if (trader.traderType !== "COPY_TRADING") {
    return null;
  }
  const signalSourceConfig = firstSignalSourceConfig(trader.config);
  const metadata = recordValue(trader.config.smartkline);
  const signalSourceId = stringValue(metadata.signalSourceId) || stringValue(signalSourceConfig?.signalSourceId) || stringValue(signalSourceConfig?.signalSourceID) || String(trader.id);

  return {
    apiAccountName: connector?.name ?? `Connector #${trader.exchangeConnectorId}`,
    avatarUrl: stringValue(metadata.avatarUrl),
    createdAtLabel: formatBackendDateLabel(trader.createdAt),
    eventsCount: numberValue(metadata.eventsCount),
    id: String(trader.id),
    platform: stringValue(metadata.platform) || "Copy Trading",
    positionsCount: numberValue(metadata.positionsCount),
    status: mapBackendStrategyStatus(trader),
    stopLossPercent: numberValue(metadata.stopLossPercent, 10),
    takeProfitPercent: numberValue(metadata.takeProfitPercent, 20),
    traderId: signalSourceId,
    traderName: stringValue(metadata.traderName) || trader.name,
  };
}

function firstSignalSourceConfig(config: Record<string, unknown>): Record<string, unknown> | null {
  const raw = config.signalSourceConfigs;
  if (!Array.isArray(raw)) {
    return null;
  }
  return recordValue(raw[0]);
}

function mapBackendStrategyStatus(trader: TradingFoxTrader): "running" | "paused" | "stopped" {
  if (!trader.enabled || trader.displayStatus === "disabled") {
    return "stopped";
  }
  if (trader.displayStatus === "running" || trader.runtimeState === "running") {
    return "running";
  }
  return "paused";
}

function formatBackendDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
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

function requireText(value: unknown, fieldName: string): string {
  const text = normalizeOptionalText(value);
  if (!text) {
    throw new TradingFoxApiError(`${fieldName} is required.`, 400);
  }
  return text;
}

function normalizeOptionalText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePositiveNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function normalizeNonNegativeInteger(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function parsePositiveInteger(value: string, fieldName: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new TradingFoxApiError(`${fieldName} must be a positive integer.`, 400);
  }
  return number;
}

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown, fallback = 0): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
