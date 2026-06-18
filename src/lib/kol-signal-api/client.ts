import type { StructuredSignal } from "@/types/signal";
import { adaptKolSignalPayload } from "./adapter";
import {
  appendKolSignalsHistoryParams,
  appendKolSignalsSinceParam,
  resolveKolSignalsEndpoint,
  resolveKolSignalsIncrementalEndpoint,
  shouldUseDevMockKolSignals,
} from "./endpoint";
import { getMarketAlignedMockSignals } from "./mock";
import type { KolSignalApiPayload, KolSignalApiStreamPayload } from "./types";

export async function fetchKolSignals(): Promise<StructuredSignal[]> {
  if (shouldUseDevMockKolSignals()) {
    await delay(120);
    return getMarketAlignedMockSignals();
  }

  const endpoint = resolveKolSignalsEndpoint();
  if (!endpoint) {
    return getMarketAlignedMockSignals();
  }

  try {
    const response = await fetch(appendKolSignalsHistoryParams(endpoint.url), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`KOL signal source failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as KolSignalApiPayload;
    return adaptKolSignalPayload(payload);
  } catch (error) {
    if (endpoint.shouldFallbackOnFailure) {
      return getMarketAlignedMockSignals();
    }

    throw error;
  }
}

export async function fetchKolSignalsAfter(createdAt: string): Promise<StructuredSignal[]> {
  if (shouldUseDevMockKolSignals()) {
    return [];
  }

  const endpoint = resolveKolSignalsIncrementalEndpoint();
  if (!endpoint) {
    return [];
  }

  try {
    const response = await fetch(appendKolSignalsSinceParam(endpoint.url, createdAt), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`KOL signal incremental source failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as KolSignalApiStreamPayload;
    return adaptKolSignalPayload(payload);
  } catch (error) {
    if (endpoint.shouldFallbackOnFailure) {
      return [];
    }

    throw error;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
