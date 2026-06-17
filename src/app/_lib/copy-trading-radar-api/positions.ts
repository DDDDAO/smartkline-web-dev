import type {
  CopyTradingDirection,
  CopyTradingPosition,
  CopyTradingRadarSnapshot,
} from "@/app/_types/copy-trading";
import { FALLBACK_UPDATED_AT } from "./constants";
import {
  clampPercent,
  clampSignedRatio,
  normalizeTimestamp,
  parseNumber,
  parsePositiveNumber,
} from "./parsers";
import type { SignalCenterPositionSnapshot, SignalCenterSignalSource } from "./types";

export function adaptSignalCenterPositions(
  source: SignalCenterSignalSource,
  snapshots: readonly SignalCenterPositionSnapshot[],
): CopyTradingPosition[] {
  const nonZeroSnapshots = snapshots.filter((snapshot) => Math.abs(parseNumber(snapshot.qty) ?? 0) > 0);
  const totalNotional = nonZeroSnapshots.reduce((sum, snapshot) => sum + estimatePositionNotional(snapshot), 0);

  return nonZeroSnapshots.map((snapshot) => {
    const qty = Math.abs(parseNumber(snapshot.qty) ?? 0);
    const notional = Math.abs(readSignalCenterPositionNotional(snapshot) ?? 0);
    const entryPrice = readSignalCenterPositionEntryPrice(snapshot);
    const currentPrice = readSignalCenterPositionMarkPrice(snapshot)
      ?? derivePositionPriceFromNotional(snapshot, qty)
      ?? null;
    const direction = normalizeCopyTradingDirection(snapshot.key.side);
    const leverage = snapshot.leverage ?? 1;
    const effectiveEntryPrice = entryPrice ?? 0;
    const effectiveCurrentPrice = currentPrice ?? 0;
    const marginSnapshot = Math.abs(readSignalCenterPositionMarginSnapshot(snapshot) ?? 0);
    const reportedUnrealizedPnl = readSignalCenterPositionUnrealizedPnl(snapshot);
    const effectiveNotional = notional > 0 ? notional : effectiveCurrentPrice > 0 ? effectiveCurrentPrice * qty : effectiveEntryPrice * qty;
    const pnlBase = effectiveNotional > 0 ? effectiveNotional : Math.max(1, effectiveEntryPrice * qty);
    const derivedPnlRatio = calculatePositionPnlRatio(direction, entryPrice, currentPrice);
    const reportedPnlRatio = reportedUnrealizedPnl !== null && pnlBase > 0
      ? reportedUnrealizedPnl / pnlBase
      : null;
    const pnlRatio = reportedPnlRatio !== null && reportedPnlRatio !== 0
      ? reportedPnlRatio
      : (derivedPnlRatio ?? reportedPnlRatio ?? 0);

    return {
      position_id: `${source.id}:${snapshot.key.symbol}:${snapshot.key.side}`,
      trader_id: source.id,
      symbol: snapshot.key.symbol,
      direction,
      quantity: qty,
      entry_price: entryPrice,
      current_price: currentPrice,
      leverage,
      margin_snapshot: marginSnapshot || null,
      notional_value: effectiveNotional,
      position_size_ratio: totalNotional > 0 ? clampPercent(effectiveNotional / totalNotional) : 0,
      unrealized_pnl: clampSignedRatio(pnlRatio),
      open_time: normalizeTimestamp(snapshot.sourceUpdatedAt ?? snapshot.updatedAt ?? source.positionsSyncedTime ?? FALLBACK_UPDATED_AT),
      status: "holding",
    };
  });
}

export function estimatePositionNotional(snapshot: SignalCenterPositionSnapshot): number {
  const notional = Math.abs(readSignalCenterPositionNotional(snapshot) ?? 0);
  if (notional > 0) {
    return notional;
  }

  const qty = Math.abs(parseNumber(snapshot.qty) ?? 0);
  const markPrice = Math.abs(readSignalCenterPositionMarkPrice(snapshot) ?? 0);
  const entryPrice = Math.abs(readSignalCenterPositionEntryPrice(snapshot) ?? 0);
  return qty * (markPrice > 0 ? markPrice : entryPrice);
}

export function applyCopyTradingLatestPrices(
  snapshot: CopyTradingRadarSnapshot,
  latestPricesBySymbol: Readonly<Record<string, number>>,
): CopyTradingRadarSnapshot {
  if (Object.keys(latestPricesBySymbol).length === 0) {
    return snapshot;
  }

  let didUpdatePositionPrice = false;
  const priceUpdatedPositions = snapshot.positions.map((position) => {
    const latestPrice = latestPricesBySymbol[normalizeSignalCenterSymbolKey(position.symbol)];
    const nextPosition = applyLatestPriceToCopyTradingPosition(position, latestPrice);
    if (nextPosition !== position) {
      didUpdatePositionPrice = true;
    }
    return nextPosition;
  });

  if (!didUpdatePositionPrice) {
    return snapshot;
  }

  return {
    ...snapshot,
    positions: recalculateCopyTradingPositionSizeRatios(priceUpdatedPositions),
  };
}

export function applyLatestPriceToCopyTradingPosition(
  position: CopyTradingPosition,
  latestPriceValue: unknown,
): CopyTradingPosition {
  const latestPrice = parsePositiveNumber(latestPriceValue);
  if (latestPrice === null) {
    return position;
  }

  const nextNotional = position.quantity > 0
    ? latestPrice * position.quantity
    : position.notional_value;
  const nextPnlRatio = calculatePositionPnlRatio(
    position.direction,
    position.entry_price,
    latestPrice,
  );
  const nextUnrealizedPnl = nextPnlRatio ?? position.unrealized_pnl;

  if (
    position.current_price === latestPrice
    && position.notional_value === nextNotional
    && position.unrealized_pnl === nextUnrealizedPnl
  ) {
    return position;
  }

  return {
    ...position,
    current_price: latestPrice,
    notional_value: nextNotional,
    unrealized_pnl: nextUnrealizedPnl,
  };
}

