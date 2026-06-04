import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { StructuredSignal } from "@/app/_types/signal";

export type ChartPaperPositionField = {
  label: string;
  tone?: "default" | "negative" | "positive";
  value: string;
};

export function createChartPaperPositionFields(record: PaperPositionRecord): ChartPaperPositionField[] {
  if (record.status === "not-entered") {
    return [
      { label: "距入场", value: formatChartDistanceToEntry(record) },
      { label: "当前价", value: formatChartPaperPrice(record.currentPrice) },
      { label: "喊单价", value: formatChartPaperPrice(record.signalSnapshotPrice) },
    ];
  }

  if (record.status === "entered") {
    return [
      { label: "浮动盈亏", tone: getChartPnlTone(record.pnlPercent), value: formatChartSignedPercent(record.pnlPercent) },
      { label: "入场价", value: formatChartPaperPrice(record.entryPrice) },
      { label: "当前价", value: formatChartPaperPrice(record.currentPrice) },
    ];
  }

  return [
    { label: "最终盈亏", tone: getChartPnlTone(record.pnlPercent), value: formatChartSignedPercent(record.pnlPercent) },
    { label: "入场价", value: formatChartPaperPrice(record.entryPrice) },
    { label: "离场价", value: formatChartPaperPrice(record.exitPrice) },
  ];
}

export function getChartPaperPositionBadgeClass(isDarkTheme: boolean, record: PaperPositionRecord | null): string {
  const baseClassName = "shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold";

  if (record?.status === "entered") {
    const isNegative = getChartPnlTone(record.pnlPercent) === "negative";
    if (isDarkTheme) {
      return `${baseClassName} ${isNegative ? "border-rose-800/70 bg-rose-950/70 text-rose-300" : "border-emerald-800/70 bg-emerald-950/70 text-emerald-300"}`;
    }

    return `${baseClassName} ${isNegative ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`;
  }

  if (record?.status === "exited") {
    const isStopLoss = record.exitReason === "stop-loss";
    if (isDarkTheme) {
      return `${baseClassName} ${isStopLoss ? "border-rose-800/60 bg-rose-950/45 text-rose-300" : "border-emerald-800/60 bg-emerald-950/45 text-emerald-300"}`;
    }

    return `${baseClassName} ${isStopLoss ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`;
  }

  if (record?.status === "not-entered") {
    return isDarkTheme
      ? `${baseClassName} border-amber-800/70 bg-amber-950/65 text-amber-300`
      : `${baseClassName} border-amber-100 bg-amber-50 text-amber-700`;
  }

  return isDarkTheme ? `${baseClassName} border-slate-700 bg-slate-800 text-slate-300` : `${baseClassName} border-slate-200 bg-slate-100 text-slate-600`;
}

export function getChartDirectionBadgeClass(isDarkTheme: boolean, direction: StructuredSignal["direction"]): string {
  const baseClassName = "rounded-full border px-1.5 py-0.5 text-[11px] font-semibold";

  if (direction === "long") {
    return isDarkTheme
      ? `${baseClassName} border-emerald-800/70 bg-emerald-950/65 text-emerald-300`
      : `${baseClassName} border-emerald-100 bg-emerald-50 text-emerald-700`;
  }

  return isDarkTheme
    ? `${baseClassName} border-rose-800/70 bg-rose-950/65 text-rose-300`
    : `${baseClassName} border-rose-100 bg-rose-50 text-rose-700`;
}

export function formatChartPaperPositionStatus(record: PaperPositionRecord | null): string {
  if (!record) {
    return "计算中";
  }

  if (record.status === "not-entered") {
    return "未入场";
  }

  if (record.status === "entered") {
    return "已入场";
  }

  if (record.status === "exited") {
    return record.exitReason === "stop-loss" ? "已离场 · 止损" : "已离场 · 止盈";
  }

  return "无法计算";
}

export function getChartPaperPositionValueClass(isDarkTheme: boolean, tone: ChartPaperPositionField["tone"] = "default"): string {
  if (tone === "positive") {
    return "mt-1 truncate text-xs font-bold text-emerald-500";
  }

  if (tone === "negative") {
    return "mt-1 truncate text-xs font-bold text-rose-500";
  }

  return isDarkTheme ? "mt-1 truncate text-xs font-semibold text-slate-200" : "mt-1 truncate text-xs font-semibold text-slate-800";
}

function getChartPnlTone(value: number | null): "default" | "negative" | "positive" {
  if (value === null || value === 0) {
    return "default";
  }

  return value > 0 ? "positive" : "negative";
}

function formatChartPaperPrice(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: value >= 1_000 ? 1 : 4 });
}

function formatChartDistanceToEntry(record: PaperPositionRecord): string {
  if (record.distanceToEntryPrice === null || record.distanceToEntryPercent === null) {
    return "--";
  }

  return `${formatChartPaperPrice(record.distanceToEntryPrice)} / ${record.distanceToEntryPercent.toFixed(2)}%`;
}

function formatChartSignedPercent(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

