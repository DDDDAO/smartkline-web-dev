import type { KlineSignalBiasSummary } from "@/components/charts/kline-chart/types";
import { toCopyTradingMarketSymbol } from "@/lib/copy-trading-radar-api";
import type { CopyTradingRadarSnapshot } from "@/types/copy-trading";
import type { MarketSymbol } from "@/types/market";

export function createTopSignalsSignalBiasSummary(
  snapshot: CopyTradingRadarSnapshot | null,
  symbol: MarketSymbol,
): KlineSignalBiasSummary | null {
  if (!snapshot) {
    return null;
  }

  let longCount = 0;
  let shortCount = 0;

  for (const event of snapshot.events) {
    if (toCopyTradingMarketSymbol(event.symbol) !== symbol) {
      continue;
    }

    if (event.direction === "long") {
      longCount += 1;
    } else {
      shortCount += 1;
    }
  }

  const totalCount = longCount + shortCount;
  if (totalCount === 0) {
    return null;
  }

  const longPercent = Math.round((longCount / totalCount) * 100);
  return {
    longCount,
    longPercent,
    shortCount,
    shortPercent: 100 - longPercent,
    totalCount,
  };
}
