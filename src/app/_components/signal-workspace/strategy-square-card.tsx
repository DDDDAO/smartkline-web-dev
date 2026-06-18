import type { WorkspaceCopy, WorkspaceLanguage } from "@/app/_lib/i18n";
import type { PnlColorMode } from "./top-signals-panel";
import {
  STRATEGY_CARD_GRID_STYLE,
  type StrategyRecommendationSection,
  type StrategySquareFeaturedMetric,
  type StrategySquareItem,
  type StrategySquareWindow,
} from "./strategy-square-data";
import {
  formatPercent,
  getFollowActionClassName,
  getMockActionClassName,
  getMockBadgeClassName,
  getPnlTextClassName,
  getRankBadgeClassName,
  getRiskBadgeClassName,
  getStrategyCardPrimaryMetric,
  getStrategyCardSecondaryMetric,
  getStrategyContent,
  getTypeBadgeClassName,
  getWindowAdjustedMetrics,
} from "./strategy-square-logic";
import { StrategyReturnCurveChart } from "./strategy-square-curve";

export function RecommendedStrategySection({
  copiedStrategyId,
  copy,
  isDarkTheme,
  language,
  pnlColorMode,
  section,
  onCopy,
  onDetailsOpen,
  onMore,
}: {
  copiedStrategyId: string;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  pnlColorMode: PnlColorMode;
  section: StrategyRecommendationSection;
  onCopy: (strategy: StrategySquareItem) => void;
  onDetailsOpen: (strategyId: string) => void;
  onMore: () => void;
}) {
  const panelCopy = copy.workspace.strategySquare;

  return (
    <section className={isDarkTheme ? "rounded-[28px] border border-white/[0.075] bg-white/[0.025] p-3 sm:p-4" : "rounded-[28px] border border-[#E5EAF0] bg-white/80 p-3 shadow-sm sm:p-4"}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className={isDarkTheme ? "text-lg font-black tracking-tight text-slate-50 sm:text-xl" : "text-lg font-black tracking-tight text-slate-950 sm:text-xl"}>{section.title}</h2>
          <p className={isDarkTheme ? "mt-1 text-xs font-medium text-slate-500" : "mt-1 text-xs font-medium text-slate-500"}>{section.description}</p>
        </div>
        <button className={isDarkTheme ? "motion-fx-3-raw-button shrink-0 rounded-full bg-sky-400/10 px-3 py-1.5 text-xs font-black text-sky-200 transition hover:bg-sky-400/15" : "motion-fx-3-raw-button shrink-0 rounded-full bg-[#EAF8FE] px-3 py-1.5 text-xs font-black text-[#008DCC] transition hover:bg-[#D8F1FD]"} type="button" onClick={onMore}>
          {panelCopy.moreAction} ›
        </button>
      </div>
      <div className="grid justify-start gap-3" style={STRATEGY_CARD_GRID_STYLE}>
        {section.strategies.map((strategy, index) => (
          <StrategyMarketplaceCard
            key={`${section.key}-${strategy.id}`}
            copiedStrategyId={copiedStrategyId}
            copy={copy}
            featuredMetric={section.featuredMetric}
            isDarkTheme={isDarkTheme}
            language={language}
            pnlColorMode={pnlColorMode}
            rank={index + 1}
            strategy={strategy}
            variant="grid"
            window="30d"
            onCopy={onCopy}
            onDetailsOpen={onDetailsOpen}
          />
        ))}
      </div>
    </section>
  );
}

