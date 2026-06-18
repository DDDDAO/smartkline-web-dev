import { createKolSourceWatchKey } from "@/lib/workspace-watchlist";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { PaperPositionRecord } from "@/lib/paper-position";
import type { StructuredSignal } from "@/types/signal";
import { ALL_STATUS_FILTER, KOL_STATS_GROUP_LIMIT, KOL_STATS_SAMPLE_LIMIT, STATUS_FILTER_OPTIONS, type KolStatsGroupModel, type KolStatsMetricModel, type KolStatsModel, type KolStatsSummaryModel, type StatusFilterOption, type WatchedKolSourceModel } from "./shared";

export function createUniqueOptions<T extends string>(values: readonly T[]): T[] {
  return Array.from(new Set(values)).sort((left, right) =>
    left.localeCompare(right),
  );
}

export function isStatusFilterOption(value: string): value is StatusFilterOption {
  return STATUS_FILTER_OPTIONS.includes(value as StatusFilterOption);
}

export function isStatusStatsFilter(
  value: StatusFilterOption | typeof ALL_STATUS_FILTER,
): boolean {
  return value === "closed" || value === "take-profit" || value === "stop-loss";
}

export function matchesStatusFilter(
  record: PaperPositionRecord | null,
  statusFilter: StatusFilterOption,
): boolean {
  if (!record || record.status === "invalid") {
    return false;
  }

  if (statusFilter === "closed") {
    return record.status === "exited";
  }

  if (statusFilter === "entered") {
    return record.status === "entered";
  }

  if (statusFilter === "not-entered") {
    return record.status === "not-entered";
  }

  return record.status === "exited" && record.exitReason === statusFilter;
}

export function createWatchedKolSourceModels(
  signals: readonly StructuredSignal[],
  watchlistedSourceKeys: ReadonlySet<string> | undefined,
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>,
): WatchedKolSourceModel[] {
  if (!watchlistedSourceKeys || watchlistedSourceKeys.size === 0) {
    return [];
  }

  const signalsBySourceKey = new Map<string, StructuredSignal[]>();
  for (const signal of signals) {
    const sourceKey = createKolSourceWatchKey(signal.source_name);
    if (!watchlistedSourceKeys.has(sourceKey)) {
      continue;
    }

    const sourceSignals = signalsBySourceKey.get(sourceKey) ?? [];
    sourceSignals.push(signal);
    signalsBySourceKey.set(sourceKey, sourceSignals);
  }

  return Array.from(signalsBySourceKey.entries())
    .map(([sourceKey, sourceSignals]) => {
      const sortedSignals = sortSignalsByCreatedAtDesc(sourceSignals);
      const latestSignal = sortedSignals[0];
      return {
        avatarUrl: latestSignal.source_avatar_url,
        key: sourceKey,
        latestSignal,
        name: latestSignal.source_name,
        paperPositionRecord: paperPositionsBySignalId[latestSignal.id] ?? null,
        signalCount: sortedSignals.length,
      };
    })
    .sort((left, right) => Date.parse(right.latestSignal.created_at) - Date.parse(left.latestSignal.created_at))
    .slice(0, 8);
}

export function createKolStatsSummary({
  baseFilteredSignals,
  copy,
  isStatusStatsFilter,
  paperPositionsBySignalId,
  selectedKolName,
  statusFilteredSignals,
}: {
  baseFilteredSignals: readonly StructuredSignal[];
  copy: WorkspaceCopy;
  isStatusStatsFilter: boolean;
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>;
  selectedKolName: string | null;
  statusFilteredSignals: readonly StructuredSignal[];
}): KolStatsSummaryModel | null {
  if (!selectedKolName && !isStatusStatsFilter) {
    return null;
  }

  const summarySignals = isStatusStatsFilter
    ? statusFilteredSignals
    : baseFilteredSignals;
  if (summarySignals.length === 0) {
    return null;
  }

  const sampledSignals = sortSignalsByCreatedAtDesc(summarySignals).slice(
    0,
    KOL_STATS_SAMPLE_LIMIT,
  );
  const stats = createKolStatsFromSignals(
    sampledSignals,
    paperPositionsBySignalId,
  );
  const groups = isStatusStatsFilter
    ? createKolStatsGroups(sampledSignals, paperPositionsBySignalId, copy)
    : [];
  const titlePrefix = selectedKolName ? `${selectedKolName} · ` : "";
  const title = `${titlePrefix}${
    isStatusStatsFilter
      ? copy.kol.stats.filteredTitle
      : copy.kol.stats.recentTitle
  }`;
  const metaParts = [copy.kol.stats.sample(sampledSignals.length)];
  if (isStatusStatsFilter) {
    metaParts.push(copy.kol.stats.kolCount(countUniqueKols(sampledSignals)));
  }

  return {
    groups,
    metrics: createKolStatsMetrics(stats, copy),
    meta: metaParts.join(" · "),
    title,
  };
}

export function createKolStatsMetrics(
  stats: KolStatsModel,
  copy: WorkspaceCopy,
): KolStatsMetricModel[] {
  return [
    { label: copy.kol.stats.closed, value: String(stats.closedCount) },
    { label: copy.kol.stats.winRate, tone: getWinRateTone(stats.winRatePercent), value: formatPercent(stats.winRatePercent) },
    {
      label: copy.kol.stats.totalPnl,
      tone: getPercentTone(stats.totalPnlPercent),
      value: formatSignedPercent(stats.totalPnlPercent),
    },
    { label: copy.kol.stats.pending, value: String(stats.pendingCount) },
  ];
}

