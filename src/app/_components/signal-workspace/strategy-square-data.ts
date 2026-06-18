import type { CSSProperties } from "react";

import type { WorkspaceLanguage } from "@/i18n/workspace";

export type StrategySquareType = "copyTrading" | "dca" | "grid" | "mario" | "snowball";
export type StrategySquareRiskLevel = "high" | "low" | "medium";
export type StrategySquareSortKey = "drawdown" | "newest" | "profit" | "returnRate";
export type StrategySquareStoreTab = "allProjects" | "recommended";
export type StrategySquareTypeFilter = StrategySquareType | "all";
export type StrategySquareFeaturedMetric = "drawdown" | "profit" | "returnRate";
export type StrategyPaginationItem = number | "ellipsis";
export type StrategySquareWindow = "7d" | "30d" | "90d";

export type StrategySquareReturnPoint = {
  timestamp: number;
  value: number;
};

export type StrategySquareLocalizedContent = {
  configLines: readonly string[];
  description: string;
  name: string;
  tags: readonly string[];
};

export type StrategySquareItem = {
  content: Record<WorkspaceLanguage, StrategySquareLocalizedContent>;
  createdAt: string;
  id: string;
  metrics: {
    maxDrawdown: number | null;
    minimumCapital: number;
    profit30dUsd: number;
    returnRate: number | null;
    runningDays: number;
    tradeCount: number;
    winRate: number | null;
  };
  returnCurve: readonly StrategySquareReturnPoint[];
  riskLevel: StrategySquareRiskLevel;
  type: StrategySquareType;
  updatedAt: string;
};

export type StrategyRecommendationSection = {
  description: string;
  featuredMetric: StrategySquareFeaturedMetric;
  key: "highPnl" | "highReturn" | "lowDrawdown";
  sortKey: StrategySquareSortKey;
  strategies: readonly StrategySquareItem[];
  title: string;
};

export const ALL_TYPE_FILTER: StrategySquareTypeFilter = "all";
export const STRATEGY_TYPE_FILTERS: readonly StrategySquareTypeFilter[] = [
  "all",
  "copyTrading",
  "mario",
  "dca",
  "grid",
  "snowball",
];
export const SORT_KEYS: readonly StrategySquareSortKey[] = ["profit", "returnRate", "drawdown", "newest"];
export const STRATEGY_WINDOWS: readonly StrategySquareWindow[] = ["7d", "30d", "90d"];
export const ALL_PROJECTS_PAGE_SIZE = 20;
export const RECOMMENDED_STRATEGY_LIMIT = 3;
export const WINDOW_METRIC_MULTIPLIERS: Readonly<Record<StrategySquareWindow, {
  drawdown: number;
  profit: number;
  returnRate: number;
  trades: number;
}>> = {
  "7d": {
    drawdown: 0.45,
    profit: 0.28,
    returnRate: 0.32,
    trades: 0.35,
  },
  "30d": {
    drawdown: 1,
    profit: 1,
    returnRate: 1,
    trades: 1,
  },
  "90d": {
    drawdown: 1.45,
    profit: 2.35,
    returnRate: 2.1,
    trades: 2.7,
  },
};
export const CURVE_WIDTH = 320;
export const CURVE_HEIGHT = 96;
export const CURVE_PADDING = 8;
export const MOCK_CURVE_START_MS = Date.UTC(2026, 2, 18);
export const MOCK_CURVE_STEP_MS = 6 * 24 * 60 * 60 * 1_000;
export const STRATEGY_CARD_GRID_STYLE: CSSProperties = {
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 360px))",
};

function createMockCurve(
  values: readonly number[],
): StrategySquareReturnPoint[] {
  return values.map((value, index) => ({
    timestamp: MOCK_CURVE_START_MS + index * MOCK_CURVE_STEP_MS,
    value,
  }));
}


