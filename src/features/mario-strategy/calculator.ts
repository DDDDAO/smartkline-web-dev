import type { MarketSymbol } from "@/types/market";
import {
  MARIO_BUDGET_OPTIONS,
  MARIO_DEFAULT_TAKE_PROFIT_TARGETS,
  MARIO_PERCENT_A_OPTIONS,
  MARIO_PRIORITY_SYMBOLS,
  MARIO_RATIO_OPTIONS,
  MARIO_TAKE_PROFIT_TARGET_IDS,
} from "./constants";
import type {
  MarioBudgetPercent,
  MarioCalculatedTakeProfitTarget,
  MarioCalculatorForm,
  MarioCalculation,
  MarioEntryAPercent,
  MarioRewardRiskRatio,
  MarioTakeProfitTargetConfig,
  MarioTakeProfitTargetId,
} from "./types";

const TAKE_PROFIT_RATIO_TEMPLATES: Record<MarioRewardRiskRatio, readonly [MarioRewardRiskRatio, MarioRewardRiskRatio, MarioRewardRiskRatio]> = {
  2: [2, 3, 4],
  3: [2, 3, 4],
  4: [3, 4, 5],
  5: [3, 4, 5],
};

const TAKE_PROFIT_CLOSE_PERCENT_TEMPLATES: Record<MarioRewardRiskRatio, readonly [number, number, number]> = {
  2: [50, 30, 20],
  3: [30, 40, 30],
  4: [30, 30, 40],
  5: [20, 30, 50],
};

export function calculateMarioPosition(input: {
  accountBalance: number;
  budgetPercent: MarioBudgetPercent;
  form: MarioCalculatorForm;
  takeProfitTargets: readonly MarioTakeProfitTargetConfig[];
}): MarioCalculation {
  const riskBudget = positiveNumberOrZero(input.accountBalance) * (input.budgetPercent / 100);
  const stopLoss = parseDecimal(input.form.stopLoss);
  const entryA = parseDecimal(input.form.entryA);
  const percentA = input.form.percentA;
  const remainPercent = 100 - percentA;
  const entryB = remainPercent > 0 ? parseDecimal(input.form.entryB) : 0;
  const targets = normalizeMarioTakeProfitTargets(input.takeProfitTargets);
  const takeProfitClosePercentTotal = targets.reduce((sum, target) => sum + target.closePercent, 0);
  const takeProfitPlanWarning = takeProfitClosePercentTotal === 100
    ? ""
    : `分批比例合计需等于 100%，当前 ${takeProfitClosePercentTotal}%`;
  const amountA = calculateRiskQuantity(riskBudget, percentA, entryA, stopLoss);
  const amountB = remainPercent > 0 ? calculateRiskQuantity(riskBudget, remainPercent, entryB, stopLoss) : 0;
  const entryAWarning = entryA > 0 && entryA === stopLoss ? "不能等于止损价" : "";
  const entryBWarning = getEntryBWarning({ entryA, entryB, remainPercent, stopLoss });
  const totalQuantity = amountA + amountB;
  const direction = entryA > 0 && stopLoss > 0 ? (entryA > stopLoss ? "long" : "short") : null;
  const targetCalculation = calculateTakeProfitTargets({ direction, entryA, entryB, amountA, amountB, stopLoss, targets, takeProfitPlanWarning });
  const isValidOrder = stopLoss > 0
    && entryA > 0
    && amountA > 0
    && !entryAWarning
    && !entryBWarning
    && !takeProfitPlanWarning
    && direction !== null;

  return {
    amountA,
    amountB,
    canPlaceLong: isValidOrder && direction === "long",
    canPlaceShort: isValidOrder && direction === "short",
    direction,
    entryA,
    entryAWarning,
    entryB,
    entryBDisabled: remainPercent === 0,
    entryBWarning,
    isValidOrder,
    profit: targetCalculation.profit,
    remainPercent,
    riskBudget,
    stopLoss,
    takeProfit: targetCalculation.takeProfit,
    takeProfitClosePercentTotal,
    takeProfitPlanWarning,
    takeProfitTargets: targetCalculation.takeProfitTargets,
    totalQuantity,
  };
}

