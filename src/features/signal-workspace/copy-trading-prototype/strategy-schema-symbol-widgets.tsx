"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormContextType, WidgetProps } from "@rjsf/utils";
import { ariaDescribedByIds } from "@rjsf/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { fetchUsdtPerpetualMarkets, normalizeBinanceFuturesSymbol } from "@/lib/binance-market-data";
import { markets as fallbackMarkets } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import type { MarketSymbol } from "@/types/market";

type StrategySchemaCopy = WorkspaceCopy["workspace"]["accountCenter"]["strategySchema"];
type RendererWidgetContext = FormContextType & { isDarkTheme?: boolean; strategySchemaCopy?: StrategySchemaCopy };
type SymbolOption = { market: MarketSymbol; value: string };

const MAX_VISIBLE_SYMBOL_OPTIONS = 10;

export const SymbolPickerWidget = (props: WidgetProps) => {
  const isDarkTheme = getIsDarkTheme(props);
  const rendererCopy = getStrategySchemaCopy(props);
  return (
    <Input
      aria-describedby={ariaDescribedByIds(props.id)}
      aria-invalid={hasErrors(props) || undefined}
      className={getInputClassName(isDarkTheme)}
      disabled={props.disabled || props.readonly}
      id={props.id}
      name={props.htmlName || props.id}
      placeholder={props.placeholder || rendererCopy.symbolPlaceholder}
      readOnly={props.readonly}
      value={props.value ?? ""}
      onBlur={(event) => props.onBlur(props.id, event.target.value)}
      onChange={(event) => props.onChange(event.target.value)}
      onFocus={(event) => props.onFocus(props.id, event.target.value)}
    />
  );
};

export const SymbolListWidget = (props: WidgetProps) => {
  const isDarkTheme = getIsDarkTheme(props);
  const rendererCopy = getStrategySchemaCopy(props);
  const disabled = Boolean(props.disabled || props.readonly);
  const values = useMemo(() => normalizeSymbolValues(props.value), [props.value]);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [marketOptions, setMarketOptions] = useState<MarketSymbol[]>(fallbackMarkets);
  const [loadFailed, setLoadFailed] = useState(false);
  const symbolOptions = useMemo(() => createSymbolOptions(marketOptions, values), [marketOptions, values]);
  const visibleOptions = useMemo(
    () => rankSymbolOptions(symbolOptions, query).slice(0, MAX_VISIBLE_SYMBOL_OPTIONS),
    [query, symbolOptions],
  );
  const manualSymbol = normalizeManualSymbol(query);
  const canAddManualSymbol = Boolean(manualSymbol && !values.includes(manualSymbol));

  useEffect(() => {
    let isActive = true;
    fetchUsdtPerpetualMarkets()
      .then((markets) => {
        if (!isActive) return;
        setMarketOptions(markets);
        setLoadFailed(false);
      })
      .catch(() => {
        if (isActive) setLoadFailed(true);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const emitValues = (nextValues: readonly string[]) => {
    props.onChange(Array.from(new Set(nextValues.map(normalizeConfigSymbol).filter(Boolean))));
  };
  const addSymbol = (symbol: string) => {
    const normalized = normalizeConfigSymbol(symbol);
    if (!normalized || values.includes(normalized) || disabled) return;
    emitValues([...values, normalized]);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div
      className="space-y-2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          props.onBlur(props.id, values);
        }
      }}
    >
      <div className={getSelectedSymbolContainerClassName(isDarkTheme)}>
        {values.length > 0 ? values.map((symbol) => (
          <Badge key={symbol} className={getSymbolBadgeClassName(isDarkTheme)} variant="outline">
            <span>{symbol}</span>
            <button
              aria-label={`${rendererCopy.removeRow} ${symbol}`}
              className={getRemoveSymbolClassName(isDarkTheme)}
              disabled={disabled}
              type="button"
              onClick={() => emitValues(values.filter((item) => item !== symbol))}
            >
              ×
            </button>
          </Badge>
        )) : (
          <span className={isDarkTheme ? "text-xs font-bold text-slate-500" : "text-xs font-bold text-slate-400"}>{rendererCopy.emptyList}</span>
        )}
      </div>

      <div className="relative">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            aria-autocomplete="list"
            aria-controls={`${props.id}-symbol-options`}
            aria-describedby={ariaDescribedByIds(props.id)}
            aria-expanded={isOpen}
            aria-invalid={hasErrors(props) || undefined}
            autoFocus={props.autofocus}
            className={getInputClassName(isDarkTheme)}
            disabled={disabled}
            id={props.id}
            name={props.htmlName || props.id}
            placeholder={props.placeholder || rendererCopy.symbolSearchPlaceholder}
            readOnly={props.readonly}
            role="combobox"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
              props.onFocus(props.id, values);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addSymbol(visibleOptions[0]?.value ?? manualSymbol);
              }
              if (event.key === "Escape") setIsOpen(false);
            }}
          />
          <Button className={getOutlineButtonClassName(isDarkTheme)} disabled={disabled || !canAddManualSymbol} type="button" variant="outline" onClick={() => addSymbol(manualSymbol)}>
            {rendererCopy.addSymbol}
          </Button>
        </div>

        {isOpen ? (
          <div className={getDropdownClassName(isDarkTheme)} id={`${props.id}-symbol-options`} role="listbox">
            {visibleOptions.length > 0 ? visibleOptions.map((option) => (
              <button key={option.value} aria-selected={false} className={getOptionClassName(isDarkTheme)} role="option" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addSymbol(option.value)}>
                <span className="font-black">{option.value}</span>
                <span className={isDarkTheme ? "text-[11px] text-slate-500" : "text-[11px] text-slate-400"}>{option.market}</span>
              </button>
            )) : (
              <div className={isDarkTheme ? "px-3 py-3 text-xs font-bold text-slate-500" : "px-3 py-3 text-xs font-bold text-slate-400"}>{rendererCopy.symbolNoMatches}</div>
            )}
          </div>
        ) : null}
      </div>

      {loadFailed ? <div className={isDarkTheme ? "text-xs font-bold text-amber-200/80" : "text-xs font-bold text-amber-700"}>{rendererCopy.symbolLoadFailed}</div> : null}
    </div>
  );
};

