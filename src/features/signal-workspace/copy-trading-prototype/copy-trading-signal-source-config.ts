import type { WorkspaceCopy } from "@/i18n/workspace";
import { createTradingFoxCopyStrategyCommonConfig } from "@/lib/tradingfox-control-plane/copy-strategy-config-shape";
import type { CopyTradingPrototypeTarget, PrototypeStrategy } from "./types";

export type CopyTradingSignalSourceConfigRow = {
  rowKey: string;
  signalSourceId: string;
  marginPercent: string;
  source: CopyTradingPrototypeTarget | null;
  originalConfig?: Record<string, unknown>;
};

export type CopyTradingSignalSourceSummaryItem = {
  avatarUrl: string | null;
  id: string;
  marginPercent: number | null;
  name: string;
  platform: string;
};

type JsonRecord = Record<string, unknown>;

export function createDefaultCopyTradingSourceRows(
  availableSignalSources: readonly CopyTradingPrototypeTarget[],
): CopyTradingSignalSourceConfigRow[] {
  const firstSource = availableSignalSources[0] ?? null;
  return firstSource ? [createRow(firstSource.trader.trader_id, "100", firstSource)] : [];
}

export function createCopyTradingSourceRowsFromConfig({
  availableSignalSources,
  config,
}: {
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  config: JsonRecord;
}): CopyTradingSignalSourceConfigRow[] {
  const sourceById = createAvailableSourceById(availableSignalSources);
  return readRawSignalSourceConfigs(config)
    .filter(isRecord)
    .map<CopyTradingSignalSourceConfigRow | null>((rawConfig, index) => {
      const signalSourceId = stringValue(rawConfig.signalSourceID ?? rawConfig.signalSourceId ?? rawConfig.SignalSourceID);
      const source = signalSourceId ? sourceById.get(signalSourceId) ?? null : null;
      if (!signalSourceId || !source) {
        return null;
      }
      const row: CopyTradingSignalSourceConfigRow = {
        marginPercent: stringifyPositiveNumber(rawConfig.marginPercent ?? rawConfig.MarginPercent, "100"),
        originalConfig: rawConfig,
        rowKey: `${signalSourceId}:${stringValue(rawConfig.id ?? rawConfig.ID) || index}`,
        signalSourceId,
        source,
      };
      return row;
    })
    .filter((row): row is CopyTradingSignalSourceConfigRow => row !== null);
}

export function createCopyTradingConfigWithSourceRows({
  advancedEnabled,
  baseConfig,
  rows,
  stopLossPercent,
}: {
  advancedEnabled: boolean;
  baseConfig: JsonRecord;
  rows: readonly CopyTradingSignalSourceConfigRow[];
  stopLossPercent?: number;
}): JsonRecord {
  const now = new Date().toISOString();
  const effectiveRows = effectiveCopyTradingSourceRows(rows, advancedEnabled);
  const baseCommon = isRecord(baseConfig.common) ? baseConfig.common : {};
  const risk = isRecord(baseCommon.risk) ? cloneRecord(baseCommon.risk) : {};
  const strategy = isRecord(baseConfig.strategy) ? cloneRecord(baseConfig.strategy) : {};

  if (stopLossPercent !== undefined) {
    risk.stopLossPercent = stopLossPercent;
  }
  const common = createTradingFoxCopyStrategyCommonConfig({
    commonConfig: baseCommon,
    risk,
    sltp: advancedEnabled ? normalizeCopyTradingSltpConfig(baseCommon.sltp) : {},
  });
  strategy.signalSourceConfigs = effectiveRows.map((row, index) => createSignalSourceConfigForWrite(row, index, now));

  return {
    ...baseConfig,
    common,
    strategy,
  };
}

function normalizeCopyTradingSltpConfig(value: unknown): JsonRecord {
  const sltp = isRecord(value) ? cloneRecord(value) : {};
  for (const key of ["singlePositionSL", "singlePositionTP", "singlePositionTrailingSL"]) {
    const setting = sltp[key];
    /**
     * The JSON-schema renderer can materialize empty optional objects for SLTP
     * controls. TradingFox treats the object's presence as an enabled-setting
     * contract and then requires `enabled`, so blank placeholders must be
     * omitted before copy-trading config validation.
     */
    if (isRecord(setting) && isBlankOptionalConfig(setting)) {
      delete sltp[key];
    }
  }
  return sltp;
}

