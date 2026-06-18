import type { TelegramAuthSession } from "@/lib/auth/telegram-auth";
import { getTradingFoxAccount } from "./account";
import { countTradingFoxTraderOrders, sumTradingFoxUnrealizedPnl } from "./account";
import { getConnectorForUser, ensureCopyStrategyConnectorPositionMode, isBinanceDemoConnector } from "./connectors";
import { TRADINGFOX_ACTION_SYNC_POSITIONS, TRADINGFOX_COPY_STRATEGY_DEFINITION_ID, TRADINGFOX_STRATEGY_CURVE_WINDOW_SET, TRADINGFOX_STRATEGY_DETAIL_SECTION_SET, TRADINGFOX_STRATEGY_DETAIL_SECTIONS, type TradingFoxAccountStatusResponse } from "./constants";
import { settledTradingFoxSkipped, settleTradingFoxRequest, tradingFoxRequest, tradingFoxUserIdFromSession } from "./http";
import { normalizePositiveInteger } from "./normalizers";
import { applyTradingFoxOrderHistoryPage, enrichTradingFoxOrderHistorySignalSourcePrices, normalizeTradingFoxOrderHistoryPage } from "./order-history";
import { validateTradingFoxStrategyConfig } from "./strategy-definitions";
import { adaptTradingFoxStrategyCurve, normalizeTradingFoxStrategyCurveError, readTradingFoxStrategyCurvePayload, settleTradingFoxStrategyCurveRequest } from "./strategy-curve";
import { createTradingFoxCopyStrategyConfig, ensureTradingFoxCopyStrategyConfigEnvelope, isCopyTradingTrader, mapTradingFoxStrategy, resolveCopyStrategyTakeProfitMargin } from "./strategy-config";
import { TradingFoxApiError } from "./types";
import type {
  CreateCopyStrategyInput,
  CreateTradingFoxStrategyInput,
  SyncCopyStrategyPositionsInput,
  TradingFoxAccountResponse,
  TradingFoxCopyStrategy,
  TradingFoxCopyStrategyCurveWindow,
  TradingFoxCopyStrategyDetailInput,
  TradingFoxOrderHistory,
  TradingFoxPosition,
  TradingFoxRuntimeStatus,
  TradingFoxRuntimeStatusResponse,
  TradingFoxSignalSource,
  TradingFoxStrategyDetail,
  TradingFoxStrategyDetailSection,
  TradingFoxTrader,
} from "./types";
import { isRecord, normalizeOptionalText, normalizePositiveNumber, parsePositiveInteger, requireText, stringValue } from "./value-utils";

type TradingFoxCopyStrategyContext = {
  accountInitialEquity: number | undefined;
  strategy: TradingFoxCopyStrategy;
  trader: TradingFoxTrader;
};

