import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { StructuredSignal } from "@/app/_types/signal";

export function PaperPositionSummary({
  error,
  isDarkTheme,
  record,
}: {
  error: string | null;
  isDarkTheme: boolean;
  record: PaperPositionRecord | null;
}) {
  const containerClassName = isDarkTheme ? "mt-3 rounded-2xl border border-slate-800 bg-slate-900 p-3" : "mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3";
  const titleClassName = isDarkTheme ? "text-xs font-semibold text-slate-200" : "text-xs font-semibold text-slate-700";
  const mutedClassName = isDarkTheme ? "text-xs text-slate-500" : "text-xs text-slate-400";

  if (!record) {
    return (
      <div className={containerClassName}>
        <div className="flex items-center gap-2">
          <span className={titleClassName}>模拟仓位</span>
        </div>
        <div className={isDarkTheme ? "mt-2 text-xs text-slate-400" : "mt-2 text-xs text-slate-500"}>
          {error ?? "正在加载 1m 行情记录"}
        </div>
      </div>
    );
  }

  if (record.status === "invalid") {
    return (
      <div className={containerClassName}>
        <div className="flex items-center gap-2">
          <span className={titleClassName}>模拟仓位</span>
        </div>
        <div className={isDarkTheme ? "mt-2 text-xs text-slate-400" : "mt-2 text-xs text-slate-500"}>
          {record.dataIssue ?? error ?? "模拟仓位数据不完整"}
        </div>
      </div>
    );
  }

  const fields = createPaperPositionFields(record);

  return (
    <div className={containerClassName}>
      <div className="flex items-center gap-2">
        <span className={titleClassName}>模拟仓位</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {fields.map((field) => (
          <PaperPositionField key={field.label} field={field} isDarkTheme={isDarkTheme} />
        ))}
      </div>
      {error ? (
        <div className={`${mutedClassName} mt-2`}>实时行情连接异常，当前展示最后一根 1m K 线记录</div>
      ) : null}
    </div>
  );
}

type PaperPositionFieldModel = {
  label: string;
  tone?: "default" | "negative" | "positive";
  value: string;
};

function PaperPositionField({ field, isDarkTheme }: { field: PaperPositionFieldModel; isDarkTheme: boolean }) {
  const fieldClassName = isDarkTheme ? "rounded-xl bg-slate-950 px-2 py-2" : "rounded-xl bg-white px-2 py-2";
  const labelClassName = isDarkTheme ? "text-[11px] text-slate-500" : "text-[11px] text-slate-400";
  const valueClassName = getPaperPositionFieldValueClass(isDarkTheme, field.tone);

  return (
    <div className={fieldClassName}>
      <div className={labelClassName}>{field.label}</div>
      <div className={valueClassName}>{field.value}</div>
    </div>
  );
}

function createPaperPositionFields(record: PaperPositionRecord): PaperPositionFieldModel[] {
  if (record.status === "not-entered") {
    return [
      { label: "喊单价", value: formatPaperPrice(record.signalSnapshotPrice) },
      { label: "当前价", value: formatPaperPrice(record.currentPrice) },
      { label: "距入场", value: formatDistanceToEntry(record) },
    ];
  }

  if (record.status === "entered") {
    return [
      { label: "入场价", value: formatPaperPrice(record.entryPrice) },
      { label: "当前价", value: formatPaperPrice(record.currentPrice) },
      { label: "浮动盈亏", tone: getPnlTone(record.pnlPercent), value: formatSignedPercent(record.pnlPercent) },
    ];
  }

  return [
    { label: "入场价", value: formatPaperPrice(record.entryPrice) },
    { label: "离场价", value: formatPaperPrice(record.exitPrice) },
    { label: "最终盈亏", tone: getPnlTone(record.pnlPercent), value: formatSignedPercent(record.pnlPercent) },
    { label: "离场原因", tone: record.exitReason === "take-profit" ? "positive" : "negative", value: formatExitReason(record.exitReason) },
    { label: "离场时间", value: formatPaperTime(record.exitTimeMs) },
  ];
}

function getPaperPositionFieldValueClass(isDarkTheme: boolean, tone: PaperPositionFieldModel["tone"] = "default"): string {
  if (tone === "positive") {
    return "mt-1 truncate text-xs font-semibold text-emerald-500";
  }

  if (tone === "negative") {
    return "mt-1 truncate text-xs font-semibold text-rose-500";
  }

  return isDarkTheme ? "mt-1 truncate text-xs text-slate-200" : "mt-1 truncate text-xs text-slate-800";
}

