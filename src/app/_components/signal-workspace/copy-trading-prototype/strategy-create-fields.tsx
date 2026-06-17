"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import { SourceAvatar } from "../card-ui";
import { PercentInput } from "./prototype-form-fields";
import { getLabelClassName, getStrategyTypeOptionClassName } from "./styles";
import type { CopyTradingPrototypeTarget } from "./types";

export function CopyTradingCreateBody({
  accountCopy,
  availableSignalSources,
  copy,
  isDarkTheme,
  selectedSignalSource,
  stopLossPercent,
  takeProfitPercent,
  onSelectedSignalSourceIdChange,
  onStopLossPercentChange,
  onTakeProfitPercentChange,
}: {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  selectedSignalSource: CopyTradingPrototypeTarget | null;
  stopLossPercent: string;
  takeProfitPercent: string;
  onSelectedSignalSourceIdChange: (value: string) => void;
  onStopLossPercentChange: (value: string) => void;
  onTakeProfitPercentChange: (value: string) => void;
}) {
  const strategyCreateCopy = accountCopy.strategyCreate;
  return (
    <>
      <label className="block">
        <span className={getLabelClassName(isDarkTheme)}>{strategyCreateCopy.signalSourceSelect}</span>
        {availableSignalSources.length > 0 ? (
          <SignalSourceSelect
            copy={copy}
            isDarkTheme={isDarkTheme}
            sources={availableSignalSources}
            value={selectedSignalSource?.trader.trader_id ?? ""}
            onChange={onSelectedSignalSourceIdChange}
          />
        ) : (
          <div className={getInfoPanelClassName(isDarkTheme)}>
            {strategyCreateCopy.signalSourceEmpty}
          </div>
        )}
      </label>
      <div className={isDarkTheme ? "rounded-2xl border border-sky-300/15 bg-sky-300/[0.07] px-3 py-3" : "rounded-2xl border border-sky-100 bg-sky-50 px-3 py-3"}>
        <div className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.14em] text-sky-200/70" : "text-[11px] font-black uppercase tracking-[0.14em] text-sky-700/70"}>{strategyCreateCopy.followRatioLabel}</div>
        <div className={isDarkTheme ? "mt-1 text-sm font-black text-sky-100" : "mt-1 text-sm font-black text-sky-800"}>{strategyCreateCopy.followRatioValue}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PercentInput
          copyLabel={accountCopy.copyTrading.takeProfit}
          fieldName="create-take-profit"
          isDarkTheme={isDarkTheme}
          placeholder={accountCopy.copyTrading.takeProfitPlaceholder}
          value={takeProfitPercent}
          onChange={onTakeProfitPercentChange}
        />
        <PercentInput
          copyLabel={accountCopy.copyTrading.stopLoss}
          fieldName="create-stop-loss"
          isDarkTheme={isDarkTheme}
          placeholder={accountCopy.copyTrading.stopLossPlaceholder}
          value={stopLossPercent}
          onChange={onStopLossPercentChange}
        />
      </div>
      <div className={isDarkTheme ? "rounded-2xl border border-amber-300/15 bg-amber-300/[0.07] px-3 py-3 text-xs leading-5 text-amber-100/80" : "rounded-2xl border border-amber-100 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800"}>
        {strategyCreateCopy.copyTradingRiskNote}
      </div>
    </>
  );
}

export function StrategyTypeOptionButton({
  description,
  isDarkTheme,
  isSelected,
  title,
  onSelect,
}: {
  description: string;
  isDarkTheme: boolean;
  isSelected: boolean;
  title: string;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={getStrategyTypeOptionClassName(isDarkTheme, isSelected)}
      type="button"
      onClick={onSelect}
    >
      <span className="block text-sm font-black">{title}</span>
      <span className={isDarkTheme ? "mt-2 block text-xs leading-5 text-slate-400" : "mt-2 block text-xs leading-5 text-slate-600"}>{description}</span>
    </button>
  );
}

