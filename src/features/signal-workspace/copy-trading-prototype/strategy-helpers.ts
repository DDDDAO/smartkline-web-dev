import type { WorkspaceCopy } from "@/i18n/workspace";
import type { PrototypeStrategy, PrototypeStrategyStatus, PrototypeStrategyType } from "./types";
import { getStrategyPresentation } from "./strategy-presentation-registry";

export function getPrototypeStrategyType(strategy: PrototypeStrategy): PrototypeStrategyType {
  return getStrategyPresentation(strategy).strategyType;
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
