import type { IChartApi } from "lightweight-charts";
import { getWorkspaceCopy, type WorkspaceLanguage } from "@/app/_lib/i18n";
import { getResolvedKolAvatarUrl } from "@/app/_lib/kol-avatar";
import type { MarketCandle } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";
import type { ChartTheme } from "@/app/_components/kline-chart";

const RIGHT_PRICE_SCALE_RESERVED_WIDTH = 118;
const SIGNAL_LABEL_EDGE_PADDING = 18;
const AVATAR_SIZE = 24;
const AVATAR_BASE_BOTTOM = 20;
const AVATAR_COLUMN_CLUSTER_DISTANCE = 20;
const AVATAR_COLUMN_MAX_ITEMS = 5;
const AVATAR_COLUMN_STEP = 18;
const AVATAR_STACK_STEP = 16;
const RESONANCE_GROUP_MAX_TIME_GAP_MS = 8 * 60_000;

export function createSignalEventRenderKey(
  candles: readonly MarketCandle[],
  eventSignals: readonly StructuredSignal[],
  theme: ChartTheme,
  language: WorkspaceLanguage = "zh-CN",
  activeSignalId: string | null = null,
): string {
  const firstCandleTime = candles[0]?.sourceTimeMs ?? "empty";
  const lastCandleTime = candles.at(-1)?.sourceTimeMs ?? "empty";
  const signalKey = eventSignals.map((signal) => `${signal.id}:${signal.created_at}`).join("|");
  return `${theme}:${language}:${activeSignalId ?? "none"}:${candles.length}:${firstCandleTime}:${lastCandleTime}:${signalKey}`;
}

type SignalEventLabelRenderInput = {
  activeSignal: StructuredSignal | null;
  candles: readonly MarketCandle[];
  chart: IChartApi | null;
  overlay: HTMLDivElement | null;
  signals: readonly StructuredSignal[];
  language: WorkspaceLanguage;
  onSignalSelect: (signal: StructuredSignal) => void;
  theme: ChartTheme;
};

export function renderSignalEventLabels({ activeSignal, candles, chart, language, onSignalSelect, overlay, signals, theme }: SignalEventLabelRenderInput): boolean {
  if (!chart || !overlay || candles.length === 0) {
    overlay?.replaceChildren();
    overlay?.removeAttribute("data-signal-event-hidden-right");
    return false;
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

      return { candleTimeMs: nearestCandle.sourceTimeMs, coordinate: Number(coordinate), signal };
    })
    .filter((item): item is PositionedSignal => item !== null)
    .sort((left, right) => left.coordinate - right.coordinate || Date.parse(left.signal.created_at) - Date.parse(right.signal.created_at));

  const minCoordinate = SIGNAL_LABEL_EDGE_PADDING;
  const maxCoordinate = Math.max(minCoordinate, overlay.clientWidth - RIGHT_PRICE_SCALE_RESERVED_WIDTH - SIGNAL_LABEL_EDGE_PADDING);
  const { hasHiddenRightSignal, items: layoutItems } = createAvatarLayout(positionedSignals, minCoordinate, maxCoordinate);
  const resonanceClusters = createResonanceClusters(layoutItems);

  for (const cluster of resonanceClusters) {
    overlay.appendChild(createResonanceClusterDecoration(cluster, theme, language));
  }

  for (const item of layoutItems) {
    overlay.appendChild(createSignalAvatarButton({
      activeSignal,
      item,
      language,
      onSignalSelect,
      theme,
    }));
  }

  overlay.dataset.signalEventHiddenRight = String(hasHiddenRightSignal);
  return hasHiddenRightSignal;
}

type PositionedSignal = {
  candleTimeMs: number;
  coordinate: number;
  signal: StructuredSignal;
};

type AvatarLayoutItem = PositionedSignal & {
  lane: number;
  x: number;
};

type AvatarLayoutColumn = {
  anchorX: number;
  items: AvatarLayoutItem[];
  x: number;
};

type AvatarLayoutResult = {
  hasHiddenRightSignal: boolean;
  items: AvatarLayoutItem[];
};

