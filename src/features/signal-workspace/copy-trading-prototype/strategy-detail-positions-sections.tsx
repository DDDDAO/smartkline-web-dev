"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTradingFoxErrorMessage } from "@/lib/tradingfox-errors";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TradingFoxStrategyDefinition, TradingFoxStrategyDetail } from "@/lib/tradingfox-control-plane";
import {
  CopyPositionTable,
  PositionSummaryPanel,
  SignalSourcePositionTable,
  createCopyPositionSummary,
  createSignalSourcePositionSummary,
} from "./strategy-detail-content";
import type { CopyPositionMarkPricesBySymbol } from "./strategy-detail-shared";
import { getInlineErrorClassName } from "./styles";

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
    <Card className={isDarkTheme ? "gap-0 rounded-[24px] border-white/[0.075] bg-white/[0.035] p-4 text-slate-100 shadow-none" : "gap-0 rounded-[24px] border-[#E5EAF0] bg-white p-4 text-slate-950 shadow-sm"}>
      <Tabs value={activeTab} onValueChange={(value) => setSelectedTab(value as PositionTabId)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-black">{strategyCopy.currentPositions}</h3>
          <TabsList className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035]" : "rounded-2xl border border-[#D5E4EF] bg-[#F8FAFC]"}>
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                className={isDarkTheme ? "rounded-xl data-[state=active]:bg-sky-400/16 data-[state=active]:text-sky-200 data-[state=inactive]:text-slate-500" : "rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#008DCC] data-[state=inactive]:text-slate-500"}
                value={tab.id}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent className="mt-3" value="trader">
          <TraderPositionsPanel
            copy={copy}
            detail={detail}
            isDarkTheme={isDarkTheme}
            positionsSectionLoaded={positionsSectionLoaded}
            strategyCopy={strategyCopy}
          />
        </TabsContent>
        <TabsContent className="mt-3" value="signalSources">
          <SignalSourcePositionsPanel
            copy={copy}
            copyPositionMarkPricesBySymbol={copyPositionMarkPricesBySymbol}
            detail={detail}
            isDarkTheme={isDarkTheme}
            signalSourcesSectionLoaded={signalSourcesSectionLoaded}
            strategyCopy={strategyCopy}
          />
        </TabsContent>
      </Tabs>
    </Card>
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
