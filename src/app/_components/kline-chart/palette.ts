import type { ChartTheme } from "@/app/_components/kline-chart";

export function createChartPalette(theme: ChartTheme) {
  if (theme === "light") {
    return {
      background: "#ffffff",
      border: "#e2e8f0",
      crosshair: "rgba(15, 23, 42, 0.28)",
      crosshairLabel: "#0f172a",
      down: "#dc2626",
      grid: "rgba(226, 232, 240, 0.9)",
      text: "#64748b",
      up: "#16a34a",
    };
  }

  return {
    background: "#0b1018",
    border: "#1e293b",
    crosshair: "rgba(226, 232, 240, 0.36)",
    crosshairLabel: "#0f172a",
    down: "#ef4444",
    grid: "rgba(148, 163, 184, 0.12)",
    text: "#94a3b8",
    up: "#22c55e",
  };
}
