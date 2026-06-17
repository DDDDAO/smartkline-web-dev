import { DEFAULT_MOCK_MARGIN_BALANCE, TRADINGFOX_COPY_STRATEGY_DEFINITION_ID, TRADINGFOX_MARIO_STRATEGY_DEFINITION_ID, type TradingFoxAccountStatusResponse, type TradingFoxCopyStrategyConfigInput } from "./constants";
import { settleTradingFoxRequest, tradingFoxRequest } from "./http";
import { normalizeNonNegativeInteger, normalizePositiveInteger } from "./normalizers";
import { TradingFoxApiError } from "./types";
import type { TradingFoxConnector, TradingFoxCopyStrategy, TradingFoxCopyStrategyStatus, TradingFoxRuntimeStatus, TradingFoxTrader } from "./types";
import { isRecord, normalizeOptionalText, normalizePositiveNumber, numberOrNull, positiveNumberOrNull, recordValue, stringArrayValue, stringValue } from "./value-utils";

export function isCopyTradingTrader(trader: TradingFoxTrader): boolean {
  return normalizeStrategyDefinitionId(trader.strategyDefinitionId) === TRADINGFOX_COPY_STRATEGY_DEFINITION_ID;
}

export function isMarioStrategyTrader(trader: TradingFoxTrader): boolean {
  return normalizeStrategyDefinitionId(trader.strategyDefinitionId) === TRADINGFOX_MARIO_STRATEGY_DEFINITION_ID;
}

/**
 * TradingFox registry configs are now persisted as a structured
 * common/strategy envelope. SmartKline display-only metadata intentionally
 * stays out of this payload because the backend schema rejects unknown keys.
 */
export function createTradingFoxCopyStrategyConfig(input: TradingFoxCopyStrategyConfigInput): Record<string, unknown> {
  const startTime = input.startTime || new Date().toISOString();
  const signalSourceConfigs = input.signalSourceConfigs?.length
    ? input.signalSourceConfigs.map((config, index) => normalizeTradingFoxSignalSourceConfig(config, {
      fallbackId: index + 1,
      fallbackSignalSourceId: input.signalSourceId,
      fallbackStartTime: startTime,
      fallbackTakeProfitPercent: input.takeProfitPercent,
    }))
    : [
      normalizeTradingFoxSignalSourceConfig({}, {
        fallbackId: 1,
        fallbackSignalSourceId: input.signalSourceId,
        fallbackStartTime: startTime,
        fallbackTakeProfitPercent: input.takeProfitPercent,
      }),
    ];

  const risk: Record<string, unknown> = {
    /**
     * TradingFox treats stopLossMargin/takeProfitMargin as absolute
     * account-equity cutoffs. SmartKline's copy setup collects percentage
     * inputs, so stop-loss stays percentage-based and take-profit is converted
     * to an absolute account-equity threshold before the config is persisted.
     */
    stopLossPercent: input.stopLossPercent,
  };
  if (input.takeProfitMargin !== undefined) {
    risk.takeProfitMargin = input.takeProfitMargin;
  }

  return {
    common: {
      execution: {
        leverage: 10,
      },
      market: {},
      orders: {},
      risk,
      sltp: {},
    },
    strategy: {
      signalSourceConfigs,
    },
  };
}

function normalizeTradingFoxSignalSourceConfig(
  config: Record<string, unknown>,
  fallback: {
    fallbackId: number;
    fallbackSignalSourceId: string;
    fallbackStartTime: string;
    fallbackTakeProfitPercent?: number;
  },
): Record<string, unknown> {
  const signalSourceId = stringValue(config.signalSourceID) || stringValue(config.signalSourceId) || stringValue(config.SignalSourceID) || fallback.fallbackSignalSourceId;
  const startTime = stringValue(config.startTime) || stringValue(config.StartTime) || fallback.fallbackStartTime;
  const marginPercent = normalizePositiveNumber(config.marginPercent ?? config.MarginPercent) ?? 100;
  const id = normalizePositiveInteger(config.id ?? config.ID) ?? fallback.fallbackId;
  const traderId = normalizeNonNegativeInteger(config.traderID ?? config.traderId ?? config.TraderID);
  const normalized: Record<string, unknown> = {
    followSide: normalizeTradingFoxFollowSide(config.followSide ?? config.FollowSide),
    id,
    marginPercent,
    signalSourceID: signalSourceId,
    startTime,
    traderID: traderId,
  };
  const stopLossPercent = normalizePositiveNumber(config.stopLossPercent ?? config.StopLossPercent);
  const smartklineTakeProfitPercent = normalizePositiveNumber(
    config.smartklineTakeProfitPercent ?? config.takeProfitPercent ?? fallback.fallbackTakeProfitPercent,
  );
  const centsFeePerHour = normalizeNonNegativeInteger(config.centsFeePerHour ?? config.CentsFeePerHour);
  const blacklist = stringArrayValue(config.blacklist ?? config.Blacklist);
  const whitelist = stringArrayValue(config.whitelist ?? config.Whitelist);
  const exitTime = stringValue(config.exitTime) || stringValue(config.ExitTime);

  if (stopLossPercent !== undefined) {
    normalized.stopLossPercent = stopLossPercent;
  }
  if (smartklineTakeProfitPercent !== undefined) {
    normalized.smartklineTakeProfitPercent = smartklineTakeProfitPercent;
  }
  if (centsFeePerHour > 0) {
    normalized.centsFeePerHour = centsFeePerHour;
  }
  if (blacklist.length > 0) {
    normalized.blacklist = blacklist;
  }
  if (whitelist.length > 0) {
    normalized.whitelist = whitelist;
  }
  if (exitTime) {
    normalized.exitTime = exitTime;
  }

  return normalized;
}

