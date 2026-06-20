import type { FormContextType, RegistryWidgetsType, WidgetProps } from "@rjsf/utils";
import {
  ariaDescribedByIds,
  enumOptionSelectedValue,
  enumOptionValueDecoder,
  enumOptionValueEncoder,
  enumOptionsDeselectValue,
  enumOptionsIsSelected,
  enumOptionsSelectValue,
  getInputProps,
  localToUTC,
  optionId,
  utcToLocal,
} from "@rjsf/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { cn } from "@/lib/utils";

type StrategySchemaCopy = WorkspaceCopy["workspace"]["accountCenter"]["strategySchema"];
type RendererWidgetContext = FormContextType & { isDarkTheme?: boolean; strategySchemaCopy?: StrategySchemaCopy };
type PricePercentRow = { price: string; percent: string };

type JsonRecord = Record<string, unknown>;

const StrategyTextWidget = (props: WidgetProps) => renderInputWidget(props);
const StrategyDateWidget = (props: WidgetProps) => renderInputWidget({ ...props, onChange: (value) => props.onChange(value || undefined) }, "date");
const StrategyDateTimeWidget = (props: WidgetProps) => renderInputWidget({ ...props, value: utcToLocal(props.value), onChange: (value) => props.onChange(localToUTC(value)) }, "datetime-local");
const StrategyEmailWidget = (props: WidgetProps) => renderInputWidget(props, "email");
const StrategyNumberWidget = (props: WidgetProps) => renderInputWidget(props, "number");
const StrategyPasswordWidget = (props: WidgetProps) => renderInputWidget(props, "password");
const StrategyTimeWidget = (props: WidgetProps) => renderInputWidget({ ...props, onChange: (value) => props.onChange(value ? `${value}:00` : undefined) }, "time");
const StrategyUrlWidget = (props: WidgetProps) => renderInputWidget(props, "url");

const StrategyTextareaWidget = (props: WidgetProps) => {
  const isDarkTheme = getIsDarkTheme(props);
  const rows = typeof props.options.rows === "number" ? props.options.rows : undefined;
  const value = props.value ?? "";

  return (
    <Textarea
      aria-describedby={ariaDescribedByIds(props.id)}
      aria-invalid={hasErrors(props) || undefined}
      autoFocus={props.autofocus}
      className={getTextareaClassName(isDarkTheme, "min-h-24 text-sm font-bold")}
      disabled={props.disabled || props.readonly}
      id={props.id}
      name={props.htmlName || props.id}
      placeholder={props.placeholder}
      readOnly={props.readonly}
      required={props.required}
      rows={rows}
      value={value}
      onBlur={(event) => props.onBlur(props.id, event.target.value)}
      onChange={(event) => props.onChange(event.target.value === "" ? props.options.emptyValue : event.target.value)}
      onFocus={(event) => props.onFocus(props.id, event.target.value)}
    />
  );
};