function isBlankOptionalConfig(value: JsonRecord): boolean {
  return Object.values(value).every(isBlankConfigValue);
}

function isBlankConfigValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (isRecord(value)) {
    return isBlankOptionalConfig(value);
  }
  return false;
}

export function createCopyTradingSourceSummary({
  availableSignalSources,
  strategy,
}: {
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  strategy: PrototypeStrategy;
}): CopyTradingSignalSourceSummaryItem[] {
  const sourceById = createAvailableSourceById(availableSignalSources);
  const configs = strategy.signalSourceConfigs?.length
    ? strategy.signalSourceConfigs
    : [{ marginPercent: strategy.followRatioPercent, signalSourceID: strategy.traderId }];

  return configs.flatMap((config) => {
    const id = stringValue(config.signalSourceID ?? config.signalSourceId);
    if (!id) {
      return [];
    }
    const source = sourceById.get(id) ?? null;
    if (!source) {
      return [];
    }
    const name = source.trader.name || id;
    const platform = source.trader.platform;
    return [{
      avatarUrl: source.trader.avatar || null,
      id,
      marginPercent: positiveNumberOrNull(config.marginPercent ?? config.followRatioPercent ?? config.useAmountPercent),
      name,
      platform,
    }];
  });
}

export function updateCopyTradingSourceRow(
  rows: readonly CopyTradingSignalSourceConfigRow[],
  rowKey: string,
  patch: Partial<Pick<CopyTradingSignalSourceConfigRow, "marginPercent" | "signalSourceId">>,
  availableSignalSources: readonly CopyTradingPrototypeTarget[],
): CopyTradingSignalSourceConfigRow[] {
  const sourceById = createAvailableSourceById(availableSignalSources);
  return rows.map((row) => {
    if (row.rowKey !== rowKey) {
      return row;
    }
    const signalSourceId = patch.signalSourceId ?? row.signalSourceId;
    return {
      ...row,
      ...patch,
      source: signalSourceId ? sourceById.get(signalSourceId) ?? null : null,
    };
  });
}

export function addCopyTradingSourceRowsByIds(
  rows: readonly CopyTradingSignalSourceConfigRow[],
  availableSignalSources: readonly CopyTradingPrototypeTarget[],
  sourceIds: readonly string[],
): CopyTradingSignalSourceConfigRow[] {
  const sourceById = createAvailableSourceById(availableSignalSources);
  const selectedIds = new Set(rows.map((row) => row.signalSourceId).filter(Boolean));
  const nextRows = [...rows];
  sourceIds.forEach((sourceId, index) => {
    if (!sourceId || selectedIds.has(sourceId)) {
      return;
    }
    const source = sourceById.get(sourceId) ?? null;
    if (!source) {
      return;
    }
    selectedIds.add(sourceId);
    nextRows.push(createRow(sourceId, "100", source, `new:${Date.now()}:${rows.length + index}:${sourceId}`));
  });
  return nextRows;
}

export function removeCopyTradingSourceRow(rows: readonly CopyTradingSignalSourceConfigRow[], rowKey: string): CopyTradingSignalSourceConfigRow[] {
  return rows.filter((row) => row.rowKey !== rowKey);
}

