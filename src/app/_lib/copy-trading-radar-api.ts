import {
  fetchHistoricalCandles,
  fetchUsdtPerpetualMarkPrices,
} from "@/app/_lib/binance-market-data";
import type { MarketCandle, MarketSymbol } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";
import type {
  CopyTradingDirection,
  CopyTradingEvent,
  CopyTradingEventType,
  CopyTradingPosition,
  CopyTradingRadarSnapshot,
  CopyTradingRiskLevel,
  CopyTradingTradeMarker,
  CopyTradingTradeMarkerSide,
  CopyTradingTrader,
  EquityEtfSignal,
} from "@/app/_types/copy-trading";

const SIGNAL_CENTER_PROXY_BASE_URL = "/api/signal-center";
const SMART_MONEY_SIGNAL_TYPE = "BinanceSmartMoney";
const FALLBACK_UPDATED_AT = "2026-06-05T12:00:00+08:00";
const DEFAULT_TRADER_PLATFORM = "Binance Square";
const USDT_SUFFIX = "USDT";
const MOCK_MARKET_ALIGNMENT_TIMEOUT_MS = 2_500;
const MOCK_MARKET_ALIGNMENT_HISTORY_LIMIT = 180;
const COPY_TRADING_RADAR_SOURCE_LIMIT = 200;
export const COPY_TRADING_RADAR_TRADE_LIMIT = 200;

const REQUIRED_EVENT_TYPES: CopyTradingEventType[] = [
  "open",
  "add",
  "reduce",
  "close",
  "reverse",
  "take_profit",
  "stop_loss",
  "trailing_stop",
  "oversized_position",
  "losing_streak",
];

const MOCK_SIGNAL_CENTER_SOURCES: SignalCenterSignalSource[] = [
  createMockSignalSource({
    id: "trader_xingchen",
    name: "星辰",
    hue: 194,
    leaderId: "mock-leader-xingchen",
    margin: 96_000,
    leaderPrivate: false,
  }),
  createMockSignalSource({
    id: "trader_yongxing",
    name: "勇行",
    hue: 152,
    leaderId: "mock-leader-yongxing",
    margin: 128_000,
    leaderPrivate: false,
  }),
  createMockSignalSource({
    id: "trader_custom_watch",
    name: "自选观察",
    hue: 268,
    leaderId: "mock-leader-custom-watch",
    margin: 58_000,
    leaderPrivate: true,
  }),
];

const MOCK_REFERENCE_PRICES: Record<string, number> = {
  BNBUSDT: 660,
  BTCUSDT: 110_000,
  ETHUSDT: 3_800,
  SOLUSDT: 166,
};

let cachedMarketAlignedMockSnapshot: CopyTradingRadarSnapshot | null = null;
let pendingMarketAlignedMockSnapshot: Promise<CopyTradingRadarSnapshot> | null = null;

export type SignalCenterSignalSource = {
  id: string;
  name: string;
  signalType: string;
  status: string;
  margin: string;
  leaderId: string;
  leaderPrivate: boolean;
  positionShow: boolean;
  avatarUrl?: string | null;
  url?: string | null;
  isSpot: boolean;
  private: boolean;
  isAdmin: boolean;
  positionsSyncedTime?: string | null;
};

type SignalCenterPositionSnapshot = {
  key: {
    signalSourceId: string;
    symbol: string;
    side: string;
  };
  qty: string;
  leverage?: number;
  marginSnapshot?: string;
  margin_snapshot?: string;
  markPrice?: string;
  mark_price?: string;
  currentPrice?: string;
  current_price?: string;
  price?: string;
  entryPrice?: string;
  entry_price?: string;
  notionalValue?: string;
  notional_value?: string;
  unPnl?: string;
  un_pnl?: string;
  unrealizedPnl?: string;
  unrealized_pnl?: string;
  metadata?: Record<string, unknown>;
  sourceUpdatedAt?: string;
  updatedAt?: string;
};

