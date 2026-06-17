"use client";

import { useEffect, useMemo } from "react";
import Form from "@rjsf/core";
import type { FieldTemplateProps, FormContextType, RJSFSchema, RegistryWidgetsType, UiSchema, WidgetProps } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";

export type StrategySchemaRendererMode = "action" | "create" | "edit" | "readonly";
export type StrategySchemaRendererState = { canSubmit: boolean; errors: string[] };

type JsonRecord = Record<string, unknown>;
type RendererContext = FormContextType & { isDarkTheme?: boolean };
type UiCondition = { path?: string; eq?: unknown; ne?: unknown; in?: unknown[]; exists?: boolean };
type UiField = JsonRecord & { path: string; label?: string; help?: string; widget?: string; order?: number; visibleWhen?: UiCondition; enabledWhen?: UiCondition };

const SUPPORTED_WIDGETS = new Set(["text", "textarea", "number", "integer", "switch", "select", "radio", "json", "array-table", "string-list", "percent-sum-table", "price-percent-ladder", "symbol-picker"]);
const WIDGET_ALIASES: Record<string, string> = { integer: "updown", switch: "checkbox" };
const DEFAULT_UI_SCHEMA: UiSchema = { "ui:submitButtonOptions": { norender: true } };

export function StrategySchemaRenderer({
  formData,
  isDarkTheme,
  mode,
  schema,
  uiSchema,
  onChange,
  onValidationStateChange,
}: {
  formData: JsonRecord;
  isDarkTheme: boolean;
  mode: StrategySchemaRendererMode;
  schema?: JsonRecord;
  uiSchema?: JsonRecord;
  onChange?: (nextFormData: JsonRecord) => void;
  onValidationStateChange?: (state: StrategySchemaRendererState) => void;
}) {
  const readonly = mode === "readonly";
  const errors = useMemo(() => collectRendererErrors(schema, uiSchema), [schema, uiSchema]);
  const errorKey = errors.join("\n");

  useEffect(() => {
    onValidationStateChange?.({ canSubmit: errors.length === 0, errors });
  }, [errorKey, errors, onValidationStateChange]);

  if (!schema || Object.keys(schema).length === 0 || isEmptyObjectSchema(schema)) {
    return (
      <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-sm font-bold text-slate-400" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-3 text-sm font-bold text-slate-600"}>
        This strategy does not require additional configuration.
      </div>
    );
  }

  if (errors.length > 0) {
    return (
      <div className={isDarkTheme ? "rounded-2xl border border-rose-300/20 bg-rose-300/[0.07] px-3 py-3 text-sm text-rose-100" : "rounded-2xl border border-rose-100 bg-rose-50 px-3 py-3 text-sm text-rose-700"}>
        <div className="font-black">Strategy definition UI cannot be rendered.</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5">
          {errors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      </div>
    );
  }

  return (
    <Form
      className={isDarkTheme ? "strategy-schema-form space-y-4 text-slate-100" : "strategy-schema-form space-y-4 text-slate-950"}
      disabled={readonly}
      formContext={{ isDarkTheme } satisfies RendererContext}
      formData={formData}
      liveOmit
      noHtml5Validate
      omitExtraData
      readonly={readonly}
      schema={schema as RJSFSchema}
      showErrorList={false}
      templates={{ FieldTemplate: StrategyFieldTemplate }}
      uiSchema={toRjsfUiSchema(uiSchema, formData)}
      validator={validator}
      widgets={STRATEGY_WIDGETS}
      onChange={(event) => onChange?.((event.formData ?? {}) as JsonRecord)}
    >
      <div />
    </Form>
  );
}

function StrategyFieldTemplate({ children, description, displayLabel, errors, help, label, rawErrors, required }: FieldTemplateProps) {
  return (
    <div className="space-y-1.5">
      {displayLabel ? <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}{required ? " *" : ""}</label> : null}
      {description}
      {children}
      {help}
      {rawErrors?.length ? <div className="text-xs font-bold text-rose-500">{errors}</div> : null}
    </div>
  );
}

const JsonWidget = (props: WidgetProps) => {
  const isDarkTheme = Boolean((props.formContext as RendererContext | undefined)?.isDarkTheme);
  const value = typeof props.value === "string" ? props.value : JSON.stringify(props.value ?? null, null, 2);
  return (
    <textarea
      className={textareaClassName(isDarkTheme, "min-h-28 font-mono text-xs")}
      disabled={props.disabled || props.readonly}
      value={value}
      onChange={(event) => {
        try { props.onChange(JSON.parse(event.target.value)); } catch { props.onChange(event.target.value); }
      }}
    />
  );
};

const StringListWidget = (props: WidgetProps) => {
  const isDarkTheme = Boolean((props.formContext as RendererContext | undefined)?.isDarkTheme);
  const value = Array.isArray(props.value) ? props.value.map(String).join("\n") : "";
  return (
    <textarea
      className={textareaClassName(isDarkTheme, "min-h-24 text-sm font-bold")}
      disabled={props.disabled || props.readonly}
      placeholder="BTC/USDT:USDT\nETH/USDT:USDT"
      value={value}
      onChange={(event) => props.onChange(event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))}
    />
  );
};

