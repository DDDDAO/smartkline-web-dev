import { tradingFoxRequest } from "./http";
import type {
  TradingFoxStrategyDefinition,
  TradingFoxStrategyDefinitionSummary,
} from "./types";
import { normalizePositiveInteger } from "./normalizers";
import { requireText } from "./value-utils";

export async function listTradingFoxStrategyDefinitions(): Promise<TradingFoxStrategyDefinitionSummary[]> {
  const response = await tradingFoxRequest<{ items: TradingFoxStrategyDefinitionSummary[] }>("/v1/strategy-definitions");
  return response.items;
}

export async function getTradingFoxStrategyDefinition(
  definitionId: string,
): Promise<TradingFoxStrategyDefinition> {
  const normalizedDefinitionId = requireText(definitionId, "strategyDefinitionId");
  return tradingFoxRequest<TradingFoxStrategyDefinition>(
    `/v1/strategy-definitions/${encodeURIComponent(normalizedDefinitionId)}`,
  );
}

export async function validateTradingFoxStrategyConfig(input: {
  config: Record<string, unknown>;
  configSchemaVersion?: unknown;
  strategyDefinitionId: string;
}): Promise<{ ok: boolean }> {
  const strategyDefinitionId = requireText(input.strategyDefinitionId, "strategyDefinitionId");
  const configSchemaVersion = normalizePositiveInteger(input.configSchemaVersion);
  return tradingFoxRequest<{ ok: boolean }>(
    `/v1/strategy-definitions/${encodeURIComponent(strategyDefinitionId)}/validate-config`,
    {
      body: JSON.stringify({
        config: input.config,
        configSchemaVersion,
      }),
      method: "POST",
    },
  );
}