function normalizeTradingFoxFollowSide(value: unknown): "BOTH" | "LONG" | "SHORT" {
  const normalizedValue = normalizeOptionalText(value).toLowerCase();
  if (normalizedValue === "long") {
    return "LONG";
  }
  if (normalizedValue === "short") {
    return "SHORT";
  }
  return "BOTH";
}

export async function ensureTradingFoxCopyStrategyConfigEnvelope(
  trader: TradingFoxTrader,
  connector: TradingFoxConnector,
): Promise<void> {
  const takeProfitPercent = copyStrategyTakeProfitPercentForConfig(trader.config, 20);
  const takeProfitMargin = await resolveCopyStrategyTakeProfitMargin(connector, takeProfitPercent);

  if (isTradingFoxConfigEnvelope(trader.config) && !shouldRewriteCopyStrategyRisk(trader.config, takeProfitMargin)) {
    return;
  }
  const signalSourceConfig = firstSignalSourceConfig(trader.config);
  const metadata = recordValue(trader.config.smartkline);
  const signalSourceId = stringValue(metadata.signalSourceId) || signalSourceIdFromConfig(signalSourceConfig);

  if (!signalSourceId) {
    throw new TradingFoxApiError("Copy strategy signal source is missing; recreate the strategy.", 409);
  }

  await tradingFoxRequest<{ trader?: TradingFoxTrader; runtimeStatus?: TradingFoxRuntimeStatus }>(
    `/v1/traders/${trader.id}`,
    {
      body: JSON.stringify({
        config: createTradingFoxCopyStrategyConfig({
          signalSourceConfigs: signalSourceConfigsFromCopyStrategyConfig(trader.config),
          signalSourceId,
          startTime: stringValue(signalSourceConfig?.startTime) || trader.createdAt,
          stopLossPercent: copyStrategyConfigNumber(trader.config, "stopLossPercent", 10),
          takeProfitMargin,
          takeProfitPercent,
        }),
        configSchemaVersion: 1,
      }),
      method: "PATCH",
    },
  );
}

function isTradingFoxConfigEnvelope(config: Record<string, unknown>): boolean {
  return isRecord(config.common) && isRecord(config.strategy);
}

function shouldRewriteCopyStrategyRisk(config: Record<string, unknown>, takeProfitMargin: number): boolean {
  const common = recordValue(config.common);
  const risk = recordValue(common.risk);
  const settings = recordValue(config.settings);
  const existingTakeProfitMargin = numberOrNull(risk.takeProfitMargin ?? settings.takeProfitMargin);

  return existingTakeProfitMargin === null
    || existingTakeProfitMargin <= takeProfitMargin / 2
    || numberOrNull(risk.stopLossMargin) !== null
    || numberOrNull(settings.takeProfitMargin) !== null
    || numberOrNull(settings.stopLossMargin) !== null;
}

function normalizeStrategyDefinitionId(value: unknown): string {
  return normalizeOptionalText(value).toUpperCase();
}

