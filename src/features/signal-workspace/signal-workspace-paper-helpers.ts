import { createKolSourceWatchKey } from "@/app/_lib/workspace-watchlist";
import type { StructuredSignal } from "@/app/_types/signal";
import {
  EMPTY_STRUCTURED_SIGNALS,
  PAPER_POSITION_PRIORITY_SIGNAL_LIMIT,
} from "./signal-workspace-helpers-constants";

export function createPrioritizedPaperPositionSignals({
  activeSignal,
  signals,
  shouldUsePaperPositions,
  watchlistedKolSourceKeys,
}: {
  activeSignal: StructuredSignal | null;
  signals: readonly StructuredSignal[];
  shouldUsePaperPositions: boolean;
  watchlistedKolSourceKeys: ReadonlySet<string>;
}): readonly StructuredSignal[] {
  if (!shouldUsePaperPositions) {
    return EMPTY_STRUCTURED_SIGNALS;
  }

  /**
   * Paper-position simulation is the expensive realtime path: it fetches 1m
   * candles and recomputes lifecycle state as live prices move. Prioritizing the
   * selected card, watched KOLs, and recent feed keeps the visible workspace
   * accurate without opening candle streams for the full seven-day history.
   */
  const prioritizedSignals: StructuredSignal[] = [];
  const selectedSignalIds = new Set<string>();
  const addSignal = (signal: StructuredSignal | null | undefined) => {
    if (!signal || selectedSignalIds.has(signal.id)) {
      return;
    }

    selectedSignalIds.add(signal.id);
    prioritizedSignals.push(signal);
  };

  addSignal(activeSignal);

  for (const signal of signals) {
    if (prioritizedSignals.length >= PAPER_POSITION_PRIORITY_SIGNAL_LIMIT) {
      break;
    }

    const sourceKey = createKolSourceWatchKey(signal.source_name);
    if (watchlistedKolSourceKeys.has(sourceKey)) {
      addSignal(signal);
    }
  }

  for (const signal of signals) {
    if (prioritizedSignals.length >= PAPER_POSITION_PRIORITY_SIGNAL_LIMIT) {
      break;
    }

    addSignal(signal);
  }

  return prioritizedSignals;
}
