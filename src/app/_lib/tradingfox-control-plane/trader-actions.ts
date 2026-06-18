import type { TelegramAuthSession } from "@/app/_lib/auth/telegram-auth";
import { TRADINGFOX_ACTION_SYNC_POSITIONS } from "./constants";
import { tradingFoxRequest, tradingFoxUserIdFromSession } from "./http";
import { getTradingFoxStrategyDefinition } from "./strategy-definitions";
import { isCopyTradingTrader } from "./strategy-config";
import { syncTradingFoxCopyStrategyPositions } from "./strategies";
import { TradingFoxApiError } from "./types";
import type {
  ExecuteTradingFoxTraderActionInput,
  TradingFoxRuntimeStatusResponse,
  TradingFoxTrader,
  TradingFoxTraderActionResponse,
} from "./types";
import { isRecord, parsePositiveInteger, requireText } from "./value-utils";

export async function executeTradingFoxTraderAction(
  session: TelegramAuthSession,
  strategyId: string,
  actionIdInput: string,
  input: ExecuteTradingFoxTraderActionInput = {},
): Promise<TradingFoxTraderActionResponse> {
  const userId = tradingFoxUserIdFromSession(session);
  const traderId = parsePositiveInteger(strategyId, "strategyId");
  const actionId = requireText(actionIdInput, "actionId");
  const payload = isRecord(input.payload) ? input.payload : {};
  const trader = await tradingFoxRequest<TradingFoxTrader>(`/v1/traders/${traderId}`);

  if (trader.userId !== userId) {
    throw new TradingFoxApiError("Strategy not found.", 404);
  }

  const definition = await getTradingFoxStrategyDefinition(trader.strategyDefinitionId);
  const actionDefinition = definition.capabilities.actionDefinitions?.find((action) => action.id === actionId);
  if (!actionDefinition) {
    throw new TradingFoxApiError("Action is not declared by this strategy definition.", 400);
  }

  if (actionId === TRADINGFOX_ACTION_SYNC_POSITIONS && isCopyTradingTrader(trader)) {
    return {
      actionId,
      detail: await syncTradingFoxCopyStrategyPositions(session, strategyId, {
        ratioPercent: payload.ratioPercent,
      }),
    };
  }

  const response = await tradingFoxRequest<TradingFoxRuntimeStatusResponse & { result?: Record<string, unknown> }>(
    `/v1/traders/${traderId}/actions/${encodeURIComponent(actionId)}`,
    {
      body: JSON.stringify({ payload }),
      method: "POST",
    },
  );

  return {
    actionId,
    result: isRecord(response.result) ? response.result : undefined,
    runtimeStatus: response.status,
  };
}
