import type { KlineInterval, MarketCandle, MarketSymbol } from "@/app/_types/market";
import {
  ACCOUNT_BALANCE,
  BUDGET_OPTIONS,
  COUNTDOWN_URGENT_MS,
  INITIAL_DASHBOARD_STATE,
  KLINE_AXIS_BADGE_EDGE_GUARD_PX,
  KLINE_INTERVAL_MS_BY_INTERVAL,
  MAX_COUNTDOWNS,
  MINI_KLINE_CHART_HEIGHT_PX,
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
  const entryB = parseDecimal(form.entryB);
  const percentA = form.percentA;
  const remainPercent = 100 - percentA;
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

  if (entryB > 0 && entryB === stopLoss) {
    entryBWarning = "不能等於止损价";
  } else if (entryB > 0 && entryA > 0 && stopLoss > 0) {
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
  const baseClassName = "h-9 min-w-10 flex-1 rounded-md border px-2 text-[11px] transition hover:border-[#00d4aa]";

  if (!isActive) {
    return `${baseClassName} border-[#d8d8e0] bg-transparent text-[#8b8b9a]`;
  }

  if (tone === "danger-low") {
    return `${baseClassName} border-[#27ae60] bg-[#27ae60] font-semibold text-[#18181f]`;
  }

  if (tone === "danger-mid") {
    return `${baseClassName} border-[#f39c12] bg-[#f39c12] font-semibold text-[#18181f]`;
  }

  if (tone === "danger-high") {
    return `${baseClassName} border-[#e74c3c] bg-[#e74c3c] font-semibold text-white`;
  }

  return `${baseClassName} border-[#9b59b6] bg-[#9b59b6] font-semibold text-white`;
}

export function getBudgetTone(value: BudgetPercent): SegmentTone {
  if (value === 1) {
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
  return `rounded-md px-2.5 py-1 text-sm font-bold tabular-nums text-white shadow-[0_2px_12px_rgba(255,107,107,0.4)] ${isUrgent ? "bg-gradient-to-br from-[#ff4757] to-[#c0392b]" : "bg-gradient-to-br from-[#ff6b6b] to-[#ee5a24]"}`;
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

export function getBulkOrderNotice(type: BulkActionType): string {
  return `${getBulkOrderLabel(type)}完成。`;
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

export function createPrioritizedBaseSymbols(markets: readonly MarketSymbol[]): string[] {
  const baseSymbols = markets
    .map(toBinanceBaseSymbol)
    .filter((symbol): symbol is string => symbol !== null);

  return prioritizeBaseSymbols(baseSymbols);
}

function toBinanceBaseSymbol(market: MarketSymbol): string | null {
  const baseSymbol = market.split("/")[0]?.trim().toUpperCase() ?? "";
  return baseSymbol.length > 0 ? baseSymbol : null;
}

function prioritizeBaseSymbols(symbols: readonly string[]): string[] {
  const uniqueSymbols = Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)));
  const prioritySymbols = PRIORITY_SYMBOLS.filter((symbol) => uniqueSymbols.includes(symbol));
  const restSymbols = uniqueSymbols
    .filter((symbol) => !PRIORITY_SYMBOLS.includes(symbol as typeof PRIORITY_SYMBOLS[number]))
    .sort((left, right) => left.localeCompare(right));

  return [...prioritySymbols, ...restSymbols];
}

export function matchBaseSymbols(options: readonly string[], normalizedQuery: string): string[] {
  if (normalizedQuery.length === 0) {
    return options as string[];
  }

  return options
    .map((symbol, index) => ({
      index,
      score: scoreBaseSymbolMatch(symbol, normalizedQuery),
      symbol,
    }))
    .filter(isRankedBaseSymbolSearchResult)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      return left.index - right.index;
    })
    .map((result) => result.symbol);
}

type BaseSymbolSearchResult = {
  index: number;
  score: number | null;
  symbol: string;
};

type RankedBaseSymbolSearchResult = BaseSymbolSearchResult & {
  score: number;
};

function isRankedBaseSymbolSearchResult(result: BaseSymbolSearchResult): result is RankedBaseSymbolSearchResult {
  return result.score !== null;
}

function scoreBaseSymbolMatch(symbol: string, normalizedQuery: string): number | null {
  const normalizedSymbol = symbol.toUpperCase();
  const compactSymbol = `${normalizedSymbol}USDT`;
  const symbolIndex = normalizedSymbol.indexOf(normalizedQuery);
  const compactIndex = compactSymbol.indexOf(normalizedQuery);

  if (normalizedSymbol === normalizedQuery) {
    return 0;
  }

  if (compactSymbol === normalizedQuery) {
    return 1;
  }

  if (normalizedSymbol.startsWith(normalizedQuery)) {
    return 10 + normalizedSymbol.length;
  }

  if (compactSymbol.startsWith(normalizedQuery)) {
    return 30 + compactSymbol.length;
  }

  if (symbolIndex >= 0) {
    return 50 + symbolIndex * 100 + normalizedSymbol.length;
  }

  if (compactIndex >= 0) {
    return 80 + compactIndex * 100 + compactSymbol.length;
  }

  return null;
}

export function parseStoredDashboardState(rawState: string | null): DashboardState {
  if (!rawState) {
    return INITIAL_DASHBOARD_STATE;
  }

  try {
    const parsed = JSON.parse(rawState) as Partial<DashboardState>;
    return {
      apiBound: parsed.apiBound === true,
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

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
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

export function formatMiniKlineCountdown(candle: MarketCandle | null, interval: KlineInterval, currentNow: number): string {
  if (!candle || currentNow <= 0) {
    return "--:--";
  }

  return formatCountdown(candle.sourceTimeMs + KLINE_INTERVAL_MS_BY_INTERVAL[interval] - currentNow);
}

export function getCandleAmplitudePercent(candle: MarketCandle): number {
  return candle.open > 0 ? (candle.high - candle.low) / candle.open * 100 : 0;
}

export function getCandleChangePercent(candle: MarketCandle): number {
  return candle.open > 0 ? (candle.close - candle.open) / candle.open * 100 : 0;
}

export function getKlineChangeTone(candle: MarketCandle): "down" | "up" {
  return getCandleChangePercent(candle) >= 0 ? "up" : "down";
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

export function formatLivePrice(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) {
    return "--";
  }

  const fractionDigits = value >= 1_000 ? 2 : value >= 1 ? 4 : 6;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: value >= 1 ? 2 : 0,
  }).format(value);
}

export function formatAxisPrice(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) {
    return "--";
  }

  const fractionDigits = value >= 1_000 ? 1 : value >= 1 ? 4 : 6;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: value >= 1_000 ? 1 : value >= 1 ? 2 : 0,
    useGrouping: false,
  }).format(value);
}

export function clampAxisBadgeTop(coordinate: number): number {
  return Math.min(
    Math.max(coordinate, KLINE_AXIS_BADGE_EDGE_GUARD_PX),
    MINI_KLINE_CHART_HEIGHT_PX - KLINE_AXIS_BADGE_EDGE_GUARD_PX,
  );
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatSignedPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${formatPercent(value)}`;
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
