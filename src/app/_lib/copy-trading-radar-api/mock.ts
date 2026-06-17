import { fetchHistoricalCandles } from "@/app/_lib/binance-market-data";
import type { CopyTradingRadarSnapshot } from "@/app/_types/copy-trading";
import {
  MOCK_MARKET_ALIGNMENT_HISTORY_LIMIT,
  MOCK_MARKET_ALIGNMENT_TIMEOUT_MS,
  SMART_MONEY_SIGNAL_TYPE,
} from "./constants";
import {
  createAvatarDataUrl,
  formatDateTimeWithUtc8Offset,
  formatNumberForApi,
  formatQuantity,
  roundMarketPrice,
  stableSeed,
} from "./parsers";
import {
  calculateMockPositionPnlRatio,
} from "./positions";
import { toCopyTradingMarketSymbol } from "./public-helpers";
import { adaptSignalCenterRuntimeData } from "./runtime";
import { normalizeMockTradeActionToEventType } from "./trades";
import type {
  MockMarketReference,
  MockPositionBlueprint,
  MockTradeBlueprint,
  SignalCenterPositionSnapshot,
  SignalCenterRadarSourcePerformance,
  SignalCenterReturnCurvePoint,
  SignalCenterSignalSource,
  SignalCenterTradeEvent,
  SourceRuntimeData,
} from "./types";

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

  return MOCK_SIGNAL_CENTER_SOURCES.map((source, index) => ({
    performance: createMockSignalCenterPerformance(source.id, index, input.now),
    source: {
      ...source,
      positionsSyncedTime: formatDateTimeWithUtc8Offset(input.now),
    },
    positions: positionsBySource.get(source.id) ?? [],
    trades: tradesBySource.get(source.id) ?? [],
  }));
}

function createMockSignalCenterPerformance(
  sourceId: string,
  index: number,
  now: Date,
): SignalCenterRadarSourcePerformance {
  const baseRoi = [3.7551, 1.2842, -0.1864][index] ?? 0.42;
  const basePnl = [1_001_149.15, 286_420.8, -48_120.35][index] ?? 72_000;
  const copierPnl = [-368_486.11, 92_144.2, -12_908.4][index] ?? 18_000;
  const maxDrawdown = [0.6172, 0.284, 0.196][index] ?? 0.22;
  const winRate = [0.65, 0.58, 0.47][index] ?? 0.55;
  const aum = [1_089_278.35, 624_900.5, 218_730.1][index] ?? 300_000;
  const marginBalance = [319_031.54, 128_000, 58_000][index] ?? 80_000;
  const followers = [182, 74, 23][index] ?? 12;
  const sharpRatio = [1.55, 1.18, 0.42][index] ?? 0.8;

  return {
    aum,
    copierPnl,
    copierPnlAsset: "USDT",
    followers,
    marginBalance,
    maxDrawdown,
    pnl: basePnl,
    pnlCurve: createMockPnlCurvePoints({ now, sourceId, targetPnl: basePnl }),
    returnCurve: createMockReturnCurvePoints({ now, sourceId, targetRoi: baseRoi }),
    roi: baseRoi,
    sharpeRatio: sharpRatio,
    updatedAt: formatDateTimeWithUtc8Offset(now),
    winRate,
    window: "30d",
  };
}

function createMockReturnCurvePoints({
  now,
  sourceId,
  targetRoi,
}: {
  now: Date;
  sourceId: string;
  targetRoi: number;
}): SignalCenterReturnCurvePoint[] {
  const seed = stableSeed(sourceId);
  const pointCount = 30;
  return Array.from({ length: pointCount }, (_, index) => {
    const progress = index / (pointCount - 1);
    const wave = Math.sin((seed % 9) + progress * Math.PI * 3) * 0.045;
    const drawdown = index > pointCount * 0.42 && index < pointCount * 0.58 ? -Math.abs(targetRoi) * 0.1 : 0;
    return {
      timestamp: now.getTime() - (pointCount - 1 - index) * 24 * 60 * 60 * 1_000,
      value: targetRoi * progress + wave + drawdown,
    };
  });
}

function createMockPnlCurvePoints({
  now,
  sourceId,
  targetPnl,
}: {
  now: Date;
  sourceId: string;
  targetPnl: number;
}): SignalCenterReturnCurvePoint[] {
  const seed = stableSeed(`${sourceId}:pnl`);
  const pointCount = 30;
  const volatilityBase = Math.max(1_000, Math.abs(targetPnl) * 0.08);
  return Array.from({ length: pointCount }, (_, index) => {
    const progress = index / (pointCount - 1);
    const wave = Math.sin((seed % 11) + progress * Math.PI * 3.4) * volatilityBase;
    const pullback = index > pointCount * 0.42 && index < pointCount * 0.58 ? -Math.abs(targetPnl) * 0.12 : 0;
    return {
      timestamp: now.getTime() - (pointCount - 1 - index) * 24 * 60 * 60 * 1_000,
      value: targetPnl * progress + wave + pullback,
    };
  });
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
  const pnlRatio = calculateMockPositionPnlRatio(blueprint.direction, entryPrice, currentPrice);

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
