import type {
  CopyTradingPosition,
  CopyTradingRadarSnapshot,
  CopyTradingReturnCurve,
  CopyTradingReturnCurveWindow,
  CopyTradingTrader,
} from "@/app/_types/copy-trading";
import {
  COPY_TRADING_RADAR_SOURCE_LIMIT,
  COPY_TRADING_RADAR_TRADE_LIMIT,
} from "./constants";
import { adaptSignalCenterReturnCurvePoints } from "./curve";
import { normalizeNullableTimestamp } from "./parsers";
import { createPositionLookup } from "./positions";
import {
  adaptSignalCenterRuntimeData,
  createSignalCenterSourceFromTrader,
  getListSignalSourceSortBy,
  loadLegacySourceRuntimeData,
  normalizeRadarRuntimeData,
} from "./runtime";
import { adaptSignalCenterTrades } from "./trades";
import type {
  CopyTradingSignalSourceSortKey,
  CopyTradingTradeHistoryPage,
  SignalCenterRadarSnapshotResponse,
  SignalCenterReturnCurveResponse,
  SignalSourcesResponse,
  TradesResponse,
} from "./types";
import { requestSignalCenterJson } from "./client";

export async function fetchCopyTradingRadarSnapshot({
  includePerformance = true,
  performanceWindow = "30d",
  sortKey,
}: {
  includePerformance?: boolean;
  performanceWindow?: CopyTradingReturnCurveWindow | string;
  sortKey?: CopyTradingSignalSourceSortKey | string;
} = {}): Promise<CopyTradingRadarSnapshot> {
  const listParams = new URLSearchParams({
    includeSkipped: "false",
    page: "1",
    pageSize: String(COPY_TRADING_RADAR_SOURCE_LIMIT),
    tradeLimit: String(COPY_TRADING_RADAR_TRADE_LIMIT),
    window: performanceWindow,
  });
  if (includePerformance) {
    listParams.set("includePerformance", "true");
  }
  const listSortBy = getListSignalSourceSortBy(sortKey);
  if (listSortBy) {
    listParams.set("sortBy", listSortBy);
    listParams.set("sortOrder", sortKey === "maxDrawdown" ? "asc" : "desc");
  }

  try {
    const listResponse = await requestSignalCenterJson<SignalCenterRadarSnapshotResponse>(`/v1/list-signals-sources?${listParams.toString()}`);
    const runtimeData = normalizeRadarRuntimeData(listResponse.sources ?? []);
    return adaptSignalCenterRuntimeData(runtimeData, listResponse.updatedAt ?? undefined);
  } catch {
    /**
     * The new list endpoint is the preferred path for Top Signals because it
     * carries source metrics and return curves in one sorted payload. Keep the
     * older aggregated endpoint as rollout fallback for environments that have
     * not deployed /v1/list-signals-sources yet.
     */
  }

  const radarParams = new URLSearchParams({
    includeSkipped: "false",
    sourceLimit: String(COPY_TRADING_RADAR_SOURCE_LIMIT),
    tradeLimit: String(COPY_TRADING_RADAR_TRADE_LIMIT),
  });
  if (includePerformance) {
    radarParams.set("includePerformance", "true");
    radarParams.set("window", performanceWindow);
  }

  try {
    const radarResponse = await requestSignalCenterJson<SignalCenterRadarSnapshotResponse>(`/v1/copy-trading-radar?${radarParams.toString()}`);
    const runtimeData = normalizeRadarRuntimeData(radarResponse.sources ?? []);
    return adaptSignalCenterRuntimeData(runtimeData, radarResponse.updatedAt ?? undefined);
  } catch {
    /**
     * Older Signal Center deployments do not expose the aggregated radar
     * endpoint. The legacy per-source path keeps the frontend deployable while
     * the backend rollout catches up.
     */
  }

  const sourcesResponse = await requestSignalCenterJson<SignalSourcesResponse>("/v1/signal-sources");
  const sources = sourcesResponse.sources ?? [];

  if (sources.length === 0) {
    throw new Error("Signal Center did not return signal sources.");
  }

  const runtimeData = await loadLegacySourceRuntimeData(sources.slice(0, COPY_TRADING_RADAR_SOURCE_LIMIT));
  if (runtimeData.length === 0) {
    throw new Error("Signal Center returned sources, but no positions or trades could be loaded.");
  }
  return adaptSignalCenterRuntimeData(runtimeData);
}

export async function fetchCopyTradingSourceTradeHistoryPage({
  limit = COPY_TRADING_RADAR_TRADE_LIMIT,
  offset = 0,
  positions,
  trader,
}: {
  limit?: number;
  offset?: number;
  positions: readonly CopyTradingPosition[];
  trader: CopyTradingTrader;
}): Promise<CopyTradingTradeHistoryPage> {
  const safeLimit = Math.max(1, Math.min(COPY_TRADING_RADAR_TRADE_LIMIT, Math.floor(limit)));
  const safeOffset = Math.max(0, Math.floor(offset));
  const tradesResponse = await requestSignalCenterJson<TradesResponse>(
    `/v1/signal-sources/${encodeURIComponent(trader.trader_id)}/trades?limit=${safeLimit}&offset=${safeOffset}&includeSkipped=false`,
  );
  const source = createSignalCenterSourceFromTrader(trader);
  const positionsBySourceAndSymbol = createPositionLookup(positions);
  const events = adaptSignalCenterTrades(
    source,
    tradesResponse.trades ?? [],
    positionsBySourceAndSymbol,
  );

  return {
    events,
    hasMore: Boolean(tradesResponse.meta?.hasMore),
    nextOffset: safeOffset + Math.max(0, tradesResponse.meta?.returnedCount ?? events.length),
    returnedCount: events.length,
  };
}

export async function fetchCopyTradingSourceReturnCurve({
  sourceId,
  window = "90d",
}: {
  sourceId: string;
  window?: CopyTradingReturnCurveWindow | string;
}): Promise<CopyTradingReturnCurve> {
  const response = await requestSignalCenterJson<SignalCenterReturnCurveResponse>(
    `/v1/signal-sources/${encodeURIComponent(sourceId)}/return-curve?window=${encodeURIComponent(window)}`,
  );

  return {
    points: adaptSignalCenterReturnCurvePoints(response),
    sourceId: response.sourceId ?? response.source_id ?? sourceId,
    updatedAt: normalizeNullableTimestamp(response.updatedAt ?? response.updated_at),
    window: response.window ?? window,
  };
}
