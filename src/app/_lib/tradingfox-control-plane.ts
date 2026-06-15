import { createHash } from "node:crypto";
import type { TelegramAuthSession } from "@/app/_lib/auth/telegram-auth";

const DEFAULT_TRADINGFOX_CONTROL_PLANE_API_BASE_URL = "https://api.smartkline.com/tradingfox-trader";
const DEFAULT_MOCK_MARGIN_BALANCE = 10_000;
const DEFAULT_DEMO_EXCHANGE_PLATFORM = "Mock";
const TRADINGFOX_ORDER_HISTORY_PAGE_LIMIT = 50;
const TRADINGFOX_ORDER_HISTORY_FETCH_LIMIT = 500;
type TradingFoxDemoExchangePlatform = "Mock" | "Binance";
type TradingFoxLiveExchangePlatform = "Binance";

/**
 * Public subset of the TradingFox IP pool record. The backend record can carry
 * proxy auth/internal routing fields; the Next.js API must not expose them.
 */
export type TradingFoxIPAddress = {
  address: string;
  createdAt?: string;
  expiresAt?: string;
  location?: string;
  port?: number;
  status: string;
  updatedAt?: string;
  workerId?: string;
};

export type TradingFoxConnector = {
  id: number;
  userId: number;
  name: string;
  accountEquity?: number;
  displayName?: string;
  exchangePlatform: string;
  credentials: Record<string, unknown>;
  isMock: boolean;
  mockMarginBalance?: number;
  positionSideDual: boolean;
  ipAddress?: TradingFoxIPAddress | null;
  whitelistIp?: string;
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
  accountEquity?: number;
  exchangeConnectorId: number;
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
  unrealizedPnl?: number;
};

export type TradingFoxAccountResponse = {
  connector: TradingFoxConnector | null;
  connectors: TradingFoxConnector[];
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
  hasMore?: boolean;
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
  limit?: number;
  offset?: number;
  returnedCount?: number;
  signalSourceOrdersNextCursor?: string;
  signalSourceOrders: Array<{
    eventId: string;
    signalSourceId: string;
    signalSourceName?: string;
    signalType?: string;
    exchange?: string;
    symbol: string;
    side: string;
    action: string;
    prevQty?: string;
    currQty?: string;
    deltaQty?: string;
    isFullClose?: boolean;
    positionVersion?: number;
    tradeSeq?: number;
    sourceTimestamp?: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
    price?: string | number;
    priceSource?: string;
    entryPrice?: string | number;
    markPrice?: string | number;
  }>;
  tradeLogs: Array<{
    id: number;
    type: string;
    errorMessage?: string;
    ssTradeInfo?: Record<string, unknown>;
    ssConfig?: Record<string, unknown>;
    orderData?: Record<string, unknown>;
    additionalInfo?: Record<string, unknown>;
    timestamp: string;
    traderId?: number;
  }>;
  tradeLogsNextCursor?: string;
  traderOrdersNextCursor?: string;
};

export type TradingFoxStrategyDetail = {
  account: TradingFoxAccountStatus | null;
  accountError?: string;
  accountInitialEquity?: number;
  orderHistory: TradingFoxOrderHistory | null;
  orderHistoryError?: string;
  positions: TradingFoxPosition[];
  positionsError?: string;
  signalSources: TradingFoxSignalSource[];
  signalSourcesError?: string;
  strategy: TradingFoxCopyStrategy;
  trader: TradingFoxTrader;
};

export type TradingFoxCopyStrategyDetailInput = {
  orderLimit?: unknown;
  orderOffset?: unknown;
};

export type CreateMockConnectorInput = {
  accountName?: string;
  apiKey?: unknown;
  exchangePlatform?: unknown;
  mockMarginBalance?: unknown;
  secret?: unknown;
};

export type CreateConnectorInput = CreateMockConnectorInput & {
  ipAddress?: unknown;
  isMock?: unknown;
};

export type TradingFoxConnectorWhitelistIP = {
  userId: number;
  exchangePlatform: string;
  ipAddress: TradingFoxIPAddress;
  whitelistIp: string;
};