const SymbolPickerWidget = (props: WidgetProps) => {
  const isDarkTheme = Boolean((props.formContext as RendererContext | undefined)?.isDarkTheme);
  return (
    <input
      className={inputClassName(isDarkTheme)}
      disabled={props.disabled || props.readonly}
      placeholder="BTC/USDT:USDT"
      value={props.value ?? ""}
      onChange={(event) => props.onChange(event.target.value)}
    />
  );
};

const PricePercentLadderWidget = (props: WidgetProps) => {
  const isDarkTheme = Boolean((props.formContext as RendererContext | undefined)?.isDarkTheme);
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
          <input className={inputClassName(isDarkTheme)} disabled={disabled} inputMode="decimal" placeholder="Price" value={row.price} onChange={(event) => emitRows(rows.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item))} />
          <input className={inputClassName(isDarkTheme)} disabled={disabled} inputMode="decimal" placeholder="Percent" value={row.percent} onChange={(event) => emitRows(rows.map((item, itemIndex) => itemIndex === index ? { ...item, percent: event.target.value } : item))} />
          <button className={buttonClassName} disabled={disabled} type="button" onClick={() => emitRows(rows.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
        </div>
      ))}
      <button className={buttonClassName} disabled={disabled} type="button" onClick={() => emitRows([...rows, { percent: "", price: "" }])}>Add ladder row</button>
    </div>
  );
};

const STRATEGY_WIDGETS: RegistryWidgetsType = {
  "array-table": JsonWidget,
  json: JsonWidget,
  "percent-sum-table": JsonWidget,
  "price-percent-ladder": PricePercentLadderWidget,
  "string-list": StringListWidget,
  "symbol-picker": SymbolPickerWidget,
};

type PricePercentRow = { price: string; percent: string };

function normalizePricePercentRow(value: unknown): PricePercentRow {
  if (!isRecord(value)) return { percent: "", price: "" };
  return { price: stringifyOptional(value.price), percent: stringifyOptional(value.percent) };
}

