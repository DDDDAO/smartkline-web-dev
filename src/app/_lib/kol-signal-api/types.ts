export type KolSignalEntryType = "RANGE" | "PRICE" | "MARKET" | "UNKNOWN" | string;
export type KolSignalDirection = "LONG" | "SHORT" | string;

export type KolSignalApiEntry = {
  raw?: string | null;
  type?: KolSignalEntryType | null;
  price?: string | number | null;
  range?: string | null;
  max_price?: string | number | null;
  min_price?: string | number | null;
};

export type KolSignalApiStopLoss = {
  price?: string | number | null;
};

export type KolSignalApiTakeProfit = {
  label?: string | null;
  price?: string | number | null;
  percentage?: string | number | null;
};

export type KolSignalApiItem = {
  id?: string | null;
  source_id?: string | number | null;
  source_message_id?: string | number | null;
  source_name?: string | null;
  created_at?: string | null;
  message_type?: string | null;
  raw_text?: string | null;
  source_avatar_url?: string | null;
  standard_message_dedup_key?: string | null;
  entry?: KolSignalApiEntry | null;
  symbol?: string | null;
  direction?: KolSignalDirection | null;
  stop_loss?: KolSignalApiStopLoss | null;
  take_profits?: KolSignalApiTakeProfit[] | null;
};

export type KolSignalAiResultResponse = {
  source_id?: string | number | null;
  source_message_id?: string | number | null;
  created_at?: string | null;
  kol_channel_name?: string | null;
  kol_avatar_url?: string | null;
  original_message?: string | null;
  standard_message?: KolSignalApiResponse | null;
};

export type KolSignalApiResponse = {
  error?: string | null;
  reason?: string | null;
  status?: "SUCCESS" | "FAILED" | string | null;
  signals?: KolSignalApiItem[] | null;
  message_type?: string | null;
  is_trade_signal?: boolean | null;
  source_id?: string | number | null;
  source_name?: string | null;
  raw_text?: string | null;
  created_at?: string | null;
  message_id?: string | null;
  source_message_id?: string | number | null;
};

export type KolSignalApiStreamPayload = {
  signals?: KolSignalApiItem[] | null;
  messages?: KolSignalAiResultResponse[] | KolSignalApiResponse[] | null;
  count?: number | null;
  emitted_at?: string | null;
};

export type KolSignalApiPayload =
  | KolSignalApiItem[]
  | KolSignalApiResponse
  | KolSignalApiResponse[]
  | KolSignalAiResultResponse
  | KolSignalAiResultResponse[]
  | KolSignalApiStreamPayload
  | { items?: KolSignalApiItem[] | KolSignalApiResponse[] | KolSignalAiResultResponse[] | null };

export type AdaptKolSignalOptions = {
  createdAt?: string;
  messageType?: string;
  rawText?: string | null;
  sourceId?: string | number | null;
  sourceMessageId?: string | number | null;
  sourceName?: string | null;
  sourceAvatarUrl?: string | null;
  standardMessageDedupKey?: string | null;
};

export type ResolvedKolSignalEndpoint = {
  shouldFallbackOnFailure: boolean;
  url: string;
};