export function getPaperPositionBadgeClass(
  isDarkTheme: boolean,
  status: PaperPositionRecord["status"],
  pnlPercent: number | null = null,
  exitReason: PaperPositionRecord["exitReason"] = null,
): string {
  const baseClassName = "rounded-full border px-2 py-1 text-[11px] font-semibold";

  if (status === "entered") {
    const isNegative = getPnlTone(pnlPercent) === "negative";
    if (isDarkTheme) {
      return `${baseClassName} ${isNegative ? "border-rose-800/70 bg-rose-950/70 text-rose-300" : "border-emerald-800/70 bg-emerald-950/70 text-emerald-300"}`;
    }

    return `${baseClassName} ${isNegative ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`;
  }

  if (status === "exited") {
    const isStopLoss = exitReason === "stop-loss";
    if (isDarkTheme) {
      return `${baseClassName} ${isStopLoss ? "border-rose-800/60 bg-rose-950/45 text-rose-300" : "border-emerald-800/60 bg-emerald-950/45 text-emerald-300"}`;
    }

    return `${baseClassName} ${isStopLoss ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`;
  }

  if (status === "not-entered") {
    return isDarkTheme
      ? `${baseClassName} border-amber-800/70 bg-amber-950/65 text-amber-300`
      : `${baseClassName} border-amber-100 bg-amber-50 text-amber-700`;
  }

  return isDarkTheme ? `${baseClassName} border-slate-700 bg-slate-800 text-slate-300` : `${baseClassName} border-slate-200 bg-slate-100 text-slate-600`;
}

export function getSignalDirectionBadgeClass(isDarkTheme: boolean, direction: StructuredSignal["direction"]): string {
  const baseClassName = "rounded-full border px-2 py-1 text-[11px] font-semibold";

  if (direction === "long") {
    return isDarkTheme
      ? `${baseClassName} border-emerald-800/70 bg-emerald-950/65 text-emerald-300`
      : `${baseClassName} border-emerald-100 bg-emerald-50 text-emerald-700`;
  }

  return isDarkTheme
    ? `${baseClassName} border-rose-800/70 bg-rose-950/65 text-rose-300`
    : `${baseClassName} border-rose-100 bg-rose-50 text-rose-700`;
}

export function getSignalPaperPositionBadgeClass(isDarkTheme: boolean, record: PaperPositionRecord | null): string {
  return getPaperPositionBadgeClass(isDarkTheme, record?.status ?? "invalid", record?.pnlPercent ?? null, record?.exitReason ?? null);
}

export function formatSignalPaperPositionStatus(record: PaperPositionRecord | null, error: string | null): string {
  if (!record) {
    return error ? "行情异常" : "加载中";
  }

  if (record.status === "invalid") {
    return "无法计算";
  }

  return formatPaperPositionStatus(record);
}

function formatPaperPositionStatus(record: PaperPositionRecord): string {
  if (record.status === "not-entered") {
    return "未入场";
  }

  if (record.status === "entered") {
    return "已入场";
  }

  return record.exitReason === "stop-loss" ? "已离场 · 止损" : "已离场 · 止盈";
}

function formatPaperPrice(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: value >= 1_000 ? 1 : 4 });
}

function formatDistanceToEntry(record: PaperPositionRecord): string {
  if (record.distanceToEntryPrice === null || record.distanceToEntryPercent === null) {
    return "--";
  }

  return `${formatPaperPrice(record.distanceToEntryPrice)} / ${record.distanceToEntryPercent.toFixed(2)}%`;
}

function formatSignedPercent(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatExitReason(reason: PaperPositionRecord["exitReason"]): string {
  if (reason === "take-profit") {
    return "止盈";
  }

  if (reason === "stop-loss") {
    return "止损";
  }

  return "--";
}

function formatPaperTime(value: number | null): string {
  if (value === null) {
    return "--";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = padTimePart(date.getMonth() + 1);
  const day = padTimePart(date.getDate());
  const hours = padTimePart(date.getHours());
  const minutes = padTimePart(date.getMinutes());

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function getPnlTone(value: number | null): "negative" | "positive" {
  return value !== null && value < 0 ? "negative" : "positive";
}

function padTimePart(value: number): string {
  return String(value).padStart(2, "0");
}
