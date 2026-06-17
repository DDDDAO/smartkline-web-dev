import type { TradingFoxStrategyDetail, TradingFoxStrategyDetailSection } from "@/app/_lib/tradingfox-control-plane";
import type { StrategyDetailCurveWindow } from "./strategy-detail-content";

const STRATEGY_DETAIL_CURVE_WINDOWS: readonly StrategyDetailCurveWindow[] = ["24h", "7d", "30d", "90d"];

type RequestStrategyDetailOptions = {
  curveWindow?: StrategyDetailCurveWindow;
  orderLimit?: number;
  orderOffset?: number;
  sections?: readonly TradingFoxStrategyDetailSection[];
};

type IdleCallbackWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
};

export function scheduleStrategyDetailTask(callback: () => void): () => void {
  const idleWindow = window as IdleCallbackWindow;
  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: 700 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const timeoutId = window.setTimeout(callback, 120);
  return () => window.clearTimeout(timeoutId);
}

export function mergeStrategyDetail(
  currentDetail: TradingFoxStrategyDetail | null,
  nextDetail: TradingFoxStrategyDetail,
): TradingFoxStrategyDetail {
  if (!currentDetail) {
    return nextDetail;
  }

  const nextLoadedSections = new Set(nextDetail.loadedSections ?? []);
  return {
    ...currentDetail,
    ...nextDetail,
    account: nextLoadedSections.has("account") ? nextDetail.account : currentDetail.account,
    accountError: nextLoadedSections.has("account") ? nextDetail.accountError : currentDetail.accountError,
    accountInitialEquity: nextDetail.accountInitialEquity ?? currentDetail.accountInitialEquity,
    loadedSections: mergeLoadedStrategyDetailSections(currentDetail.loadedSections, nextDetail.loadedSections),
    orderHistory: nextLoadedSections.has("orders") ? nextDetail.orderHistory : currentDetail.orderHistory,
    orderHistoryError: nextLoadedSections.has("orders") ? nextDetail.orderHistoryError : currentDetail.orderHistoryError,
    positions: nextLoadedSections.has("positions") ? nextDetail.positions : currentDetail.positions,
    positionsError: nextLoadedSections.has("positions") ? nextDetail.positionsError : currentDetail.positionsError,
    signalSources: nextLoadedSections.has("signalSources") ? nextDetail.signalSources : currentDetail.signalSources,
    signalSourcesError: nextLoadedSections.has("signalSources") ? nextDetail.signalSourcesError : currentDetail.signalSourcesError,
    strategy: {
      ...currentDetail.strategy,
      ...nextDetail.strategy,
    },
    strategyCurve: nextLoadedSections.has("curve") ? nextDetail.strategyCurve : currentDetail.strategyCurve,
    strategyCurveError: nextLoadedSections.has("curve") ? nextDetail.strategyCurveError : currentDetail.strategyCurveError,
    trader: {
      ...currentDetail.trader,
      ...nextDetail.trader,
    },
  };
}

export function mergeLoadedStrategyDetailSections(
  currentSections: readonly TradingFoxStrategyDetailSection[] | undefined,
  nextSections: readonly TradingFoxStrategyDetailSection[] | undefined,
): TradingFoxStrategyDetailSection[] {
  return Array.from(new Set([...(currentSections ?? []), ...(nextSections ?? [])]));
}

export function getStrategyCurveQueryKey(strategyId: string, window: StrategyDetailCurveWindow) {
  return ["tradingfox", "strategy-curve", strategyId, window] as const;
}

export function getAdjacentStrategyCurveWindows(window: StrategyDetailCurveWindow): StrategyDetailCurveWindow[] {
  const activeIndex = STRATEGY_DETAIL_CURVE_WINDOWS.indexOf(window);
  if (activeIndex < 0) {
    return [];
  }

  return [STRATEGY_DETAIL_CURVE_WINDOWS[activeIndex - 1], STRATEGY_DETAIL_CURVE_WINDOWS[activeIndex + 1]]
    .filter((nextWindow): nextWindow is StrategyDetailCurveWindow => Boolean(nextWindow));
}

export async function requestStrategyDetail(
  strategyId: string,
  options: RequestStrategyDetailOptions = {},
): Promise<TradingFoxStrategyDetail> {
  const query = new URLSearchParams();
  if (options.curveWindow !== undefined) {
    query.set("curveWindow", options.curveWindow);
  }
  if (options.orderLimit !== undefined) {
    query.set("orderLimit", String(options.orderLimit));
  }
  if (options.orderOffset !== undefined) {
    query.set("orderOffset", String(options.orderOffset));
  }
  if (options.sections && options.sections.length > 0) {
    query.set("sections", options.sections.join(","));
  }
  const queryString = query.toString();
  const response = await fetch(`/api/tradingfox/copy-strategies/${encodeURIComponent(strategyId)}${queryString ? `?${queryString}` : ""}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await response.json() as TradingFoxStrategyDetail | { error?: string };
  if (!response.ok) {
    throw new Error("error" in payload && payload.error ? payload.error : `Strategy detail failed with status ${response.status}.`);
  }
  return payload as TradingFoxStrategyDetail;
}

export async function requestStrategyPositionSync(strategyId: string, ratioPercent: number): Promise<TradingFoxStrategyDetail> {
  const response = await fetch(`/api/tradingfox/copy-strategies/${encodeURIComponent(strategyId)}/sync-positions`, {
    body: JSON.stringify({ ratioPercent }),
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = await response.json() as TradingFoxStrategyDetail | { error?: string };
  if (!response.ok) {
    throw new Error("error" in payload && payload.error ? payload.error : `Position sync failed with status ${response.status}.`);
  }
  return payload as TradingFoxStrategyDetail;
}
