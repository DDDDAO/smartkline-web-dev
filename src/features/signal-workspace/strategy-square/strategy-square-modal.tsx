import { Button } from "@/components/ui/button";
import type { WorkspaceCopy, WorkspaceLanguage } from "@/i18n/workspace";
import type { PnlColorMode } from "../top-signals-panel";
import type {
  StrategySquareItem,
  StrategySquareWindow,
} from "./strategy-square-data";
import {
  formatCurrencyNumber,
  formatPercent,
  formatSignedPercent,
  getFollowActionClassName,
  getMockBadgeClassName,
  getPnlTextClassName,
  getRiskBadgeClassName,
  getSoftBadgeClassName,
  getStrategyContent,
  getTagClassName,
  getTypeBadgeClassName,
  getWindowAdjustedMetrics,
} from "./strategy-square-logic";
import { StrategyIcon } from "./strategy-square-card";
import { StrategyReturnCurveChart } from "./strategy-square-curve";

export function StrategyParameterModal({
  copiedStrategyId,
  copy,
  isDarkTheme,
  language,
  pnlColorMode,
  strategy,
  window,
  onClose,
  onCopy,
}: {
  copiedStrategyId: string;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  pnlColorMode: PnlColorMode;
  strategy: StrategySquareItem;
  window: StrategySquareWindow;
  onClose: () => void;
  onCopy: (strategy: StrategySquareItem) => void;
}) {
  const panelCopy = copy.workspace.strategySquare;
  const content = getStrategyContent(strategy, language);
  const windowMetrics = getWindowAdjustedMetrics(strategy, window);
  const dialogClassName = isDarkTheme
    ? "fixed inset-x-3 bottom-3 top-auto z-[110] flex max-h-[92dvh] flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0F141B] text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.48)] sm:inset-x-1/2 sm:bottom-auto sm:top-1/2 sm:w-[min(760px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2"
    : "fixed inset-x-3 bottom-3 top-auto z-[110] flex max-h-[92dvh] flex-col overflow-hidden rounded-[28px] border border-[#E8E8EC] bg-white text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:inset-x-1/2 sm:bottom-auto sm:top-1/2 sm:w-[min(760px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2";

  return (
    <>
      <Button
        aria-label={copy.common.close}
        className={isDarkTheme ? "fixed inset-0 z-[100] rounded-none bg-black/55 p-0 backdrop-blur-[4px]" : "fixed inset-0 z-[100] rounded-none bg-slate-950/25 p-0 backdrop-blur-[4px]"}
        type="button"
        variant="ghost"
        onClick={onClose}
      />
      <aside
        aria-labelledby={`strategy-parameter-dialog-title-${strategy.id}`}
        aria-modal="true"
        className={dialogClassName}
        role="dialog"
      >
        <div className={isDarkTheme ? "border-b border-white/[0.075] p-4 sm:p-5" : "border-b border-[#E8E8EC] p-4 sm:p-5"}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <StrategyIcon isDarkTheme={isDarkTheme} name={content.name} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={getMockBadgeClassName(isDarkTheme)}>{panelCopy.mockBadge}</span>
                  <span className={getTypeBadgeClassName(isDarkTheme, strategy.type)}>{panelCopy.strategyTypes[strategy.type]}</span>
                  <span className={getRiskBadgeClassName(isDarkTheme, strategy.riskLevel)}>{panelCopy.riskLevels[strategy.riskLevel]}</span>
                </div>
                <h2 id={`strategy-parameter-dialog-title-${strategy.id}`} className={isDarkTheme ? "mt-2 text-xl font-black tracking-tight text-slate-50" : "mt-2 text-xl font-black tracking-tight text-slate-950"}>
                  {content.name}
                </h2>
                <p className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-500"}>
                  {panelCopy.parameterDialogDescription}
                </p>
              </div>
            </div>
            <Button
              aria-label={copy.common.close}
              className={isDarkTheme ? "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.075] bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-slate-50" : "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#E8E8EC] bg-white text-slate-500 transition hover:border-[#C7D2FE] hover:text-slate-900"}
              size="icon"
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              <span aria-hidden="true" className="text-lg leading-none">×</span>
            </Button>
          </div>
        </div>

        <div className={isDarkTheme ? "kol-scroll-area kol-scroll-area-dark min-h-0 flex-1 overflow-y-auto bg-[#12161D] p-4 sm:p-5" : "kol-scroll-area min-h-0 flex-1 overflow-y-auto bg-[#FAFAFA] p-4 sm:p-5"}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid gap-4">
              <section className={isDarkTheme ? "rounded-3xl border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-3xl border border-[#E8E8EC] bg-white p-4 shadow-sm"}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className={isDarkTheme ? "text-sm font-black text-slate-100" : "text-sm font-black text-slate-950"}>{panelCopy.parameterDialogTitle}</h3>
                    <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-500"}>{content.description}</p>
                  </div>
                  <span className={getSoftBadgeClassName(isDarkTheme)}>{panelCopy.windows[window]}</span>
                </div>
                <div className="mt-4 h-28">
                  <StrategyReturnCurveChart isDarkTheme={isDarkTheme} pnlColorMode={pnlColorMode} points={strategy.returnCurve} />
                </div>
              </section>

              <section className={isDarkTheme ? "rounded-3xl border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-3xl border border-[#E8E8EC] bg-white p-4 shadow-sm"}>
                <h3 className={isDarkTheme ? "text-sm font-black text-slate-100" : "text-sm font-black text-slate-950"}>{panelCopy.copyConfigTitle}</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {content.configLines.map((line) => (
                    <div key={line} className={isDarkTheme ? "rounded-2xl border border-white/[0.06] bg-[#181A20] px-3 py-3 text-xs font-medium text-slate-300" : "rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 py-3 text-xs font-medium text-slate-600"}>
                      {line}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="grid content-start gap-3">
              <div className="grid grid-cols-2 gap-2">
                <StrategyMetric isDarkTheme={isDarkTheme} label={panelCopy.windowedProfitUsd(panelCopy.windows[window])} value={formatCurrencyNumber(windowMetrics.profit30dUsd)} valueClassName={getPnlTextClassName(isDarkTheme, windowMetrics.profit30dUsd, pnlColorMode, "text-sm")} />
                <StrategyMetric isDarkTheme={isDarkTheme} label={panelCopy.metrics.returnRate} value={formatSignedPercent(windowMetrics.returnRate)} valueClassName={getPnlTextClassName(isDarkTheme, windowMetrics.returnRate, pnlColorMode, "text-sm")} />
                <StrategyMetric isDarkTheme={isDarkTheme} label={panelCopy.metrics.maxDrawdown} value={formatPercent(windowMetrics.maxDrawdown)} />
                <StrategyMetric isDarkTheme={isDarkTheme} label={panelCopy.metrics.winRate} value={formatPercent(windowMetrics.winRate)} />
                <StrategyMetric isDarkTheme={isDarkTheme} label={panelCopy.metrics.tradeCount} value={String(windowMetrics.tradeCount)} />
                <StrategyMetric isDarkTheme={isDarkTheme} label={panelCopy.metrics.minimumCapital} value={formatCurrencyNumber(strategy.metrics.minimumCapital)} />
              </div>
              <section className={isDarkTheme ? "rounded-3xl border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-3xl border border-[#E8E8EC] bg-white p-4 shadow-sm"}>
                <h3 className={isDarkTheme ? "text-xs font-black text-slate-100" : "text-xs font-black text-slate-950"}>{panelCopy.parameterTagsTitle}</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {content.tags.map((tag) => <span key={tag} className={getTagClassName(isDarkTheme)}>{tag}</span>)}
                </div>
              </section>
              <div className={isDarkTheme ? "rounded-2xl border border-indigo-300/20 bg-indigo-300/10 p-3 text-xs leading-5 text-indigo-100" : "rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF] p-3 text-xs leading-5 text-[#006F9F]"}>
                {panelCopy.mockNotice}
              </div>
            </div>
          </div>
        </div>

        <div className={isDarkTheme ? "border-t border-white/[0.075] p-4 sm:p-5" : "border-t border-[#E8E8EC] p-4 sm:p-5"}>
          <Button className={getFollowActionClassName(isDarkTheme)} type="button" variant="default" onClick={() => onCopy(strategy)}>
            {copiedStrategyId === strategy.id ? panelCopy.copiedAction : panelCopy.copyAction}
          </Button>
        </div>
      </aside>
    </>
  );
}

export function StrategyMetric({
  isDarkTheme,
  label,
  value,
  valueClassName,
}: {
  isDarkTheme: boolean;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3" : "rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] p-3"}>
      <div className={isDarkTheme ? "truncate text-[10px] font-bold text-slate-500" : "truncate text-[10px] font-bold text-slate-400"}>{label}</div>
      <div className={valueClassName ?? (isDarkTheme ? "mt-1 truncate text-sm font-black text-slate-100" : "mt-1 truncate text-sm font-black text-slate-950")}>{value}</div>
    </div>
  );
}
