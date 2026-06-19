import type {
  TradingFoxRendererSurface,
  TradingFoxStrategyDefinition,
  TradingFoxStrategyDefinitionSummary,
} from "@/lib/tradingfox-control-plane";

export const GENERIC_RENDERER_KEY = "generic";
export const COPY_TRADING_CREATE_RENDERER_KEY = "copy-trading.create.v1";
export const COPY_TRADING_DETAIL_RENDERER_KEY = "copy-trading.detail.v1";
export const MARIO_CREATE_RENDERER_KEY = "mario.create.v1";
export const MARIO_DETAIL_RENDERER_KEY = "mario.detail.v1";
export const MARIO_STATE_RENDERER_KEY = "mario.state.v1";

type StrategyDefinitionWithRendering = Pick<TradingFoxStrategyDefinitionSummary, "rendering">;

const SUPPORTED_RENDERER_KEYS = {
  action: new Set([GENERIC_RENDERER_KEY]),
  create: new Set([GENERIC_RENDERER_KEY, COPY_TRADING_CREATE_RENDERER_KEY, MARIO_CREATE_RENDERER_KEY]),
  detail: new Set([GENERIC_RENDERER_KEY, COPY_TRADING_DETAIL_RENDERER_KEY, MARIO_DETAIL_RENDERER_KEY]),
  state: new Set([GENERIC_RENDERER_KEY, MARIO_STATE_RENDERER_KEY]),
} satisfies Record<TradingFoxRendererSurface, Set<string>>;

export function resolveStrategyRendererKey(
  definition: StrategyDefinitionWithRendering | null | undefined,
  surface: TradingFoxRendererSurface,
): string {
  const key = definition?.rendering?.[surface]?.key?.trim();
  return key || GENERIC_RENDERER_KEY;
}

export function getStrategyRendererResolutionError(
  definition: StrategyDefinitionWithRendering | null | undefined,
  surface: TradingFoxRendererSurface,
): string {
  const key = resolveStrategyRendererKey(definition, surface);
  return SUPPORTED_RENDERER_KEYS[surface].has(key)
    ? ""
    : `unsupported ${surface} renderer ${key}`;
}

export function isMarioRenderer(
  definition: Pick<TradingFoxStrategyDefinition, "rendering"> | null | undefined,
  surface: Extract<TradingFoxRendererSurface, "create" | "detail" | "state">,
): boolean {
  const key = resolveStrategyRendererKey(definition, surface);
  return key === MARIO_CREATE_RENDERER_KEY
    || key === MARIO_DETAIL_RENDERER_KEY
    || key === MARIO_STATE_RENDERER_KEY;
}

export function strategyDefinitionCacheKey(
  definition: Pick<TradingFoxStrategyDefinitionSummary, "configSchemaVersion" | "id" | "manifestHash" | "stateSchemaVersion" | "version">,
): string {
  return [
    definition.id,
    definition.version,
    definition.configSchemaVersion,
    definition.stateSchemaVersion ?? 0,
    definition.manifestHash ?? "",
  ].join(":");
}
