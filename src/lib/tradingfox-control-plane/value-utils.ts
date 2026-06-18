import { TradingFoxApiError } from "./types";

export function requireText(value: unknown, fieldName: string): string {
  const text = normalizeOptionalText(value);
  if (!text) {
    throw new TradingFoxApiError(`${fieldName} is required.`, 400);
  }
  return text;
}

export function normalizeOptionalText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizePositiveNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

export function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "string" && value.trim().endsWith("%")) {
    const number = Number(value.trim().replace(/%$/u, ""));
    return Number.isFinite(number) ? number : null;
  }

  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function positiveNumberOrNull(value: unknown): number | null {
  const number = numberOrNull(value);
  return number !== null && number > 0 ? number : null;
}

export function parsePositiveInteger(value: string, fieldName: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new TradingFoxApiError(`${fieldName} must be a positive integer.`, 400);
  }
  return number;
}

export function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function stringArrayValue(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function numberValue(value: unknown, fallback = 0): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
