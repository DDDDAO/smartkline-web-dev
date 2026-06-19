import type { TradingFoxStrategyDefinition } from "@/lib/tradingfox-control-plane";
import { mergeUiSchemas } from "./strategy-display-metadata";

export type JsonRecord = Record<string, unknown>;

export function createDefinitionConfigSchema(
  definition: TradingFoxStrategyDefinition,
): JsonRecord | undefined {
  if (isRecord(definition.configSchema)) {
    return definition.configSchema;
  }

  const properties: JsonRecord = {};
  if (isRecord(definition.strategyConfigSchema)) {
    properties.strategy = definition.strategyConfigSchema;
  }
  if (Object.keys(properties).length === 0) {
    return undefined;
  }

  return {
    additionalProperties: false,
    properties,
    type: "object",
  };
}

export function createDefinitionConfigUiSchema(
  definition: TradingFoxStrategyDefinition,
): JsonRecord | undefined {
  const uiSchema = isRecord(definition.uiSchema) ? { ...definition.uiSchema } : {};
  if (isRecord(definition.strategyUiSchema)) {
    uiSchema.strategy = mergeUiSchemas(recordValue(uiSchema.strategy), definition.strategyUiSchema);
  }
  return Object.keys(uiSchema).length > 0 ? uiSchema : undefined;
}

function recordValue(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
