import type { MarketSymbol } from "@/types/market";
import {
  ACCOUNT_BALANCE,
  BUDGET_OPTIONS,
  COUNTDOWN_URGENT_MS,
  DEFAULT_TAKE_PROFIT_TARGETS,
  INITIAL_DASHBOARD_STATE,
  MAX_COUNTDOWNS,
  PERCENT_A_OPTIONS,
  PRIORITY_SYMBOLS,
  RATIO_OPTIONS,
  TAKE_PROFIT_TARGET_IDS,
} from "./constants";
import type {
  CalculatedTakeProfitTarget,
  BulkActionType,
  BudgetPercent,
  CalculatorForm,
  Calculation,
  Countdown,
  DashboardState,
  EntryAPercent,
  PendingOrder,
  PendingOrderTakeProfitTarget,
  RewardRiskRatio,
  SegmentTone,
  TakeProfitTargetConfig,
  TakeProfitTargetId,
} from "./types";

const TAKE_PROFIT_RATIO_TEMPLATES: Record<RewardRiskRatio, readonly [RewardRiskRatio, RewardRiskRatio, RewardRiskRatio]> = {
  2: [2, 3, 4],
  3: [2, 3, 4],
  4: [3, 4, 5],
  5: [3, 4, 5],
};

const TAKE_PROFIT_CLOSE_PERCENT_TEMPLATES: Record<RewardRiskRatio, readonly [number, number, number]> = {
  2: [50, 30, 20],
  3: [30, 40, 30],
  4: [30, 30, 40],
  5: [20, 30, 50],
};

export function calculatePosition(
  form: CalculatorForm,
  budgetPercentValue: BudgetPercent,
  takeProfitTargetsInput: readonly TakeProfitTargetConfig[],
): Calculation {
  const budget = ACCOUNT_BALANCE * (budgetPercentValue / 100);
  const stopLoss = parseDecimal(form.stopLoss);
  const entryA = parseDecimal(form.entryA);
  const percentA = form.percentA;
  const remainPercent = 100 - percentA;
  const entryB = remainPercent > 0 ? parseDecimal(form.entryB) : 0;
  const normalizedTakeProfitTargets = normalizeTakeProfitTargets(takeProfitTargetsInput);
  const takeProfitClosePercentTotal = normalizedTakeProfitTargets.reduce((sum, target) => sum + target.closePercent, 0);
  const takeProfitPlanWarning = takeProfitClosePercentTotal === 100
    ? ""
    : `分批比例合计需等于 100%，当前 ${takeProfitClosePercentTotal}%`;
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
  let takeProfitTargets = normalizedTakeProfitTargets.map(createEmptyCalculatedTakeProfitTarget);

  if (totalAmount > 0 && stopLoss > 0 && entryA > 0 && direction && !takeProfitPlanWarning) {
    const avgEntry = entryB > 0 && amountB > 0 ? (entryA * amountA + entryB * amountB) / totalAmount : entryA;
    const riskDistance = Math.abs(avgEntry - stopLoss);
    takeProfitTargets = normalizedTakeProfitTargets.map((target) => {
      const price = avgEntry + (direction === "long" ? 1 : -1) * riskDistance * target.ratio;
      const targetProfit = totalAmount * (target.closePercent / 100) * Math.abs(price - avgEntry);

      return {
        ...target,
        price,
        profit: targetProfit,
      };
    });
    takeProfit = takeProfitTargets.reduce((sum, target) => sum + target.price * (target.closePercent / 100), 0);
    profit = takeProfitTargets.reduce((sum, target) => sum + target.profit, 0);
  }

  const hasRequiredInputs = stopLoss > 0 && entryA > 0 && amountA > 0;
  const isValidOrder = hasRequiredInputs && !entryAWarning && !entryBWarning && !takeProfitPlanWarning && direction !== null;

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
    takeProfitClosePercentTotal,
    takeProfitPlanWarning,
    takeProfitTargets,
  };
}

export function createTakeProfitTemplate(ratio: RewardRiskRatio): TakeProfitTargetConfig[] {
  const ratios = TAKE_PROFIT_RATIO_TEMPLATES[ratio];
  const closePercents = TAKE_PROFIT_CLOSE_PERCENT_TEMPLATES[ratio];

  return TAKE_PROFIT_TARGET_IDS.map((id, index) => ({
    closePercent: closePercents[index] ?? DEFAULT_TAKE_PROFIT_TARGETS[index]?.closePercent ?? 0,
    id,
    ratio: ratios[index] ?? ratio,
  }));
}

