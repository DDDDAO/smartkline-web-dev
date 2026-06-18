import type { ChartTheme, PriceColorMode } from "@/components/charts/kline-chart/types";

const GREEN = "#2FBD85";
const RED = "#F6465D";

export function createChartPalette(theme: ChartTheme, priceColorMode: PriceColorMode = "positiveGreen") {
  const up = priceColorMode === "positiveGreen" ? GREEN : RED;
  const down = priceColorMode === "positiveGreen" ? RED : GREEN;

  if (theme === "light") {
    return {
      background: "#ffffff",
      border: "#e5e7eb",
      crosshair: "rgba(15, 23, 42, 0.22)",
      crosshairLabel: "#0f172a",
      down,
      grid: "rgba(226, 232, 240, 0.62)",
      text: "#64748b",
      up,
    };
  }

  return {
    background: "#181A20",
    border: "#2A2E38",
    crosshair: "rgba(229, 231, 235, 0.34)",
    crosshairLabel: "#1F222A",
    down,
    grid: "rgba(148, 163, 184, 0.10)",
    text: "#94a3b8",
    up,
  };
}
