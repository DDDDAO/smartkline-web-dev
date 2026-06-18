"use client";

import { getTradingFoxErrorMessage } from "@/app/_lib/tradingfox-errors";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TradingFoxStrategyDetail } from "@/app/_lib/tradingfox-control-plane";
import { SourceAvatar } from "../card-ui";
import { formatDetailCurrency } from "./formatters";
import { BellGlyph } from "./icons";
import { MiniMetric } from "./mini-metric";
import { getStrategyStatusLabel } from "./strategy-helpers";
import {
  getDangerButtonClassName,
  getInlineErrorClassName,
  getModalSectionClassName,
  getNotificationConfigureButtonClassName,
  getPrimaryButtonClassName,
  getSoftButtonClassName,
  getStrategyStatusClassName,
} from "./styles";
import type { PrototypeStrategy, PrototypeStrategyStatus } from "./types";

export function StrategyDetailSummaryCard({
  copy,
  detail,
  isDarkTheme,
  isDeletingStrategy,
  isUpdatingLifecycle,
  liveStrategy,
  positionsMetricValue,
  signalSourcesMetricValue,
  shouldShowActionMessage,
  strategyCopy,
  syncError,
  syncMessage,
  traderOrdersMetricValue,
  onBack,
  onDelete,
  onEdit,
  onNotificationOpen,
  onUpdateLifecycle,
}: {
  copy: WorkspaceCopy;
  detail: TradingFoxStrategyDetail | null;
  isDarkTheme: boolean;
  isDeletingStrategy: boolean;
  isUpdatingLifecycle: boolean;
  liveStrategy: PrototypeStrategy;
  positionsMetricValue: string;
  signalSourcesMetricValue: string;
  shouldShowActionMessage: boolean;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  syncError: string;
  syncMessage: string;
  traderOrdersMetricValue: string;
  onBack: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onNotificationOpen: () => void;
  onUpdateLifecycle: (status: PrototypeStrategyStatus) => void;
}) {
  return (
    <div className={getModalSectionClassName(isDarkTheme)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={onBack}>← {strategyCopy.back}</button>
        <button className={getNotificationConfigureButtonClassName(isDarkTheme)} type="button" onClick={onNotificationOpen}>
          <BellGlyph />
          {strategyCopy.configureNotifications}
        </button>
      </div>
      <div className="mt-4 flex min-w-0 items-start gap-3">
        <SourceAvatar isDarkTheme={isDarkTheme} name={liveStrategy.traderName} url={liveStrategy.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-black">{liveStrategy.traderName}</h3>
            <span className={getStrategyStatusClassName(isDarkTheme, liveStrategy.status)}>{getStrategyStatusLabel(strategyCopy, liveStrategy.status)}</span>
          </div>
          <p className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-500"}>
            #{liveStrategy.id} · {liveStrategy.platform} · {liveStrategy.apiAccountName}
          </p>
        </div>
      </div>
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
      <div className={isDarkTheme ? "mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-white/[0.075] pt-4 lg:flex-nowrap" : "mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[#E5EAF0] pt-4 lg:flex-nowrap"}>
        <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={onEdit}>{strategyCopy.edit}</button>
        {liveStrategy.status === "running" ? (
          <button className={getSoftButtonClassName(isDarkTheme)} disabled={isUpdatingLifecycle} type="button" onClick={() => onUpdateLifecycle("paused")}>{isUpdatingLifecycle ? strategyCopy.updating : strategyCopy.pause}</button>
        ) : (
          <button className={getPrimaryButtonClassName(isDarkTheme)} disabled={isUpdatingLifecycle} type="button" onClick={() => onUpdateLifecycle("running")}>{isUpdatingLifecycle ? strategyCopy.updating : strategyCopy.resume}</button>
        )}
        <button className={getDangerButtonClassName(isDarkTheme)} disabled={isDeletingStrategy} type="button" onClick={onDelete}>{isDeletingStrategy ? strategyCopy.deleting : strategyCopy.delete}</button>
      </div>
    </div>
  );
}
