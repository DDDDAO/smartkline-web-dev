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
    ? "h-9 w-[220px] rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs font-medium text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
    : "h-9 w-[220px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-400";
  const dropdownClassName = isDarkTheme
    ? "absolute left-0 top-10 z-30 max-h-80 w-[280px] overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-2xl"
    : "absolute left-0 top-10 z-30 max-h-80 w-[280px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl";

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
                ? isDarkTheme ? "flex w-full items-center justify-between rounded-lg bg-cyan-500 px-3 py-2 text-left text-xs font-semibold text-white" : "flex w-full items-center justify-between rounded-lg bg-cyan-50 px-3 py-2 text-left text-xs font-semibold text-cyan-700"
                : isDarkTheme ? "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800" : "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"}
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

