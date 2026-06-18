import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { MarketSymbol } from "@/app/_types/market";
import type { StructuredSignal } from "@/app/_types/signal";

export const ALL_SYMBOL_FILTER = "__all_symbols__";
export const ALL_DIRECTION_FILTER = "__all_directions__";
export const ALL_KOL_FILTER = "__all_kols__";
export const ALL_STATUS_FILTER = "__all_statuses__";
export const STATUS_FILTER_OPTIONS = ["closed", "entered", "not-entered", "take-profit", "stop-loss"] as const;
export const KOL_STATS_SAMPLE_LIMIT = 20;
export const KOL_STATS_GROUP_LIMIT = 4;

export type StatusFilterOption = (typeof STATUS_FILTER_OPTIONS)[number];

export type KolStatsSummaryModel = {
  groups: KolStatsGroupModel[];
  metrics: KolStatsMetricModel[];
  meta: string;
  title: string;
};

export type KolStatsGroupModel = {
  closedText: string;
  exitBreakdownText: string;
  kolName: string;
  totalPnlText: string;
  totalPnlTone?: "default" | "negative" | "positive";
};

export type KolStatsMetricModel = {
  label: string;
  tone?: "default" | "negative" | "positive";
  value: string;
};

export type WatchedKolSourceModel = {
  avatarUrl: string | null;
  key: string;
  latestSignal: StructuredSignal;
  name: string;
  paperPositionRecord: PaperPositionRecord | null;
  signalCount: number;
};

export type KolStatsModel = {
  closedCount: number;
  pendingCount: number;
  stopLossCount: number;
  takeProfitCount: number;
  totalPnlPercent: number | null;
  winRatePercent: number | null;
};

export type KolPanelFiltersState = {
  directionOptions: readonly StructuredSignal["direction"][];
  effectiveDirectionFilter: string;
  effectiveKolFilter: string;
  effectiveStatusFilter: StatusFilterOption | typeof ALL_STATUS_FILTER;
  effectiveSymbolFilter: string;
  kolOptions: readonly string[];
  symbolOptions: readonly MarketSymbol[];
};
