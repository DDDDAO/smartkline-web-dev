import type { IChartApi, ISeriesApi } from "lightweight-charts";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { MarketCandle } from "@/app/_types/market";
import type { ChartTheme } from "@/app/_components/kline-chart";

export function renderPaperPositionLifecycleLabels(input: {
  candles: readonly MarketCandle[];
  chart: IChartApi | null;
  overlay: HTMLDivElement | null;
  paperPosition: PaperPositionRecord | null;
  series: ISeriesApi<"Candlestick"> | null;
  theme: ChartTheme;
}) {
  const { candles, chart, overlay, paperPosition, series, theme } = input;
  if (!chart || !overlay || !paperPosition || !series || candles.length === 0) {
    overlay?.replaceChildren();
    return;
  }

  overlay.replaceChildren();

  if (paperPosition.entryPrice !== null && paperPosition.entryTimeMs !== null) {
    const point = resolveChartPoint({ candles, chart, price: paperPosition.entryPrice, series, sourceTimeMs: paperPosition.entryTimeMs });
    if (point) {
      overlay.appendChild(createLifecycleBadge({ label: "B", point, theme, tone: "entry", title: "入场点位" }));
    }
  }

  if (paperPosition.exitPrice !== null && paperPosition.exitTimeMs !== null) {
    const point = resolveChartPoint({ candles, chart, price: paperPosition.exitPrice, series, sourceTimeMs: paperPosition.exitTimeMs });
    if (point) {
      overlay.appendChild(createLifecycleBadge({ label: "S", point, theme, tone: paperPosition.exitReason === "stop-loss" ? "risk" : "target", title: "出场点位" }));
    }
  }
}

function resolveChartPoint(input: {
  candles: readonly MarketCandle[];
  chart: IChartApi;
  price: number;
  series: ISeriesApi<"Candlestick">;
  sourceTimeMs: number;
}): { x: number; y: number } | null {
  const nearestCandle = findNearestCandle(input.candles, input.sourceTimeMs);
  if (!nearestCandle) {
    return null;
  }

  const x = input.chart.timeScale().timeToCoordinate(nearestCandle.time);
  const y = input.series.priceToCoordinate(input.price);
  if (x === null || y === null) {
    return null;
  }

  return { x: Number(x), y: Number(y) };
}

function findNearestCandle(candles: readonly MarketCandle[], sourceTimeMs: number): MarketCandle | null {
  if (!Number.isFinite(sourceTimeMs)) {
    return null;
  }

  let nearestCandle = candles[0];
  let nearestDistance = Math.abs(nearestCandle.sourceTimeMs - sourceTimeMs);

  for (const candle of candles) {
    const distance = Math.abs(candle.sourceTimeMs - sourceTimeMs);
    if (distance < nearestDistance) {
      nearestCandle = candle;
      nearestDistance = distance;
    }
  }

  return nearestCandle;
}

function createLifecycleBadge(input: {
  label: "B" | "S";
  point: { x: number; y: number };
  theme: ChartTheme;
  title: string;
  tone: "entry" | "risk" | "target";
}): HTMLDivElement {
  const element = document.createElement("div");
  const color = createLifecycleColor(input.theme, input.tone);
  element.textContent = input.label;
  element.title = input.title;
  element.style.position = "absolute";
  element.style.left = `${input.point.x}px`;
  element.style.top = `${input.point.y}px`;
  element.style.transform = "translate(-50%, -50%)";
  element.style.display = "grid";
  element.style.placeItems = "center";
  element.style.width = "24px";
  element.style.height = "24px";
  element.style.borderRadius = "999px";
  element.style.border = `2px solid ${color.border}`;
  element.style.background = color.background;
  element.style.boxShadow = color.shadow;
  element.style.color = color.text;
  element.style.fontSize = "12px";
  element.style.fontWeight = "900";
  element.style.pointerEvents = "none";
  element.style.zIndex = "34";
  return element;
}

function createLifecycleColor(theme: ChartTheme, tone: "entry" | "risk" | "target"): { background: string; border: string; shadow: string; text: string } {
  if (tone === "risk") {
    return {
      background: theme === "dark" ? "rgba(127, 29, 29, 0.94)" : "rgba(254, 242, 242, 0.98)",
      border: "#ef4444",
      shadow: "0 8px 20px rgba(239, 68, 68, 0.28)",
      text: theme === "dark" ? "#fecaca" : "#b91c1c",
    };
  }

  if (tone === "target") {
    return {
      background: theme === "dark" ? "rgba(6, 78, 59, 0.94)" : "rgba(236, 253, 245, 0.98)",
      border: "#22c55e",
      shadow: "0 8px 20px rgba(34, 197, 94, 0.28)",
      text: theme === "dark" ? "#bbf7d0" : "#15803d",
    };
  }

  return {
    background: theme === "dark" ? "rgba(8, 47, 73, 0.94)" : "rgba(236, 254, 255, 0.98)",
    border: "#06b6d4",
    shadow: "0 8px 20px rgba(6, 182, 212, 0.26)",
    text: theme === "dark" ? "#a5f3fc" : "#0e7490",
  };
}