type SignalCenterTradeEvent = {
  eventId: string;
  exchange: string;
  signalType: string;
  signalSourceId: string;
  symbol: string;
  side: string;
  action: string;
  prevQty: string;
  currQty: string;
  deltaQty: string;
  isFullClose: boolean;
  price?: number | string | null;
  priceSource?: string | null;
  price_source?: string | null;
  entryPrice?: number | string | null;
  entry_price?: number | string | null;
  markPrice?: number | string | null;
  mark_price?: number | string | null;
  skipped?: boolean | string | null;
  status?: string | null;
  tradeStatus?: string | null;
  trade_status?: string | null;
  sourceTimestamp: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

type SignalSourcesResponse = {
  sources?: SignalCenterSignalSource[] | null;
};

type PositionsResponse = {
  positions?: SignalCenterPositionSnapshot[] | null;
};

type TradesResponse = {
  sourceId?: string | null;
  trades?: SignalCenterTradeEvent[] | null;
  meta?: {
    hasMore?: boolean | null;
    includeSkipped?: boolean | null;
    limit?: number | null;
    offset?: number | null;
    returnedCount?: number | null;
  } | null;
};

export type CopyTradingTradeHistoryPage = {
  events: CopyTradingEvent[];
  hasMore: boolean;
  nextOffset: number;
  returnedCount: number;
};

type SignalCenterRadarSourceRuntime = {
  positions?: SignalCenterPositionSnapshot[] | null;
  source?: SignalCenterSignalSource | null;
  trades?: SignalCenterTradeEvent[] | null;
};

type SignalCenterRadarSnapshotResponse = {
  meta?: {
    matchedSourceCount?: number;
    returnedSourceCount?: number;
    signalType?: string;
    sourceCount?: number;
    sourceLimit?: number;
    tradeLimit?: number;
  } | null;
  sources?: SignalCenterRadarSourceRuntime[] | null;
  updatedAt?: string | null;
};

type SourceRuntimeData = {
  positions: SignalCenterPositionSnapshot[];
  source: SignalCenterSignalSource;
  trades: SignalCenterTradeEvent[];
};

type MockMarketReference = {
  candles: readonly MarketCandle[];
  fallbackPrice: number;
  symbol: string;
};

type MockPositionBlueprint = {
  direction: CopyTradingDirection;
  entryPriceRatio: number;
  leverage: number;
  notional: number;
  qty: number;
  sourceId: string;
  sourceUpdatedAtMinuteOffset: number;
  symbol: string;
};

type MockTradeBlueprint = {
  action: string;
  currQty: number;
  eventType?: CopyTradingEventType;
  isFullClose?: boolean;
  minuteOffset: number;
  prevQty: number;
  side: CopyTradingDirection;
  sourceId: string;
  symbol: string;
};

export async function fetchCopyTradingRadarSnapshot(): Promise<CopyTradingRadarSnapshot> {
  try {
    const radarResponse = await requestSignalCenterJson<SignalCenterRadarSnapshotResponse>(`/v1/copy-trading-radar?sourceLimit=${COPY_TRADING_RADAR_SOURCE_LIMIT}&tradeLimit=${COPY_TRADING_RADAR_TRADE_LIMIT}&includeSkipped=false`);
    const runtimeData = normalizeRadarRuntimeData(radarResponse.sources ?? []);
    const fallbackMarkPrices = await fetchRuntimeDataFallbackMarkPrices(runtimeData);
    return adaptSignalCenterRuntimeData(runtimeData, radarResponse.updatedAt ?? undefined, fallbackMarkPrices);
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
  const fallbackMarkPrices = await fetchRuntimeDataFallbackMarkPrices(runtimeData);
  return adaptSignalCenterRuntimeData(runtimeData, undefined, fallbackMarkPrices);
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

export async function createMarketAlignedMockCopyTradingRadarSnapshot(): Promise<CopyTradingRadarSnapshot> {
  if (cachedMarketAlignedMockSnapshot) {
    return cachedMarketAlignedMockSnapshot;
  }

  pendingMarketAlignedMockSnapshot ??= createMarketAlignedMockSnapshot()
    .catch(() => createMockCopyTradingRadarSnapshot())
    .finally(() => {
      pendingMarketAlignedMockSnapshot = null;
    });

  cachedMarketAlignedMockSnapshot = await pendingMarketAlignedMockSnapshot;
  return cachedMarketAlignedMockSnapshot;
}

export function createMockCopyTradingRadarSnapshot(now = new Date()): CopyTradingRadarSnapshot {
  return adaptSignalCenterRuntimeData(createMockSignalCenterRuntimeData({
    marketReferences: createFallbackMarketReferences(),
    now,
  }), now);
}

async function createMarketAlignedMockSnapshot(): Promise<CopyTradingRadarSnapshot> {
  const now = new Date();
  const marketReferences = await fetchMockMarketReferences();
  return adaptSignalCenterRuntimeData(createMockSignalCenterRuntimeData({ marketReferences, now }), now);
}

async function fetchMockMarketReferences(): Promise<Record<string, MockMarketReference>> {
  const symbols = Object.keys(MOCK_REFERENCE_PRICES);
  const entries = await Promise.all(symbols.map(async (symbol) => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), MOCK_MARKET_ALIGNMENT_TIMEOUT_MS);

    try {
      /**
       * Demo copy-trading events should stay usable in restricted market regions.
       * If Binance is unreachable, the same backend-shaped mock payload falls
       * back to deterministic fixture prices instead of skipping the radar.
       */
      const candles = await fetchHistoricalCandles(toCopyTradingMarketSymbol(symbol), "1m", {
        limit: MOCK_MARKET_ALIGNMENT_HISTORY_LIMIT,
        signal: abortController.signal,
      });
      return [symbol, { candles, fallbackPrice: MOCK_REFERENCE_PRICES[symbol] ?? 1, symbol }] as const;
    } catch {
      return [symbol, { candles: [], fallbackPrice: MOCK_REFERENCE_PRICES[symbol] ?? 1, symbol }] as const;
    } finally {
      clearTimeout(timeoutId);
    }
  }));

  return {
    ...createFallbackMarketReferences(),
    ...Object.fromEntries(entries),
  };
}

function createFallbackMarketReferences(): Record<string, MockMarketReference> {
  return Object.fromEntries(Object.entries(MOCK_REFERENCE_PRICES).map(([symbol, fallbackPrice]) => [
    symbol,
    { candles: [], fallbackPrice, symbol },
  ]));
}

function createMockSignalCenterRuntimeData(input: {
  marketReferences: Record<string, MockMarketReference>;
  now: Date;
}): SourceRuntimeData[] {
  const positionsBySource = new Map<string, SignalCenterPositionSnapshot[]>();
  const tradesBySource = new Map<string, SignalCenterTradeEvent[]>();

  for (const position of createMockPositionBlueprints()) {
    const sourcePositions = positionsBySource.get(position.sourceId) ?? [];
    sourcePositions.push(createMockPositionSnapshot(position, input.marketReferences, input.now));
    positionsBySource.set(position.sourceId, sourcePositions);
  }

  for (const trade of createMockTradeBlueprints()) {
    const sourceTrades = tradesBySource.get(trade.sourceId) ?? [];
    sourceTrades.push(createMockTradeEvent(trade, input.marketReferences, input.now));
    tradesBySource.set(trade.sourceId, sourceTrades);
  }

  return MOCK_SIGNAL_CENTER_SOURCES.map((source) => ({
    source: {
      ...source,
      positionsSyncedTime: formatDateTimeWithUtc8Offset(input.now),
    },
    positions: positionsBySource.get(source.id) ?? [],
    trades: tradesBySource.get(source.id) ?? [],
  }));
}

function createMockPositionBlueprints(): MockPositionBlueprint[] {
  return [
    {
      sourceId: "trader_xingchen",
      symbol: "BTCUSDT",
      direction: "long",
      qty: 0.18,
      leverage: 20,
      notional: 32_000,
      entryPriceRatio: 0.992,
      sourceUpdatedAtMinuteOffset: 118,
    },
    {
      sourceId: "trader_xingchen",
      symbol: "ETHUSDT",
      direction: "short",
      qty: 4.8,
      leverage: 12,
      notional: 18_000,
      entryPriceRatio: 1.01,
      sourceUpdatedAtMinuteOffset: 94,
    },
    {
      sourceId: "trader_yongxing",
      symbol: "SOLUSDT",
      direction: "long",
      qty: 108,
      leverage: 8,
      notional: 16_500,
      entryPriceRatio: 0.985,
      sourceUpdatedAtMinuteOffset: 71,
    },
    {
      sourceId: "trader_custom_watch",
      symbol: "BTCUSDT",
      direction: "short",
      qty: 0.22,
      leverage: 25,
      notional: 42_000,
      entryPriceRatio: 0.997,
      sourceUpdatedAtMinuteOffset: 42,
    },
  ];
}

