import type { MarketSymbol } from "@/app/_types/market";
import type { CalculatorForm, DashboardState, HistoryOrder, MockPosition, TakeProfitTargetConfig, TakeProfitTargetId } from "./types";

export const STORAGE_KEY = "mario-dashboard:v1";
export const ACCOUNT_BALANCE = 10_000;
export const MAX_COUNTDOWNS = 2;
export const COUNTDOWN_URGENT_MS = 60 * 60 * 1_000;
export const QUOTE_ROTATE_MS = 8_000;
export const PRIORITY_SYMBOLS = ["BTC", "ETH"] as const;
export const FALLBACK_SYMBOLS = ["BTC", "ETH", "HYPE", "SNDK"] as const;
export const FALLBACK_MARKET_SYMBOLS = FALLBACK_SYMBOLS.map((symbol) => `${symbol}/USDT:USDT` as MarketSymbol);
export const BUDGET_OPTIONS = [1, 2, 3, 5] as const;
export const RATIO_OPTIONS = [2, 3, 4, 5] as const;
export const PERCENT_A_OPTIONS = [100, 70, 50, 30] as const;
export const TAKE_PROFIT_TARGET_IDS = ["tp1", "tp2", "tp3"] satisfies readonly TakeProfitTargetId[];
export const DEFAULT_TAKE_PROFIT_TARGETS: readonly TakeProfitTargetConfig[] = [
  { closePercent: 30, id: "tp1", ratio: 2 },
  { closePercent: 30, id: "tp2", ratio: 3 },
  { closePercent: 40, id: "tp3", ratio: 4 },
];

export const INITIAL_DASHBOARD_STATE: DashboardState = {
  budget: 1,
  countdowns: [],
  darkMode: false,
  orders: [],
  ratio: 2,
  takeProfitTargets: [...DEFAULT_TAKE_PROFIT_TARGETS],
};

export const INITIAL_FORM: CalculatorForm = {
  entryA: "",
  entryB: "",
  percentA: 100,
  stopLoss: "",
  symbol: "ETH",
};

export const QUOTES = [
  "别人贪婪时我恐惧，别人恐惧时我贪婪——巴菲特",
  "截断亏损，让利润奔跑——利弗莫尔",
  "耐心是交易者最重要的美德——布伦达",
  "计划你的交易，交易你的计划——布伦达",
  "风险第一，盈利第二——索罗斯",
  "不要试图抄底摸顶——利弗莫尔",
  "趋势是你的朋友——华尔街格言",
  "少就是多，慢就是快——利弗莫尔",
  "永远不要爱上你的头寸——索罗斯",
  "市场永远是对的——华尔街格言",
  "保本第一，保本第二，保本第三——海龟法则",
  "等待机会，等待属于你的机会——利弗莫尔",
  "钱是坐着赚来的，不是操作来的——利弗莫尔",
  "最重要的决定是做什么，其次是不做什么——索罗斯",
  "错误会惩罚那些等待的人——邓肯",
  "不要把鸡蛋放在一个篮子里——华尔街格言",
  "承认错误是成功的开始——利弗莫尔",
  "只在胜算高的时候下注——海龟法则",
  "恐惧和贪婪是交易的天敌——华尔街格言",
  "控制情绪就是控制财富——巴菲特",
  "没有纪律的交易等于赌博——布伦达",
] as const;

export const MOCK_POSITIONS: readonly MockPosition[] = [
  { amount: 0.5, direction: "long", entry: 1850, pnl: 120, symbol: "ETH" },
  { amount: 100, direction: "long", entry: 12.8, pnl: -50, symbol: "HYPE" },
  { amount: 0.1, direction: "short", entry: 42500, pnl: 300, symbol: "BTC" },
];

export const MOCK_HISTORY: readonly HistoryOrder[] = [
  { close: 1920, direction: "long", entry: 1850, percent: "2%", pnl: 420, symbol: "ETH" },
  { close: 41500, direction: "short", entry: 42000, percent: "-1%", pnl: -250, symbol: "BTC" },
  { close: 13.8, direction: "long", entry: 12.5, percent: "3%", pnl: 650, symbol: "HYPE" },
];
