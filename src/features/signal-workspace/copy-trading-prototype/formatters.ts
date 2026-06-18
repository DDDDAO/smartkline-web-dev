export function formatDetailNumber(value: unknown): string {
  if (value === null || value === undefined) {
    return "--";
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(number);
}

export function formatDetailCurrency(value: unknown): string {
  if (value === null || value === undefined) {
    return "--";
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(number)}`;
}

export function formatSignedDetailCurrency(value: unknown): string {
  if (value === null || value === undefined) {
    return "--";
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  const prefix = number > 0 ? "+" : "";
  return `${prefix}${formatDetailCurrency(number)}`;
}

export function formatSignedPercent(value: unknown): string {
  if (value === null || value === undefined) {
    return "--";
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  const prefix = number > 0 ? "+" : "";
  return `${prefix}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(number)}%`;
}

export function formatUnsignedPercent(value: unknown): string {
  if (value === null || value === undefined) {
    return "--";
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(number)}%`;
}

export function formatLeverage(value: unknown): string {
  if (value === null || value === undefined) {
    return "--";
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return `${formatDetailNumber(number)}x`;
}

export function formatSummaryLeverage(value: unknown): string {
  if (value === null || value === undefined) {
    return "--";
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(number)}x`;
}

export function numberOrZero(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function finiteNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function positiveFiniteNumberOrNull(value: unknown): number | null {
  const number = finiteNumberOrNull(value);
  return number !== null && number > 0 ? number : null;
}

export function getPositionSideBucket(value: string | undefined): "long" | "short" | null {
  const normalizedValue = (value ?? "").toLowerCase();
  if (normalizedValue.includes("long") || normalizedValue.includes("buy")) {
    return "long";
  }
  if (normalizedValue.includes("short") || normalizedValue.includes("sell")) {
    return "short";
  }
  return null;
}

export function formatPositionSide(value: string | undefined): string {
  const normalizedValue = (value ?? "").toLowerCase();
  if (normalizedValue.includes("long") || normalizedValue.includes("buy")) {
    return "多头";
  }
  if (normalizedValue.includes("short") || normalizedValue.includes("sell")) {
    return "空头";
  }
  return value || "--";
}

export function getSideClassName(isDarkTheme: boolean, value: string | undefined): string {
  const normalizedValue = (value ?? "").toLowerCase();
  if (normalizedValue.includes("long") || normalizedValue.includes("buy")) {
    return isDarkTheme ? "text-emerald-300" : "text-emerald-600";
  }
  if (normalizedValue.includes("short") || normalizedValue.includes("sell")) {
    return "text-[#ff2d3d]";
  }
  return isDarkTheme ? "text-slate-300" : "text-slate-700";
}

export function getPnlClassName(isDarkTheme: boolean, value: number): string {
  if (value > 0) {
    return isDarkTheme ? "text-emerald-300" : "text-emerald-600";
  }
  if (value < 0) {
    return "text-[#ff2d3d]";
  }
  return isDarkTheme ? "text-slate-300" : "text-slate-700";
}

export function formatDetailDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return date.toLocaleString();
}

export function formatAccountBalance(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }
  const prefix = value < 0 ? "-" : "";
  return `${prefix}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}
