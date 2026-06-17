import { createHash } from "node:crypto";
import type { TelegramAuthSession } from "@/app/_lib/auth/telegram-auth";
import { TradingFoxApiError, TradingFoxConfigError } from "./tradingfox-control-plane/types";
import type {
  CompleteHyperliquidAgentBindingInput,
  CreateConnectorInput,
  CreateCopyStrategyInput,
  CreateHyperliquidAgentBindingInput,
  CreateMockConnectorInput,
  SyncCopyStrategyPositionsInput,
  TradingFoxAccountResponse,
  TradingFoxAccountStatus,
  TradingFoxConnector,
  TradingFoxConnectorWhitelistIP,
  TradingFoxCopyStrategy,
  TradingFoxCopyStrategyDetailInput,
  TradingFoxHyperliquidAgentBindingCompleteResponse,
  TradingFoxHyperliquidAgentBindingStartResponse,
  TradingFoxIPAddress,
  TradingFoxOrderHistory,
  TradingFoxPosition,
  TradingFoxRuntimeStatus,
  TradingFoxRuntimeStatusResponse,
  TradingFoxSignalSource,
  TradingFoxStrategyCurve,
  TradingFoxStrategyDetail,
  TradingFoxTrader,
} from "./tradingfox-control-plane/types";
import {
  normalizeNonNegativeInteger,
  normalizePositiveInteger,
} from "./tradingfox-control-plane/normalizers";
export { TradingFoxApiError, TradingFoxConfigError } from "./tradingfox-control-plane/types";
export type {
  CompleteHyperliquidAgentBindingInput,
  CreateConnectorInput,
  CreateCopyStrategyInput,
  CreateHyperliquidAgentBindingInput,
  CreateMockConnectorInput,
  SyncCopyStrategyPositionsInput,
  TradingFoxAccountResponse,
  TradingFoxAccountStatus,
  TradingFoxConnector,
  TradingFoxConnectorWhitelistIP,
  TradingFoxCopyStrategy,
  TradingFoxCopyStrategyDetailInput,
  TradingFoxHyperliquidAgentBinding,
  TradingFoxHyperliquidAgentBindingCompleteResponse,
  TradingFoxHyperliquidAgentBindingStartResponse,
  TradingFoxHyperliquidSigningAction,
  TradingFoxHyperliquidTypedData,
  TradingFoxIPAddress,
  TradingFoxOrderHistory,
  TradingFoxPosition,
  TradingFoxRuntimeStatus,
  TradingFoxSignalSource,
  TradingFoxStrategyCurve,
  TradingFoxStrategyCurvePoint,
  TradingFoxStrategyDetail,
  TradingFoxTrader,
} from "./tradingfox-control-plane/types";

import {
  applyTradingFoxOrderHistoryPage,
  enrichTradingFoxOrderHistorySignalSourcePrices,
  normalizeTradingFoxOrderHistoryPage,
} from "./tradingfox-control-plane/order-history";

const DEFAULT_TRADINGFOX_CONTROL_PLANE_API_BASE_URL = "https://api.smartkline.com/tradingfox-trader";
const DEFAULT_MOCK_MARGIN_BALANCE = 10_000;
const DEFAULT_DEMO_EXCHANGE_PLATFORM = "Mock";
const TRADINGFOX_COPY_STRATEGY_DEFINITION_ID = "COPY_TRADING";
const TRADINGFOX_ACTION_SYNC_POSITIONS = "sync_positions";
type TradingFoxDemoExchangePlatform = "Mock" | "Binance";
type TradingFoxLiveExchangePlatform = "Aster" | "Binance" | "Bitget" | "Bybit" | "Gate" | "HyperLiquid" | "OKX";

type TradingFoxAccountStatusResponse = {
  account?: TradingFoxAccountStatus | null;
  accountSnapshots?: unknown;
  account_snapshots?: unknown;
  curve?: unknown;
  data?: unknown;
  items?: unknown;
  performanceCurve?: unknown;
  performance_curve?: unknown;
  points?: unknown;
  snapshots?: unknown;
  strategyCurve?: unknown;
  strategy_curve?: unknown;
  updatedAt?: unknown;
  updated_at?: unknown;
};


