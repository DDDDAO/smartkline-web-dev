import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { MarketSymbol } from "@/app/_types/market";

export function SymbolSearchInput({
  isDarkTheme,
  marketOptions,
  symbol,
  onSymbolChange,
}: {
  isDarkTheme: boolean;
  marketOptions: readonly MarketSymbol[];
  symbol: MarketSymbol;
  onSymbolChange: (symbol: MarketSymbol) => void;
}) {
  const [query, setQuery] = useState(symbol);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const normalizedQuery = query.trim().toUpperCase();
  const matchedMarkets = useMemo(() => {
    const normalizedMarkets = normalizedQuery.length === 0
      ? marketOptions
      : marketOptions.filter((market) => {
        const compactSymbol = market.replace("/USDT:USDT", "USDT").toUpperCase();
        return market.toUpperCase().includes(normalizedQuery) || compactSymbol.includes(normalizedQuery);
      });

    return normalizedMarkets.slice(0, 16);
  }, [marketOptions, normalizedQuery]);
  const inputClassName = isDarkTheme
    ? `h-[30px] w-[220px] rounded-full border border-white/[0.075] bg-white/[0.035] py-0 pr-4 text-xs font-medium text-slate-100 outline-none placeholder:text-slate-500 transition-[border-color,background-color,padding] focus:border-[#00A6F4] ${isOpen ? "pl-9" : "pl-4"}`
    : `h-[30px] w-[220px] rounded-full border border-[#E5EAF0] bg-[#F8FAFC] py-0 pr-4 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 transition-[border-color,background-color,padding] focus:border-[#00A6F4] focus:bg-[#F8FAFC] ${isOpen ? "pl-9" : "pl-4"}`;
  const dropdownClassName = isDarkTheme
    ? "absolute left-0 top-10 z-30 max-h-80 w-[280px] overflow-y-auto rounded-2xl border border-white/[0.075] bg-[#181A20] p-1 shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
    : "absolute left-0 top-10 z-30 max-h-80 w-[280px] overflow-y-auto rounded-2xl border border-[#E5EAF0] bg-white p-1 shadow-[0_18px_60px_rgba(15,23,42,0.10)]";

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setQuery(symbol);
        }
      }}
    >
      <Search
        aria-hidden="true"
        className={`pointer-events-none absolute left-4 top-[15px] h-3.5 w-3.5 -translate-y-1/2 text-slate-400 transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
        strokeWidth={2}
      />
      <input
        className={inputClassName}
        placeholder="搜索合约，例如 BTC"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={(event) => {
          event.currentTarget.select();
          setIsOpen(true);
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
              <span className={isDarkTheme ? "text-[11px] text-slate-500" : "text-[11px] text-slate-400"}>Mock</span>
            </button>
          )) : (
            <div className={isDarkTheme ? "px-3 py-3 text-xs text-slate-500" : "px-3 py-3 text-xs text-slate-400"}>没有匹配的合约</div>
          )}
        </div>
      ) : null}
    </div>
  );
}


