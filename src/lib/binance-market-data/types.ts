import type { MarketCandle } from "@/types/market";

export type HistoricalCandleFetchOptions = {
  limit?: number;
  signal?: AbortSignal;
  untilMs?: number;
};

export type BinanceExchangeInfo = {
  symbols?: BinanceExchangeSymbol[];
};

export type BinanceExchangeSymbol = {
  baseAsset: string;
  contractType: string;
  quoteAsset: string;
  status: string;
};

export type BinanceKlineRow = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

export type BinanceKlinePayload = {
  k?: {
    t: number;
    o: string;
    h: string;
    l: string;
    c: string;
    v: string;
  };
};

export type BinanceMiniTickerRow = {
  c?: string;
  s?: string;
  st?: number | string;
};

export type BinanceMiniTickerCombinedPayload = {
  data?: unknown;
};

export type RealtimeHandlers = {
  onOpen: () => void;
  onError: (error: Error) => void;
  onCandle: (candle: MarketCandle) => void;
};

export type BinanceMiniTickerPriceSnapshot = ReadonlyMap<string, number>;

export type BinanceMiniTickerHandlers = {
  onClose?: () => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onPrices: (pricesBySymbol: BinanceMiniTickerPriceSnapshot) => void;
};
