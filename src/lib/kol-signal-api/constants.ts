export const CONFIGURED_REST_ENDPOINT = process.env.NEXT_PUBLIC_KOL_SIGNALS_ENDPOINT;
export const CONFIGURED_INCREMENTAL_ENDPOINT = process.env.NEXT_PUBLIC_KOL_SIGNALS_INCREMENTAL_ENDPOINT;
export const CONFIGURED_API_BASE_URL = process.env.NEXT_PUBLIC_KOL_SIGNALS_API_BASE_URL;
export const CONFIGURED_MOCK_MODE = process.env.NEXT_PUBLIC_KOL_SIGNALS_USE_MOCK;
export const DEFAULT_REMOTE_API_BASE_URL = "https://api.smartkline.com/kol";
export const KOL_SIGNALS_REST_PATH = "/kol-message-ai-results";
export const KOL_SIGNALS_INCREMENTAL_PATH = "/kol-message-ai-results/success-after";
export const KOL_SIGNAL_HISTORY_DAYS = 7;
export const KOL_SIGNAL_HISTORY_LIMIT = "1000";
export const KOL_SIGNALS_INCREMENTAL_LIMIT = "100";
export const LOCAL_REST_ENDPOINT = `http://127.0.0.1:3001/kol-message-ai-results?limit=${KOL_SIGNAL_HISTORY_LIMIT}`;
export const LOCAL_INCREMENTAL_ENDPOINT = `http://127.0.0.1:3001/kol-message-ai-results/success-after?limit=${KOL_SIGNALS_INCREMENTAL_LIMIT}`;
export const DEFAULT_SOURCE_NAME = "KOL 信源";
export const KOL_SOURCE_NAME_BY_ID: Record<string, string> = {
  "34": "大镖客合约群",
  "49": "三马哥合约",
};
export const UTC_8_OFFSET_MINUTES = 8 * 60;
export const DEFAULT_CREATED_AT = "2026-05-31T20:58:00+08:00";
export const MARKET_ALIGNED_SIGNAL_HISTORY_LIMIT = 180;
export const MARKET_ALIGNED_SIGNAL_STAGGER_MINUTES = 11;
export const MARKET_ALIGNED_SIGNAL_MINIMUM_OFFSET_MINUTES = 8;
export const MARKET_ALIGNED_SIGNAL_DUPLICATE_OFFSET_MINUTES = 5;
export const MOCK_MARKET_ALIGNMENT_TIMEOUT_MS = 2_500;