export function createMarioTakeProfitTemplate(ratio: MarioRewardRiskRatio): MarioTakeProfitTargetConfig[] {
  const ratios = TAKE_PROFIT_RATIO_TEMPLATES[ratio];
  const closePercents = TAKE_PROFIT_CLOSE_PERCENT_TEMPLATES[ratio];

  return MARIO_TAKE_PROFIT_TARGET_IDS.map((id, index) => ({
    closePercent: closePercents[index] ?? MARIO_DEFAULT_TAKE_PROFIT_TARGETS[index]?.closePercent ?? 0,
    id,
    ratio: ratios[index] ?? ratio,
  }));
}

export function normalizeMarioTakeProfitTargets(value: unknown): MarioTakeProfitTargetConfig[] {
  const parsedTargets = Array.isArray(value) ? value : [];
  return MARIO_TAKE_PROFIT_TARGET_IDS.map((id, index) => {
    const fallbackTarget = MARIO_DEFAULT_TAKE_PROFIT_TARGETS[index] ?? MARIO_DEFAULT_TAKE_PROFIT_TARGETS[0];
    const candidate = parsedTargets.find((target) => isTakeProfitTargetWithId(target, id)) as Partial<MarioTakeProfitTargetConfig> | undefined;
    return {
      closePercent: normalizeTakeProfitClosePercent(candidate?.closePercent, fallbackTarget.closePercent),
      id,
      ratio: isMarioRewardRiskRatio(candidate?.ratio) ? candidate.ratio : fallbackTarget.ratio,
    };
  });
}

export function toMarioEntryAPercent(value: string): MarioEntryAPercent {
  const numericValue = Number(value);
  return MARIO_PERCENT_A_OPTIONS.find((option) => option === numericValue) ?? 100;
}

export function toMarioRewardRiskRatio(value: string): MarioRewardRiskRatio {
  const numericValue = Number(value);
  return MARIO_RATIO_OPTIONS.find((option) => option === numericValue) ?? 2;
}

export function toMarioTakeProfitClosePercent(value: string): number {
  const numericValue = Number(sanitizeMarioIntegerInput(value));
  return Number.isFinite(numericValue) ? Math.max(0, Math.min(100, numericValue)) : 0;
}

export function sanitizeMarioDecimalInput(value: string): string {
  const filteredValue = value.replace(/[^0-9.]/gu, "");
  const [integerPart = "", ...decimalParts] = filteredValue.split(".");
  return decimalParts.length > 0 ? `${integerPart}.${decimalParts.join("")}` : integerPart;
}

export function sanitizeMarioIntegerInput(value: string): string {
  return value.replace(/[^0-9]/gu, "");
}

export function isMarioBudgetPercent(value: unknown): value is MarioBudgetPercent {
  return MARIO_BUDGET_OPTIONS.some((option) => option === value);
}

export function isMarioRewardRiskRatio(value: unknown): value is MarioRewardRiskRatio {
  return MARIO_RATIO_OPTIONS.some((option) => option === value);
}

export function createPrioritizedMarioMarketSymbols(markets: readonly MarketSymbol[]): MarketSymbol[] {
  const marketByBaseSymbol = new Map<string, MarketSymbol>();
  for (const market of markets) {
    const baseSymbol = getMarioMarketBaseSymbol(market);
    if (baseSymbol.length > 0 && !marketByBaseSymbol.has(baseSymbol)) {
      marketByBaseSymbol.set(baseSymbol, market);
    }
  }
  const priorityMarkets = MARIO_PRIORITY_SYMBOLS
    .map((symbol) => marketByBaseSymbol.get(symbol))
    .filter((market): market is MarketSymbol => Boolean(market));
  const restMarkets = Array.from(marketByBaseSymbol.entries())
    .filter(([symbol]) => !MARIO_PRIORITY_SYMBOLS.includes(symbol as typeof MARIO_PRIORITY_SYMBOLS[number]))
    .sort(([leftSymbol], [rightSymbol]) => leftSymbol.localeCompare(rightSymbol))
    .map(([, market]) => market);
  return [...priorityMarkets, ...restMarkets];
}

