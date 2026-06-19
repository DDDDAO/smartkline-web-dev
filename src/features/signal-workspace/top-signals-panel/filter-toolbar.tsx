import { useEffect, useMemo, useRef, useState } from "react";

import type { WorkspaceCopy } from "@/i18n/workspace";
import { SourceAvatar, SymbolIcon } from "../card-ui";
import type {
  TopSignalPerformanceWindow,
  TopSignalSortKey,
  TopSignalSourceModel,
} from "./helpers";
import {
  SMARTKLINE_SOURCE_AVATAR_STYLE,
  TOP_SIGNAL_PERFORMANCE_WINDOWS,
  TOP_SIGNAL_SORT_OPTIONS,
} from "./constants";

export function TopSignalsSourceFilterBar({
  activeSourceId,
  allLabel,
  isDarkTheme,
  models,
  searchPlaceholder,
  onSourceChange,
}: {
  activeSourceId: string;
  allLabel: string;
  isDarkTheme: boolean;
  models: readonly TopSignalSourceModel[];
  searchPlaceholder: string;
  onSourceChange: (sourceId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const activeModel = models.find((model) => model.trader.trader_id === activeSourceId) ?? null;
  const selectedLabel = activeModel?.trader.name ?? allLabel;
  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return models;
    }

    return models.filter((model) => {
      return model.trader.name.toLowerCase().includes(normalizedQuery)
        || model.trader.trader_id.toLowerCase().includes(normalizedQuery)
        || model.trader.platform.toLowerCase().includes(normalizedQuery);
    });
  }, [models, query]);
  const shellClassName = isDarkTheme
    ? "relative rounded-[20px] border border-white/[0.075] bg-[#181A20] p-2"
    : "relative rounded-[20px] border border-[#E8E8EC] bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.035)]";
  const triggerClassName = isDarkTheme
    ? "flex h-9 w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 text-left text-xs font-bold text-slate-200 transition hover:bg-white/[0.07]"
    : "flex h-9 w-full items-center justify-between gap-3 rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 text-left text-xs font-bold text-slate-700 transition hover:border-[#C7D2FE] hover:bg-[#EEF2FF]";
  const dropdownClassName = isDarkTheme
    ? "absolute left-2 right-2 top-[calc(100%-4px)] z-30 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#181A20] shadow-[0_18px_46px_rgba(0,0,0,0.36)]"
    : "absolute left-2 right-2 top-[calc(100%-4px)] z-30 overflow-hidden rounded-2xl border border-[#E8E8EC] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.14)]";
  const searchClassName = isDarkTheme
    ? "h-9 w-full rounded-xl border border-white/[0.075] bg-[#0F131A] px-3 text-xs font-medium text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-400/40"
    : "h-9 w-full rounded-xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#C7D2FE]";

  const chooseSource = (sourceId: string) => {
    onSourceChange(sourceId);
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
    <div ref={containerRef} className={shellClassName}>
      <button
        aria-expanded={isOpen}
        className={triggerClassName}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          {activeModel ? (
            <SourceAvatarMini isActive={false} isDarkTheme={isDarkTheme} name={activeModel.trader.name} url={activeModel.trader.avatar} />
          ) : (
            <SmartKlineSourceAvatarMini isActive={false} isDarkTheme={isDarkTheme} />
          )}
          <span className="truncate">{selectedLabel}</span>
        </span>
        <span className={isDarkTheme ? "text-[10px] text-slate-500" : "text-[10px] text-slate-400"}>⌄</span>
      </button>
      {isOpen ? (
        <div className={dropdownClassName}>
          <div className="p-2">
            <input
              ref={searchInputRef}
              aria-label={searchPlaceholder}
              className={searchClassName}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClick={(event) => event.stopPropagation()}
            />
          </div>
          <div className="max-h-64 overflow-y-auto px-2 pb-2">
            <SourceFilterOption
              isActive={activeSourceId === "all" || !activeModel}
              isDarkTheme={isDarkTheme}
              label={allLabel}
              onClick={() => chooseSource("all")}
            />
            {filteredModels.map((model) => (
              <SourceFilterOption
                key={model.trader.trader_id}
                isActive={model.trader.trader_id === activeSourceId}
                isDarkTheme={isDarkTheme}
                label={model.trader.name}
                meta={model.trader.platform}
                name={model.trader.name}
                url={model.trader.avatar}
                onClick={() => chooseSource(model.trader.trader_id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SourceFilterOption({
  isActive,
  isDarkTheme,
  label,
  meta,
  name,
  url,
  onClick,
}: {
  isActive: boolean;
  isDarkTheme: boolean;
  label: string;
  meta?: string;
  name?: string;
  url?: string | null;
  onClick: () => void;
}) {
  const className = isActive
    ? "flex w-full items-center gap-2 rounded-xl bg-[#6366F1] px-2.5 py-2 text-left text-xs font-black text-white"
    : isDarkTheme
      ? "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-bold text-slate-300 transition hover:bg-white/[0.06]"
      : "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-[#F5F5FF]";

  return (
    <button className={className} type="button" onClick={onClick}>
      {name ? (
        <SourceAvatarMini isActive={isActive} isDarkTheme={isDarkTheme} name={name} url={url ?? null} />
      ) : (
        <SmartKlineSourceAvatarMini isActive={isActive} isDarkTheme={isDarkTheme} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {meta ? <span className={isActive ? "block truncate text-[10px] text-white/70" : isDarkTheme ? "block truncate text-[10px] text-slate-500" : "block truncate text-[10px] text-slate-400"}>{meta}</span> : null}
      </span>
    </button>
  );
}

export function TopSignalPerformanceToolbar({
  copy,
  isDarkTheme,
  performanceWindow,
  sortKey,
  onPerformanceWindowChange,
  onSortKeyChange,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  performanceWindow: TopSignalPerformanceWindow;
  sortKey: TopSignalSortKey;
  onPerformanceWindowChange: (window: TopSignalPerformanceWindow) => void;
  onSortKeyChange: (sortKey: TopSignalSortKey) => void;
}) {
  const panelCopy = copy.workspace.topSignals;
  const shellClassName = isDarkTheme
    ? "rounded-[20px] border border-white/[0.075] bg-[#181A20] p-3"
    : "rounded-[20px] border border-[#E8E8EC] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)]";
  const labelClassName = isDarkTheme
    ? "text-[10px] font-black uppercase tracking-[0.12em] text-slate-500"
    : "text-[10px] font-black uppercase tracking-[0.12em] text-slate-400";
  const selectClassName = isDarkTheme
    ? "h-9 rounded-2xl border border-white/[0.075] bg-[#0F131A] px-3 text-xs font-bold text-slate-100 outline-none transition focus:border-indigo-400/45"
    : "h-9 rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-[#818CF8]";

  return (
    <section className={shellClassName}>
      <div className="grid gap-3">
        <div>
          <div className={labelClassName}>{panelCopy.performanceWindow}</div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {TOP_SIGNAL_PERFORMANCE_WINDOWS.map((window) => {
              const isActive = window === performanceWindow;
              const buttonClassName = isActive
                ? "rounded-2xl bg-[#6366F1] px-2.5 py-2 text-xs font-black text-white shadow-[0_10px_22px_rgba(99,102,241,0.20)]"
                : isDarkTheme
                  ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-2.5 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/[0.065]"
                  : "rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-2.5 py-2 text-xs font-bold text-slate-600 transition hover:border-[#C7D2FE] hover:bg-[#F5F5FF]";
              return (
                <button
                  key={window}
                  aria-pressed={isActive}
                  className={buttonClassName}
                  type="button"
                  onClick={() => onPerformanceWindowChange(window)}
                >
                  {panelCopy.performanceWindows[window]}
                </button>
              );
            })}
          </div>
        </div>
        <label className="grid gap-2">
          <span className={labelClassName}>{panelCopy.sortBy}</span>
          <select
            className={selectClassName}
            value={sortKey}
            onChange={(event) => onSortKeyChange(event.target.value as TopSignalSortKey)}
          >
            {TOP_SIGNAL_SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {panelCopy.sortOptions[option]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

export function SmartKlineSourceAvatarMini({
  isActive,
  isDarkTheme,
}: {
  isActive: boolean;
  isDarkTheme: boolean;
}) {
  const className = isActive
    ? "h-6 w-6 border-white/60 bg-white"
    : isDarkTheme
      ? "h-6 w-6 border-white/[0.10] bg-white"
      : "h-6 w-6 border-white bg-white";

  return (
    <span aria-hidden="true" className={`block shrink-0 overflow-hidden rounded-full border ${className}`}>
      <span className="block h-full w-full" style={SMARTKLINE_SOURCE_AVATAR_STYLE} />
    </span>
  );
}

export function SourceAvatarMini({
  isActive,
  isDarkTheme,
  name,
  url,
}: {
  isActive: boolean;
  isDarkTheme: boolean;
  name: string;
  url: string | null;
}) {
  const className = isActive
    ? "h-6 w-6 border-white/40"
    : isDarkTheme
      ? "h-6 w-6 border-white/[0.08]"
      : "h-6 w-6 border-white";

  return (
    <span className={`block shrink-0 overflow-hidden rounded-full border ${className}`}>
      <span
        aria-hidden="true"
        className="block h-full w-full bg-cover bg-center"
        style={url ? { backgroundImage: `url("${url}")` } : undefined}
      >
        {!url ? (
          <span className="grid h-full w-full place-items-center bg-[#6366F1] text-[10px] font-black text-white">
            {name.trim().slice(0, 1).toUpperCase() || "S"}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function WatchedTopSignalSources({
  copy,
  isDarkTheme,
  sources,
  onSourceOpen,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  sources: readonly TopSignalSourceModel[];
  onSourceOpen: (model: TopSignalSourceModel) => void;
}) {
  const shellClassName = isDarkTheme
    ? "rounded-[20px] border border-white/[0.075] bg-[#181A20] p-3"
    : "rounded-[20px] border border-[#E8E8EC] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)]";
  const cardClassName = isDarkTheme
    ? "min-w-0 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-left transition hover:border-indigo-500/30 hover:bg-white/[0.065]"
    : "min-w-0 rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 py-2 text-left transition hover:border-[#C7D2FE] hover:bg-[#F5F5FF]";

  return (
    <section className={shellClassName}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={isDarkTheme ? "text-xs font-black text-slate-50" : "text-xs font-black text-slate-950"}>
          {copy.workspace.watchlist.favoriteSources}
        </h3>
        <span className={isDarkTheme ? "text-[10px] font-medium text-slate-500" : "text-[10px] font-medium text-slate-400"}>
          {copy.workspace.watchlist.favoriteCount(sources.length)}
        </span>
      </div>
      <div className="mt-2 grid max-h-[292px] grid-cols-2 gap-2 overflow-y-auto pr-1">
        {sources.map((model) => {
          const latestPosition = model.positions[0] ?? null;
          const latestEvent = model.events[0] ?? null;
          const symbol = latestPosition?.symbol ?? latestEvent?.symbol ?? null;

          return (
            <button
              key={model.trader.trader_id}
              className={cardClassName}
              type="button"
              onClick={() => onSourceOpen(model)}
            >
              <div className="flex min-w-0 items-center gap-2">
                <SourceAvatar
                  isDarkTheme={isDarkTheme}
                  name={model.trader.name}
                  url={model.trader.avatar}
                />
                <div className="min-w-0 flex-1">
                  <div className={isDarkTheme ? "truncate text-xs font-black text-slate-50" : "truncate text-xs font-black text-slate-950"}>
                    {model.trader.name}
                  </div>
                  <div className={isDarkTheme ? "mt-1 flex items-center gap-1.5 text-[10px] text-slate-500" : "mt-1 flex items-center gap-1.5 text-[10px] text-slate-500"}>
                    <span>{copy.workspace.watchlist.positions}: {model.positions.length}</span>
                    <span>·</span>
                    <span>{copy.workspace.watchlist.trades}: {model.events.length}</span>
                  </div>
                </div>
              </div>
              <div className={isDarkTheme ? "mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-300" : "mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700"}>
                {symbol ? <SymbolIcon symbol={symbol} /> : null}
                <span>{symbol ?? copy.workspace.watchlist.noActiveSymbols}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
