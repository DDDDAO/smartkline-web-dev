import type { PriceColorMode } from "@/app/_components/kline-chart/types";

export type PerformanceCurveMetric = "roi" | "pnl";
export type PerformanceCurveWindow = "24h" | "7d" | "30d" | "90d" | "180d";

export type PerformanceCurvePoint = {
  asset?: string | null;
  currency?: string | null;
  pnl?: number | null;
  /** Normalized ratio: 0.1234 renders as +12.34%. */
  roi?: number | null;
  timestamp: number;
};

export type PerformanceCurveMetricLabels = Partial<Record<PerformanceCurveMetric, string>>;
export type PerformanceCurveValueFormatters = Partial<Record<PerformanceCurveMetric, (value: number | null, point: PerformanceCurvePoint | null) => string>>;

export type PerformanceCurveToneOptions = {
  isDarkTheme: boolean;
  pnlColorMode?: PriceColorMode;
};
