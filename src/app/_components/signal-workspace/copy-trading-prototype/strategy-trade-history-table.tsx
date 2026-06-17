"use client";

import { getTradingFoxErrorMessage } from "@/app/_lib/tradingfox-errors";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { TelegramSessionUser } from "@/app/_lib/auth/telegram-auth";
import { SourceAvatar } from "../card-ui";
import { TelegramUserAvatar } from "./telegram-user-avatar";
import { formatDetailCurrency, formatDetailDate, formatDetailNumber, getSideClassName } from "./formatters";
import type { TradeHistoryRow } from "./strategy-detail-shared";

export function TradeHistoryTable({
  activeKlineRowId,
  copy,
  isDarkTheme,
  rows,
  strategyCopy,
  telegramUser,
  onRowKlineOpen,
}: {
  activeKlineRowId: string | null;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  rows: readonly TradeHistoryRow[];
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  telegramUser: TelegramSessionUser | null;
  onRowKlineOpen: (row: TradeHistoryRow) => void;
}) {
  return (
    <div className="kol-scroll-area mt-3 overflow-x-auto">
      <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
        <thead>
          <tr className={isDarkTheme ? "border-b border-white/[0.075] text-xs font-black text-slate-500" : "border-b border-[#DDE8F0] text-xs font-black text-slate-500"}>
            <th className="px-3 py-3">{strategyCopy.orderTime}</th>
            <th className="px-3 py-3">{strategyCopy.orderSource}</th>
            <th className="px-3 py-3">{strategyCopy.orderPair}</th>
            <th className="px-3 py-3">{strategyCopy.orderSide}</th>
            <th className="px-3 py-3">{strategyCopy.referencePrice}</th>
            <th className="px-3 py-3">{strategyCopy.orderQuantity}</th>
            <th className="px-3 py-3">{strategyCopy.notional}</th>
            <th className="px-3 py-3">{strategyCopy.tradeStatus}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const notional = row.price !== null && row.quantity !== null ? row.price * row.quantity : null;
            const isActiveKlineRow = row.id === activeKlineRowId;
            return (
              <tr key={row.id} className={getTradeHistoryRowClassName(isDarkTheme, row.kind, isActiveKlineRow)}>
                <td className="px-3 py-4 font-semibold">{formatDetailDate(row.timestamp)}</td>
                <td className="px-3 py-4">
                  <TradeHistorySourceCell isDarkTheme={isDarkTheme} row={row} strategyCopy={strategyCopy} telegramUser={telegramUser} />
                </td>
                <td className="px-3 py-4 font-black">
                  <button
                    className={isActiveKlineRow ? "rounded-full bg-sky-400/15 px-2 py-1 text-sky-400" : "rounded-full px-2 py-1 underline underline-offset-2 transition hover:bg-sky-400/10 hover:text-sky-400"}
                    type="button"
                    onClick={() => onRowKlineOpen(row)}
                  >
                    {row.symbol}
                  </button>
                </td>
                <td className={`px-3 py-4 font-black ${getTradeHistorySideClassName(isDarkTheme, row)}`}>{formatTradeHistoryAction(row, strategyCopy)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(row.price)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailNumber(row.quantity)}</td>
                <td className="px-3 py-4 font-semibold">{formatDetailCurrency(notional)}</td>
                <td className={getTradeHistoryStatusClassName(isDarkTheme, row)}>{formatTradeHistoryStatus(row, copy)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TradeHistorySourceCell({
  isDarkTheme,
  row,
  strategyCopy,
  telegramUser,
}: {
  isDarkTheme: boolean;
  row: TradeHistoryRow;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  telegramUser: TelegramSessionUser | null;
}) {
  if (row.kind === "me") {
    return (
      <div className="inline-flex items-center gap-2">
        {telegramUser ? (
          <TelegramUserAvatar isDarkTheme={isDarkTheme} size="table" user={telegramUser} />
        ) : (
          <span className={isDarkTheme ? "grid h-8 w-8 place-items-center rounded-full bg-sky-400/15 text-xs font-black text-sky-200" : "grid h-8 w-8 place-items-center rounded-full bg-[#EAF8FE] text-xs font-black text-[#008DCC]"}>
            {strategyCopy.orderSourceMe}
          </span>
        )}
        <div className="min-w-0">
          <div className="text-sm font-black">{strategyCopy.orderSourceMe}</div>
          <div className={isDarkTheme ? "mt-0.5 max-w-36 truncate text-[10px] font-semibold text-slate-500" : "mt-0.5 max-w-36 truncate text-[10px] font-semibold text-slate-400"}>{row.source.name}</div>
        </div>
      </div>
    );
  }

  const sourceDisplayName = row.source.name || row.source.id;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <SourceAvatar isDarkTheme={isDarkTheme} name={sourceDisplayName} url={row.source.avatarUrl} />
      <div className="min-w-0">
        <div className="max-w-44 truncate text-sm font-black">{sourceDisplayName}</div>
        {row.kind === "tradeLog" ? (
          <div className={isDarkTheme ? "mt-0.5 max-w-44 truncate text-[10px] font-semibold text-slate-500" : "mt-0.5 max-w-44 truncate text-[10px] font-semibold text-slate-400"}>
            {`${strategyCopy.tradeEventNoOrder} #${row.tradeLog?.id ?? "--"}`}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getTradeHistoryRowClassName(isDarkTheme: boolean, kind: TradeHistoryRow["kind"], isActive: boolean): string {
  if (kind === "tradeLog") {
    if (isActive) {
      return isDarkTheme
        ? "border-b border-rose-400/20 bg-rose-400/[0.08] shadow-[inset_3px_0_0_rgba(251,113,133,0.85)] last:border-0"
        : "border-b border-rose-200 bg-rose-50 shadow-[inset_3px_0_0_#f43f5e] last:border-0";
    }
    return isDarkTheme
      ? "border-b border-white/[0.06] bg-rose-400/[0.035] shadow-[inset_3px_0_0_rgba(251,113,133,0.6)] last:border-0"
      : "border-b border-[#F3D3DA] bg-rose-50/70 shadow-[inset_3px_0_0_#fb7185] last:border-0";
  }

  if (kind === "signalSource") {
    if (isActive) {
      return isDarkTheme
        ? "border-b border-sky-400/20 bg-sky-400/[0.08] shadow-[inset_3px_0_0_rgba(56,189,248,0.75)] last:border-0"
        : "border-b border-[#B7E8FC] bg-[#EAF8FE] shadow-[inset_3px_0_0_#00A6F4] last:border-0";
    }
    return isDarkTheme
      ? "border-b border-white/[0.06] bg-white/[0.025] shadow-[inset_3px_0_0_rgba(148,163,184,0.35)] last:border-0"
      : "border-b border-[#DDE8F0] bg-[#F8FAFC] shadow-[inset_3px_0_0_#CBD5E1] last:border-0";
  }

  if (isActive) {
    return isDarkTheme
      ? "border-b border-sky-400/20 bg-sky-400/[0.08] last:border-0"
      : "border-b border-[#B7E8FC] bg-[#EAF8FE] last:border-0";
  }
  return isDarkTheme ? "border-b border-white/[0.06] last:border-0" : "border-b border-[#DDE8F0] last:border-0";
}

export function RowsPaginationControls({
  canGoNext,
  canGoPrevious,
  isDarkTheme,
  nextLabel,
  previousLabel,
  rangeLabel,
  onNext,
  onPrevious,
}: {
  canGoNext: boolean;
  canGoPrevious: boolean;
  isDarkTheme: boolean;
  nextLabel: string;
  previousLabel: string;
  rangeLabel: string;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const buttonClassName = isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-[11px] font-bold text-sky-200 transition hover:border-sky-400/25 hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:opacity-45"
    : "rounded-2xl border border-[#B7E8FC] bg-white px-3 py-2 text-[11px] font-bold text-[#008DCC] transition hover:bg-[#EAF8FE] disabled:cursor-not-allowed disabled:opacity-45";
  const rangeClassName = isDarkTheme
    ? "text-center text-[10px] font-semibold text-slate-500"
    : "text-center text-[10px] font-semibold text-slate-400";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <button className={buttonClassName} disabled={!canGoPrevious} type="button" onClick={onPrevious}>
        {previousLabel}
      </button>
      <span className={rangeClassName}>{rangeLabel}</span>
      <button className={buttonClassName} disabled={!canGoNext} type="button" onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  );
}

function formatOrderSide(value: string | undefined, strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"]): string {
  const normalizedValue = (value ?? "").toLowerCase();
  if (normalizedValue.includes("buy")) {
    return strategyCopy.orderOpenLong;
  }
  if (normalizedValue.includes("sell")) {
    return strategyCopy.orderOpenShort;
  }
  return value || "--";
}

function formatTradeHistoryAction(row: TradeHistoryRow, strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"]): string {
  if (row.kind === "me") {
    return formatOrderSide(row.action, strategyCopy);
  }
  if (row.kind === "tradeLog") {
    return row.side ? formatOrderSide(row.side, strategyCopy) : strategyCopy.tradeEventNoOrder;
  }

  const normalizedAction = (row.action ?? "").toLowerCase();
  const normalizedSide = row.side?.toLowerCase() ?? "";
  const isShort = normalizedSide.includes("short") || normalizedSide.includes("sell") || normalizedAction.includes("short");
  if (normalizedAction.includes("close")) {
    return isShort ? strategyCopy.orderCloseShort : strategyCopy.orderCloseLong;
  }
  if (normalizedAction.includes("reduce")) {
    return isShort ? strategyCopy.orderReduceShort : strategyCopy.orderReduceLong;
  }
  if (normalizedAction.includes("add") || normalizedAction.includes("increase")) {
    return isShort ? strategyCopy.orderAddShort : strategyCopy.orderAddLong;
  }
  if (normalizedAction.includes("open")) {
    return isShort ? strategyCopy.orderOpenShort : strategyCopy.orderOpenLong;
  }
  if (normalizedSide.includes("short") || normalizedSide.includes("sell")) {
    return strategyCopy.orderOpenShort;
  }
  if (normalizedSide.includes("long") || normalizedSide.includes("buy")) {
    return strategyCopy.orderOpenLong;
  }
  return row.action || row.signalSourceOrder?.side || "--";
}

function getTradeHistorySideClassName(isDarkTheme: boolean, row: TradeHistoryRow): string {
  if (row.kind === "tradeLog" && !row.side) {
    return isDarkTheme ? "text-rose-300" : "text-rose-600";
  }
  return getSideClassName(isDarkTheme, row.side || row.action);
}

function formatTradeHistoryStatus(row: TradeHistoryRow, copy: WorkspaceCopy): string {
  const strategyCopy = copy.workspace.accountCenter.strategy;
  if (row.kind === "me") {
    return formatOrderStatus(row.status, strategyCopy);
  }
  if (row.kind === "tradeLog") {
    return row.status ? getTradingFoxErrorMessage(row.status, copy) : strategyCopy.tradeEventNoOrder;
  }
  return "--";
}

function getTradeHistoryStatusClassName(isDarkTheme: boolean, row: TradeHistoryRow): string {
  if (row.kind === "me") {
    return isDarkTheme ? "px-3 py-4 font-black text-emerald-300" : "px-3 py-4 font-black text-emerald-600";
  }
  if (row.kind === "tradeLog") {
    return isDarkTheme ? "px-3 py-4 font-black text-rose-300" : "px-3 py-4 font-black text-rose-600";
  }
  return isDarkTheme ? "px-3 py-4 font-semibold text-slate-500" : "px-3 py-4 font-semibold text-slate-400";
}

function formatOrderStatus(value: string | undefined, strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"]): string {
  const normalizedValue = (value ?? "").toLowerCase();
  if (normalizedValue === "closed" || normalizedValue === "filled") {
    return strategyCopy.orderStatusCompleted;
  }
  return value || "--";
}
