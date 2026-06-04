import { mockKolSignals } from "@/app/_lib/mock-kol-signal-data";
import type { StructuredSignal } from "@/app/_types/signal";

type KolSignalSubscriptionHandlers = {
  onSignals: (signals: StructuredSignal[]) => void;
  onError?: (error: Error) => void;
};

export const fallbackKolSignals = mockKolSignals;

export async function fetchKolSignals(): Promise<StructuredSignal[]> {
  await delay(120);
  return mockKolSignals;
}

export function subscribeToKolSignals(handlers: KolSignalSubscriptionHandlers): () => void {
  const timeout = window.setTimeout(() => {
    handlers.onSignals(mockKolSignals);
  }, 500);

  const interval = window.setInterval(() => {
    handlers.onSignals(createMockRealtimeBatch());
  }, 12_000);

  return () => {
    window.clearTimeout(timeout);
    window.clearInterval(interval);
  };
}

export function createStructuredSignalPositionKey(signal: StructuredSignal): string {
  return stableStringify({
    direction: signal.direction,
    entry: {
      max: signal.entry_type === "range" ? signal.entry_max : null,
      min: signal.entry_type === "range" ? signal.entry_min : null,
      price: signal.entry_type === "trigger" ? signal.trigger_price : null,
      type: signal.entry_type,
    },
    source_type: signal.source_type,
    stop_loss: signal.stop_loss,
    symbol: signal.symbol,
    take_profits: signal.take_profit,
  });
}

function createMockRealtimeBatch(): StructuredSignal[] {
  return [
    {
      ...mockKolSignals[0],
      id: "mock-btc-short-range-realtime-duplicate",
      created_at: new Date().toISOString(),
      raw_text: "Realtime duplicate mock event with the same parsed BTC short position.",
    },
  ];
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item));
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, item]) => [key, sortJsonValue(item)]),
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