export function validateCopyTradingSourceRows({
  advancedEnabled,
  availableSignalSources,
  copy,
  rows,
}: {
  advancedEnabled: boolean;
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  copy: WorkspaceCopy;
  rows: readonly CopyTradingSignalSourceConfigRow[];
}): string[] {
  const strategyCreateCopy = copy.workspace.accountCenter.strategyCreate;
  if (availableSignalSources.length === 0) {
    return [strategyCreateCopy.copyTradingNoAvailableSignalSource];
  }
  const effectiveRows = effectiveCopyTradingSourceRows(rows, advancedEnabled);
  if (effectiveRows.length === 0) {
    return [strategyCreateCopy.copyTradingSignalSourceRequired];
  }
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const row of effectiveRows) {
    if (!row.signalSourceId) {
      errors.push(strategyCreateCopy.copyTradingSignalSourceRequired);
      continue;
    }
    if (seen.has(row.signalSourceId)) {
      errors.push(strategyCreateCopy.copyTradingDuplicateSignalSource);
    }
    seen.add(row.signalSourceId);
    const marginPercent = Number(row.marginPercent);
    if (!Number.isFinite(marginPercent) || marginPercent <= 0) {
      errors.push(strategyCreateCopy.copyTradingMarginPercentRequired);
    }
  }
  return Array.from(new Set(errors));
}

export function effectiveCopyTradingSourceRows(
  rows: readonly CopyTradingSignalSourceConfigRow[],
  advancedEnabled: boolean,
): CopyTradingSignalSourceConfigRow[] {
  return (advancedEnabled ? rows : rows.slice(0, 1)).filter((row) => row.signalSourceId.trim());
}

export function createAvailableSourceById(
  sources: readonly CopyTradingPrototypeTarget[],
): ReadonlyMap<string, CopyTradingPrototypeTarget> {
  return new Map(sources.flatMap((source) => {
    const id = source.trader.trader_id.trim();
    return id ? [[id, source] as const] : [];
  }));
}

function createSignalSourceConfigForWrite(
  row: CopyTradingSignalSourceConfigRow,
  index: number,
  fallbackStartTime: string,
): JsonRecord {
  const original = row.originalConfig ?? {};
  const output: JsonRecord = {
    followSide: stringValue(original.followSide ?? original.FollowSide) || "BOTH",
    id: positiveIntegerOrFallback(original.id ?? original.ID, index + 1),
    marginPercent: Number(row.marginPercent),
    signalSourceID: row.signalSourceId,
    startTime: stringValue(original.startTime ?? original.StartTime) || fallbackStartTime,
    traderID: nonNegativeIntegerOrFallback(original.traderID ?? original.traderId ?? original.TraderID, 0),
  };
  copyKnownOptionalConfig(original, output);
  return output;
}

function copyKnownOptionalConfig(input: JsonRecord, output: JsonRecord) {
  for (const [sourceKey, targetKey] of [
    ["blacklist", "blacklist"],
    ["whitelist", "whitelist"],
    ["centsFeePerHour", "centsFeePerHour"],
    ["exitTime", "exitTime"],
    ["stopLossPercent", "stopLossPercent"],
  ] as const) {
    const value = input[sourceKey] ?? input[sourceKey[0].toUpperCase() + sourceKey.slice(1)];
    if (value !== undefined && value !== null && value !== "") {
      output[targetKey] = value;
    }
  }
}

function readRawSignalSourceConfigs(config: JsonRecord): unknown[] {
  const strategy = isRecord(config.strategy) ? config.strategy : {};
  const value = Array.isArray(strategy.signalSourceConfigs) ? strategy.signalSourceConfigs : config.signalSourceConfigs;
  return Array.isArray(value) ? value : [];
}

function createRow(
  signalSourceId: string,
  marginPercent: string,
  source: CopyTradingPrototypeTarget | null,
  rowKey = `${signalSourceId}:0`,
): CopyTradingSignalSourceConfigRow {
  return { marginPercent, rowKey, signalSourceId, source };
}

function cloneRecord(value: JsonRecord): JsonRecord {
  return JSON.parse(JSON.stringify(value)) as JsonRecord;
}

function stringifyPositiveNumber(value: unknown, fallback: string): string {
  const numberValue = positiveNumberOrNull(value);
  return numberValue === null ? fallback : String(numberValue);
}

function positiveNumberOrNull(value: unknown): number | null {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function positiveIntegerOrFallback(value: unknown, fallback: number): number {
  const numberValue = positiveNumberOrNull(value);
  return numberValue === null ? fallback : Math.floor(numberValue);
}

function nonNegativeIntegerOrFallback(value: unknown, fallback: number): number {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numberValue) && numberValue >= 0 ? Math.floor(numberValue) : fallback;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
