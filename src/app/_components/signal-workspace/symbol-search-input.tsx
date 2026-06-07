import { useMemo, useState } from "react";
import { getWorkspaceCopy, type WorkspaceLanguage } from "@/app/_lib/i18n";
import type { MarketSymbol } from "@/app/_types/market";

export function SymbolSearchInput({
  isDarkTheme,
  language,
  marketOptions,
  symbol,
  onSymbolChange,
}: {
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  marketOptions: readonly MarketSymbol[];
  symbol: MarketSymbol;
  onSymbolChange: (symbol: MarketSymbol) => void;
}) {
  const copy = getWorkspaceCopy(language);
  const [query, setQuery] = useState(symbol);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const normalizedQuery = query.trim().toUpperCase();
  const matchedMarkets = useMemo(() => {
    return normalizedQuery.length === 0
      ? marketOptions
      : marketOptions.filter((market) => {
        const compactSymbol = market.replace("/USDT:USDT", "USDT").toUpperCase();
        return market.toUpperCase().includes(normalizedQuery) || compactSymbol.includes(normalizedQuery);
      });
  }, [marketOptions, normalizedQuery]);
  const inputClassName = isDarkTheme
    ? `h-[30px] w-full rounded-full border border-white/[0.075] bg-white/[0.035] py-0 pr-4 text-xs font-medium text-slate-100 outline-none placeholder:text-slate-500 transition-[border-color,background-color,padding] focus:border-[#00A6F4] sm:w-[220px] lg:h-9 lg:w-[260px] lg:text-sm ${isOpen ? "pl-9" : "pl-4"}`
    : `h-[30px] w-full rounded-full border border-[#E5EAF0] bg-[#F8FAFC] py-0 pr-4 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 transition-[border-color,background-color,padding] focus:border-[#00A6F4] focus:bg-[#F8FAFC] sm:w-[220px] lg:h-9 lg:w-[260px] lg:text-sm ${isOpen ? "pl-9" : "pl-4"}`;
  const dropdownClassName = isDarkTheme
    ? "absolute left-0 top-10 z-[90] max-h-[min(60dvh,20rem)] w-full overflow-y-auto rounded-2xl border border-white/[0.075] bg-[#181A20] p-1 shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:w-[280px] lg:top-11"
    : "absolute left-0 top-10 z-[90] max-h-[min(60dvh,20rem)] w-full overflow-y-auto rounded-2xl border border-[#E5EAF0] bg-white p-1 shadow-[0_18px_60px_rgba(15,23,42,0.10)] sm:w-[280px] lg:top-11";

  return (
    <div
      className="relative z-[90] w-full sm:w-auto"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setQuery(symbol);
        }
      }}
    >
      <SearchIcon
        aria-hidden="true"
        className={`pointer-events-none absolute left-4 top-[15px] h-3.5 w-3.5 -translate-y-1/2 text-slate-400 transition-opacity lg:top-[18px] ${isOpen ? "opacity-100" : "opacity-0"}`}
      />
      <input
        className={inputClassName}
        placeholder={copy.realtime.searchPlaceholder}
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
              onSymbolChange(selectedMarket);
              setQuery(selectedMarket);
              setIsOpen(false);
            }
          }

          if (event.key === "Escape") {
            setIsOpen(false);
            setQuery(symbol);
          }
        }}
      />
      {isOpen ? (
        <div className={dropdownClassName} tabIndex={-1}>
          {matchedMarkets.length > 0 ? matchedMarkets.map((market, index) => (
            <button
              key={market}
              className={index === highlightedIndex
                ? isDarkTheme ? "flex w-full items-center justify-between rounded-xl bg-[#00A6F4] px-3 py-2 text-left text-xs font-semibold text-white" : "flex w-full items-center justify-between rounded-xl bg-[#EAF8FE] px-3 py-2 text-left text-xs font-semibold text-[#007DB8]"
                : isDarkTheme ? "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/[0.08]" : "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSymbolChange(market);
                setQuery(market);
                setIsOpen(false);
              }}
            >
              <span>{market}</span>
              <span className={isDarkTheme ? "text-[11px] text-slate-500" : "text-[11px] text-slate-400"}>USDT-M</span>
            </button>
          )) : (
            <div className={isDarkTheme ? "px-3 py-3 text-xs text-slate-500" : "px-3 py-3 text-xs text-slate-400"}>{copy.realtime.searchNoMatches}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchIcon({ className }: { "aria-hidden": "true"; className: string }) {
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
