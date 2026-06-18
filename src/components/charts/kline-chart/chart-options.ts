import { ColorType, CrosshairMode, LineStyle } from "lightweight-charts";
import { createKlineInteractionOptions, type KlineChartMetrics } from "./chart-metrics";
import { createChartPalette } from "./palette";
import { KLINE_PRICE_FORMAT } from "./series-data";
import type { ChartTheme, PriceColorMode } from "./types";

export function createKlineChartOptions(
  theme: ChartTheme,
  priceColorMode: PriceColorMode,
  metrics: KlineChartMetrics,
  isCompactLayout: boolean,
) {
  const palette = createChartPalette(theme, priceColorMode);

  return {
    autoSize: true,
    ...createKlineInteractionOptions(isCompactLayout),
    layout: {
      background: { type: ColorType.Solid, color: palette.background },
      fontSize: 11,
      textColor: palette.text,
      attributionLogo: false,
    },
    grid: {
      vertLines: { color: palette.grid },
      horzLines: { color: palette.grid },
    },
    rightPriceScale: {
      borderColor: palette.border,
      minimumWidth: metrics.rightPriceScaleWidth,
      tickMarkDensity: metrics.priceScaleTickMarkDensity,
    },
    timeScale: {
      borderColor: palette.border,
      timeVisible: true,
      secondsVisible: false,
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: palette.crosshair, width: 1 as const, style: LineStyle.Dashed, labelBackgroundColor: palette.crosshairLabel },
      horzLine: { color: palette.crosshair, width: 1 as const, style: LineStyle.Dashed, labelBackgroundColor: palette.crosshairLabel },
    },
  };
}

export function createKlineCandlestickSeriesOptions(theme: ChartTheme, priceColorMode: PriceColorMode) {
  const palette = createChartPalette(theme, priceColorMode);

  return {
    upColor: palette.up,
    downColor: palette.down,
    borderVisible: false,
    lastValueVisible: false,
    priceFormat: KLINE_PRICE_FORMAT,
    priceLineVisible: false,
    wickUpColor: palette.up,
    wickDownColor: palette.down,
  };
}
