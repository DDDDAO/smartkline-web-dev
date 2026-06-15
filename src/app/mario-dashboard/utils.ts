import type { MarketSymbol } from "@/app/_types/market";
import {
  ACCOUNT_BALANCE,
  BUDGET_OPTIONS,
  COUNTDOWN_URGENT_MS,
  INITIAL_DASHBOARD_STATE,
  MAX_COUNTDOWNS,
  PERCENT_A_OPTIONS,
  PRIORITY_SYMBOLS,
  RATIO_OPTIONS,
} from "./constants";
import type {
  BulkActionType,
  BudgetPercent,
  CalculatorForm,
  Calculation,
  Countdown,
  DashboardState,
  EntryAPercent,
  PendingOrder,
  RewardRiskRatio,
  SegmentTone,
} from "./types";

export function calculatePosition(form: CalculatorForm, budgetPercentValue: BudgetPercent, ratio: RewardRiskRatio): Calculation {
  const budget = ACCOUNT_BALANCE * (budgetPercentValue / 100);
  const stopLoss = parseDecimal(form.stopLoss);
  const entryA = parseDecimal(form.entryA);
  const percentA = form.percentA;
  const remainPercent = 100 - percentA;
  const entryB = remainPercent > 0 ? parseDecimal(form.entryB) : 0;
  let amountA = 0;
  let amountB = 0;

  if (stopLoss > 0 && entryA > 0) {
    const riskPerUnit = Math.abs(entryA - stopLoss);
    if (riskPerUnit > 0) {
      amountA = roundDown(budget * (percentA / 100) / riskPerUnit, 2);
    }
  }

  if (remainPercent > 0 && stopLoss > 0 && entryB > 0) {
    const riskPerUnit = Math.abs(entryB - stopLoss);
    if (riskPerUnit > 0) {
      amountB = roundDown(budget * (remainPercent / 100) / riskPerUnit, 2);
    }
  }

  const entryAWarning = entryA > 0 && entryA === stopLoss ? "不能等於止损价" : "";
  let entryBWarning = "";

  if (remainPercent > 0 && entryB > 0 && entryB === stopLoss) {
    entryBWarning = "不能等於止损价";
  } else if (remainPercent > 0 && entryB > 0 && entryA > 0 && stopLoss > 0) {
    const isLong = entryA > stopLoss;
    const isBetterEntry = isLong ? entryB < entryA : entryB > entryA;
    entryBWarning = isBetterEntry ? "" : "开仓点B必须是更优价格！";
  }

  const totalAmount = amountA + amountB;
  const direction = entryA > 0 && stopLoss > 0 ? (entryA > stopLoss ? "long" : "short") : null;
  let takeProfit = 0;
  let profit = 0;

  if (totalAmount > 0 && stopLoss > 0 && entryA > 0 && direction) {
    const avgEntry = entryB > 0 && amountB > 0 ? (entryA * amountA + entryB * amountB) / totalAmount : entryA;
    takeProfit = avgEntry + (direction === "long" ? 1 : -1) * Math.abs(avgEntry - stopLoss) * ratio;
    profit = totalAmount * Math.abs(takeProfit - avgEntry);
  }

  const hasRequiredInputs = stopLoss > 0 && entryA > 0 && amountA > 0;
  const isValidOrder = hasRequiredInputs && !entryAWarning && !entryBWarning && direction !== null;

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
    profit,
    remainPercent,
    stopLoss,
    takeProfit,
  };
}

export function getSegmentButtonClassName(isActive: boolean, tone: SegmentTone): string {
  return isActive ? `radio-btn active ${tone}` : "radio-btn";
}

export function getBudgetTone(value: BudgetPercent): SegmentTone {
  if (value === 1 || value === 2) {
    return "danger-low";
  }

  if (value === 3) {
    return "danger-mid";
  }

  return "danger-high";
}

export function getRatioTone(value: RewardRiskRatio): SegmentTone {
  if (value === 2) {
    return "danger-low";
  }

  if (value === 3) {
    return "danger-mid";
  }

  if (value === 4) {
    return "danger-high";
  }

  return "danger-max";
}

export function getHeaderTimerClassName(firstCountdownRemaining: number | null): string {
  const isUrgent = firstCountdownRemaining !== null && firstCountdownRemaining < COUNTDOWN_URGENT_MS;
  return `header-timer${isUrgent ? " urgent" : ""}`;
}

export function getBulkOrderLabel(type: BulkActionType): string {
  if (type === "long") {
    return "取消多单";
  }

  if (type === "short") {
    return "取消空单";
  }

  return "全部取消";
}

export function getBulkPositionLabel(type: BulkActionType): string {
  if (type === "long") {
    return "平多单";
  }

  if (type === "short") {
    return "平空单";
  }

  return "全部平仓";
}

export function getActiveCountdowns(countdowns: readonly Countdown[], now: number | null): Countdown[] {
  if (!now) {
    return [];
  }

  return countdowns
    .filter((countdown) => countdown.targetTime > now)
    .sort((left, right) => left.targetTime - right.targetTime)
    .slice(0, MAX_COUNTDOWNS);
}