function createAvatarLayout(positionedSignals: readonly PositionedSignal[], minX: number, maxX: number): AvatarLayoutResult {
  const columns: AvatarLayoutColumn[] = [];
  const layoutItems: AvatarLayoutItem[] = [];
  let hasHiddenRightSignal = false;

  for (const item of positionedSignals) {
    if (item.coordinate > maxX) {
      hasHiddenRightSignal = true;
      continue;
    }

    if (item.coordinate < minX) {
      continue;
    }

    let column = findAvatarColumn(columns, item.coordinate);
    if (!column) {
      column = {
        anchorX: item.coordinate,
        items: [],
        x: resolveAvatarColumnX(columns, item.coordinate, minX, maxX),
      };
      columns.push(column);
    }

    const layoutItem = { ...item, lane: column.items.length, x: column.x };
    column.items.push(layoutItem);
    layoutItems.push(layoutItem);
  }

  return {
    hasHiddenRightSignal,
    items: layoutItems.sort((left, right) => left.x - right.x || left.lane - right.lane || Date.parse(left.signal.created_at) - Date.parse(right.signal.created_at)),
  };
}

function findAvatarColumn(columns: readonly AvatarLayoutColumn[], coordinate: number): AvatarLayoutColumn | null {
  const availableColumns = columns
    .filter((column) => column.items.length < AVATAR_COLUMN_MAX_ITEMS)
    .filter((column) => Math.abs(coordinate - column.anchorX) <= AVATAR_COLUMN_CLUSTER_DISTANCE)
    .sort((left, right) => left.items.length - right.items.length || Math.abs(coordinate - left.anchorX) - Math.abs(coordinate - right.anchorX));

  return availableColumns[0] ?? null;
}

function resolveAvatarColumnX(columns: readonly AvatarLayoutColumn[], coordinate: number, minX: number, maxX: number): number {
  const preferredX = clamp(coordinate, minX, maxX);
  const offsetSteps = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6];

  for (const offsetStep of offsetSteps) {
    const x = clamp(preferredX + offsetStep * AVATAR_COLUMN_STEP, minX, maxX);
    const hasComfortableDistance = columns.every((column) => Math.abs(column.x - x) >= AVATAR_COLUMN_STEP);
    if (hasComfortableDistance) {
      return x;
    }
  }

  return preferredX;
}

function createResonanceClusters(layoutItems: readonly AvatarLayoutItem[]): AvatarLayoutItem[][] {
  const itemsByGroupKey = new Map<string, AvatarLayoutItem[]>();

  for (const item of layoutItems) {
    const groupKey = createResonanceGroupKey(item.signal);
    if (!groupKey) {
      continue;
    }

    const groupedItems = itemsByGroupKey.get(groupKey) ?? [];
    groupedItems.push(item);
    itemsByGroupKey.set(groupKey, groupedItems);
  }

  const clusters: AvatarLayoutItem[][] = [];
  for (const groupedItems of itemsByGroupKey.values()) {
    const sortedItems = groupedItems
      .slice()
      .sort((left, right) => getSignalTimestamp(left.signal) - getSignalTimestamp(right.signal) || left.x - right.x);
    let currentCluster: AvatarLayoutItem[] = [];

    for (const item of sortedItems) {
      const lastItem = currentCluster.at(-1);
      if (!lastItem || isSameResonanceTimeWindow(lastItem.signal, item.signal)) {
        currentCluster.push(item);
        continue;
      }

      if (currentCluster.length > 1) {
        clusters.push(currentCluster);
      }
      currentCluster = [item];
    }

    if (currentCluster.length > 1) {
      clusters.push(currentCluster);
    }
  }

  return clusters;
}

function createResonanceGroupKey(signal: StructuredSignal): string | null {
  if (!isResonanceSignal(signal)) {
    return null;
  }

  return `${signal.symbol}:${signal.direction}`;
}

function isResonanceSignal(signal: StructuredSignal): boolean {
  const searchText = [
    signal.id,
    signal.source_type,
    signal.summary,
    signal.confirmation,
  ].join(" ").toLowerCase();

  return searchText.includes("\u5171\u632f") || searchText.includes("resonance");
}

function isSameResonanceTimeWindow(left: StructuredSignal, right: StructuredSignal): boolean {
  const leftTimestamp = getSignalTimestamp(left);
  const rightTimestamp = getSignalTimestamp(right);
  if (!Number.isFinite(leftTimestamp) || !Number.isFinite(rightTimestamp)) {
    return false;
  }

  return Math.abs(rightTimestamp - leftTimestamp) <= RESONANCE_GROUP_MAX_TIME_GAP_MS;
}

function getSignalTimestamp(signal: StructuredSignal): number {
  return Date.parse(signal.created_at);
}