export function getMarioMarketBaseSymbol(market: MarketSymbol): string {
  const baseSymbol = market.split("/")[0]?.trim().toUpperCase() ?? "";
  return baseSymbol.length > 0 ? baseSymbol : market.trim().toUpperCase();
}

export function toMarioUsdtPerpetualMarketSymbol(baseSymbol: string): MarketSymbol {
  return `${baseSymbol.trim().toUpperCase()}/USDT:USDT`;
}

export function formatMarioNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

export function formatMarioPrice(value: number): string {
  return value > 0 ? formatMarioNumber(value, 8) : "-";
}

function calculateRiskQuantity(riskBudget: number, percent: number, entry: number, stopLoss: number): number {
  if (riskBudget <= 0 || stopLoss <= 0 || entry <= 0) {
    return 0;
  }
  const riskPerUnit = Math.abs(entry - stopLoss);
  return riskPerUnit > 0 ? roundDown(riskBudget * (percent / 100) / riskPerUnit, 2) : 0;
}

function getEntryBWarning(input: { entryA: number; entryB: number; remainPercent: number; stopLoss: number }): string {
  if (input.remainPercent <= 0 || input.entryB <= 0) {
    return "";
  }
  if (input.entryB === input.stopLoss) {
    return "不能等于止损价";
  }
  if (input.entryA <= 0 || input.stopLoss <= 0) {
    return "";
  }
  const isLong = input.entryA > input.stopLoss;
  const isBetterEntry = isLong ? input.entryB < input.entryA : input.entryB > input.entryA;
  return isBetterEntry ? "" : "开仓点B必须是更优价格！";
}

function calculateTakeProfitTargets(input: {
  amountA: number;
  amountB: number;
  direction: "long" | "short" | null;
  entryA: number;
  entryB: number;
  stopLoss: number;
  takeProfitPlanWarning: string;
  targets: readonly MarioTakeProfitTargetConfig[];
}): { profit: number; takeProfit: number; takeProfitTargets: MarioCalculatedTakeProfitTarget[] } {
  const totalAmount = input.amountA + input.amountB;
  if (totalAmount <= 0 || input.stopLoss <= 0 || input.entryA <= 0 || !input.direction || input.takeProfitPlanWarning) {
    return { profit: 0, takeProfit: 0, takeProfitTargets: input.targets.map(createEmptyCalculatedTakeProfitTarget) };
  }
  const avgEntry = input.entryB > 0 && input.amountB > 0
    ? (input.entryA * input.amountA + input.entryB * input.amountB) / totalAmount
    : input.entryA;
  const riskDistance = Math.abs(avgEntry - input.stopLoss);
  const takeProfitTargets = input.targets.map((target) => {
    const price = avgEntry + (input.direction === "long" ? 1 : -1) * riskDistance * target.ratio;
    return { ...target, price, profit: totalAmount * (target.closePercent / 100) * Math.abs(price - avgEntry) };
  });
  return {
    profit: takeProfitTargets.reduce((sum, target) => sum + target.profit, 0),
    takeProfit: takeProfitTargets.reduce((sum, target) => sum + target.price * (target.closePercent / 100), 0),
    takeProfitTargets,
  };
}

function createEmptyCalculatedTakeProfitTarget(target: MarioTakeProfitTargetConfig): MarioCalculatedTakeProfitTarget {
  return { ...target, price: 0, profit: 0 };
}

function isTakeProfitTargetWithId(value: unknown, id: MarioTakeProfitTargetId): value is Partial<MarioTakeProfitTargetConfig> {
  return Boolean(value) && typeof value === "object" && (value as Partial<MarioTakeProfitTargetConfig>).id === id;
}

function normalizeTakeProfitClosePercent(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : fallback;
}

function parseDecimal(value: string): number {
  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function positiveNumberOrZero(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function roundDown(value: number, digits: number): number {
  const multiplier = 10 ** digits;
  return Math.floor(value * multiplier) / multiplier;
}
