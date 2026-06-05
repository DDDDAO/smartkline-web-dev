import type { MarketSymbol } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";

export type MockSignalScenarioKind =
  | "entered-long-loss"
  | "entered-long-profit"
  | "entered-short-loss"
  | "entered-short-profit"
  | "exited-long-stop-loss"
  | "exited-long-take-profit"
  | "exited-short-stop-loss"
  | "exited-short-take-profit"
  | "invalid-missing-coverage"
  | "market-short-entered"
  | "market-without-risk-fields"
  | "not-entered-short-range"
  | "trigger-long-entered";

export type MockSignalScenario = {
  currentPrice: number;
  exitMinute?: number;
  kind: MockSignalScenarioKind;
  signal: StructuredSignal;
  snapshotPrice: number;
  volatility: number;
};

export const mockKolSignalScenarios: MockSignalScenario[] = [
  {
    kind: "not-entered-short-range",
    snapshotPrice: 66324.6,
    currentPrice: 62964.4,
    volatility: 85,
    signal: createSignal({
      id: "mock-btc-short-range-not-entered",
      sourceName: "三马哥合约",
      createdAt: "2026-05-31T23:22:00+08:00",
      symbol: "BTC/USDT:USDT",
      direction: "short",
      entryMin: 67000,
      entryMax: 68588,
      triggerPrice: null,
      stopLoss: 70000,
      takeProfit: [66188, 65388, 63888],
      confirmation: "67000附近直接空市价，再挂 68588；价格未回到入场区，展示未入场。",
    }),
  },
  {
    kind: "entered-long-profit",
    snapshotPrice: 3380,
    currentPrice: 3512,
    volatility: 8,
    signal: createSignal({
      id: "mock-eth-long-entered-profit",
      sourceName: "Alpha Lane",
      createdAt: "2026-05-31T22:56:00+08:00",
      symbol: "ETH/USDT:USDT",
      direction: "long",
      entryMin: 3368,
      entryMax: 3392,
      triggerPrice: null,
      stopLoss: 3298,
      takeProfit: [3580, 3660, 3788],
      confirmation: "回踩 3368-3392 做多，当前已入场且浮盈，尚未触达第一止盈。",
    }),
  },
  {
    kind: "entered-long-loss",
    snapshotPrice: 151.2,
    currentPrice: 145.7,
    volatility: 0.45,
    signal: createSignal({
      id: "mock-sol-long-entered-loss",
      sourceName: "Range Lab",
      createdAt: "2026-05-31T22:32:00+08:00",
      symbol: "SOL/USDT:USDT",
      direction: "long",
      entryMin: 150.5,
      entryMax: 152.1,
      triggerPrice: null,
      stopLoss: 141.8,
      takeProfit: [160.4, 168.8, 176.2],
      confirmation: "区间接多后回撤，展示已入场浮亏但未止损。",
    }),
  },
  {
    kind: "entered-short-profit",
    snapshotPrice: 646,
    currentPrice: 618,
    volatility: 1.8,
    signal: createSignal({
      id: "mock-bnb-short-entered-profit",
      sourceName: "Delta Desk",
      createdAt: "2026-05-31T22:04:00+08:00",
      symbol: "BNB/USDT:USDT",
      direction: "short",
      entryMin: 642,
      entryMax: 650,
      triggerPrice: null,
      stopLoss: 666,
      takeProfit: [604, 588, 572],
      confirmation: "压力区放空，当前已入场浮盈，未到首个止盈。",
    }),
  },
  {
    kind: "entered-short-loss",
    snapshotPrice: 0.522,
    currentPrice: 0.546,
    volatility: 0.0018,
    signal: createSignal({
      id: "mock-xrp-short-entered-loss",
      sourceName: "Momentum KOL",
      createdAt: "2026-05-31T21:36:00+08:00",
      symbol: "XRP/USDT:USDT",
      direction: "short",
      entryMin: 0.518,
      entryMax: 0.525,
      triggerPrice: null,
      stopLoss: 0.558,
      takeProfit: [0.492, 0.468, 0.446],
      confirmation: "反弹空单入场后继续反抽，展示已入场浮亏。",
    }),
  },
  {
    kind: "exited-long-take-profit",
    snapshotPrice: 0.627,
    currentPrice: 0.671,
    exitMinute: 34,
    volatility: 0.0016,
    signal: createSignal({
      id: "mock-ada-long-take-profit",
      sourceName: "TP Hunter",
      createdAt: "2026-05-31T21:08:00+08:00",
      symbol: "ADA/USDT:USDT",
      direction: "long",
      entryMin: null,
      entryMax: null,
      triggerPrice: 0.63,
      stopLoss: 0.598,
      takeProfit: [0.666, 0.692, 0.724],
      confirmation: "突破 0.63 追多，后续触达第一止盈。",
    }),
  },
  {
    kind: "exited-short-take-profit",
    snapshotPrice: 0.142,
    currentPrice: 0.132,
    exitMinute: 28,
    volatility: 0.00045,
    signal: createSignal({
      id: "mock-doge-short-take-profit",
      sourceName: "Scalp Room",
      createdAt: "2026-05-31T20:40:00+08:00",
      symbol: "DOGE/USDT:USDT",
      direction: "short",
      entryMin: null,
      entryMax: null,
      triggerPrice: 0.141,
      stopLoss: 0.149,
      takeProfit: [0.135, 0.128, 0.121],
      confirmation: "跌破触发价做空，后续触达第一止盈。",
    }),
  },
  {
    kind: "exited-long-stop-loss",
    snapshotPrice: 17.2,
    currentPrice: 15.82,
    exitMinute: 26,
    volatility: 0.055,
    signal: createSignal({
      id: "mock-link-long-stop-loss",
      sourceName: "Risk Watch",
      createdAt: "2026-05-31T20:12:00+08:00",
      symbol: "LINK/USDT:USDT",
      direction: "long",
      entryMin: 17.05,
      entryMax: 17.34,
      triggerPrice: null,
      stopLoss: 16.36,
      takeProfit: [18.1, 19.4, 20.6],
      confirmation: "区间多单失效，展示止损离场。",
    }),
  },
  {
    kind: "exited-short-stop-loss",
    snapshotPrice: 31.6,
    currentPrice: 33.1,
    exitMinute: 22,
    volatility: 0.09,
    signal: createSignal({
      id: "mock-avax-short-stop-loss",
      sourceName: "Risk Watch",
      createdAt: "2026-05-31T19:44:00+08:00",
      symbol: "AVAX/USDT:USDT",
      direction: "short",
      entryMin: 31.2,
      entryMax: 31.9,
      triggerPrice: null,
      stopLoss: 32.55,
      takeProfit: [29.8, 28.4, 27.2],
      confirmation: "压力空单被上破，展示止损离场。",
    }),
  },
  {
    kind: "trigger-long-entered",
    snapshotPrice: 2.72,
    currentPrice: 2.88,
    volatility: 0.009,
    signal: createSignal({
      id: "mock-op-trigger-long-entered",
      sourceName: "Breakout Bot",
      createdAt: "2026-05-31T19:16:00+08:00",
      symbol: "OP/USDT:USDT",
      direction: "long",
      entryMin: null,
      entryMax: null,
      triggerPrice: 2.78,
      stopLoss: 2.61,
      takeProfit: [3.05, 3.24, 3.42],
      confirmation: "上破 2.78 后入场，展示触发价订单。",
    }),
  },
  {
    kind: "market-short-entered",
    snapshotPrice: 1.18,
    currentPrice: 1.12,
    volatility: 0.004,
    signal: createSignal({
      id: "mock-arb-market-short-entered",
      sourceName: "Market Flow",
      createdAt: "2026-05-31T18:48:00+08:00",
      symbol: "ARB/USDT:USDT",
      direction: "short",
      entryMin: null,
      entryMax: null,
      triggerPrice: null,
      stopLoss: 1.24,
      takeProfit: [1.07, 1.01, 0.96],
      confirmation: "市价空单 mock，展示无挂单价的市价入场。",
    }),
  },
  {
    kind: "market-without-risk-fields",
    snapshotPrice: 86.4,
    currentPrice: 89.2,
    volatility: 0.22,
    signal: createSignal({
      id: "mock-ltc-market-long-missing-risk",
      sourceName: "Incomplete Feed",
      createdAt: "2026-05-31T18:20:00+08:00",
      symbol: "LTC/USDT:USDT",
      direction: "long",
      entryMin: null,
      entryMax: null,
      triggerPrice: null,
      stopLoss: null,
      takeProfit: [],
      confirmation: "原文缺少止损止盈，展示风险字段缺失的市价单。",
    }),
  },
  {
    kind: "invalid-missing-coverage",
    snapshotPrice: 5.24,
    currentPrice: 5.31,
    volatility: 0.018,
    signal: createSignal({
      id: "mock-near-invalid-coverage",
      sourceName: "Data Gap Feed",
      createdAt: "2026-05-31T17:52:00+08:00",
      symbol: "NEAR/USDT:USDT",
      direction: "long",
      entryMin: 5.18,
      entryMax: 5.28,
      triggerPrice: null,
      stopLoss: 4.98,
      takeProfit: [5.58, 5.9, 6.18],
      confirmation: "故意缺少信号时刻 1m K 线，展示无法计算仓位。",
    }),
  },
];