export type CreateCopyStrategyInput = {
  exchangeConnectorId?: unknown;
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
  const activeConnectors = pickActiveConnectors(connectors.items);
  const connectorById = new Map(activeConnectors.map((connector) => [connector.id, connector]));
  const accountEquityByConnectorId = new Map<number, number>();
  const strategies = await Promise.all(traders.items.map(async (trader) => {
    const connector = connectorById.get(trader.exchangeConnectorId) ?? null;
    const strategy = mapCopyStrategy(trader, connector);
    if (!strategy) {
      return null;
    }

    const [accountStatus, positions] = await Promise.all([
      settleTradingFoxRequest<{ account: TradingFoxAccountStatus }>(`/v1/traders/${trader.id}/account-status`),
      settleTradingFoxRequest<{ items: TradingFoxPosition[] }>(`/v1/traders/${trader.id}/positions`),
    ]);
    const accountEquity = accountStatus.value?.account.equity;
    if (typeof accountEquity === "number" && Number.isFinite(accountEquity)) {
      accountEquityByConnectorId.set(trader.exchangeConnectorId, accountEquity);
    }

    return {
      ...strategy,
      accountEquity: accountStatus.value?.account.equity,
      unrealizedPnl: positions.value?.items.reduce((sum, position) => sum + numberValue(position.unrealizedPnl), 0),
    };
  }));
  const connectorsWithAccountEquity = activeConnectors.map((connector) => ({
    ...connector,
    accountEquity: accountEquityByConnectorId.get(connector.id),
  }));
  const publicConnectors = connectorsWithAccountEquity.map(redactTradingFoxConnectorCredentials);

  return {
    connector: publicConnectors[0] ?? null,
    connectors: publicConnectors,
    strategies: strategies.filter((strategy) => strategy !== null),
  };
}

export async function createTradingFoxMockConnector(
  session: TelegramAuthSession,
  input: CreateMockConnectorInput,
): Promise<TradingFoxAccountResponse> {
  const userId = tradingFoxUserIdFromSession(session);
  const exchangePlatform = normalizeDemoExchangePlatform(input.exchangePlatform) ?? DEFAULT_DEMO_EXCHANGE_PLATFORM;
  const accountName = normalizeOptionalText(input.accountName) || defaultDemoAccountName(exchangePlatform);
  const mockMarginBalance = exchangePlatform === "Mock"
    ? normalizePositiveNumber(input.mockMarginBalance) ?? DEFAULT_MOCK_MARGIN_BALANCE
    : undefined;
  const credentials = createDemoExchangeCredentials(exchangePlatform, input);

  await tradingFoxRequest<TradingFoxConnector>("/v1/exchange-connectors", {
    body: JSON.stringify({
      credentials,
      exchangePlatform,
      isMock: true,
      mockMarginBalance,
      name: accountName,
      positionSideDual: defaultDemoPositionSideDual(exchangePlatform),
      userId,
    }),
    method: "POST",
  });

  return getTradingFoxAccount(session);
}

export async function createTradingFoxConnector(
  session: TelegramAuthSession,
  input: CreateConnectorInput,
): Promise<TradingFoxAccountResponse> {
  if (input.isMock === true) {
    return createTradingFoxMockConnector(session, input);
  }

  const userId = tradingFoxUserIdFromSession(session);
  const exchangePlatform = normalizeLiveExchangePlatform(input.exchangePlatform);
  if (!exchangePlatform) {
    throw new TradingFoxApiError("Only Binance live connector is supported.", 400);
  }

  const accountName = normalizeOptionalText(input.accountName) || defaultLiveAccountName(exchangePlatform);
  const credentials = createLiveExchangeCredentials(exchangePlatform, input);
  const ipAddress = await resolveTradingFoxConnectorIPAddress(userId, input.ipAddress);

  await tradingFoxRequest<TradingFoxConnector>("/v1/exchange-connectors", {
    body: JSON.stringify({
      credentials,
      exchangePlatform,
      ipAddress: ipAddress.address,
      isMock: false,
      name: accountName,
      positionSideDual: false,
      userId,
    }),
    method: "POST",
  });

  return getTradingFoxAccount(session);
}

export async function getTradingFoxConnectorWhitelistIP(
  session: TelegramAuthSession,
  input: { exchangePlatform?: unknown },
): Promise<TradingFoxConnectorWhitelistIP> {
  const userId = tradingFoxUserIdFromSession(session);
  const exchangePlatform = normalizeLiveExchangePlatform(input.exchangePlatform) ?? "Binance";
  const ipAddress = await resolveTradingFoxConnectorIPAddress(userId);

  return {
    exchangePlatform,
    ipAddress,
    userId,
    whitelistIp: ipAddress.address,
  };
}

