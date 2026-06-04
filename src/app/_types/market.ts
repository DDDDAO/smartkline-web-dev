import type { CandlestickData, UTCTimestamp } from "lightweight-charts";

export type MarketSymbol = string;

export type KlineInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export type MarketCandle = CandlestickData<UTCTimestamp> & {
  sourceTimeMs: number;
  volume: number;
};