export const MOCK_STRATEGIES: readonly StrategySquareItem[] = [
  {
    content: {
      "en-US": {
        configLines: ["Strategy type: signal portfolio", "Universe: BTC / ETH", "Sizing: volatility budget", "TP / SL: 24% / 11%"],
        description: "Momentum template that follows high-conviction BTC and ETH signal clusters with fixed downside guards.",
        name: "Momentum Rotation",
        tags: ["BTC / ETH", "Momentum", "Guarded"],
      },
      "zh-CN": {
        configLines: ["策略类型：信号组合", "标的范围：BTC / ETH", "仓位方式：波动率预算", "止盈 / 止损：24% / 11%"],
        description: "围绕 BTC 和 ETH 的高置信信号做轮动，使用固定止损保护下行风险。",
        name: "动量轮动策略",
        tags: ["BTC / ETH", "动量", "带风控"],
      },
    },
    createdAt: "2026-04-08T09:00:00+08:00",
    id: "sk-momentum-rotation",
    metrics: {
      maxDrawdown: 0.0619,
      minimumCapital: 1_000,
      profit30dUsd: 94_879.32,
      returnRate: 0.3732,
      runningDays: 43,
      tradeCount: 118,
      winRate: 0.642,
    },
    returnCurve: createMockCurve([0, 0.018, 0.041, 0.032, 0.087, 0.12, 0.114, 0.168, 0.203, 0.248, 0.234, 0.292, 0.331, 0.369, 0.438]),
    riskLevel: "medium",
    type: "copyTrading",
    updatedAt: "2026-06-16T08:10:00+08:00",
  },
  {
    content: {
      "en-US": {
        configLines: ["Strategy type: Mario", "Market mode: multi-symbol", "Risk engine: volatility budget", "Execution: signal + account guard"],
        description: "Balanced Mario template for multi-symbol trend participation with conservative execution guards.",
        name: "Mario Balanced",
        tags: ["Mario", "Balanced", "Multi-symbol"],
      },
      "zh-CN": {
        configLines: ["策略类型：Mario", "市场模式：多标的", "风控引擎：波动率预算", "执行方式：信号 + 账户保护"],
        description: "偏稳健的 Mario 多标的趋势策略，适合在趋势明确但波动较高时参与。",
        name: "Mario 均衡策略",
        tags: ["Mario", "均衡", "多标的"],
      },
    },
    createdAt: "2026-05-21T12:00:00+08:00",
    id: "sk-mario-balanced",
    metrics: {
      maxDrawdown: 0.0681,
      minimumCapital: 2_500,
      profit30dUsd: 48_669.28,
      returnRate: 0.5716,
      runningDays: 15,
      tradeCount: 86,
      winRate: 0.586,
    },
    returnCurve: createMockCurve([0, 0.012, 0.019, 0.038, 0.052, 0.077, 0.071, 0.094, 0.118, 0.143, 0.151, 0.173, 0.201, 0.236, 0.268]),
    riskLevel: "low",
    type: "mario",
    updatedAt: "2026-06-15T20:30:00+08:00",
  },
  {
    content: {
      "en-US": {
        configLines: ["Strategy type: DCA", "Symbol basket: BTC / SOL", "Safety orders: 5", "Deviation: adaptive 1.6% - 3.2%"],
        description: "DCA accumulation template for choppy markets, using wider safety orders when volatility expands.",
        name: "DCA Volatility Ladder",
        tags: ["DCA", "BTC", "SOL"],
      },
      "zh-CN": {
        configLines: ["策略类型：DCA", "标的篮子：BTC / SOL", "安全单：5 档", "偏离区间：自适应 1.6% - 3.2%"],
        description: "为震荡行情准备的分批建仓策略，波动扩大时自动拉宽安全单间距。",
        name: "DCA 波动阶梯",
        tags: ["DCA", "BTC", "SOL"],
      },
    },
    createdAt: "2026-05-03T16:20:00+08:00",
    id: "sk-dca-volatility-ladder",
    metrics: {
      maxDrawdown: 0.0948,
      minimumCapital: 800,
      profit30dUsd: 29_803.46,
      returnRate: 0.9846,
      runningDays: 267,
      tradeCount: 214,
      winRate: 0.611,
    },
    returnCurve: createMockCurve([0, -0.014, 0.006, 0.022, 0.017, 0.049, 0.075, 0.066, 0.101, 0.138, 0.172, 0.194, 0.226, 0.281, 0.312]),
    riskLevel: "medium",
    type: "dca",
    updatedAt: "2026-06-14T18:40:00+08:00",
  },
  {
    content: {
      "en-US": {
        configLines: ["Strategy type: grid", "Range: dynamic 90D band", "Grid count: 42", "Rebalance: weekly"],
        description: "Range-trading template that keeps capital working during sideways BTC and ETH sessions.",
        name: "Grid Market Maker Lite",
        tags: ["Grid", "Range", "Low DD"],
      },
      "zh-CN": {
        configLines: ["策略类型：网格", "价格区间：动态 90 天通道", "网格数量：42 档", "再平衡：每周"],
        description: "为横盘行情准备的轻量网格策略，重点控制回撤并保持资金利用率。",
        name: "轻量网格做市",
        tags: ["网格", "震荡", "低回撤"],
      },
    },
    createdAt: "2026-03-29T11:45:00+08:00",
    id: "sk-grid-market-maker-lite",
    metrics: {
      maxDrawdown: 0.0926,
      minimumCapital: 1_500,
      profit30dUsd: 17_695.09,
      returnRate: 1.5587,
      runningDays: 264,
      tradeCount: 280,
      winRate: 0.704,
    },
    returnCurve: createMockCurve([0, 0.008, 0.017, 0.019, 0.034, 0.047, 0.061, 0.076, 0.081, 0.096, 0.109, 0.128, 0.141, 0.162, 0.184]),
    riskLevel: "low",
    type: "grid",
    updatedAt: "2026-06-13T14:05:00+08:00",
  },
  {
    content: {
      "en-US": {
        configLines: ["Strategy type: snowball", "Trigger: trend continuation", "Knock-out guard: enabled", "Protection: staged exits"],
        description: "Trend-compounding template that scales only after the first profit target is confirmed.",
        name: "Snowball Trend Compounder",
        tags: ["Snowball", "Trend", "Compound"],
      },
      "zh-CN": {
        configLines: ["策略类型：雪球", "触发条件：趋势延续", "熔断保护：开启", "保护机制：分段止盈退出"],
        description: "趋势确认后才逐步放大仓位，适合强趋势行情下做收益放大。",
        name: "雪球趋势复利",
        tags: ["雪球", "趋势", "复利"],
      },
    },
    createdAt: "2026-05-31T08:30:00+08:00",
    id: "sk-snowball-trend-compounder",
    metrics: {
      maxDrawdown: 0.011,
      minimumCapital: 2_000,
      profit30dUsd: 10_367.96,
      returnRate: 2.0736,
      runningDays: 12,
      tradeCount: 74,
      winRate: 0.548,
    },
    returnCurve: createMockCurve([0, 0.035, 0.066, 0.052, 0.124, 0.18, 0.151, 0.232, 0.286, 0.264, 0.337, 0.392, 0.421, 0.487, 0.521]),
    riskLevel: "high",
    type: "snowball",
    updatedAt: "2026-06-16T07:45:00+08:00",
  },
  {
    content: {
      "en-US": {
        configLines: ["Strategy type: signal portfolio", "Market side: long-biased", "Sizing: 60% risk budget", "TP / SL: 18% / 7%"],
        description: "Defensive signal portfolio that only activates lower-drawdown long setups.",
        name: "Defensive Signal Ladder",
        tags: ["Defensive", "Long-biased", "BTC"],
      },
      "zh-CN": {
        configLines: ["策略类型：信号组合", "方向偏好：低回撤做多", "仓位预算：60% 风险预算", "止盈 / 止损：18% / 7%"],
        description: "只启用低回撤做多信号，适合需要更稳健曲线的用户做配置参考。",
        name: "防守信号阶梯",
        tags: ["防守", "做多", "BTC"],
      },
    },
    createdAt: "2026-04-19T10:10:00+08:00",
    id: "sk-defensive-signal-ladder",
    metrics: {
      maxDrawdown: 0.0142,
      minimumCapital: 750,
      profit30dUsd: 9_095.11,
      returnRate: 0.1819,
      runningDays: 8,
      tradeCount: 91,
      winRate: 0.676,
    },
    returnCurve: createMockCurve([0, 0.006, 0.018, 0.014, 0.031, 0.056, 0.072, 0.091, 0.103, 0.118, 0.139, 0.157, 0.181, 0.204, 0.226]),
    riskLevel: "low",
    type: "copyTrading",
    updatedAt: "2026-06-15T09:25:00+08:00",
  },
];
