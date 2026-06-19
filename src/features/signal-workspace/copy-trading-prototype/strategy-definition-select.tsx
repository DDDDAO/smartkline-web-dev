"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getWorkspaceLanguageFromLocale,
  type WorkspaceCopy,
  type WorkspaceLanguage,
} from "@/i18n/workspace";
import type { TradingFoxStrategyDefinitionSummary } from "@/lib/tradingfox-control-plane";
import { cn } from "@/lib/utils";
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
    ? "mt-2 h-auto min-h-14 w-full justify-between whitespace-normal rounded-2xl border-white/[0.085] bg-white/[0.04] px-3 py-2 text-left text-sm font-bold text-slate-100 hover:border-indigo-300/25 hover:bg-white/[0.065] focus-visible:border-indigo-400/45 focus-visible:ring-indigo-400/10"
    : "mt-2 h-auto min-h-14 w-full justify-between whitespace-normal rounded-2xl border-[#E8E8EC] bg-white px-3 py-2 text-left text-sm font-bold text-slate-950 shadow-sm hover:border-[#C7D2FE] hover:bg-[#FAFAFA] focus-visible:border-[#818CF8] focus-visible:ring-[#6366F1]/10";
  const dropdownClassName = isDarkTheme
    ? "absolute left-0 right-0 top-full z-[140] mt-2 overflow-hidden rounded-2xl border border-white/[0.085] bg-[#111820] p-1 text-slate-100 shadow-[0_22px_54px_rgba(0,0,0,0.42)]"
    : "absolute left-0 right-0 top-full z-[140] mt-2 overflow-hidden rounded-2xl border border-[#E8E8EC] bg-white p-1 text-slate-950 shadow-[0_22px_54px_rgba(15,23,42,0.16)]";
  const searchClassName = isDarkTheme
    ? "h-10 rounded-xl border-white/[0.075] bg-[#0F131A] text-xs font-medium text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-400/40 focus-visible:ring-indigo-400/10"
    : "h-10 rounded-xl border-[#E8E8EC] bg-[#FAFAFA] text-xs font-medium text-slate-900 placeholder:text-slate-400 focus-visible:border-[#C7D2FE] focus-visible:ring-[#6366F1]/10";

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
      <Button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={triggerClassName}
        type="button"
        variant="outline"
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
      </Button>
      {isOpen ? (
        <div className={dropdownClassName} role="listbox">
          <div className="p-2">
            <Input
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
                <Button
                  key={`${definition.id}:${definition.version}:${definition.configSchemaVersion}`}
                  aria-selected={isSelected}
                  className={cn(
                    "h-auto w-full cursor-pointer justify-between whitespace-normal rounded-xl px-3 py-2 text-left",
                    isDarkTheme
                      ? "text-slate-100 hover:bg-white/[0.055] focus-visible:bg-white/[0.055]"
                      : "text-slate-950 hover:bg-[#FAFAFA] focus-visible:bg-[#FAFAFA]",
                    isSelected && (isDarkTheme ? "bg-indigo-400/10 text-indigo-100" : "bg-[#EEF2FF] text-[#4F46E5]"),
                  )}
                  role="option"
                  type="button"
                  variant="ghost"
                  onClick={() => chooseDefinition(definition.id)}
                >
                  <StrategyDefinitionOptionContent copy={copy} definition={definition} isDarkTheme={isDarkTheme} language={language} />
                  {isSelected ? <span className="text-xs font-black">✓</span> : null}
                </Button>
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
    <Badge className={isDarkTheme ? "rounded-full border-0 bg-white/[0.055] px-2 py-0.5 text-[10px] font-black text-slate-400" : "rounded-full border-0 bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500"} variant="secondary">
      {children}
    </Badge>
  );
}
