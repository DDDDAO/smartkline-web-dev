import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { StructuredSignal } from "@/app/_types/signal";

export function PaperPositionSummary({
  error,
  isActive = false,
  isDarkTheme,
  record,
}: {
  error: string | null;
  isActive?: boolean;
  isDarkTheme: boolean;
  record: PaperPositionRecord | null;
}) {
  const containerClassName = isDarkTheme
    ? isActive
      ? "mt-3 rounded-2xl bg-slate-700/20 p-3"
      : "mt-3 rounded-2xl bg-white/[0.035] p-3"
    : isActive
      ? "mt-3 rounded-2xl bg-[#F1F5FA] p-3"
      : "mt-3 rounded-2xl bg-[#F3F6FA] p-3";
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
        {record.status === "exited" ? (
          <PaperPositionExitResult record={record} isDarkTheme={isDarkTheme} />
        ) : null}
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
  const fieldClassName = isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.045] px-2 py-2" : "rounded-2xl border border-[#E5EAF0] bg-white px-2 py-2";
  const labelClassName = isDarkTheme ? "text-[11px] text-slate-500" : "text-[11px] text-slate-400";
  const valueClassName = getPaperPositionFieldValueClass(isDarkTheme, field.tone);

  return (
    <div className={fieldClassName}>
      <div className={labelClassName}>{field.label}</div>
      <div className={valueClassName}>{field.value}</div>
    </div>
  );
}

function PaperPositionExitResult({ record, isDarkTheme }: { record: PaperPositionRecord; isDarkTheme: boolean }) {
  const isStopLoss = record.exitReason === "stop-loss";
  const containerClassName = isDarkTheme
    ? "col-span-2 rounded-2xl border border-white/[0.075] bg-white/[0.045] px-3 py-3"
    : "col-span-2 rounded-2xl border border-[#E5EAF0] bg-white px-3 py-3";
  const resultClassName = isStopLoss
    ? isDarkTheme ? "text-lg font-black leading-tight text-[#FF7586]" : "text-lg font-black leading-tight text-[#D9515F]"
    : isDarkTheme ? "text-lg font-black leading-tight text-[#45DCA6]" : "text-lg font-black leading-tight text-[#159B72]";
  const timeClassName = isDarkTheme ? "mt-1 text-[11px] leading-4 text-slate-500" : "mt-1 text-[11px] leading-4 text-slate-400";

  return (
    <div className={containerClassName}>
      <div className={resultClassName}>
        {formatExitReason(record.exitReason)} {formatSignedPercent(record.pnlPercent)}
      </div>
      <div className={timeClassName}>
        离场时间 {formatPaperTime(record.exitTimeMs)}
      </div>
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
  ];
}

function getPaperPositionFieldValueClass(isDarkTheme: boolean, tone: PaperPositionFieldModel["tone"] = "default"): string {
  if (tone === "positive") {
    return isDarkTheme ? "mt-1 truncate text-xs font-semibold text-[#45DCA6]" : "mt-1 truncate text-xs font-semibold text-[#159B72]";
  }

  if (tone === "negative") {
    return isDarkTheme ? "mt-1 truncate text-xs font-semibold text-[#FF7586]" : "mt-1 truncate text-xs font-semibold text-[#D9515F]";
  }

  return isDarkTheme ? "mt-1 truncate text-xs text-slate-200" : "mt-1 truncate text-xs text-slate-800";
}

export function getPaperPositionBadgeClass(
  isDarkTheme: boolean,
  status: PaperPositionRecord["status"],
  pnlPercent: number | null = null,
  exitReason: PaperPositionRecord["exitReason"] = null,
): string {
  const baseClassName = `kol-signal-pill kol-status-badge${isDarkTheme ? " kol-signal-pill-dark" : ""}`;
  void pnlPercent;

  if (status === "entered") {
    return `${baseClassName} kol-status-live`;
  }

  if (status === "exited") {
    const isStopLoss = exitReason === "stop-loss";
    return `${baseClassName} ${isStopLoss ? "kol-status-risk" : "kol-status-target"}`;
  }

  if (status === "not-entered") {
    return `${baseClassName} kol-status-pending`;
  }

  return `${baseClassName} kol-status-muted`;
}

export function getSignalDirectionBadgeClass(isDarkTheme: boolean, direction: StructuredSignal["direction"]): string {
  const baseClassName = `kol-signal-pill kol-direction-badge${isDarkTheme ? " kol-signal-pill-dark" : ""}`;

  if (direction === "long") {
    return `${baseClassName} kol-direction-long`;
  }

  return `${baseClassName} kol-direction-short`;
}

export function getSignalPaperPositionBadgeClass(isDarkTheme: boolean, record: PaperPositionRecord | null): string {
  return getPaperPositionBadgeClass(isDarkTheme, record?.status ?? "invalid", record?.pnlPercent ?? null, record?.exitReason ?? null);
}

export function formatSignalPaperPositionStatus(record: PaperPositionRecord | null, error: string | null): string {
  if (!record) {
    return error ? "行情异常" : "加载中";
  }

  if (record.status === "invalid") {
    return "已失效";
  }

  return formatPaperPositionStatus(record);
}

function formatPaperPositionStatus(record: PaperPositionRecord): string {
  if (record.status === "not-entered") {
    return "未入场";
  }

  if (record.status === "entered") {
    return "持仓中";
  }

  return record.exitReason === "stop-loss" ? "已止损" : "已止盈";
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

  const date = new Date(value + 8 * 60 * 60 * 1_000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function getPnlTone(value: number | null): "negative" | "positive" | "default" {
  if (value === null || value === 0) {
    return "default";
  }

  return value > 0 ? "positive" : "negative";
}