const duplicateParsedPositionSignal: StructuredSignal = {
  ...mockKolSignalScenarios[0].signal,
  id: "mock-btc-short-range-duplicate-later-message",
  created_at: "2026-05-31T23:27:00+08:00",
  raw_text: "重复转发：67000附近直接空市价，再挂 68588，止损 70000，止盈1 66188 / 止盈2 65388 / 止盈3 63888。",
  summary: "Duplicate parsed BTC/USDT:USDT short signal retained only if dedupe fails.",
};

const fallbackResonanceSignals: StructuredSignal[] = [
  createFallbackResonanceSignal({
    basisPointShift: -0.0012,
    createdAt: "2026-05-31T23:23:00+08:00",
    id: "mock-btc-short-resonance-whale-club",
    sourceName: "Crypto Whale Club",
  }),
  createFallbackResonanceSignal({
    basisPointShift: 0.001,
    createdAt: "2026-05-31T23:24:00+08:00",
    id: "mock-btc-short-resonance-north-star",
    sourceName: "North Star Signals",
  }),
];

export const mockKolSignals: StructuredSignal[] = [
  ...mockKolSignalScenarios.map((scenario) => scenario.signal),
  ...fallbackResonanceSignals,
  duplicateParsedPositionSignal,
];

export const mockMarketSymbols: MarketSymbol[] = mockKolSignalScenarios.map((scenario) => scenario.signal.symbol);

