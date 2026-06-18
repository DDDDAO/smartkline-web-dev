import type { TelegramAuthSession } from "@/lib/auth/telegram-auth";
import { getTradingFoxAccount } from "./account";
import { DEFAULT_DEMO_EXCHANGE_PLATFORM, DEFAULT_MOCK_MARGIN_BALANCE, TRADINGFOX_COPY_STRATEGY_DEFINITION_ID, type TradingFoxDemoExchangePlatform, type TradingFoxLiveExchangePlatform } from "./constants";
import { tradingFoxRequest, tradingFoxUserIdFromSession } from "./http";
import { normalizeNonNegativeInteger } from "./normalizers";
import { TradingFoxApiError } from "./types";
import type {
  CompleteHyperliquidAgentBindingInput,
  CreateConnectorInput,
  CreateHyperliquidAgentBindingInput,
  CreateMockConnectorInput,
  TradingFoxAccountResponse,
  TradingFoxConnector,
  TradingFoxConnectorWhitelistIP,
  TradingFoxHyperliquidAgentBindingCompleteResponse,
  TradingFoxHyperliquidAgentBindingStartResponse,
  TradingFoxIPAddress,
  TradingFoxTrader,
} from "./types";
import { isRecord, normalizeOptionalText, normalizePositiveNumber, parsePositiveInteger, requireText, stringValue } from "./value-utils";

export async function createTradingFoxDemoConnector(
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
      isMock: exchangePlatform === "Mock",
      mockMarginBalance,
      name: accountName,
      positionSideDual: defaultDemoPositionSideDual(exchangePlatform),
      userId,
    }),
    method: "POST",
  });

  return getTradingFoxAccount(session);
}

export async function createTradingFoxMockConnector(
  session: TelegramAuthSession,
  input: CreateMockConnectorInput,
): Promise<TradingFoxAccountResponse> {
  return createTradingFoxDemoConnector(session, { ...input, exchangePlatform: "Mock" });
}

export async function createTradingFoxConnector(
  session: TelegramAuthSession,
  input: CreateConnectorInput,
): Promise<TradingFoxAccountResponse> {
  const requestedExchangePlatform = normalizeOptionalText(input.exchangePlatform);
  const demoExchangePlatform = normalizeDemoExchangePlatform(input.exchangePlatform);
  if (input.isMock === true) {
    if (requestedExchangePlatform && demoExchangePlatform !== "Mock") {
      throw new TradingFoxApiError("isMock is only valid for Mock exchange connectors.", 400);
    }
    return createTradingFoxDemoConnector(session, { ...input, exchangePlatform: "Mock" });
  }
  if (demoExchangePlatform) {
    return createTradingFoxDemoConnector(session, { ...input, exchangePlatform: demoExchangePlatform });
  }

  const userId = tradingFoxUserIdFromSession(session);
  const exchangePlatform = normalizeLiveExchangePlatform(input.exchangePlatform);
  if (!exchangePlatform) {
    throw new TradingFoxApiError("Unsupported live exchange connector.", 400);
  }

  const accountName = normalizeOptionalText(input.accountName) || defaultLiveAccountName(exchangePlatform);
  const credentials = createLiveExchangeCredentials(exchangePlatform, input);
  const requestedIPAddress = normalizeOptionalText(input.ipAddress);
  const ipAddress = requestedIPAddress
    ? await resolveTradingFoxConnectorIPAddress(userId, requestedIPAddress)
    : await resolveTradingFoxConnectorIPAddress(userId, undefined, { allowUnassigned: true });

  await tradingFoxRequest<TradingFoxConnector>("/v1/exchange-connectors", {
    body: JSON.stringify({
      credentials,
      exchangePlatform,
      ...(ipAddress ? { ipAddress: ipAddress.address } : {}),
      isMock: false,
      name: accountName,
      positionSideDual: false,
      userId,
    }),
    method: "POST",
  });

  return getTradingFoxAccount(session);
}

