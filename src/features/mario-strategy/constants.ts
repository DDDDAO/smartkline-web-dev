import type { MarketSymbol } from "@/types/market";
import type { MarioBudgetPercent, MarioEntryAPercent, MarioRewardRiskRatio, MarioTakeProfitTargetConfig, MarioTakeProfitTargetId } from "./types";

export const MARIO_BUDGET_OPTIONS = [1, 2, 3, 5] as const satisfies readonly MarioBudgetPercent[];
export const MARIO_RATIO_OPTIONS = [2, 3, 4, 5] as const satisfies readonly MarioRewardRiskRatio[];
export const MARIO_PERCENT_A_OPTIONS = [100, 70, 50, 30] as const satisfies readonly MarioEntryAPercent[];
export const MARIO_TAKE_PROFIT_TARGET_IDS = ["tp1", "tp2", "tp3"] as const satisfies readonly MarioTakeProfitTargetId[];
export const MARIO_STRATEGY_ACTION_IDS = {
  cancelAll: "cancel_all",
  cancelLong: "cancel_long",
  cancelPlan: "cancel_plan",
  cancelShort: "cancel_short",
  openPosition: "open_position",
} as const;
export const MARIO_STRATEGY_CONSOLE_ACTION_IDS = Object.values(MARIO_STRATEGY_ACTION_IDS);
export const MARIO_DEFAULT_TAKE_PROFIT_TARGETS: readonly MarioTakeProfitTargetConfig[] = [
  { closePercent: 30, id: "tp1", ratio: 2 },
  { closePercent: 30, id: "tp2", ratio: 3 },
  { closePercent: 40, id: "tp3", ratio: 4 },
];
export const MARIO_INITIAL_FORM = {
  entryA: "",
  entryB: "",
  percentA: 100,
  stopLoss: "",
  symbol: "ETH",
} satisfies import("./types").MarioCalculatorForm;
export const MARIO_INITIAL_BUDGET: MarioBudgetPercent = 1;
export const MARIO_INITIAL_RATIO: MarioRewardRiskRatio = 2;
export const MARIO_PRIORITY_SYMBOLS = ["BTC", "ETH"] as const;
export const MARIO_FALLBACK_SYMBOLS = ["BTC", "ETH", "HYPE", "SNDK"] as const;
export const MARIO_FALLBACK_MARKET_SYMBOLS = MARIO_FALLBACK_SYMBOLS.map((symbol) => `${symbol}/USDT:USDT` as MarketSymbol);
