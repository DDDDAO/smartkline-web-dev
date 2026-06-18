import type { MarketSymbol } from "@/types/market";
import { BINANCE_FUTURES_REST_BASE_URL } from "./constants";
import type { BinanceExchangeInfo, BinanceExchangeSymbol } from "./types";

let cachedUsdtPerpetualMarkets: MarketSymbol[] | null = null;
let pendingUsdtPerpetualMarketsRequest: Promise<MarketSymbol[]> | null = null;

export async function fetchUsdtPerpetualMarkets(): Promise<MarketSymbol[]> {
  if (cachedUsdtPerpetualMarkets) {
    return cachedUsdtPerpetualMarkets.slice();
  }

  pendingUsdtPerpetualMarketsRequest ??= requestUsdtPerpetualMarkets()
    .then((marketSymbols) => {
      cachedUsdtPerpetualMarkets = marketSymbols;
      return marketSymbols;
    })
    .finally(() => {
      pendingUsdtPerpetualMarketsRequest = null;
    });

  const marketSymbols = await pendingUsdtPerpetualMarketsRequest;
  return marketSymbols.slice();
}

async function requestUsdtPerpetualMarkets(): Promise<MarketSymbol[]> {
  const response = await fetch(new URL("/fapi/v1/exchangeInfo", BINANCE_FUTURES_REST_BASE_URL));
  if (!response.ok) {
    throw new Error(`Binance futures market list failed: ${response.status} ${response.statusText}`);
  }

  const exchangeInfo = await response.json() as BinanceExchangeInfo;
  const exchangeSymbols = exchangeInfo.symbols ?? [];
  const marketSymbols = exchangeSymbols
    .filter(isBinanceUsdtPerpetualTradingSymbol)
    .map((symbol) => `${symbol.baseAsset}/USDT:USDT`)
    .sort((left, right) => left.localeCompare(right));

  if (marketSymbols.length === 0) {
    throw new Error("Binance USDT perpetual market list is empty.");
  }

  return marketSymbols;
}

export function isBinanceUsdtPerpetualTradingSymbol(
  symbol: BinanceExchangeSymbol,
): boolean {
  /**
   * Binance lists some chartable USDT-M markets, such as SPCXUSDT, as
   * TRADIFI_PERPETUAL instead of plain PERPETUAL. The chart/search surface
   * should include every trading USDT-settled perpetual contract family.
   */
  return symbol.contractType.trim().toUpperCase().endsWith("PERPETUAL")
    && symbol.quoteAsset.trim().toUpperCase() === "USDT"
    && symbol.status.trim().toUpperCase() === "TRADING";
}

export function toBinanceFuturesStreamSymbol(symbol: MarketSymbol): string {
  const match = /^([^/]+)\/([^:]+):USDT$/u.exec(symbol.trim());
  if (!match) {
    throw new Error(`Cannot derive Binance Futures stream symbol from ${symbol}.`);
  }

  return `${match[1]}${match[2]}`.toLowerCase();
}

export function normalizeBinanceFuturesSymbol(symbol: string): string {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (!normalizedSymbol) {
    return "";
  }

  if (!normalizedSymbol.includes("/")) {
    return normalizedSymbol;
  }

  try {
    return toBinanceFuturesStreamSymbol(normalizedSymbol as MarketSymbol).toUpperCase();
  } catch {
    const [marketPair] = normalizedSymbol.split(":");
    return marketPair.replace("/", "");
  }
}
