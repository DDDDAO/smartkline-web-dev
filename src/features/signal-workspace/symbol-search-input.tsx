import { MarketSymbolSearchInput } from "@/components/market/market-symbol-search-input";
import { getWorkspaceCopy, type WorkspaceLanguage } from "@/i18n/workspace";
import type { MarketSymbol } from "@/types/market";

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

  return (
    <MarketSymbolSearchInput
      id="signal-workspace-symbol-search"
      isDarkTheme={isDarkTheme}
      marketOptions={marketOptions}
      noMatchesLabel={copy.realtime.searchNoMatches}
      placeholder={copy.realtime.searchPlaceholder}
      symbol={symbol}
      onSymbolChange={onSymbolChange}
    />
  );
}
