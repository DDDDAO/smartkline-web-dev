import type { WorkspaceCopy } from "@/i18n/workspace";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { StructuredSignal } from "@/app/_types/signal";

export type KolFollowModel = {
  activeCount: number;
  avatarUrl: string | null;
  latestSignal: StructuredSignal;
  name: string;
  pnlText: string;
  pnlTone: "default" | "negative" | "positive";
  score: number | null;
  signalCount: number;
  symbols: string[];
};

export function createKolFollowModels(
  signals: readonly StructuredSignal[],
  paperPositionsBySignalId: Readonly<Record<string, PaperPositionRecord>>,
): KolFollowModel[] {
  const groups = new Map<string, StructuredSignal[]>();

  for (const signal of signals) {
    const currentGroup = groups.get(signal.source_name) ?? [];
    currentGroup.push(signal);
    groups.set(signal.source_name, currentGroup);
  }

  return Array.from(groups.entries())
    .map(([name, groupSignals]) => {
      const sortedSignals = groupSignals
        .slice()
        .sort(
          (left, right) =>
            Date.parse(right.created_at) - Date.parse(left.created_at),
        );
      const records = sortedSignals
        .map((signal) => paperPositionsBySignalId[signal.id])
        .filter(Boolean);
      const pnlValues = records
        .map((record) => record.pnlPercent)
        .filter((value): value is number => value !== null);
      const totalPnl = pnlValues.reduce((sum, value) => sum + value, 0);
      const activeCount = records.filter(
        (record) => record.status === "entered",
      ).length;
      const latestSignal = sortedSignals[0];
      const score = pnlValues.length > 0 ? totalPnl : null;

      return {
        activeCount,
        avatarUrl: latestSignal.source_avatar_url,
        latestSignal,
        name,
        pnlText: pnlValues.length > 0 ? formatSignedPercent(totalPnl) : "--",
        pnlTone: getTone(totalPnl, pnlValues.length),
        score,
        signalCount: sortedSignals.length,
        symbols: Array.from(
          new Set(sortedSignals.map((signal) => signal.symbol)),
        ),
      };
    })
    .sort((left, right) => {
      if (left.score !== null && right.score !== null && right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.score !== null && right.score === null) {
        return -1;
      }

      if (left.score === null && right.score !== null) {
        return 1;
      }

      return right.signalCount - left.signalCount;
    })
    .slice(0, 8);
}

export function getTone(
  value: number | null,
  sampleSize: number,
): "default" | "negative" | "positive" {
  if (sampleSize === 0 || value === null || value === 0) {
    return "default";
  }

  return value > 0 ? "positive" : "negative";
}

export function formatSignalEntryText(
  signal: StructuredSignal,
  copy: WorkspaceCopy,
): string {
  if (signal.entry_type === "range") {
    const values = [signal.entry_min, signal.entry_max]
      .filter((value): value is number => value !== null)
      .map((value) => value.toLocaleString("en-US"));
    return values.length > 0 ? values.join("-") : copy.kol.marketPrice;
  }

  return signal.trigger_price?.toLocaleString("en-US") ?? copy.kol.marketPrice;
}

export function formatSymbolLabel(symbol: string): string {
  const [marketPair] = symbol.split(":");
  return marketPair.replace("/", "");
}

export function formatSignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
