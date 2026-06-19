"use client";

import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTradingFoxErrorMessage } from "@/lib/tradingfox-errors";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TelegramSessionUser } from "@/lib/auth/telegram-auth";
import type { KlineInterval } from "@/types/market";
import { RowsPaginationControls, TradeHistoryKlinePanel, TradeHistoryTable, type TradeHistoryRow } from "./strategy-detail-content";
import { getInlineErrorClassName } from "./styles";
import type { PrototypeStrategy } from "./types";

export function StrategyTradeHistorySection({
  allTradeHistoryRows,
  canGoNext,
  canGoPrevious,
  copy,
  error,
  interval,
  isDarkTheme,
  isKlineOpen,
  rangeLabel,
  rows,
  sectionRef,
  selectedRow,
  strategy,
  strategyCopy,
  telegramUser,
  isLoaded,
  onIntervalChange,
  onNextPage,
  onPreviousPage,
  onRowKlineOpen,
  onToggleKline,
}: {
  allTradeHistoryRows: readonly TradeHistoryRow[];
  canGoNext: boolean;
  canGoPrevious: boolean;
  copy: WorkspaceCopy;
  error?: string;
  interval: KlineInterval;
  isDarkTheme: boolean;
  isKlineOpen: boolean;
  isLoaded: boolean;
  rangeLabel: string;
  rows: readonly TradeHistoryRow[];
  sectionRef: RefObject<HTMLElement | null>;
  selectedRow: TradeHistoryRow | null;
  strategy: PrototypeStrategy;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  telegramUser: TelegramSessionUser | null;
  onIntervalChange: (interval: KlineInterval) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onRowKlineOpen: (row: TradeHistoryRow) => void;
  onToggleKline: () => void;
}) {
  const shouldShowPagination = canGoPrevious || canGoNext;

  return (
    <section ref={sectionRef}>
      <Card className={isDarkTheme ? "gap-0 rounded-[24px] border-white/[0.075] bg-white/[0.035] p-4 text-slate-100 shadow-none" : "gap-0 rounded-[24px] border-[#E8E8EC] bg-white p-4 text-slate-950 shadow-sm"}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black">{strategyCopy.tradeHistory}</h3>
            <div className={isDarkTheme ? "mt-1 text-[11px] font-bold text-slate-500" : "mt-1 text-[11px] font-bold text-slate-400"}>
              {isLoaded ? rangeLabel : strategyCopy.loadingDetail}
            </div>
          </div>
          <Button
            className={getSoftButtonClassName(isDarkTheme)}
            disabled={!isLoaded || !selectedRow}
            size="sm"
            type="button"
            variant="outline"
            onClick={onToggleKline}
          >
            {isKlineOpen ? strategyCopy.hideKline : strategyCopy.viewKline}
          </Button>
        </div>
        {error ? <p className={getInlineErrorClassName(isDarkTheme)}>{getTradingFoxErrorMessage(error, copy)}</p> : null}
        {isKlineOpen && selectedRow ? (
          <TradeHistoryKlinePanel
            copy={copy}
            interval={interval}
            isDarkTheme={isDarkTheme}
            row={selectedRow}
            rows={allTradeHistoryRows}
            strategy={strategy}
            telegramUser={telegramUser}
            onIntervalChange={onIntervalChange}
          />
        ) : null}
        {!isLoaded ? (
          <div className={isDarkTheme ? "mt-3 text-sm text-slate-500" : "mt-3 text-sm text-slate-500"}>{strategyCopy.loadingDetail}</div>
        ) : rows.length > 0 ? (
          <>
            <TradeHistoryTable
              activeKlineRowId={selectedRow?.id ?? null}
              copy={copy}
              isDarkTheme={isDarkTheme}
              rows={rows}
              strategyCopy={strategyCopy}
              telegramUser={telegramUser}
              onRowKlineOpen={onRowKlineOpen}
            />
            {shouldShowPagination ? (
              <div className="mt-3">
                <RowsPaginationControls
                  canGoNext={canGoNext}
                  canGoPrevious={canGoPrevious}
                  isDarkTheme={isDarkTheme}
                  nextLabel={strategyCopy.nextTradeHistoryPage}
                  previousLabel={strategyCopy.previousTradeHistoryPage}
                  rangeLabel={rangeLabel}
                  onNext={onNextPage}
                  onPrevious={onPreviousPage}
                />
              </div>
            ) : null}
          </>
        ) : isLoaded ? <div className={isDarkTheme ? "mt-3 text-sm text-slate-500" : "mt-3 text-sm text-slate-500"}>{strategyCopy.noTradeHistory}</div> : null}
      </Card>
    </section>
  );
}

function getSoftButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "border-white/[0.075] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
    : "border-[#E8E8EC] bg-white text-slate-700 hover:border-[#C7D2FE] hover:bg-[#F5F5FF] hover:text-slate-950";
}