export function mapCopyStrategy(trader: TradingFoxTrader, connector: TradingFoxConnector | null): TradingFoxCopyStrategy | null {
  if (!isCopyTradingTrader(trader)) {
    return null;
  }
  const signalSourceConfig = firstSignalSourceConfig(trader.config);
  const metadata = recordValue(trader.config.smartkline);
  const signalSourceId = stringValue(metadata.signalSourceId) || signalSourceIdFromConfig(signalSourceConfig) || String(trader.id);
  const signalSourceName = stringValue(metadata.traderName)
    || stringValue(signalSourceConfig?.signalSourceName)
    || stringValue(signalSourceConfig?.name);
  const signalSourcePlatform = stringValue(metadata.platform)
    || stringValue(signalSourceConfig?.platform)
    || stringValue(signalSourceConfig?.exchangePlatform);

  return {
    apiAccountName: connector?.name ?? `Connector #${trader.exchangeConnectorId}`,
    exchangeConnectorId: trader.exchangeConnectorId,
    avatarUrl: stringValue(metadata.avatarUrl),
    createdAtLabel: formatBackendDateLabel(trader.createdAt),
    id: String(trader.id),
    platform: signalSourcePlatform || "Copy Trading",
    signalSourceAvatarUrl: stringValue(metadata.avatarUrl),
    signalSourceName,
    signalSourcePlatform,
    startedAt: stringValue(signalSourceConfig?.startTime) || trader.createdAt,
    status: mapBackendStrategyStatus(trader),
    stopLossPercent: copyStrategyConfigNumber(trader.config, "stopLossPercent", 10),
    strategyDefinitionId: TRADINGFOX_COPY_STRATEGY_DEFINITION_ID,
    strategyType: "copyTrading",
    takeProfitPercent: copyStrategyConfigNumber(trader.config, "takeProfitPercent", 20),
    traderId: signalSourceId,
    traderName: trader.name,
  };
}

export function mapTradingFoxStrategy(
  trader: TradingFoxTrader,
  connector: TradingFoxConnector | null,
): TradingFoxCopyStrategy | null {
  const copyStrategy = mapCopyStrategy(trader, connector);
  if (copyStrategy) {
    return copyStrategy;
  }

  const strategyDefinitionId = normalizeStrategyDefinitionId(trader.strategyDefinitionId);
  if (strategyDefinitionId === TRADINGFOX_MARIO_STRATEGY_DEFINITION_ID) {
    return {
      apiAccountName: connector?.name ?? `Connector #${trader.exchangeConnectorId}`,
      exchangeConnectorId: trader.exchangeConnectorId,
      avatarUrl: "/logo-mark.svg",
      createdAtLabel: formatBackendDateLabel(trader.createdAt),
      eventsCount: 0,
      id: String(trader.id),
      platform: "Mario",
      positionsCount: 0,
      startedAt: trader.createdAt,
      status: mapBackendStrategyStatus(trader),
      stopLossPercent: 0,
      strategyDefinitionId,
      strategyType: "mario",
      takeProfitPercent: 0,
      traderId: String(trader.id),
      traderName: trader.name,
    };
  }

  return {
    apiAccountName: connector?.name ?? `Connector #${trader.exchangeConnectorId}`,
    exchangeConnectorId: trader.exchangeConnectorId,
    avatarUrl: "/logo-mark.svg",
    createdAtLabel: formatBackendDateLabel(trader.createdAt),
    eventsCount: 0,
    id: String(trader.id),
    platform: strategyDefinitionId || "TradingFox",
    positionsCount: 0,
    startedAt: trader.createdAt,
    status: mapBackendStrategyStatus(trader),
    stopLossPercent: 0,
    strategyDefinitionId,
    strategyType: "generic",
    takeProfitPercent: 0,
    traderId: String(trader.id),
    traderName: trader.name,
  };
}

export function firstSignalSourceConfig(config: Record<string, unknown>): Record<string, unknown> | null {
  const raw = rawSignalSourceConfigsFromCopyStrategyConfig(config);
  if (!Array.isArray(raw)) {
    return null;
  }
  return recordValue(raw[0]);
}

export function signalSourceConfigsFromCopyStrategyConfig(config: Record<string, unknown>): Record<string, unknown>[] {
  const raw = rawSignalSourceConfigsFromCopyStrategyConfig(config);
  return Array.isArray(raw) ? raw.map(recordValue) : [];
}

function rawSignalSourceConfigsFromCopyStrategyConfig(config: Record<string, unknown>): unknown {
  const strategy = recordValue(config.strategy);
  return Array.isArray(strategy.signalSourceConfigs) ? strategy.signalSourceConfigs : config.signalSourceConfigs;
}

export function signalSourceIdFromConfig(config: Record<string, unknown> | null): string {
  return stringValue(config?.signalSourceId) || stringValue(config?.signalSourceID) || stringValue(config?.SignalSourceID);
}

export function copyStrategyConfigNumber(
  config: Record<string, unknown>,
  metric: "stopLossPercent" | "takeProfitPercent",
  fallback: number,
): number {
  if (metric === "takeProfitPercent") {
    return copyStrategyTakeProfitPercentForConfig(config, fallback);
  }

  return copyStrategyConfigPercent(config, metric, fallback);
}

