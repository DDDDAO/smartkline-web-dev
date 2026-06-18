import type { StructuredSignal } from "@/types/signal";

export function createSignalFocusRequestKey(signal: StructuredSignal): string {
  return `${signal.id}:${signal.symbol}:${signal.created_at}`;
}