function createSymbolOptions(markets: readonly MarketSymbol[], selectedValues: readonly string[]): SymbolOption[] {
  const selected = new Set(selectedValues);
  const options = new Map<string, SymbolOption>();
  for (const market of markets) {
    const value = normalizeConfigSymbol(market);
    if (value && !selected.has(value) && !options.has(value)) options.set(value, { market, value });
  }
  return [...options.values()];
}

function rankSymbolOptions(options: readonly SymbolOption[], query: string): SymbolOption[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [...options];
  return options
    .map((option, index) => ({ index, option, score: scoreSymbolOption(option, normalizedQuery) }))
    .filter((item): item is { index: number; option: SymbolOption; score: number } => item.score !== null)
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map((item) => item.option);
}

function scoreSymbolOption(option: SymbolOption, query: string): number | null {
  const base = option.value.endsWith("USDT") ? option.value.slice(0, -4) : option.value;
  const market = option.market.toUpperCase();
  const valueIndex = option.value.indexOf(query);
  const baseIndex = base.indexOf(query);
  const marketIndex = market.indexOf(query);
  if (option.value === query || base === query) return 0;
  if (base.startsWith(query)) return 10 + base.length;
  if (option.value.startsWith(query)) return 30 + option.value.length;
  if (baseIndex >= 0) return 50 + baseIndex * 100 + base.length;
  if (valueIndex >= 0) return 80 + valueIndex * 100 + option.value.length;
  if (marketIndex >= 0) return 120 + marketIndex * 100 + market.length;
  return null;
}

function normalizeSymbolValues(value: unknown): string[] {
  return Array.from(new Set((Array.isArray(value) ? value : []).map(normalizeConfigSymbol).filter(Boolean)));
}

function normalizeManualSymbol(value: string): string {
  const normalized = normalizeConfigSymbol(value);
  if (!normalized) return "";
  return normalized.endsWith("USDT") ? normalized : `${normalized}USDT`;
}

function normalizeConfigSymbol(value: unknown): string {
  if (typeof value !== "string") return "";
  return normalizeBinanceFuturesSymbol(value).replace(/[^A-Z0-9]/gu, "");
}

function normalizeSearchText(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/gu, "");
}

function getInputClassName(isDarkTheme: boolean): string {
  return cn(
    "h-10 rounded-xl text-sm font-bold shadow-none",
    isDarkTheme
      ? "border-white/[0.085] bg-[#0F131A] text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-400/45 focus-visible:ring-indigo-400/10"
      : "border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-indigo-400/10",
  );
}

function getSelectedSymbolContainerClassName(isDarkTheme: boolean): string {
  return cn("flex min-h-10 flex-wrap items-center gap-2 rounded-2xl border p-2", isDarkTheme ? "border-white/[0.075] bg-[#0F131A]" : "border-[#E8E8EC] bg-white");
}

function getSymbolBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "gap-1 rounded-full border-white/[0.12] bg-white/[0.055] text-slate-100" : "gap-1 rounded-full border-slate-200 bg-slate-50 text-slate-700";
}

function getRemoveSymbolClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "ml-1 text-slate-400 hover:text-white disabled:opacity-50" : "ml-1 text-slate-400 hover:text-slate-900 disabled:opacity-50";
}

function getDropdownClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "absolute left-0 top-12 z-[190] max-h-64 w-full overflow-y-auto rounded-2xl border border-white/[0.075] bg-[#111820] p-1 text-slate-100 shadow-[0_18px_44px_rgba(0,0,0,0.38)]"
    : "absolute left-0 top-12 z-[190] max-h-64 w-full overflow-y-auto rounded-2xl border border-[#E8E8EC] bg-white p-1 text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.14)]";
}

function getOptionClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs outline-none hover:bg-white/[0.055] focus-visible:bg-white/[0.055]"
    : "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs outline-none hover:bg-[#FAFAFA] focus-visible:bg-[#FAFAFA]";
}

function getOutlineButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "border-white/[0.085] bg-transparent text-slate-200 hover:bg-white/[0.055]" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
}

function getIsDarkTheme(props: WidgetProps): boolean {
  return Boolean((props.formContext as RendererWidgetContext | undefined)?.isDarkTheme);
}

function getStrategySchemaCopy(props: WidgetProps): StrategySchemaCopy {
  return (props.formContext as RendererWidgetContext | undefined)?.strategySchemaCopy as StrategySchemaCopy;
}

function hasErrors(props: WidgetProps): boolean {
  return Array.isArray(props.rawErrors) && props.rawErrors.length > 0;
}
