import type {
  CopyTradingRadarSnapshot,
  CopyTradingTrader,
  CopyTradingTraderPerformance,
} from "@/types/copy-trading";
import { getResolvedKolAvatarUrl } from "@/lib/kol-avatar";
import {
  COPY_TRADING_RADAR_TRADE_LIMIT,
  DEFAULT_TRADER_PLATFORM,
  LIST_SIGNAL_SOURCE_SORT_BY,
  SMART_MONEY_SIGNAL_TYPE,
} from "./constants";
import {
  adaptListSignalSourceMetricPnlCurve,
  adaptListSignalSourceMetricReturnCurve,
  adaptSignalCenterPnlCurvePointList,
  adaptSignalCenterReturnCurvePointList,
  parsePercentageRatio,
} from "./curve";
import { createMockEquityEtfSignals } from "./equity-signals";
import {
  clampPercent,
  clampSignedRatio,
  createAvatarDataUrl,
  isFiniteNumber,
  normalizeNullableTimestamp,
  normalizeTimestamp,
  parseNonNegativeInteger,
  parseNumber,
  readNonEmptyString,
  stableSeed,
} from "./parsers";
import { adaptSignalCenterPositions, createPositionLookup } from "./positions";
import { filterDisplayableSignalCenterTrades, adaptSignalCenterTrades, isLossTrade } from "./trades";
import type {
  CopyTradingSignalSourceSortKey,
  PositionsResponse,
  SignalCenterListSignalSourceExchangeData,
  SignalCenterListSignalSourceMetrics,
  SignalCenterPositionSnapshot,
  SignalCenterRadarSourcePerformance,
  SignalCenterRadarSourceRuntime,
  SignalCenterSignalSource,
  SignalCenterTradeEvent,
  SourceRuntimeData,
  TradesResponse,
} from "./types";
import { requestSignalCenterJson } from "./client";

export function getListSignalSourceSortBy(sortKey: CopyTradingSignalSourceSortKey | string | undefined): string | null {
  if (!sortKey) {
    return null;
  }

  return LIST_SIGNAL_SOURCE_SORT_BY[sortKey as CopyTradingSignalSourceSortKey] ?? null;
}

async function loadSourceRuntimeData(source: SignalCenterSignalSource): Promise<SourceRuntimeData> {
  const [positionsResponse, tradesResponse] = await Promise.all([
    requestSignalCenterJson<PositionsResponse>(`/v1/signal-sources/${encodeURIComponent(source.id)}/positions`),
    requestSignalCenterJson<TradesResponse>(`/v1/signal-sources/${encodeURIComponent(source.id)}/trades?limit=${COPY_TRADING_RADAR_TRADE_LIMIT}&includeSkipped=false`),
  ]);

  return {
    performance: null,
    source,
    positions: positionsResponse.positions ?? [],
    trades: tradesResponse.trades ?? [],
  };
}

export async function loadLegacySourceRuntimeData(sources: readonly SignalCenterSignalSource[]): Promise<SourceRuntimeData[]> {
  const results = await Promise.allSettled(sources.map(loadSourceRuntimeData));
  return results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
}

export function normalizeRadarRuntimeData(runtimeSources: readonly SignalCenterRadarSourceRuntime[]): SourceRuntimeData[] {
  return runtimeSources.flatMap((runtimeSource) => {
    if (!runtimeSource.source) {
      return [];
    }
    return [{
      performance: runtimeSource.performance
        ?? adaptListSignalSourceMetrics(runtimeSource.metrics ?? null, runtimeSource.exchangeData ?? null, runtimeSource.source),
      source: runtimeSource.source,
      positions: runtimeSource.positions ?? [],
      trades: filterDisplayableSignalCenterTrades(runtimeSource.trades ?? []),
    }];
  });
}

