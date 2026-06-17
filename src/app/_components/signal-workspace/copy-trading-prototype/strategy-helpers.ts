import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { PrototypeStrategy, PrototypeStrategyStatus, PrototypeStrategyType } from "./types";

export function getPrototypeStrategyType(strategy: PrototypeStrategy): PrototypeStrategyType {
  if (strategy.strategyType) {
    return strategy.strategyType;
  }
  if (strategy.strategyDefinitionId === "MARIO_STRATEGY") {
    return "mario";
  }
  if (strategy.strategyDefinitionId && strategy.strategyDefinitionId !== "COPY_TRADING") {
    return "generic";
  }
  return "copyTrading";
}

export function getStrategyStatusLabel(
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"],
  status: PrototypeStrategyStatus,
): string {
  if (status === "paused") {
    return strategyCopy.paused;
  }
  if (status === "pending") {
    return strategyCopy.pending;
  }
  if (status === "failed") {
    return strategyCopy.failed;
  }
  if (status === "stopped") {
    return strategyCopy.stopped;
  }
  return strategyCopy.running;
}
