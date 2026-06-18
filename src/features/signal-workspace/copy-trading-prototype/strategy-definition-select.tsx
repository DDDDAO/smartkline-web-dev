"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import {
  getWorkspaceLanguageFromLocale,
  type WorkspaceCopy,
  type WorkspaceLanguage,
} from "@/i18n/workspace";
import type { TradingFoxStrategyDefinitionSummary } from "@/app/_lib/tradingfox-control-plane";
import {
  strategyDefinitionDescription,
  strategyDefinitionLabel,
} from "./strategy-display-metadata";

export function StrategyDefinitionSelect({
  copy,
  definitions,
  isDarkTheme,
  value,
  onChange,
}: {
  copy: WorkspaceCopy;
  definitions: readonly TradingFoxStrategyDefinitionSummary[];
  isDarkTheme: boolean;
  value: string;
  onChange: (definitionId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const strategyCreateCopy = copy.workspace.accountCenter.strategyCreate;
  const language = getWorkspaceLanguageFromLocale(useLocale());
  const selectedDefinition = definitions.find((definition) => definition.id === value) ?? definitions[0] ?? null;
  const filteredDefinitions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return definitions;
    }

    return definitions.filter((definition) => {
      const searchableText = [
        definition.id,
        definition.name,
        definition.description,
        strategyDefinitionLabel(definition, language),
        strategyDefinitionDescription(definition, language),
      ].join(" ").toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [definitions, language, query]);
  const triggerClassName = isDarkTheme
    ? "mt-2 flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.085] bg-white/[0.04] px-3 py-2 text-left text-sm font-bold text-slate-100 outline-none transition hover:border-sky-300/25 hover:bg-white/[0.065] focus:border-sky-400/45 focus:ring-2 focus:ring-sky-400/10"
    : "mt-2 flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-[#D5E4EF] bg-white px-3 py-2 text-left text-sm font-bold text-slate-950 shadow-sm outline-none transition hover:border-[#BFE7FB] hover:bg-[#F8FAFC] focus:border-[#7DBEFF] focus:ring-2 focus:ring-[#16AFF5]/10";
  const dropdownClassName = isDarkTheme
    ? "absolute left-0 right-0 top-full z-[140] mt-2 overflow-hidden rounded-2xl border border-white/[0.085] bg-[#111820] p-1 text-slate-100 shadow-[0_22px_54px_rgba(0,0,0,0.42)]"
    : "absolute left-0 right-0 top-full z-[140] mt-2 overflow-hidden rounded-2xl border border-[#D5E4EF] bg-white p-1 text-slate-950 shadow-[0_22px_54px_rgba(15,23,42,0.16)]";
  const searchClassName = isDarkTheme
    ? "h-10 w-full rounded-xl border border-white/[0.075] bg-[#0F131A] px-3 text-xs font-medium text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/40"
    : "h-10 w-full rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#B7E8FC]";

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

  const chooseDefinition = (definitionId: string) => {
    onChange(definitionId);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          event.stopPropagation();
          setIsOpen(false);
        }
      }}
    >
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={triggerClassName}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        {selectedDefinition ? (
          <StrategyDefinitionOptionContent
            copy={copy}
            definition={selectedDefinition}
            isDarkTheme={isDarkTheme}
            language={language}
          />
        ) : null}
        <span aria-hidden="true" className={isDarkTheme ? "text-xs text-slate-500" : "text-xs text-slate-400"}>⌄</span>
      </button>
      {isOpen ? (
        <div className={dropdownClassName} role="listbox">
          <div className="p-2">
            <input
              ref={searchInputRef}
              aria-label={strategyCreateCopy.definitionSearchPlaceholder}
              className={searchClassName}
              placeholder={strategyCreateCopy.definitionSearchPlaceholder}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="max-h-72 overflow-y-auto px-2 pb-2">
            {filteredDefinitions.length > 0 ? filteredDefinitions.map((definition) => {
              const isSelected = definition.id === selectedDefinition?.id;
              return (
                <button
                  key={`${definition.id}:${definition.version}:${definition.configSchemaVersion}`}
                  aria-selected={isSelected}
                  className={isDarkTheme
                    ? `flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none transition hover:bg-white/[0.055] focus:bg-white/[0.055] ${isSelected ? "bg-sky-400/10 text-sky-100" : ""}`
                    : `flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none transition hover:bg-[#F8FAFC] focus:bg-[#F8FAFC] ${isSelected ? "bg-[#EAF8FE] text-[#007DB8]" : ""}`}
                  role="option"
                  type="button"
                  onClick={() => chooseDefinition(definition.id)}
                >
                  <StrategyDefinitionOptionContent copy={copy} definition={definition} isDarkTheme={isDarkTheme} language={language} />
                  {isSelected ? <span className="text-xs font-black">✓</span> : null}
                </button>
              );
            }) : (
              <div className="rounded-xl px-3 py-4 text-center text-xs font-bold text-slate-500">
                {strategyCreateCopy.definitionNoMatches}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StrategyDefinitionOptionContent({
  copy,
  definition,
  isDarkTheme,
  language,
}: {
  copy: WorkspaceCopy;
  definition: TradingFoxStrategyDefinitionSummary;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
}) {
  const strategyCreateCopy = copy.workspace.accountCenter.strategyCreate;
  const label = strategyDefinitionLabel(definition, language);
  const description = strategyDefinitionDescription(definition, language, definition.id);
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-black">{label}</span>
      <span className={isDarkTheme ? "mt-1 block line-clamp-2 text-xs leading-5 text-slate-400" : "mt-1 block line-clamp-2 text-xs leading-5 text-slate-600"}>
        {description}
      </span>
      <span className="mt-2 flex flex-wrap gap-1.5">
        <MetaPill isDarkTheme={isDarkTheme}>{definition.id}</MetaPill>
        <MetaPill isDarkTheme={isDarkTheme}>{strategyCreateCopy.definitionVersionLabel(definition.version)}</MetaPill>
        <MetaPill isDarkTheme={isDarkTheme}>{strategyCreateCopy.definitionSchemaVersionLabel(definition.configSchemaVersion)}</MetaPill>
      </span>
    </span>
  );
}

function MetaPill({ children, isDarkTheme }: { children: string; isDarkTheme: boolean }) {
  return (
    <span className={isDarkTheme ? "rounded-full bg-white/[0.055] px-2 py-0.5 text-[10px] font-black text-slate-400" : "rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500"}>
      {children}
    </span>
  );
}
