import type { MarketSymbol } from "./market";

export type SignalDirection = "long" | "short";
export type SignalLevel = "S" | "A" | "B";
export type SignalStatus = "观察中" | "模拟运行中" | "建议止盈" | "已平仓" | "已失效";
export type SignalFilter = "全部" | "强提醒" | "模拟中" | "复盘";

export type StructuredSignal = {
  id: string;
  source_name: string;
  source_avatar_url: string | null;
  source_level: SignalLevel;
  source_type: string;
  symbol: MarketSymbol;
  direction: SignalDirection;
  entry_type: "range" | "trigger";
  entry_min: number | null;
  entry_max: number | null;
  trigger_price: number | null;
  confirmation: string | null;
  stop_loss: number | null;
  take_profit: number[];
  status: SignalStatus;
  risk_tags: string[];
  raw_text: string;
  summary: string;
  created_at: string;
  isStrongAlert: boolean;
  isReview: boolean;
  pnl?: number;
};


export type KolSourceRule = {
  name: string;
  level: SignalLevel;
  type: string;
  value: string;
};
