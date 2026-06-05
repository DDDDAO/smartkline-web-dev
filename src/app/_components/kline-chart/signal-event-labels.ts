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
  const signalGroups = groupPositionedSignals(positionedSignals);

  let lastCoordinate = Number.NEGATIVE_INFINITY;
  let rowIndex = 0;

  for (const group of signalGroups) {
    if (group.coordinate < 28 || group.coordinate > overlay.clientWidth - 28) {
      continue;
    }

    rowIndex = group.coordinate - lastCoordinate < 58 ? (rowIndex + 1) % 2 : 0;
    lastCoordinate = group.coordinate;
    overlay.appendChild(createSignalEventLabelElement(group, rowIndex, theme, onSignalSelect));
  }
}

type PositionedSignal = {
  coordinate: number;
  signal: StructuredSignal;
};

type PositionedSignalGroup = {
  coordinate: number;
  direction: StructuredSignal["direction"];
  signals: StructuredSignal[];
};

function groupPositionedSignals(positionedSignals: readonly PositionedSignal[]): PositionedSignalGroup[] {
  const groups: PositionedSignalGroup[] = [];

  for (const item of positionedSignals) {
    const lastGroup = groups.at(-1);
    if (lastGroup && lastGroup.direction === item.signal.direction && Math.abs(lastGroup.coordinate - item.coordinate) <= 36) {
      lastGroup.signals.push(item.signal);
      lastGroup.coordinate = (lastGroup.coordinate * (lastGroup.signals.length - 1) + item.coordinate) / lastGroup.signals.length;
      continue;
    }

    groups.push({
      coordinate: item.coordinate,
      direction: item.signal.direction,
      signals: [item.signal],
    });
  }

  return groups;
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
  group: PositionedSignalGroup,
  rowIndex: number,
  theme: ChartTheme,
  onSignalSelect: (signal: StructuredSignal) => void,
): HTMLDivElement {
  const wrapper = document.createElement("div");
  const tooltip = document.createElement("div");
  const stem = document.createElement("div");
  const label = document.createElement("div");
  const isDarkTheme = theme === "dark";
  const primarySignal = group.signals[0];
  const isResonance = group.signals.length > 1;

  wrapper.style.position = "absolute";
  wrapper.style.left = `${group.coordinate}px`;
  wrapper.style.bottom = `${34 + rowIndex * 30}px`;
  wrapper.style.transform = "translateX(-50%)";
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = "center";
  wrapper.style.gap = "3px";
  wrapper.style.zIndex = "30";
  wrapper.style.pointerEvents = "auto";

  tooltip.innerHTML = createSignalTooltipHtml(group);
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

  label.title = `${primarySignal.source_name} 发布于 ${primarySignal.created_at.replace("T", " ").slice(0, 16)}，点击定位右侧信号`;
  label.style.position = "relative";
  label.style.display = "flex";
  label.style.alignItems = "center";
  label.style.justifyContent = "center";
  label.style.minWidth = isResonance ? "44px" : "30px";
  label.style.height = "30px";
  label.style.borderRadius = "999px";
  label.style.border = isDarkTheme ? "1.5px solid rgba(34, 211, 238, 0.72)" : "1.5px solid rgba(8, 145, 178, 0.58)";
  label.style.background = isDarkTheme ? "rgba(15, 23, 42, 0.90)" : "rgba(255, 255, 255, 0.98)";
  label.style.color = isDarkTheme ? "#cffafe" : "#0e7490";
  label.style.boxShadow = isDarkTheme ? "0 8px 18px rgba(0, 0, 0, 0.34)" : "0 8px 18px rgba(15, 23, 42, 0.16)";
  label.style.cursor = "pointer";
  label.style.fontSize = "12px";
  label.style.fontWeight = "800";
  label.style.lineHeight = "1";
  label.append(...createSignalAvatarStack(group, isDarkTheme));
  if (isResonance) {
    label.appendChild(createResonanceBadge(group.signals.length, isDarkTheme));
  }

  stem.style.width = "2px";
  stem.style.height = "12px";
  stem.style.borderRadius = "999px";
  stem.style.background = primarySignal.direction === "long" ? "#22c55e" : "#ef4444";
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
    onSignalSelect(primarySignal);
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

function createSignalAvatarStack(group: PositionedSignalGroup, isDarkTheme: boolean): HTMLDivElement[] {
  const visibleSignals = group.signals.slice(0, 3);
  return visibleSignals.map((signal, index) => {
    const avatar = document.createElement("div");
    const fallbackLabel = signal.source_name.trim().slice(0, 1).toUpperCase() || "K";
    avatar.textContent = signal.source_avatar_url ? "" : fallbackLabel;
    avatar.style.width = "26px";
    avatar.style.height = "26px";
    avatar.style.marginLeft = index === 0 ? "0" : "-8px";
    avatar.style.borderRadius = "999px";
    avatar.style.border = isDarkTheme ? "2px solid rgba(15, 23, 42, 0.95)" : "2px solid rgba(255, 255, 255, 0.98)";
    avatar.style.background = isDarkTheme ? "#1e293b" : "#f1f5f9";
    avatar.style.backgroundImage = signal.source_avatar_url ? `url(${signal.source_avatar_url})` : "";
    avatar.style.backgroundPosition = "center";
    avatar.style.backgroundSize = "cover";
    avatar.style.color = isDarkTheme ? "#e2e8f0" : "#475569";
    avatar.style.display = "grid";
    avatar.style.fontSize = "11px";
    avatar.style.fontWeight = "900";
    avatar.style.placeItems = "center";
    avatar.style.position = "relative";
    avatar.style.zIndex = String(4 - index);
    return avatar;
  });
}

function createResonanceBadge(count: number, isDarkTheme: boolean): HTMLSpanElement {
  const badge = document.createElement("span");
  badge.textContent = `${count}源`;
  badge.style.position = "absolute";
  badge.style.left = "50%";
  badge.style.top = "-18px";
  badge.style.transform = "translateX(-50%)";
  badge.style.whiteSpace = "nowrap";
  badge.style.borderRadius = "999px";
  badge.style.background = isDarkTheme ? "rgba(8, 47, 73, 0.96)" : "rgba(236, 254, 255, 0.98)";
  badge.style.border = isDarkTheme ? "1px solid rgba(34, 211, 238, 0.42)" : "1px solid rgba(103, 232, 249, 0.82)";
  badge.style.color = isDarkTheme ? "#67e8f9" : "#0e7490";
  badge.style.fontSize = "10px";
  badge.style.fontWeight = "900";
  badge.style.padding = "2px 5px";

  for (let index = 0; index < 3; index += 1) {
    const ring = document.createElement("span");
    ring.className = "signal-resonance-ring";
    ring.style.position = "absolute";
    ring.style.inset = "-10px";
    ring.style.border = "1.5px solid rgba(34, 211, 238, 0.52)";
    ring.style.borderRadius = "999px";
    ring.style.pointerEvents = "none";
    badge.appendChild(ring);
  }

  return badge;
}

function createSignalTooltipHtml(group: PositionedSignalGroup): string {
  const primarySignal = group.signals[0];
  const resonanceLabel = group.signals.length > 1 ? `${group.signals.length}源共振` : "发布";
  const sourceNames = group.signals.map((signal) => signal.source_name).join(" / ");
  return [
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">`,
    `<strong style="font-size:13px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(sourceNames)}</strong>`,
    `<span style="border-radius:999px;background:rgba(8,145,178,.12);color:#0891b2;font-size:11px;font-weight:700;padding:2px 6px;">${escapeHtml(resonanceLabel)}</span>`,
    `</div>`,
    `<div style="color:#64748b;font-size:11px;margin-bottom:8px;">${escapeHtml(primarySignal.created_at.replace("T", " ").slice(0, 16))} · ${escapeHtml(primarySignal.symbol.replace("/USDT:USDT", ""))}</div>`,
    `<div style="font-weight:700;margin-bottom:6px;">${escapeHtml(primarySignal.summary)}</div>`,
    `<div style="color:#64748b;font-size:11px;">入场/触发 ${escapeHtml(formatSignalEntry(primarySignal))} · 止损 ${escapeHtml(formatSignalPrice(primarySignal.stop_loss))}</div>`,
    `<div style="color:#64748b;font-size:11px;margin-top:2px;">${escapeHtml(formatSignalTakeProfits(primarySignal.take_profit))}</div>`,
    `<div style="color:#64748b;font-size:11px;margin-top:2px;">点击定位右侧对应 KOL 信号</div>`,
  ].join("");
}

function formatSignalEntry(signal: StructuredSignal): string {
  if (signal.entry_min !== null && signal.entry_max !== null) {
    return `${formatSignalPrice(signal.entry_min)}-${formatSignalPrice(signal.entry_max)}`;
  }

  return formatSignalPrice(signal.trigger_price);
}

function formatSignalTakeProfits(takeProfits: readonly number[]): string {
  if (takeProfits.length === 0) {
    return "止盈 --";
  }

  return takeProfits.map((price, index) => `止盈${index + 1} ${formatSignalPrice(price)}`).join(" / ");
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
