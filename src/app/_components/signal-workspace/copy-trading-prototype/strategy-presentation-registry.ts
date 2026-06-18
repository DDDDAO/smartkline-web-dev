import type { PrototypeStrategy, PrototypeStrategyType } from "./types";

export const COPY_TRADING_DEFINITION_ID = "COPY_TRADING";
export const MARIO_DEFINITION_ID = "MARIO_STRATEGY";

export type StrategyCreatePresentation = "copyTrading" | "generic" | "marioDashboardHint";
export type StrategyDetailPresentation = "dashboard" | "generic";

export type StrategyPresentation = {
  createPresentation: StrategyCreatePresentation;
  dashboardPath?: string;
  detailPresentation: StrategyDetailPresentation;
  strategyType: PrototypeStrategyType;
};

const DEFAULT_STRATEGY_PRESENTATION: StrategyPresentation = {
  createPresentation: "generic",
  detailPresentation: "generic",
  strategyType: "generic",
};

const STRATEGY_PRESENTATION_BY_DEFINITION_ID: Record<string, StrategyPresentation> = {
  [COPY_TRADING_DEFINITION_ID]: {
    createPresentation: "copyTrading",
    detailPresentation: "generic",
    strategyType: "copyTrading",
  },
  [MARIO_DEFINITION_ID]: {
    createPresentation: "marioDashboardHint",
    dashboardPath: "/mario-dashboard",
    detailPresentation: "dashboard",
    strategyType: "mario",
  },
};

export function getStrategyPresentationForDefinitionId(definitionId: string | null | undefined): StrategyPresentation {
  const normalizedDefinitionId = normalizeStrategyDefinitionId(definitionId);
  return normalizedDefinitionId
    ? STRATEGY_PRESENTATION_BY_DEFINITION_ID[normalizedDefinitionId] ?? DEFAULT_STRATEGY_PRESENTATION
    : STRATEGY_PRESENTATION_BY_DEFINITION_ID[COPY_TRADING_DEFINITION_ID];
}

export function getStrategyPresentation(strategy: Pick<PrototypeStrategy, "strategyDefinitionId" | "strategyType">): StrategyPresentation {
  if (strategy.strategyType) {
    return strategyPresentationForStrategyType(strategy.strategyType);
  }
  return getStrategyPresentationForDefinitionId(strategy.strategyDefinitionId);
}

export function getStrategyTypeForDefinitionId(definitionId: string | null | undefined): PrototypeStrategyType {
  return getStrategyPresentationForDefinitionId(definitionId).strategyType;
}

export function getStrategyDashboardPath(strategy: Pick<PrototypeStrategy, "strategyDefinitionId" | "strategyType">): string | null {
  const presentation = getStrategyPresentation(strategy);
  return presentation.detailPresentation === "dashboard" ? presentation.dashboardPath ?? null : null;
}

function strategyPresentationForStrategyType(strategyType: PrototypeStrategyType): StrategyPresentation {
  if (strategyType === "copyTrading") {
    return STRATEGY_PRESENTATION_BY_DEFINITION_ID[COPY_TRADING_DEFINITION_ID];
  }
  if (strategyType === "mario") {
    return STRATEGY_PRESENTATION_BY_DEFINITION_ID[MARIO_DEFINITION_ID];
  }
  return DEFAULT_STRATEGY_PRESENTATION;
}

function normalizeStrategyDefinitionId(definitionId: string | null | undefined): string {
  return typeof definitionId === "string" ? definitionId.trim().toUpperCase() : "";
}