export async function getTradingFoxAccount(session: TelegramAuthSession): Promise<TradingFoxAccountResponse> {
  const userId = tradingFoxUserIdFromSession(session);
  const [connectors, traders] = await Promise.all([
    tradingFoxRequest<{ items: TradingFoxConnector[] }>(`/v1/exchange-connectors?userId=${userId}&dead=false`),
    tradingFoxRequest<{ items: TradingFoxTrader[] }>(tradingFoxCopyTradersPath(userId)),
  ]);
  const activeConnectors = pickActiveConnectors(connectors.items);
  const connectorById = new Map(activeConnectors.map((connector) => [connector.id, connector]));
  const accountEquityByConnectorId = await getTradingFoxConnectorAccountEquityById(activeConnectors);
  const strategies = await Promise.all(traders.items.map(async (trader) => {
    const connector = connectorById.get(trader.exchangeConnectorId) ?? null;
    const strategy = mapCopyStrategy(trader, connector);
    if (!strategy) {
      return null;
    }

    const [accountStatus, positions] = await Promise.all([
      settleTradingFoxRequest<TradingFoxAccountStatusResponse>(`/v1/traders/${trader.id}/account-status`),
      settleTradingFoxRequest<{ items: TradingFoxPosition[] }>(`/v1/traders/${trader.id}/positions`),
    ]);
    const accountEquity = accountStatus.value?.account?.equity;
    if (typeof accountEquity === "number" && Number.isFinite(accountEquity)) {
      accountEquityByConnectorId.set(trader.exchangeConnectorId, accountEquity);
    }

    return {
      ...strategy,
      accountEquity: accountStatus.value?.account?.equity,
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

async function getTradingFoxConnectorAccountEquityById(
  connectors: readonly TradingFoxConnector[],
): Promise<Map<number, number>> {
  const entries = await Promise.all(connectors.map(async (connector) => {
    const accountStatus = await settleTradingFoxRequest<TradingFoxAccountStatusResponse>(
      `/v1/exchange-connectors/${connector.id}/account-status`,
    );
    const accountEquity = accountStatus.value?.account?.equity;
    return typeof accountEquity === "number" && Number.isFinite(accountEquity)
      ? ([connector.id, accountEquity] as const)
      : null;
  }));

  return new Map(entries.filter((entry): entry is readonly [number, number] => entry !== null));
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
      enableSltpMonitoring: true,
      exchangeConnectorId: connector.id,
      name: traderName,
      strategyDefinitionId: TRADINGFOX_COPY_STRATEGY_DEFINITION_ID,
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

  if (trader.userId !== userId || !isCopyTradingTrader(trader)) {
    throw new TradingFoxApiError("Copy strategy not found.", 404);
  }

  if (status === "running") {
    await ensureCopyStrategyConnectorPositionMode(await getConnectorForUser(trader.exchangeConnectorId, userId));
    await tradingFoxRequest<TradingFoxRuntimeStatusResponse>(`/v1/traders/${traderId}/start`, {
      body: JSON.stringify({ enableSltpMonitoring: true, startType: "manual_start" }),
      method: "POST",
    });
  } else {
    await tradingFoxRequest<TradingFoxRuntimeStatusResponse>(`/v1/traders/${traderId}/stop`, {
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

  if (trader.userId !== userId || !isCopyTradingTrader(trader)) {
    throw new TradingFoxApiError("Copy strategy not found.", 404);
  }

  if (trader.enabled) {
    await tradingFoxRequest<TradingFoxRuntimeStatusResponse>(`/v1/traders/${traderId}/stop`, {
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

  if (trader.userId !== userId || !isCopyTradingTrader(trader)) {
    throw new TradingFoxApiError("Copy strategy not found.", 404);
  }

  const connector = account.connectors.find((item) => item.id === trader.exchangeConnectorId) ?? account.connector;
  const mappedStrategy = mapCopyStrategy(trader, connector);
  if (!mappedStrategy) {
    throw new TradingFoxApiError("Copy strategy not found.", 404);
  }
  const accountStrategy = account.strategies.find((item) => item.id === String(trader.id));
  const strategy = accountStrategy
    ? {
      ...mappedStrategy,
      accountEquity: accountStrategy.accountEquity,
      status: accountStrategy.status,
      unrealizedPnl: accountStrategy.unrealizedPnl,
    }
    : mappedStrategy;

  const [accountStatus, positions, signalSources, orderHistory, strategyCurveResponse] = await Promise.all([
    settleTradingFoxRequest<TradingFoxAccountStatusResponse>(`/v1/traders/${traderId}/account-status`),
    settleTradingFoxRequest<{ items: TradingFoxPosition[] }>(`/v1/traders/${traderId}/positions`),
    settleTradingFoxRequest<{ items: TradingFoxSignalSource[] }>(`/v1/traders/${traderId}/signal-source-positions`),
    settleTradingFoxRequest<TradingFoxOrderHistory>(
      `/v1/traders/${traderId}/orders?limit=${orderHistoryPage.fetchLimit}`,
    ),
    settleTradingFoxStrategyCurveRequest(traderId),
  ]);

  const signalSourceItems = signalSources.value?.items ?? [];
  const normalizedOrderHistory = orderHistory.value
    ? applyTradingFoxOrderHistoryPage(orderHistory.value, orderHistoryPage, strategy.startedAt)
    : null;
  const accountInitialEquity = connector && !isBinanceDemoConnector(connector) ? connector.mockMarginBalance : undefined;
  const strategyCurve = adaptTradingFoxStrategyCurve(
    readTradingFoxStrategyCurvePayload(strategyCurveResponse.value, accountStatus.value, trader),
    {
      baseEquity: accountInitialEquity,
    },
  );

  return {
    account: accountStatus.value?.account ?? null,
    accountError: accountStatus.error,
    accountInitialEquity,
    orderHistory: normalizedOrderHistory
      ? enrichTradingFoxOrderHistorySignalSourcePrices(normalizedOrderHistory, signalSourceItems)
      : null,
    orderHistoryError: orderHistory.error,
    positions: positions.value?.items ?? [],
    positionsError: positions.error,
    signalSources: signalSourceItems,
    signalSourcesError: signalSources.error,
    strategyCurve,
    strategyCurveError: strategyCurve ? undefined : normalizeTradingFoxStrategyCurveError(strategyCurveResponse.error),
    strategy,
    trader,
  };
}

async function settleTradingFoxStrategyCurveRequest(
  traderId: number,
): Promise<{ error?: string; value?: unknown }> {
  const primaryResponse = await settleTradingFoxRequest<unknown>(`/v1/traders/${traderId}/strategy-curve?limit=240`);
  if (primaryResponse.value !== undefined) {
    return primaryResponse;
  }

  const performanceResponse = await settleTradingFoxRequest<unknown>(`/v1/traders/${traderId}/performance-curve?limit=240`);
  if (performanceResponse.value !== undefined) {
    return performanceResponse;
  }

  const snapshotResponse = await settleTradingFoxRequest<unknown>(`/v1/traders/${traderId}/account-snapshots?limit=240`);
  return snapshotResponse.value !== undefined ? snapshotResponse : primaryResponse;
}

function normalizeTradingFoxStrategyCurveError(error: string | undefined): string | undefined {
  if (!error) {
    return undefined;
  }

  return /(?:not found|route not found)/iu.test(error) ? undefined : error;
}

function readTradingFoxStrategyCurvePayload(...sources: readonly unknown[]): unknown {
  for (const source of sources) {
    const payload = readTradingFoxStrategyCurvePayloadFromSource(source);
    if (payload !== undefined) {
      return payload;
    }
  }

  return undefined;
}

function readTradingFoxStrategyCurvePayloadFromSource(source: unknown): unknown {
  if (!isRecord(source)) {
    return Array.isArray(source) ? source : undefined;
  }

  const candidates = [
    source.strategyCurve,
    source.strategy_curve,
    source.performanceCurve,
    source.performance_curve,
    source.accountSnapshots,
    source.account_snapshots,
    source.snapshots,
    source.curve,
    source.points,
    source.items,
    source.data,
  ];
  return candidates.find((candidate) => candidate !== undefined && candidate !== null);
}

function adaptTradingFoxStrategyCurve(
  payload: unknown,
  options: {
    baseEquity?: number;
  },
): TradingFoxStrategyCurve | null {
  const pointSources = readTradingFoxStrategyCurvePointSources(payload);
  const rawPoints = [...pointSources.combined, ...pointSources.roi, ...pointSources.pnl];
  const explicitBaseEquity = readTradingFoxCurveBaseEquity(payload);
  const baseEquity = positiveNumberOrNull(explicitBaseEquity)
    ?? positiveNumberOrNull(options.baseEquity)
    ?? firstPositiveEquity(rawPoints);

  const pointsByTimestamp = new Map<string, TradingFoxStrategyCurve["points"][number]>();
  for (const point of pointSources.combined) {
    mergeTradingFoxStrategyCurvePoint(pointsByTimestamp, normalizeTradingFoxStrategyCurvePoint(point, "combined", baseEquity));
  }
  for (const point of pointSources.roi) {
    mergeTradingFoxStrategyCurvePoint(pointsByTimestamp, normalizeTradingFoxStrategyCurvePoint(point, "roi", baseEquity));
  }
  for (const point of pointSources.pnl) {
    mergeTradingFoxStrategyCurvePoint(pointsByTimestamp, normalizeTradingFoxStrategyCurvePoint(point, "pnl", baseEquity));
  }

  const points = Array.from(pointsByTimestamp.values())
    .filter((point) => point.roi !== null || point.pnl !== null)
    .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));
  if (points.length === 0) {
    return null;
  }

  return {
    ...(baseEquity !== null ? { baseEquity } : {}),
    currency: readTradingFoxCurveCurrency(payload) ?? points.find((point) => point.currency)?.currency,
    points,
    updatedAt: readTradingFoxCurveUpdatedAt(payload)
      ?? points[points.length - 1]?.timestamp
      ?? new Date().toISOString(),
  };
}

function readTradingFoxStrategyCurvePointSources(payload: unknown): {
  combined: Record<string, unknown>[];
  pnl: Record<string, unknown>[];
  roi: Record<string, unknown>[];
} {
  if (Array.isArray(payload)) {
    return {
      combined: payload.filter(isRecord),
      pnl: [],
      roi: [],
    };
  }

  if (!isRecord(payload)) {
    return {
      combined: [],
      pnl: [],
      roi: [],
    };
  }

  return {
    combined: firstRecordList(payload.points, payload.items, payload.curve, payload.snapshots, payload.accountSnapshots, payload.account_snapshots, payload.data),
    pnl: firstRecordList(payload.pnlCurve, payload.pnl_curve, payload.pnlPoints, payload.pnl_points),
    roi: firstRecordList(payload.roiCurve, payload.roi_curve, payload.roiPoints, payload.roi_points, payload.returnCurve, payload.return_curve),
  };
}

function normalizeTradingFoxStrategyCurvePoint(
  point: Record<string, unknown>,
  metric: "combined" | "pnl" | "roi",
  baseEquity: number | null,
): TradingFoxStrategyCurve["points"][number] | null {
  const timestamp = normalizeTradingFoxCurveTimestamp(
    point.timestamp
      ?? point.time
      ?? point.statTime
      ?? point.stat_time
      ?? point.createdAt
      ?? point.created_at
      ?? point.snapshotTime
      ?? point.snapshot_time
      ?? point.date,
  );
  if (!timestamp) {
    return null;
  }

  const pointMetric = readTradingFoxCurvePointMetric(point) ?? metric;
  const equity = numberOrNull(point.equity ?? point.accountEquity ?? point.account_equity ?? point.marginBalance ?? point.margin_balance);
  const explicitPnl = readTradingFoxCurvePnl(point, pointMetric);
  const pnl = pointMetric === "roi" ? null : explicitPnl ?? calculateTradingFoxCurvePnlFromEquity(equity, baseEquity);
  const explicitRoi = readTradingFoxCurveRoi(point, pointMetric);
  const roi = pointMetric === "pnl" ? null : explicitRoi ?? calculateTradingFoxCurveRoi(pnl, baseEquity);
  const currency = normalizeOptionalText(point.currency ?? point.asset ?? point.quoteAsset ?? point.quote_asset);

  return {
    ...(currency ? { currency } : {}),
    equity,
    pnl,
    roi,
    timestamp,
  };
}

function readTradingFoxCurvePointMetric(point: Record<string, unknown>): "pnl" | "roi" | null {
  const metric = normalizeOptionalText(point.metric ?? point.dataType ?? point.data_type ?? point.type).toLowerCase();
  if (metric.includes("roi") || metric.includes("return")) {
    return "roi";
  }
  if (metric.includes("pnl") || metric.includes("profit")) {
    return "pnl";
  }
  return null;
}

function mergeTradingFoxStrategyCurvePoint(
  pointsByTimestamp: Map<string, TradingFoxStrategyCurve["points"][number]>,
  point: TradingFoxStrategyCurve["points"][number] | null,
): void {
  if (!point) {
    return;
  }

  const currentPoint = pointsByTimestamp.get(point.timestamp);
  if (!currentPoint) {
    pointsByTimestamp.set(point.timestamp, point);
    return;
  }

  pointsByTimestamp.set(point.timestamp, {
    currency: currentPoint.currency ?? point.currency,
    equity: currentPoint.equity ?? point.equity,
    pnl: currentPoint.pnl ?? point.pnl,
    roi: currentPoint.roi ?? point.roi,
    timestamp: point.timestamp,
  });
}

function firstRecordList(...values: readonly unknown[]): Record<string, unknown>[] {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }

    const nestedPayload = readTradingFoxStrategyCurvePayloadFromSource(value);
    if (Array.isArray(nestedPayload)) {
      return nestedPayload.filter(isRecord);
    }
  }

  return [];
}

function readTradingFoxCurvePnl(point: Record<string, unknown>, metric: "combined" | "pnl" | "roi"): number | null {
  const realizedPnl = numberOrNull(point.realizedPnl ?? point.realized_pnl);
  const unrealizedPnl = numberOrNull(point.unrealizedPnl ?? point.unrealized_pnl ?? point.unPnl ?? point.un_pnl);
  const combinedPnl = realizedPnl !== null || unrealizedPnl !== null
    ? (realizedPnl ?? 0) + (unrealizedPnl ?? 0)
    : null;

  const pnl = numberOrNull(
    point.pnl
      ?? point.pnlAmount
      ?? point.pnl_amount
      ?? point.totalPnl
      ?? point.total_pnl
      ?? point.profit
      ?? point.profitAmount
      ?? point.profit_amount,
  ) ?? combinedPnl;

  return pnl ?? (metric === "pnl" ? numberOrNull(point.value) : null);
}

function readTradingFoxCurveRoi(point: Record<string, unknown>, metric: "combined" | "pnl" | "roi"): number | null {
  const percentValue = firstNumberOrNull(
    point.roiPercent,
    point.roi_percent,
    point.returnPercent,
    point.return_percent,
    point.pnlPercent,
    point.pnl_percent,
  );
  if (percentValue !== null) {
    return percentValue;
  }

  const rateValue = firstTradingFoxCurveRateAsPercent(
    point.roi,
    point.returnRate,
    point.return_rate,
    point.pnlRate,
    point.pnl_rate,
    point.profitRate,
    point.profit_rate,
  );
  if (rateValue !== null) {
    return rateValue;
  }

  return metric === "roi" ? normalizeTradingFoxCurveRateAsPercent(point.value) : null;
}

function calculateTradingFoxCurvePnlFromEquity(equity: number | null, baseEquity: number | null): number | null {
  if (equity === null || baseEquity === null) {
    return null;
  }
  return equity - baseEquity;
}

function calculateTradingFoxCurveRoi(pnl: number | null, baseEquity: number | null): number | null {
  if (pnl === null || baseEquity === null || baseEquity <= 0) {
    return null;
  }
  return (pnl / baseEquity) * 100;
}

function readTradingFoxCurveBaseEquity(payload: unknown): number | null {
  if (!isRecord(payload)) {
    return null;
  }

  return numberOrNull(payload.baseEquity ?? payload.base_equity ?? payload.initialEquity ?? payload.initial_equity);
}

function readTradingFoxCurveCurrency(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  return normalizeOptionalText(payload.currency ?? payload.asset ?? payload.quoteAsset ?? payload.quote_asset) || undefined;
}

function readTradingFoxCurveUpdatedAt(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  return normalizeTradingFoxCurveTimestamp(payload.updatedAt ?? payload.updated_at) ?? undefined;
}

function firstNumberOrNull(...values: readonly unknown[]): number | null {
  for (const value of values) {
    const number = numberOrNull(value);
    if (number !== null) {
      return number;
    }
  }

  return null;
}

function firstTradingFoxCurveRateAsPercent(...values: readonly unknown[]): number | null {
  for (const value of values) {
    const normalizedValue = normalizeTradingFoxCurveRateAsPercent(value);
    if (normalizedValue !== null) {
      return normalizedValue;
    }
  }

  return null;
}

function normalizeTradingFoxCurveRateAsPercent(value: unknown): number | null {
  const number = numberOrNull(value);
  if (number === null) {
    return null;
  }

  /**
   * Trading backends often expose ROI/rate fields as ratios while percent-suffixed
   * fields are already percentages. The strategy detail UI formats percent units,
   * so ratio-looking values are normalized before rendering.
   */
  return typeof value === "string" && value.trim().endsWith("%")
    ? number
    : Math.abs(number) <= 1
      ? number * 100
      : number;
}

function firstPositiveEquity(points: readonly Record<string, unknown>[]): number | null {
  for (const point of points) {
    const equity = positiveNumberOrNull(point.equity ?? point.accountEquity ?? point.account_equity ?? point.marginBalance ?? point.margin_balance);
    if (equity !== null) {
      return equity;
    }
  }

  return null;
}

function normalizeTradingFoxCurveTimestamp(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = Math.abs(value) < 1_000_000_000_000 ? value * 1_000 : value;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const trimmedValue = value.trim();
  const numericValue = Number(trimmedValue);
  if (Number.isFinite(numericValue)) {
    return normalizeTradingFoxCurveTimestamp(numericValue);
  }

  const date = new Date(trimmedValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
  if (trader.userId !== userId || !isCopyTradingTrader(trader)) {
    throw new TradingFoxApiError("Copy strategy not found.", 404);
  }

  await ensureCopyStrategyConnectorPositionMode(await getConnectorForUser(trader.exchangeConnectorId, userId));

  await tradingFoxRequest<TradingFoxRuntimeStatusResponse & { result?: Record<string, unknown> }>(
    `/v1/traders/${traderId}/actions/${TRADINGFOX_ACTION_SYNC_POSITIONS}`,
    {
      body: JSON.stringify({ payload: { ratioPercent } }),
      method: "POST",
    },
  );

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

function tradingFoxCopyTradersPath(userId: number): string {
  const query = new URLSearchParams({
    strategyDefinitionId: TRADINGFOX_COPY_STRATEGY_DEFINITION_ID,
    userId: String(userId),
  });
  return `/v1/traders?${query.toString()}`;
}

function isCopyTradingTrader(trader: TradingFoxTrader): boolean {
  return normalizeStrategyDefinitionId(trader.strategyDefinitionId) === TRADINGFOX_COPY_STRATEGY_DEFINITION_ID;
}

function normalizeStrategyDefinitionId(value: unknown): string {
  return normalizeOptionalText(value).toUpperCase();
}

function mapCopyStrategy(trader: TradingFoxTrader, connector: TradingFoxConnector | null): TradingFoxCopyStrategy | null {
  if (!isCopyTradingTrader(trader)) {
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
    startedAt: stringValue(signalSourceConfig?.startTime) || trader.createdAt,
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

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "string" && value.trim().endsWith("%")) {
    const number = Number(value.trim().replace(/%$/u, ""));
    return Number.isFinite(number) ? number : null;
  }

  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveNumberOrNull(value: unknown): number | null {
  const number = numberOrNull(value);
  return number !== null && number > 0 ? number : null;
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
