import type { TelegramAuthSession } from "@/lib/auth/telegram-auth";
import { getTradingFoxAccount } from "./account";
import { ensureCopyStrategyConnectorPositionMode, getConnectorForUser } from "./connectors";
import { tradingFoxRequest, tradingFoxUserIdFromSession } from "./http";
import { normalizePositiveInteger } from "./normalizers";
import { validateTradingFoxStrategyConfig } from "./strategy-definitions";
import {
  createTradingFoxCopyStrategyConfig,
  firstSignalSourceConfig,
  isCopyTradingTrader,
  normalizeCopyStrategyDefinitionConfigForWrite,
  resolveCopyStrategyTakeProfitMargin,
  signalSourceConfigsFromCopyStrategyConfig,
  signalSourceIdFromConfig,
} from "./strategy-config";
import { TradingFoxApiError } from "./types";
import type {
  TradingFoxAccountResponse,
  TradingFoxRuntimeStatus,
  TradingFoxTrader,
  UpdateCopyStrategySettingsInput,
} from "./types";
import {
  isRecord,
  normalizeOptionalText,
  normalizePositiveNumber,
  parsePositiveInteger,
  recordValue,
  requireText,
  stringValue,
} from "./value-utils";

type TradingFoxTraderPatchResponse = {
  runtimeStatus?: TradingFoxRuntimeStatus;
  trader?: TradingFoxTrader;
};

export async function updateTradingFoxTraderSettings(
  session: TelegramAuthSession,
  strategyId: string,
  input: UpdateCopyStrategySettingsInput,
): Promise<TradingFoxAccountResponse> {
  const userId = tradingFoxUserIdFromSession(session);
  const traderId = parsePositiveInteger(strategyId, "strategyId");
  const trader = await tradingFoxRequest<TradingFoxTrader>(`/v1/traders/${traderId}`);

  if (trader.userId !== userId) {
    throw new TradingFoxApiError("Strategy not found.", 404);
  }

  const strategyName = requireText(input.strategyName, "strategyName");
  if (input.config !== undefined) {
    return updateDefinitionDrivenTraderConfig(session, trader, strategyName, input);
  }

  if (!isCopyTradingTrader(trader)) {
    await patchTrader(traderId, { name: strategyName });
    return getTradingFoxAccount(session);
  }

  return updateLegacyCopyStrategySettings(session, trader, strategyName, input);
}

export const updateTradingFoxCopyStrategySettings = updateTradingFoxTraderSettings;

async function updateDefinitionDrivenTraderConfig(
  session: TelegramAuthSession,
  trader: TradingFoxTrader,
  strategyName: string,
  input: UpdateCopyStrategySettingsInput,
): Promise<TradingFoxAccountResponse> {
  if (!isRecord(input.config)) {
    throw new TradingFoxApiError("config is required.", 400);
  }

  const requestedDefinitionId = normalizeOptionalText(input.strategyDefinitionId);
  if (requestedDefinitionId && normalizeDefinitionId(requestedDefinitionId) !== normalizeDefinitionId(trader.strategyDefinitionId)) {
    throw new TradingFoxApiError("strategyDefinitionId does not match this trader.", 400);
  }

  const configSchemaVersion = normalizePositiveInteger(input.configSchemaVersion) ?? trader.configSchemaVersion;
  const normalizedConfig = isCopyTradingTrader(trader)
    ? await normalizeDefinitionDrivenCopyConfig(session, trader, input.config)
    : input.config;
  const validation = await validateTradingFoxStrategyConfig({
    config: normalizedConfig,
    configSchemaVersion,
    strategyDefinitionId: trader.strategyDefinitionId,
  });
  if (!validation.ok) {
    throw new TradingFoxApiError("Strategy config validation failed.", 400);
  }

  await patchTrader(trader.id, {
    config: normalizedConfig,
    configSchemaVersion,
    name: strategyName,
  });
  return getTradingFoxAccount(session);
}

async function normalizeDefinitionDrivenCopyConfig(
  session: TelegramAuthSession,
  trader: TradingFoxTrader,
  config: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const userId = tradingFoxUserIdFromSession(session);
  const connector = await getConnectorForUser(trader.exchangeConnectorId, userId);
  await ensureCopyStrategyConnectorPositionMode(connector);
  return normalizeCopyStrategyDefinitionConfigForWrite(config, connector);
}

async function updateLegacyCopyStrategySettings(
  session: TelegramAuthSession,
  trader: TradingFoxTrader,
  strategyName: string,
  input: UpdateCopyStrategySettingsInput,
): Promise<TradingFoxAccountResponse> {
  const userId = tradingFoxUserIdFromSession(session);
  const connector = await getConnectorForUser(trader.exchangeConnectorId, userId);
  const takeProfitPercent = normalizePositiveNumber(input.takeProfitPercent);
  const stopLossPercent = normalizePositiveNumber(input.stopLossPercent);
  if (takeProfitPercent === undefined) {
    throw new TradingFoxApiError("takeProfitPercent must be greater than 0.", 400);
  }
  if (stopLossPercent === undefined) {
    throw new TradingFoxApiError("stopLossPercent must be greater than 0.", 400);
  }

  const signalSourceConfig = firstSignalSourceConfig(trader.config);
  const metadata = recordValue(trader.config.smartkline);
  const signalSourceId = stringValue(metadata.signalSourceId) || signalSourceIdFromConfig(signalSourceConfig);
  if (!signalSourceId) {
    throw new TradingFoxApiError("Copy strategy signal source is missing; recreate the strategy.", 409);
  }

  const configSchemaVersion = 1;
  const config = createTradingFoxCopyStrategyConfig({
    commonConfig: recordValue(trader.config.common),
    signalSourceConfigs: signalSourceConfigsFromCopyStrategyConfig(trader.config),
    signalSourceId,
    startTime: stringValue(signalSourceConfig?.startTime) || trader.createdAt,
    stopLossPercent,
    takeProfitMargin: await resolveCopyStrategyTakeProfitMargin(connector, takeProfitPercent),
    takeProfitPercent,
  });
  const validation = await validateTradingFoxStrategyConfig({
    config,
    configSchemaVersion,
    strategyDefinitionId: trader.strategyDefinitionId,
  });
  if (!validation.ok) {
    throw new TradingFoxApiError("Strategy config validation failed.", 400);
  }

  await patchTrader(trader.id, {
    config,
    configSchemaVersion,
    name: strategyName,
  });
  return getTradingFoxAccount(session);
}

function patchTrader(traderId: number, body: Record<string, unknown>): Promise<TradingFoxTraderPatchResponse> {
  return tradingFoxRequest<TradingFoxTraderPatchResponse>(`/v1/traders/${traderId}`, {
    body: JSON.stringify(body),
    method: "PATCH",
  });
}

function normalizeDefinitionId(value: string): string {
  return value.trim().toUpperCase();
}
