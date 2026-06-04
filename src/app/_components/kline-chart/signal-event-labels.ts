import type { IChartApi } from "lightweight-charts";
import type { MarketCandle } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";
import type { ChartTheme } from "@/app/_components/kline-chart";

export function createSignalEventRenderKey(
  candles: readonly MarketCandle[],
  eventSignals: readonly StructuredSignal[],
  theme: ChartTheme,
): string {
  const firstCandleTime = candles[0]?.sourceTimeMs ?? "empty";
  const lastCandleTime = candles.at(-1)?.sourceTimeMs ?? "empty";
  const signalKey = eventSignals.map((signal) => `${signal.id}:${signal.created_at}`).join("|");
  return `${theme}:${candles.length}:${firstCandleTime}:${lastCandleTime}:${signalKey}`;
}

type SignalEventLabelRenderInput = {
  candles: readonly MarketCandle[];
  chart: IChartApi | null;
  overlay: HTMLDivElement | null;
  signals: readonly StructuredSignal[];
  onSignalSelect: (signal: StructuredSignal) => void;
  theme: ChartTheme;
};

export function renderSignalEventLabels({ candles, chart, onSignalSelect, overlay, signals, theme }: SignalEventLabelRenderInput) {
  if (!chart || !overlay || candles.length === 0) {
    overlay?.replaceChildren();
    return;
  }

  if (overlay.dataset.signalEventHovering === "true") {
    return;
  }

  overlay.replaceChildren();

  const positionedSignals = signals
    .map((signal) => {
      const nearestCandle = findNearestCandle(candles, Date.parse(signal.created_at));
      if (!nearestCandle) {
        return null;
      }

      const coordinate = chart.timeScale().timeToCoordinate(nearestCandle.time);
      if (coordinate === null) {
        return null;
      }

      return { coordinate: Number(coordinate), signal };
    })
    .filter((item): item is { coordinate: number; signal: StructuredSignal } => item !== null)
    .sort((left, right) => left.coordinate - right.coordinate);

  let lastCoordinate = Number.NEGATIVE_INFINITY;
  let rowIndex = 0;

  for (const item of positionedSignals) {
    if (item.coordinate < 28 || item.coordinate > overlay.clientWidth - 28) {
      continue;
    }

    rowIndex = item.coordinate - lastCoordinate < 48 ? (rowIndex + 1) % 2 : 0;
    lastCoordinate = item.coordinate;
    overlay.appendChild(createSignalEventLabelElement(item.signal, item.coordinate, rowIndex, theme, onSignalSelect));
  }
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

function createSignalEventLabelElement(
  signal: StructuredSignal,
  coordinate: number,
  rowIndex: number,
  theme: ChartTheme,
  onSignalSelect: (signal: StructuredSignal) => void,
): HTMLDivElement {
  const wrapper = document.createElement("div");
  const tooltip = document.createElement("div");
  const stem = document.createElement("div");
  const label = document.createElement("div");
  const isDarkTheme = theme === "dark";

  wrapper.style.position = "absolute";
  wrapper.style.left = `${coordinate}px`;
  wrapper.style.bottom = `${34 + rowIndex * 30}px`;
  wrapper.style.transform = "translateX(-50%)";
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = "center";
  wrapper.style.gap = "3px";
  wrapper.style.zIndex = "30";
  wrapper.style.pointerEvents = "auto";

  tooltip.innerHTML = createSignalTooltipHtml(signal);
  tooltip.style.position = "absolute";
  tooltip.style.left = "50%";
  tooltip.style.bottom = "42px";
  tooltip.style.width = "236px";
  tooltip.style.transform = "translateX(-50%) translateY(4px)";
  tooltip.style.borderRadius = "14px";
  tooltip.style.border = isDarkTheme ? "1px solid rgba(148, 163, 184, 0.24)" : "1px solid rgba(226, 232, 240, 0.95)";
  tooltip.style.background = isDarkTheme ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.98)";
  tooltip.style.boxShadow = isDarkTheme ? "0 18px 44px rgba(0, 0, 0, 0.38)" : "0 18px 44px rgba(15, 23, 42, 0.16)";
  tooltip.style.color = isDarkTheme ? "#e2e8f0" : "#0f172a";
  tooltip.style.fontSize = "12px";
  tooltip.style.lineHeight = "18px";
  tooltip.style.opacity = "0";
  tooltip.style.padding = "12px";
  tooltip.style.pointerEvents = "none";
  tooltip.style.transition = "opacity 140ms ease, transform 140ms ease";

  label.textContent = createSignalEventLabelText();
  label.title = `${signal.source_name} 发布于 ${signal.created_at.replace("T", " ").slice(0, 16)}，点击定位右侧信号`;
  label.style.display = "grid";
  label.style.placeItems = "center";
  label.style.minWidth = "28px";
  label.style.height = "24px";
  label.style.borderRadius = "8px";
  label.style.border = isDarkTheme ? "1.5px solid rgba(217, 70, 239, 0.72)" : "1.5px solid rgba(217, 70, 239, 0.66)";
  label.style.background = isDarkTheme ? "rgba(88, 28, 135, 0.92)" : "rgba(253, 244, 255, 0.98)";
  label.style.color = isDarkTheme ? "#f5d0fe" : "#a21caf";
  label.style.boxShadow = isDarkTheme ? "0 6px 16px rgba(0, 0, 0, 0.30)" : "0 6px 16px rgba(15, 23, 42, 0.16)";
  label.style.cursor = "pointer";
  label.style.fontSize = "12px";
  label.style.fontWeight = "800";
  label.style.lineHeight = "1";

  stem.style.width = "2px";
  stem.style.height = "12px";
  stem.style.borderRadius = "999px";
  stem.style.background = "#d946ef";
  stem.style.opacity = isDarkTheme ? "0.9" : "0.76";

  const showTooltip = () => {
    wrapper.parentElement?.setAttribute("data-signal-event-hovering", "true");
    tooltip.style.opacity = "1";
    tooltip.style.transform = "translateX(-50%) translateY(0)";
  };
  const hideTooltip = () => {
    tooltip.style.opacity = "0";
    tooltip.style.transform = "translateX(-50%) translateY(4px)";
    wrapper.parentElement?.removeAttribute("data-signal-event-hovering");
  };
  const handleClick = (event: MouseEvent) => {
    event.stopPropagation();
    onSignalSelect(signal);
  };

  wrapper.onmouseenter = showTooltip;
  wrapper.onmouseover = showTooltip;
  wrapper.onmouseleave = hideTooltip;
  wrapper.onclick = handleClick;
  label.onmouseenter = showTooltip;
  label.onmouseover = showTooltip;
  label.onclick = handleClick;

  wrapper.append(tooltip, label, stem);
  return wrapper;
}
function createSignalEventLabelText(): string {
  return "讯";
}


