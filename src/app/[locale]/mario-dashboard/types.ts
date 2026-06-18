export type BudgetPercent = 1 | 2 | 3 | 5;
export type RewardRiskRatio = 2 | 3 | 4 | 5;
export type EntryAPercent = 100 | 70 | 50 | 30;
export type TakeProfitTargetId = "tp1" | "tp2" | "tp3";
export type TradeDirection = "long" | "short";
export type BulkActionType = TradeDirection | "all";

export type TakeProfitTargetConfig = {
  closePercent: number;
  id: TakeProfitTargetId;
  ratio: RewardRiskRatio;
};

export type CalculatedTakeProfitTarget = TakeProfitTargetConfig & {
  price: number;
  profit: number;
};

export type PendingOrderTakeProfitTarget = TakeProfitTargetConfig & {
  price: number;
};

export type PendingOrder = {
  amountA: number;
  amountB: number;
  direction: TradeDirection;
  entryA: number;
  entryB: number;
  id: number;
  status: "pending";
  stopLoss: number;
  symbol: string;
  takeProfitTargets: PendingOrderTakeProfitTarget[];
};

export type Countdown = {
  id: number;
  targetTime: number;
};

export type DashboardState = {
  budget: BudgetPercent;
  countdowns: Countdown[];
  darkMode: boolean;
  orders: PendingOrder[];
  ratio: RewardRiskRatio;
  takeProfitTargets: TakeProfitTargetConfig[];
};

export type CalculatorForm = {
  entryA: string;
  entryB: string;
  percentA: EntryAPercent;
  stopLoss: string;
  symbol: string;
};

export type Calculation = {
  amountA: number;
  amountB: number;
  canPlaceLong: boolean;
  canPlaceShort: boolean;
  direction: TradeDirection | null;
  entryA: number;
  entryAWarning: string;
  entryB: number;
  entryBDisabled: boolean;
  entryBWarning: string;
  isValidOrder: boolean;
  profit: number;
  remainPercent: number;
  stopLoss: number;
  takeProfit: number;
  takeProfitClosePercentTotal: number;
  takeProfitPlanWarning: string;
  takeProfitTargets: CalculatedTakeProfitTarget[];
};

export type BulkAction = {
  source: "order" | "position";
  type: BulkActionType;
};

export type HistoryOrder = {
  close: number;
  direction: TradeDirection;
  entry: number;
  percent: string;
  pnl: number;
  symbol: string;
};

export type MockPosition = {
  amount: number;
  direction: TradeDirection;
  entry: number;
  pnl: number;
  symbol: string;
};

export type SegmentTone = "danger-high" | "danger-low" | "danger-max" | "danger-mid";