function createMockTradeBlueprints(): MockTradeBlueprint[] {
  return [
    { sourceId: "trader_xingchen", symbol: "BTCUSDT", side: "long", action: "open_long", prevQty: 0, currQty: 0.12, minuteOffset: 118 },
    { sourceId: "trader_xingchen", symbol: "BTCUSDT", side: "long", action: "add_long", prevQty: 0.12, currQty: 0.18, minuteOffset: 83 },
    { sourceId: "trader_xingchen", symbol: "ETHUSDT", side: "short", action: "close_short", prevQty: 6.2, currQty: 4.8, minuteOffset: 67 },
    { sourceId: "trader_yongxing", symbol: "BNBUSDT", side: "short", action: "close_short", prevQty: 18, currQty: 0, minuteOffset: 59, isFullClose: true, eventType: "close" },
    { sourceId: "trader_custom_watch", symbol: "BTCUSDT", side: "short", action: "open_short", prevQty: 0, currQty: 0.16, minuteOffset: 44, eventType: "reverse" },
    { sourceId: "trader_yongxing", symbol: "SOLUSDT", side: "long", action: "take_profit", prevQty: 128, currQty: 108, minuteOffset: 39, eventType: "take_profit" },
    { sourceId: "trader_xingchen", symbol: "ETHUSDT", side: "short", action: "stop_loss", prevQty: 4.8, currQty: 3.1, minuteOffset: 31, eventType: "stop_loss" },
    { sourceId: "trader_xingchen", symbol: "BTCUSDT", side: "long", action: "trailing_stop", prevQty: 0.18, currQty: 0.18, minuteOffset: 26, eventType: "trailing_stop" },
    { sourceId: "trader_custom_watch", symbol: "BTCUSDT", side: "short", action: "leverage_change", prevQty: 0.16, currQty: 0.22, minuteOffset: 18, eventType: "oversized_position" },
    { sourceId: "trader_custom_watch", symbol: "BTCUSDT", side: "short", action: "close_short", prevQty: 0.22, currQty: 0.18, minuteOffset: 11, eventType: "losing_streak" },
  ];
}

function createMockPositionSnapshot(
  blueprint: MockPositionBlueprint,
  marketReferences: Record<string, MockMarketReference>,
  now: Date,
): SignalCenterPositionSnapshot {
  const currentPrice = readLatestReferencePrice(marketReferences[blueprint.symbol]);
  const entryPrice = roundMarketPrice(currentPrice * blueprint.entryPriceRatio);
  const marginSnapshot = blueprint.notional / blueprint.leverage;
  const pnlRatio = calculateMockPositionPnlRatio(blueprint.direction, entryPrice, currentPrice, blueprint.leverage);

  return {
    key: {
      signalSourceId: blueprint.sourceId,
      symbol: blueprint.symbol,
      side: blueprint.direction,
    },
    qty: formatQuantity(blueprint.qty),
    leverage: blueprint.leverage,
    marginSnapshot: formatNumberForApi(marginSnapshot),
    markPrice: formatNumberForApi(currentPrice),
    entryPrice: formatNumberForApi(entryPrice),
    notionalValue: formatNumberForApi(blueprint.notional),
    unPnl: formatNumberForApi(marginSnapshot * pnlRatio),
    sourceUpdatedAt: formatDateTimeWithUtc8Offset(new Date(now.getTime() - blueprint.sourceUpdatedAtMinuteOffset * 60_000)),
    updatedAt: formatDateTimeWithUtc8Offset(now),
  };
}

function createMockTradeEvent(
  blueprint: MockTradeBlueprint,
  marketReferences: Record<string, MockMarketReference>,
  now: Date,
): SignalCenterTradeEvent {
  const marketPoint = selectMockMarketPoint(marketReferences[blueprint.symbol], blueprint.minuteOffset, now);
  const eventType = blueprint.eventType ?? normalizeMockTradeActionToEventType(blueprint.action);

  return {
    eventId: `mock:${blueprint.sourceId}:${blueprint.symbol}:${eventType}:${blueprint.minuteOffset}`,
    exchange: "Binance",
    signalType: SMART_MONEY_SIGNAL_TYPE,
    signalSourceId: blueprint.sourceId,
    symbol: blueprint.symbol,
    side: blueprint.side,
    action: blueprint.action,
    prevQty: formatQuantity(blueprint.prevQty),
    currQty: formatQuantity(blueprint.currQty),
    deltaQty: formatQuantity(blueprint.currQty - blueprint.prevQty),
    isFullClose: blueprint.isFullClose ?? blueprint.currQty === 0,
    price: formatNumberForApi(marketPoint.price),
    sourceTimestamp: formatDateTimeWithUtc8Offset(new Date(marketPoint.sourceTimeMs)),
    timestamp: formatDateTimeWithUtc8Offset(new Date(marketPoint.sourceTimeMs + 8_000)),
    metadata: {
      eventType,
      event_type: eventType,
      source: "market-aligned-demo",
    },
  };
}

export function createCopyTradingChartSignals(snapshot: CopyTradingRadarSnapshot): StructuredSignal[] {
  const tradersById = new Map(snapshot.traders.map((trader) => [trader.trader_id, trader]));
  const positionsById = new Map(snapshot.positions.map((position) => [position.position_id, position]));
  return snapshot.events.map((event) => copyTradingEventToStructuredSignal(event, tradersById.get(event.trader_id), event.position_id ? positionsById.get(event.position_id) : undefined));
}

export function createCopyTradingTradeMarkers(snapshot: CopyTradingRadarSnapshot): CopyTradingTradeMarker[] {
  const tradersById = new Map(snapshot.traders.map((trader) => [trader.trader_id, trader]));
  return snapshot.events
    .map((event) => copyTradingEventToTradeMarker(event, tradersById.get(event.trader_id)))
    .filter((marker): marker is CopyTradingTradeMarker => marker !== null)
    .sort((left, right) => left.sourceTimeMs - right.sourceTimeMs || compareNullableNumbers(left.price, right.price));
}

export function getCopyTradingEventChartSignalId(eventId: string): string {
  return `copy-radar:${eventId}`;
}

