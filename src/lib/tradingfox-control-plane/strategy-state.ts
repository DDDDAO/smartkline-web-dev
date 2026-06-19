import type { TelegramAuthSession } from "@/lib/auth/telegram-auth";
import { tradingFoxRequest, tradingFoxUserIdFromSession } from "./http";
import { TradingFoxApiError } from "./types";
import type { TradingFoxStrategyStateResponse, TradingFoxTrader } from "./types";
import { parsePositiveInteger } from "./value-utils";

export async function getTradingFoxTraderStrategyState(
  session: TelegramAuthSession,
  strategyId: string,
): Promise<TradingFoxStrategyStateResponse> {
  const userId = tradingFoxUserIdFromSession(session);
  const traderId = parsePositiveInteger(strategyId, "strategyId");
  const trader = await tradingFoxRequest<TradingFoxTrader>(`/v1/traders/${traderId}`);

  if (trader.userId !== userId) {
    throw new TradingFoxApiError("Strategy not found.", 404);
  }

  return tradingFoxRequest<TradingFoxStrategyStateResponse>(`/v1/traders/${traderId}/strategy-state`);
}