function adaptListSignalSourceMetrics(
  metrics: SignalCenterListSignalSourceMetrics | null,
  exchangeData: SignalCenterListSignalSourceExchangeData | null,
  source: SignalCenterSignalSource,
): SignalCenterRadarSourcePerformance | null {
  if (!metrics && !exchangeData?.raw) {
    return null;
  }

  const raw = exchangeData?.raw ?? {};
  return {
    aum: parseNumber(metrics?.aum ?? metrics?.aumAmount ?? metrics?.aum_amount ?? raw.aumAmount),
    copierPnl: parseNumber(metrics?.copierPnl ?? metrics?.copier_pnl ?? metrics?.followerPnl ?? metrics?.follower_pnl ?? raw.copierPnl),
    copierPnlAsset: readNonEmptyString(metrics?.copierPnlAsset ?? metrics?.copier_pnl_asset ?? raw.copierPnlAsset) ?? "USDT",
    followers: parseNonNegativeInteger(metrics?.followers ?? raw.currentCopyCount ?? raw.totalCopyCount),
    marginBalance: parseNumber(metrics?.marginBalance ?? metrics?.margin_balance ?? raw.marginBalance ?? source.margin),
    maxDrawdown: parsePercentageRatio(metrics?.maxDrawdown ?? metrics?.max_drawdown),
    pnl: parseNumber(metrics?.pnl),
    pnlCurve: adaptListSignalSourceMetricPnlCurve(metrics?.pnlPoints ?? metrics?.pnl_points ?? []),
    returnCurve: adaptListSignalSourceMetricReturnCurve(metrics?.roiPoints ?? metrics?.roi_points ?? []),
    roi: parsePercentageRatio(metrics?.roi),
    sharpeRatio: parseNumber(metrics?.sharpe ?? metrics?.sharpeRatio ?? metrics?.sharpe_ratio ?? raw.sharpRatio),
    updatedAt: metrics?.updatedAt ?? metrics?.updated_at ?? null,
    winRate: parsePercentageRatio(metrics?.winRate ?? metrics?.win_rate),
    window: metrics?.window ?? null,
  };
}

export function adaptSignalCenterRuntimeData(
  runtimeData: SourceRuntimeData[],
  updatedAtSource: Date | string = new Date(),
): CopyTradingRadarSnapshot {
  const updatedAtDate = updatedAtSource instanceof Date ? updatedAtSource : new Date(updatedAtSource);
  const safeUpdatedAtDate = Number.isFinite(updatedAtDate.getTime()) ? updatedAtDate : new Date();
  const updatedAt = normalizeTimestamp(safeUpdatedAtDate.toISOString());
  const traders = runtimeData.map(({ performance, positions, source, trades }, index) => adaptSignalCenterTrader(source, positions, trades, performance, index));
  const positions = runtimeData.flatMap(({ positions: snapshots, source }) =>
    adaptSignalCenterPositions(source, snapshots),
  );
  const positionsBySourceAndSymbol = createPositionLookup(positions);
  const events = runtimeData.flatMap(({ source, trades }) => adaptSignalCenterTrades(source, trades, positionsBySourceAndSymbol));

  return {
    traders,
    positions,
    events: events.sort((left, right) => Date.parse(right.occurred_at) - Date.parse(left.occurred_at)),
    equity_etf_signals: createMockEquityEtfSignals(safeUpdatedAtDate),
    updated_at: updatedAt,
  };
}

