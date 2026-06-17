import {
  PerformanceCurveChart,
  adaptValueCurvePoints,
} from "@/app/_components/performance-curve";
import type { PnlColorMode } from "./top-signals-panel";
import type { StrategySquareReturnPoint } from "./strategy-square-data";

export function StrategyReturnCurveChart({
  isDarkTheme,
  pnlColorMode,
  points,
}: {
  isDarkTheme: boolean;
  pnlColorMode: PnlColorMode;
  points: readonly StrategySquareReturnPoint[];
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
      tooltipMetrics={["roi"]}
    />
  );
}
