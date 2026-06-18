"use client";

import { useState } from "react";
import { getTradingFoxErrorMessage } from "@/app/_lib/tradingfox-errors";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TradingFoxStrategyDefinition, TradingFoxStrategyDetail } from "@/app/_lib/tradingfox-control-plane";
import {
  CopyPositionTable,
  PositionSummaryPanel,
  SignalSourcePositionTable,
  createCopyPositionSummary,
  createSignalSourcePositionSummary,
} from "./strategy-detail-content";
import type { CopyPositionMarkPricesBySymbol } from "./strategy-detail-shared";
import { getInlineErrorClassName, getModalSectionClassName } from "./styles";

type PositionTabId = "signalSources" | "trader";

export function StrategyDetailPositionsSections({
  copy,
  copyPositionMarkPricesBySymbol,
  detail,
  isDarkTheme,
  positionsSectionLoaded,
  signalSourcesSectionLoaded,
  strategyCopy,
  strategyDefinition,
}: {
  copy: WorkspaceCopy;
  copyPositionMarkPricesBySymbol: CopyPositionMarkPricesBySymbol;
  detail: TradingFoxStrategyDetail;
  isDarkTheme: boolean;
  positionsSectionLoaded: boolean;
  signalSourcesSectionLoaded: boolean;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  strategyDefinition: TradingFoxStrategyDefinition | null;
}) {
  const supportsPositionQuery = strategyDefinition?.capabilities.supportsPositionQuery ?? true;
  const supportsSignalSources = strategyDefinition?.capabilities.supportsSignalSources ?? detail.signalSources.length > 0;
  const tabs = [
    ...(supportsPositionQuery ? [{ id: "trader" as const, label: strategyCopy.traderPositions }] : []),
    ...(supportsSignalSources ? [{ id: "signalSources" as const, label: strategyCopy.signalSourcePositions }] : []),
  ];
  const [selectedTab, setSelectedTab] = useState<PositionTabId>(tabs[0]?.id ?? "trader");
  const activeTab = tabs.some((tab) => tab.id === selectedTab) ? selectedTab : tabs[0]?.id;

  if (!activeTab) {
    return null;
  }

  return (
    <section className={getModalSectionClassName(isDarkTheme)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-black">{strategyCopy.currentPositions}</h3>
        <div className={isDarkTheme ? "inline-flex rounded-2xl border border-white/[0.075] bg-white/[0.035] p-1" : "inline-flex rounded-2xl border border-[#D5E4EF] bg-[#F8FAFC] p-1"}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={getPositionTabClassName(isDarkTheme, activeTab === tab.id)}
              type="button"
              onClick={() => setSelectedTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "trader" ? (
        <TraderPositionsPanel
          copy={copy}
          detail={detail}
          isDarkTheme={isDarkTheme}
          positionsSectionLoaded={positionsSectionLoaded}
          strategyCopy={strategyCopy}
        />
      ) : (
        <SignalSourcePositionsPanel
          copy={copy}
          copyPositionMarkPricesBySymbol={copyPositionMarkPricesBySymbol}
          detail={detail}
          isDarkTheme={isDarkTheme}
          signalSourcesSectionLoaded={signalSourcesSectionLoaded}
          strategyCopy={strategyCopy}
        />
      )}
    </section>
  );
}

function TraderPositionsPanel({
  copy,
  detail,
  isDarkTheme,
  positionsSectionLoaded,
  strategyCopy,
}: {
  copy: WorkspaceCopy;
  detail: TradingFoxStrategyDetail;
  isDarkTheme: boolean;
  positionsSectionLoaded: boolean;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
}) {
  if (!positionsSectionLoaded) {
    return <div className={isDarkTheme ? "mt-3 text-sm text-slate-500" : "mt-3 text-sm text-slate-500"}>{strategyCopy.loadingDetail}</div>;
  }

  if (detail.positionsError) {
    return <p className={getInlineErrorClassName(isDarkTheme)}>{getTradingFoxErrorMessage(detail.positionsError, copy)}</p>;
  }

  if (detail.positions.length === 0) {
    return <div className={isDarkTheme ? "mt-3 text-sm text-slate-500" : "mt-3 text-sm text-slate-500"}>{strategyCopy.traderPositionsEmpty}</div>;
  }

  return (
    <>
      <PositionSummaryPanel
        isDarkTheme={isDarkTheme}
        strategyCopy={strategyCopy}
        summary={createCopyPositionSummary(detail)}
      />
      <CopyPositionTable isDarkTheme={isDarkTheme} positions={detail.positions} strategyCopy={strategyCopy} />
    </>
  );
}

function SignalSourcePositionsPanel({
  copy,
  copyPositionMarkPricesBySymbol,
  detail,
  isDarkTheme,
  signalSourcesSectionLoaded,
  strategyCopy,
}: {
  copy: WorkspaceCopy;
  copyPositionMarkPricesBySymbol: CopyPositionMarkPricesBySymbol;
  detail: TradingFoxStrategyDetail;
  isDarkTheme: boolean;
  signalSourcesSectionLoaded: boolean;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
}) {
  if (!signalSourcesSectionLoaded) {
    return <div className={isDarkTheme ? "mt-3 text-sm text-slate-500" : "mt-3 text-sm text-slate-500"}>{strategyCopy.loadingDetail}</div>;
  }

  if (detail.signalSourcesError) {
    return <p className={getInlineErrorClassName(isDarkTheme)}>{getTradingFoxErrorMessage(detail.signalSourcesError, copy)}</p>;
  }

  return (
    <div className="mt-3 grid gap-2">
      {detail.signalSources.length > 0 ? detail.signalSources.map((source) => (
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
      )) : <div className={isDarkTheme ? "text-sm text-slate-500" : "text-sm text-slate-500"}>{strategyCopy.signalSourcePositionsEmpty}</div>}
    </div>
  );
}

function getPositionTabClassName(isDarkTheme: boolean, isActive: boolean): string {
  if (isActive) {
    return isDarkTheme
      ? "rounded-xl bg-sky-400/16 px-3 py-2 text-xs font-black text-sky-200"
      : "rounded-xl bg-white px-3 py-2 text-xs font-black text-[#008DCC] shadow-sm";
  }
  return isDarkTheme
    ? "rounded-xl px-3 py-2 text-xs font-black text-slate-500 transition hover:text-slate-200"
    : "rounded-xl px-3 py-2 text-xs font-black text-slate-500 transition hover:text-slate-900";
}
