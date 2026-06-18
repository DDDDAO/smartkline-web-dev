import type { TradingFoxAccountResponse } from "@/lib/tradingfox-control-plane";
import type { PrototypeStrategy, PrototypeStrategyCreateInput } from "../copy-trading-prototype";

type CreatedStrategyMatchInput = {
  account: TradingFoxAccountResponse;
  input: PrototypeStrategyCreateInput;
  previousStrategies: readonly PrototypeStrategy[];
};

type CreatedCopyStrategyMatchInput = {
  account: TradingFoxAccountResponse;
  previousStrategies: readonly PrototypeStrategy[];
  signalSourceId: string;
  strategyName: string;
};

export function findCreatedCopyStrategyId({
  account,
  previousStrategies,
  signalSourceId,
  strategyName,
}: CreatedCopyStrategyMatchInput): string {
  return findCreatedStrategyIdFromAccount({
    account,
    previousStrategies,
    predicate: (strategy) =>
      strategy.strategyType === "copyTrading" &&
      strategy.traderId === signalSourceId &&
      normalizeStrategyLabel(strategy.traderName) === normalizeStrategyLabel(strategyName),
  });
}

export function findCreatedStrategyId({
  account,
  input,
  previousStrategies,
}: CreatedStrategyMatchInput): string {
  return findCreatedStrategyIdFromAccount({
    account,
    previousStrategies,
    predicate: (strategy) =>
      strategy.exchangeConnectorId === input.exchangeConnectorId &&
      strategy.strategyType === input.strategyType &&
      normalizeStrategyLabel(strategy.traderName) === normalizeStrategyLabel(input.strategyName),
  });
}

function findCreatedStrategyIdFromAccount({
  account,
  predicate,
  previousStrategies,
}: {
  account: TradingFoxAccountResponse;
  predicate: (strategy: TradingFoxAccountResponse["strategies"][number]) => boolean;
  previousStrategies: readonly PrototypeStrategy[];
}): string {
  const previousIds = new Set(previousStrategies.map((strategy) => strategy.id));
  const createdStrategies = account.strategies.filter(
    (strategy) => !previousIds.has(strategy.id),
  );
  const matchedStrategy = createdStrategies.find(predicate);

  if (matchedStrategy) {
    return matchedStrategy.id;
  }
  if (createdStrategies.length === 1) {
    return createdStrategies[0].id;
  }

  return "";
}

function normalizeStrategyLabel(value: string): string {
  return value.trim().toLowerCase();
}
