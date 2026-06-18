import { isActiveCopyTradingTrader } from "@/lib/copy-trading-radar-api";
import type { WorkspaceCopy, WorkspaceLanguage } from "@/i18n/workspace";
import type {
  TradingFoxAccountResponse,
  TradingFoxConnector,
} from "@/lib/tradingfox-control-plane";
import type { CopyTradingRadarSnapshot } from "@/types/copy-trading";
import type {
  CopyTradingPrototypeTarget,
  PrototypeApiConnection,
  PrototypeStrategy,
} from "./copy-trading-prototype";
import { EMPTY_COPY_TRADING_PROTOTYPE_TARGETS } from "./signal-workspace-helpers-constants";

export async function requestTradingFoxAccount(
  path: string,
  init?: RequestInit,
): Promise<TradingFoxAccountResponse> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      errorPayload?.error ||
        `TradingFox request failed with status ${response.status}.`,
    );
  }

  return (await response.json()) as TradingFoxAccountResponse;
}

export function createCopyTradingPrototypeTargets(
  snapshot: CopyTradingRadarSnapshot | null,
): readonly CopyTradingPrototypeTarget[] {
  if (!snapshot) {
    return EMPTY_COPY_TRADING_PROTOTYPE_TARGETS;
  }

  const positionsByTraderId = new Map<string, number>();
  for (const position of snapshot.positions) {
    positionsByTraderId.set(
      position.trader_id,
      (positionsByTraderId.get(position.trader_id) ?? 0) + 1,
    );
  }

  const eventsByTraderId = new Map<string, number>();
  for (const event of snapshot.events) {
    eventsByTraderId.set(
      event.trader_id,
      (eventsByTraderId.get(event.trader_id) ?? 0) + 1,
    );
  }

  return snapshot.traders
    .filter(isActiveCopyTradingTrader)
    .map((trader) => ({
      eventsCount: eventsByTraderId.get(trader.trader_id) ?? 0,
      positionsCount: positionsByTraderId.get(trader.trader_id) ?? 0,
      trader,
    }))
    .sort(compareCopyTradingPrototypeTargets);
}

export function compareCopyTradingPrototypeTargets(
  left: CopyTradingPrototypeTarget,
  right: CopyTradingPrototypeTarget,
): number {
  return (
    right.trader.monthly_return - left.trader.monthly_return ||
    right.positionsCount - left.positionsCount ||
    right.eventsCount - left.eventsCount ||
    left.trader.name.localeCompare(right.trader.name)
  );
}

export function createMarioPrototypeStrategy(
  connector: PrototypeApiConnection,
  copy: WorkspaceCopy,
  language: WorkspaceLanguage,
  strategyName: string,
): PrototypeStrategy {
  const now = new Date().toISOString();

  return {
    accountEquity: connector.accountBalance ?? undefined,
    apiAccountName: connector.accountName,
    avatarUrl: "/logo-mark.svg",
    createdAtLabel: formatTradingFoxDateLabel(now, language),
    eventsCount: 0,
    exchangeConnectorId: connector.id,
    followRatioPercent: 100,
    id: `mario-${connector.id}-${Date.now()}`,
    platform: "Mario",
    positionsCount: 0,
    status: "running",
    stopLossPercent: 0,
    strategyType: "mario",
    takeProfitPercent: 0,
    traderId: `mario-${connector.id}`,
    traderName:
      strategyName.trim() ||
      copy.workspace.accountCenter.strategyCreate.marioStrategyName,
    unrealizedPnl: 0,
  };
}

export function readStoredMarioStrategies(
  storageKey: string,
): PrototypeStrategy[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map(normalizeStoredMarioStrategy)
      .filter((strategy): strategy is PrototypeStrategy => strategy !== null);
  } catch {
    return [];
  }
}

export function normalizeStoredMarioStrategy(
  value: unknown,
): PrototypeStrategy | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<PrototypeStrategy>;
  if (
    record.strategyType !== "mario" ||
    typeof record.id !== "string" ||
    typeof record.exchangeConnectorId !== "number"
  ) {
    return null;
  }

  return {
    accountEquity:
      typeof record.accountEquity === "number" ? record.accountEquity : undefined,
    apiAccountName:
      typeof record.apiAccountName === "string" ? record.apiAccountName : "Binance",
    avatarUrl: typeof record.avatarUrl === "string" ? record.avatarUrl : "/logo-mark.svg",
    createdAtLabel:
      typeof record.createdAtLabel === "string" ? record.createdAtLabel : "--",
    eventsCount: typeof record.eventsCount === "number" ? record.eventsCount : 0,
    exchangeConnectorId: record.exchangeConnectorId,
    followRatioPercent: 100,
    id: record.id,
    platform: typeof record.platform === "string" ? record.platform : "Mario",
    positionsCount:
      typeof record.positionsCount === "number" ? record.positionsCount : 0,
    status:
      record.status === "paused" || record.status === "stopped"
        ? record.status
        : "running",
    stopLossPercent: 0,
    strategyType: "mario",
    takeProfitPercent: 0,
    traderId:
      typeof record.traderId === "string"
        ? record.traderId
        : `mario-${record.exchangeConnectorId}`,
    traderName:
      typeof record.traderName === "string"
        ? record.traderName
        : "Mario Strategy",
    unrealizedPnl:
      typeof record.unrealizedPnl === "number" ? record.unrealizedPnl : 0,
  };
}

export function createEmptyPrototypeApiConnection(): PrototypeApiConnection {
  return {
    accountBalance: null,
    accountName: "Mock Exchange #1",
    connectedAtLabel: "",
    exchangePlatform: "Mock",
    id: 0,
    isMock: true,
    mockMarginBalance: null,
    status: "empty",
  };
}

export function mapTradingFoxConnectorToPrototypeConnection(
  connector: TradingFoxConnector,
  language: WorkspaceLanguage,
): PrototypeApiConnection {
  const isBinanceDemoConnector =
    isBinanceDemoExchangePlatform(connector.exchangePlatform);

  return {
    accountBalance:
      connector.accountEquity ??
      (isBinanceDemoConnector ? null : (connector.mockMarginBalance ?? null)),
    accountName: connector.name,
    bindingLabel: connector.bindingLabel,
    bindingMode: connector.bindingMode,
    connectedAtLabel: formatTradingFoxDateLabel(connector.updatedAt, language),
    displayName: connector.displayName,
    exchangePlatform: connector.exchangePlatform,
    id: connector.id,
    isMock: connector.isMock,
    mockMarginBalance: isBinanceDemoConnector
      ? null
      : (connector.mockMarginBalance ?? null),
    recommended: connector.recommended,
    status: "connected",
    whitelistIp: connector.ipAddress?.address ?? connector.whitelistIp,
  };
}

export function isBinanceDemoExchangePlatform(exchangePlatform: string): boolean {
  const normalizedPlatform = exchangePlatform.replace(/[\s_-]/gu, "").toLowerCase();
  return normalizedPlatform === "binancedemo";
}

export function formatTradingFoxDateLabel(
  value: string,
  language: WorkspaceLanguage,
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(language, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}