function createSignalTooltipHtml(signal: StructuredSignal): string {
  return [
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">`,
    `<strong style="font-size:13px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(signal.source_name)}</strong>`,
    `<span style="border-radius:999px;background:rgba(217,70,239,.12);color:#c026d3;font-size:11px;font-weight:700;padding:2px 6px;">发布</span>`,
    `</div>`,
    `<div style="color:#64748b;font-size:11px;margin-bottom:8px;">${escapeHtml(signal.created_at.replace("T", " ").slice(0, 16))} · ${escapeHtml(signal.symbol.replace("/USDT:USDT", ""))}</div>`,
    `<div style="font-weight:700;margin-bottom:6px;">${escapeHtml(signal.summary)}</div>`,
    `<div style="color:#64748b;font-size:11px;">入场/触发 ${escapeHtml(formatSignalEntry(signal))} · 止损 ${escapeHtml(formatSignalPrice(signal.stop_loss))}</div>`,
    `<div style="color:#64748b;font-size:11px;margin-top:2px;">点击定位右侧对应 KOL 信号</div>`,
  ].join("");
}

function formatSignalEntry(signal: StructuredSignal): string {
  if (signal.entry_min !== null && signal.entry_max !== null) {
    return `${formatSignalPrice(signal.entry_min)}-${formatSignalPrice(signal.entry_max)}`;
  }

  return formatSignalPrice(signal.trigger_price);
}

function formatSignalPrice(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: value > 1000 ? 1 : 3 });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