const StrategySelectWidget = (props: WidgetProps) => {
  if (props.multiple) {
    return <StrategyCheckboxesWidget {...props} />;
  }

  const isDarkTheme = getIsDarkTheme(props);
  const enumOptions = Array.isArray(props.options.enumOptions) ? props.options.enumOptions : [];
  const enumDisabled = Array.isArray(props.options.enumDisabled) ? props.options.enumDisabled : [];
  const emptyValue = props.options.emptyValue;
  const selectedValue = String(enumOptionSelectedValue(props.value, enumOptions, false, "indexed", "") ?? "");
  const disabled = Boolean(props.disabled || props.readonly);

  return (
    <Select
      disabled={disabled}
      name={props.htmlName || props.id}
      required={props.required}
      value={selectedValue}
      onValueChange={(value) => props.onChange(enumOptionValueDecoder(value, enumOptions, "indexed", emptyValue))}
    >
      <SelectTrigger
        aria-describedby={ariaDescribedByIds(props.id)}
        aria-invalid={hasErrors(props) || undefined}
        autoFocus={props.autofocus}
        className={getSelectTriggerClassName(isDarkTheme)}
        id={props.id}
        onBlur={() => props.onBlur(props.id, enumOptionValueDecoder(selectedValue, enumOptions, "indexed", emptyValue))}
        onFocus={() => props.onFocus(props.id, enumOptionValueDecoder(selectedValue, enumOptions, "indexed", emptyValue))}
      >
        <SelectValue placeholder={props.placeholder || "Select"} />
      </SelectTrigger>
      <SelectContent className={getSelectContentClassName(isDarkTheme)} position="popper" sideOffset={8}>
        {enumOptions.map((option, index) => (
          <SelectItem
            key={`${index}-${String(option.value)}`}
            className={getSelectItemClassName(isDarkTheme)}
            disabled={enumDisabled.includes(option.value)}
            value={enumOptionValueEncoder(option.value, index, "indexed")}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const StrategyCheckboxWidget = (props: WidgetProps) => {
  const isDarkTheme = getIsDarkTheme(props);
  const checked = props.value === true;
  const disabled = Boolean(props.disabled || props.readonly);

  return (
    <Switch
      aria-describedby={ariaDescribedByIds(props.id)}
      aria-invalid={hasErrors(props) || undefined}
      aria-label={props.label}
      autoFocus={props.autofocus}
      checked={checked}
      className={getSwitchClassName(isDarkTheme)}
      disabled={disabled}
      id={props.id}
      name={props.htmlName || props.id}
      required={props.required}
      onBlur={() => props.onBlur(props.id, checked)}
      onCheckedChange={(nextChecked) => props.onChange(nextChecked === true)}
      onFocus={() => props.onFocus(props.id, checked)}
    />
  );
};

const StrategyRadioWidget = (props: WidgetProps) => {
  const isDarkTheme = getIsDarkTheme(props);
  const enumOptions = Array.isArray(props.options.enumOptions) ? props.options.enumOptions : [];
  const enumDisabled = Array.isArray(props.options.enumDisabled) ? props.options.enumDisabled : [];
  const disabled = Boolean(props.disabled || props.readonly);

  return (
    <div aria-describedby={ariaDescribedByIds(props.id)} aria-invalid={hasErrors(props) || undefined} className="grid gap-2" id={props.id} role="radiogroup">
      {enumOptions.map((option, index) => {
        const checked = enumOptionsIsSelected(option.value, props.value);
        const itemDisabled = disabled || enumDisabled.includes(option.value);
        const encodedValue = enumOptionValueEncoder(option.value, index, "indexed");
        return (
          <button
            key={`${index}-${String(option.value)}`}
            aria-checked={checked}
            autoFocus={props.autofocus && index === 0}
            className={getRadioButtonClassName(isDarkTheme, checked)}
            disabled={itemDisabled}
            id={optionId(props.id, index)}
            role="radio"
            type="button"
            value={encodedValue}
            onBlur={() => props.onBlur(props.id, enumOptionValueDecoder(encodedValue, enumOptions, "indexed", props.options.emptyValue))}
            onClick={() => props.onChange(option.value)}
            onFocus={() => props.onFocus(props.id, enumOptionValueDecoder(encodedValue, enumOptions, "indexed", props.options.emptyValue))}
          >
            <span className={getRadioIndicatorClassName(isDarkTheme, checked)} aria-hidden="true">{checked ? "✓" : ""}</span>
            <span className="min-w-0 truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const StrategyCheckboxesWidget = (props: WidgetProps) => {
  const isDarkTheme = getIsDarkTheme(props);
  const enumOptions = Array.isArray(props.options.enumOptions) ? props.options.enumOptions : [];
  const enumDisabled = Array.isArray(props.options.enumDisabled) ? props.options.enumDisabled : [];
  const currentValues = Array.isArray(props.value) ? props.value : [];
  const disabled = Boolean(props.disabled || props.readonly);

  return (
    <div className={getCheckboxGroupClassName(isDarkTheme)} id={props.id}>
      {enumOptions.map((option, index) => {
        const checked = enumOptionsIsSelected(option.value, currentValues);
        const itemDisabled = disabled || enumDisabled.includes(option.value);
        const checkboxId = optionId(props.id, index);
        const encodedValue = enumOptionValueEncoder(option.value, index, "indexed");
        return (
          <div key={`${index}-${String(option.value)}`} className="flex items-center gap-2">
            <Checkbox
              aria-describedby={ariaDescribedByIds(props.id)}
              autoFocus={props.autofocus && index === 0}
              checked={checked}
              className={getCheckboxClassName(isDarkTheme)}
              disabled={itemDisabled}
              id={checkboxId}
              name={props.htmlName || props.id}
              value={encodedValue}
              onBlur={() => props.onBlur(props.id, enumOptionValueDecoder(encodedValue, enumOptions, "indexed", props.options.emptyValue))}
              onCheckedChange={(nextChecked) => {
                props.onChange(nextChecked === true
                  ? enumOptionsSelectValue(index, currentValues, enumOptions)
                  : enumOptionsDeselectValue(index, currentValues, enumOptions));
              }}
              onFocus={() => props.onFocus(props.id, enumOptionValueDecoder(encodedValue, enumOptions, "indexed", props.options.emptyValue))}
            />
            <Label className={getCheckboxLabelClassName(isDarkTheme)} htmlFor={checkboxId}>{option.label}</Label>
          </div>
        );
      })}
    </div>
  );
};

const JsonWidget = (props: WidgetProps) => {
  const isDarkTheme = getIsDarkTheme(props);
  const value = typeof props.value === "string" ? props.value : JSON.stringify(props.value ?? null, null, 2);
  return (
    <Textarea
      aria-describedby={ariaDescribedByIds(props.id)}
      aria-invalid={hasErrors(props) || undefined}
      className={getTextareaClassName(isDarkTheme, "min-h-28 font-mono text-xs")}
      disabled={props.disabled || props.readonly}
      id={props.id}
      name={props.htmlName || props.id}
      placeholder={props.placeholder}
      readOnly={props.readonly}
      value={value}
      onBlur={(event) => props.onBlur(props.id, event.target.value)}
      onChange={(event) => {
        try { props.onChange(JSON.parse(event.target.value)); } catch { props.onChange(event.target.value); }
      }}
      onFocus={(event) => props.onFocus(props.id, event.target.value)}
    />
  );
};

const StringListWidget = (props: WidgetProps) => {
  const isDarkTheme = getIsDarkTheme(props);
  const rendererCopy = getStrategySchemaCopy(props);
  const value = Array.isArray(props.value) ? props.value.map(String).join("\n") : "";
  return (
    <Textarea
      aria-describedby={ariaDescribedByIds(props.id)}
      aria-invalid={hasErrors(props) || undefined}
      className={getTextareaClassName(isDarkTheme, "min-h-24 text-sm font-bold")}
      disabled={props.disabled || props.readonly}
      id={props.id}
      name={props.htmlName || props.id}
      placeholder={props.placeholder || rendererCopy.stringListPlaceholder}
      readOnly={props.readonly}
      value={value}
      onBlur={(event) => props.onBlur(props.id, event.target.value)}
      onChange={(event) => props.onChange(event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))}
      onFocus={(event) => props.onFocus(props.id, event.target.value)}
    />
  );
};

const SymbolPickerWidget = (props: WidgetProps) => {
  const isDarkTheme = getIsDarkTheme(props);
  const rendererCopy = getStrategySchemaCopy(props);
  return (
    <Input
      aria-describedby={ariaDescribedByIds(props.id)}
      aria-invalid={hasErrors(props) || undefined}
      className={getInputClassName(isDarkTheme)}
      disabled={props.disabled || props.readonly}
      id={props.id}
      name={props.htmlName || props.id}
      placeholder={props.placeholder || rendererCopy.symbolPlaceholder}
      readOnly={props.readonly}
      value={props.value ?? ""}
      onBlur={(event) => props.onBlur(props.id, event.target.value)}
      onChange={(event) => props.onChange(event.target.value)}
      onFocus={(event) => props.onFocus(props.id, event.target.value)}
    />
  );
};

const PricePercentLadderWidget = (props: WidgetProps) => {
  const isDarkTheme = getIsDarkTheme(props);
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
  CheckboxWidget: StrategyCheckboxWidget,
  CheckboxesWidget: StrategyCheckboxesWidget,
  DateTimeWidget: StrategyDateTimeWidget,
  DateWidget: StrategyDateWidget,
  EmailWidget: StrategyEmailWidget,
  PasswordWidget: StrategyPasswordWidget,
  RadioWidget: StrategyRadioWidget,
  SelectWidget: StrategySelectWidget,
  TextWidget: StrategyTextWidget,
  TextareaWidget: StrategyTextareaWidget,
  TimeWidget: StrategyTimeWidget,
  UpDownWidget: StrategyNumberWidget,
  URLWidget: StrategyUrlWidget,
  "array-table": JsonWidget,
  checkbox: StrategyCheckboxWidget,
  checkboxes: StrategyCheckboxesWidget,
  date: StrategyDateWidget,
  "date-time": StrategyDateTimeWidget,
  datetime: StrategyDateTimeWidget,
  email: StrategyEmailWidget,
  json: JsonWidget,
  "percent-sum-table": JsonWidget,
  "price-percent-ladder": PricePercentLadderWidget,
  radio: StrategyRadioWidget,
  password: StrategyPasswordWidget,
  select: StrategySelectWidget,
  "string-list": StringListWidget,
  "symbol-picker": SymbolPickerWidget,
  text: StrategyTextWidget,
  textarea: StrategyTextareaWidget,
  time: StrategyTimeWidget,
  updown: StrategyNumberWidget,
  uri: StrategyUrlWidget,
};

function renderInputWidget(props: WidgetProps, inputType?: string) {
  const isDarkTheme = getIsDarkTheme(props);
  const inputProps = getInputProps(props.schema, inputType, props.options);
  const value = inputProps.type === "number" || inputProps.type === "integer"
    ? (props.value || props.value === 0 ? props.value : "")
    : (props.value ?? "");

  return (
    <Input
      {...inputProps}
      aria-describedby={ariaDescribedByIds(props.id)}
      aria-invalid={hasErrors(props) || undefined}
      autoFocus={props.autofocus}
      className={getInputClassName(isDarkTheme)}
      disabled={props.disabled}
      id={props.id}
      name={props.htmlName || props.id}
      placeholder={props.placeholder}
      readOnly={props.readonly}
      required={props.required}
      value={value}
      onBlur={(event) => props.onBlur(props.id, event.target.value)}
      onChange={(event) => props.onChange(event.target.value === "" ? props.options.emptyValue : event.target.value)}
      onFocus={(event) => props.onFocus(props.id, event.target.value)}
    />
  );
}

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
    "h-10 rounded-xl text-sm font-bold shadow-none",
    isDarkTheme
      ? "border-white/[0.085] bg-[#0F131A] text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-400/45 focus-visible:ring-indigo-400/10"
      : "border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-indigo-400/10",
  );
}

function getTextareaClassName(isDarkTheme: boolean, extra: string): string {
  return cn(
    extra,
    "rounded-2xl shadow-none",
    isDarkTheme
      ? "border-white/[0.085] bg-[#0F131A] text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-400/45 focus-visible:ring-indigo-400/10"
      : "border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-indigo-400/10",
  );
}

function getSelectTriggerClassName(isDarkTheme: boolean): string {
  return cn(
    "h-10 rounded-xl text-sm font-bold shadow-none",
    isDarkTheme
      ? "border-white/[0.085] bg-[#0F131A] text-slate-100 focus-visible:border-indigo-400/45 focus-visible:ring-indigo-400/10 data-[placeholder]:text-slate-600"
      : "border-slate-300 bg-white text-slate-950 focus-visible:border-indigo-400 focus-visible:ring-indigo-400/10 data-[placeholder]:text-slate-400",
  );
}

function getSelectContentClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "z-[180] max-h-[260px] rounded-2xl border border-white/[0.075] bg-[#111820] p-1 text-slate-100 shadow-[0_18px_44px_rgba(0,0,0,0.38)]"
    : "z-[180] max-h-[260px] rounded-2xl border border-[#E8E8EC] bg-white p-1 text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.14)]";
}

function getSelectItemClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "cursor-pointer rounded-xl px-3 py-2 font-bold data-[highlighted]:bg-white/[0.055] data-[state=checked]:bg-indigo-400/10 data-[state=checked]:text-indigo-100"
    : "cursor-pointer rounded-xl px-3 py-2 font-bold data-[highlighted]:bg-[#FAFAFA] data-[state=checked]:bg-[#EEF2FF] data-[state=checked]:text-[#4F46E5]";
}

function getSwitchClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "data-[state=unchecked]:bg-white/[0.14] data-[state=checked]:bg-indigo-400"
    : "data-[state=unchecked]:bg-slate-200 data-[state=checked]:bg-indigo-500";
}

function getCheckboxGroupClassName(isDarkTheme: boolean): string {
  return cn(
    "grid gap-2 rounded-2xl border p-3",
    isDarkTheme ? "border-white/[0.075] bg-[#0F131A]" : "border-[#E8E8EC] bg-white",
  );
}

function getCheckboxClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "border-white/[0.16] bg-white/[0.04]" : "border-slate-300 bg-white";
}

function getCheckboxLabelClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "text-sm font-bold text-slate-200" : "text-sm font-bold text-slate-700";
}

function getRadioButtonClassName(isDarkTheme: boolean, checked: boolean): string {
  return cn(
    "flex h-10 items-center gap-2 rounded-xl border px-3 text-left text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
    checked
      ? isDarkTheme
        ? "border-indigo-300/35 bg-indigo-400/10 text-indigo-100"
        : "border-indigo-200 bg-[#EEF2FF] text-[#4F46E5]"
      : isDarkTheme
        ? "border-white/[0.085] bg-[#0F131A] text-slate-200 hover:bg-white/[0.055]"
        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  );
}

function getRadioIndicatorClassName(isDarkTheme: boolean, checked: boolean): string {
  return cn(
    "flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px] leading-none",
    checked
      ? isDarkTheme
        ? "border-indigo-300 bg-indigo-400 text-white"
        : "border-indigo-500 bg-indigo-500 text-white"
      : isDarkTheme
        ? "border-white/[0.18] bg-white/[0.035] text-transparent"
        : "border-slate-300 bg-white text-transparent",
  );
}

function getOutlineButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "border-white/[0.085] bg-transparent text-slate-200 hover:bg-white/[0.055]"
    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
}

function getIsDarkTheme(props: WidgetProps): boolean {
  return Boolean((props.formContext as RendererWidgetContext | undefined)?.isDarkTheme);
}

function getStrategySchemaCopy(props: WidgetProps): StrategySchemaCopy {
  return (props.formContext as RendererWidgetContext | undefined)?.strategySchemaCopy as StrategySchemaCopy;
}

function hasErrors(props: WidgetProps): boolean {
  return Array.isArray(props.rawErrors) && props.rawErrors.length > 0;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
