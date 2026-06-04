import type { UTCTimestamp } from "lightweight-charts";
import type { KlineInterval, MarketCandle, MarketSymbol } from "@/app/_types/market";
import { fallbackKolSignals } from "@/app/_lib/kol-signal-api";
import { mockMarketSymbols } from "@/app/_lib/mock-kol-signal-data";

export const markets: MarketSymbol[] = mockMarketSymbols;
export const intervals: KlineInterval[] = ["1m", "5m", "15m", "1h", "4h", "1d"];
export const structuredSignals = fallbackKolSignals;

export function createDemoCandles(symbol: MarketSymbol, interval: KlineInterval): MarketCandle[] {
  const basePrice = symbol.startsWith("ETH") ? 3780 : symbol.startsWith("SOL") ? 166 : symbol.startsWith("BNB") ? 650 : 70000;
  const volatility = symbol.startsWith("ETH") ? 34 : symbol.startsWith("SOL") ? 2.1 : symbol.startsWith("BNB") ? 5 : 520;
  const intervalMs = toIntervalMs(interval);
  const now = Date.now();
  const seed = [...symbol, ...interval].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  let price = basePrice + (seed % 11 - 5) * volatility;

  return Array.from({ length: 180 }, (_, index) => {
    const sourceTimeMs = now - (179 - index) * intervalMs;
    const wave = Math.sin((index + seed) / 9) * volatility * 0.7;
    const drift = (index - 90) * volatility * 0.018;
    const open = price;
    const close = basePrice + wave + drift + Math.cos((index + seed) / 5) * volatility * 0.22;
    const high = Math.max(open, close) + volatility * (0.25 + ((index + seed) % 7) / 20);
    const low = Math.min(open, close) - volatility * (0.22 + ((index + seed) % 5) / 18);
    const volume = Math.round(900 + ((index * 37 + seed) % 1200));
    price = close;
    return { time: Math.floor(sourceTimeMs / 1000) as UTCTimestamp, sourceTimeMs, open: round(open), high: round(high), low: round(low), close: round(close), volume };
  });
}

function toIntervalMs(interval: KlineInterval): number {
  const unit = interval.at(-1);
  const value = Number(interval.slice(0, -1));
  if (unit === "m") return value * 60_000;
  if (unit === "h") return value * 3_600_000;
  return value * 86_400_000;
}

function round(value: number): number {
  return Number(value.toFixed(value > 1000 ? 1 : 3));
}
