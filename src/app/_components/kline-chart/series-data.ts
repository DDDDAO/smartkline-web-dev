import { LineStyle, type CreatePriceLineOptions, type HistogramData } from "lightweight-charts";
import type { MarketCandle } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";
import type { ChartTheme } from "@/app/_components/kline-chart";

export function toVolumeData(candle: MarketCandle, theme: ChartTheme): HistogramData {
  return {
    time: candle.time,
    value: candle.volume,
    color: candle.close >= candle.open
      ? theme === "light" ? "rgba(22, 163, 74, 0.22)" : "rgba(34, 197, 94, 0.34)"
      : theme === "light" ? "rgba(220, 38, 38, 0.22)" : "rgba(239, 68, 68, 0.34)",
  };
}

export function createSignalPriceLines(signal: StructuredSignal, currentPrice: number | undefined): CreatePriceLineOptions[] {
  const lines: CreatePriceLineOptions[] = [];

  if (signal.entry_min !== null && signal.entry_max !== null) {
    lines.push(createAxisOnlySignalPriceLine({ price: signal.entry_max, color: "#0891b2", title: "入场上沿" }));
    lines.push(createAxisOnlySignalPriceLine({ price: signal.entry_min, color: "#0891b2", title: "入场下沿" }));
  }

  if (signal.trigger_price !== null) {
    lines.push(createAxisOnlySignalPriceLine({ price: signal.trigger_price, color: "#0891b2", title: "入场价" }));
  }

  if (signal.stop_loss !== null) {
    lines.push(createAxisOnlySignalPriceLine({ price: signal.stop_loss, color: "#dc2626", title: "止损" }));
  }

  for (const [index, price] of signal.take_profit.entries()) {
    lines.push(createAxisOnlySignalPriceLine({ price, color: "#16a34a", title: `止盈${index + 1}` }));
  }

  if (currentPrice !== undefined) {
    lines.push({ price: currentPrice, color: "#7c3aed", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: "当前价" });
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