export function normalizeTakeProfitTargets(value: unknown): TakeProfitTargetConfig[] {
  const parsedTargets = Array.isArray(value) ? value : [];

  return TAKE_PROFIT_TARGET_IDS.map((id, index) => {
    const fallbackTarget = DEFAULT_TAKE_PROFIT_TARGETS[index] ?? DEFAULT_TAKE_PROFIT_TARGETS[0];
    const candidate = parsedTargets.find((target) => isTakeProfitTargetWithId(target, id)) as Partial<TakeProfitTargetConfig> | undefined;

    return {
      closePercent: normalizeTakeProfitClosePercent(candidate?.closePercent, fallbackTarget.closePercent),
      id,
      ratio: isRewardRiskRatio(candidate?.ratio) ? candidate.ratio : fallbackTarget.ratio,
    };
  });
}

function createEmptyCalculatedTakeProfitTarget(target: TakeProfitTargetConfig): CalculatedTakeProfitTarget {
  return {
    ...target,
    price: 0,
    profit: 0,
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
      orders: Array.isArray(parsed.orders) ? parsed.orders.map(normalizePendingOrder).filter((order): order is PendingOrder => order !== null) : [],
      ratio: isRewardRiskRatio(parsed.ratio) ? parsed.ratio : INITIAL_DASHBOARD_STATE.ratio,
      takeProfitTargets: normalizeTakeProfitTargets(parsed.takeProfitTargets),
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

function isTakeProfitTargetWithId(value: unknown, id: TakeProfitTargetId): value is Partial<TakeProfitTargetConfig> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const target = value as Partial<TakeProfitTargetConfig>;
  return target.id === id;
}

function normalizePendingOrder(value: unknown): PendingOrder | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const order = value as Partial<PendingOrder>;
  if (!(typeof order.id === "number"
    && (order.direction === "long" || order.direction === "short")
    && typeof order.symbol === "string"
    && typeof order.entryA === "number"
    && typeof order.entryB === "number"
    && typeof order.amountA === "number"
    && typeof order.amountB === "number"
    && typeof order.stopLoss === "number"
    && order.status === "pending")) {
    return null;
  }

  return {
    amountA: order.amountA,
    amountB: order.amountB,
    direction: order.direction,
    entryA: order.entryA,
    entryB: order.entryB,
    id: order.id,
    status: "pending",
    stopLoss: order.stopLoss,
    symbol: order.symbol,
    takeProfitTargets: normalizePendingOrderTakeProfitTargets(order.takeProfitTargets),
  };
}

function normalizePendingOrderTakeProfitTargets(value: unknown): PendingOrderTakeProfitTarget[] {
  if (!Array.isArray(value)) {
    return DEFAULT_TAKE_PROFIT_TARGETS.map((target) => ({ ...target, price: 0 }));
  }

  const targets = value.filter((target): target is PendingOrderTakeProfitTarget => {
    if (!target || typeof target !== "object") {
      return false;
    }

    const candidate = target as Partial<PendingOrderTakeProfitTarget>;
    return TAKE_PROFIT_TARGET_IDS.some((id) => id === candidate.id)
      && isRewardRiskRatio(candidate.ratio)
      && typeof candidate.closePercent === "number"
      && Number.isFinite(candidate.closePercent)
      && candidate.closePercent >= 0
      && candidate.closePercent <= 100
      && typeof candidate.price === "number"
      && Number.isFinite(candidate.price);
  });

  if (targets.length !== TAKE_PROFIT_TARGET_IDS.length) {
    return DEFAULT_TAKE_PROFIT_TARGETS.map((target) => ({ ...target, price: 0 }));
  }

  return TAKE_PROFIT_TARGET_IDS.map((id, index) => targets.find((target) => target.id === id) ?? {
    ...DEFAULT_TAKE_PROFIT_TARGETS[index],
    price: 0,
  });
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

export function toRewardRiskRatio(value: string): RewardRiskRatio {
  const numericValue = Number(value);
  return RATIO_OPTIONS.find((option) => option === numericValue) ?? INITIAL_DASHBOARD_STATE.ratio;
}

export function toTakeProfitClosePercent(value: string): number {
  const numericValue = Number(sanitizeIntegerInput(value));

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.min(100, numericValue));
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

function normalizeTakeProfitClosePercent(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
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

export function formatTakeProfitTargetSummary(targets: readonly Pick<PendingOrderTakeProfitTarget, "closePercent" | "price">[]): string {
  if (targets.length === 0) {
    return "-";
  }

  return targets
    .map((target, index) => `TP${index + 1} ${target.price > 0 ? target.price.toFixed(2) : "-"} / ${target.closePercent}%`)
    .join(" · ");
}

export function formatPricePair(entryA: number, entryB: number): string {
  return entryB > 0 ? `${formatPrice(entryA)} / ${formatPrice(entryB)}` : formatPrice(entryA);
}

export function formatAmountPair(amountA: number, amountB: number): string {
  return amountB > 0 ? `${formatAmount(amountA)} / ${formatAmount(amountB)}` : formatAmount(amountA);
}
