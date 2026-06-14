"use client";

import { useMemo, useState } from "react";
import { MAX_SYMBOL_SEARCH_RESULTS } from "./constants";
import { SearchIcon } from "./icons";
import type { ThemeClasses } from "./theme";
import { matchBaseSymbols } from "./utils";

export function SymbolPicker({ error, isLoading, onChange, options, theme, value }: {
  error: string | null;
  isLoading: boolean;
  onChange: (symbol: string) => void;
  options: readonly string[];
  theme: ThemeClasses;
  value: string;
}) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const normalizedQuery = query.trim().toUpperCase();
  const matchedSymbols = useMemo(
    () => matchBaseSymbols(options, normalizedQuery).slice(0, MAX_SYMBOL_SEARCH_RESULTS),
    [normalizedQuery, options],
  );

  const chooseSymbol = (symbol: string) => {
    onChange(symbol);
    setQuery(symbol);
    setIsOpen(false);
  };

  return (
    <div
      className="relative min-w-0 flex-1"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setQuery(value);
        }
      }}
    >
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b8b9a]" />
      <input
        aria-label="搜索 Binance 币种"
        className={theme.symbolPickerInput}
        inputMode="search"
        placeholder="搜索 Binance 币种"
        spellCheck={false}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value.toUpperCase());
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
            setHighlightedIndex((currentIndex) => Math.min(currentIndex + 1, Math.max(matchedSymbols.length - 1, 0)));
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlightedIndex((currentIndex) => Math.max(currentIndex - 1, 0));
          }

          if (event.key === "Enter") {
            event.preventDefault();
            const selectedSymbol = matchedSymbols[highlightedIndex];
            if (selectedSymbol) {
              chooseSymbol(selectedSymbol);
            }
          }

          if (event.key === "Escape") {
            setIsOpen(false);
            setQuery(value);
          }
        }}
      />
      {isOpen ? (
        <div className={theme.symbolDropdown} tabIndex={-1}>
          {isLoading ? <div className={theme.symbolSearchMessage}>加载 Binance 币种列表...</div> : null}
          {!isLoading && error ? <div className={theme.symbolSearchMessage}>Binance 列表暂不可用，当前使用兜底列表。</div> : null}
          {matchedSymbols.length > 0 ? matchedSymbols.map((symbol, index) => (
            <button
              key={symbol}
              className={index === highlightedIndex ? theme.symbolOptionActive : theme.symbolOption}
              type="button"
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseSymbol(symbol)}
            >
              <span>{symbol}</span>
              <span className={theme.symbolOptionMeta}>{symbol}USDT</span>
            </button>
          )) : (
            <div className={theme.symbolSearchMessage}>没有匹配的 Binance USDT-M 币种。</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
