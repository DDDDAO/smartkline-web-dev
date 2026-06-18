import type { StructuredSignal } from "@/types/signal";
import {
  createFallbackApiSignalId,
  createRawText,
  createRiskTags,
  createSignalId,
  createSummary,
  formatEntryText,
  formatMessageType,
  formatPrice,
  formatSourceName,
  normalizeCreatedAtToUtc8,
  normalizeDirection,
  normalizeMarketSymbol,
  normalizeUrl,
  parseEntryRange,
  parseNullableNumber,
  stableStringify,
} from "./formatters";
import type {
  AdaptKolSignalOptions,
  KolSignalAiResultResponse,
  KolSignalApiEntry,
  KolSignalApiItem,
  KolSignalApiPayload,
  KolSignalApiResponse,
  KolSignalApiStreamPayload,
  KolSignalApiTakeProfit,
} from "./types";

export function adaptKolSignalPayload(payload: KolSignalApiPayload, options: AdaptKolSignalOptions = {}): StructuredSignal[] {
  return dedupeKolSignalItems(normalizeKolSignalItems(payload, options)).map((item, index) => adaptKolSignalItem(item, index));
}

function normalizeKolSignalItems(payload: KolSignalApiPayload, options: AdaptKolSignalOptions): KolSignalApiItem[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item, index) => normalizeArrayPayloadItem(item, index, options));
  }

  if (isItemsCollection(payload)) {
    return (payload.items ?? []).flatMap((item, index) => normalizeArrayPayloadItem(item, index, options));
  }

  if (isKolSignalAiResultResponse(payload)) {
    return normalizeAiResultResponseSignals(payload, 0, options);
  }

  if (isSuccessfulLegacyResponse(payload)) {
    return normalizeLegacyResponseSignals(payload, 0, options);
  }

  if (isStreamPayload(payload)) {
    if (Array.isArray(payload.messages)) {
      return payload.messages.flatMap((message, index) => normalizeArrayPayloadItem(message, index, {
        ...options,
        createdAt: payload.emitted_at ?? options.createdAt,
      }));
    }

    return (payload.signals ?? []).map((signal, index) => ({
      ...signal,
      created_at: signal.created_at ?? payload.emitted_at ?? options.createdAt,
      id: signal.id ?? createFallbackApiSignalId({ index, sourceId: signal.source_id, sourceMessageId: signal.source_message_id }),
    }));
  }

  return [];
}

function normalizeArrayPayloadItem(
  item: KolSignalApiItem | KolSignalApiResponse | KolSignalAiResultResponse,
  index: number,
  options: AdaptKolSignalOptions,
): KolSignalApiItem[] {
  if (isKolSignalAiResultResponse(item)) {
    return normalizeAiResultResponseSignals(item, index, options);
  }

  if (isSuccessfulLegacyResponse(item)) {
    return normalizeLegacyResponseSignals(item, index, options);
  }

  return [item];
}

function normalizeAiResultResponseSignals(
  response: KolSignalAiResultResponse,
  responseIndex: number,
  options: AdaptKolSignalOptions,
): KolSignalApiItem[] {
  const standardMessage = response.standard_message;

  if (!standardMessage || !isSuccessfulLegacyResponse(standardMessage)) {
    return [];
  }

  return normalizeLegacyResponseSignals(standardMessage, responseIndex, {
    ...options,
    rawText: response.original_message ?? options.rawText,
    createdAt: response.created_at ?? options.createdAt,
    sourceAvatarUrl: response.kol_avatar_url ?? options.sourceAvatarUrl,
    sourceId: response.source_id ?? options.sourceId,
    sourceMessageId: response.source_message_id ?? options.sourceMessageId,
    sourceName: response.kol_channel_name ?? options.sourceName,
    standardMessageDedupKey: stableStringify(standardMessage),
  });
}

function normalizeLegacyResponseSignals(response: KolSignalApiResponse, responseIndex: number, options: AdaptKolSignalOptions): KolSignalApiItem[] {
  return (response.signals ?? []).map((signal, signalIndex) => {
    const normalizedSignal = {
      ...signal,
      created_at: signal.created_at ?? response.created_at ?? options.createdAt,
      id: signal.id ?? response.message_id ?? createFallbackApiSignalId({
        index: signalIndex,
        sourceId: response.source_id ?? options.sourceId,
        sourceMessageId: response.source_message_id ?? options.sourceMessageId,
      }),
      message_type: signal.message_type ?? response.message_type ?? options.messageType,
      raw_text: signal.raw_text ?? response.raw_text ?? options.rawText,
      source_avatar_url: signal.source_avatar_url ?? options.sourceAvatarUrl ?? null,
      source_id: signal.source_id ?? response.source_id ?? options.sourceId,
      source_message_id: signal.source_message_id ?? response.source_message_id ?? options.sourceMessageId ?? response.message_id ?? responseIndex,
      source_name: signal.source_name ?? response.source_name ?? options.sourceName,
    };

    return {
      ...normalizedSignal,
      standard_message_dedup_key: signal.standard_message_dedup_key ?? createSignalDedupKey(normalizedSignal),
    };
  });
}