function stringifyOptional(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function parseOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
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

export function createStrategyConfigSkeleton(schema?: JsonRecord): JsonRecord {
  const value = createDefaultValue(schema, true);
  return isRecord(value) ? value : {};
}

function createDefaultValue(schema: unknown, isRequired: boolean): unknown {
  if (!isRecord(schema)) return undefined;
  if (schema.default !== undefined) return JSON.parse(JSON.stringify(schema.default)) as unknown;
  if (schema.type === "object") {
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const required = new Set(Array.isArray(schema.required) ? schema.required.map(String) : []);
    const output: JsonRecord = {};
    for (const [key, childSchema] of Object.entries(properties)) {
      const childRequired = required.has(key);
      const childValue = createDefaultValue(childSchema, childRequired);
      if (childRequired || childValue !== undefined) output[key] = childValue ?? {};
    }
    return output;
  }
  if (schema.type === "array") return isRequired ? [] : undefined;
  return undefined;
}

function toRjsfUiSchema(uiSchema: JsonRecord | undefined, formData: JsonRecord): UiSchema {
  if (!uiSchema) return DEFAULT_UI_SCHEMA;
  return { ...convertTradingFoxUiSchema(uiSchema, formData), "ui:submitButtonOptions": { norender: true } } as UiSchema;
}

function convertTradingFoxUiSchema(uiSchema: JsonRecord, formData: JsonRecord): JsonRecord {
  const converted: JsonRecord = {};
  for (const [key, value] of Object.entries(uiSchema)) {
    if (key === "sections" && Array.isArray(value)) {
      const orderedPaths: string[] = [];
      for (const section of value) {
        if (!isRecord(section) || !Array.isArray(section.fields)) continue;
        for (const field of section.fields.filter(isUiField).sort(compareUiFields)) {
          orderedPaths.push(field.path.split(".").filter(Boolean)[0] ?? "");
          assignFieldUi(converted, field, formData);
        }
      }
      const uiOrder = Array.from(new Set(orderedPaths)).filter(Boolean);
      if (uiOrder.length > 0) converted["ui:order"] = [...uiOrder, "*"];
      continue;
    }
    converted[key] = isRecord(value) ? convertTradingFoxUiSchema(value, formData) : value;
  }
  return converted;
}

function assignFieldUi(target: JsonRecord, field: UiField, formData: JsonRecord) {
  const parts = field.path.split(".").filter(Boolean);
  let current = target;
  for (const part of parts) {
    if (!isRecord(current[part])) current[part] = {};
    current = current[part] as JsonRecord;
  }
  if (typeof field.label === "string") current["ui:title"] = field.label;
  if (typeof field.help === "string") current["ui:description"] = field.help;
  if (typeof field.widget === "string") current["ui:widget"] = WIDGET_ALIASES[field.widget] ?? field.widget;
  if (field.visibleWhen && !evaluateCondition(field.visibleWhen, formData)) current["ui:widget"] = "hidden";
  if (field.enabledWhen && !evaluateCondition(field.enabledWhen, formData)) current["ui:disabled"] = true;
}

function collectRendererErrors(schema?: JsonRecord, uiSchema?: JsonRecord): string[] {
  if (!schema || !uiSchema) return [];
  const errors: string[] = [];
  collectUiSchemaErrors(schema, uiSchema, "uiSchema", errors);
  return errors;
}

function collectUiSchemaErrors(schema: JsonRecord, uiSchema: JsonRecord, path: string, errors: string[]) {
  for (const [key, value] of Object.entries(uiSchema)) {
    if (key === "sections") {
      if (!Array.isArray(value)) {
        errors.push(`${path}.sections must be an array.`);
        continue;
      }
      value.forEach((section, sectionIndex) => {
        if (!isRecord(section) || !Array.isArray(section.fields)) {
          errors.push(`${path}.sections[${sectionIndex}].fields must be an array.`);
          return;
        }
        section.fields.forEach((field, fieldIndex) => validateUiField(schema, field, `${path}.sections[${sectionIndex}].fields[${fieldIndex}]`, errors));
      });
      continue;
    }
    if (isRecord(value)) collectUiSchemaErrors(childSchemaForKey(schema, key) ?? schema, value, `${path}.${key}`, errors);
  }
}

function validateUiField(schema: JsonRecord, field: unknown, path: string, errors: string[]) {
  if (!isRecord(field) || typeof field.path !== "string" || !field.path.trim()) {
    errors.push(`${path}.path is required.`);
    return;
  }
  if (!schemaPathExists(schema, field.path)) errors.push(`${path}.path references missing schema path "${field.path}".`);
  if (typeof field.widget === "string" && !SUPPORTED_WIDGETS.has(field.widget)) errors.push(`${path}.widget "${field.widget}" is not supported by the frontend widget registry.`);
  validateCondition(schema, field.visibleWhen, `${path}.visibleWhen`, errors);
  validateCondition(schema, field.enabledWhen, `${path}.enabledWhen`, errors);
}

function validateCondition(schema: JsonRecord, condition: unknown, path: string, errors: string[]) {
  if (condition === undefined) return;
  if (!isRecord(condition)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  if (typeof condition.path !== "string" || !condition.path.trim()) {
    errors.push(`${path}.path is required.`);
    return;
  }
  if (!schemaPathExists(schema, condition.path)) errors.push(`${path}.path references missing schema path "${condition.path}".`);
  const operators = ["eq", "ne", "in", "exists"].filter((operator) => Object.prototype.hasOwnProperty.call(condition, operator));
  if (operators.length !== 1) errors.push(`${path} must declare exactly one of eq, ne, in, or exists.`);
  if (Object.prototype.hasOwnProperty.call(condition, "in") && !Array.isArray(condition.in)) errors.push(`${path}.in must be an array.`);
  if (Object.prototype.hasOwnProperty.call(condition, "exists") && typeof condition.exists !== "boolean") errors.push(`${path}.exists must be a boolean.`);
}

function childSchemaForKey(schema: JsonRecord, key: string): JsonRecord | null {
  const properties = isRecord(schema.properties) ? schema.properties : null;
  return properties && isRecord(properties[key]) ? properties[key] : null;
}

function schemaPathExists(schema: JsonRecord, path: string): boolean {
  let current: unknown = schema;
  for (const part of path.split(".").filter(Boolean)) {
    if (!isRecord(current)) return false;
    if (current.type === "array") current = current.items;
    if (!isRecord(current)) return false;
    const properties = isRecord(current.properties) ? current.properties : null;
    if (!properties || !isRecord(properties[part])) return false;
    current = properties[part];
  }
  return true;
}

function evaluateCondition(condition: UiCondition, formData: JsonRecord): boolean {
  if (!condition.path) return true;
  const value = getValueAtPath(formData, condition.path);
  if (Object.prototype.hasOwnProperty.call(condition, "eq")) return value === condition.eq;
  if (Object.prototype.hasOwnProperty.call(condition, "ne")) return value !== condition.ne;
  if (Array.isArray(condition.in)) return condition.in.some((item) => item === value);
  if (typeof condition.exists === "boolean") return hasUsableValue(value) === condition.exists;
  return true;
}

function getValueAtPath(data: JsonRecord, path: string): unknown {
  let current: unknown = data;
  for (const part of path.split(".").filter(Boolean)) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

function hasUsableValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function isEmptyObjectSchema(schema: JsonRecord): boolean {
  return schema.type === "object" && isRecord(schema.properties) && Object.keys(schema.properties).length === 0;
}

function isUiField(value: unknown): value is UiField {
  return isRecord(value) && typeof value.path === "string";
}

function compareUiFields(left: UiField, right: UiField): number {
  const leftOrder = typeof left.order === "number" ? left.order : Number.MAX_SAFE_INTEGER;
  const rightOrder = typeof right.order === "number" ? right.order : Number.MAX_SAFE_INTEGER;
  return leftOrder - rightOrder || left.path.localeCompare(right.path);
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