export function createKolStatsGroups(
  signals: readonly StructuredSignal[],
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>,
  copy: WorkspaceCopy,
): KolStatsGroupModel[] {
  const signalsByKol = new Map<string, StructuredSignal[]>();

  for (const signal of signals) {
    const currentSignals = signalsByKol.get(signal.source_name) ?? [];
    currentSignals.push(signal);
    signalsByKol.set(signal.source_name, currentSignals);
  }

  return Array.from(signalsByKol.entries())
    .map(([kolName, kolSignals]) => {
      const stats = createKolStatsFromSignals(kolSignals, paperPositionsBySignalId);
      return {
        closedText: `${copy.kol.stats.closed} ${stats.closedCount}`,
        exitBreakdownText: `${copy.kol.stats.profitLoss} ${stats.takeProfitCount}/${stats.stopLossCount}`,
        kolName,
        stats,
        totalPnlText: formatSignedPercent(stats.totalPnlPercent),
        totalPnlTone: getPercentTone(stats.totalPnlPercent),
      };
    })
    .sort((left, right) => {
      const closedSort = right.stats.closedCount - left.stats.closedCount;
      if (closedSort !== 0) {
        return closedSort;
      }

      return (
        (right.stats.totalPnlPercent ?? Number.NEGATIVE_INFINITY) -
        (left.stats.totalPnlPercent ?? Number.NEGATIVE_INFINITY)
      );
    })
    .slice(0, KOL_STATS_GROUP_LIMIT)
    .map((group) => ({
      closedText: group.closedText,
      exitBreakdownText: group.exitBreakdownText,
      kolName: group.kolName,
      totalPnlText: group.totalPnlText,
      totalPnlTone: group.totalPnlTone,
    }));
}

export function createKolStatsFromSignals(
  signals: readonly StructuredSignal[],
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>,
): KolStatsModel {
  let closedCount = 0;
  let pendingCount = 0;
  let pnlSum = 0;
  let stopLossCount = 0;
  let takeProfitCount = 0;

  for (const signal of signals) {
    const record = paperPositionsBySignalId[signal.id] ?? null;
    if (!record || record.status !== "exited") {
      pendingCount += 1;
      continue;
    }

    closedCount += 1;
    if (record.exitReason === "take-profit") {
      takeProfitCount += 1;
    }
    if (record.exitReason === "stop-loss") {
      stopLossCount += 1;
    }
    if (record.pnlPercent !== null) {
      pnlSum += record.pnlPercent;
    }
  }

  return {
    closedCount,
    pendingCount,
    stopLossCount,
    takeProfitCount,
    totalPnlPercent: closedCount > 0 ? pnlSum : null,
    winRatePercent:
      closedCount > 0 ? (takeProfitCount / closedCount) * 100 : null,
  };
}

export function countUniqueKols(signals: readonly StructuredSignal[]): number {
  return new Set(signals.map((signal) => signal.source_name)).size;
}

export function sortSignalsByCreatedAtDesc(
  signals: readonly StructuredSignal[],
): StructuredSignal[] {
  return signals.slice().sort((left, right) => {
    const createdAtSort =
      Date.parse(right.created_at) - Date.parse(left.created_at);
    if (Number.isFinite(createdAtSort) && createdAtSort !== 0) {
      return createdAtSort;
    }

    return right.id.localeCompare(left.id);
  });
}

export function formatPercent(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return `${formatCompactPercentNumber(value)}%`;
}

export function formatSignedPercent(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return `${value >= 0 ? "+" : ""}${formatCompactPercentNumber(value)}%`;
}

export function formatCompactPercentNumber(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

export function getPercentTone(value: number | null): KolStatsMetricModel["tone"] {
  if (value === null || value === 0) {
    return "default";
  }

  return value > 0 ? "positive" : "negative";
}

export function getWinRateTone(value: number | null): KolStatsMetricModel["tone"] {
  if (value === null || value === 50) {
    return "default";
  }

  return value > 50 ? "positive" : "negative";
}

export function getKolStatsMetricValueClassName(
  isDarkTheme: boolean,
  tone: KolStatsMetricModel["tone"] = "default",
): string {
  if (tone === "positive") {
    return isDarkTheme
      ? "truncate text-xs font-semibold leading-4 text-[#45DCA6]"
      : "truncate text-xs font-semibold leading-4 text-[#159B72]";
  }

  if (tone === "negative") {
    return isDarkTheme
      ? "truncate text-xs font-semibold leading-4 text-[#FF7586]"
      : "truncate text-xs font-semibold leading-4 text-[#D9515F]";
  }

  return isDarkTheme
    ? "truncate text-xs font-semibold leading-4 text-slate-200"
    : "truncate text-xs font-semibold leading-4 text-slate-800";
}

export function getScrollContentTop(element: HTMLElement, scrollArea: HTMLElement | null): number {
  if (!scrollArea) {
    return element.getBoundingClientRect().top;
  }

  const elementRect = element.getBoundingClientRect();
  const scrollAreaRect = scrollArea.getBoundingClientRect();

  return elementRect.top - scrollAreaRect.top + scrollArea.scrollTop;
}