export function isActiveCopyTradingTrader(trader: Pick<CopyTradingTrader, "status">): boolean {
  return trader.status.trim().toUpperCase() === "ACTIVE";
}

export function toCopyTradingMarketSymbol(symbol: string): MarketSymbol {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (/^[A-Z0-9]+\/USDT$/u.test(normalizedSymbol)) {
    return `${normalizedSymbol}:USDT`;
  }

  if (normalizedSymbol.includes("/")) {
    return normalizedSymbol;
  }

  if (normalizedSymbol.endsWith(USDT_SUFFIX)) {
    const baseAsset = normalizedSymbol.slice(0, -USDT_SUFFIX.length);
    return `${baseAsset}/USDT:USDT`;
  }

  return `${normalizedSymbol}/USDT:USDT`;
}

export function formatCopyTradingEventType(eventType: CopyTradingEventType): string {
  const labels: Record<CopyTradingEventType, string> = {
    open: "开仓",
    add: "加仓",
    reduce: "减仓",
    close: "平仓",
    reverse: "反手",
    take_profit: "止盈",
    stop_loss: "止损",
    trailing_stop: "移动止损",
    oversized_position: "仓位异常放大",
    losing_streak: "连续亏损",
  };
  return labels[eventType];
}

export function getCopyTradingRequiredEventTypes(): CopyTradingEventType[] {
  return REQUIRED_EVENT_TYPES;
}

async function loadSourceRuntimeData(source: SignalCenterSignalSource): Promise<SourceRuntimeData> {
  const [positionsResponse, tradesResponse] = await Promise.all([
    requestSignalCenterJson<PositionsResponse>(`/v1/signal-sources/${encodeURIComponent(source.id)}/positions`),
    requestSignalCenterJson<TradesResponse>(`/v1/signal-sources/${encodeURIComponent(source.id)}/trades?limit=${COPY_TRADING_RADAR_TRADE_LIMIT}&includeSkipped=false`),
  ]);

  return {
    source,
    positions: positionsResponse.positions ?? [],
    trades: tradesResponse.trades ?? [],
  };
}

async function loadLegacySourceRuntimeData(sources: readonly SignalCenterSignalSource[]): Promise<SourceRuntimeData[]> {
  const results = await Promise.allSettled(sources.map(loadSourceRuntimeData));
  return results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
}

function normalizeRadarRuntimeData(runtimeSources: readonly SignalCenterRadarSourceRuntime[]): SourceRuntimeData[] {
  return runtimeSources.flatMap((runtimeSource) => {
    if (!runtimeSource.source) {
      return [];
    }
    return [{
      source: runtimeSource.source,
      positions: runtimeSource.positions ?? [],
      trades: filterDisplayableSignalCenterTrades(runtimeSource.trades ?? []),
    }];
  });
}

async function fetchRuntimeDataFallbackMarkPrices(
  runtimeData: readonly SourceRuntimeData[],
): Promise<ReadonlyMap<string, number>> {
  const symbols = Array.from(new Set(
    runtimeData.flatMap(({ positions }) =>
      positions
        .filter((position) => Math.abs(parseNumber(position.qty) ?? 0) > 0)
        .filter((position) => readSignalCenterPositionMarkPrice(position) === null)
        .filter((position) => derivePositionPriceFromNotional(position, Math.abs(parseNumber(position.qty) ?? 0)) === null)
        .map((position) => position.key.symbol),
    ),
  ));

  if (symbols.length === 0) {
    return new Map();
  }

  try {
    return await fetchUsdtPerpetualMarkPrices(symbols);
  } catch {
    return new Map();
  }
}