export function SignalSourceSelect({
  copy,
  isDarkTheme,
  sources,
  value,
  onChange,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  sources: readonly CopyTradingPrototypeTarget[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const strategyCreateCopy = copy.workspace.accountCenter.strategyCreate;
  const selectedSource = sources.find((source) => source.trader.trader_id === value) ?? sources[0];
  const filteredSources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return sources;
    }

    return sources.filter((source) => {
      return source.trader.name.toLowerCase().includes(normalizedQuery)
        || source.trader.trader_id.toLowerCase().includes(normalizedQuery)
        || source.trader.platform.toLowerCase().includes(normalizedQuery);
    });
  }, [query, sources]);
  const triggerClassName = isDarkTheme
    ? "mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-left text-sm font-bold text-slate-100 outline-none transition hover:bg-white/[0.055] focus:border-sky-400/45 focus:ring-2 focus:ring-sky-400/10"
    : "mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[#D5E4EF] bg-white px-3 py-2 text-left text-sm font-bold text-slate-950 shadow-sm outline-none transition hover:bg-[#F8FAFC] focus:border-[#7DBEFF] focus:ring-2 focus:ring-[#16AFF5]/10";
  const dropdownClassName = isDarkTheme
    ? "absolute left-0 right-0 top-full z-[130] mt-2 overflow-hidden rounded-2xl border border-white/[0.075] bg-[#111820] p-1 text-slate-100 shadow-[0_18px_44px_rgba(0,0,0,0.38)]"
    : "absolute left-0 right-0 top-full z-[130] mt-2 overflow-hidden rounded-2xl border border-[#D5E4EF] bg-white p-1 text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.14)]";
  const searchClassName = isDarkTheme
    ? "h-10 w-full rounded-xl border border-white/[0.075] bg-[#0F131A] px-3 text-xs font-medium text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/40"
    : "h-10 w-full rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#B7E8FC]";

  const chooseSource = (sourceId: string) => {
    onChange(sourceId);
    setIsOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    searchInputRef.current?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && containerRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        aria-expanded={isOpen}
        className={triggerClassName}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        {selectedSource ? <SignalSourceOptionContent copy={copy} isDarkTheme={isDarkTheme} target={selectedSource} /> : null}
        <span aria-hidden="true" className={isDarkTheme ? "text-xs text-slate-500" : "text-xs text-slate-400"}>⌄</span>
      </button>
      {isOpen ? (
        <div className={dropdownClassName}>
          <div className="p-2">
            <input
              ref={searchInputRef}
              aria-label={strategyCreateCopy.signalSourceSearchPlaceholder}
              className={searchClassName}
              placeholder={strategyCreateCopy.signalSourceSearchPlaceholder}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto px-2 pb-2">
            {filteredSources.length > 0 ? filteredSources.map((target) => {
              const isSelected = selectedSource ? target.trader.trader_id === selectedSource.trader.trader_id : false;
              return (
                <button
                  key={target.trader.trader_id}
                  className={isDarkTheme
                    ? `flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none transition hover:bg-white/[0.055] focus:bg-white/[0.055] ${isSelected ? "bg-sky-400/10 text-sky-100" : ""}`
                    : `flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none transition hover:bg-[#F8FAFC] focus:bg-[#F8FAFC] ${isSelected ? "bg-[#EAF8FE] text-[#007DB8]" : ""}`}
                  type="button"
                  onClick={() => chooseSource(target.trader.trader_id)}
                >
                  <SignalSourceOptionContent copy={copy} isDarkTheme={isDarkTheme} target={target} />
                  {isSelected ? <span className="text-xs font-black">✓</span> : null}
                </button>
              );
            }) : (
              <div className={isDarkTheme ? "rounded-xl px-3 py-4 text-center text-xs font-bold text-slate-500" : "rounded-xl px-3 py-4 text-center text-xs font-bold text-slate-500"}>
                {strategyCreateCopy.signalSourceNoMatches}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SignalSourceOptionContent({
  copy,
  isDarkTheme,
  target,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  target: CopyTradingPrototypeTarget;
}) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <SourceAvatar isDarkTheme={isDarkTheme} name={target.trader.name} url={target.trader.avatar} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black">{target.trader.name}</span>
        <span className={isDarkTheme ? "mt-0.5 block truncate text-xs font-semibold text-slate-500" : "mt-0.5 block truncate text-xs font-semibold text-slate-500"}>
          {target.trader.platform} · {copy.workspace.topSignals.currentPositions}: {target.positionsCount} · {copy.workspace.topSignals.tradeHistory}: {target.eventsCount}
        </span>
      </span>
    </span>
  );
}

function getInfoPanelClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "mt-2 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-sm font-bold text-slate-300"
    : "mt-2 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-3 text-sm font-bold text-slate-700";
}
