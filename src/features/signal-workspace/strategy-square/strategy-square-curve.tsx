import {
  PerformanceCurveChart,
  adaptValueCurvePoints,
} from "@/components/charts/performance-curve";
import type { PnlColorMode } from "../top-signals-panel";
import type { StrategySquareReturnPoint } from "./strategy-square-data";

export function StrategyReturnCurveChart({
  isDarkTheme,
  pnlColorMode,
  points,
  showValueAxis = true,
}: {
  isDarkTheme: boolean;
  pnlColorMode: PnlColorMode;
  points: readonly StrategySquareReturnPoint[];
  showValueAxis?: boolean;
}) {
  const curvePoints = adaptValueCurvePoints(points, "roi");
  if (curvePoints.length === 0) {
    return null;
  }

  return (
    <PerformanceCurveChart
      ariaLabel="Strategy return curve"
      isDarkTheme={isDarkTheme}
      metricLabels={{ roi: "ROI" }}
      pnlColorMode={pnlColorMode}
      points={curvePoints}
      primaryMetric="roi"
      showValueAxis={showValueAxis}
      tooltipMetrics={["roi"]}
    />
  );
}
