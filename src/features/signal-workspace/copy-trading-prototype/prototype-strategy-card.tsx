"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { SourceAvatar } from "../card-ui";
import { StrategySettingsDialog } from "./strategy-settings-dialog";
import type { CopyTradingPrototypeTarget, PrototypeStrategy, PrototypeStrategySettingsUpdateInput, PrototypeStrategyStatus } from "./types";
import { formatDetailCurrency, formatSignedDetailCurrency, getPnlClassName, numberOrZero } from "./formatters";
import { MiniMetric } from "./mini-metric";
import { getPrototypeStrategyType, getStrategyStatusLabel } from "./strategy-helpers";
import { StrategySourceSummary } from "./strategy-source-summary";


function formatOptionalStrategyCount(value?: number): string {
  if (value === undefined || value === null) {
    return "--";
  }

  return Number.isFinite(value) ? value.toLocaleString("en-US") : "--";
}

export function PrototypeStrategyCard({
  availableSignalSources,
  copy,
  isDarkTheme,
  strategy,
  onOpenDetail,
  onStrategyDelete,
  onStrategySettingsUpdate,
  onStrategyStatusChange,
}: {
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  strategy: PrototypeStrategy;
  onOpenDetail: (strategy: PrototypeStrategy) => void;
  onStrategyDelete: (strategyId: string) => Promise<void> | void;
  onStrategySettingsUpdate: (input: PrototypeStrategySettingsUpdateInput) => Promise<void> | void;
  onStrategyStatusChange: (strategyId: string, status: PrototypeStrategyStatus) => Promise<void> | void;
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const accountCopy = copy.workspace.accountCenter;
  const strategyCopy = accountCopy.strategy;
  const strategyType = getPrototypeStrategyType(strategy);
  const statusLabel = getStrategyStatusLabel(strategyCopy, strategy.status);
  const typeLabel = strategyType === "mario"
    ? accountCopy.strategyCreate.marioTypeChip
    : strategyType === "generic"
      ? (strategy.strategyDefinitionId ?? "Strategy")
      : accountCopy.strategyCreate.copyTradingTypeChip;
  const positionsCountValue = formatOptionalStrategyCount(strategy.positionsCount);
  const eventsCountValue = formatOptionalStrategyCount(strategy.eventsCount);

  return (
    <>
      <Card className={isDarkTheme ? "relative gap-0 rounded-2xl border-white/[0.075] bg-[#181A20] p-3 text-slate-100 shadow-none" : "relative gap-0 rounded-2xl border-[#E8E8EC] bg-[#FAFAFA] p-3 text-slate-950 shadow-none"}>
        <Button
          className="h-auto w-full flex-col items-stretch justify-start whitespace-normal rounded-none p-0 text-left hover:bg-transparent"
          variant="ghost"
          type="button"
          onClick={() => onOpenDetail(strategy)}
        >
        <div className="flex items-start gap-3 pr-0 sm:pr-56">
          <SourceAvatar isDarkTheme={isDarkTheme} name={strategy.traderName} url={strategy.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h4 className="truncate text-sm font-black">{strategy.traderName}</h4>
              <Badge className={getStrategyStatusBadgeClassName(isDarkTheme, strategy.status)}>{statusLabel}</Badge>
              <Badge className={getStrategyTypeBadgeClassName(isDarkTheme)} variant="secondary">{typeLabel}</Badge>
            </div>
            <div className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-500"}>
              {strategy.platform} · {strategy.apiAccountName}
            </div>
          </div>
        </div>
        {strategyType === "copyTrading" ? (
          <StrategySourceSummary availableSignalSources={availableSignalSources} copy={copy} isDarkTheme={isDarkTheme} strategy={strategy} />
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.positionCount} value={positionsCountValue} />
          <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.tradeHistoryCount} value={eventsCountValue} />
          <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.accountEquity} value={formatDetailCurrency(strategy.accountEquity)} />
          <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.unrealizedPnl} value={formatSignedDetailCurrency(strategy.unrealizedPnl)} valueClassName={getPnlClassName(isDarkTheme, numberOrZero(strategy.unrealizedPnl))} />
        </div>
        <p className={isDarkTheme ? "mt-3 text-[11px] leading-5 text-slate-500" : "mt-3 text-[11px] leading-5 text-slate-500"}>
          {strategyType === "mario" ? accountCopy.strategyCreate.marioCardHint : strategyCopy.stopNote}
        </p>
        </Button>
        <div className="mt-3 flex flex-wrap justify-end gap-2 sm:absolute sm:right-3 sm:top-3 sm:mt-0">
          <Button className={getSoftButtonClassName(isDarkTheme)} size="sm" type="button" variant="outline" onClick={() => setIsSettingsOpen(true)}>{strategyCopy.edit}</Button>
          {strategy.status === "running" ? (
            <Button className={getSoftButtonClassName(isDarkTheme)} size="sm" type="button" variant="outline" onClick={() => onStrategyStatusChange(strategy.id, "paused")}>{strategyCopy.pause}</Button>
          ) : (
            <Button className={getSoftButtonClassName(isDarkTheme)} size="sm" type="button" variant="outline" onClick={() => onStrategyStatusChange(strategy.id, "running")}>{strategyCopy.resume}</Button>
          )}
          <Button className={getDangerButtonClassName(isDarkTheme)} size="sm" type="button" variant="destructive" onClick={() => onStrategyDelete(strategy.id)}>{strategyCopy.delete}</Button>
        </div>
      </Card>
      {isSettingsOpen ? (
        <StrategySettingsDialog
          availableSignalSources={availableSignalSources}
          copy={copy}
          isDarkTheme={isDarkTheme}
          strategy={strategy}
          onClose={() => setIsSettingsOpen(false)}
          onSave={onStrategySettingsUpdate}
        />
      ) : null}
    </>
  );
}

function getSoftButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "border-white/[0.075] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
    : "border-[#E8E8EC] bg-white text-slate-700 hover:border-[#C7D2FE] hover:bg-[#F5F5FF] hover:text-slate-950";
}

function getDangerButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "border border-rose-400/20 bg-rose-400/10 text-rose-200 hover:bg-rose-400/15"
    : "border border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100";
}

function getStrategyTypeBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "shrink-0 rounded-full border-0 bg-white/[0.055] px-2 py-0.5 text-[10px] font-black text-slate-300"
    : "shrink-0 rounded-full border-0 bg-white px-2 py-0.5 text-[10px] font-black text-slate-500";
}

function getStrategyStatusBadgeClassName(isDarkTheme: boolean, status: PrototypeStrategyStatus): string {
  if (status === "running") {
    return isDarkTheme ? "shrink-0 rounded-full border-0 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black text-emerald-300" : "shrink-0 rounded-full border-0 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700";
  }
  if (status === "paused") {
    return isDarkTheme ? "shrink-0 rounded-full border-0 bg-amber-400/15 px-2 py-0.5 text-[10px] font-black text-amber-300" : "shrink-0 rounded-full border-0 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700";
  }
  if (status === "pending") {
    return isDarkTheme ? "shrink-0 rounded-full border-0 bg-indigo-400/15 px-2 py-0.5 text-[10px] font-black text-indigo-300" : "shrink-0 rounded-full border-0 bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700";
  }
  if (status === "failed") {
    return isDarkTheme ? "shrink-0 rounded-full border-0 bg-rose-400/15 px-2 py-0.5 text-[10px] font-black text-rose-300" : "shrink-0 rounded-full border-0 bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700";
  }
  return isDarkTheme ? "shrink-0 rounded-full border-0 bg-slate-700 px-2 py-0.5 text-[10px] font-black text-slate-300" : "shrink-0 rounded-full border-0 bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600";
}