export async function prepareTradingFoxHyperliquidAgentBinding(
  session: TelegramAuthSession,
  input: CreateHyperliquidAgentBindingInput,
): Promise<TradingFoxHyperliquidAgentBindingStartResponse> {
  const userId = tradingFoxUserIdFromSession(session);
  const walletAddress = requireText(input.walletAddress, "walletAddress");
  const connectorName = normalizeOptionalText(input.accountName) || "HyperLiquid #1";

  return tradingFoxRequest<TradingFoxHyperliquidAgentBindingStartResponse>("/v1/hyperliquid-agent-bindings", {
    body: JSON.stringify({
      connectorName,
      userId,
      walletAddress,
    }),
    method: "POST",
  });
}

export async function completeTradingFoxHyperliquidAgentBinding(
  session: TelegramAuthSession,
  bindingId: string,
  input: CompleteHyperliquidAgentBindingInput,
): Promise<TradingFoxAccountResponse> {
  const parsedBindingId = parsePositiveInteger(bindingId, "bindingId");

  await tradingFoxRequest<TradingFoxHyperliquidAgentBindingCompleteResponse>(`/v1/hyperliquid-agent-bindings/${parsedBindingId}/complete`, {
    body: JSON.stringify({
      approveAgentSignature: requireText(input.approveAgentSignature, "approveAgentSignature"),
      approveBuilderFeeSignature: requireText(input.approveBuilderFeeSignature, "approveBuilderFeeSignature"),
    }),
    method: "POST",
  });

  return getTradingFoxAccount(session);
}

export async function deleteTradingFoxConnector(
  session: TelegramAuthSession,
  connectorId: string,
): Promise<TradingFoxAccountResponse> {
  const userId = tradingFoxUserIdFromSession(session);
  const parsedConnectorId = parsePositiveInteger(connectorId, "connectorId");
  const connector = await getConnectorForUser(parsedConnectorId, userId);
  if (connector.dead) {
    throw new TradingFoxApiError("Exchange connector not found.", 404);
  }

  const traders = await tradingFoxRequest<{ items: TradingFoxTrader[] }>(tradingFoxCopyTradersPath(userId));
  const attachedTrader = traders.items.find((trader) => trader.exchangeConnectorId === parsedConnectorId);
  if (attachedTrader) {
    throw new TradingFoxApiError("Delete strategies that use this exchange account before deleting the account.", 409);
  }

  await tradingFoxRequest<void>(`/v1/exchange-connectors/${parsedConnectorId}`, { method: "DELETE" });

  return getTradingFoxAccount(session);
}

export async function getTradingFoxConnectorWhitelistIP(
  session: TelegramAuthSession,
  input: { exchangePlatform?: unknown },
): Promise<TradingFoxConnectorWhitelistIP> {
  const userId = tradingFoxUserIdFromSession(session);
  const exchangePlatform = normalizeLiveExchangePlatform(input.exchangePlatform) ?? "Binance";
  const ipAddress = await resolveTradingFoxConnectorIPAddress(userId, undefined, { allowUnassigned: true });

  return {
    assignmentStatus: ipAddress ? "assigned" : "unassigned",
    exchangePlatform,
    ipAddress,
    userId,
    whitelistIp: ipAddress?.address ?? "",
  };
}

