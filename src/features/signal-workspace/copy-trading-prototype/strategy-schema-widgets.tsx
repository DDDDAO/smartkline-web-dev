import type { FormContextType, RegistryWidgetsType, WidgetProps } from "@rjsf/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { cn } from "@/lib/utils";

type StrategySchemaCopy = WorkspaceCopy["workspace"]["accountCenter"]["strategySchema"];
type RendererWidgetContext = FormContextType & { isDarkTheme?: boolean; strategySchemaCopy?: StrategySchemaCopy };
type PricePercentRow = { price: string; percent: string };

type JsonRecord = Record<string, unknown>;

const JsonWidget = (props: WidgetProps) => {
  const isDarkTheme = Boolean((props.formContext as RendererWidgetContext | undefined)?.isDarkTheme);
  const value = typeof props.value === "string" ? props.value : JSON.stringify(props.value ?? null, null, 2);
  return (
    <Textarea
      className={getTextareaClassName(isDarkTheme, "min-h-28 font-mono text-xs")}
      disabled={props.disabled || props.readonly}
      placeholder={props.placeholder}
      value={value}
      onChange={(event) => {
        try { props.onChange(JSON.parse(event.target.value)); } catch { props.onChange(event.target.value); }
      }}
    />
  );
};

const StringListWidget = (props: WidgetProps) => {
  const isDarkTheme = Boolean((props.formContext as RendererWidgetContext | undefined)?.isDarkTheme);
  const rendererCopy = getStrategySchemaCopy(props);
  const value = Array.isArray(props.value) ? props.value.map(String).join("\n") : "";
  return (
    <Textarea
      className={getTextareaClassName(isDarkTheme, "min-h-24 text-sm font-bold")}
      disabled={props.disabled || props.readonly}
      placeholder={props.placeholder || rendererCopy.stringListPlaceholder}
      value={value}
      onChange={(event) => props.onChange(event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))}
    />
  );
};

const SymbolPickerWidget = (props: WidgetProps) => {
  const isDarkTheme = Boolean((props.formContext as RendererWidgetContext | undefined)?.isDarkTheme);
  const rendererCopy = getStrategySchemaCopy(props);
  return (
    <Input
      className={getInputClassName(isDarkTheme)}
      disabled={props.disabled || props.readonly}
      placeholder={props.placeholder || rendererCopy.symbolPlaceholder}
      value={props.value ?? ""}
      onChange={(event) => props.onChange(event.target.value)}
    />
  );
};

const PricePercentLadderWidget = (props: WidgetProps) => {
  const isDarkTheme = Boolean((props.formContext as RendererWidgetContext | undefined)?.isDarkTheme);
  const rendererCopy = getStrategySchemaCopy(props);
  const rows = Array.isArray(props.value) ? props.value.map(normalizePricePercentRow) : [];
  const disabled = Boolean(props.disabled || props.readonly);
  const emitRows = (nextRows: PricePercentRow[]) => props.onChange(nextRows.map((row) => ({ price: parseOptionalNumber(row.price), percent: parseOptionalNumber(row.percent) })));

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={`${index}-${row.price}-${row.percent}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input className={getInputClassName(isDarkTheme)} disabled={disabled} inputMode="decimal" placeholder={rendererCopy.pricePlaceholder} value={row.price} onChange={(event) => emitRows(rows.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item))} />
          <Input className={getInputClassName(isDarkTheme)} disabled={disabled} inputMode="decimal" placeholder={rendererCopy.percentPlaceholder} value={row.percent} onChange={(event) => emitRows(rows.map((item, itemIndex) => itemIndex === index ? { ...item, percent: event.target.value } : item))} />
          <Button className={getOutlineButtonClassName(isDarkTheme)} disabled={disabled} size="sm" type="button" variant="outline" onClick={() => emitRows(rows.filter((_, itemIndex) => itemIndex !== index))}>{rendererCopy.removeRow}</Button>
        </div>
      ))}
      <Button className={getOutlineButtonClassName(isDarkTheme)} disabled={disabled} size="sm" type="button" variant="outline" onClick={() => emitRows([...rows, { percent: "", price: "" }])}>{rendererCopy.addLadderRow}</Button>
    </div>
  );
};

export const STRATEGY_WIDGETS: RegistryWidgetsType = {
  "array-table": JsonWidget,
  json: JsonWidget,
  "percent-sum-table": JsonWidget,
  "price-percent-ladder": PricePercentLadderWidget,
  "string-list": StringListWidget,
  "symbol-picker": SymbolPickerWidget,
};

function normalizePricePercentRow(value: unknown): PricePercentRow {
  if (!isRecord(value)) return { percent: "", price: "" };
  return { price: stringifyOptional(value.price), percent: stringifyOptional(value.percent) };
}

function stringifyOptional(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function parseOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getInputClassName(isDarkTheme: boolean): string {
  return cn(
    "h-10 rounded-xl text-sm font-bold",
    isDarkTheme
      ? "border-white/[0.085] bg-[#0F131A] text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-400/45 focus-visible:ring-indigo-400/10"
      : "border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-indigo-400/10",
  );
}

function getTextareaClassName(isDarkTheme: boolean, extra: string): string {
  return cn(
    extra,
    "rounded-2xl",
    isDarkTheme
      ? "border-white/[0.085] bg-[#0F131A] text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-400/45 focus-visible:ring-indigo-400/10"
      : "border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-indigo-400/10",
  );
}

function getOutlineButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "border-white/[0.085] bg-transparent text-slate-200 hover:bg-white/[0.055]"
    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
}

function getStrategySchemaCopy(props: WidgetProps): StrategySchemaCopy {
  return (props.formContext as RendererWidgetContext | undefined)?.strategySchemaCopy as StrategySchemaCopy;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