function createSignalAvatarButton(input: {
  activeSignal: StructuredSignal | null;
  item: AvatarLayoutItem;
  language: WorkspaceLanguage;
  onSignalSelect: (signal: StructuredSignal) => void;
  theme: ChartTheme;
}): HTMLButtonElement {
  const { activeSignal, item, language, onSignalSelect, theme } = input;
  const copy = getWorkspaceCopy(language);
  const { signal } = item;
  const isActive = activeSignal?.id === signal.id;
  const isDarkTheme = theme === "dark";
  const button = document.createElement("button");
  const avatar = document.createElement("span");
  const tooltip = document.createElement("span");

  button.type = "button";
  button.title = copy.kline.eventTitle(signal.source_name, signal.created_at.replace("T", " ").slice(0, 16));
  button.style.position = "absolute";
  button.style.left = `${item.x}px`;
  button.style.bottom = `${getAvatarBottom(item)}px`;
  button.style.transform = "translateX(-50%)";
  button.style.display = "grid";
  button.style.placeItems = "center";
  button.style.width = `${AVATAR_SIZE}px`;
  button.style.height = `${AVATAR_SIZE}px`;
  button.style.padding = "0";
  button.style.border = "none";
  button.style.background = "transparent";
  button.style.borderRadius = "999px";
  button.style.cursor = "pointer";
  button.style.opacity = isActive ? "1" : "0.76";
  button.style.overflow = "visible";
  button.style.transition = "opacity 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1), filter 160ms ease";
  button.style.pointerEvents = "auto";
  button.style.zIndex = isActive ? "44" : "32";

  avatar.style.display = "block";
  avatar.style.position = "relative";
  avatar.style.zIndex = "2";
  avatar.style.width = `${AVATAR_SIZE}px`;
  avatar.style.height = `${AVATAR_SIZE}px`;
  avatar.style.borderRadius = "999px";
  avatar.style.background = isDarkTheme ? "#181A20" : "#F1F5F9";
  avatar.style.backgroundImage = `url("${getResolvedKolAvatarUrl(signal.source_name, signal.source_avatar_url)}")`;
  avatar.style.backgroundPosition = "center";
  avatar.style.backgroundSize = "cover";
  avatar.style.border = isActive ? "2px solid #00A6F4" : "2px solid rgba(255, 255, 255, 0.88)";
  avatar.style.boxSizing = "border-box";
  avatar.style.boxShadow = isActive
    ? isDarkTheme ? "0 2px 5px rgba(0, 0, 0, 0.28)" : "0 2px 5px rgba(15, 23, 42, 0.14)"
    : isDarkTheme ? "0 2px 5px rgba(0, 0, 0, 0.28)" : "0 2px 5px rgba(15, 23, 42, 0.14)";

  tooltip.textContent = signal.source_name;
  tooltip.style.position = "absolute";
  tooltip.style.left = "50%";
  tooltip.style.bottom = "32px";
  tooltip.style.transform = "translateX(-50%) translateY(4px)";
  tooltip.style.maxWidth = "180px";
  tooltip.style.whiteSpace = "nowrap";
  tooltip.style.overflow = "hidden";
  tooltip.style.textOverflow = "ellipsis";
  tooltip.style.borderRadius = "999px";
  tooltip.style.background = isDarkTheme ? "rgba(24, 26, 32, 0.96)" : "rgba(255, 255, 255, 0.98)";
  tooltip.style.border = isDarkTheme ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(226,232,240,0.95)";
  tooltip.style.boxShadow = isDarkTheme ? "0 12px 30px rgba(0,0,0,0.30)" : "0 12px 30px rgba(15,23,42,0.14)";
  tooltip.style.color = isDarkTheme ? "#E2E8F0" : "#334155";
  tooltip.style.fontSize = "11px";
  tooltip.style.fontWeight = "700";
  tooltip.style.lineHeight = "1";
  tooltip.style.opacity = "0";
  tooltip.style.padding = "6px 8px";
  tooltip.style.pointerEvents = "none";
  tooltip.style.transition = "opacity 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1)";
  tooltip.style.zIndex = "60";

  const showTooltip = () => {
    button.parentElement?.setAttribute("data-signal-event-hovering", "true");
    button.style.opacity = "1";
    button.style.transform = "translateX(-50%) scale(1.05)";
    tooltip.style.opacity = "1";
    tooltip.style.transform = "translateX(-50%) translateY(0)";
  };
  const hideTooltip = () => {
    button.parentElement?.removeAttribute("data-signal-event-hovering");
    button.style.opacity = isActive ? "1" : "0.76";
    button.style.transform = "translateX(-50%) scale(1)";
    tooltip.style.opacity = "0";
    tooltip.style.transform = "translateX(-50%) translateY(4px)";
  };
  const handleClick = (event: MouseEvent) => {
    event.stopPropagation();
    onSignalSelect(signal);
  };

  button.onmouseenter = showTooltip;
  button.onmouseover = showTooltip;
  button.onmouseleave = hideTooltip;
  button.onclick = handleClick;
  button.append(avatar, tooltip);
  return button;
}