export function getMockSignalScenario(symbol: MarketSymbol): MockSignalScenario | null {
  return mockKolSignalScenarios.find((scenario) => scenario.signal.symbol === symbol) ?? null;
}

function createSignal(input: {
  confirmation: string;
  createdAt: string;
  direction: StructuredSignal["direction"];
  entryMax: number | null;
  entryMin: number | null;
  id: string;
  sourceName: string;
  stopLoss: number | null;
  symbol: MarketSymbol;
  takeProfit: number[];
  triggerPrice: number | null;
}): StructuredSignal {
  const entryText = formatEntryText(input);
  const takeProfitText = formatTakeProfitText(input.takeProfit);

  return {
    id: input.id,
    source_name: input.sourceName,
    source_avatar_url: createSourceAvatarUrl(input.sourceName),
    source_level: "S",
    source_type: "开仓信号",
    symbol: input.symbol,
    direction: input.direction,
    entry_type: input.entryMin !== null && input.entryMax !== null ? "range" : "trigger",
    entry_min: input.entryMin,
    entry_max: input.entryMax,
    trigger_price: input.triggerPrice,
    confirmation: input.confirmation,
    stop_loss: input.stopLoss,
    take_profit: input.takeProfit,
    status: "观察中",
    risk_tags: createRiskTags(input),
    raw_text: `${input.sourceName}: ${input.symbol} ${input.direction === "long" ? "多" : "空"}，入场/触发 ${entryText}，止损 ${formatPrice(input.stopLoss)}，${takeProfitText}。${input.confirmation}`,
    summary: `${input.symbol} ${input.direction === "long" ? "多" : "空"} mock signal：入场 ${entryText}，止损 ${formatPrice(input.stopLoss)}，${takeProfitText}`,
    created_at: input.createdAt,
    isStrongAlert: true,
    isReview: false,
  };
}

