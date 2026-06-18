import type { WorkspaceCopy } from "@/i18n/workspace";
import type { MarketSymbol } from "@/app/_types/market";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { StructuredSignal } from "@/app/_types/signal";

export function getSignalCardClassName({
  isActive,
  isDarkTheme,
  paperPositionRecord,
}: {
  isActive: boolean;
  isDarkTheme: boolean;
  paperPositionRecord: PaperPositionRecord | null;
}): string {
  const baseClassName =
    "relative w-full cursor-pointer overflow-hidden rounded-[18px] border p-3.5 text-left transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5";
  const themeSurfaceClassName = isDarkTheme
    ? "signal-card-surface-dark"
    : "signal-card-surface-light";
  const statusVisualClassName = getSignalCardStatusVisualClassName({
    isActive,
    paperPositionRecord,
  });

  if (isActive) {
    const activeClassName = isDarkTheme
      ? "border-white/[0.12] bg-white/[0.055] shadow-[0_5px_14px_rgba(0,0,0,0.14)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.18)]"
      : "border-[#D8E0E8] bg-white shadow-[0_4px_12px_rgba(15,23,42,0.05)] hover:shadow-[0_5px_14px_rgba(15,23,42,0.07)]";
    return `${baseClassName} ${themeSurfaceClassName} ${activeClassName} ${statusVisualClassName}`;
  }

  const defaultClassName = isDarkTheme
    ? "border-white/[0.075] bg-white/[0.035] hover:border-white/[0.12] hover:shadow-[0_5px_14px_rgba(0,0,0,0.18)]"
    : "border-[#E5EAF0] bg-white hover:border-[#D8E0E8] hover:shadow-[0_5px_14px_rgba(15,23,42,0.07)]";
  return `${baseClassName} ${themeSurfaceClassName} ${defaultClassName} ${statusVisualClassName}`;
}

export function getSignalCardStatusVisualClassName({
  isActive,
  paperPositionRecord,
}: {
  isActive: boolean;
  paperPositionRecord: PaperPositionRecord | null;
}): string {
  const activeClassName = isActive ? " signal-card-left-active" : "";

  if (!paperPositionRecord) {
    return `signal-card-left-status signal-card-left-loading${activeClassName}`;
  }

  if (paperPositionRecord.status === "entered") {
    return `signal-card-left-status signal-card-left-live${activeClassName}`;
  }

  if (paperPositionRecord.status === "not-entered") {
    return `signal-card-left-status signal-card-left-pending${activeClassName}`;
  }

  if (paperPositionRecord.status !== "exited") {
    return `signal-card-left-status signal-card-left-muted${activeClassName}`;
  }

  if (paperPositionRecord.exitReason === "stop-loss") {
    return `signal-card-left-status signal-card-left-risk${activeClassName}`;
  }

  if (paperPositionRecord.exitReason === "take-profit") {
    return `signal-card-left-status signal-card-left-target${activeClassName}`;
  }

  return `signal-card-left-status signal-card-left-muted${activeClassName}`;
}

export function getSignalCardBackClassName(isDarkTheme: boolean): string {
  const baseClassName = "w-full rounded-[18px] border p-3.5";
  return isDarkTheme
    ? `${baseClassName} border-white/[0.075] bg-[#181A20]`
    : `${baseClassName} border-[#E5EAF0] bg-white`;
}

export function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="h-3 w-3" fill="none" viewBox="0 0 24 24">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

export function formatSymbolFilterLabel(symbol: MarketSymbol): string {
  return formatSymbolLabel(symbol);
}

export function formatSignalDisplayTime(signal: StructuredSignal): string {
  return signal.created_at.replace("T", " ").slice(0, 16);
}

export function formatKolEntryText(signal: StructuredSignal, copy: WorkspaceCopy): string {
  if (signal.entry_min !== null && signal.entry_max !== null) {
    return `${signal.entry_min.toLocaleString("en-US")}-${signal.entry_max.toLocaleString("en-US")}`;
  }

  if (signal.trigger_price !== null) {
    return signal.trigger_price.toLocaleString("en-US");
  }

  return copy.kol.marketPrice;
}

export function formatTakeProfitText(takeProfits: readonly number[], copy: WorkspaceCopy): string {
  return takeProfits.length > 0
    ? takeProfits
        .map(
          (price, index) =>
            `${copy.kol.takeProfitLevel(index + 1)}: ${price.toLocaleString("en-US")}`,
        )
        .join(" / ")
    : "--";
}

export function formatSymbolLabel(symbol: string): string {
  return symbol.replace("/USDT:USDT", "");
}
