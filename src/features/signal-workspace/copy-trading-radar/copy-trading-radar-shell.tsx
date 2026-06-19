import { Button } from "@/components/ui/button";
import type { KolSignalSourceStatus } from "../types";

export function RadarMetric({ isDarkTheme, label, value }: { isDarkTheme: boolean; label: string; value: string }) {
  return (
    <div className={isDarkTheme ? "rounded-2xl border border-slate-800 bg-slate-950 p-2" : "rounded-2xl border border-slate-200 bg-slate-50 p-2"}>
      <div className={isDarkTheme ? "text-[10px] font-semibold text-slate-500" : "text-[10px] font-semibold text-slate-400"}>{label}</div>
      <div className={isDarkTheme ? "mt-1 text-sm font-black text-slate-100" : "mt-1 text-sm font-black text-slate-950"}>{value}</div>
    </div>
  );
}

export function RadarSectionButton({ isActive, isDarkTheme, label, onClick }: { isActive: boolean; isDarkTheme: boolean; label: string; onClick: () => void }) {
  const className = isActive
    ? "rounded-lg bg-cyan-500 px-3 py-2 text-xs font-black text-white shadow-sm"
    : isDarkTheme
      ? "rounded-lg px-3 py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
      : "rounded-lg px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-slate-950";

  return <Button className={className} type="button" variant="ghost" onClick={onClick}>{label}</Button>;
}

export function CopyTradingSourceNotice({ isDarkTheme, sourceStatus }: { isDarkTheme: boolean; sourceStatus: KolSignalSourceStatus }) {
  if (sourceStatus.isLoading) {
    return (
      <div className={isDarkTheme ? "rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400" : "rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-500"}>
        正在同步 Signal Center 带单员、仓位和交易事件…
      </div>
    );
  }

  if (!sourceStatus.error) {
    return null;
  }

  return (
    <div className={isDarkTheme ? "rounded-2xl border border-amber-800/70 bg-amber-950/30 p-3 text-xs leading-5 text-amber-200" : "rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-700"}>
      Signal Center 暂未返回可展示数据，当前使用带单雷达 Demo 样例。错误：{sourceStatus.error}
    </div>
  );
}

export function EmptyState({ isDarkTheme, label }: { isDarkTheme: boolean; label: string }) {
  return (
    <div className={isDarkTheme ? "rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-500" : "rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500"}>
      {label}
    </div>
  );
}
