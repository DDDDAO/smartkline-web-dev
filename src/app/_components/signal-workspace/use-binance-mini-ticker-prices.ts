import { useEffect, useMemo, useState } from "react";
import {
  normalizeBinanceFuturesSymbol,
  subscribeToBinanceAllMarketMiniTickers,
  type BinanceMiniTickerPriceSnapshot,
} from "@/app/_lib/binance-market-data";

type BinanceMiniTickerPriceRecord = Record<string, number>;
const EMPTY_BINANCE_MINI_TICKER_PRICE_RECORD: BinanceMiniTickerPriceRecord = {};

export function useBinanceMiniTickerPrices(
  symbols: readonly string[],
): {
  error: string | null;
  isConnected: boolean;
  latestPricesBySymbol: BinanceMiniTickerPriceRecord;
} {
  const symbolKey = useMemo(() => createNormalizedSymbolKey(symbols), [symbols]);
  const normalizedSymbols = useMemo(() => parseNormalizedSymbolKey(symbolKey), [symbolKey]);
  const [latestPricesBySymbol, setLatestPricesBySymbol] = useState<BinanceMiniTickerPriceRecord>({});
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const hasSymbols = normalizedSymbols.length > 0;

  useEffect(() => {
    if (!hasSymbols) {
      return;
    }

    let isActive = true;
    const applyPrices = (prices: BinanceMiniTickerPriceSnapshot) => {
      if (!isActive) {
        return;
      }

      const nextPricesBySymbol = selectPricesBySymbol(prices, normalizedSymbols);
      setLatestPricesBySymbol((currentPricesBySymbol) =>
        arePriceRecordsEqual(currentPricesBySymbol, nextPricesBySymbol)
          ? currentPricesBySymbol
          : nextPricesBySymbol,
      );
    };

    const unsubscribe = subscribeToBinanceAllMarketMiniTickers({
      onClose: () => {
        if (isActive) {
          setIsConnected(false);
        }
      },
      onError: (nextError) => {
        if (isActive) {
          setError(nextError.message);
          setIsConnected(false);
        }
      },
      onOpen: () => {
        if (isActive) {
          setError(null);
          setIsConnected(true);
        }
      },
      onPrices: applyPrices,
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [hasSymbols, normalizedSymbols]);

  return {
    error: hasSymbols ? error : null,
    isConnected: hasSymbols ? isConnected : false,
    latestPricesBySymbol: hasSymbols ? latestPricesBySymbol : EMPTY_BINANCE_MINI_TICKER_PRICE_RECORD,
  };
}

export function readBinanceMiniTickerPrice(
  latestPricesBySymbol: Readonly<Record<string, number>>,
  symbol: string,
): number | null {
  const normalizedSymbol = normalizeBinanceFuturesSymbol(symbol);
  const price = normalizedSymbol ? latestPricesBySymbol[normalizedSymbol] : undefined;
  return Number.isFinite(price) && (price ?? 0) > 0 ? (price ?? null) : null;
}

function createNormalizedSymbolKey(symbols: readonly string[]): string {
  const normalizedSymbols = Array.from(new Set(
    symbols.map(normalizeBinanceFuturesSymbol).filter(Boolean),
  )).sort((left, right) => left.localeCompare(right));

  return JSON.stringify(normalizedSymbols);
}

function parseNormalizedSymbolKey(symbolKey: string): string[] {
  const parsedValue = JSON.parse(symbolKey) as unknown;
  return Array.isArray(parsedValue)
    ? parsedValue.filter((symbol): symbol is string => typeof symbol === "string" && symbol.length > 0)
    : [];
}

function selectPricesBySymbol(
  prices: BinanceMiniTickerPriceSnapshot,
  normalizedSymbols: readonly string[],
): BinanceMiniTickerPriceRecord {
  const pricesBySymbol: BinanceMiniTickerPriceRecord = {};
  for (const symbol of normalizedSymbols) {
    const price = prices.get(symbol);
    if (Number.isFinite(price) && (price ?? 0) > 0) {
      pricesBySymbol[symbol] = price ?? 0;
    }
  }
  return pricesBySymbol;
}

function arePriceRecordsEqual(
  left: Readonly<BinanceMiniTickerPriceRecord>,
  right: Readonly<BinanceMiniTickerPriceRecord>,
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => left[key] === right[key]);
}
