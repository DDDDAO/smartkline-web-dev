export function parsePositiveNumber(value: unknown): number | null {
  const parsed = parseNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

export function compareNullableNumbers(left: number | null, right: number | null): number {
  const hasLeft = left !== null && Number.isFinite(left);
  const hasRight = right !== null && Number.isFinite(right);
  if (!hasLeft && !hasRight) {
    return 0;
  }
  if (!hasLeft) {
    return 1;
  }
  if (!hasRight) {
    return -1;
  }

  return left - right;
}

export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseNonNegativeInteger(value: unknown): number | null {
  const parsed = parseNumber(value);
  if (parsed === null || parsed < 0) {
    return null;
  }

  return Math.floor(parsed);
}

export function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function isFiniteNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

export function clampPercent(value: number): number {
  return Math.min(0.99, Math.max(0, value));
}

export function clampSignedRatio(value: number): number {
  return Math.min(9.99, Math.max(-9.99, value));
}

export function normalizeTimestamp(value: string | null | undefined, fallback = "2026-06-05T12:00:00+08:00"): string {
  if (!value) {
    return fallback;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? formatDateTimeWithUtc8Offset(new Date(timestamp)) : value;
}

export function normalizeNullableTimestamp(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? formatDateTimeWithUtc8Offset(new Date(timestamp)) : value;
}

export function formatDateTimeWithUtc8Offset(date: Date): string {
  const utc8Date = new Date(date.getTime() + 8 * 60 * 60 * 1_000);
  const year = utc8Date.getUTCFullYear();
  const month = padDatePart(utc8Date.getUTCMonth() + 1);
  const day = padDatePart(utc8Date.getUTCDate());
  const hours = padDatePart(utc8Date.getUTCHours());
  const minutes = padDatePart(utc8Date.getUTCMinutes());
  const seconds = padDatePart(utc8Date.getUTCSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
}

export function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function stableSeed(value: string): number {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function createAvatarDataUrl(label: string, hue: number): string {
  const visibleLabel = label.trim().slice(0, 2) || "带单";
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">`,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0%" stop-color="hsl(${hue} 86% 58%)"/>`,
    `<stop offset="100%" stop-color="hsl(${(hue + 58) % 360} 92% 42%)"/>`,
    `</linearGradient></defs>`,
    `<rect width="96" height="96" rx="48" fill="url(#g)"/>`,
    `<circle cx="68" cy="26" r="17" fill="rgba(255,255,255,.18)"/>`,
    `<text x="48" y="57" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800">${escapeSvgText(visibleLabel)}</text>`,
    `</svg>`,
  ].join("");

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function formatRiskLevel(riskLevel: "low" | "medium" | "high"): string {
  if (riskLevel === "high") {
    return "高风险";
  }

  if (riskLevel === "medium") {
    return "中风险";
  }

  return "低风险";
}

export function roundMarketPrice(value: number): number {
  const absoluteValue = Math.abs(value);
  const maximumFractionDigits = absoluteValue >= 10_000 ? 1 : absoluteValue >= 1_000 ? 2 : absoluteValue >= 1 ? 4 : 6;
  return Number(value.toFixed(maximumFractionDigits));
}

export function formatNumberForApi(value: number): string {
  return Number.isFinite(value) ? String(roundMarketPrice(value)) : "0";
}

export function formatQuantity(value: number): string {
  return Number.isFinite(value) ? String(Number(value.toFixed(8))) : "0";
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: Math.abs(value) >= 1000 ? 1 : 4 });
}

export function formatDisplayTimestamp(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value.replace("T", " ").slice(0, 16);
  }

  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const hours = String(parsedDate.getHours()).padStart(2, "0");
  const minutes = String(parsedDate.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hours}:${minutes}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatSignedPercent(value: number): string {
  const formatted = formatPercent(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}
