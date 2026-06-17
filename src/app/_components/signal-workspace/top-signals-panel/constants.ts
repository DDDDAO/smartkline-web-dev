import type { CSSProperties } from "react";

import type {
  TopSignalPerformanceWindow,
  TopSignalSortKey,
} from "./helpers";

export type TopSignalPerformanceCurveMetric = "roi" | "pnl";

export const COMPACT_POSITION_ROWS_PER_SOURCE_CARD = 10;
export const EXPANDED_POSITION_ROWS_PER_PAGE = 100;
export const TOP_SIGNAL_ACTIVE_CARD_SCROLL_GAP_PX = 8;
export const EXPANDED_POSITION_CARD_MIN_HEIGHT = "clamp(420px, 68vh, 680px)";
export const SMARTKLINE_SOURCE_AVATAR_STYLE: CSSProperties = {
  backgroundImage: 'url("/logo-mark.svg")',
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "72%",
};

export const TOP_SIGNAL_PERFORMANCE_WINDOWS: readonly TopSignalPerformanceWindow[] = ["7d", "30d", "90d", "180d"];
export const TOP_SIGNAL_PERFORMANCE_CURVE_METRICS: readonly TopSignalPerformanceCurveMetric[] = ["roi", "pnl"];
export const TOP_SIGNAL_SORT_OPTIONS: readonly TopSignalSortKey[] = [
  "pnl",
  "roi",
  "maxDrawdown",
  "aum",
  "followers",
  "copierPnl",
  "sharpeRatio",
];
