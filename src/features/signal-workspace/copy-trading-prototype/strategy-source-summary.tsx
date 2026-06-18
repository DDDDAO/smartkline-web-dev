"use client";

import type { WorkspaceCopy } from "@/i18n/workspace";
import { SourceAvatar } from "../card-ui";
import { createCopyTradingSourceSummary, type CopyTradingSignalSourceSummaryItem } from "./copy-trading-signal-source-config";
import type { CopyTradingPrototypeTarget, PrototypeStrategy } from "./types";

export function StrategySourceSummary({
  availableSignalSources,
  copy,
  isDarkTheme,
  strategy,
}: {
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  strategy: PrototypeStrategy;
}) {
  const strategyCopy = copy.workspace.accountCenter.strategy;
  const strategyCreateCopy = copy.workspace.accountCenter.strategyCreate;
  const sources = createCopyTradingSourceSummary({ availableSignalSources, strategy });
  const visibleSources = sources.slice(0, 2);
  const moreCount = Math.max(0, sources.length - visibleSources.length);
  const title = sources.length > 1
    ? strategyCreateCopy.copyTradingSignalSourceCount(sources.length)
    : strategyCopy.followingSignalSource;

  if (sources.length === 0) {
    return null;
  }

  return (
    <div className={isDarkTheme ? "mt-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3" : "mt-3 rounded-2xl border border-[#E5EAF0] bg-white p-3"}>
      <div className={isDarkTheme ? "text-[10px] font-black uppercase tracking-[0.14em] text-slate-500" : "text-[10px] font-black uppercase tracking-[0.14em] text-slate-400"}>
        {title}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {visibleSources.map((source) => <StrategySourceChip key={source.id} isDarkTheme={isDarkTheme} source={source} />)}
        {moreCount > 0 ? (
          <span className={isDarkTheme ? "inline-flex items-center rounded-full bg-white/[0.055] px-3 py-1.5 text-xs font-black text-slate-300" : "inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600"}>
            {strategyCreateCopy.copyTradingMoreSignalSources(moreCount)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function StrategySourceChip({
  isDarkTheme,
  source,
}: {
  isDarkTheme: boolean;
  source: CopyTradingSignalSourceSummaryItem;
}) {
  const meta = [source.platform, source.id].filter(Boolean).join(" · ");
  const ratio = source.marginPercent === null ? "" : `${source.marginPercent}%`;
  return (
    <div className={isDarkTheme ? "flex min-w-0 items-center gap-2 rounded-2xl border border-white/[0.075] bg-[#0F131A]/70 px-3 py-2" : "flex min-w-0 items-center gap-2 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2"}>
      <SourceAvatar isDarkTheme={isDarkTheme} name={source.name} url={source.avatarUrl} />
      <span className="min-w-0">
        <span className={isDarkTheme ? "block truncate text-sm font-black text-slate-100" : "block truncate text-sm font-black text-slate-950"}>{source.name}</span>
        {meta ? <span className="block truncate text-xs font-bold text-slate-500">{meta}</span> : null}
      </span>
      {ratio ? <span className={isDarkTheme ? "shrink-0 rounded-full bg-sky-400/15 px-2 py-0.5 text-xs font-black text-sky-200" : "shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-black text-sky-700"}>{ratio}</span> : null}
    </div>
  );
}
