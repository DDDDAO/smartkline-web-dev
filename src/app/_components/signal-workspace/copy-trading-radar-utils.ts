import type {
  CopyTradingDirection,
  CopyTradingEvent,
  CopyTradingEventType,
  CopyTradingPosition,
  CopyTradingRiskLevel,
  EquityEtfSignalStatus,
} from "@/app/_types/copy-trading";

export const ALL_EVENT_FILTER = "全部事件";

export function groupPositionsByTrader(positions: readonly CopyTradingPosition[]): Map<string, CopyTradingPosition[]> {
  const map = new Map<string, CopyTradingPosition[]>();
  for (const position of positions) {
    const traderPositions = map.get(position.trader_id) ?? [];
    traderPositions.push(position);
    map.set(position.trader_id, traderPositions);
  }
  return map;
}

export function groupEventsByTrader(events: readonly CopyTradingEvent[]): Map<string, CopyTradingEvent[]> {
  const map = new Map<string, CopyTradingEvent[]>();
  for (const event of events) {
    const traderEvents = map.get(event.trader_id) ?? [];
    traderEvents.push(event);
    map.set(event.trader_id, traderEvents);
  }
  for (const traderEvents of map.values()) {
    traderEvents.sort((left, right) => Date.parse(right.occurred_at) - Date.parse(left.occurred_at));
  }
  return map;
}

export function getTraderCardClassName(isDarkTheme: boolean, isActive: boolean, riskLevel: CopyTradingRiskLevel): string {
  const baseClassName = "w-full cursor-pointer rounded-2xl border p-3 text-left shadow-sm transition";
  const activeClassName = isActive ? " ring-2 ring-cyan-400/65" : "";
  if (riskLevel === "high") {
    return isDarkTheme
      ? `${baseClassName} border-rose-900/70 bg-rose-950/24 hover:border-rose-700${activeClassName}`
      : `${baseClassName} border-rose-200 bg-rose-50/70 hover:border-rose-300${activeClassName}`;
  }

  return isDarkTheme
    ? `${baseClassName} border-slate-800 bg-slate-900 hover:border-slate-700${activeClassName}`
    : `${baseClassName} border-slate-100 bg-slate-50 hover:border-slate-200${activeClassName}`;
}

export function getPinnedButtonClassName(isDarkTheme: boolean, isPinned: boolean): string {
  if (isPinned) {
    return isDarkTheme ? "shrink-0 rounded-full bg-amber-500/15 px-2 py-1 text-sm font-black text-amber-300" : "shrink-0 rounded-full bg-amber-50 px-2 py-1 text-sm font-black text-amber-700";
  }

  return isDarkTheme ? "shrink-0 rounded-full bg-slate-800 px-2 py-1 text-sm font-black text-slate-500" : "shrink-0 rounded-full bg-white px-2 py-1 text-sm font-black text-slate-400";
}

export function getRiskBadgeClassName(isDarkTheme: boolean, riskLevel: CopyTradingRiskLevel): string {
  if (riskLevel === "high") {
    return isDarkTheme ? "rounded-full bg-rose-500/15 px-2 py-1 text-[10px] font-black text-rose-300" : "rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700";
  }

  if (riskLevel === "medium") {
    return isDarkTheme ? "rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-black text-amber-300" : "rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700";
  }

  return isDarkTheme ? "rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300" : "rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700";
}

export function getStatusBadgeClass(isDarkTheme: boolean, tone: "positive" | "warning"): string {
  if (tone === "positive") {
    return isDarkTheme ? "shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300" : "shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700";
  }

  return isDarkTheme ? "shrink-0 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-black text-amber-300" : "shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700";
}

export function getDirectionBadgeClassName(isDarkTheme: boolean, direction: CopyTradingDirection): string {
  if (direction === "long") {
    return isDarkTheme ? "rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300" : "rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700";
  }

  return isDarkTheme ? "rounded-full bg-rose-500/15 px-2 py-1 text-[10px] font-black text-rose-300" : "rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700";
}

export function getEventTypeChipClassName(isDarkTheme: boolean, eventType: CopyTradingEventType): string {
  if (["stop_loss", "oversized_position", "losing_streak", "reverse"].includes(eventType)) {
    return isDarkTheme ? "rounded-full bg-rose-500/15 px-2 py-1 text-[10px] font-black text-rose-300" : "rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700";
  }

  if (["open", "add", "take_profit"].includes(eventType)) {
    return isDarkTheme ? "rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300" : "rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700";
  }

  return isDarkTheme ? "rounded-full bg-cyan-500/15 px-2 py-1 text-[10px] font-black text-cyan-300" : "rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-black text-cyan-700";
}

export function getEventRowClassName(isDarkTheme: boolean, isActive: boolean, riskLevel: CopyTradingRiskLevel): string {
  const baseClassName = "w-full rounded-2xl border p-3 text-left shadow-sm transition";
  const activeClassName = isActive ? " ring-2 ring-cyan-400/65" : "";
  if (riskLevel === "high") {
    return isDarkTheme
      ? `${baseClassName} border-rose-900/70 bg-rose-950/24 hover:border-rose-700${activeClassName}`
      : `${baseClassName} border-rose-200 bg-rose-50/70 hover:border-rose-300${activeClassName}`;
  }

  return isDarkTheme
    ? `${baseClassName} border-slate-800 bg-slate-900 hover:border-slate-700${activeClassName}`
    : `${baseClassName} border-slate-100 bg-slate-50 hover:border-slate-200${activeClassName}`;
}

export function getPnlTextClassName(isDarkTheme: boolean, pnl: number): string {
  if (pnl >= 0) {
    return isDarkTheme ? "mt-1 text-xs font-black text-emerald-300" : "mt-1 text-xs font-black text-emerald-700";
  }

  return isDarkTheme ? "mt-1 text-xs font-black text-rose-300" : "mt-1 text-xs font-black text-rose-700";
}

export function getEquityStatusBadgeClassName(isDarkTheme: boolean, status: EquityEtfSignalStatus): string {
  if (status === "active") {
    return isDarkTheme ? "rounded-full bg-cyan-500/15 px-2 py-1 text-[10px] font-black text-cyan-300" : "rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-black text-cyan-700";
  }

  if (status === "cooldown" || status === "invalidated") {
    return isDarkTheme ? "rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-black text-amber-300" : "rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700";
  }

  return isDarkTheme ? "rounded-full bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-400" : "rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500";
}

export function formatRiskLevel(riskLevel: CopyTradingRiskLevel): string {
  if (riskLevel === "high") return "高风险";
  if (riskLevel === "medium") return "中风险";
  return "低风险";
}

export function formatEquityStatus(status: EquityEtfSignalStatus): string {
  if (status === "active") return "生效中";
  if (status === "cooldown") return "冷却";
  if (status === "invalidated") return "失效";
  return "观察中";
}

export function formatSourceStatus(status: string): string {
  if (status === "ACTIVE") return "活跃";
  if (status === "INACTIVE") return "未开放仓位";
  if (status === "INVALID") return "失效";
  return status || "未知";
}

export function formatCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const absValue = Math.abs(value);
  if (absValue >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (absValue >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function formatPrice(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: Math.abs(value) >= 1000 ? 1 : 4 });
}

export function formatQuantity(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: Math.abs(value) >= 100 ? 2 : 6 });
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatSignedPercent(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatPercent(Math.abs(value))}`;
}

export function formatDisplayTime(value: string): string {
  return value.replace("T", " ").slice(0, 16);
}
