import type { MarketSymbol } from "@/types/market";
import type { SignalDirection } from "@/types/signal";
import {
  DEFAULT_SOURCE_NAME,
  KOL_SOURCE_NAME_BY_ID,
  UTC_8_OFFSET_MINUTES,
} from "./constants";
import type { KolSignalDirection } from "./types";

export function normalizeMarketSymbol(symbol: string | null | undefined): MarketSymbol {
  return symbol || "BTC/USDT:USDT";
}

export function normalizeDirection(direction: KolSignalDirection | null | undefined): SignalDirection {
  return direction === "LONG" ? "long" : "short";
}

export function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseNullableNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function formatSourceName(sourceId: string | number | null | undefined): string {
  if (sourceId === null || sourceId === undefined) {
    return DEFAULT_SOURCE_NAME;
  }

  return KOL_SOURCE_NAME_BY_ID[String(sourceId)] ?? `${DEFAULT_SOURCE_NAME} #${sourceId}`;
}

export function formatMessageType(messageType: string): string {
  if (messageType === "OPEN_POSITION") {
    return "开仓信号";
  }

  return messageType;
}

export function formatEntryText(input: { entryMax: number | null; entryMin: number | null; triggerPrice: number | null }): string {
  if (input.entryMin !== null && input.entryMax !== null) {
    return `${formatPrice(input.entryMin)}-${formatPrice(input.entryMax)}`;
  }

  return formatPrice(input.triggerPrice);
}

export function formatPrice(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: value > 1000 ? 1 : 3 });
}

export function normalizeCreatedAtToUtc8(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return formatTimestampInUtc8(timestamp);
}

export function formatTimestampInUtc8(timestampMs: number): string {
  const utc8Date = new Date(timestampMs + UTC_8_OFFSET_MINUTES * 60_000);
  const year = utc8Date.getUTCFullYear();
  const month = padDatePart(utc8Date.getUTCMonth() + 1);
  const day = padDatePart(utc8Date.getUTCDate());
  const hours = padDatePart(utc8Date.getUTCHours());
  const minutes = padDatePart(utc8Date.getUTCMinutes());
  const seconds = padDatePart(utc8Date.getUTCSeconds());
  const milliseconds = String(utc8Date.getUTCMilliseconds()).padStart(3, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+08:00`;
}

export function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function parseEntryRange(value: string | null | undefined): { min: number; max: number } | null {
  if (!value) {
    return null;
  }

  const rangeParts = value.split(/[-~—–到至]/u).map((part) => parseNullableNumber(part.trim()));
  const [firstPrice, secondPrice] = rangeParts;
  if (firstPrice === null || firstPrice === undefined || secondPrice === null || secondPrice === undefined) {
    return null;
  }

  return {
    max: Math.max(firstPrice, secondPrice),
    min: Math.min(firstPrice, secondPrice),
  };
}

export function createRawText(input: {
  direction: SignalDirection;
  entryText: string;
  stopLoss: number | null;
  symbol: MarketSymbol;
  takeProfitText: string;
}): string {
  return `${input.symbol} ${input.direction === "long" ? "多" : "空"}，入场/触发 ${input.entryText}，止损 ${formatPrice(input.stopLoss)}，止盈 ${input.takeProfitText}`;
}

export function createSummary(input: {
  direction: SignalDirection;
  entryText: string;
  stopLoss: number | null;
  symbol: MarketSymbol;
  takeProfitText: string;
}): string {
  return `${input.symbol} ${input.direction === "long" ? "多" : "空"}信号：入场/触发 ${input.entryText}，止损 ${formatPrice(input.stopLoss)}，止盈 ${input.takeProfitText}`;
}

export function createRiskTags(input: { entryType: "range" | "trigger"; stopLoss: number | null; takeProfits: number[] }): string[] {
  return [
    input.entryType === "range" ? "区间入场" : "触发入场",
    input.stopLoss !== null ? "止损完整" : "缺少止损",
    input.takeProfits.length > 0 ? "止盈完整" : "缺少止盈",
  ];
}

export function createFallbackApiSignalId(input: { index: number; sourceId?: string | number | null; sourceMessageId?: string | number | null }): string {
  return [input.sourceId ?? "source", input.sourceMessageId ?? "message", input.index].join(":");
}

export function createSignalId(input: {
  direction: SignalDirection;
  entryText: string;
  signalIndex: number;
  sourceName: string;
  symbol: MarketSymbol;
}): string {
  const rawId = `${input.sourceName}-${input.symbol}-${input.direction}-${input.entryText}-${input.signalIndex}`;
  return rawId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function stableStringify(value: unknown): string {
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

export function createSourceAvatarUrl(sourceName: string): string {
  const label = sourceName.trim().slice(0, 2).toUpperCase() || "K";
  const hue = [...sourceName].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">`,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0%" stop-color="hsl(${hue} 84% 58%)"/>`,
    `<stop offset="100%" stop-color="hsl(${(hue + 52) % 360} 92% 42%)"/>`,
    `</linearGradient></defs>`,
    `<rect width="96" height="96" rx="48" fill="url(#g)"/>`,
    `<circle cx="70" cy="24" r="16" fill="rgba(255,255,255,.18)"/>`,
    `<text x="48" y="57" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800">${escapeSvgText(label)}</text>`,
    `</svg>`,
  ].join("");

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function roundMarketPrice(value: number): number {
  const absoluteValue = Math.abs(value);
  const maximumFractionDigits = absoluteValue >= 10_000 ? 1 : absoluteValue >= 1_000 ? 2 : absoluteValue >= 1 ? 4 : 6;
  return Number(value.toFixed(maximumFractionDigits));
}
