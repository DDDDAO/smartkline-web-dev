import { toCopyTradingMarketSymbol } from "@/lib/copy-trading-radar-api";
import type { MarketSymbol } from "@/types/market";
import { getAppLocaleFromPathname, isAppLocale } from "@/i18n/locales";
import type { WorkspaceProductTab } from "./product-tabs";
import {
  DEFAULT_TOP_SIGNALS_WORKSPACE_PANEL,
  normalizeTopSignalsWorkspacePanel,
  type TopSignalsWorkspacePanel,
} from "./top-signals-workspace-tabs";

const WORKSPACE_TAB_ROUTE_SEGMENTS: Readonly<
  Record<WorkspaceProductTab, string>
> = {
  accountManagement: "account",
  referrals: "referrals",
  strategyManagement: "strategies",
  strategySquare: "strategy-square",
  topSignals: "signal",
};

export type WorkspaceRouteState = {
  accountStrategyId: string;
  signalId: string;
  symbol: MarketSymbol | null;
  tab: WorkspaceProductTab | null;
  topSignalSourceId: string;
  topSignalTradeEventId: string;
  topSignalsPanel: TopSignalsWorkspacePanel;
};

export function createWorkspaceRouteUrl(input: {
  accountStrategyId: string;
  activeSignalId: string;
  currentPathname: string;
  symbol: MarketSymbol;
  tab: WorkspaceProductTab;
  topSignalSourceId: string;
  topSignalTradeEventId: string;
  topSignalsPanel: TopSignalsWorkspacePanel;
}): string {
  const routePrefix = getWorkspaceRoutePrefix(input.currentPathname);
  const tabSegment = WORKSPACE_TAB_ROUTE_SEGMENTS[input.tab];
  const symbolSegment = encodeMarketSymbolForRoute(input.symbol);
  const queryParams = new URLSearchParams();

  if (input.tab === "topSignals") {
    if (input.topSignalsPanel === "kol") {
      queryParams.set("panel", "kol");
      if (input.activeSignalId) {
        queryParams.set("signal", input.activeSignalId);
      }
    } else {
      if (input.topSignalSourceId) {
        queryParams.set("source", input.topSignalSourceId);
      }
      if (input.topSignalTradeEventId) {
        queryParams.set("trade", input.topSignalTradeEventId);
      }
    }
  }

  const path =
    input.tab === "strategyManagement" && input.accountStrategyId
      ? `${routePrefix}/strategies/${encodeURIComponent(input.accountStrategyId)}`
      : shouldWorkspaceTabUseSymbolRoute(input.tab)
        ? `${routePrefix}/${tabSegment}/${encodeURIComponent(symbolSegment)}`
        : `${routePrefix}/${tabSegment}`;
  const query = queryParams.toString();
  return query ? `${path}?${query}` : path;
}

export function readWorkspaceRouteStateFromLocation(): WorkspaceRouteState {
  if (typeof window === "undefined") {
    return createEmptyWorkspaceRouteState();
  }

  return readWorkspaceRouteState(
    window.location.pathname,
    window.location.search,
  );
}

export function readWorkspaceRouteState(
  pathname: string,
  search: string,
): WorkspaceRouteState {
  const segments = pathname.split("/").filter(Boolean);
  const routeStartIndex = isAppLocale(segments[0]) ? 1 : 0;
  const tab = workspaceTabFromRouteSegment(segments[routeStartIndex] ?? "");
  if (!tab) {
    return createEmptyWorkspaceRouteState();
  }

  const rawSymbolSegment = shouldWorkspaceTabUseSymbolRoute(tab)
    ? (segments[routeStartIndex + 1] ?? "")
    : "";
  const symbol = rawSymbolSegment
    ? toCopyTradingMarketSymbol(safeDecodeRouteSegment(rawSymbolSegment))
    : null;
  const queryParams = new URLSearchParams(search);
  const topSignalsPanel = tab === "topSignals"
    ? normalizeTopSignalsWorkspacePanel(queryParams.get("panel"))
    : DEFAULT_TOP_SIGNALS_WORKSPACE_PANEL;

  return {
    accountStrategyId:
      tab === "strategyManagement"
        ? readStrategyIdFromRouteSegments(segments, routeStartIndex)
        : "",
    signalId:
      tab === "topSignals" && topSignalsPanel === "kol"
        ? (queryParams.get("signal")?.trim() ?? "")
        : "",
    symbol,
    tab,
    topSignalSourceId:
      tab === "topSignals" && topSignalsPanel === "lead"
        ? (queryParams.get("source")?.trim() ?? "")
        : "",
    topSignalTradeEventId:
      tab === "topSignals" && topSignalsPanel === "lead"
        ? (queryParams.get("trade")?.trim() ?? "")
        : "",
    topSignalsPanel,
  };
}

export function createEmptyWorkspaceRouteState(): WorkspaceRouteState {
  return {
    accountStrategyId: "",
    signalId: "",
    symbol: null,
    tab: null,
    topSignalSourceId: "",
    topSignalTradeEventId: "",
    topSignalsPanel: DEFAULT_TOP_SIGNALS_WORKSPACE_PANEL,
  };
}

export function workspaceTabFromRouteSegment(
  segment: string,
): WorkspaceProductTab | null {
  const normalizedSegment = segment.trim().toLowerCase();

  for (const [tab, routeSegment] of Object.entries(WORKSPACE_TAB_ROUTE_SEGMENTS)) {
    if (routeSegment === normalizedSegment) {
      return tab as WorkspaceProductTab;
    }
  }

  return null;
}

export function readStrategyIdFromRouteSegments(
  segments: readonly string[],
  routeStartIndex: number,
): string {
  const routeSegment = segments[routeStartIndex]?.trim().toLowerCase() ?? "";
  const rawStrategyId =
    routeSegment === "strategies" ? segments[routeStartIndex + 1] : "";
  return safeDecodeRouteSegment(rawStrategyId ?? "").trim();
}

export function shouldWorkspaceTabUseSymbolRoute(
  tab: WorkspaceProductTab,
): boolean {
  return tab === "topSignals";
}

export function getWorkspaceRoutePrefix(pathname: string): string {
  return `/${getAppLocaleFromPathname(pathname)}`;
}

export function encodeMarketSymbolForRoute(symbol: MarketSymbol): string {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const perpetualMatch = /^([^/]+)\/([^:]+)(?::[^:]+)?$/u.exec(
    normalizedSymbol,
  );
  if (perpetualMatch) {
    return `${perpetualMatch[1]}${perpetualMatch[2]}`;
  }

  return normalizedSymbol.replace(/[^A-Z0-9]/gu, "");
}

export function safeDecodeRouteSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
