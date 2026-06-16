import { useMemo, useState } from "react";
import type { WorkspaceCopy, WorkspaceLanguage } from "@/app/_lib/i18n";
import type { PnlColorMode } from "./top-signals-panel";

type StrategySquareType = "copyTrading" | "dca" | "grid" | "mario" | "snowball";
type StrategySquareRiskLevel = "high" | "low" | "medium";
type StrategySquareSortKey = "drawdown" | "newest" | "profit" | "returnRate";
type StrategySquareStoreTab = "allProjects" | "recommended";
type StrategySquareTypeFilter = StrategySquareType | "all";
type StrategySquareFeaturedMetric = "drawdown" | "profit" | "returnRate";
type StrategySquareWindow = "7d" | "30d" | "90d";

type StrategySquareReturnPoint = {
  timestamp: number;
  value: number;
};

type StrategySquareLocalizedContent = {
  configLines: readonly string[];
  description: string;
  name: string;
  tags: readonly string[];
};

type StrategySquareItem = {
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

type StrategyRecommendationSection = {
  description: string;
  featuredMetric: StrategySquareFeaturedMetric;
  key: "highPnl" | "highReturn" | "lowDrawdown";
  sortKey: StrategySquareSortKey;
  strategies: readonly StrategySquareItem[];
  title: string;
};

const ALL_TYPE_FILTER: StrategySquareTypeFilter = "all";
const STRATEGY_TYPE_FILTERS: readonly StrategySquareTypeFilter[] = [
  "all",
  "copyTrading",
  "mario",
  "dca",
  "grid",
  "snowball",
];
const SORT_KEYS: readonly StrategySquareSortKey[] = ["profit", "returnRate", "drawdown", "newest"];
const STRATEGY_WINDOWS: readonly StrategySquareWindow[] = ["7d", "30d", "90d"];
const WINDOW_METRIC_MULTIPLIERS: Readonly<Record<StrategySquareWindow, {
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
const CURVE_WIDTH = 320;
const CURVE_HEIGHT = 96;
const CURVE_PADDING = 8;
const MOCK_CURVE_START_MS = Date.UTC(2026, 2, 18);
const MOCK_CURVE_STEP_MS = 6 * 24 * 60 * 60 * 1_000;

const MOCK_STRATEGIES: readonly StrategySquareItem[] = [
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

export function StrategySquareProductTab({
  copy,
  isDarkTheme,
  language,
  pnlColorMode,
  onMockCopy,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  pnlColorMode: PnlColorMode;
  onMockCopy?: (strategyName: string) => void;
}) {
  const panelCopy = copy.workspace.strategySquare;
  const [activeStoreTab, setActiveStoreTab] = useState<StrategySquareStoreTab>("recommended");
  const [activeType, setActiveType] = useState<StrategySquareTypeFilter>(ALL_TYPE_FILTER);
  const [activeWindow, setActiveWindow] = useState<StrategySquareWindow>("30d");
  const [copiedStrategyId, setCopiedStrategyId] = useState("");
  const [detailStrategyId, setDetailStrategyId] = useState("");
  const [sortKey, setSortKey] = useState<StrategySquareSortKey>("profit");
  const visibleStrategies = useMemo(
    () => MOCK_STRATEGIES
      .filter((strategy) => activeType === ALL_TYPE_FILTER || strategy.type === activeType)
      .slice()
      .sort((left, right) => compareStrategies(left, right, sortKey, activeWindow)),
    [activeType, activeWindow, sortKey],
  );
  const recommendationSections = useMemo(
    () => createRecommendationSections(MOCK_STRATEGIES, panelCopy),
    [panelCopy],
  );
  const detailStrategy = MOCK_STRATEGIES.find((strategy) => strategy.id === detailStrategyId) ?? null;
  const shellClassName = "h-full min-h-0 p-3 pb-28 lg:p-4 lg:pb-4";
  const panelClassName = isDarkTheme
    ? "flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#181A20]"
    : "flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-[#E5EAF0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.035)]";
  const heroClassName = isDarkTheme
    ? "relative overflow-hidden border-b border-white/[0.075] bg-[#181A20] p-4 sm:p-5"
    : "relative overflow-hidden border-b border-[#E5EAF0] bg-white p-4 sm:p-5";
  const scrollClassName = isDarkTheme
    ? "kol-scroll-area kol-scroll-area-dark min-h-0 flex-1 overflow-y-auto bg-[#12161D] p-3 sm:p-4"
    : "kol-scroll-area min-h-0 flex-1 overflow-y-auto bg-[#FAFBFD] p-3 sm:p-4";

  const handleCopy = (strategy: StrategySquareItem) => {
    const content = getStrategyContent(strategy, language);
    setCopiedStrategyId(strategy.id);
    onMockCopy?.(content.name);
  };

  return (
    <section className={shellClassName}>
      <div className={panelClassName}>
        <div className={heroClassName}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#00A6F4]/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-20 w-40 rounded-full bg-[#00A6F4]/10 blur-3xl" />
          <div className="relative flex flex-col items-start gap-4">
            <div className="w-full sm:w-[340px]">
              <StrategyStoreTabs
                activeTab={activeStoreTab}
                copy={copy}
                isDarkTheme={isDarkTheme}
                onTabChange={setActiveStoreTab}
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={isDarkTheme ? "text-2xl font-black tracking-tight text-slate-50 sm:text-3xl" : "text-2xl font-black tracking-tight text-slate-950 sm:text-3xl"}>
                  {panelCopy.heroTitle}
                </h1>
                <span className={getMockBadgeClassName(isDarkTheme)}>{panelCopy.mockBadge}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StrategyHeroStat isDarkTheme={isDarkTheme} label={panelCopy.metrics.strategies} value={String(MOCK_STRATEGIES.length)} />
                <StrategyHeroStat isDarkTheme={isDarkTheme} label={panelCopy.rankingTitle} value={String(recommendationSections.length)} />
                <StrategyHeroStat isDarkTheme={isDarkTheme} label={panelCopy.returnCurve} value={panelCopy.returnWindow} />
              </div>
            </div>
          </div>
        </div>

        <div className={scrollClassName}>
          {activeStoreTab === "recommended" ? (
            <div className="grid gap-7">
              {recommendationSections.map((section) => (
                <RecommendedStrategySection
                  key={section.key}
                  copiedStrategyId={copiedStrategyId}
                  copy={copy}
                  isDarkTheme={isDarkTheme}
                  language={language}
                  pnlColorMode={pnlColorMode}
                  section={section}
                  onCopy={handleCopy}
                  onDetailsOpen={setDetailStrategyId}
                  onMore={() => {
                    setSortKey(section.sortKey);
                    setActiveStoreTab("allProjects");
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h1 className={isDarkTheme ? "text-2xl font-black tracking-tight text-slate-50" : "text-2xl font-black tracking-tight text-slate-950"}>{panelCopy.allProjectsTitle}</h1>
                  <p className={isDarkTheme ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-slate-500"}>{panelCopy.visibleCount(visibleStrategies.length, MOCK_STRATEGIES.length)}</p>
                </div>
                <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                  <StrategyWindowTabs
                    activeWindow={activeWindow}
                    copy={copy}
                    isDarkTheme={isDarkTheme}
                    onWindowChange={setActiveWindow}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={isDarkTheme ? "text-xs font-bold text-slate-500" : "text-xs font-bold text-slate-400"}>{panelCopy.sortBy}</span>
                    {SORT_KEYS.map((nextSortKey) => (
                      <button
                        key={nextSortKey}
                        className={getSortButtonClassName(isDarkTheme, sortKey === nextSortKey)}
                        type="button"
                        onClick={() => setSortKey(nextSortKey)}
                      >
                        {panelCopy.sortOptions[nextSortKey]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {STRATEGY_TYPE_FILTERS.map((typeFilter) => (
                  <button
                    key={typeFilter}
                    className={getFilterButtonClassName(isDarkTheme, activeType === typeFilter)}
                    type="button"
                    onClick={() => setActiveType(typeFilter)}
                  >
                    {typeFilter === "all" ? panelCopy.allTypes : panelCopy.strategyTypes[typeFilter]}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {visibleStrategies.map((strategy) => (
                  <StrategyMarketplaceCard
                    key={strategy.id}
                    copiedStrategyId={copiedStrategyId}
                    copy={copy}
                    isDarkTheme={isDarkTheme}
                    language={language}
                    pnlColorMode={pnlColorMode}
                    strategy={strategy}
                    variant="grid"
                    window={activeWindow}
                    onCopy={handleCopy}
                    onDetailsOpen={setDetailStrategyId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {detailStrategy ? (
        <StrategyParameterModal
          copiedStrategyId={copiedStrategyId}
          copy={copy}
          isDarkTheme={isDarkTheme}
          language={language}
          pnlColorMode={pnlColorMode}
          strategy={detailStrategy}
          window={activeWindow}
          onClose={() => setDetailStrategyId("")}
          onCopy={handleCopy}
        />
      ) : null}
    </section>
  );
}

function StrategyStoreTabs({
  activeTab,
  copy,
  isDarkTheme,
  onTabChange,
}: {
  activeTab: StrategySquareStoreTab;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onTabChange: (tab: StrategySquareStoreTab) => void;
}) {
  const tabs: readonly StrategySquareStoreTab[] = ["recommended", "allProjects"];
  const tabCopy = copy.workspace.strategySquare.viewTabs;

  return (
    <nav aria-label={copy.workspace.strategySquare.heroTitle} className={isDarkTheme ? "grid grid-cols-2 gap-1 rounded-2xl border border-white/[0.075] bg-white/[0.04] p-1" : "grid grid-cols-2 gap-1 rounded-2xl border border-[#E5EAF0] bg-[#F7FAFD] p-1"}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            aria-current={isActive ? "page" : undefined}
            className={getStoreTabButtonClassName(isDarkTheme, isActive)}
            type="button"
            onClick={() => onTabChange(tab)}
          >
            {tabCopy[tab]}
          </button>
        );
      })}
    </nav>
  );
}

function StrategyHeroStat({
  isDarkTheme,
  label,
  value,
}: {
  isDarkTheme: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.045] px-3 py-2" : "rounded-2xl border border-[#E5EAF0] bg-white/80 px-3 py-2 shadow-sm"}>
      <div className={isDarkTheme ? "text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500" : "text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"}>{label}</div>
      <div className={isDarkTheme ? "mt-0.5 text-sm font-black text-slate-100" : "mt-0.5 text-sm font-black text-slate-950"}>{value}</div>
    </div>
  );
}

function StrategyWindowTabs({
  activeWindow,
  copy,
  isDarkTheme,
  onWindowChange,
}: {
  activeWindow: StrategySquareWindow;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onWindowChange: (window: StrategySquareWindow) => void;
}) {
  const panelCopy = copy.workspace.strategySquare;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={isDarkTheme ? "text-xs font-bold text-slate-500" : "text-xs font-bold text-slate-400"}>{panelCopy.windowFilter}</span>
      <div className={isDarkTheme ? "flex rounded-full border border-white/[0.075] bg-white/[0.035] p-1" : "flex rounded-full border border-[#E5EAF0] bg-white p-1 shadow-sm"}>
        {STRATEGY_WINDOWS.map((window) => {
          const isActive = activeWindow === window;
          return (
            <button
              key={window}
              className={getWindowButtonClassName(isDarkTheme, isActive)}
              type="button"
              onClick={() => onWindowChange(window)}
            >
              {panelCopy.windows[window]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecommendedStrategySection({
  copiedStrategyId,
  copy,
  isDarkTheme,
  language,
  pnlColorMode,
  section,
  onCopy,
  onDetailsOpen,
  onMore,
}: {
  copiedStrategyId: string;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  pnlColorMode: PnlColorMode;
  section: StrategyRecommendationSection;
  onCopy: (strategy: StrategySquareItem) => void;
  onDetailsOpen: (strategyId: string) => void;
  onMore: () => void;
}) {
  const panelCopy = copy.workspace.strategySquare;

  return (
    <section className={isDarkTheme ? "rounded-[28px] border border-white/[0.075] bg-white/[0.025] p-3 sm:p-4" : "rounded-[28px] border border-[#E5EAF0] bg-white/80 p-3 shadow-sm sm:p-4"}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className={isDarkTheme ? "text-lg font-black tracking-tight text-slate-50 sm:text-xl" : "text-lg font-black tracking-tight text-slate-950 sm:text-xl"}>{section.title}</h2>
          <p className={isDarkTheme ? "mt-1 text-xs font-medium text-slate-500" : "mt-1 text-xs font-medium text-slate-500"}>{section.description}</p>
        </div>
        <button className={isDarkTheme ? "motion-fx-3-raw-button shrink-0 rounded-full bg-sky-400/10 px-3 py-1.5 text-xs font-black text-sky-200 transition hover:bg-sky-400/15" : "motion-fx-3-raw-button shrink-0 rounded-full bg-[#EAF8FE] px-3 py-1.5 text-xs font-black text-[#008DCC] transition hover:bg-[#D8F1FD]"} type="button" onClick={onMore}>
          {panelCopy.moreAction} ›
        </button>
      </div>
      <div className={isDarkTheme ? "-mx-3 kol-scroll-area kol-scroll-area-dark flex snap-x gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0" : "-mx-3 kol-scroll-area flex snap-x gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0"}>
        {section.strategies.map((strategy, index) => (
          <StrategyMarketplaceCard
            key={`${section.key}-${strategy.id}`}
            copiedStrategyId={copiedStrategyId}
            copy={copy}
            featuredMetric={section.featuredMetric}
            isDarkTheme={isDarkTheme}
            language={language}
            pnlColorMode={pnlColorMode}
            rank={index + 1}
            strategy={strategy}
            variant="rail"
            window="30d"
            onCopy={onCopy}
            onDetailsOpen={onDetailsOpen}
          />
        ))}
      </div>
    </section>
  );
}

function StrategyMarketplaceCard({
  copiedStrategyId,
  copy,
  featuredMetric = "profit",
  isDarkTheme,
  language,
  pnlColorMode,
  rank,
  strategy,
  variant,
  window,
  onCopy,
  onDetailsOpen,
}: {
  copiedStrategyId: string;
  copy: WorkspaceCopy;
  featuredMetric?: StrategySquareFeaturedMetric;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  pnlColorMode: PnlColorMode;
  rank?: number;
  strategy: StrategySquareItem;
  variant: "grid" | "rail";
  window: StrategySquareWindow;
  onCopy: (strategy: StrategySquareItem) => void;
  onDetailsOpen: (strategyId: string) => void;
}) {
  const panelCopy = copy.workspace.strategySquare;
  const content = getStrategyContent(strategy, language);
  const windowMetrics = getWindowAdjustedMetrics(strategy, window);
  const primaryMetric = getStrategyCardPrimaryMetric(windowMetrics, panelCopy, featuredMetric, window);
  const secondaryMetric = getStrategyCardSecondaryMetric(windowMetrics, panelCopy, featuredMetric, window);
  const cardClassName = `${variant === "rail" ? "w-[calc(100vw-3.5rem)] max-w-[360px] shrink-0 snap-start xl:w-[380px] xl:max-w-[380px]" : "min-w-0"} ${isDarkTheme
    ? "group overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#181A20] text-left transition hover:border-sky-400/30 hover:bg-white/[0.055]"
    : "group overflow-hidden rounded-[26px] border border-[#E5EAF0] bg-white text-left shadow-sm transition hover:border-[#BFE7FB] hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]"}`;

  return (
    <article className={cardClassName}>
      <button className="block w-full p-4 text-left" type="button" onClick={() => onDetailsOpen(strategy.id)}>
        <div className="flex min-w-0 items-start gap-3">
          <StrategyIcon isDarkTheme={isDarkTheme} name={content.name} rank={rank} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={getMockBadgeClassName(isDarkTheme)}>{panelCopy.mockBadge}</span>
              <span className={getTypeBadgeClassName(isDarkTheme, strategy.type)}>{panelCopy.strategyTypes[strategy.type]}</span>
              <span className={getRiskBadgeClassName(isDarkTheme, strategy.riskLevel)}>{panelCopy.riskLevels[strategy.riskLevel]}</span>
            </div>
            <h3 className={isDarkTheme ? "mt-2 truncate text-base font-black text-slate-50" : "mt-2 truncate text-base font-black text-slate-950"}>{content.name}</h3>
            <p className={isDarkTheme ? "mt-1 line-clamp-2 text-xs leading-5 text-slate-400" : "mt-1 line-clamp-2 text-xs leading-5 text-slate-500"}>{content.description}</p>
          </div>
        </div>

        <div className={isDarkTheme ? "mt-4 rounded-[22px] border border-white/[0.065] bg-[#101821] p-3" : "mt-4 rounded-[22px] border border-[#E5EAF0] bg-gradient-to-b from-[#F8FCFF] to-white p-3"}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className={isDarkTheme ? "text-[11px] font-bold text-slate-500" : "text-[11px] font-bold text-slate-400"}>{primaryMetric.label}</div>
              <div className={getPnlTextClassName(isDarkTheme, primaryMetric.toneValue, pnlColorMode, "mt-1 text-2xl tracking-tight")}>{primaryMetric.value}</div>
            </div>
            <div className={isDarkTheme ? "rounded-2xl bg-white/[0.055] px-3 py-2 text-right" : "rounded-2xl bg-white px-3 py-2 text-right shadow-sm"}>
              <div className={isDarkTheme ? "text-[10px] font-bold text-slate-500" : "text-[10px] font-bold text-slate-400"}>{secondaryMetric.label}</div>
              <div className={getPnlTextClassName(isDarkTheme, secondaryMetric.toneValue, pnlColorMode, "mt-0.5 text-sm")}>{secondaryMetric.value}</div>
            </div>
          </div>
          <div className="mt-3 h-24 min-w-0">
            <StrategyReturnCurveChart isDarkTheme={isDarkTheme} pnlColorMode={pnlColorMode} points={strategy.returnCurve} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <CardMetricRow isDarkTheme={isDarkTheme} label={panelCopy.metrics.maxDrawdown} value={formatPercent(windowMetrics.maxDrawdown)} />
          <CardMetricRow isDarkTheme={isDarkTheme} label={panelCopy.metrics.winRate} value={formatPercent(windowMetrics.winRate)} />
          <CardMetricRow isDarkTheme={isDarkTheme} label={panelCopy.metrics.runningDays} value={String(strategy.metrics.runningDays)} />
        </div>
      </button>

      <div className={isDarkTheme ? "grid grid-cols-[minmax(84px,0.35fr)_minmax(0,1fr)] gap-2 border-t border-white/[0.065] p-3" : "grid grid-cols-[minmax(84px,0.35fr)_minmax(0,1fr)] gap-2 border-t border-[#EEF2F6] p-3"}>
        <button className={getMockActionClassName(isDarkTheme)} type="button" onClick={() => onDetailsOpen(strategy.id)}>
          {panelCopy.viewDetailsAction}
        </button>
        <button className={getFollowActionClassName(isDarkTheme)} type="button" onClick={() => onCopy(strategy)}>
          {copiedStrategyId === strategy.id ? panelCopy.copiedAction : panelCopy.copyAction}
        </button>
      </div>
    </article>
  );
}

function CardMetricRow({ isDarkTheme, label, value }: { isDarkTheme: boolean; label: string; value: string }) {
  return (
    <div className={isDarkTheme ? "min-w-0 rounded-2xl bg-white/[0.045] px-2.5 py-2" : "min-w-0 rounded-2xl bg-[#F8FAFC] px-2.5 py-2"}>
      <div className={isDarkTheme ? "truncate text-[10px] font-bold text-slate-500" : "truncate text-[10px] font-bold text-slate-400"}>{label}</div>
      <div className={isDarkTheme ? "mt-1 truncate text-xs font-black text-slate-100" : "mt-1 truncate text-xs font-black text-slate-950"}>{value}</div>
    </div>
  );
}

function StrategyIcon({
  isDarkTheme,
  name,
  rank,
}: {
  isDarkTheme: boolean;
  name: string;
  rank?: number;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#00A6F4] text-sm font-black text-white shadow-[0_8px_20px_rgba(0,166,244,0.24)]">
      {initials || "SK"}
      {rank ? <span className={getRankBadgeClassName(isDarkTheme)}>#{rank}</span> : null}
    </div>
  );
}

function StrategyParameterModal({
  copiedStrategyId,
  copy,
  isDarkTheme,
  language,
  pnlColorMode,
  strategy,
  window,
  onClose,
  onCopy,
}: {
  copiedStrategyId: string;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  pnlColorMode: PnlColorMode;
  strategy: StrategySquareItem;
  window: StrategySquareWindow;
  onClose: () => void;
  onCopy: (strategy: StrategySquareItem) => void;
}) {
  const panelCopy = copy.workspace.strategySquare;
  const content = getStrategyContent(strategy, language);
  const windowMetrics = getWindowAdjustedMetrics(strategy, window);
  const dialogClassName = isDarkTheme
    ? "fixed inset-x-3 bottom-3 top-auto z-[110] flex max-h-[92dvh] flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0F141B] text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.48)] sm:inset-x-1/2 sm:bottom-auto sm:top-1/2 sm:w-[min(760px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2"
    : "fixed inset-x-3 bottom-3 top-auto z-[110] flex max-h-[92dvh] flex-col overflow-hidden rounded-[28px] border border-[#E5EAF0] bg-white text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:inset-x-1/2 sm:bottom-auto sm:top-1/2 sm:w-[min(760px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2";

  return (
    <>
      <button
        aria-label={copy.common.close}
        className={isDarkTheme ? "fixed inset-0 z-[100] bg-black/55 backdrop-blur-[4px]" : "fixed inset-0 z-[100] bg-slate-950/25 backdrop-blur-[4px]"}
        type="button"
        onClick={onClose}
      />
      <aside
        aria-labelledby={`strategy-parameter-dialog-title-${strategy.id}`}
        aria-modal="true"
        className={dialogClassName}
        role="dialog"
      >
        <div className={isDarkTheme ? "border-b border-white/[0.075] p-4 sm:p-5" : "border-b border-[#E5EAF0] p-4 sm:p-5"}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <StrategyIcon isDarkTheme={isDarkTheme} name={content.name} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={getMockBadgeClassName(isDarkTheme)}>{panelCopy.mockBadge}</span>
                  <span className={getTypeBadgeClassName(isDarkTheme, strategy.type)}>{panelCopy.strategyTypes[strategy.type]}</span>
                  <span className={getRiskBadgeClassName(isDarkTheme, strategy.riskLevel)}>{panelCopy.riskLevels[strategy.riskLevel]}</span>
                </div>
                <h2 id={`strategy-parameter-dialog-title-${strategy.id}`} className={isDarkTheme ? "mt-2 text-xl font-black tracking-tight text-slate-50" : "mt-2 text-xl font-black tracking-tight text-slate-950"}>
                  {content.name}
                </h2>
                <p className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-500"}>
                  {panelCopy.parameterDialogDescription}
                </p>
              </div>
            </div>
            <button
              aria-label={copy.common.close}
              className={isDarkTheme ? "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.075] bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50" : "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#E5EAF0] bg-white text-slate-500 transition hover:border-[#BFE7FB] hover:text-slate-900"}
              type="button"
              onClick={onClose}
            >
              <span aria-hidden="true" className="text-lg leading-none">×</span>
            </button>
          </div>
        </div>

        <div className={isDarkTheme ? "kol-scroll-area kol-scroll-area-dark min-h-0 flex-1 overflow-y-auto bg-[#12161D] p-4 sm:p-5" : "kol-scroll-area min-h-0 flex-1 overflow-y-auto bg-[#FAFBFD] p-4 sm:p-5"}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid gap-4">
              <section className={isDarkTheme ? "rounded-3xl border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-3xl border border-[#E5EAF0] bg-white p-4 shadow-sm"}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className={isDarkTheme ? "text-sm font-black text-slate-100" : "text-sm font-black text-slate-950"}>{panelCopy.parameterDialogTitle}</h3>
                    <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-500"}>{content.description}</p>
                  </div>
                  <span className={getSoftBadgeClassName(isDarkTheme)}>{panelCopy.windows[window]}</span>
                </div>
                <div className="mt-4 h-28">
                  <StrategyReturnCurveChart isDarkTheme={isDarkTheme} pnlColorMode={pnlColorMode} points={strategy.returnCurve} />
                </div>
              </section>

              <section className={isDarkTheme ? "rounded-3xl border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-3xl border border-[#E5EAF0] bg-white p-4 shadow-sm"}>
                <h3 className={isDarkTheme ? "text-sm font-black text-slate-100" : "text-sm font-black text-slate-950"}>{panelCopy.copyConfigTitle}</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {content.configLines.map((line) => (
                    <div key={line} className={isDarkTheme ? "rounded-2xl border border-white/[0.06] bg-[#181A20] px-3 py-3 text-xs font-medium text-slate-300" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-3 text-xs font-medium text-slate-600"}>
                      {line}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="grid content-start gap-3">
              <div className="grid grid-cols-2 gap-2">
                <StrategyMetric isDarkTheme={isDarkTheme} label={panelCopy.windowedProfitUsd(panelCopy.windows[window])} value={formatCurrencyNumber(windowMetrics.profit30dUsd)} valueClassName={getPnlTextClassName(isDarkTheme, windowMetrics.profit30dUsd, pnlColorMode, "text-sm")} />
                <StrategyMetric isDarkTheme={isDarkTheme} label={panelCopy.metrics.returnRate} value={formatSignedPercent(windowMetrics.returnRate)} valueClassName={getPnlTextClassName(isDarkTheme, windowMetrics.returnRate, pnlColorMode, "text-sm")} />
                <StrategyMetric isDarkTheme={isDarkTheme} label={panelCopy.metrics.maxDrawdown} value={formatPercent(windowMetrics.maxDrawdown)} />
                <StrategyMetric isDarkTheme={isDarkTheme} label={panelCopy.metrics.winRate} value={formatPercent(windowMetrics.winRate)} />
                <StrategyMetric isDarkTheme={isDarkTheme} label={panelCopy.metrics.tradeCount} value={String(windowMetrics.tradeCount)} />
                <StrategyMetric isDarkTheme={isDarkTheme} label={panelCopy.metrics.minimumCapital} value={formatCurrencyNumber(strategy.metrics.minimumCapital)} />
              </div>
              <section className={isDarkTheme ? "rounded-3xl border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-3xl border border-[#E5EAF0] bg-white p-4 shadow-sm"}>
                <h3 className={isDarkTheme ? "text-xs font-black text-slate-100" : "text-xs font-black text-slate-950"}>{panelCopy.parameterTagsTitle}</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {content.tags.map((tag) => <span key={tag} className={getTagClassName(isDarkTheme)}>{tag}</span>)}
                </div>
              </section>
              <div className={isDarkTheme ? "rounded-2xl border border-sky-300/20 bg-sky-300/10 p-3 text-xs leading-5 text-sky-100" : "rounded-2xl border border-[#BFE7FB] bg-[#EAF8FE] p-3 text-xs leading-5 text-[#006F9F]"}>
                {panelCopy.mockNotice}
              </div>
            </div>
          </div>
        </div>

        <div className={isDarkTheme ? "border-t border-white/[0.075] p-4 sm:p-5" : "border-t border-[#E5EAF0] p-4 sm:p-5"}>
          <button className={getFollowActionClassName(isDarkTheme)} type="button" onClick={() => onCopy(strategy)}>
            {copiedStrategyId === strategy.id ? panelCopy.copiedAction : panelCopy.copyAction}
          </button>
        </div>
      </aside>
    </>
  );
}

function StrategyMetric({
  isDarkTheme,
  label,
  value,
  valueClassName,
}: {
  isDarkTheme: boolean;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3"}>
      <div className={isDarkTheme ? "truncate text-[10px] font-bold text-slate-500" : "truncate text-[10px] font-bold text-slate-400"}>{label}</div>
      <div className={valueClassName ?? (isDarkTheme ? "mt-1 truncate text-sm font-black text-slate-100" : "mt-1 truncate text-sm font-black text-slate-950")}>{value}</div>
    </div>
  );
}

function StrategyReturnCurveChart({
  isDarkTheme,
  pnlColorMode,
  points,
}: {
  isDarkTheme: boolean;
  pnlColorMode: PnlColorMode;
  points: readonly StrategySquareReturnPoint[];
}) {
  const renderPoints = createCurveRenderPoints(points);
  if (renderPoints.length === 0) {
    return null;
  }

  const latestValue = points[points.length - 1]?.value ?? 0;
  const strokeColor = getCurveStrokeColor(isDarkTheme, latestValue, pnlColorMode);
  const gridColor = isDarkTheme ? "rgba(148,163,184,0.2)" : "rgba(148,163,184,0.28)";
  const pathData = createCurvePath(renderPoints);
  const zeroLineY = calculateZeroLineY(points);
  const endPoint = renderPoints[renderPoints.length - 1];

  return (
    <svg aria-label="Strategy return curve" className="h-full w-full overflow-visible" role="img" viewBox={`0 0 ${CURVE_WIDTH} ${CURVE_HEIGHT}`}>
      {zeroLineY !== null ? (
        <line stroke={gridColor} strokeDasharray="4 4" strokeWidth="1" x1={CURVE_PADDING} x2={CURVE_WIDTH - CURVE_PADDING} y1={zeroLineY} y2={zeroLineY} />
      ) : null}
      <path d={pathData} fill="none" stroke={strokeColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" />
      {endPoint ? <circle cx={endPoint.x} cy={endPoint.y} fill={strokeColor} r="3.2" /> : null}
    </svg>
  );
}

function createRecommendationSections(
  strategies: readonly StrategySquareItem[],
  panelCopy: WorkspaceCopy["workspace"]["strategySquare"],
): StrategyRecommendationSection[] {
  return [
    {
      description: panelCopy.metrics.profit30dUsd,
      featuredMetric: "profit",
      key: "highPnl",
      sortKey: "profit",
      strategies: strategies.slice().sort((left, right) => right.metrics.profit30dUsd - left.metrics.profit30dUsd).slice(0, 4),
      title: panelCopy.rankings.highPnl,
    },
    {
      description: panelCopy.metrics.returnRate,
      featuredMetric: "returnRate",
      key: "highReturn",
      sortKey: "returnRate",
      strategies: strategies.slice().sort((left, right) => compareNullableDesc(left.metrics.returnRate, right.metrics.returnRate)).slice(0, 4),
      title: panelCopy.rankings.topReturn,
    },
    {
      description: panelCopy.metrics.maxDrawdown30d,
      featuredMetric: "drawdown",
      key: "lowDrawdown",
      sortKey: "drawdown",
      strategies: strategies.slice().sort((left, right) => compareNullableAsc(left.metrics.maxDrawdown, right.metrics.maxDrawdown)).slice(0, 4),
      title: panelCopy.rankings.lowDrawdown,
    },
  ];
}

function createMockCurve(values: readonly number[]): StrategySquareReturnPoint[] {
  return values.map((value, index) => ({
    timestamp: MOCK_CURVE_START_MS + index * MOCK_CURVE_STEP_MS,
    value,
  }));
}

function compareStrategies(left: StrategySquareItem, right: StrategySquareItem, sortKey: StrategySquareSortKey, window: StrategySquareWindow): number {
  const leftMetrics = getWindowAdjustedMetrics(left, window);
  const rightMetrics = getWindowAdjustedMetrics(right, window);
  if (sortKey === "profit") {
    return rightMetrics.profit30dUsd - leftMetrics.profit30dUsd
      || compareNullableDesc(leftMetrics.returnRate, rightMetrics.returnRate)
      || left.id.localeCompare(right.id);
  }

  if (sortKey === "drawdown") {
    return compareNullableAsc(leftMetrics.maxDrawdown, rightMetrics.maxDrawdown)
      || compareNullableDesc(leftMetrics.returnRate, rightMetrics.returnRate)
      || left.id.localeCompare(right.id);
  }

  if (sortKey === "newest") {
    return Date.parse(right.createdAt) - Date.parse(left.createdAt)
      || left.id.localeCompare(right.id);
  }

  return compareNullableDesc(leftMetrics.returnRate, rightMetrics.returnRate)
    || compareNullableAsc(leftMetrics.maxDrawdown, rightMetrics.maxDrawdown)
    || left.id.localeCompare(right.id);
}

function getStrategyCardPrimaryMetric(
  metrics: StrategySquareItem["metrics"],
  panelCopy: WorkspaceCopy["workspace"]["strategySquare"],
  featuredMetric: StrategySquareFeaturedMetric,
  window: StrategySquareWindow,
): { label: string; toneValue: number | null; value: string } {
  if (featuredMetric === "returnRate") {
    return {
      label: panelCopy.metrics.returnRate,
      toneValue: metrics.returnRate,
      value: formatSignedPercent(metrics.returnRate),
    };
  }

  if (featuredMetric === "drawdown") {
    return {
      label: panelCopy.metrics.maxDrawdown,
      toneValue: null,
      value: formatPercent(metrics.maxDrawdown),
    };
  }

  return {
    label: panelCopy.windowedProfitUsd(panelCopy.windows[window]),
    toneValue: metrics.profit30dUsd,
    value: formatCurrencyNumber(metrics.profit30dUsd),
  };
}

function getStrategyCardSecondaryMetric(
  metrics: StrategySquareItem["metrics"],
  panelCopy: WorkspaceCopy["workspace"]["strategySquare"],
  featuredMetric: StrategySquareFeaturedMetric,
  window: StrategySquareWindow,
): { label: string; toneValue: number | null; value: string } {
  if (featuredMetric === "returnRate") {
    return {
      label: panelCopy.windowedProfitUsd(panelCopy.windows[window]),
      toneValue: metrics.profit30dUsd,
      value: formatCurrencyNumber(metrics.profit30dUsd),
    };
  }

  return {
    label: panelCopy.metrics.returnRate,
    toneValue: metrics.returnRate,
    value: formatSignedPercent(metrics.returnRate),
  };
}

function getStrategyContent(strategy: StrategySquareItem, language: WorkspaceLanguage): StrategySquareLocalizedContent {
  return strategy.content[language] ?? strategy.content["en-US"];
}

function getWindowAdjustedMetrics(strategy: StrategySquareItem, window: StrategySquareWindow): StrategySquareItem["metrics"] {
  const multipliers = WINDOW_METRIC_MULTIPLIERS[window];
  return {
    ...strategy.metrics,
    maxDrawdown: multiplyNullable(strategy.metrics.maxDrawdown, multipliers.drawdown),
    profit30dUsd: strategy.metrics.profit30dUsd * multipliers.profit,
    returnRate: multiplyNullable(strategy.metrics.returnRate, multipliers.returnRate),
    tradeCount: Math.max(1, Math.round(strategy.metrics.tradeCount * multipliers.trades)),
  };
}

function multiplyNullable(value: number | null, multiplier: number): number | null {
  return value === null ? null : value * multiplier;
}

function compareNullableDesc(left: number | null, right: number | null): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return right - left;
}

function compareNullableAsc(left: number | null, right: number | null): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return left - right;
}

function createCurveRenderPoints(points: readonly StrategySquareReturnPoint[]): { x: number; y: number }[] {
  const normalizedPoints = points.filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.value));
  if (normalizedPoints.length === 0) {
    return [];
  }

  const { max, min } = getCurveValueRange(normalizedPoints);
  const valueRange = max - min;
  const xRange = CURVE_WIDTH - CURVE_PADDING * 2;
  const yRange = CURVE_HEIGHT - CURVE_PADDING * 2;

  return normalizedPoints.map((point, index) => {
    const xRatio = normalizedPoints.length === 1 ? 1 : index / (normalizedPoints.length - 1);
    const yRatio = valueRange === 0 ? 0.5 : (max - point.value) / valueRange;
    return {
      x: CURVE_PADDING + xRatio * xRange,
      y: CURVE_PADDING + yRatio * yRange,
    };
  });
}

function createCurvePath(points: readonly { x: number; y: number }[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

function calculateZeroLineY(points: readonly StrategySquareReturnPoint[]): number | null {
  if (points.length === 0) {
    return null;
  }

  const { max, min } = getCurveValueRange(points);
  if (min > 0 || max < 0) {
    return null;
  }

  const valueRange = max - min;
  const yRange = CURVE_HEIGHT - CURVE_PADDING * 2;
  const yRatio = valueRange === 0 ? 0.5 : max / valueRange;
  return CURVE_PADDING + yRatio * yRange;
}

function getCurveValueRange(points: readonly StrategySquareReturnPoint[]): { max: number; min: number } {
  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  if (minValue !== maxValue) {
    return { max: maxValue, min: minValue };
  }

  const padding = Math.max(0.01, Math.abs(minValue) * 0.08);
  return {
    max: maxValue + padding,
    min: minValue - padding,
  };
}

function getCurveStrokeColor(isDarkTheme: boolean, value: number, pnlColorMode: PnlColorMode): string {
  if (Math.abs(value) < 0.00005) {
    return isDarkTheme ? "#94A3B8" : "#64748B";
  }

  const shouldUseGainColor = value > 0;
  const isGreenGain = pnlColorMode === "positiveGreen";
  if (shouldUseGainColor === isGreenGain) {
    return isDarkTheme ? "#34D399" : "#10B981";
  }

  return isDarkTheme ? "#FB7185" : "#F43F5E";
}

function getStoreTabButtonClassName(isDarkTheme: boolean, isActive: boolean): string {
  const baseClassName = "motion-fx-1-nav-button flex h-10 min-w-0 items-center justify-center rounded-xl px-3 text-sm font-black transition";
  if (isActive) {
    return isDarkTheme
      ? `${baseClassName} bg-[#00A6F4] text-white shadow-[0_10px_24px_rgba(0,166,244,0.24)]`
      : `${baseClassName} bg-white text-[#008DCC] shadow-sm`;
  }

  return `${baseClassName} ${isDarkTheme ? "text-slate-500 hover:bg-white/[0.05] hover:text-slate-200" : "text-slate-500 hover:bg-white hover:text-slate-900"}`;
}

function getFilterButtonClassName(isDarkTheme: boolean, isActive: boolean): string {
  if (isActive) {
    return "rounded-full bg-[#00A6F4] px-3 py-2 text-xs font-black text-white shadow-sm shadow-sky-500/20";
  }

  return isDarkTheme
    ? "rounded-full border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-xs font-bold text-slate-400 transition hover:border-sky-400/40 hover:text-sky-200"
    : "rounded-full border border-[#E5EAF0] bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:border-[#00A6F4] hover:text-[#008DCC]";
}

function getSortButtonClassName(isDarkTheme: boolean, isActive: boolean): string {
  if (isActive) {
    return isDarkTheme
      ? "rounded-full bg-sky-400/15 px-2.5 py-1.5 text-[11px] font-black text-sky-200"
      : "rounded-full bg-[#EAF8FE] px-2.5 py-1.5 text-[11px] font-black text-[#008DCC]";
  }

  return isDarkTheme
    ? "rounded-full px-2.5 py-1.5 text-[11px] font-bold text-slate-500 transition hover:bg-white/[0.055] hover:text-slate-200"
    : "rounded-full px-2.5 py-1.5 text-[11px] font-bold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700";
}

function getWindowButtonClassName(isDarkTheme: boolean, isActive: boolean): string {
  if (isActive) {
    return isDarkTheme
      ? "rounded-full bg-[#00A6F4] px-3 py-1.5 text-[11px] font-black text-white"
      : "rounded-full bg-[#00A6F4] px-3 py-1.5 text-[11px] font-black text-white shadow-sm shadow-sky-500/20";
  }

  return isDarkTheme
    ? "rounded-full px-3 py-1.5 text-[11px] font-bold text-slate-500 transition hover:bg-white/[0.055] hover:text-sky-200"
    : "rounded-full px-3 py-1.5 text-[11px] font-bold text-slate-500 transition hover:bg-[#EAF8FE] hover:text-[#008DCC]";
}

function getMockBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-md bg-sky-400/15 px-2 py-0.5 text-[10px] font-black text-sky-200"
    : "rounded-md bg-[#EAF8FE] px-2 py-0.5 text-[10px] font-black text-[#008DCC]";
}

function getTypeBadgeClassName(isDarkTheme: boolean, strategyType: StrategySquareType): string {
  const toneClassName = strategyType === "mario"
    ? isDarkTheme ? "bg-violet-400/15 text-violet-200" : "bg-violet-50 text-violet-700"
    : strategyType === "copyTrading"
      ? isDarkTheme ? "bg-sky-400/15 text-sky-200" : "bg-[#EAF8FE] text-[#008DCC]"
      : strategyType === "snowball"
        ? isDarkTheme ? "bg-amber-400/15 text-amber-200" : "bg-amber-50 text-amber-700"
        : isDarkTheme ? "bg-emerald-400/15 text-emerald-200" : "bg-emerald-50 text-emerald-700";

  return `rounded-md px-2 py-0.5 text-[10px] font-black ${toneClassName}`;
}

function getRiskBadgeClassName(isDarkTheme: boolean, riskLevel: StrategySquareRiskLevel): string {
  if (riskLevel === "high") {
    return isDarkTheme ? "rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-200" : "rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700";
  }

  if (riskLevel === "medium") {
    return isDarkTheme ? "rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-200" : "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700";
  }

  return isDarkTheme ? "rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-bold text-sky-200" : "rounded-full bg-[#EAF8FE] px-2 py-0.5 text-[10px] font-bold text-[#008DCC]";
}

function getRankBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "absolute -bottom-1 -right-1 rounded-full border border-[#181A20] bg-[#00A6F4] px-1.5 py-0.5 text-[10px] font-black text-white"
    : "absolute -bottom-1 -right-1 rounded-full border border-white bg-[#00A6F4] px-1.5 py-0.5 text-[10px] font-black text-white";
}

function getSoftBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "inline-flex rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-slate-300"
    : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600";
}

function getTagClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-full bg-white/[0.055] px-2 py-0.5 text-[10px] font-bold text-slate-400"
    : "rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500";
}

function getMockActionClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "motion-fx-3-raw-button inline-flex h-10 items-center justify-center rounded-xl bg-sky-400/15 px-3 text-sm font-black text-sky-100 transition hover:bg-sky-400/20"
    : "motion-fx-3-raw-button inline-flex h-10 items-center justify-center rounded-xl bg-[#EAF8FE] px-3 text-sm font-black text-[#008DCC] transition hover:bg-[#D8F1FD]";
}

function getFollowActionClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "motion-fx-3-raw-button inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#00A6F4] px-4 text-sm font-black text-white transition hover:bg-[#008DCC]"
    : "motion-fx-3-raw-button inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#00A6F4] px-4 text-sm font-black text-white shadow-sm shadow-sky-500/20 transition hover:bg-[#008DCC]";
}

function getPnlTextClassName(isDarkTheme: boolean, value: number | null, pnlColorMode: PnlColorMode, prefixClassName: string): string {
  if (value !== null && value > 0) {
    return `${prefixClassName} font-black ${pnlColorMode === "positiveGreen" ? isDarkTheme ? "text-emerald-300" : "text-emerald-500" : isDarkTheme ? "text-rose-300" : "text-rose-500"}`;
  }

  if (value !== null && value < 0) {
    return `${prefixClassName} font-black ${pnlColorMode === "positiveGreen" ? isDarkTheme ? "text-rose-300" : "text-rose-500" : isDarkTheme ? "text-emerald-300" : "text-emerald-500"}`;
  }

  return isDarkTheme ? `${prefixClassName} font-black text-slate-300` : `${prefixClassName} font-black text-slate-600`;
}

function formatCurrencyNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: Math.abs(value) >= 1_000 ? 2 : 2,
    minimumFractionDigits: 2,
  });
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return `${(value * 100).toFixed(2)}%`;
}

function formatSignedPercent(value: number | null): string {
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