function copyStrategyConfigPercent(
  config: Record<string, unknown>,
  metric: "stopLossPercent" | "takeProfitPercent",
  fallback: number,
): number {
  const metadata = recordValue(config.smartkline);
  const settings = recordValue(config.settings);
  const common = recordValue(config.common);
  const risk = recordValue(common.risk);
  const signalSourceConfig = firstSignalSourceConfig(config);
  const values = metric === "stopLossPercent"
    ? [metadata.stopLossPercent, risk.stopLossMargin, risk.stopLossPercent, settings.stopLossMargin]
    : [
      metadata.takeProfitPercent,
      signalSourceConfig?.smartklineTakeProfitPercent,
      signalSourceConfig?.takeProfitPercent,
      risk.takeProfitPercent,
      settings.takeProfitPercent,
    ];

  for (const value of values) {
    const number = numberOrNull(value);
    if (number !== null) {
      return number;
    }
  }

  return fallback;
}

function copyStrategyTakeProfitPercentForConfig(config: Record<string, unknown>, fallback: number): number {
  const explicitPercent = copyStrategyConfigPercent(config, "takeProfitPercent", Number.NaN);
  if (Number.isFinite(explicitPercent)) {
    return explicitPercent;
  }

  const settings = recordValue(config.settings);
  const common = recordValue(config.common);
  const risk = recordValue(common.risk);
  const legacyMargin = numberOrNull(risk.takeProfitMargin ?? settings.takeProfitMargin);
  if (legacyMargin !== null && legacyMargin > 0 && legacyMargin <= 100) {
    return legacyMargin;
  }

  return fallback;
}

export async function resolveCopyStrategyTakeProfitMargin(
  connector: TradingFoxConnector,
  takeProfitPercent: number,
): Promise<number> {
  const accountEquity = await getTradingFoxConnectorAccountEquity(connector);
  if (accountEquity === undefined) {
    throw new TradingFoxApiError("Trading account equity is unavailable; cannot convert take-profit percent to an account-equity threshold.", 409);
  }
  return roundTradingFoxMargin(accountEquity * (1 + takeProfitPercent / 100));
}

async function getTradingFoxConnectorAccountEquity(connector: TradingFoxConnector): Promise<number | undefined> {
  const localAccountEquity = positiveNumberOrNull(connector.accountEquity);
  if (localAccountEquity !== null) {
    return localAccountEquity;
  }

  const accountStatus = await settleTradingFoxRequest<TradingFoxAccountStatusResponse>(
    `/v1/exchange-connectors/${connector.id}/account-status`,
  );
  const remoteAccountEquity = positiveNumberOrNull(accountStatus.value?.account?.equity);
  if (remoteAccountEquity !== null) {
    return remoteAccountEquity;
  }

  const mockMarginBalance = positiveNumberOrNull(connector.mockMarginBalance);
  if (mockMarginBalance !== null) {
    return mockMarginBalance;
  }
  return connector.isMock ? DEFAULT_MOCK_MARGIN_BALANCE : undefined;
}

function roundTradingFoxMargin(value: number): number {
  return Number(value.toFixed(8));
}

function mapBackendStrategyStatus(trader: TradingFoxTrader): TradingFoxCopyStrategyStatus {
  const displayStatus = normalizeBackendStatus(trader.displayStatus);
  const runtimeState = normalizeBackendStatus(trader.runtimeState);
  const desiredState = normalizeBackendStatus(trader.desiredState);

  /**
   * Runtime-running wins over the desired-state flags. Some control-plane
   * records can still carry enabled=false/disabled while the worker runtime is
   * alive; rendering that as paused makes a refresh look like it stopped the
   * strategy even though no stop request was sent.
   */
  if (displayStatus === "failed" || runtimeState === "error") {
    return "failed";
  }
  if (displayStatus === "running" || runtimeState === "running") {
    return "running";
  }
  if (displayStatus === "disabled") {
    return "paused";
  }
  if (displayStatus === "pending") {
    return "pending";
  }
  if (runtimeState === "no_runtime" || runtimeState === "stopped" || runtimeState === "unassigned") {
    return trader.enabled === false || desiredState === "disabled" ? "paused" : "pending";
  }
  if (trader.enabled === false || desiredState === "disabled") {
    return "paused";
  }
  if (trader.enabled === true || desiredState === "enabled") {
    return "pending";
  }
  return "running";
}

function normalizeBackendStatus(value: unknown): string {
  return normalizeOptionalText(value).toLowerCase();
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