function createFallbackResonanceSignal(input: {
  basisPointShift: number;
  createdAt: string;
  id: string;
  sourceName: string;
}): StructuredSignal {
  const baseSignal = mockKolSignalScenarios[0].signal;
  const shiftedSignal: StructuredSignal = {
    ...baseSignal,
    id: input.id,
    source_name: input.sourceName,
    source_avatar_url: createSourceAvatarUrl(input.sourceName),
    source_type: "共振信号",
    created_at: input.createdAt,
    entry_min: shiftPrice(baseSignal.entry_min, input.basisPointShift),
    entry_max: shiftPrice(baseSignal.entry_max, input.basisPointShift),
    stop_loss: shiftPrice(baseSignal.stop_loss, input.basisPointShift),
    take_profit: baseSignal.take_profit.map((price) => shiftPrice(price, input.basisPointShift)).filter((price): price is number => price !== null),
    confirmation: "BTC 空头区域出现多源共振，用于展示 KOL 头像叠加与辐射效果。",
  };
  const shiftedInput = {
    entryMax: shiftedSignal.entry_max,
    entryMin: shiftedSignal.entry_min,
    stopLoss: shiftedSignal.stop_loss,
    takeProfit: shiftedSignal.take_profit,
    triggerPrice: shiftedSignal.trigger_price,
  };

  return {
    ...shiftedSignal,
    raw_text: `${input.sourceName}: BTC/USDT 空，入场/触发 ${formatEntryText(shiftedInput)}，止损 ${formatPrice(shiftedSignal.stop_loss)}，${formatTakeProfitText(shiftedSignal.take_profit)}。多位交易员在同一压力区给出空头计划，形成 3 源共振。`,
    risk_tags: createRiskTags(shiftedInput),
    summary: `BTC/USDT 空头共振：入场 ${formatEntryText(shiftedInput)}，止损 ${formatPrice(shiftedSignal.stop_loss)}，${formatTakeProfitText(shiftedSignal.take_profit)}`,
  };
}

function shiftPrice(value: number | null, ratio: number): number | null {
  if (value === null) {
    return null;
  }

  return Number((value * (1 + ratio)).toFixed(value >= 1_000 ? 1 : 4));
}

function createSourceAvatarUrl(sourceName: string): string {
  const label = sourceName.trim().slice(0, 2).toUpperCase() || "K";
  const hue = [...sourceName].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">`,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0%" stop-color="hsl(${hue} 84% 58%)"/>`,
    `<stop offset="100%" stop-color="hsl(${(hue + 52) % 360} 92% 42%)"/>`,
    `</linearGradient></defs>`,
    `<rect width="96" height="96" rx="48" fill="url(#g)"/>`,
    `<circle cx="70" cy="24" r="16" fill="rgba(255,255,255,.18)"/>`,
    `<text x="48" y="57" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800">${escapeSvgText(label)}</text>`,
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

function createRiskTags(input: { entryMax: number | null; entryMin: number | null; stopLoss: number | null; takeProfit: number[]; triggerPrice: number | null }): string[] {
  return [
    input.entryMin !== null && input.entryMax !== null ? "区间入场" : input.triggerPrice !== null ? "触发入场" : "市价入场",
    input.stopLoss !== null ? "止损完整" : "缺少止损",
    input.takeProfit.length > 0 ? "止盈完整" : "缺少止盈",
  ];
}

function formatTakeProfitText(takeProfit: readonly number[]): string {
  return takeProfit.length > 0
    ? takeProfit.map((price, index) => `止盈${index + 1} ${formatPrice(price)}`).join(" / ")
    : "止盈 --";
}

function formatEntryText(input: { entryMax: number | null; entryMin: number | null; triggerPrice: number | null }): string {
  if (input.entryMin !== null && input.entryMax !== null) {
    return `${formatPrice(input.entryMin)}-${formatPrice(input.entryMax)}`;
  }

  return input.triggerPrice !== null ? formatPrice(input.triggerPrice) : "市价";
}

function formatPrice(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: value >= 1_000 ? 1 : 4 });
}