function adaptKolSignalItem(signal: KolSignalApiItem, signalIndex: number): StructuredSignal {
  const symbol = normalizeMarketSymbol(signal.symbol);
  const direction = normalizeDirection(signal.direction);
  const entry = signal.entry ?? null;
  const rangePrices = parseEntryRange(entry?.range);
  const entryMin = parseNullableNumber(entry?.min_price) ?? rangePrices?.min ?? null;
  const entryMax = parseNullableNumber(entry?.max_price) ?? rangePrices?.max ?? null;
  const triggerPrice = parseNullableNumber(entry?.price);
  const stopLoss = parseNullableNumber(signal.stop_loss?.price);
  const takeProfits = (signal.take_profits ?? [])
    .map((takeProfit) => parseNullableNumber(takeProfit.price))
    .filter((price): price is number => price !== null);
  const entryType = entry?.type === "RANGE" || (entryMin !== null && entryMax !== null) ? "range" : "trigger";
  const entryText = formatEntryText({ entryMax, entryMin, triggerPrice });
  const takeProfitText = takeProfits.length > 0 ? takeProfits.map(formatPrice).join(" / ") : "--";
  const sourceName = signal.source_name ?? formatSourceName(signal.source_id);
  const sourceAvatarUrl = normalizeUrl(signal.source_avatar_url);
  const createdAt = normalizeCreatedAtToUtc8(signal.created_at ?? new Date().toISOString());
  const rawText = signal.raw_text ?? createRawText({ direction, entryText, stopLoss, symbol, takeProfitText });

  return {
    id: signal.id ?? createSignalId({ direction, entryText, signalIndex, sourceName, symbol }),
    source_name: sourceName,
    source_avatar_url: sourceAvatarUrl,
    source_level: "S",
    source_type: formatMessageType(signal.message_type ?? "OPEN_POSITION"),
    symbol,
    direction,
    entry_type: entryType,
    entry_min: entryType === "range" ? entryMin : null,
    entry_max: entryType === "range" ? entryMax : null,
    trigger_price: entryType === "trigger" ? triggerPrice : null,
    confirmation: entry?.raw ?? null,
    stop_loss: stopLoss,
    take_profit: takeProfits,
    status: "观察中",
    risk_tags: createRiskTags({ entryType, stopLoss, takeProfits }),
    raw_text: rawText,
    summary: createSummary({ direction, entryText, stopLoss, symbol, takeProfitText }),
    created_at: createdAt,
    isStrongAlert: true,
    isReview: false,
  };
}

function dedupeKolSignalItems(items: KolSignalApiItem[]): KolSignalApiItem[] {
  const uniqueItemsByKey = new Map<string, KolSignalApiItem>();

  for (const item of items) {
    const dedupKey = createSignalDedupKey(item);
    const currentItem = uniqueItemsByKey.get(dedupKey);
    if (!currentItem || compareSignalCreatedAt(item, currentItem) < 0) {
      uniqueItemsByKey.set(dedupKey, item);
    }
  }

  return Array.from(uniqueItemsByKey.values());
}

function compareSignalCreatedAt(left: KolSignalApiItem, right: KolSignalApiItem): number {
  return getSignalCreatedAtTimestamp(left) - getSignalCreatedAtTimestamp(right);
}

function getSignalCreatedAtTimestamp(signal: KolSignalApiItem): number {
  const timestamp = Date.parse(signal.created_at ?? "");
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function createSignalDedupKey(signal: KolSignalApiItem): string {
  const entry = normalizeApiEntryForDedup(signal.entry);

  return stableStringify({
    direction: normalizeDirection(signal.direction),
    entry,
    message_type: signal.message_type ?? null,
    stop_loss: parseNullableNumber(signal.stop_loss?.price),
    symbol: normalizeMarketSymbol(signal.symbol),
    take_profits: normalizeTakeProfitPricesForDedup(signal.take_profits),
  });
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

function normalizeApiEntryForDedup(entry: KolSignalApiEntry | null | undefined): {
  max: number | null;
  min: number | null;
  price: number | null;
  type: "range" | "trigger";
} {
  const rangePrices = parseEntryRange(entry?.range);
  const entryMin = parseNullableNumber(entry?.min_price) ?? rangePrices?.min ?? null;
  const entryMax = parseNullableNumber(entry?.max_price) ?? rangePrices?.max ?? null;
  const triggerPrice = parseNullableNumber(entry?.price);
  const entryType = entry?.type === "RANGE" || (entryMin !== null && entryMax !== null) ? "range" : "trigger";

  return {
    max: entryType === "range" ? entryMax : null,
    min: entryType === "range" ? entryMin : null,
    price: entryType === "trigger" ? triggerPrice : null,
    type: entryType,
  };
}

function normalizeTakeProfitPricesForDedup(takeProfits: KolSignalApiTakeProfit[] | null | undefined): number[] {
  return (takeProfits ?? [])
    .map((takeProfit) => parseNullableNumber(takeProfit.price))
    .filter((price): price is number => price !== null);
}

function isItemsCollection(
  payload: KolSignalApiResponse | KolSignalAiResultResponse | KolSignalApiStreamPayload | { items?: KolSignalApiItem[] | KolSignalApiResponse[] | KolSignalAiResultResponse[] | null },
): payload is { items?: KolSignalApiItem[] | KolSignalApiResponse[] | KolSignalAiResultResponse[] | null } {
  return "items" in payload;
}

function isStreamPayload(payload: KolSignalApiResponse | KolSignalAiResultResponse | KolSignalApiStreamPayload): payload is KolSignalApiStreamPayload {
  return "count" in payload || "emitted_at" in payload || "messages" in payload;
}

function isKolSignalAiResultResponse(payload: KolSignalApiItem | KolSignalApiResponse | KolSignalAiResultResponse): payload is KolSignalAiResultResponse {
  return "standard_message" in payload;
}

function isSuccessfulLegacyResponse(payload: KolSignalApiItem | KolSignalApiResponse): payload is KolSignalApiResponse {
  return "status" in payload && payload.status === "SUCCESS" && payload.is_trade_signal === true;
}
