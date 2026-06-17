import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { PrototypeStrategy, PrototypeStrategyStatus, PrototypeStrategyType } from "./types";

export function getPrototypeStrategyType(strategy: PrototypeStrategy): PrototypeStrategyType {
  return strategy.strategyType ?? "copyTrading";
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
