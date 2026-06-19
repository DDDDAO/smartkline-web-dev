"use client";

import { useMemo, useState } from "react";
import type { MarketSymbol } from "@/types/market";

type MarketSymbolSearchVariant = "mario" | "workspace";

export function MarketSymbolSearchInput({
  className = "",
  formatSymbolLabel = (symbol) => symbol,
  id,
  isDarkTheme,
  marketOptions,
  noMatchesLabel,
  placeholder,
  suffixLabel = "USDT-M",
  symbol,
  variant = "workspace",
  onSymbolChange,
}: {
  className?: string;
  formatSymbolLabel?: (symbol: MarketSymbol) => string;
  id: string;
  isDarkTheme: boolean;
  marketOptions: readonly MarketSymbol[];
  noMatchesLabel: string;
  placeholder: string;
  suffixLabel?: string;
  symbol: MarketSymbol;
  variant?: MarketSymbolSearchVariant;
  onSymbolChange: (symbol: MarketSymbol) => void;
}) {
  const [query, setQuery] = useState(formatSymbolLabel(symbol));
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const normalizedQuery = query.trim().toUpperCase();
  const matchedMarkets = useMemo(() => {
    if (normalizedQuery.length === 0) {
      return marketOptions;
    }

    return marketOptions
      .map((market, index) => ({
        index,
        market,
        score: scoreMarketSymbolMatch(market, normalizedQuery),
      }))
      .filter(isRankedMarketSymbolSearchResult)
      .sort((left, right) => {
        if (left.score !== right.score) {
          return left.score - right.score;
        }

        return left.index - right.index;
      })
      .map((result) => result.market);
  }, [marketOptions, normalizedQuery]);

  const classes = getVariantClasses(variant, isDarkTheme, isOpen);

  const selectMarket = (selectedMarket: MarketSymbol) => {
    onSymbolChange(selectedMarket);
    setQuery(formatSymbolLabel(selectedMarket));
    setIsOpen(false);
  };

  return (
    <div
      className={`${classes.root}${className ? ` ${className}` : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setQuery(formatSymbolLabel(symbol));
        }
      }}
    >
      <SearchIcon className={classes.icon} />
      <input
        aria-autocomplete="list"
        aria-controls={`${id}-listbox`}
        aria-expanded={isOpen}
        aria-label={placeholder}
        className={classes.input}
        id={id}
        name={id}
        placeholder={placeholder}
        role="combobox"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => {
          setQuery("");
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            setHighlightedIndex((currentIndex) => Math.min(currentIndex + 1, Math.max(matchedMarkets.length - 1, 0)));
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlightedIndex((currentIndex) => Math.max(currentIndex - 1, 0));
          }

          if (event.key === "Enter") {
            event.preventDefault();
            const selectedMarket = matchedMarkets[highlightedIndex];
            if (selectedMarket) {
              selectMarket(selectedMarket);
            }
          }

          if (event.key === "Escape") {
            setIsOpen(false);
            setQuery(formatSymbolLabel(symbol));
          }
        }}
      />
      {isOpen ? (
        <div className={classes.dropdown} id={`${id}-listbox`} role="listbox" tabIndex={-1}>
          {matchedMarkets.length > 0 ? matchedMarkets.map((market, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <button
                key={market}
                aria-selected={isHighlighted}
                className={getOptionClassName(variant, isDarkTheme, isHighlighted)}
                role="option"
                type="button"
                onClick={() => selectMarket(market)}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span>{formatSymbolLabel(market)}</span>
                <span className={classes.suffix}>{suffixLabel}</span>
              </button>
            );
          }) : (
            <div className={classes.empty}>{noMatchesLabel}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

type VariantClasses = {
  dropdown: string;
  empty: string;
  icon: string;
  input: string;
  root: string;
  suffix: string;
};

function getVariantClasses(
  variant: MarketSymbolSearchVariant,
  isDarkTheme: boolean,
  isOpen: boolean,
): VariantClasses {
  if (variant === "mario") {
    return {
      dropdown: "market-symbol-search-dropdown",
      empty: "market-symbol-search-empty",
      icon: `market-symbol-search-icon${isOpen ? " is-open" : ""}`,
      input: "market-symbol-search-input",
      root: "market-symbol-search market-symbol-search--mario",
      suffix: "market-symbol-search-suffix",
    };
  }

  return {
    dropdown: isDarkTheme
      ? "absolute left-0 top-10 z-[90] max-h-[min(60dvh,20rem)] w-full overflow-y-auto rounded-2xl border border-white/[0.075] bg-[#181A20] p-1 shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:w-[280px] lg:top-11"
      : "absolute left-0 top-10 z-[90] max-h-[min(60dvh,20rem)] w-full overflow-y-auto rounded-2xl border border-[#E8E8EC] bg-white p-1 shadow-[0_18px_60px_rgba(15,23,42,0.10)] sm:w-[280px] lg:top-11",
    empty: isDarkTheme ? "px-3 py-3 text-xs text-slate-500" : "px-3 py-3 text-xs text-slate-400",
    icon: `pointer-events-none absolute left-4 top-[15px] h-3.5 w-3.5 -translate-y-1/2 text-slate-400 transition-opacity lg:top-[18px] ${isOpen ? "opacity-100" : "opacity-0"}`,
    input: isDarkTheme
      ? `h-[30px] w-full rounded-full border border-white/[0.075] bg-white/[0.035] py-0 pr-4 text-xs font-medium text-slate-100 outline-none placeholder:text-slate-500 transition-[border-color,background-color,padding] focus:border-[#6366F1] sm:w-[220px] lg:h-9 lg:w-[260px] lg:text-sm ${isOpen ? "pl-9" : "pl-4"}`
      : `h-[30px] w-full rounded-full border border-[#E8E8EC] bg-[#FAFAFA] py-0 pr-4 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 transition-[border-color,background-color,padding] focus:border-[#6366F1] focus:bg-[#FAFAFA] sm:w-[220px] lg:h-9 lg:w-[260px] lg:text-sm ${isOpen ? "pl-9" : "pl-4"}`,
    root: "relative z-[90] w-full sm:w-auto",
    suffix: isDarkTheme ? "text-[11px] text-slate-500" : "text-[11px] text-slate-400",
  };
}

function getOptionClassName(
  variant: MarketSymbolSearchVariant,
  isDarkTheme: boolean,
  isHighlighted: boolean,
): string {
  if (variant === "mario") {
    return `market-symbol-search-option${isHighlighted ? " active" : ""}`;
  }

  if (isHighlighted) {
    return isDarkTheme
      ? "flex w-full items-center justify-between rounded-xl bg-[#6366F1] px-3 py-2 text-left text-xs font-semibold text-white"
      : "flex w-full items-center justify-between rounded-xl bg-[#EEF2FF] px-3 py-2 text-left text-xs font-semibold text-[#4F46E5]";
  }

  return isDarkTheme
    ? "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/[0.08]"
    : "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50";
}

type MarketSymbolSearchResult = {
  index: number;
  market: MarketSymbol;
  score: number | null;
};

type RankedMarketSymbolSearchResult = MarketSymbolSearchResult & {
  score: number;
};

function isRankedMarketSymbolSearchResult(
  result: MarketSymbolSearchResult,
): result is RankedMarketSymbolSearchResult {
  return result.score !== null;
}

function scoreMarketSymbolMatch(
  market: MarketSymbol,
  normalizedQuery: string,
): number | null {
  const baseSymbol = market.split("/")[0]?.toUpperCase() ?? "";
  const compactSymbol = market.replace("/USDT:USDT", "USDT").toUpperCase();
  const fullSymbol = market.toUpperCase();
  const baseIndex = baseSymbol.indexOf(normalizedQuery);
  const compactIndex = compactSymbol.indexOf(normalizedQuery);
  const fullIndex = fullSymbol.indexOf(normalizedQuery);

  if (baseSymbol === normalizedQuery) {
    return 0;
  }

  if (compactSymbol === normalizedQuery) {
    return 1;
  }

  if (baseSymbol.startsWith(normalizedQuery)) {
    return 10 + baseSymbol.length;
  }

  if (compactSymbol.startsWith(normalizedQuery)) {
    return 30 + compactSymbol.length;
  }

  if (baseIndex >= 0) {
    return 50 + baseIndex * 100 + baseSymbol.length;
  }

  if (compactIndex >= 0) {
    return 80 + compactIndex * 100 + compactSymbol.length;
  }

  if (fullIndex >= 0) {
    return 120 + fullIndex * 100 + fullSymbol.length;
  }

  return null;
}

function SearchIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="m20 20-4.2-4.2m1.7-5.1a6.8 6.8 0 1 1-13.6 0 6.8 6.8 0 0 1 13.6 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
