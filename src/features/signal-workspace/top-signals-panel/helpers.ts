import type { WorkspaceCopy } from "@/i18n/workspace";
import type { PriceColorMode } from "@/components/charts/kline-chart/types";
import type {
  CopyTradingDirection,
  CopyTradingEvent,
  CopyTradingPosition,
  CopyTradingRadarSnapshot,
  CopyTradingTrader,
} from "@/app/_types/copy-trading";

export type PnlColorMode = PriceColorMode;
export type TopSignalPerformanceWindow = "7d" | "30d" | "90d" | "180d";
export type TopSignalSortKey =
  | "aum"
  | "copierPnl"
  | "followers"
  | "maxDrawdown"
  | "pnl"
  | "roi"
  | "sharpeRatio";

export type TopSignalSourceModel = {
  events: CopyTradingEvent[];
  positions: CopyTradingPosition[];
  trader: CopyTradingTrader;
};


export function createTopSignalSourceModels(snapshot: CopyTradingRadarSnapshot | null): TopSignalSourceModel[] {
  if (!snapshot) {
    return [];
  }

  const positionsByTrader = groupBy(snapshot.positions, (position) => position.trader_id);
  const eventsByTrader = groupBy(snapshot.events, (event) => event.trader_id);

  return snapshot.traders
    .map((trader) => ({
      trader,
      positions: (positionsByTrader.get(trader.trader_id) ?? []).slice().sort(comparePositions),
      events: (eventsByTrader.get(trader.trader_id) ?? []).slice().sort(compareEventsDesc),
    }))
    .sort(compareSourceModels);
}

export function filterTopSignalSourceModelsBySource(models: readonly TopSignalSourceModel[], sourceId: string): TopSignalSourceModel[] {
  if (sourceId === "all" || !models.some((model) => model.trader.trader_id === sourceId)) {
    return [...models];
  }

  return models.filter((model) => model.trader.trader_id === sourceId);
}

export function sortTopSignalSourceModels(models: readonly TopSignalSourceModel[], sortKey: TopSignalSortKey): TopSignalSourceModel[] {
  return [...models].sort((left, right) => {
    const leftValue = getTopSignalSortValue(left, sortKey);
    const rightValue = getTopSignalSortValue(right, sortKey);
    if (leftValue === null && rightValue === null) {
      return compareSourceModels(left, right);
    }
    if (leftValue === null) {
      return 1;
    }
    if (rightValue === null) {
      return -1;
    }
    if (leftValue !== rightValue) {
      return sortKey === "maxDrawdown" ? leftValue - rightValue : rightValue - leftValue;
    }
    return compareSourceModels(left, right);
  });
}

export function getTopSignalSortValue(model: TopSignalSourceModel, sortKey: TopSignalSortKey): number | null {
  const performance = model.trader.performance;
  switch (sortKey) {
    case "aum":
      return performance?.aum ?? null;
    case "copierPnl":
      return performance?.copier_pnl ?? null;
    case "followers":
      return performance?.followers ?? model.trader.followers ?? null;
    case "maxDrawdown":
      return performance?.max_drawdown ?? model.trader.max_drawdown ?? null;
    case "pnl":
      return performance?.pnl ?? sumPositionUnrealizedPnlAmount(model.positions);
    case "roi":
      return performance?.roi ?? model.trader.monthly_return ?? calculateSourceModelPnlRatio(model);
    case "sharpeRatio":
      return performance?.sharpe_ratio ?? null;
    default:
      return null;
  }
}

export function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

export function compareSourceModels(left: TopSignalSourceModel, right: TopSignalSourceModel): number {
  const leftPnlRatio = calculateSourceModelPnlRatio(left);
  const rightPnlRatio = calculateSourceModelPnlRatio(right);
  if (leftPnlRatio !== null || rightPnlRatio !== null) {
    if (leftPnlRatio === null) {
      return 1;
    }

    if (rightPnlRatio === null) {
      return -1;
    }

    if (leftPnlRatio !== rightPnlRatio) {
      return rightPnlRatio - leftPnlRatio;
    }
  }

  if (left.positions.length !== right.positions.length) {
    return right.positions.length - left.positions.length;
  }

  const leftLatestTime = getLatestEventTime(left.events);
  const rightLatestTime = getLatestEventTime(right.events);
  if (leftLatestTime !== rightLatestTime) {
    return rightLatestTime - leftLatestTime;
  }

  return left.trader.name.localeCompare(right.trader.name);
}

export function calculateSourceModelPnlRatio(model: TopSignalSourceModel): number | null {
  return calculateAggregatePnlRatio(
    sumPositionUnrealizedPnlAmount(model.positions),
    sumPositionNotionalValue(model.positions),
  );
}

export function comparePositions(left: CopyTradingPosition, right: CopyTradingPosition): number {
  if (left.position_size_ratio !== right.position_size_ratio) {
    return right.position_size_ratio - left.position_size_ratio;
  }
  return left.symbol.localeCompare(right.symbol);
}

export function compareEventsDesc(left: CopyTradingEvent, right: CopyTradingEvent): number {
  return Date.parse(right.occurred_at) - Date.parse(left.occurred_at);
}

export function getLatestEventTime(events: readonly CopyTradingEvent[]): number {
  return events.reduce((latest, event) => Math.max(latest, Date.parse(event.occurred_at) || 0), 0);
}

export {
  getDirectionBadgeClassName,
  getNeutralBadgeClassName,
  getPnlClassName,
  getPnlFieldClassName,
  getPnlRatioClassName,
  getStatusBadgeClassName,
  getTopSignalCardBackClassName,
  getTopSignalCardClassName,
  getTopSignalStateCardClassName,
} from "./class-names";

