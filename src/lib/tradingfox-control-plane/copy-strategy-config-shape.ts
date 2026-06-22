export type TradingFoxCopyStrategyCommonConfigInput = {
  commonConfig?: Record<string, unknown>;
  executionDefaults?: Record<string, unknown>;
  risk?: Record<string, unknown>;
  sltp?: Record<string, unknown>;
};

/**
 * COPY_TRADING currently declares only risk/sltp/execution/market common
 * modules. Keep write payloads aligned with the strategy definition schema.
 */
export function createTradingFoxCopyStrategyCommonConfig({
  commonConfig,
  executionDefaults,
  risk,
  sltp,
}: TradingFoxCopyStrategyCommonConfigInput): Record<string, unknown> {
  const common = recordValue(commonConfig);
  return {
    risk: cloneJsonRecord(risk ?? common.risk),
    sltp: cloneJsonRecord(sltp ?? common.sltp),
    execution: {
      ...cloneJsonRecord(executionDefaults),
      ...cloneJsonRecord(common.execution),
    },
    market: cloneJsonRecord(common.market),
  };
}

function cloneJsonRecord(value: unknown): Record<string, unknown> {
  const record = recordValue(value);
  return JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
}

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
