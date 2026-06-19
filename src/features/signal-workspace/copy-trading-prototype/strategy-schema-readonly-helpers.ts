import type { WorkspaceCopy } from "@/i18n/workspace";

export type JsonRecord = Record<string, unknown>;
export type UiCondition = { path?: string; eq?: unknown; ne?: unknown; in?: unknown[]; exists?: boolean };
export type UiField = JsonRecord & { path: string; description?: string; label?: string; help?: string; order?: number; visibleWhen?: UiCondition };
export type UiSection = { title: string; description?: string; fields: ReadonlyField[] };
export type ReadonlyField = { description?: string; label: string; path: string; schema?: JsonRecord; value: unknown };
export type StrategySchemaCopy = WorkspaceCopy["workspace"]["accountCenter"]["strategySchema"];

export function formatLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_.-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function labelForKey(rendererCopy: StrategySchemaCopy, key: string): string {
  const fieldLabels: Readonly<Record<string, string>> = rendererCopy.fieldLabels;
  return fieldLabels[key] ?? formatLabel(key);
}

export function formatPercentValue(value: number | null, rendererCopy: StrategySchemaCopy): string {
  if (value === null) return rendererCopy.notSet;
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(2).replace(/\.?0+$/, "")}%`;
}

export function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function joinSectionTitle(prefix: string, title: unknown): string {
  const normalizedTitle = typeof title === "string" && title.trim() ? title : "";
  return prefix ? normalizedTitle ? `${prefix} · ${normalizedTitle}` : prefix : normalizedTitle;
}

export function booleanPillClassName(isDarkTheme: boolean, value: boolean): string {
  if (value) return isDarkTheme ? "rounded-full bg-emerald-400/15 px-2 py-1 text-xs font-black text-emerald-300" : "rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700";
  return isDarkTheme ? "rounded-full bg-slate-700 px-2 py-1 text-xs font-black text-slate-300" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600";
}

export function hasReadableField(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.values(value).some(hasReadableField);
  return true;
}

export function isScalarValue(value: unknown): boolean {
  return ["boolean", "number", "string"].includes(typeof value);
}

export function isUiSection(value: unknown): value is JsonRecord & { fields: unknown[]; order?: number; title?: string; description?: string } {
  return isRecord(value) && Array.isArray(value.fields);
}

export function isUiField(value: unknown): value is UiField {
  return isRecord(value) && typeof value.path === "string";
}

export function isReadonlyField(value: ReadonlyField | null): value is ReadonlyField {
  return value !== null;
}

export function compareUiSections(left: JsonRecord, right: JsonRecord): number {
  const leftOrder = typeof left.order === "number" ? left.order : Number.MAX_SAFE_INTEGER;
  const rightOrder = typeof right.order === "number" ? right.order : Number.MAX_SAFE_INTEGER;
  return leftOrder - rightOrder;
}

export function compareUiFields(left: UiField, right: UiField): number {
  const leftOrder = typeof left.order === "number" ? left.order : Number.MAX_SAFE_INTEGER;
  const rightOrder = typeof right.order === "number" ? right.order : Number.MAX_SAFE_INTEGER;
  return leftOrder - rightOrder || left.path.localeCompare(right.path);
}

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
