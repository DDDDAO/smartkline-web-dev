import type { FormContextType, RegistryWidgetsType, WidgetProps } from "@rjsf/utils";
import type { WorkspaceCopy } from "@/i18n/workspace";

type StrategySchemaCopy = WorkspaceCopy["workspace"]["accountCenter"]["strategySchema"];
type RendererWidgetContext = FormContextType & { isDarkTheme?: boolean; strategySchemaCopy?: StrategySchemaCopy };
type PricePercentRow = { price: string; percent: string };

type JsonRecord = Record<string, unknown>;

const JsonWidget = (props: WidgetProps) => {
  const isDarkTheme = Boolean((props.formContext as RendererWidgetContext | undefined)?.isDarkTheme);
  const value = typeof props.value === "string" ? props.value : JSON.stringify(props.value ?? null, null, 2);
  return (
    <textarea
      className={textareaClassName(isDarkTheme, "min-h-28 font-mono text-xs")}
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
    <textarea
      className={textareaClassName(isDarkTheme, "min-h-24 text-sm font-bold")}
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
    <input
      className={inputClassName(isDarkTheme)}
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
  const buttonClassName = isDarkTheme
    ? "rounded-xl border border-white/[0.085] px-3 py-2 text-xs font-black text-slate-200 transition hover:bg-white/[0.055] disabled:opacity-45"
    : "rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-45";

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={`${index}-${row.price}-${row.percent}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input className={inputClassName(isDarkTheme)} disabled={disabled} inputMode="decimal" placeholder={rendererCopy.pricePlaceholder} value={row.price} onChange={(event) => emitRows(rows.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item))} />
          <input className={inputClassName(isDarkTheme)} disabled={disabled} inputMode="decimal" placeholder={rendererCopy.percentPlaceholder} value={row.percent} onChange={(event) => emitRows(rows.map((item, itemIndex) => itemIndex === index ? { ...item, percent: event.target.value } : item))} />
          <button className={buttonClassName} disabled={disabled} type="button" onClick={() => emitRows(rows.filter((_, itemIndex) => itemIndex !== index))}>{rendererCopy.removeRow}</button>
        </div>
      ))}
      <button className={buttonClassName} disabled={disabled} type="button" onClick={() => emitRows([...rows, { percent: "", price: "" }])}>{rendererCopy.addLadderRow}</button>
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

function inputClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "h-10 w-full rounded-xl border border-white/[0.085] bg-[#0F131A] px-3 text-sm font-bold text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/45"
    : "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-sky-400";
}

function textareaClassName(isDarkTheme: boolean, extra: string): string {
  return isDarkTheme
    ? `${extra} w-full rounded-2xl border border-white/[0.085] bg-[#0F131A] px-3 py-2 text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/45`
    : `${extra} w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none placeholder:text-slate-400 focus:border-sky-400`;
}

function getStrategySchemaCopy(props: WidgetProps): StrategySchemaCopy {
  return (props.formContext as RendererWidgetContext | undefined)?.strategySchemaCopy as StrategySchemaCopy;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