export function createPrioritizedMarketSymbols(markets: readonly MarketSymbol[]): MarketSymbol[] {
  const marketByBaseSymbol = new Map<string, MarketSymbol>();

  for (const market of markets) {
    const baseSymbol = getMarketBaseSymbol(market);
    if (baseSymbol.length > 0 && !marketByBaseSymbol.has(baseSymbol)) {
      marketByBaseSymbol.set(baseSymbol, market);
    }
  }

  const priorityMarkets = PRIORITY_SYMBOLS
    .map((symbol) => marketByBaseSymbol.get(symbol))
    .filter((market): market is MarketSymbol => Boolean(market));
  const restMarkets = Array.from(marketByBaseSymbol.entries())
    .filter(([symbol]) => !PRIORITY_SYMBOLS.includes(symbol as typeof PRIORITY_SYMBOLS[number]))
    .sort(([leftSymbol], [rightSymbol]) => leftSymbol.localeCompare(rightSymbol))
    .map(([, market]) => market);

  return [...priorityMarkets, ...restMarkets];
}

export function getMarketBaseSymbol(market: MarketSymbol): string {
  const baseSymbol = market.split("/")[0]?.trim().toUpperCase() ?? "";
  return baseSymbol.length > 0 ? baseSymbol : market.trim().toUpperCase();
}

export function toUsdtPerpetualMarketSymbol(baseSymbol: string): MarketSymbol {
  return `${baseSymbol.trim().toUpperCase()}/USDT:USDT`;
}

export function parseStoredDashboardState(rawState: string | null): DashboardState {
  if (!rawState) {
    return INITIAL_DASHBOARD_STATE;
  }

  try {
    const parsed = JSON.parse(rawState) as Partial<DashboardState>;
    return {
      budget: isBudgetPercent(parsed.budget) ? parsed.budget : INITIAL_DASHBOARD_STATE.budget,
      countdowns: Array.isArray(parsed.countdowns) ? parsed.countdowns.filter(isCountdown) : [],
      darkMode: parsed.darkMode === true,
      orders: Array.isArray(parsed.orders) ? parsed.orders.filter(isPendingOrder) : [],
      ratio: isRewardRiskRatio(parsed.ratio) ? parsed.ratio : INITIAL_DASHBOARD_STATE.ratio,
    };
  } catch {
    return INITIAL_DASHBOARD_STATE;
  }
}

function isBudgetPercent(value: unknown): value is BudgetPercent {
  return BUDGET_OPTIONS.some((option) => option === value);
}

function isRewardRiskRatio(value: unknown): value is RewardRiskRatio {
  return RATIO_OPTIONS.some((option) => option === value);
}

function isPendingOrder(value: unknown): value is PendingOrder {
  if (!value || typeof value !== "object") {
    return false;
  }

  const order = value as Partial<PendingOrder>;
  return typeof order.id === "number"
    && (order.direction === "long" || order.direction === "short")
    && typeof order.symbol === "string"
    && typeof order.entryA === "number"
    && typeof order.entryB === "number"
    && typeof order.amountA === "number"
    && typeof order.amountB === "number"
    && typeof order.stopLoss === "number"
    && order.status === "pending";
}

function isCountdown(value: unknown): value is Countdown {
  if (!value || typeof value !== "object") {
    return false;
  }

  const countdown = value as Partial<Countdown>;
  return typeof countdown.id === "number" && typeof countdown.targetTime === "number" && countdown.targetTime > Date.now();
}

export function toEntryAPercent(value: string): EntryAPercent {
  const numericValue = Number(value);
  return PERCENT_A_OPTIONS.find((option) => option === numericValue) ?? 100;
}

export function sanitizeDecimalInput(value: string): string {
  const filteredValue = value.replace(/[^0-9.]/gu, "");
  const [integerPart = "", ...decimalParts] = filteredValue.split(".");

  return decimalParts.length > 0 ? `${integerPart}.${decimalParts.join("")}` : integerPart;
}

export function sanitizeIntegerInput(value: string): string {
  return value.replace(/[^0-9]/gu, "");
}

export function parsePositiveInteger(value: string): number {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

function parseDecimal(value: string): number {
  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function roundDown(value: number, digits: number): number {
  const multiplier = 10 ** digits;
  return Math.floor(value * multiplier) / multiplier;
}

export function formatCountdown(remainingMs: number): string {
  const safeRemainingMs = Math.max(0, remainingMs);
  const hours = Math.floor(safeRemainingMs / (60 * 60 * 1_000));
  const minutes = Math.floor((safeRemainingMs % (60 * 60 * 1_000)) / (60 * 1_000));
  const seconds = Math.floor((safeRemainingMs % (60 * 1_000)) / 1_000);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

export function formatSignedNumber(value: number): string {
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}`;
}

export function formatPrice(value: number): string {
  return value > 0 ? String(value) : "-";
}

export function formatAmount(value: number): string {
  return value > 0 ? String(value) : "-";
}

export function formatPricePair(entryA: number, entryB: number): string {
  return entryB > 0 ? `${formatPrice(entryA)} / ${formatPrice(entryB)}` : formatPrice(entryA);
}

export function formatAmountPair(amountA: number, amountB: number): string {
  return amountB > 0 ? `${formatAmount(amountA)} / ${formatAmount(amountB)}` : formatAmount(amountA);
}
