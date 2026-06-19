import { Button } from "@/components/ui/button";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { CopyTradingPosition } from "@/types/copy-trading";
import { FavoriteStarButton, SourceAvatar, SymbolIcon } from "../card-ui";
import type { PnlColorMode, TopSignalSourceModel } from "./helpers";
import {
  calculatePositionUnrealizedPnlAmount,
  formatCurrency,
  formatDirection,
  formatPrice,
  formatQuantity,
  formatSignedCurrency,
  formatSignedPercent,
  formatPercent,
  getDirectionBadgeClassName,
  getPnlClassName,
  getPnlRatioClassName,
  getTopSignalStateCardClassName,
} from "./helpers";
import { getSafeExternalUrl } from "./utils";

export function RowsPaginationControls({
  canGoNext,
  canGoPrevious,
  isLoading,
  isDarkTheme,
  nextLabel,
  previousLabel,
  rangeLabel,
  onNext,
  onPrevious,
}: {
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLoading?: boolean;
  isDarkTheme: boolean;
  nextLabel: string;
  previousLabel: string;
  rangeLabel: string;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const buttonClassName = isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-[11px] font-bold text-indigo-200 transition hover:border-indigo-400/25 hover:bg-indigo-400/10 disabled:cursor-not-allowed disabled:opacity-45"
    : "rounded-2xl border border-[#C7D2FE] bg-white px-3 py-2 text-[11px] font-bold text-[#4F46E5] transition hover:bg-[#EEF2FF] disabled:cursor-not-allowed disabled:opacity-45";
  const rangeClassName = isDarkTheme
    ? "text-center text-[10px] font-semibold text-slate-500"
    : "text-center text-[10px] font-semibold text-slate-400";
  const isNextDisabled = !canGoNext || Boolean(isLoading);
  const isPreviousDisabled = !canGoPrevious || Boolean(isLoading);

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <Button className={buttonClassName} disabled={isPreviousDisabled} size="sm" type="button" variant="outline" onClick={onPrevious}>
        {previousLabel}
      </Button>
      <span className={rangeClassName}>{rangeLabel}</span>
      <Button className={buttonClassName} disabled={isNextDisabled} size="sm" type="button" variant="outline" onClick={onNext}>
        {nextLabel}
      </Button>
    </div>
  );
}

export function SourceHeader({
  actionLabel,
  copy,
  isDarkTheme,
  isWatchlisted,
  model,
  onActionToggle,
  onWatchToggle,
}: {
  actionLabel?: string;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  isWatchlisted: boolean;
  model: TopSignalSourceModel;
  onActionToggle?: () => void;
  onWatchToggle?: () => void;
}) {
  const panelCopy = copy.workspace.topSignals;
  const profileUrl = getSafeExternalUrl(model.trader.source_url);
  const actionButtonClassName = isDarkTheme
    ? "motion-fx-3-raw-button inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 text-[11px] font-bold text-indigo-200 transition hover:bg-indigo-400/15"
    : "motion-fx-3-raw-button inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-3 text-[11px] font-bold text-[#4F46E5] transition hover:bg-[#EEF2FF]";
  const traderNameClassName = isDarkTheme
    ? "min-w-0 truncate text-sm font-black leading-none text-slate-50"
    : "min-w-0 truncate text-sm font-black leading-none text-slate-950";

  return (
    <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)_auto] grid-rows-[40px_28px] gap-x-3 gap-y-0">
      <div className="col-start-1 row-start-1 row-span-2 flex h-10 items-center">
        <SourceAvatar isDarkTheme={isDarkTheme} name={model.trader.name} url={model.trader.avatar} />
      </div>
      <div className="col-start-2 row-start-1 flex min-w-0 items-center">
        {profileUrl ? (
          <a
            className={`${traderNameClassName} motion-fx-3-raw-button rounded-md outline-none transition hover:text-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/50`}
            href={profileUrl}
            rel="noopener noreferrer"
            target="_blank"
            title={panelCopy.openTraderProfile}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {model.trader.name}
          </a>
        ) : (
          <h3 className={traderNameClassName}>{model.trader.name}</h3>
        )}
      </div>
      {onActionToggle && actionLabel ? (
        <Button
          className={`${actionButtonClassName} col-start-3 row-start-1 self-center justify-self-end`}
          type="button"
          variant="ghost"
          onClick={(event) => {
            event.stopPropagation();
            onActionToggle();
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {actionLabel}
        </Button>
      ) : null}
      <div className={isDarkTheme ? "col-start-2 col-end-4 row-start-2 flex min-w-0 items-center gap-1.5 text-[13px] font-bold leading-none text-slate-500" : "col-start-2 col-end-4 row-start-2 flex min-w-0 items-center gap-1.5 text-[13px] font-bold leading-none text-slate-500"}>
        <span className="min-w-0 truncate whitespace-nowrap">{panelCopy.signalType}: {model.trader.platform}</span>
        {onWatchToggle ? (
          <FavoriteStarButton
            activeLabel={copy.workspace.watchlist.removeFavorite}
            inactiveLabel={copy.workspace.watchlist.addFavorite}
            isActive={isWatchlisted}
            isDarkTheme={isDarkTheme}
            size="compact"
            onToggle={onWatchToggle}
          />
        ) : null}
      </div>
    </div>
  );
}

