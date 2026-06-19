"use client";

import { Fragment, type RefObject } from "react";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TelegramSessionUser } from "@/lib/auth/telegram-auth";
import type { TradingFoxStrategyDefinition, TradingFoxStrategyDetail } from "@/lib/tradingfox-control-plane";
import type { KlineInterval } from "@/types/market";
import {
  StrategyPerformanceCurvePanel,
  type StrategyDetailCurveWindow,
  type TradeHistoryRow,
} from "./strategy-detail-content";
import { StrategyDetailActionsSection } from "./strategy-detail-actions-section";
import { StrategyDetailConfigSection } from "./strategy-detail-config-section";
import { StrategyDetailPositionsSections } from "./strategy-detail-positions-sections";
import type { CopyPositionMarkPricesBySymbol, SignalSourceIdentityById } from "./strategy-detail-shared";
import { StrategyTradeHistorySection } from "./strategy-trade-history-section";
import type { StrategyPresentationModule } from "./strategy-presentation-registry";
import type { PrototypeStrategy } from "./types";

export function StrategyDetailLoadedSections({
  activeCurveWindow,
  allTradeHistoryRows,
  copy,
  copyPositionMarkPricesBySymbol,
  curve,
  curveError,
  curveWindows,
  detail,
  interval,
  isCurveLoading,
  isDarkTheme,
  isKlineOpen,
  ordersSectionLoaded,
  positionsSectionLoaded,
  rangeLabel,
  rows,
  sectionRef,
  selectedRow,
  signalSourceIdentityById,
  signalSourcesSectionLoaded,
  strategy,
  strategyCopy,
  strategyDefinition,
  strategyDefinitionError,
  strategyPresentation,
  telegramUser,
  canGoNext,
  canGoPrevious,
  onActionCompleted,
  onIntervalChange,
  onMarioRefresh,
  onNextPage,
  onPreviousPage,
  onRowKlineOpen,
  onToggleKline,
  onWindowChange,
}: StrategyDetailLoadedSectionsProps) {
  return (
    <>
      <StrategyPerformanceCurvePanel
        activeWindow={activeCurveWindow}
        curve={curve}
        curveError={curveError}
        curveWindows={curveWindows}
        isCurveLoading={isCurveLoading}
        isDarkTheme={isDarkTheme}
        strategyCopy={strategyCopy}
        onWindowChange={onWindowChange}
      />

      {strategyPresentation.detail.panels.map((panel) => (
        <Fragment key={panel.id}>
          {panel.render({
            copy,
            detail,
            isDarkTheme,
            ordersSectionLoaded,
            onMarioRefresh,
          })}
        </Fragment>
      ))}

      <StrategyDetailConfigSection
        copy={copy}
        detail={detail}
        isDarkTheme={isDarkTheme}
        signalSourceIdentityById={signalSourceIdentityById}
        strategyCopy={strategyCopy}
        strategyDefinition={strategyDefinition}
        strategyDefinitionError={strategyDefinitionError}
      />

      <StrategyDetailActionsSection
        copy={copy}
        detail={detail}
        hiddenActionIds={strategyPresentation.detail.hiddenActionIds}
        isDarkTheme={isDarkTheme}
        strategyCopy={strategyCopy}
        strategyDefinition={strategyDefinition}
        onActionCompleted={onActionCompleted}
      />

      <StrategyDetailPositionsSections
        copy={copy}
        copyPositionMarkPricesBySymbol={copyPositionMarkPricesBySymbol}
        detail={detail}
        isDarkTheme={isDarkTheme}
        positionsSectionLoaded={positionsSectionLoaded}
        signalSourcesSectionLoaded={signalSourcesSectionLoaded}
        strategyCopy={strategyCopy}
        strategyDefinition={strategyDefinition}
      />

      <StrategyTradeHistorySection
        allTradeHistoryRows={allTradeHistoryRows}
        canGoNext={canGoNext}
        canGoPrevious={canGoPrevious}
        copy={copy}
        error={detail.orderHistoryError}
        interval={interval}
        isDarkTheme={isDarkTheme}
        isKlineOpen={isKlineOpen}
        isLoaded={ordersSectionLoaded}
        rangeLabel={rangeLabel}
        rows={rows}
        sectionRef={sectionRef}
        selectedRow={selectedRow}
        strategy={strategy}
        strategyCopy={strategyCopy}
        telegramUser={telegramUser}
        onIntervalChange={onIntervalChange}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
        onRowKlineOpen={onRowKlineOpen}
        onToggleKline={onToggleKline}
      />
    </>
  );
}

type StrategyDetailLoadedSectionsProps = {
  activeCurveWindow: StrategyDetailCurveWindow;
  allTradeHistoryRows: readonly TradeHistoryRow[];
  canGoNext: boolean;
  canGoPrevious: boolean;
  copy: WorkspaceCopy;
  copyPositionMarkPricesBySymbol: CopyPositionMarkPricesBySymbol;
  curve: TradingFoxStrategyDetail["strategyCurve"];
  curveError?: string;
  curveWindows: readonly StrategyDetailCurveWindow[];
  detail: TradingFoxStrategyDetail;
  interval: KlineInterval;
  isCurveLoading: boolean;
  isDarkTheme: boolean;
  isKlineOpen: boolean;
  ordersSectionLoaded: boolean;
  positionsSectionLoaded: boolean;
  rangeLabel: string;
  rows: readonly TradeHistoryRow[];
  sectionRef: RefObject<HTMLElement | null>;
  selectedRow: TradeHistoryRow | null;
  signalSourceIdentityById: SignalSourceIdentityById;
  signalSourcesSectionLoaded: boolean;
  strategy: PrototypeStrategy;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  strategyDefinition: TradingFoxStrategyDefinition | null;
  strategyDefinitionError: string;
  strategyPresentation: StrategyPresentationModule;
  telegramUser: TelegramSessionUser | null;
  onActionCompleted: (detail?: TradingFoxStrategyDetail) => Promise<void> | void;
  onIntervalChange: (interval: KlineInterval) => void;
  onMarioRefresh: () => Promise<void> | void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onRowKlineOpen: (row: TradeHistoryRow) => void;
  onToggleKline: () => void;
  onWindowChange: (window: StrategyDetailCurveWindow) => void;
};
