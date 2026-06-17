"use client";

import { getTradingFoxErrorMessage } from "@/app/_lib/tradingfox-errors";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { TradingFoxStrategyDetail } from "@/app/_lib/tradingfox-control-plane";
import {
  CopyPositionTable,
  PositionSummaryPanel,
  SignalSourcePositionTable,
  createCopyPositionSummary,
  createSignalSourcePositionSummary,
} from "./strategy-detail-content";
import type { CopyPositionMarkPricesBySymbol } from "./strategy-detail-shared";
import { getInlineErrorClassName, getModalSectionClassName } from "./styles";

export function StrategyDetailPositionsSections({
  copy,
  copyPositionMarkPricesBySymbol,
  detail,
  isDarkTheme,
  positionsSectionLoaded,
  signalSourcesSectionLoaded,
  strategyCopy,
}: {
  copy: WorkspaceCopy;
  copyPositionMarkPricesBySymbol: CopyPositionMarkPricesBySymbol;
  detail: TradingFoxStrategyDetail;
  isDarkTheme: boolean;
  positionsSectionLoaded: boolean;
  signalSourcesSectionLoaded: boolean;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
}) {
  return (
    <>
      <section className={getModalSectionClassName(isDarkTheme)}>
        <h3 className="text-sm font-black">{strategyCopy.copyPositions}</h3>
        {!positionsSectionLoaded ? (
          <div className={isDarkTheme ? "mt-3 text-sm text-slate-500" : "mt-3 text-sm text-slate-500"}>{strategyCopy.loadingDetail}</div>
        ) : detail.positionsError ? <p className={getInlineErrorClassName(isDarkTheme)}>{getTradingFoxErrorMessage(detail.positionsError, copy)}</p> : null}
        {positionsSectionLoaded && detail.positions.length > 0 ? (
          <>
            <PositionSummaryPanel
              isDarkTheme={isDarkTheme}
              strategyCopy={strategyCopy}
              summary={createCopyPositionSummary(detail)}
            />
            <CopyPositionTable isDarkTheme={isDarkTheme} positions={detail.positions} strategyCopy={strategyCopy} />
          </>
        ) : positionsSectionLoaded ? <div className={isDarkTheme ? "mt-3 text-sm text-slate-500" : "mt-3 text-sm text-slate-500"}>{strategyCopy.copyPositionsEmpty}</div> : null}
      </section>

      <section className={getModalSectionClassName(isDarkTheme)}>
        <h3 className="text-sm font-black">{strategyCopy.signalSourcePositions}</h3>
        {!signalSourcesSectionLoaded ? (
          <div className={isDarkTheme ? "mt-3 text-sm text-slate-500" : "mt-3 text-sm text-slate-500"}>{strategyCopy.loadingDetail}</div>
        ) : detail.signalSourcesError ? <p className={getInlineErrorClassName(isDarkTheme)}>{getTradingFoxErrorMessage(detail.signalSourcesError, copy)}</p> : null}
        <div className="mt-3 grid gap-2">
          {signalSourcesSectionLoaded && detail.signalSources.length > 0 ? detail.signalSources.map((source) => (
            <div key={source.signalSourceId} className={isDarkTheme ? "rounded-2xl bg-white/[0.035] p-3" : "rounded-2xl bg-[#F8FAFC] p-3"}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-black">{source.name || source.signalSourceId}</div>
                <div className={isDarkTheme ? "text-xs font-bold text-slate-500" : "text-xs font-bold text-slate-500"}>{strategyCopy.followSide}: {source.followSide || "both"}</div>
              </div>
              <PositionSummaryPanel
                isDarkTheme={isDarkTheme}
                strategyCopy={strategyCopy}
                summary={createSignalSourcePositionSummary(source, copyPositionMarkPricesBySymbol)}
              />
              {source.positions.length > 0 ? (
                <SignalSourcePositionTable
                  copyPositionMarkPricesBySymbol={copyPositionMarkPricesBySymbol}
                  isDarkTheme={isDarkTheme}
                  positions={source.positions}
                  strategyCopy={strategyCopy}
                />
              ) : <div className={isDarkTheme ? "mt-3 text-xs text-slate-500" : "mt-3 text-xs text-slate-500"}>{strategyCopy.signalSourcePositionsEmpty}</div>}
            </div>
          )) : signalSourcesSectionLoaded ? <div className={isDarkTheme ? "text-sm text-slate-500" : "text-sm text-slate-500"}>{strategyCopy.signalSourcePositionsEmpty}</div> : null}
        </div>
      </section>
    </>
  );
}
