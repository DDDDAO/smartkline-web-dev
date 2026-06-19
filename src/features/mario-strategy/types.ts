export type MarioBudgetPercent = 1 | 2 | 3 | 5;
export type MarioRewardRiskRatio = 2 | 3 | 4 | 5;
export type MarioEntryAPercent = 100 | 70 | 50 | 30;
export type MarioTakeProfitTargetId = "tp1" | "tp2" | "tp3";
export type MarioTradeDirection = "long" | "short";

export type MarioTakeProfitTargetConfig = {
  closePercent: number;
  id: MarioTakeProfitTargetId;
  ratio: MarioRewardRiskRatio;
};

export type MarioCalculatedTakeProfitTarget = MarioTakeProfitTargetConfig & {
  price: number;
  profit: number;
};

export type MarioCalculatorForm = {
  entryA: string;
  entryB: string;
  percentA: MarioEntryAPercent;
  stopLoss: string;
  symbol: string;
};

export type MarioCalculation = {
  amountA: number;
  amountB: number;
  canPlaceLong: boolean;
  canPlaceShort: boolean;
  direction: MarioTradeDirection | null;
  entryA: number;
  entryAWarning: string;
  entryB: number;
  entryBDisabled: boolean;
  entryBWarning: string;
  isValidOrder: boolean;
  profit: number;
  remainPercent: number;
  riskBudget: number;
  stopLoss: number;
  takeProfit: number;
  takeProfitClosePercentTotal: number;
  takeProfitPlanWarning: string;
  takeProfitTargets: MarioCalculatedTakeProfitTarget[];
  totalQuantity: number;
};
