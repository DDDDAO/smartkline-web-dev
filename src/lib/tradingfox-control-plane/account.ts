import type { TelegramAuthSession } from "@/lib/auth/telegram-auth";
import { pickActiveConnectors, redactTradingFoxConnectorCredentials } from "./connectors";
import type { TradingFoxAccountStatusResponse } from "./constants";
import { settleTradingFoxRequest, tradingFoxRequest, tradingFoxUserIdFromSession } from "./http";
import type { TradingFoxAccountResponse, TradingFoxConnector, TradingFoxOrderHistory, TradingFoxPosition, TradingFoxTrader } from "./types";
import { numberValue } from "./value-utils";
import { mapTradingFoxStrategy } from "./strategy-config";

type TradingFoxAccountOptions = {
  includeConnectorAccountEquity?: boolean;
  includeStrategyRuntimeMetrics?: boolean;
};

export async function getTradingFoxAccount(
  session: TelegramAuthSession,
  options: TradingFoxAccountOptions = {},
): Promise<TradingFoxAccountResponse> {
  const userId = tradingFoxUserIdFromSession(session);
  const [connectors, traders] = await Promise.all([
    tradingFoxRequest<{ items: TradingFoxConnector[] }>(`/v1/exchange-connectors?userId=${userId}&dead=false`),
    tradingFoxRequest<{ items: TradingFoxTrader[] }>(tradingFoxTradersPath(userId)),
  ]);
  const activeConnectors = pickActiveConnectors(connectors.items);
  const connectorById = new Map(activeConnectors.map((connector) => [connector.id, connector]));
  const accountEquityByConnectorId = options.includeConnectorAccountEquity
    ? await getTradingFoxConnectorAccountEquityById(activeConnectors)
    : new Map<number, number>();
  const strategies = options.includeStrategyRuntimeMetrics
    ? await Promise.all(traders.items.map(async (trader) => {
      const connector = connectorById.get(trader.exchangeConnectorId) ?? null;
      const strategy = mapTradingFoxStrategy(trader, connector);
      if (!strategy) {
        return null;
      }

      const [accountStatus, positions, orderHistory] = await Promise.all([
        settleTradingFoxRequest<TradingFoxAccountStatusResponse>(`/v1/traders/${trader.id}/account-status`),
        settleTradingFoxRequest<{ items: TradingFoxPosition[] }>(`/v1/traders/${trader.id}/positions`),
        settleTradingFoxRequest<TradingFoxOrderHistory>(`/v1/traders/${trader.id}/orders?section=trader&limit=500`),
      ]);
      const accountEquity = accountStatus.value?.account?.equity;
      if (typeof accountEquity === "number" && Number.isFinite(accountEquity)) {
        accountEquityByConnectorId.set(trader.exchangeConnectorId, accountEquity);
      }

      return {
        ...strategy,
        accountEquity: accountStatus.value?.account?.equity,
        eventsCount: countTradingFoxTraderOrders(orderHistory.value),
        positionsCount: countTradingFoxPositions(positions.value),
        unrealizedPnl: sumTradingFoxUnrealizedPnl(positions.value),
      };
    }))
    : traders.items.map((trader) => mapTradingFoxStrategy(trader, connectorById.get(trader.exchangeConnectorId) ?? null));
  const connectorsWithAccountEquity = activeConnectors.map((connector) => ({
    ...connector,
    accountEquity: accountEquityByConnectorId.get(connector.id),
  }));
  const publicConnectors = connectorsWithAccountEquity.map(redactTradingFoxConnectorCredentials);

  return {
    connector: publicConnectors[0] ?? null,
    connectors: publicConnectors,
    strategies: strategies.filter((strategy) => strategy !== null),
  };
}

function tradingFoxTradersPath(userId: number): string {
  return `/v1/traders?${new URLSearchParams({ userId: String(userId) }).toString()}`;
}

export function countTradingFoxPositions(response: { items?: TradingFoxPosition[] } | undefined): number {
  return Array.isArray(response?.items) ? response.items.length : 0;
}

export function countTradingFoxTraderOrders(orderHistory: TradingFoxOrderHistory | undefined): number {
  return Array.isArray(orderHistory?.items) ? orderHistory.items.length : 0;
}

export function sumTradingFoxUnrealizedPnl(response: { items?: TradingFoxPosition[] } | undefined): number | undefined {
  return Array.isArray(response?.items)
    ? response.items.reduce((sum, position) => sum + numberValue(position.unrealizedPnl), 0)
    : undefined;
}

async function getTradingFoxConnectorAccountEquityById(
  connectors: readonly TradingFoxConnector[],
): Promise<Map<number, number>> {
  const entries = await Promise.all(connectors.map(async (connector) => {
    const accountStatus = await settleTradingFoxRequest<TradingFoxAccountStatusResponse>(
      `/v1/exchange-connectors/${connector.id}/account-status`,
    );
    const accountEquity = accountStatus.value?.account?.equity;
    return typeof accountEquity === "number" && Number.isFinite(accountEquity)
      ? ([connector.id, accountEquity] as const)
      : null;
  }));

  return new Map(entries.filter((entry): entry is readonly [number, number] => entry !== null));
}