function adaptSignalCenterRuntimeData(
  runtimeData: SourceRuntimeData[],
  updatedAtSource: Date | string = new Date(),
  fallbackMarkPricesBySymbol: ReadonlyMap<string, number> = new Map(),
): CopyTradingRadarSnapshot {
  const updatedAtDate = updatedAtSource instanceof Date ? updatedAtSource : new Date(updatedAtSource);
  const safeUpdatedAtDate = Number.isFinite(updatedAtDate.getTime()) ? updatedAtDate : new Date();
  const updatedAt = normalizeTimestamp(safeUpdatedAtDate.toISOString());
  const traders = runtimeData.map(({ positions, source, trades }, index) => adaptSignalCenterTrader(source, positions, trades, index));
  const positions = runtimeData.flatMap(({ positions: snapshots, source }) =>
    adaptSignalCenterPositions(source, snapshots, fallbackMarkPricesBySymbol),
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
  index: number,
): CopyTradingTrader {
  const seed = stableSeed(source.id || source.name || String(index));
  const pnlValues = positions.map((position) => parseNumber(position.unPnl ?? position.unrealizedPnl)).filter(isFiniteNumber);
  const aggregatePnl = pnlValues.reduce((sum, value) => sum + value, 0);
  const sourceStatus = source.status.toUpperCase();
  const visiblePositionCount = positions.filter((position) => Math.abs(parseNumber(position.qty) ?? 0) > 0).length;
  const riskLevel = sourceStatus !== "ACTIVE" ? "high" : visiblePositionCount >= 4 ? "high" : visiblePositionCount >= 2 ? "medium" : "low";
  const marginBalance = parseNumber(source.margin);

  return {
    trader_id: source.id,
    name: source.name || source.id,
    platform: source.signalType === SMART_MONEY_SIGNAL_TYPE ? DEFAULT_TRADER_PLATFORM : source.signalType || "Signal Center",
    avatar: source.avatarUrl ?? createAvatarDataUrl(source.name || source.id, seed % 360),
    followers: 0,
    margin_balance: marginBalance,
    positions_synced_at: source.positionsSyncedTime ? normalizeTimestamp(source.positionsSyncedTime) : null,
    source_url: source.url ?? null,
    status: sourceStatus || "UNKNOWN",
    watch_status: index < 2 ? "pinned" : "watching",
    monthly_return: clampSignedRatio(aggregatePnl / Math.max(1, Math.abs(marginBalance ?? 1))),
    win_rate: clampPercent(trades.length === 0 ? 0 : trades.filter((trade) => !isLossTrade(trade)).length / trades.length),
    max_drawdown: clampPercent(0.08 + (trades.filter((trade) => isLossTrade(trade)).length % 18) / 100),
    risk_level: riskLevel,
  };
}

function createSignalCenterSourceFromTrader(trader: CopyTradingTrader): SignalCenterSignalSource {
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

function adaptSignalCenterPositions(
  source: SignalCenterSignalSource,
  snapshots: readonly SignalCenterPositionSnapshot[],
  fallbackMarkPricesBySymbol: ReadonlyMap<string, number>,
): CopyTradingPosition[] {
  const nonZeroSnapshots = snapshots.filter((snapshot) => Math.abs(parseNumber(snapshot.qty) ?? 0) > 0);
  const totalNotional = nonZeroSnapshots.reduce((sum, snapshot) => sum + estimatePositionNotional(snapshot), 0);

  return nonZeroSnapshots.map((snapshot) => {
    const qty = Math.abs(parseNumber(snapshot.qty) ?? 0);
    const notional = Math.abs(readSignalCenterPositionNotional(snapshot) ?? 0);
    const entryPrice = readSignalCenterPositionEntryPrice(snapshot);
    const currentPrice = readSignalCenterPositionMarkPrice(snapshot)
      ?? derivePositionPriceFromNotional(snapshot, qty)
      ?? fallbackMarkPricesBySymbol.get(normalizeSignalCenterSymbolKey(snapshot.key.symbol))
      ?? null;
    const direction = normalizeCopyTradingDirection(snapshot.key.side);
    const leverage = snapshot.leverage ?? 1;
    const effectiveEntryPrice = entryPrice ?? 0;
    const effectiveCurrentPrice = currentPrice ?? 0;
    const marginSnapshot = Math.abs(readSignalCenterPositionMarginSnapshot(snapshot) ?? 0);
    const reportedUnrealizedPnl = readSignalCenterPositionUnrealizedPnl(snapshot);
    const effectiveNotional = notional > 0 ? notional : effectiveCurrentPrice > 0 ? effectiveCurrentPrice * qty : effectiveEntryPrice * qty;
    const pnlBase = marginSnapshot > 0 ? marginSnapshot : effectiveNotional > 0 && leverage ? effectiveNotional / leverage : Math.max(1, effectiveEntryPrice * qty);
    const derivedPnlRatio = calculatePositionPnlRatio(direction, entryPrice, currentPrice, leverage);
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

function estimatePositionNotional(snapshot: SignalCenterPositionSnapshot): number {
  const notional = Math.abs(readSignalCenterPositionNotional(snapshot) ?? 0);
  if (notional > 0) {
    return notional;
  }

  const qty = Math.abs(parseNumber(snapshot.qty) ?? 0);
  const markPrice = Math.abs(readSignalCenterPositionMarkPrice(snapshot) ?? 0);
  const entryPrice = Math.abs(readSignalCenterPositionEntryPrice(snapshot) ?? 0);
  return qty * (markPrice > 0 ? markPrice : entryPrice);
}

function derivePositionPriceFromNotional(
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

function inferTradeEventPriceFromPosition(
  eventType: CopyTradingEventType,
  position: CopyTradingPosition | undefined,
): number | null {
  if (!position) {
    return null;
  }

  switch (eventType) {
    case "open":
    case "add":
    case "reverse":
      return position.entry_price ?? position.current_price;
    case "reduce":
    case "close":
    case "take_profit":
    case "stop_loss":
    case "trailing_stop":
      return position.current_price ?? position.entry_price;
    case "oversized_position":
    case "losing_streak":
      return position.current_price ?? position.entry_price;
  }
}

function adaptSignalCenterTrades(
  source: SignalCenterSignalSource,
  trades: readonly SignalCenterTradeEvent[],
  positionsBySourceAndSymbol: ReadonlyMap<string, CopyTradingPosition>,
): CopyTradingEvent[] {
  return filterDisplayableSignalCenterTrades(trades).map((trade, index) => {
    const eventType = normalizeTradeActionToEventType(trade);
    const position = positionsBySourceAndSymbol.get(createPositionLookupKey(source.id, trade.symbol, trade.side));
    const direction = normalizeCopyTradingDirection(trade.side);
    const eventPrice = readSignalCenterTradePrice(trade)
      ?? inferTradeEventPriceFromPosition(eventType, position);
    const pnlAfter = position?.unrealized_pnl ?? null;
    const severity = getEventSeverity(eventType, pnlAfter, position?.position_size_ratio ?? null);
    const title = `${source.name || source.id} ${formatCopyTradingEventType(eventType)} ${trade.symbol} ${direction === "long" ? "多单" : "空单"}`;

    return {
      event_id: trade.eventId || `${source.id}:${trade.symbol}:${trade.action}:${index}`,
      trader_id: source.id,
      position_id: position?.position_id,
      symbol: trade.symbol,
      direction,
      event_type: eventType,
      event_price: eventPrice,
      size_ratio_after: position?.position_size_ratio ?? null,
      pnl_after: pnlAfter,
      occurred_at: normalizeTimestamp(trade.timestamp || trade.sourceTimestamp),
      title,
      summary: createTradeEventSummary(trade, eventType, position),
      severity,
    };
  });
}

function filterDisplayableSignalCenterTrades(
  trades: readonly SignalCenterTradeEvent[],
): SignalCenterTradeEvent[] {
  return trades.filter((trade) => !isSkippedSignalCenterTrade(trade));
}

function isSkippedSignalCenterTrade(trade: SignalCenterTradeEvent): boolean {
  return isTruthyMetadataFlag(trade.skipped)
    || isSkipStatus(trade.status)
    || isSkipStatus(trade.tradeStatus)
    || isSkipStatus(trade.trade_status)
    || isTruthyMetadataFlag(trade.metadata?.skipped)
    || isSkipStatus(trade.metadata?.status)
    || isSkipStatus(trade.metadata?.tradeStatus)
    || isSkipStatus(trade.metadata?.trade_status);
}

function isTruthyMetadataFlag(value: unknown): boolean {
  return value === true || (typeof value === "string" && value.trim().toLowerCase() === "true");
}

function isSkipStatus(value: unknown): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === "skip";
}

function copyTradingEventToStructuredSignal(
  event: CopyTradingEvent,
  trader: CopyTradingTrader | undefined,
  position: CopyTradingPosition | undefined,
): StructuredSignal {
  const traderName = trader?.name ?? event.trader_id;
  const eventLabel = formatCopyTradingEventType(event.event_type);
  const symbol = toCopyTradingMarketSymbol(event.symbol);
  const entryPrice = event.event_price ?? position?.entry_price ?? null;

  return {
    id: getCopyTradingEventChartSignalId(event.event_id),
    source_name: traderName,
    source_avatar_url: trader?.avatar || null,
    source_level: event.severity === "high" ? "S" : event.severity === "medium" ? "A" : "B",
    source_type: `带单雷达 · ${eventLabel}`,
    symbol,
    direction: event.direction,
    entry_type: "trigger",
    entry_min: null,
    entry_max: null,
    trigger_price: entryPrice,
    confirmation: event.summary,
    stop_loss: null,
    take_profit: [],
    status: event.event_type === "close" ? "已平仓" : event.event_type === "take_profit" ? "建议止盈" : "观察中",
    risk_tags: [eventLabel, formatRiskLevel(event.severity), trader?.platform ?? DEFAULT_TRADER_PLATFORM],
    raw_text: `${traderName} ${eventLabel} ${event.symbol} ${event.direction === "long" ? "多" : "空"}，价格 ${formatNumber(entryPrice)}，${event.summary}`,
    summary: event.title,
    created_at: event.occurred_at,
    isStrongAlert: ["open", "close", "reverse", "oversized_position", "losing_streak"].includes(event.event_type),
    isReview: false,
  };
}

function copyTradingEventToTradeMarker(
  event: CopyTradingEvent,
  trader: CopyTradingTrader | undefined,
): CopyTradingTradeMarker | null {
  const price = event.event_price;
  const sourceTimeMs = Date.parse(event.occurred_at);
  const side = resolveCopyTradingTradeMarkerSide(event);
  if (!Number.isFinite(sourceTimeMs) || side === null) {
    return null;
  }

  const signalId = getCopyTradingEventChartSignalId(event.event_id);
  const traderName = trader?.name ?? event.trader_id;

  const actionLabel = formatCopyTradingEventType(event.event_type);
  const priceText = price !== null && Number.isFinite(price) ? formatNumber(price) : null;
  const occurredAtText = formatDisplayTimestamp(event.occurred_at);
  const priceSuffix = priceText ? ` @ ${priceText}` : "";

  return {
    actionLabel,
    avatarUrl: trader?.avatar ?? null,
    detail: event.summary,
    direction: event.direction,
    eventId: event.event_id,
    eventType: event.event_type,
    id: `copy-trade-point:${event.event_id}`,
    occurredAtText,
    price,
    priceText,
    side,
    signalId,
    sourceTimeMs,
    symbol: toCopyTradingMarketSymbol(event.symbol),
    title: `${traderName} ${actionLabel} ${event.symbol}${priceSuffix}`,
    traderId: event.trader_id,
    traderName,
  };
}

function resolveCopyTradingTradeMarkerSide(event: CopyTradingEvent): CopyTradingTradeMarkerSide | null {
  if (event.event_type === "open" || event.event_type === "add" || event.event_type === "reverse") {
    return event.direction === "long" ? "buy" : "sell";
  }

  if (event.event_type === "reduce" || event.event_type === "close" || event.event_type === "take_profit" || event.event_type === "stop_loss" || event.event_type === "trailing_stop") {
    return event.direction === "long" ? "sell" : "buy";
  }

  return null;
}

function createTradeEventSummary(
  trade: SignalCenterTradeEvent,
  eventType: CopyTradingEventType,
  position: CopyTradingPosition | undefined,
): string {
  const deltaQty = parseNumber(trade.deltaQty) ?? 0;
  const currQty = parseNumber(trade.currQty) ?? 0;
  const positionText = position
    ? `当前仓位约占 ${formatPercent(position.position_size_ratio)}，浮盈亏 ${formatSignedPercent(position.unrealized_pnl)}`
    : "这笔操作已记录，当前没有持仓";
  return `${formatCopyTradingEventType(eventType)} ${formatNumber(Math.abs(deltaQty))}，操作后持仓 ${formatNumber(currQty)}。${positionText}。`;
}

function createMockEquityEtfSignals(now: Date): EquityEtfSignal[] {
  const rows: Array<[EquityEtfSignal["symbol"], CopyTradingDirection, EquityEtfSignal["status"], number, number, string, string]> = [
    ["QQQ", "long", "active", 0.68, 0.54, "纳指风险偏好回升，利好高 beta 加密资产。", "Macro Tape"],
    ["SPY", "long", "watching", 0.51, 0.43, "大盘企稳但量能一般，对 BTC 方向影响中性偏多。", "US Index Desk"],
    ["NVDA", "long", "active", 0.47, 0.39, "AI 龙头继续走强，提升链上 AI 叙事风险偏好。", "AI Equity Flow"],
    ["TSLA", "short", "cooldown", 0.35, 0.31, "高波动成长股降温，短线压制 meme 与山寨情绪。", "Momentum Radar"],
    ["COIN", "long", "active", 0.74, 0.62, "交易所股走强通常领先加密成交活跃度。", "Crypto Equity Desk"],
    ["MSTR", "long", "watching", 0.81, 0.58, "BTC 代理资产维持强势，增强 BTC 上行弹性。", "BTC Proxy Watch"],
    ["IBIT", "long", "active", 0.88, 0.49, "现货 ETF 资金面偏强，支撑 BTC 现货买盘。", "ETF Flow"],
    ["ETHA", "long", "watching", 0.42, 0.86, "ETH ETF 流入改善，利好 ETH/BTC 修复。", "ETF Flow"],
  ];

  return rows.map(([symbol, direction, status, btcCorrelation, ethCorrelation, cryptoImpact, source], index) => ({
    signal_id: `equity-etf-${symbol.toLowerCase()}`,
    source,
    symbol,
    direction,
    status,
    btc_correlation: btcCorrelation,
    eth_correlation: ethCorrelation,
    crypto_impact: cryptoImpact,
    updated_at: formatDateTimeWithUtc8Offset(new Date(now.getTime() - (index * 7 + 3) * 60_000)),
  }));
}

function createPositionLookup(positions: readonly CopyTradingPosition[]): Map<string, CopyTradingPosition> {
  const lookup = new Map<string, CopyTradingPosition>();
  for (const position of positions) {
    lookup.set(createPositionLookupKey(position.trader_id, position.symbol, position.direction), position);
  }
  return lookup;
}

function createPositionLookupKey(traderId: string, symbol: string, side: string): string {
  return `${traderId}:${normalizeSignalCenterSymbolKey(symbol)}:${normalizeCopyTradingDirection(side)}`;
}

function normalizeSignalCenterSymbolKey(symbol: string): string {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (!normalizedSymbol) {
    return "";
  }

  const [marketPair] = normalizedSymbol.split(":");
  return marketPair.replace("/", "");
}

function normalizeTradeActionToEventType(trade: SignalCenterTradeEvent): CopyTradingEventType {
  const metadataEventType = normalizeCopyTradingEventType(trade.metadata?.eventType ?? trade.metadata?.event_type ?? trade.metadata?.copyTradingEventType);
  if (metadataEventType) {
    return metadataEventType;
  }

  const actionEventType = normalizeCopyTradingEventType(trade.action);
  if (actionEventType && actionEventType !== "add" && actionEventType !== "reduce") {
    return actionEventType;
  }

  if (trade.action === "leverage_change") {
    return "oversized_position";
  }

  const prevQty = Math.abs(parseNumber(trade.prevQty) ?? 0);
  const currQty = Math.abs(parseNumber(trade.currQty) ?? 0);
  const isCloseAction = trade.action === "close_long" || trade.action === "close_short";
  const isOpenAction = trade.action === "open_long" || trade.action === "open_short";

  if (isCloseAction && (trade.isFullClose || currQty === 0)) {
    return "close";
  }

  if (isCloseAction || currQty < prevQty) {
    return "reduce";
  }

  if (isOpenAction && prevQty > 0) {
    return "add";
  }

  return "open";
}

function normalizeMockTradeActionToEventType(action: string): CopyTradingEventType {
  if (action.startsWith("open_")) {
    return "open";
  }

  if (action.startsWith("add_")) {
    return "add";
  }

  if (action.startsWith("close_")) {
    return "reduce";
  }

  return normalizeCopyTradingEventType(action) ?? "open";
}

function normalizeCopyTradingEventType(value: unknown): CopyTradingEventType | null {
  return typeof value === "string" && (REQUIRED_EVENT_TYPES as readonly string[]).includes(value)
    ? value as CopyTradingEventType
    : null;
}

function readSignalCenterTradePrice(trade: SignalCenterTradeEvent): number | null {
  return parsePositiveNumber(trade.price)
    ?? parsePositiveNumber(trade.metadata?.price)
    ?? parsePositiveNumber(trade.metadata?.eventPrice)
    ?? parsePositiveNumber(trade.metadata?.event_price)
    ?? parsePositiveNumber(trade.metadata?.executedPrice)
    ?? parsePositiveNumber(trade.metadata?.executed_price)
    ?? parsePositiveNumber(trade.metadata?.orderPrice)
    ?? parsePositiveNumber(trade.metadata?.order_price)
    ?? parsePositiveNumber(trade.metadata?.avgPrice)
    ?? parsePositiveNumber(trade.metadata?.avg_price)
    ?? parsePositiveNumber(trade.markPrice)
    ?? parsePositiveNumber(trade.mark_price)
    ?? parsePositiveNumber(trade.metadata?.markPrice)
    ?? parsePositiveNumber(trade.metadata?.mark_price)
    ?? parsePositiveNumber(trade.entryPrice)
    ?? parsePositiveNumber(trade.entry_price)
    ?? parsePositiveNumber(trade.metadata?.entryPrice)
    ?? parsePositiveNumber(trade.metadata?.entry_price);
}

function readSignalCenterPositionMarkPrice(snapshot: SignalCenterPositionSnapshot): number | null {
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

function readSignalCenterPositionEntryPrice(snapshot: SignalCenterPositionSnapshot): number | null {
  return parsePositiveNumber(snapshot.entryPrice)
    ?? parsePositiveNumber(snapshot.entry_price)
    ?? parsePositiveNumber(snapshot.metadata?.entryPrice)
    ?? parsePositiveNumber(snapshot.metadata?.entry_price);
}

function readSignalCenterPositionNotional(snapshot: SignalCenterPositionSnapshot): number | null {
  return parsePositiveNumber(snapshot.notionalValue)
    ?? parsePositiveNumber(snapshot.notional_value)
    ?? parsePositiveNumber(snapshot.metadata?.notionalValue)
    ?? parsePositiveNumber(snapshot.metadata?.notional_value);
}

function readSignalCenterPositionMarginSnapshot(snapshot: SignalCenterPositionSnapshot): number | null {
  return parsePositiveNumber(snapshot.marginSnapshot)
    ?? parsePositiveNumber(snapshot.margin_snapshot)
    ?? parsePositiveNumber(snapshot.metadata?.marginSnapshot)
    ?? parsePositiveNumber(snapshot.metadata?.margin_snapshot);
}

function readSignalCenterPositionUnrealizedPnl(snapshot: SignalCenterPositionSnapshot): number | null {
  return parseNumber(snapshot.unPnl)
    ?? parseNumber(snapshot.un_pnl)
    ?? parseNumber(snapshot.unrealizedPnl)
    ?? parseNumber(snapshot.unrealized_pnl)
    ?? parseNumber(snapshot.metadata?.unPnl)
    ?? parseNumber(snapshot.metadata?.un_pnl)
    ?? parseNumber(snapshot.metadata?.unrealizedPnl)
    ?? parseNumber(snapshot.metadata?.unrealized_pnl);
}

function normalizeCopyTradingDirection(value: string | null | undefined): CopyTradingDirection {
  return String(value).toLowerCase() === "short" ? "short" : "long";
}

function createMockSignalSource(input: {
  hue: number;
  id: string;
  leaderId: string;
  leaderPrivate: boolean;
  margin: number;
  name: string;
}): SignalCenterSignalSource {
  return {
    id: input.id,
    name: input.name,
    signalType: SMART_MONEY_SIGNAL_TYPE,
    status: "ACTIVE",
    margin: String(input.margin),
    leaderId: input.leaderId,
    leaderPrivate: input.leaderPrivate,
    positionShow: true,
    avatarUrl: createAvatarDataUrl(input.name, input.hue),
    url: `https://www.binance.com/en/copy-trading/lead-details/mock/${encodeURIComponent(input.leaderId)}`,
    isSpot: false,
    private: input.leaderPrivate,
    isAdmin: false,
  };
}

function readLatestReferencePrice(reference: MockMarketReference | undefined): number {
  const latestCandle = reference?.candles.at(-1);
  const price = latestCandle?.close ?? reference?.fallbackPrice ?? 1;
  return roundMarketPrice(price > 0 ? price : reference?.fallbackPrice ?? 1);
}

function selectMockMarketPoint(
  reference: MockMarketReference | undefined,
  minuteOffset: number,
  now: Date,
): { price: number; sourceTimeMs: number } {
  const candles = reference?.candles ?? [];
  if (candles.length > 0) {
    const candle = candles[Math.max(0, candles.length - 1 - Math.min(minuteOffset, candles.length - 1))] ?? candles.at(-1);
    if (candle) {
      const price = candle.open > 0 ? candle.open : candle.close;
      return {
        price: roundMarketPrice(price),
        sourceTimeMs: candle.sourceTimeMs,
      };
    }
  }

  const fallbackPrice = reference?.fallbackPrice ?? 1;
  const syntheticDrift = Math.sin(minuteOffset * 1.73) * 0.003;
  return {
    price: roundMarketPrice(fallbackPrice * (1 + syntheticDrift)),
    sourceTimeMs: now.getTime() - minuteOffset * 60_000,
  };
}

function calculateMockPositionPnlRatio(
  direction: CopyTradingDirection,
  entryPrice: number,
  currentPrice: number,
  leverage: number,
): number {
  return calculatePositionPnlRatio(direction, entryPrice, currentPrice, leverage) ?? 0;
}

function calculatePositionPnlRatio(
  direction: CopyTradingDirection,
  entryPrice: number | null,
  currentPrice: number | null,
  leverage: number,
): number | null {
  if (entryPrice === null || currentPrice === null || entryPrice <= 0 || currentPrice <= 0) {
    return null;
  }

  const priceMove = direction === "long"
    ? currentPrice / entryPrice - 1
    : entryPrice / currentPrice - 1;
  return clampSignedRatio(priceMove * leverage);
}

async function requestSignalCenterJson<T>(path: string): Promise<T> {
  const response = await fetch(`${SIGNAL_CENTER_PROXY_BASE_URL}${path}`, {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await createRequestErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

async function createRequestErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) {
    return `Signal Center request failed: ${response.status} ${response.statusText}`;
  }

  try {
    const data = JSON.parse(text) as { error?: string };
    return data.error || text;
  } catch {
    return text;
  }
}

function getEventSeverity(eventType: CopyTradingEventType, pnl: number | null, sizeRatio: number | null): CopyTradingRiskLevel {
  if (["stop_loss", "oversized_position", "losing_streak", "reverse"].includes(eventType)) {
    return "high";
  }

  if ((pnl ?? 0) < -0.08 || (sizeRatio ?? 0) >= 0.35) {
    return "high";
  }

  if (["open", "add", "close"].includes(eventType)) {
    return "medium";
  }

  return "low";
}

function isLossTrade(trade: SignalCenterTradeEvent): boolean {
  const metadataPnl = trade.metadata?.pnl ?? trade.metadata?.realizedPnl;
  return typeof metadataPnl === "number" ? metadataPnl < 0 : typeof metadataPnl === "string" && Number(metadataPnl) < 0;
}

function parsePositiveNumber(value: unknown): number | null {
  const parsed = parseNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function compareNullableNumbers(left: number | null, right: number | null): number {
  const hasLeft = left !== null && Number.isFinite(left);
  const hasRight = right !== null && Number.isFinite(right);
  if (!hasLeft && !hasRight) {
    return 0;
  }
  if (!hasLeft) {
    return 1;
  }
  if (!hasRight) {
    return -1;
  }

  return left - right;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isFiniteNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function clampPercent(value: number): number {
  return Math.min(0.99, Math.max(0, value));
}

function clampSignedRatio(value: number): number {
  return Math.min(9.99, Math.max(-9.99, value));
}

function normalizeTimestamp(value: string | null | undefined): string {
  if (!value) {
    return FALLBACK_UPDATED_AT;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? formatDateTimeWithUtc8Offset(new Date(timestamp)) : value;
}

function formatDateTimeWithUtc8Offset(date: Date): string {
  const utc8Date = new Date(date.getTime() + 8 * 60 * 60 * 1_000);
  const year = utc8Date.getUTCFullYear();
  const month = padDatePart(utc8Date.getUTCMonth() + 1);
  const day = padDatePart(utc8Date.getUTCDate());
  const hours = padDatePart(utc8Date.getUTCHours());
  const minutes = padDatePart(utc8Date.getUTCMinutes());
  const seconds = padDatePart(utc8Date.getUTCSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function stableSeed(value: string): number {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function createAvatarDataUrl(label: string, hue: number): string {
  const visibleLabel = label.trim().slice(0, 2) || "带单";
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">`,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0%" stop-color="hsl(${hue} 86% 58%)"/>`,
    `<stop offset="100%" stop-color="hsl(${(hue + 58) % 360} 92% 42%)"/>`,
    `</linearGradient></defs>`,
    `<rect width="96" height="96" rx="48" fill="url(#g)"/>`,
    `<circle cx="68" cy="26" r="17" fill="rgba(255,255,255,.18)"/>`,
    `<text x="48" y="57" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800">${escapeSvgText(visibleLabel)}</text>`,
    `</svg>`,
  ].join("");

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatRiskLevel(riskLevel: CopyTradingRiskLevel): string {
  if (riskLevel === "high") {
    return "高风险";
  }

  if (riskLevel === "medium") {
    return "中风险";
  }

  return "低风险";
}

function roundMarketPrice(value: number): number {
  const absoluteValue = Math.abs(value);
  const maximumFractionDigits = absoluteValue >= 10_000 ? 1 : absoluteValue >= 1_000 ? 2 : absoluteValue >= 1 ? 4 : 6;
  return Number(value.toFixed(maximumFractionDigits));
}

function formatNumberForApi(value: number): string {
  return Number.isFinite(value) ? String(roundMarketPrice(value)) : "0";
}

function formatQuantity(value: number): string {
  return Number.isFinite(value) ? String(Number(value.toFixed(8))) : "0";
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: Math.abs(value) >= 1000 ? 1 : 4 });
}

function formatDisplayTimestamp(value: string): string {
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

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercent(value: number): string {
  const formatted = formatPercent(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}