export function TopSignalCopyTradingAction({
  copy,
  isDarkTheme,
  onClick,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onClick: () => void;
}) {
  const panelCopy = copy.workspace.topSignals;
  const buttonClassName = isDarkTheme
    ? "motion-fx-3-raw-button mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-indigo-400/20 bg-indigo-400/10 px-3 py-3 text-left text-indigo-100 transition hover:border-indigo-300/30 hover:bg-indigo-400/15"
    : "motion-fx-3-raw-button mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF] px-3 py-3 text-left text-[#4F46E5] transition hover:border-[#A5B4FC] hover:bg-[#EEF2FF]";

  return (
    <Button
      className={buttonClassName}
      type="button"
      variant="ghost"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <span className="min-w-0">
        <span className="block text-sm font-black">{panelCopy.copyTradingCta}</span>
        <span className={isDarkTheme ? "mt-0.5 block text-[11px] font-bold text-indigo-200/70" : "mt-0.5 block text-[11px] font-bold text-[#4F46E5]/70"}>{panelCopy.copyTradingMeta}</span>
      </span>
      <span aria-hidden="true" className={isDarkTheme ? "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-300/15 text-base font-black text-indigo-200" : "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-base font-black text-[#4F46E5]"}>
        →
      </span>
    </Button>
  );
}

export function PositionRow({
  copy,
  isDarkTheme,
  pnlColorMode,
  position,
  onPositionSelect,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  pnlColorMode: PnlColorMode;
  position: CopyTradingPosition;
  onPositionSelect: (position: CopyTradingPosition) => void;
}) {
  const panelCopy = copy.workspace.topSignals;
  const unrealizedPnlAmount = calculatePositionUnrealizedPnlAmount(position);
  const pnlToneValue = unrealizedPnlAmount ?? position.unrealized_pnl;
  const rowClassName = isDarkTheme
    ? "block min-h-[74px] w-full min-w-0 appearance-none overflow-hidden rounded-2xl border border-white/[0.075] bg-[#181A20] px-3 py-2 text-left transition hover:border-indigo-500/30 hover:bg-white/[0.055]"
    : "block min-h-[74px] w-full min-w-0 appearance-none overflow-hidden rounded-2xl border border-[#E8E8EC] bg-white px-3 py-2 text-left transition hover:border-[#C7D2FE] hover:bg-[#F5F5FF]";

  return (
    <Button
      className={rowClassName}
      type="button"
      variant="ghost"
      onClick={(event) => {
        event.stopPropagation();
        onPositionSelect(position);
      }}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <SymbolIcon symbol={position.symbol} />
            <span className={isDarkTheme ? "min-w-0 max-w-[142px] truncate text-xs font-black text-slate-50" : "min-w-0 max-w-[142px] truncate text-xs font-black text-slate-950"}>{position.symbol}</span>
            <span className={getDirectionBadgeClassName(isDarkTheme, position.direction)}>{formatDirection(position.direction, copy)}</span>
            <span className={isDarkTheme ? "rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-slate-300" : "rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"}>{position.leverage}x</span>
          </div>
          <div className={isDarkTheme ? "mt-1 truncate text-[11px] text-slate-500" : "mt-1 truncate text-[11px] text-slate-500"}>
            {panelCopy.entry} {formatPrice(position.entry_price)} · {panelCopy.mark} {formatPrice(position.current_price)}
          </div>
          <div className={isDarkTheme ? "mt-1 truncate text-[10px] font-medium text-slate-500" : "mt-1 truncate text-[10px] font-medium text-slate-400"}>
            {panelCopy.quantity} {formatQuantity(position.quantity)} · {panelCopy.notional} {formatCurrency(position.notional_value)} · {formatPercent(position.position_size_ratio)}
          </div>
        </div>
        <div className="shrink-0 pl-1 text-right">
          <div className={getPnlClassName(isDarkTheme, pnlToneValue, pnlColorMode)}>{formatSignedCurrency(unrealizedPnlAmount)}</div>
          <div className={getPnlRatioClassName(isDarkTheme, position.unrealized_pnl, pnlColorMode)}>{formatSignedPercent(position.unrealized_pnl)}</div>
        </div>
      </div>
    </Button>
  );
}

export function TopSignalsStateCard({ isDarkTheme, message, statusText, title, tone }: { isDarkTheme: boolean; message: string; statusText?: string; title: string; tone: "loading" | "pending" | "risk" }) {
  const cardClassName = getTopSignalStateCardClassName(isDarkTheme, tone);

  return (
    <div className="signal-card-scene">
      <div className={cardClassName}>
        <div className="relative z-10 p-4">
          <div className={isDarkTheme ? "text-sm font-black text-slate-50" : "text-sm font-black text-slate-950"}>{title}</div>
          <p className={isDarkTheme ? "mt-2 text-xs leading-5 text-slate-400" : "mt-2 text-xs leading-5 text-slate-600"}>{message}</p>
          {statusText ? <div className={isDarkTheme ? "mt-3 text-[11px] font-medium text-rose-300" : "mt-3 text-[11px] font-medium text-rose-600"}>{statusText}</div> : null}
        </div>
      </div>
    </div>
  );
}
