import { LineStyle, type CreatePriceLineOptions, type HistogramData } from "lightweight-charts";
import type { MarketCandle } from "@/app/_types/market";
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

export function createSignalPriceLines(currentPrice: number | undefined): CreatePriceLineOptions[] {
  const lines: CreatePriceLineOptions[] = [];

  if (currentPrice !== undefined) {
    lines.push({ price: currentPrice, color: "#7c3aed", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: "当前价" });
  }

  return lines;
}
