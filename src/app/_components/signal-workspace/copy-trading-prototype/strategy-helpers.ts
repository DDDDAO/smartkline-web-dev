import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type {
  CopyTradingPrototypeTarget,
  PrototypeStrategy,
  PrototypeStrategyStatus,
  PrototypeStrategyType,
} from "./types";

export type FollowedSignalSourceDisplay = {
  avatarUrl: string | null;
  id: string;
  name: string;
  platform: string;
};

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

export function resolveFollowedSignalSourceDisplay(
  strategy: PrototypeStrategy,
  followedSignalSource: CopyTradingPrototypeTarget | null | undefined,
  unknownLabel: string,
): FollowedSignalSourceDisplay {
  if (followedSignalSource) {
    return {
      avatarUrl: followedSignalSource.trader.avatar || null,
      id: followedSignalSource.trader.trader_id,
      name: followedSignalSource.trader.name || followedSignalSource.trader.trader_id || unknownLabel,
      platform: followedSignalSource.trader.platform,
    };
  }

  const id = strategy.traderId.trim();
  const fallbackPlatform = strategy.platform === "Copy Trading" ? "" : strategy.platform;

  return {
    avatarUrl: strategy.signalSourceAvatarUrl || strategy.avatarUrl || null,
    id,
    name: strategy.signalSourceName?.trim() || id || unknownLabel,
    platform: strategy.signalSourcePlatform?.trim() || fallbackPlatform,
  };
}
