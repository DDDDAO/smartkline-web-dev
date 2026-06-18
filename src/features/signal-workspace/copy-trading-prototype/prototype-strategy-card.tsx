"use client";

import { useState } from "react";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { SourceAvatar } from "../card-ui";
import { StrategySettingsDialog } from "./strategy-settings-dialog";
import type { CopyTradingPrototypeTarget, PrototypeStrategy, PrototypeStrategySettingsUpdateInput, PrototypeStrategyStatus } from "./types";
import { formatDetailCurrency, formatSignedDetailCurrency, getPnlClassName, numberOrZero } from "./formatters";
import { MiniMetric } from "./mini-metric";
import { getPrototypeStrategyType, getStrategyStatusLabel } from "./strategy-helpers";
import { StrategySourceSummary } from "./strategy-source-summary";
import { getDangerButtonClassName, getSoftButtonClassName, getStrategyStatusClassName } from "./styles";


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
      <article className={isDarkTheme ? "relative rounded-2xl border border-white/[0.075] bg-[#181A20] p-3" : "relative rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3"}>
        <button
          className="block w-full text-left"
          type="button"
          onClick={() => onOpenDetail(strategy)}
        >
        <div className="flex items-start gap-3 pr-0 sm:pr-56">
          <SourceAvatar isDarkTheme={isDarkTheme} name={strategy.traderName} url={strategy.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h4 className="truncate text-sm font-black">{strategy.traderName}</h4>
              <span className={getStrategyStatusClassName(isDarkTheme, strategy.status)}>{statusLabel}</span>
              <span className={isDarkTheme ? "shrink-0 rounded-full bg-white/[0.055] px-2 py-0.5 text-[10px] font-black text-slate-300" : "shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-500"}>{typeLabel}</span>
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
        </button>
        <div className="mt-3 flex flex-wrap justify-end gap-2 sm:absolute sm:right-3 sm:top-3 sm:mt-0">
          <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={() => setIsSettingsOpen(true)}>{strategyCopy.edit}</button>
          {strategy.status === "running" ? (
            <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={() => onStrategyStatusChange(strategy.id, "paused")}>{strategyCopy.pause}</button>
          ) : (
            <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={() => onStrategyStatusChange(strategy.id, "running")}>{strategyCopy.resume}</button>
          )}
          <button className={getDangerButtonClassName(isDarkTheme)} type="button" onClick={() => onStrategyDelete(strategy.id)}>{strategyCopy.delete}</button>
        </div>
      </article>
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