export function pickActiveConnectors(connectors: TradingFoxConnector[]): TradingFoxConnector[] {
  return connectors
    .filter((connector) => !connector.dead)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function redactTradingFoxConnectorCredentials(connector: TradingFoxConnector): TradingFoxConnector {
  const ipAddress = normalizeTradingFoxIPAddress(connector.ipAddress);
  const whitelistIp = ipAddress?.address ?? connector.whitelistIp ?? stringValue(connector.credentials.whitelistIp);

  return {
    ...connector,
    credentials: {},
    ipAddress,
    whitelistIp: whitelistIp || undefined,
  };
}

async function resolveTradingFoxConnectorIPAddress(
  userId: number,
  requestedIPAddress?: unknown,
  options: { allowUnassigned?: boolean } = {},
): Promise<TradingFoxIPAddress | null> {
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
    /**
     * The IP pool is operational data, so a database reset can temporarily leave
     * it empty. In that state account setup should remain available and create
     * the connector without a fixed proxy IP instead of failing the UI request.
     */
    if (options.allowUnassigned) {
      return null;
    }
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

  if (normalizedValue === "binancedemo") {
    return "BinanceDemo";
  }

  return null;
}

function normalizeLiveExchangePlatform(value: unknown): TradingFoxLiveExchangePlatform | null {
  const normalizedValue = normalizeOptionalText(value).replace(/[\s_-]/gu, "").toLowerCase();
  if (normalizedValue === "binance" || normalizedValue === "bn") {
    return "Binance";
  }

  if (normalizedValue === "okx") {
    return "OKX";
  }

  if (normalizedValue === "hyperliquid" || normalizedValue === "hl") {
    return "HyperLiquid";
  }

  if (normalizedValue === "aster" || normalizedValue === "as") {
    return "Aster";
  }

  if (normalizedValue === "bitget" || normalizedValue === "bg") {
    return "Bitget";
  }

  if (normalizedValue === "bybit" || normalizedValue === "by") {
    return "Bybit";
  }

  if (normalizedValue === "gate" || normalizedValue === "gt") {
    return "Gate";
  }

  return null;
}

function defaultDemoAccountName(exchangePlatform: TradingFoxDemoExchangePlatform): string {
  return exchangePlatform === "BinanceDemo" ? "Binance Demo #1" : "Mock Exchange #1";
}

function defaultLiveAccountName(exchangePlatform: TradingFoxLiveExchangePlatform): string {
  return `${exchangePlatform} #1`;
}

function defaultDemoPositionSideDual(exchangePlatform: TradingFoxDemoExchangePlatform): boolean {
  /**
   * Binance Futures demo accounts are usually in one-way mode. Creating those
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
    secret: requireText(input.secret, "secret"),
  };
}

function createLiveExchangeCredentials(
  exchangePlatform: TradingFoxLiveExchangePlatform,
  input: CreateConnectorInput,
): Record<string, unknown> {
  if (exchangePlatform === "HyperLiquid") {
    return {
      apiKey: requireText(input.walletAddress, "walletAddress"),
      bindingMode: "manual_credentials",
      secret: requireText(input.privateKey, "privateKey"),
      walletAddress: requireText(input.walletAddress, "walletAddress"),
    };
  }

  const credentials: Record<string, unknown> = {
    apiKey: requireText(input.apiKey, "apiKey"),
    secret: requireText(input.secret, "secret"),
  };

  if (exchangePlatform === "OKX" || exchangePlatform === "Bitget") {
    credentials.password = requireText(input.password, "password");
  }

  if (exchangePlatform === "Aster") {
    credentials.walletAddress = requireText(input.walletAddress, "walletAddress");
  }

  return credentials;
}

export async function getConnectorForUser(connectorId: number, userId: number): Promise<TradingFoxConnector> {
  const connector = await tradingFoxRequest<TradingFoxConnector>(`/v1/exchange-connectors/${connectorId}`);
  if (connector.userId !== userId) {
    throw new TradingFoxApiError("Exchange connector not found.", 404);
  }
  return connector;
}

export async function ensureCopyStrategyConnectorPositionMode(connector: TradingFoxConnector): Promise<void> {
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

export function isBinanceDemoConnector(connector: TradingFoxConnector): boolean {
  return normalizeDemoExchangePlatform(connector.exchangePlatform) === "BinanceDemo";
}

export function tradingFoxCopyTradersPath(userId: number): string {
  const query = new URLSearchParams({
    strategyDefinitionId: TRADINGFOX_COPY_STRATEGY_DEFINITION_ID,
    userId: String(userId),
  });
  return `/v1/traders?${query.toString()}`;
}
