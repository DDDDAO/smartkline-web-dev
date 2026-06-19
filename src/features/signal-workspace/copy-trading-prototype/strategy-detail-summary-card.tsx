"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTradingFoxErrorMessage } from "@/lib/tradingfox-errors";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TradingFoxStrategyDetail } from "@/lib/tradingfox-control-plane";
import { SourceAvatar } from "../card-ui";
import { formatDetailCurrency } from "./formatters";
import { BellGlyph } from "./icons";
import { MiniMetric } from "./mini-metric";
import { StrategySourceSummary } from "./strategy-source-summary";
import { getPrototypeStrategyType, getStrategyStatusLabel } from "./strategy-helpers";
import { getInlineErrorClassName } from "./styles";
import type { CopyTradingPrototypeTarget, PrototypeStrategy, PrototypeStrategyStatus } from "./types";

export function StrategyDetailSummaryCard({
  availableSignalSources,
  copy,
  detail,
  isDarkTheme,
  isDeletingStrategy,
  isSyncingPositions,
  isUpdatingLifecycle,
  liveStrategy,
  positionsMetricValue,
  signalSourcesMetricValue,
  shouldShowActionMessage,
  shouldShowCopyTradingPositionSync,
  strategyCopy,
  syncError,
  syncMessage,
  traderOrdersMetricValue,
  onBack,
  onDelete,
  onEdit,
  onNotificationOpen,
  onSyncCopyTradingPositions,
  onUpdateLifecycle,
}: {
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  copy: WorkspaceCopy;
  detail: TradingFoxStrategyDetail | null;
  isDarkTheme: boolean;
  isDeletingStrategy: boolean;
  isSyncingPositions: boolean;
  isUpdatingLifecycle: boolean;
  liveStrategy: PrototypeStrategy;
  positionsMetricValue: string;
  signalSourcesMetricValue: string;
  shouldShowActionMessage: boolean;
  shouldShowCopyTradingPositionSync: boolean;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  syncError: string;
  syncMessage: string;
  traderOrdersMetricValue: string;
  onBack: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onNotificationOpen: () => void;
  onSyncCopyTradingPositions: () => void;
  onUpdateLifecycle: (status: PrototypeStrategyStatus) => void;
}) {
  return (
    <Card className={isDarkTheme ? "gap-0 rounded-[24px] border-white/[0.075] bg-white/[0.035] p-4 text-slate-100 shadow-none" : "gap-0 rounded-[24px] border-[#E8E8EC] bg-white p-4 text-slate-950 shadow-sm"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button className={getSoftButtonClassName(isDarkTheme)} size="sm" type="button" variant="outline" onClick={onBack}>← {strategyCopy.back}</Button>
        <Button className={getNotificationButtonClassName(isDarkTheme)} type="button" variant="outline" onClick={onNotificationOpen}>
          <BellGlyph />
          {strategyCopy.configureNotifications}
        </Button>
      </div>
      <div className="mt-4 flex min-w-0 items-start gap-3">
        <SourceAvatar isDarkTheme={isDarkTheme} name={liveStrategy.traderName} url={liveStrategy.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-black">{liveStrategy.traderName}</h3>
            <Badge className={getStrategyStatusBadgeClassName(isDarkTheme, liveStrategy.status)}>{getStrategyStatusLabel(strategyCopy, liveStrategy.status)}</Badge>
          </div>
          <p className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-500"}>
            #{liveStrategy.id} · {liveStrategy.platform} · {liveStrategy.apiAccountName}
          </p>
        </div>
      </div>
      {getPrototypeStrategyType(liveStrategy) === "copyTrading" ? (
        <StrategySourceSummary
          availableSignalSources={availableSignalSources}
          copy={copy}
          isDarkTheme={isDarkTheme}
          strategy={liveStrategy}
        />
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs lg:grid-cols-4">
        <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.accountEquity} value={formatDetailCurrency(detail?.account?.equity)} />
        <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.positionCount} value={positionsMetricValue} />
        <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.signalSourceCount} value={signalSourcesMetricValue} />
        <MiniMetric isDarkTheme={isDarkTheme} label={strategyCopy.traderOrders} value={traderOrdersMetricValue} />
      </div>
      {detail?.trader.statusMessage ? (
        <p className={isDarkTheme ? "mt-3 whitespace-pre-line break-words text-xs leading-5 text-amber-200" : "mt-3 whitespace-pre-line break-words text-xs leading-5 text-amber-700"}>
          {getTradingFoxErrorMessage(detail.trader.statusMessage, copy)}
        </p>
      ) : null}
      {shouldShowActionMessage ? (
        <div className="mt-3">
          {syncMessage ? <p className={isDarkTheme ? "text-xs text-emerald-200" : "text-xs text-emerald-700"}>{syncMessage}</p> : null}
          {syncError ? <p className={getInlineErrorClassName(isDarkTheme)}>{syncError}</p> : null}
        </div>
      ) : null}
      <div className={isDarkTheme ? "mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-white/[0.075] pt-4 lg:flex-nowrap" : "mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[#E8E8EC] pt-4 lg:flex-nowrap"}>
        <Button className={getSoftButtonClassName(isDarkTheme)} size="sm" type="button" variant="outline" onClick={onEdit}>{strategyCopy.edit}</Button>
        {shouldShowCopyTradingPositionSync ? (
          <Button className={getSoftButtonClassName(isDarkTheme)} disabled={isSyncingPositions} size="sm" type="button" variant="outline" onClick={onSyncCopyTradingPositions}>
            {isSyncingPositions ? strategyCopy.syncingPositions : strategyCopy.syncPositions}
          </Button>
        ) : null}
        {liveStrategy.status === "running" ? (
          <Button className={getSoftButtonClassName(isDarkTheme)} disabled={isUpdatingLifecycle} size="sm" type="button" variant="outline" onClick={() => onUpdateLifecycle("paused")}>{isUpdatingLifecycle ? strategyCopy.updating : strategyCopy.pause}</Button>
        ) : (
          <Button className={getPrimaryButtonClassName(isDarkTheme)} disabled={isUpdatingLifecycle} size="sm" type="button" onClick={() => onUpdateLifecycle("running")}>{isUpdatingLifecycle ? strategyCopy.updating : strategyCopy.resume}</Button>
        )}
        <Button className={getDangerButtonClassName(isDarkTheme)} disabled={isDeletingStrategy} size="sm" type="button" variant="destructive" onClick={onDelete}>{isDeletingStrategy ? strategyCopy.deleting : strategyCopy.delete}</Button>
      </div>
    </Card>
  );
}

function getPrimaryButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "bg-indigo-400 text-slate-950 hover:bg-indigo-300"
    : "bg-[#6366F1] text-white hover:bg-[#4F46E5]";
}

function getSoftButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "border-white/[0.075] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
    : "border-[#E8E8EC] bg-white text-slate-700 hover:border-[#C7D2FE] hover:bg-[#F5F5FF] hover:text-slate-950";
}

function getNotificationButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "min-h-10 rounded-2xl border-white/[0.075] bg-white/[0.04] text-sm font-black text-slate-200 hover:border-indigo-300/25 hover:bg-white/[0.08] hover:text-slate-50"
    : "min-h-10 rounded-2xl border-[#E8E8EC] bg-white text-sm font-black text-slate-700 hover:border-[#C7D2FE] hover:bg-[#F5F5FF] hover:text-slate-950";
}

function getDangerButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "border border-rose-400/20 bg-rose-400/10 text-rose-200 hover:bg-rose-400/15"
    : "border border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100";
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