export function StrategyMarketplaceCard({
  copiedStrategyId,
  copy,
  featuredMetric = "profit",
  isDarkTheme,
  language,
  pnlColorMode,
  rank,
  strategy,
  variant,
  window,
  onCopy,
  onDetailsOpen,
}: {
  copiedStrategyId: string;
  copy: WorkspaceCopy;
  featuredMetric?: StrategySquareFeaturedMetric;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  pnlColorMode: PnlColorMode;
  rank?: number;
  strategy: StrategySquareItem;
  variant: "grid" | "rail";
  window: StrategySquareWindow;
  onCopy: (strategy: StrategySquareItem) => void;
  onDetailsOpen: (strategyId: string) => void;
}) {
  const panelCopy = copy.workspace.strategySquare;
  const content = getStrategyContent(strategy, language);
  const windowMetrics = getWindowAdjustedMetrics(strategy, window);
  const primaryMetric = getStrategyCardPrimaryMetric(windowMetrics, panelCopy, featuredMetric, window);
  const secondaryMetric = getStrategyCardSecondaryMetric(windowMetrics, panelCopy, featuredMetric, window);
  const isGridCard = variant === "grid";
  const cardLayoutClassName = variant === "rail"
    ? "w-[calc(100vw-3.5rem)] max-w-[360px] shrink-0 snap-start xl:w-[380px] xl:max-w-[380px]"
    : "min-w-0 w-full max-w-[360px]";
  const cardClassName = `${cardLayoutClassName} ${isDarkTheme
    ? `${isGridCard ? "rounded-[18px] sm:rounded-[22px] xl:rounded-[26px]" : "rounded-[26px]"} group overflow-hidden border border-white/[0.075] bg-[#181A20] text-left transition hover:border-sky-400/30 hover:bg-white/[0.055]`
    : `${isGridCard ? "rounded-[18px] sm:rounded-[22px] xl:rounded-[26px]" : "rounded-[26px]"} group overflow-hidden border border-[#E5EAF0] bg-white text-left shadow-sm transition hover:border-[#BFE7FB] hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]`}`;
  const cardBodyClassName = isGridCard ? "block w-full p-1.5 text-left sm:p-2.5 xl:p-4" : "block w-full p-4 text-left";
  const headerClassName = isGridCard ? "flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:gap-2 xl:gap-3" : "flex min-w-0 items-start gap-3";
  const badgeRowClassName = isGridCard ? "hidden flex-wrap items-center gap-1.5 md:flex" : "flex flex-wrap items-center gap-1.5";
  const titleClassName = isGridCard
    ? isDarkTheme
      ? "mt-1 line-clamp-2 text-[10px] font-black leading-3 text-slate-50 sm:mt-0 sm:text-xs sm:leading-4 xl:mt-2 xl:line-clamp-1 xl:text-base"
      : "mt-1 line-clamp-2 text-[10px] font-black leading-3 text-slate-950 sm:mt-0 sm:text-xs sm:leading-4 xl:mt-2 xl:line-clamp-1 xl:text-base"
    : isDarkTheme ? "mt-2 truncate text-base font-black text-slate-50" : "mt-2 truncate text-base font-black text-slate-950";
  const descriptionClassName = isGridCard
    ? isDarkTheme
      ? "hidden xl:mt-1 xl:line-clamp-2 xl:text-xs xl:leading-5 xl:text-slate-400"
      : "hidden xl:mt-1 xl:line-clamp-2 xl:text-xs xl:leading-5 xl:text-slate-500"
    : isDarkTheme ? "mt-1 line-clamp-2 text-xs leading-5 text-slate-400" : "mt-1 line-clamp-2 text-xs leading-5 text-slate-500";
  const metricPanelClassName = isGridCard
    ? isDarkTheme
      ? "mt-2 rounded-[14px] border border-white/[0.065] bg-[#101821] p-1.5 sm:rounded-[18px] sm:p-2 xl:mt-4 xl:rounded-[22px] xl:p-3"
      : "mt-2 rounded-[14px] border border-[#E5EAF0] bg-gradient-to-b from-[#F8FCFF] to-white p-1.5 sm:rounded-[18px] sm:p-2 xl:mt-4 xl:rounded-[22px] xl:p-3"
    : isDarkTheme ? "mt-4 rounded-[22px] border border-white/[0.065] bg-[#101821] p-3" : "mt-4 rounded-[22px] border border-[#E5EAF0] bg-gradient-to-b from-[#F8FCFF] to-white p-3";
  const metricPreviewGridClassName = isGridCard ? "grid grid-cols-2 gap-1.5 sm:gap-2" : "grid grid-cols-2 gap-2";
  const metricPreviewClassName = isDarkTheme
    ? "min-w-0 rounded-xl bg-white/[0.04] px-2 py-2 sm:rounded-2xl sm:px-3"
    : "min-w-0 rounded-xl bg-white px-2 py-2 shadow-sm sm:rounded-2xl sm:px-3";
  const metricPreviewLabelClassName = isGridCard
    ? isDarkTheme ? "truncate text-[10px] font-bold leading-3 text-slate-500 sm:text-[11px] sm:leading-4" : "truncate text-[10px] font-bold leading-3 text-slate-400 sm:text-[11px] sm:leading-4"
    : isDarkTheme ? "truncate text-[11px] font-bold leading-4 text-slate-500" : "truncate text-[11px] font-bold leading-4 text-slate-400";
  const primaryMetricValueClassName = getPnlTextClassName(
    isDarkTheme,
    primaryMetric.toneValue,
    pnlColorMode,
    isGridCard ? "mt-1 truncate text-sm leading-5 tracking-tight sm:text-base sm:leading-6 xl:text-xl xl:leading-7" : "mt-1 truncate text-2xl leading-8 tracking-tight",
  );
  const secondaryMetricValueClassName = getPnlTextClassName(
    isDarkTheme,
    secondaryMetric.toneValue,
    pnlColorMode,
    isGridCard ? "mt-1 truncate text-sm leading-5 tracking-tight sm:text-base sm:leading-6 xl:text-xl xl:leading-7" : "mt-1 truncate text-2xl leading-8 tracking-tight",
  );
  const curveClassName = isGridCard ? "mt-2 h-10 min-w-0 sm:h-14 xl:mt-3 xl:h-20" : "mt-3 h-24 min-w-0";
  const metricsRowClassName = isGridCard ? "mt-4 hidden grid-cols-3 gap-2 text-sm xl:grid" : "mt-4 grid grid-cols-3 gap-2 text-sm";
  const footerClassName = isDarkTheme
    ? isGridCard ? "grid grid-cols-2 gap-1 border-t border-white/[0.065] p-1.5 sm:gap-2 sm:p-2 xl:grid-cols-[minmax(84px,0.35fr)_minmax(0,1fr)] xl:p-3" : "grid grid-cols-[minmax(84px,0.35fr)_minmax(0,1fr)] gap-2 border-t border-white/[0.065] p-3"
    : isGridCard ? "grid grid-cols-2 gap-1 border-t border-[#EEF2F6] p-1.5 sm:gap-2 sm:p-2 xl:grid-cols-[minmax(84px,0.35fr)_minmax(0,1fr)] xl:p-3" : "grid grid-cols-[minmax(84px,0.35fr)_minmax(0,1fr)] gap-2 border-t border-[#EEF2F6] p-3";
  const copiedLabel = copiedStrategyId === strategy.id ? panelCopy.copiedAction : panelCopy.copyAction;
  const compactCopiedLabel = copiedStrategyId === strategy.id ? panelCopy.compactCopiedAction : panelCopy.compactCopyAction;

  return (
    <article className={cardClassName}>
      <button className={cardBodyClassName} type="button" onClick={() => onDetailsOpen(strategy.id)}>
        <div className={headerClassName}>
          <StrategyIcon isDarkTheme={isDarkTheme} name={content.name} rank={rank} variant={variant} />
          <div className="min-w-0 flex-1">
            <div className={badgeRowClassName}>
              <span className={getMockBadgeClassName(isDarkTheme)}>{panelCopy.mockBadge}</span>
              <span className={getTypeBadgeClassName(isDarkTheme, strategy.type)}>{panelCopy.strategyTypes[strategy.type]}</span>
              <span className={getRiskBadgeClassName(isDarkTheme, strategy.riskLevel)}>{panelCopy.riskLevels[strategy.riskLevel]}</span>
            </div>
            <h3 className={titleClassName}>{content.name}</h3>
            <p className={descriptionClassName}>{content.description}</p>
          </div>
        </div>

        <div className={metricPanelClassName}>
          <div className={metricPreviewGridClassName}>
            <div className={metricPreviewClassName}>
              <div className={metricPreviewLabelClassName}>{primaryMetric.label}</div>
              <div className={primaryMetricValueClassName}>{primaryMetric.value}</div>
            </div>
            <div className={metricPreviewClassName}>
              <div className={metricPreviewLabelClassName}>{secondaryMetric.label}</div>
              <div className={secondaryMetricValueClassName}>{secondaryMetric.value}</div>
            </div>
          </div>
          <div className={curveClassName}>
            <StrategyReturnCurveChart
              isDarkTheme={isDarkTheme}
              pnlColorMode={pnlColorMode}
              points={strategy.returnCurve}
              showValueAxis={false}
            />
          </div>
        </div>

        <div className={metricsRowClassName}>
          <CardMetricRow isDarkTheme={isDarkTheme} label={panelCopy.metrics.maxDrawdown} value={formatPercent(windowMetrics.maxDrawdown)} />
          <CardMetricRow isDarkTheme={isDarkTheme} label={panelCopy.metrics.winRate} value={formatPercent(windowMetrics.winRate)} />
          <CardMetricRow isDarkTheme={isDarkTheme} label={panelCopy.metrics.runningDays} value={String(strategy.metrics.runningDays)} />
        </div>
      </button>

      <div className={footerClassName}>
        <button className={getMockActionClassName(isDarkTheme, isGridCard ? "compact" : "default")} type="button" onClick={() => onDetailsOpen(strategy.id)}>
          {isGridCard ? (
            <>
              <span className="hidden xl:inline">{panelCopy.viewDetailsAction}</span>
              <span className="xl:hidden">{panelCopy.compactDetailsAction}</span>
            </>
          ) : panelCopy.viewDetailsAction}
        </button>
        <button className={getFollowActionClassName(isDarkTheme, isGridCard ? "compact" : "default")} type="button" onClick={() => onCopy(strategy)}>
          {isGridCard ? (
            <>
              <span className="hidden xl:inline">{copiedLabel}</span>
              <span className="xl:hidden">{compactCopiedLabel}</span>
            </>
          ) : copiedLabel}
        </button>
      </div>
    </article>
  );
}

export function CardMetricRow({ isDarkTheme, label, value }: { isDarkTheme: boolean; label: string; value: string }) {
  return (
    <div className={isDarkTheme ? "min-w-0 rounded-2xl bg-white/[0.045] px-2.5 py-2" : "min-w-0 rounded-2xl bg-[#F8FAFC] px-2.5 py-2"}>
      <div className={isDarkTheme ? "truncate text-[10px] font-bold text-slate-500" : "truncate text-[10px] font-bold text-slate-400"}>{label}</div>
      <div className={isDarkTheme ? "mt-1 truncate text-xs font-black text-slate-100" : "mt-1 truncate text-xs font-black text-slate-950"}>{value}</div>
    </div>
  );
}

export function StrategyIcon({
  isDarkTheme,
  name,
  rank,
  variant = "rail",
}: {
  isDarkTheme: boolean;
  name: string;
  rank?: number;
  variant?: "grid" | "rail";
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const iconClassName = variant === "grid"
    ? "relative grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-[#00A6F4] text-[10px] font-black text-white shadow-[0_8px_20px_rgba(0,166,244,0.24)] sm:h-9 sm:w-9 sm:rounded-2xl sm:text-xs xl:h-11 xl:w-11 xl:text-sm"
    : "relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#00A6F4] text-sm font-black text-white shadow-[0_8px_20px_rgba(0,166,244,0.24)]";

  return (
    <div className={iconClassName}>
      {initials || "SK"}
      {rank ? <span className={getRankBadgeClassName(isDarkTheme)}>#{rank}</span> : null}
    </div>
  );
}
