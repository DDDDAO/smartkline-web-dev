export type KlineChartMetrics = {
  currentPriceTagFontSize: number;
  currentPriceTagHeight: number;
  currentPriceTagLineHeight: number;
  currentPriceTagWidth: number;
  initialVisibleCandleCount: number;
  priceScaleTickMarkDensity: number;
  rightPriceScaleWidth: number;
};

const DESKTOP_CHART_METRICS = {
  currentPriceTagFontSize: 13,
  currentPriceTagHeight: 42,
  currentPriceTagLineHeight: 15,
  currentPriceTagWidth: 76,
  initialVisibleCandleCount: 240,
  priceScaleTickMarkDensity: 4.5,
  rightPriceScaleWidth: 96,
} as const;

const COMPACT_CHART_METRICS = {
  currentPriceTagFontSize: 12,
  currentPriceTagHeight: 38,
  currentPriceTagLineHeight: 14,
  currentPriceTagWidth: 68,
  initialVisibleCandleCount: 104,
  priceScaleTickMarkDensity: 2.6,
  rightPriceScaleWidth: 68,
} as const;

export function resolveKlineChartMetrics(isCompactLayout: boolean): KlineChartMetrics {
  return isCompactLayout ? COMPACT_CHART_METRICS : DESKTOP_CHART_METRICS;
}

export function createKlineInteractionOptions(isCompactLayout: boolean) {
  return {
    handleScale: {
      axisDoubleClickReset: {
        price: true,
        time: true,
      },
      axisPressedMouseMove: {
        price: !isCompactLayout,
        time: true,
      },
      mouseWheel: true,
      pinch: true,
    },
    handleScroll: {
      horzTouchDrag: true,
      mouseWheel: true,
      pressedMouseMove: true,
      vertTouchDrag: !isCompactLayout,
    },
    kineticScroll: {
      mouse: false,
      touch: true,
    },
  };
}