function createResonanceClusterDecoration(cluster: readonly AvatarLayoutItem[], theme: ChartTheme, language: WorkspaceLanguage): HTMLDivElement {
  const copy = getWorkspaceCopy(language);
  const wrapper = document.createElement("div");
  const tooltip = document.createElement("span");
  const minX = Math.min(...cluster.map((item) => item.x)) - AVATAR_SIZE / 2 - 8;
  const maxX = Math.max(...cluster.map((item) => item.x)) + AVATAR_SIZE / 2 + 8;
  const minBottom = Math.min(...cluster.map((item) => getAvatarBottom(item))) - 6;
  const maxBottom = Math.max(...cluster.map((item) => getAvatarBottom(item))) + AVATAR_SIZE + 6;
  const width = Math.max(40, maxX - minX);
  const height = Math.max(34, maxBottom - minBottom);
  const centerX = minX + width / 2;
  const centerBottom = minBottom + height / 2;
  const diameter = Math.max(48, Math.min(Math.max(width, height) - 6, 60));

  wrapper.style.position = "absolute";
  wrapper.style.left = `${centerX - diameter / 2}px`;
  wrapper.style.bottom = `${centerBottom - diameter / 2}px`;
  wrapper.style.width = `${diameter}px`;
  wrapper.style.height = `${diameter}px`;
  wrapper.style.borderRadius = "999px";
  wrapper.style.pointerEvents = "auto";
  wrapper.style.zIndex = "18";

  tooltip.textContent = copy.kline.resonance(cluster.length);
  tooltip.style.position = "absolute";
  tooltip.style.left = "50%";
  tooltip.style.bottom = `${diameter + 8}px`;
  tooltip.style.transform = "translateX(-50%) translateY(4px)";
  tooltip.style.maxWidth = "180px";
  tooltip.style.whiteSpace = "nowrap";
  tooltip.style.overflow = "hidden";
  tooltip.style.textOverflow = "ellipsis";
  tooltip.style.borderRadius = "999px";
  tooltip.style.background = theme === "dark" ? "rgba(24, 26, 32, 0.96)" : "rgba(255, 255, 255, 0.98)";
  tooltip.style.border = theme === "dark" ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(226,232,240,0.95)";
  tooltip.style.boxShadow = theme === "dark" ? "0 12px 30px rgba(0,0,0,0.30)" : "0 12px 30px rgba(15,23,42,0.14)";
  tooltip.style.color = theme === "dark" ? "#E2E8F0" : "#334155";
  tooltip.style.fontSize = "11px";
  tooltip.style.fontWeight = "700";
  tooltip.style.lineHeight = "1";
  tooltip.style.opacity = "0";
  tooltip.style.padding = "6px 8px";
  tooltip.style.pointerEvents = "none";
  tooltip.style.transition = "opacity 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1)";
  tooltip.style.zIndex = "60";

  appendResonanceRings(wrapper, cluster.length);
  wrapper.onmouseenter = () => {
    tooltip.style.opacity = "1";
    tooltip.style.transform = "translateX(-50%) translateY(0)";
  };
  wrapper.onmouseleave = () => {
    tooltip.style.opacity = "0";
    tooltip.style.transform = "translateX(-50%) translateY(4px)";
  };
  wrapper.appendChild(tooltip);
  return wrapper;
}

function appendResonanceRings(container: HTMLDivElement, resonanceCount: number): void {
  const amplitude = Math.min(1.18 + resonanceCount * 0.035, 1.3);
  const opacity = Math.min(0.32 + resonanceCount * 0.04, 0.48);
  const ringCount = 3;
  const ringBorderWidths = [2, 1.5, 1];

  for (let index = 0; index < ringCount; index += 1) {
    const ring = document.createElement("span");
    ring.className = "kline-kol-resonance-ring";
    ring.style.setProperty("--resonance-start-scale", String(0.72 + index * 0.16));
    ring.style.setProperty("--resonance-scale", String(amplitude));
    ring.style.setProperty("--resonance-opacity", String(Math.max(0.2, opacity - index * 0.05)));
    ring.style.animationDelay = `${-index * 0.56}s`;
    ring.style.inset = "0";
    ring.style.borderRadius = "999px";
    ring.style.borderWidth = `${ringBorderWidths[index] ?? 1}px`;
    ring.style.borderColor = `rgba(102, 214, 255, ${Math.min(opacity + 0.1 - index * 0.03, 0.56)})`;
    container.appendChild(ring);
  }
}

function getAvatarBottom(item: AvatarLayoutItem): number {
  return AVATAR_BASE_BOTTOM + item.lane * AVATAR_STACK_STEP;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
