import type { WorkspaceLanguage } from "@/i18n/workspace";

export type MarioStrategyConsoleCopy = {
  actionFailed: string;
  actionNotDeclared: (actionId: string) => string;
  availableQuantity: string;
  budget: string;
  budgetHint: string;
  calculatorTitle: string;
  cancelAll: string;
  cancelLong: string;
  cancelPlan: string;
  cancelShort: string;
  cancelling: string;
  consoleDescription: string;
  consoleTitle: string;
  confirm: string;
  confirmOpenTitle: string;
  direction: string;
  emptyOrders: string;
  entryA: string;
  entryB: string;
  entryOrders: string;
  estimatedProfit: string;
  marketLoadFailed: string;
  noMatches: string;
  openLong: string;
  openShort: string;
  opening: string;
  pendingOrders: string;
  pendingOrdersDescription: string;
  planSubmitted: string;
  quantity: string;
  remainingPosition: string;
  riskRewardRatio: string;
  searchSymbol: string;
  sideLong: string;
  sideShort: string;
  stopLoss: string;
  stopLossOrders: string;
  symbol: string;
  takeProfit: string;
  takeProfitOrders: string;
  takeProfitPlan: string;
  totalClosePercent: (value: number) => string;
};

export const MARIO_STRATEGY_CONSOLE_COPY = {
  "zh-CN": {
    actionFailed: "操作失败",
    actionNotDeclared: (actionId: string) => `当前 StrategyDefinition 未声明 ${actionId} 动作。`,
    availableQuantity: "可开数量",
    budget: "预算",
    budgetHint: "按账户权益计算本次风险预算，不覆盖上方账户概况。",
    calculatorTitle: "坐标定位/持仓计算",
    cancelAll: "全部取消",
    cancelLong: "取消多单",
    cancelPlan: "取消计划",
    cancelShort: "取消空单",
    cancelling: "取消中",
    consoleDescription: "仅保留 Mario 所需的坐标定位、持仓计算和挂单计划操作，其余仓位、盈亏、杠杆和历史订单继续使用统一策略详情。",
    consoleTitle: "Mario 操作台",
    confirm: "确认",
    confirmOpenTitle: "确认开仓计划",
    direction: "方向",
    emptyOrders: "当前没有返回未完成挂单。",
    entryA: "开仓点 A",
    entryB: "开仓点 B",
    entryOrders: "入场挂单",
    estimatedProfit: "预计止盈利润",
    marketLoadFailed: "币种列表加载失败，已保留默认币种。",
    noMatches: "没有匹配币种",
    openLong: "开多",
    openShort: "开空",
    opening: "提交中",
    pendingOrders: "挂单详情",
    pendingOrdersDescription: "按 TradingFox 返回的未完成订单归并为 Mario 计划。取消计划要求该方向没有真实持仓，失败会直接显示后端错误。",
    planSubmitted: "Mario 开仓计划已发送。",
    quantity: "计划数量",
    remainingPosition: "剩余仓位",
    riskRewardRatio: "盈亏比",
    searchSymbol: "搜索币种",
    sideLong: "开多",
    sideShort: "开空",
    stopLoss: "止损位",
    stopLossOrders: "止损",
    symbol: "币种",
    takeProfit: "参考止盈位",
    takeProfitOrders: "分批止盈",
    takeProfitPlan: "分批止盈",
    totalClosePercent: (value: number) => `合计 ${value}%`,
  },
  "en-US": {
    actionFailed: "Action failed",
    actionNotDeclared: (actionId: string) => `The current StrategyDefinition does not declare the ${actionId} action.`,
    availableQuantity: "Quantity",
    budget: "Budget",
    budgetHint: "Risk budget is calculated from account equity and does not replace the summary above.",
    calculatorTitle: "Coordinate / Position Sizing",
    cancelAll: "Cancel all",
    cancelLong: "Cancel longs",
    cancelPlan: "Cancel plan",
    cancelShort: "Cancel shorts",
    cancelling: "Cancelling",
    consoleDescription: "Only Mario coordinate calculation, position sizing, and pending-plan controls are shown here. Positions, PnL, leverage, and history stay in the unified detail page.",
    consoleTitle: "Mario Console",
    confirm: "Confirm",
    confirmOpenTitle: "Confirm open plan",
    direction: "Side",
    emptyOrders: "No unfinished pending orders returned.",
    entryA: "Entry A",
    entryB: "Entry B",
    entryOrders: "Entries",
    estimatedProfit: "Estimated TP PnL",
    marketLoadFailed: "Failed to load symbols. Default symbols are still shown.",
    noMatches: "No symbol matches",
    openLong: "Open long",
    openShort: "Open short",
    opening: "Submitting",
    pendingOrders: "Pending Orders",
    pendingOrdersDescription: "Unfinished TradingFox orders are grouped into Mario plans. Plan cancellation requires no live position for that side; backend errors are shown directly.",
    planSubmitted: "Mario open plan sent.",
    quantity: "Planned quantity",
    remainingPosition: "Remaining",
    riskRewardRatio: "Risk/reward",
    searchSymbol: "Search symbol",
    sideLong: "Long",
    sideShort: "Short",
    stopLoss: "Stop loss",
    stopLossOrders: "Stop loss",
    symbol: "Symbol",
    takeProfit: "Reference TP",
    takeProfitOrders: "Take profits",
    takeProfitPlan: "TP ladder",
    totalClosePercent: (value: number) => `Total ${value}%`,
  },
} satisfies Record<WorkspaceLanguage, MarioStrategyConsoleCopy>;

export function getMarioStrategyConsoleCopy(language: WorkspaceLanguage): MarioStrategyConsoleCopy {
  return MARIO_STRATEGY_CONSOLE_COPY[language];
}