export function recalculateCopyTradingPositionSizeRatios(
  positions: readonly CopyTradingPosition[],
): CopyTradingPosition[] {
  const totalNotionalByTrader = new Map<string, number>();
  for (const position of positions) {
    if (Number.isFinite(position.notional_value) && position.notional_value > 0) {
      totalNotionalByTrader.set(
        position.trader_id,
        (totalNotionalByTrader.get(position.trader_id) ?? 0) + position.notional_value,
      );
    }
  }

  return positions.map((position) => {
    const totalNotional = totalNotionalByTrader.get(position.trader_id) ?? 0;
    const nextPositionSizeRatio = totalNotional > 0
      ? clampPercent(position.notional_value / totalNotional)
      : 0;

    if (position.position_size_ratio === nextPositionSizeRatio) {
      return position;
    }

    return {
      ...position,
      position_size_ratio: nextPositionSizeRatio,
    };
  });
}

export function derivePositionPriceFromNotional(
  snapshot: SignalCenterPositionSnapshot,
  quantity: number,
): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }

  const notional = Math.abs(readSignalCenterPositionNotional(snapshot) ?? 0);
  if (!Number.isFinite(notional) || notional <= 0) {
    return null;
  }

  return notional / quantity;
}

export function createPositionLookup(positions: readonly CopyTradingPosition[]): Map<string, CopyTradingPosition> {
  const lookup = new Map<string, CopyTradingPosition>();
  for (const position of positions) {
    lookup.set(createPositionLookupKey(position.trader_id, position.symbol, position.direction), position);
  }
  return lookup;
}

export function createPositionLookupKey(traderId: string, symbol: string, side: string): string {
  return `${traderId}:${normalizeSignalCenterSymbolKey(symbol)}:${normalizeCopyTradingDirection(side)}`;
}

export function normalizeSignalCenterSymbolKey(symbol: string): string {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (!normalizedSymbol) {
    return "";
  }

  const [marketPair] = normalizedSymbol.split(":");
  return marketPair.replace("/", "");
}

export function readSignalCenterPositionMarkPrice(snapshot: SignalCenterPositionSnapshot): number | null {
  return parsePositiveNumber(snapshot.markPrice)
    ?? parsePositiveNumber(snapshot.mark_price)
    ?? parsePositiveNumber(snapshot.currentPrice)
    ?? parsePositiveNumber(snapshot.current_price)
    ?? parsePositiveNumber(snapshot.price)
    ?? parsePositiveNumber(snapshot.metadata?.markPrice)
    ?? parsePositiveNumber(snapshot.metadata?.mark_price)
    ?? parsePositiveNumber(snapshot.metadata?.currentPrice)
    ?? parsePositiveNumber(snapshot.metadata?.current_price)
    ?? parsePositiveNumber(snapshot.metadata?.price);
}

export function readSignalCenterPositionEntryPrice(snapshot: SignalCenterPositionSnapshot): number | null {
  return parsePositiveNumber(snapshot.entryPrice)
    ?? parsePositiveNumber(snapshot.entry_price)
    ?? parsePositiveNumber(snapshot.metadata?.entryPrice)
    ?? parsePositiveNumber(snapshot.metadata?.entry_price);
}

export function readSignalCenterPositionNotional(snapshot: SignalCenterPositionSnapshot): number | null {
  return parsePositiveNumber(snapshot.notionalValue)
    ?? parsePositiveNumber(snapshot.notional_value)
    ?? parsePositiveNumber(snapshot.metadata?.notionalValue)
    ?? parsePositiveNumber(snapshot.metadata?.notional_value);
}

export function readSignalCenterPositionMarginSnapshot(snapshot: SignalCenterPositionSnapshot): number | null {
  return parsePositiveNumber(snapshot.marginSnapshot)
    ?? parsePositiveNumber(snapshot.margin_snapshot)
    ?? parsePositiveNumber(snapshot.metadata?.marginSnapshot)
    ?? parsePositiveNumber(snapshot.metadata?.margin_snapshot);
}

export function readSignalCenterPositionUnrealizedPnl(snapshot: SignalCenterPositionSnapshot): number | null {
  return parseNumber(snapshot.unPnl)
    ?? parseNumber(snapshot.un_pnl)
    ?? parseNumber(snapshot.unrealizedPnl)
    ?? parseNumber(snapshot.unrealized_pnl)
    ?? parseNumber(snapshot.metadata?.unPnl)
    ?? parseNumber(snapshot.metadata?.un_pnl)
    ?? parseNumber(snapshot.metadata?.unrealizedPnl)
    ?? parseNumber(snapshot.metadata?.unrealized_pnl);
}

export function normalizeCopyTradingDirection(value: string | null | undefined): CopyTradingDirection {
  return String(value).toLowerCase() === "short" ? "short" : "long";
}

export function calculateMockPositionPnlRatio(
  direction: CopyTradingDirection,
  entryPrice: number,
  currentPrice: number,
): number {
  return calculatePositionPnlRatio(direction, entryPrice, currentPrice) ?? 0;
}

export function calculatePositionPnlRatio(
  direction: CopyTradingDirection,
  entryPrice: number | null,
  currentPrice: number | null,
): number | null {
  if (entryPrice === null || currentPrice === null || entryPrice <= 0 || currentPrice <= 0) {
    return null;
  }

  const priceMove = direction === "long"
    ? currentPrice / entryPrice - 1
    : entryPrice / currentPrice - 1;
  return clampSignedRatio(priceMove);
}
