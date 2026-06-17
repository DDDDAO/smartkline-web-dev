"use client";

import type { CopyTradingPrototypeTarget, PrototypeStrategy } from "./types";

export function createSignalSourceTargetById(
  sources: readonly CopyTradingPrototypeTarget[],
): Map<string, CopyTradingPrototypeTarget> {
  return new Map(sources.map((source) => [source.trader.trader_id, source]));
}

export function formatDefaultCopyStrategyName(
  target: CopyTradingPrototypeTarget | null,
  typeLabel: string,
): string {
  const sourceName = target?.trader.name.trim() ?? "";
  if (!sourceName) {
    return "";
  }

  return `${sourceName} ${typeLabel}`.trim();
}

type FollowedSignalSourceDisplay = {
  avatarUrl: string | null;
  id: string;
  name: string;
  platform: string;
};

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