export async function createTradingFoxStrategy(
  session: TelegramAuthSession,
  input: CreateTradingFoxStrategyInput,
): Promise<TradingFoxAccountResponse> {
  const strategyDefinitionId = requireText(input.strategyDefinitionId, "strategyDefinitionId");
  const copyTradingInput = isRecord(input.copyTrading) ? input.copyTrading : null;
  if (strategyDefinitionId === TRADINGFOX_COPY_STRATEGY_DEFINITION_ID && copyTradingInput) {
    return createTradingFoxCopyStrategy(session, {
      exchangeConnectorId: input.exchangeConnectorId,
      eventsCount: numberOrUndefined(copyTradingInput.eventsCount),
      platform: stringValue(copyTradingInput.platform),
      positionsCount: numberOrUndefined(copyTradingInput.positionsCount),
      signalSourceId: requireText(copyTradingInput.signalSourceId, "signalSourceId"),
      stopLossPercent: normalizePositiveNumber(copyTradingInput.stopLossPercent) ?? 10,
      strategyName: input.strategyName,
      takeProfitPercent: normalizePositiveNumber(copyTradingInput.takeProfitPercent) ?? 20,
      traderName: requireText(copyTradingInput.traderName, "traderName"),
      avatarUrl: stringValue(copyTradingInput.avatarUrl),
    });
  }

  const userId = tradingFoxUserIdFromSession(session);
  const account = await getTradingFoxAccount(session);
  const requestedConnectorId = normalizePositiveInteger(input.exchangeConnectorId);
  const connector = requestedConnectorId
    ? account.connectors.find((item) => item.id === requestedConnectorId) ?? null
    : account.connector;
  if (!connector) {
    throw new TradingFoxApiError("Add an exchange account before creating a strategy.", 409);
  }

  const strategyName = requireText(input.strategyName, "strategyName");
  if (!isRecord(input.config)) {
    throw new TradingFoxApiError("config is required.", 400);
  }
  const config = input.config;
  const configSchemaVersion = normalizePositiveInteger(input.configSchemaVersion);
  await validateTradingFoxStrategyConfig({
    config,
    configSchemaVersion,
    strategyDefinitionId,
  });

  const body: Record<string, unknown> = {
    autoStart: booleanValue(input.autoStart, true),
    config,
    exchangeConnectorId: connector.id,
    name: strategyName,
    strategyDefinitionId,
    userId,
  };
  if (configSchemaVersion !== undefined) {
    body.configSchemaVersion = configSchemaVersion;
  }
  const enableSltpMonitoring = booleanValue(input.enableSltpMonitoring, false);
  if (enableSltpMonitoring) {
    body.enableSltpMonitoring = true;
  }

  await tradingFoxRequest<{ trader: TradingFoxTrader; runtimeStatus?: TradingFoxRuntimeStatus }>("/v1/traders", {
    body: JSON.stringify(body),
    method: "POST",
  });

  return getTradingFoxAccount(session);
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
  const signalSourceName = requireText(input.traderName, "traderName");
  const strategyName = normalizeOptionalText(input.strategyName) || signalSourceName;
  const takeProfitPercent = normalizePositiveNumber(input.takeProfitPercent) ?? 20;
  const stopLossPercent = normalizePositiveNumber(input.stopLossPercent) ?? 10;
  const takeProfitMargin = await resolveCopyStrategyTakeProfitMargin(connector, takeProfitPercent);
  const config = createTradingFoxCopyStrategyConfig({
    signalSourceId,
    stopLossPercent,
    takeProfitMargin,
    takeProfitPercent,
  });

  await tradingFoxRequest<{ trader: TradingFoxTrader; runtimeStatus?: TradingFoxRuntimeStatus }>("/v1/traders", {
    body: JSON.stringify({
      autoStart: true,
      config,
      configSchemaVersion: 1,
      enableSltpMonitoring: true,
      exchangeConnectorId: connector.id,
      name: strategyName,
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

  if (trader.userId !== userId) {
    throw new TradingFoxApiError("Strategy not found.", 404);
  }

  if (status === "running") {
    const connector = await getConnectorForUser(trader.exchangeConnectorId, userId);
    const startBody: Record<string, unknown> = { startType: "manual_start" };
    if (isCopyTradingTrader(trader)) {
      await ensureTradingFoxCopyStrategyConfigEnvelope(trader, connector);
      await ensureCopyStrategyConnectorPositionMode(connector);
      startBody.enableSltpMonitoring = true;
    }
    await tradingFoxRequest<TradingFoxRuntimeStatusResponse>(`/v1/traders/${traderId}/start`, {
      body: JSON.stringify(startBody),
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

  if (trader.userId !== userId) {
    throw new TradingFoxApiError("Strategy not found.", 404);
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
  const orderHistoryPage = normalizeTradingFoxOrderHistoryPage(input);
  const sections = normalizeTradingFoxStrategyDetailSections(input.sections);
  const curveWindow = normalizeTradingFoxStrategyCurveWindow(input.curveWindow);
  const traderId = parsePositiveInteger(strategyId, "strategyId");
  const context = await getTradingFoxCopyStrategyContext(session, traderId);
  const { accountInitialEquity, strategy: baseStrategy, trader } = context;

  const [accountStatus, positions, signalSources, orderHistory, strategyCurveResponse] = await Promise.all([
    sections.has("account")
      ? settleTradingFoxRequest<TradingFoxAccountStatusResponse>(`/v1/traders/${traderId}/account-status`)
      : settledTradingFoxSkipped<TradingFoxAccountStatusResponse>(),
    sections.has("positions")
      ? settleTradingFoxRequest<{ items: TradingFoxPosition[] }>(`/v1/traders/${traderId}/positions`)
      : settledTradingFoxSkipped<{ items: TradingFoxPosition[] }>(),
    sections.has("signalSources")
      ? settleTradingFoxRequest<{ items: TradingFoxSignalSource[] }>(`/v1/traders/${traderId}/signal-source-positions`)
      : settledTradingFoxSkipped<{ items: TradingFoxSignalSource[] }>(),
    sections.has("orders")
      ? settleTradingFoxRequest<TradingFoxOrderHistory>(
        `/v1/traders/${traderId}/orders?limit=${orderHistoryPage.fetchLimit}`,
      )
      : settledTradingFoxSkipped<TradingFoxOrderHistory>(),
    sections.has("curve")
      ? settleTradingFoxStrategyCurveRequest(traderId, curveWindow)
      : settledTradingFoxSkipped<unknown>(),
  ]);

  const signalSourceItems = signalSources.value?.items ?? [];
  const normalizedOrderHistory = orderHistory.value
    ? applyTradingFoxOrderHistoryPage(orderHistory.value, orderHistoryPage, baseStrategy.startedAt)
    : null;
  const strategyCurve = adaptTradingFoxStrategyCurve(
    readTradingFoxStrategyCurvePayload(strategyCurveResponse.value, sections.has("account") ? accountStatus.value : undefined, trader),
    {
      baseEquity: accountInitialEquity,
    },
  );
  const positionItems = positions.value?.items ?? [];
  const strategy: TradingFoxCopyStrategy = {
    ...baseStrategy,
    accountEquity: accountStatus.value?.account?.equity ?? baseStrategy.accountEquity,
    eventsCount: normalizedOrderHistory ? countTradingFoxTraderOrders(normalizedOrderHistory) : baseStrategy.eventsCount,
    positionsCount: sections.has("positions") ? positionItems.length : baseStrategy.positionsCount,
    unrealizedPnl: sections.has("positions") ? sumTradingFoxUnrealizedPnl(positions.value) : baseStrategy.unrealizedPnl,
  };

  return {
    account: accountStatus.value?.account ?? null,
    accountError: sections.has("account") ? accountStatus.error : undefined,
    accountInitialEquity,
    loadedSections: [...sections],
    orderHistory: normalizedOrderHistory
      ? enrichTradingFoxOrderHistorySignalSourcePrices(normalizedOrderHistory, signalSourceItems)
      : null,
    orderHistoryError: sections.has("orders") ? orderHistory.error : undefined,
    positions: positionItems,
    positionsError: sections.has("positions") ? positions.error : undefined,
    signalSources: signalSourceItems,
    signalSourcesError: sections.has("signalSources") ? signalSources.error : undefined,
    strategyCurve,
    strategyCurveError: sections.has("curve") && !strategyCurve ? normalizeTradingFoxStrategyCurveError(strategyCurveResponse.error) : undefined,
    strategy,
    trader,
  };
}

async function getTradingFoxCopyStrategyContext(
  session: TelegramAuthSession,
  traderId: number,
): Promise<TradingFoxCopyStrategyContext> {
  const userId = tradingFoxUserIdFromSession(session);
  const trader = await tradingFoxRequest<TradingFoxTrader>(`/v1/traders/${traderId}`);

  if (trader.userId !== userId) {
    throw new TradingFoxApiError("Strategy not found.", 404);
  }

  const connector = await getConnectorForUser(trader.exchangeConnectorId, userId);
  const strategy = mapTradingFoxStrategy(trader, connector);
  if (!strategy) {
    throw new TradingFoxApiError("Strategy not found.", 404);
  }

  return {
    accountInitialEquity: !isBinanceDemoConnector(connector) ? connector.mockMarginBalance : undefined,
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

function normalizeTradingFoxStrategyCurveWindow(value: unknown): TradingFoxCopyStrategyCurveWindow {
  const normalized = normalizeOptionalText(value).toLowerCase();
  if (TRADINGFOX_STRATEGY_CURVE_WINDOW_SET.has(normalized as TradingFoxCopyStrategyCurveWindow)) {
    return normalized as TradingFoxCopyStrategyCurveWindow;
  }

  return "30d";
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  return fallback;
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeTradingFoxStrategyDetailSections(value: unknown): Set<TradingFoxStrategyDetailSection> {
  if (value === undefined || value === null || value === "") {
    return new Set(TRADINGFOX_STRATEGY_DETAIL_SECTIONS);
  }

  const rawSections = Array.isArray(value) ? value : String(value).split(",");
  const sections = new Set<TradingFoxStrategyDetailSection>();

  for (const rawSection of rawSections) {
    const section = String(rawSection).trim();
    if (!section) {
      continue;
    }
    if (section === "all") {
      return new Set(TRADINGFOX_STRATEGY_DETAIL_SECTIONS);
    }
    if (!TRADINGFOX_STRATEGY_DETAIL_SECTION_SET.has(section as TradingFoxStrategyDetailSection)) {
      throw new TradingFoxApiError(`Unsupported strategy detail section: ${section}.`, 400);
    }
    sections.add(section as TradingFoxStrategyDetailSection);
  }

  return sections.size > 0 ? sections : new Set(TRADINGFOX_STRATEGY_DETAIL_SECTIONS);
}