export async function createTradingFoxCopyStrategy(
  session: TelegramAuthSession,
  input: CreateCopyStrategyInput,
): Promise<TradingFoxAccountResponse> {
  const userId = tradingFoxUserIdFromSession(session);
  const account = await getTradingFoxAccount(session);
  const requestedConnectorId = normalizePositiveInteger(input.exchangeConnectorId);
  const connector = requestedConnectorId
    ? account.connectors.find((item) => item.id === requestedConnectorId) ?? null
    : account.connector;

  if (!connector) {
    throw new TradingFoxApiError("Add an exchange account before creating a copy strategy.", 409);
  }

  await ensureCopyStrategyConnectorPositionMode(connector);

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
  const userId = tradingFoxUserIdFromSession(session);
  const traderId = parsePositiveInteger(strategyId, "strategyId");
  const trader = await tradingFoxRequest<TradingFoxTrader>(`/v1/traders/${traderId}`);

  if (trader.userId !== userId || trader.traderType !== "COPY_TRADING") {
    throw new TradingFoxApiError("Copy strategy not found.", 404);
  }

  if (status === "running") {
    await ensureCopyStrategyConnectorPositionMode(await getConnectorForUser(trader.exchangeConnectorId, userId));
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

export async function deleteTradingFoxCopyStrategy(
  session: TelegramAuthSession,
  strategyId: string,
): Promise<TradingFoxAccountResponse> {
  const userId = tradingFoxUserIdFromSession(session);
  const traderId = parsePositiveInteger(strategyId, "strategyId");
  const trader = await tradingFoxRequest<TradingFoxTrader>(`/v1/traders/${traderId}`);

  if (trader.userId !== userId || trader.traderType !== "COPY_TRADING") {
    throw new TradingFoxApiError("Copy strategy not found.", 404);
  }

  if (trader.enabled) {
    await tradingFoxRequest<{ runtimeStatus?: TradingFoxRuntimeStatus }>(`/v1/traders/${traderId}/stop`, {
      body: JSON.stringify({ closePositions: false, stopType: "manual" }),
      method: "POST",
    });
  }

  await tradingFoxRequest<void>(`/v1/traders/${traderId}`, { method: "DELETE" });

  return getTradingFoxAccount(session);
}

export async function getTradingFoxCopyStrategyDetail(
  session: TelegramAuthSession,
  strategyId: string,
  input: TradingFoxCopyStrategyDetailInput = {},
): Promise<TradingFoxStrategyDetail> {
  const userId = tradingFoxUserIdFromSession(session);
  const traderId = parsePositiveInteger(strategyId, "strategyId");
  const orderHistoryPage = normalizeTradingFoxOrderHistoryPage(input);
  const account = await getTradingFoxAccount(session);
  const trader = await tradingFoxRequest<TradingFoxTrader>(`/v1/traders/${traderId}`);

  if (trader.userId !== userId || trader.traderType !== "COPY_TRADING") {
    throw new TradingFoxApiError("Copy strategy not found.", 404);
  }

  const connector = account.connectors.find((item) => item.id === trader.exchangeConnectorId) ?? account.connector;
  const strategy = mapCopyStrategy(trader, connector);
  if (!strategy) {
    throw new TradingFoxApiError("Copy strategy not found.", 404);
  }

  const [accountStatus, positions, signalSources, orderHistory] = await Promise.all([
    settleTradingFoxRequest<{ account: TradingFoxAccountStatus }>(`/v1/traders/${traderId}/account-status`),
    settleTradingFoxRequest<{ items: TradingFoxPosition[] }>(`/v1/traders/${traderId}/positions`),
    settleTradingFoxRequest<{ items: TradingFoxSignalSource[] }>(`/v1/traders/${traderId}/signal-source-positions`),
    settleTradingFoxRequest<TradingFoxOrderHistory>(
      `/v1/traders/${traderId}/orders?limit=${orderHistoryPage.fetchLimit}`,
    ),
  ]);

  return {
    account: accountStatus.value?.account ?? null,
    accountError: accountStatus.error,
    accountInitialEquity: connector && !isBinanceDemoConnector(connector) ? connector.mockMarginBalance : undefined,
    orderHistory: orderHistory.value ? applyTradingFoxOrderHistoryPage(orderHistory.value, orderHistoryPage) : null,
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

  await ensureCopyStrategyConnectorPositionMode(await getConnectorForUser(trader.exchangeConnectorId, userId));

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

function pickActiveConnectors(connectors: TradingFoxConnector[]): TradingFoxConnector[] {
  return connectors
    .filter((connector) => !connector.dead)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function redactTradingFoxConnectorCredentials(connector: TradingFoxConnector): TradingFoxConnector {
  const ipAddress = normalizeTradingFoxIPAddress(connector.ipAddress);
  const whitelistIp = ipAddress?.address ?? connector.whitelistIp ?? stringValue(connector.credentials.whitelistIp);

  return {
    ...connector,
    credentials: {},
    ipAddress,
    whitelistIp: whitelistIp || undefined,
  };
}

async function resolveTradingFoxConnectorIPAddress(userId: number, requestedIPAddress?: unknown): Promise<TradingFoxIPAddress> {
  const ipAddresses = await getActiveTradingFoxIPAddresses();
  const normalizedRequestedIPAddress = normalizeOptionalText(requestedIPAddress);

  if (normalizedRequestedIPAddress) {
    const selectedIPAddress = ipAddresses.find((ipAddress) => ipAddress.address === normalizedRequestedIPAddress);
    if (!selectedIPAddress) {
      throw new TradingFoxApiError("Selected TradingFox IP address is not active.", 409);
    }
    return selectedIPAddress;
  }

  if (ipAddresses.length === 0) {
    throw new TradingFoxApiError("No active TradingFox IP address is available.", 409);
  }

  return ipAddresses[Math.max(0, userId - 1) % ipAddresses.length];
}

async function getActiveTradingFoxIPAddresses(): Promise<TradingFoxIPAddress[]> {
  const response = await tradingFoxRequest<{ items?: unknown[] }>("/v1/ip-addresses?status=active");
  const items = Array.isArray(response.items) ? response.items : [];
  return items
    .map(normalizeTradingFoxIPAddress)
    .filter((ipAddress): ipAddress is TradingFoxIPAddress => ipAddress !== null)
    .filter(isUsableTradingFoxIPAddress)
    .sort((a, b) => a.address.localeCompare(b.address));
}

function isUsableTradingFoxIPAddress(ipAddress: TradingFoxIPAddress): boolean {
  if (ipAddress.status.toLowerCase() !== "active") {
    return false;
  }
  if (!ipAddress.expiresAt) {
    return true;
  }

  const expiresAt = Date.parse(ipAddress.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function normalizeTradingFoxIPAddress(value: unknown): TradingFoxIPAddress | null {
  if (!isRecord(value)) {
    return null;
  }

  const address = normalizeOptionalText(value.address);
  if (!address) {
    return null;
  }

  const port = normalizeNonNegativeInteger(value.port);
  const createdAt = normalizeOptionalText(value.createdAt);
  const expiresAt = normalizeOptionalText(value.expiresAt);
  const location = normalizeOptionalText(value.location);
  const status = normalizeOptionalText(value.status) || "unknown";
  const updatedAt = normalizeOptionalText(value.updatedAt);
  const workerId = normalizeOptionalText(value.workerId);

  return {
    address,
    ...(createdAt ? { createdAt } : {}),
    ...(expiresAt ? { expiresAt } : {}),
    ...(location ? { location } : {}),
    ...(port > 0 ? { port } : {}),
    status,
    ...(updatedAt ? { updatedAt } : {}),
    ...(workerId ? { workerId } : {}),
  };
}

function normalizeDemoExchangePlatform(value: unknown): TradingFoxDemoExchangePlatform | null {
  const normalizedValue = normalizeOptionalText(value).replace(/[\s_-]/gu, "").toLowerCase();
  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue === "mock" || normalizedValue === "mockexchange") {
    return "Mock";
  }

  if (normalizedValue === "binance" || normalizedValue === "binancedemo" || normalizedValue === "bn") {
    return "Binance";
  }

  return null;
}

function normalizeLiveExchangePlatform(value: unknown): TradingFoxLiveExchangePlatform | null {
  const normalizedValue = normalizeOptionalText(value).replace(/[\s_-]/gu, "").toLowerCase();
  if (normalizedValue === "binance" || normalizedValue === "bn") {
    return "Binance";
  }

  return null;
}

function defaultDemoAccountName(exchangePlatform: TradingFoxDemoExchangePlatform): string {
  return exchangePlatform === "Binance" ? "Binance Demo #1" : "Mock Exchange #1";
}

function defaultLiveAccountName(exchangePlatform: TradingFoxLiveExchangePlatform): string {
  return `${exchangePlatform} #1`;
}

function defaultDemoPositionSideDual(exchangePlatform: TradingFoxDemoExchangePlatform): boolean {
  /**
   * Binance Futures demo accounts are usually in one-way mode. Storing those
   * connectors as hedge mode makes the worker send LONG/SHORT positionSide
   * params, which Binance rejects with a position-side mismatch.
   */
  return exchangePlatform === "Mock";
}

function createDemoExchangeCredentials(
  exchangePlatform: TradingFoxDemoExchangePlatform,
  input: CreateMockConnectorInput,
): Record<string, unknown> {
  if (exchangePlatform === "Mock") {
    return {};
  }

  return {
    apiKey: requireText(input.apiKey, "apiKey"),
    enableDemoTrading: true,
    secret: requireText(input.secret, "secret"),
  };
}

function createLiveExchangeCredentials(
  exchangePlatform: TradingFoxLiveExchangePlatform,
  input: CreateConnectorInput,
): Record<string, unknown> {
  if (exchangePlatform !== "Binance") {
    throw new TradingFoxApiError("Only Binance live connector is supported.", 400);
  }

  return {
    apiKey: requireText(input.apiKey, "apiKey"),
    secret: requireText(input.secret, "secret"),
  };
}

async function getConnectorForUser(connectorId: number, userId: number): Promise<TradingFoxConnector> {
  const connector = await tradingFoxRequest<TradingFoxConnector>(`/v1/exchange-connectors/${connectorId}`);
  if (connector.userId !== userId) {
    throw new TradingFoxApiError("Exchange connector not found.", 404);
  }
  return connector;
}

async function ensureCopyStrategyConnectorPositionMode(connector: TradingFoxConnector): Promise<void> {
  if (!isBinanceDemoConnector(connector) || !connector.positionSideDual) {
    return;
  }

  try {
    await tradingFoxRequest<TradingFoxConnector>(`/v1/exchange-connectors/${connector.id}`, {
      body: JSON.stringify({ positionSideDual: false }),
      method: "PATCH",
    });
  } catch (error) {
    if (error instanceof TradingFoxApiError) {
      throw new TradingFoxApiError(
        `Binance Demo position mode repair failed. Stop existing strategy assignments or recreate the Binance Demo account, then retry. ${error.message}`,
        error.status,
      );
    }
    throw error;
  }
}

function isBinanceDemoConnector(connector: TradingFoxConnector): boolean {
  return connector.isMock && normalizeDemoExchangePlatform(connector.exchangePlatform) === "Binance";
}

function normalizeTradingFoxOrderHistoryPage(input: TradingFoxCopyStrategyDetailInput): {
  fetchLimit: number;
  limit: number;
  offset: number;
} {
  const normalizedLimit = normalizePositiveInteger(input.orderLimit) ?? TRADINGFOX_ORDER_HISTORY_PAGE_LIMIT;
  const limit = Math.min(TRADINGFOX_ORDER_HISTORY_PAGE_LIMIT, normalizedLimit);
  const offset = normalizeNonNegativeInteger(input.orderOffset);
  return {
    fetchLimit: Math.min(TRADINGFOX_ORDER_HISTORY_FETCH_LIMIT, offset + limit),
    limit,
    offset,
  };
}

function applyTradingFoxOrderHistoryPage(
  orderHistory: TradingFoxOrderHistory,
  page: { fetchLimit: number; limit: number; offset: number },
): TradingFoxOrderHistory {
  const items = orderHistory.items.slice(0, page.fetchLimit);
  const signalSourceOrders = orderHistory.signalSourceOrders.slice(0, page.fetchLimit);
  const tradeLogs = orderHistory.tradeLogs.slice(0, page.fetchLimit);
  const hasCursorMore = Boolean(
    orderHistory.traderOrdersNextCursor
    || orderHistory.signalSourceOrdersNextCursor
    || orderHistory.tradeLogsNextCursor,
  );
  return {
    ...orderHistory,
    hasMore: orderHistory.hasMore ?? hasCursorMore,
    items,
    limit: page.limit,
    offset: page.offset,
    returnedCount: Math.min(page.limit, Math.max(0, items.length - page.offset)),
    signalSourceOrders,
    tradeLogs,
  };
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
    exchangeConnectorId: trader.exchangeConnectorId,
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
    return "paused";
  }
  if (trader.displayStatus === "running" || trader.runtimeState === "running") {
    return "running";
  }
  return "running";
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

function normalizePositiveInteger(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
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
