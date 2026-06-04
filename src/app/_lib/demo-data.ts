import type { KlineInterval, MarketCandle, MarketSymbol } from "@/app/_types/market";
import { createMockCandles } from "@/app/_lib/binance-market-data";
import { fallbackKolSignals } from "@/app/_lib/kol-signal-api";
import { mockMarketSymbols } from "@/app/_lib/mock-kol-signal-data";

export const markets: MarketSymbol[] = mockMarketSymbols;
export const intervals: KlineInterval[] = ["1m", "5m", "15m", "1h", "4h", "1d"];
export const structuredSignals = fallbackKolSignals;

export function createDemoCandles(symbol: MarketSymbol, interval: KlineInterval): MarketCandle[] {
  return createMockCandles(symbol, interval);
}