export function formatDirection(direction: CopyTradingDirection, copy: WorkspaceCopy): string {
  return direction === "long" ? copy.kol.directionShort.long : copy.kol.directionShort.short;
}

export function formatCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return `$${formatCompactNumber(value)}`;
}

export function formatSignedCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  if (value === 0) {
    return "$0";
  }

  const prefix = value > 0 ? "+" : "-";
  return `${prefix}$${formatCompactNumber(Math.abs(value))}`;
}

export function formatAssetAmount(value: number | null, asset: string): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return `${formatCompactNumber(value)} ${asset}`;
}

export function formatSignedAssetAmount(value: number | null, asset: string): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  if (value === 0) {
    return `0 ${asset}`;
  }

  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${formatCompactNumber(Math.abs(value))} ${asset}`;
}

export function formatDecimal(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

export function formatInteger(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return Math.round(value).toLocaleString("en-US");
}

export function formatLeverage(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return `${value.toLocaleString("en-US", { maximumFractionDigits: value >= 10 ? 1 : 2 })}x`;
}

export function formatPnlWithRatio(amount: number | null, ratio: number | null): string {
  if (amount === null) {
    return "--";
  }

  const ratioText = ratio === null ? "" : ` (${formatSignedPercent(ratio)})`;
  return `${formatSignedCurrency(amount)}${ratioText}`;
}

export function formatPrice(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const maximumFractionDigits = Math.abs(value) >= 1_000 ? 2 : Math.abs(value) >= 1 ? 4 : 6;
  return value.toLocaleString("en-US", { maximumFractionDigits });
}

export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function formatCompactNumber(value: number): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Math.abs(value) >= 1_000 ? 0 : 2,
  });
}

export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "percent",
  }).format(value);
}

export function formatSignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const normalizedValue = Math.abs(value) < 0.00005 ? 0 : value;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    signDisplay: "exceptZero",
    style: "percent",
  }).format(normalizedValue);
}

export function formatDisplayTime(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value.replace("T", " ").slice(0, 16);
  }

  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const hours = String(parsedDate.getHours()).padStart(2, "0");
  const minutes = String(parsedDate.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hours}:${minutes}`;
}

export function formatReturnCurveDate(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "--";
  }

  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

export function sumPositionNotionalValue(positions: readonly CopyTradingPosition[]): number | null {
  const total = positions.reduce((sum, position) => {
    if (!Number.isFinite(position.notional_value)) {
      return sum;
    }

    return sum + position.notional_value;
  }, 0);

  return positions.length > 0 ? total : null;
}

export function calculateTotalLeverage(input: {
  accountMarginValue: number | null;
  positionMarginValue: number | null;
  totalNotionalValue: number | null;
}): number | null {
  const { accountMarginValue, positionMarginValue, totalNotionalValue } = input;
  if (totalNotionalValue === null || totalNotionalValue <= 0) {
    return null;
  }

  const marginBase = getPositiveFiniteNumber(accountMarginValue) ?? getPositiveFiniteNumber(positionMarginValue);
  if (marginBase === null) {
    return null;
  }

  return totalNotionalValue / marginBase;
}

export function calculateAggregatePnlRatio(pnlAmount: number | null, marginValue: number | null): number | null {
  if (pnlAmount === null) {
    return null;
  }

  const marginBase = getPositiveFiniteNumber(marginValue);
  if (marginBase === null) {
    return null;
  }

  return pnlAmount / marginBase;
}

export function sumPositionMarginValue(positions: readonly CopyTradingPosition[]): number | null {
  let hasMargin = false;
  const total = positions.reduce((sum, position) => {
    const marginValue = calculatePositionMarginValue(position);
    if (marginValue === null) {
      return sum;
    }

    hasMargin = true;
    return sum + marginValue;
  }, 0);

  return hasMargin ? total : null;
}

export function sumPositionUnrealizedPnlAmount(positions: readonly CopyTradingPosition[]): number | null {
  let hasPnl = false;
  const total = positions.reduce((sum, position) => {
    const pnlAmount = calculatePositionUnrealizedPnlAmount(position);
    if (pnlAmount === null) {
      return sum;
    }

    hasPnl = true;
    return sum + pnlAmount;
  }, 0);

  return hasPnl ? total : null;
}

export function calculatePositionUnrealizedPnlAmount(position: CopyTradingPosition): number | null {
  if (
    position.entry_price !== null
    && position.current_price !== null
    && Number.isFinite(position.entry_price)
    && Number.isFinite(position.current_price)
    && Number.isFinite(position.quantity)
  ) {
    const signedPriceMove = position.direction === "long"
      ? position.current_price - position.entry_price
      : position.entry_price - position.current_price;

    return signedPriceMove * Math.abs(position.quantity);
  }

  if (!Number.isFinite(position.unrealized_pnl) || !Number.isFinite(position.notional_value)) {
    return null;
  }

  return position.notional_value * position.unrealized_pnl;
}

export function calculatePositionMarginValue(position: CopyTradingPosition): number | null {
  const snapshotMargin = getPositiveFiniteNumber(position.margin_snapshot);
  if (snapshotMargin !== null) {
    return snapshotMargin;
  }

  if (!Number.isFinite(position.notional_value) || !Number.isFinite(position.leverage) || position.leverage <= 0) {
    return null;
  }

  return position.notional_value / position.leverage;
}

export function getPositiveFiniteNumber(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}