function adaptSignalCenterTrader(
  source: SignalCenterSignalSource,
  positions: readonly SignalCenterPositionSnapshot[],
  trades: readonly SignalCenterTradeEvent[],
  performance: SignalCenterRadarSourcePerformance | null,
  index: number,
): CopyTradingTrader {
  const seed = stableSeed(source.id || source.name || String(index));
  const pnlValues = positions.map((position) => parseNumber(position.unPnl ?? position.unrealizedPnl)).filter(isFiniteNumber);
  const aggregatePnl = pnlValues.reduce((sum, value) => sum + value, 0);
  const sourceStatus = source.status.toUpperCase();
  const visiblePositionCount = positions.filter((position) => Math.abs(parseNumber(position.qty) ?? 0) > 0).length;
  const riskLevel = sourceStatus !== "ACTIVE" ? "high" : visiblePositionCount >= 4 ? "high" : visiblePositionCount >= 2 ? "medium" : "low";
  const marginBalance = parseNumber(source.margin);
  const normalizedPerformance = adaptSignalCenterSourcePerformance(performance);
  const traderName = source.name || source.id;

  return {
    trader_id: source.id,
    name: traderName,
    platform: source.signalType === SMART_MONEY_SIGNAL_TYPE ? DEFAULT_TRADER_PLATFORM : source.signalType || "Signal Center",
    avatar: getResolvedKolAvatarUrl(traderName, getSignalCenterSourceAvatarUrl(source) ?? createAvatarDataUrl(traderName, seed % 360)),
    followers: normalizedPerformance?.followers ?? 0,
    margin_balance: normalizedPerformance?.margin_balance ?? marginBalance,
    positions_synced_at: source.positionsSyncedTime ? normalizeTimestamp(source.positionsSyncedTime) : null,
    source_url: source.url ?? null,
    status: sourceStatus || "UNKNOWN",
    watch_status: index < 2 ? "pinned" : "watching",
    monthly_return: normalizedPerformance?.roi ?? clampSignedRatio(aggregatePnl / Math.max(1, Math.abs(marginBalance ?? 1))),
    win_rate: normalizedPerformance?.win_rate ?? clampPercent(trades.length === 0 ? 0 : trades.filter((trade) => !isLossTrade(trade)).length / trades.length),
    max_drawdown: normalizedPerformance?.max_drawdown ?? clampPercent(0.08 + (trades.filter((trade) => isLossTrade(trade)).length % 18) / 100),
    risk_level: riskLevel,
    performance: normalizedPerformance,
  };
}

function getSignalCenterSourceAvatarUrl(source: SignalCenterSignalSource): string | null {
  return readNonEmptyString(source.avatarUrl) ?? readNonEmptyString(source.avatar_url);
}

function adaptSignalCenterSourcePerformance(
  performance: SignalCenterRadarSourcePerformance | null,
): CopyTradingTraderPerformance | null {
  if (!performance) {
    return null;
  }

  return {
    aum: parseNumber(performance.aum),
    copier_pnl: parseNumber(performance.copierPnl ?? performance.copier_pnl),
    copier_pnl_asset: readNonEmptyString(performance.copierPnlAsset ?? performance.copier_pnl_asset) ?? "USDT",
    followers: parseNonNegativeInteger(performance.followers),
    margin_balance: parseNumber(performance.marginBalance ?? performance.margin_balance),
    max_drawdown: parseNumber(performance.maxDrawdown ?? performance.max_drawdown),
    pnl: parseNumber(performance.pnl),
    pnl_curve: adaptSignalCenterPnlCurvePointList(performance.pnlCurve ?? performance.pnl_curve ?? []),
    return_curve: adaptSignalCenterReturnCurvePointList(performance.returnCurve ?? performance.return_curve ?? []),
    roi: parseNumber(performance.roi),
    sharpe_ratio: parseNumber(performance.sharpeRatio ?? performance.sharpe_ratio),
    updated_at: normalizeNullableTimestamp(performance.updatedAt ?? performance.updated_at),
    win_rate: parseNumber(performance.winRate ?? performance.win_rate),
    window: readNonEmptyString(performance.window) ?? "30d",
  };
}

export function createSignalCenterSourceFromTrader(trader: CopyTradingTrader): SignalCenterSignalSource {
  return {
    id: trader.trader_id,
    name: trader.name,
    signalType: trader.platform || "Signal Center",
    status: trader.status || "UNKNOWN",
    margin: trader.margin_balance === null ? "" : String(trader.margin_balance),
    leaderId: trader.trader_id,
    leaderPrivate: false,
    positionShow: true,
    avatarUrl: trader.avatar,
    url: trader.source_url,
    isSpot: false,
    private: false,
    isAdmin: false,
    positionsSyncedTime: trader.positions_synced_at,
  };
}
