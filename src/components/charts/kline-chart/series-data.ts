import { LineStyle, type CreatePriceLineOptions, type HistogramData, type PriceFormat } from "lightweight-charts";
import { getWorkspaceCopy, type WorkspaceLanguage } from "@/i18n/workspace";
import type { PaperPositionRecord } from "@/lib/paper-position";
import type { MarketCandle } from "@/types/market";
import type { StructuredSignal } from "@/types/signal";
import type { ChartTheme, PriceColorMode } from "@/components/charts/kline-chart/types";

const PRICE_AXIS_SIGNIFICANT_DIGITS = 6;
const priceAxisNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumSignificantDigits: PRICE_AXIS_SIGNIFICANT_DIGITS,
  useGrouping: false,
});

export const KLINE_PRICE_FORMAT = {
  formatter: formatKlinePriceAxisValue,
  minMove: 0.00000001,
  type: "custom",
} satisfies PriceFormat;

export function toVolumeData(candle: MarketCandle, theme: ChartTheme, priceColorMode: PriceColorMode = "positiveGreen"): HistogramData {
  const isUpCandle = candle.close >= candle.open;
  const green = theme === "light" ? "rgba(47, 189, 133, 0.22)" : "rgba(47, 189, 133, 0.34)";
  const red = theme === "light" ? "rgba(246, 70, 93, 0.22)" : "rgba(246, 70, 93, 0.34)";
  const up = priceColorMode === "positiveGreen" ? green : red;
  const down = priceColorMode === "positiveGreen" ? red : green;

  return {
    time: candle.time,
    value: candle.volume,
    color: isUpCandle ? up : down,
  };
}

function formatKlinePriceAxisValue(priceValue: number): string {
  if (!Number.isFinite(priceValue)) {
    return String(priceValue);
  }

  return priceAxisNumberFormatter.format(priceValue);
}

export function createSignalPriceLines(
  signal: StructuredSignal | null,
  paperPosition: PaperPositionRecord | null,
  currentCandle: MarketCandle | undefined,
  language: WorkspaceLanguage = "zh-CN",
  priceColorMode: PriceColorMode = "positiveGreen",
): CreatePriceLineOptions[] {
  const copy = getWorkspaceCopy(language);
  const currentCandleUpColor = priceColorMode === "positiveGreen" ? "#2FBD85" : "#F6465D";
  const currentCandleDownColor = priceColorMode === "positiveGreen" ? "#F6465D" : "#2FBD85";
  const lines: CreatePriceLineOptions[] = [];

  if (signal && paperPosition?.status !== "exited") {
    if (signal.entry_min !== null && signal.entry_max !== null) {
      lines.push(createAxisOnlySignalPriceLine({ price: signal.entry_max, color: "#0891b2", title: copy.kline.entryUpper }));
      lines.push(createAxisOnlySignalPriceLine({ price: signal.entry_min, color: "#0891b2", title: copy.kline.entryLower }));
    }

    if (signal.trigger_price !== null) {
      lines.push(createAxisOnlySignalPriceLine({ price: signal.trigger_price, color: "#0891b2", title: copy.kline.entryPrice }));
    }

    if (signal.stop_loss !== null) {
      lines.push(createAxisOnlySignalPriceLine({ price: signal.stop_loss, color: "#F6465D", title: copy.kline.stopLoss }));
    }

    for (const [index, price] of signal.take_profit.entries()) {
      lines.push(createAxisOnlySignalPriceLine({ price, color: "#2FBD85", title: copy.kline.takeProfit(index + 1) }));
    }
  }

  if (currentCandle !== undefined) {
    lines.push({
      price: currentCandle.close,
      color: currentCandle.close >= currentCandle.open ? currentCandleUpColor : currentCandleDownColor,
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
      title: copy.kline.currentPrice,
    });
  }

  return lines;
}

function createAxisOnlySignalPriceLine(input: { color: string; price: number; title: string }): CreatePriceLineOptions {
  return {
    price: input.price,
    color: input.color,
    lineWidth: 1,
    lineStyle: LineStyle.Solid,
    lineVisible: false,
    axisLabelVisible: true,
    title: input.title,
  };
}
