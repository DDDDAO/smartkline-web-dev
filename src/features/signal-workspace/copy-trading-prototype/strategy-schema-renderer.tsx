"use client";

import { useEffect, useMemo } from "react";
import { useLocale } from "next-intl";
import Form from "@rjsf/core";
import type { FieldTemplateProps, FormContextType, RJSFSchema, UiSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { getWorkspaceLanguageFromLocale, type WorkspaceCopy, type WorkspaceLanguage } from "@/i18n/workspace";
import type { SignalSourceIdentityById } from "./strategy-detail-shared";
import {
  createStrategyDisplayUiSchema,
  hasSchemaDisplayDescription,
  hasSchemaDisplayLabel,
  mergeUiSchemas,
  propertySchemaForKey,
  schemaAtPath,
  withStrategyDisplayMetadata,
  withoutStrategyDisplayMetadata,
} from "./strategy-display-metadata";
import { StrategySchemaReadonlyView } from "./strategy-schema-readonly-view";
import { STRATEGY_WIDGETS } from "./strategy-schema-widgets";
import { normalizeUiFields, normalizeUiSections, type UiCondition, type UiField } from "./strategy-ui-schema";
import styles from "./strategy-schema-renderer.module.css";

export type StrategySchemaRendererMode = "action" | "create" | "edit" | "readonly";
export type StrategySchemaRendererState = { canSubmit: boolean; errors: string[] };

type JsonRecord = Record<string, unknown>;
type StrategySchemaCopy = WorkspaceCopy["workspace"]["accountCenter"]["strategySchema"];
type RendererContext = FormContextType & { isDarkTheme?: boolean; strategySchemaCopy?: StrategySchemaCopy };

const SUPPORTED_WIDGETS = new Set([
  "array",
  "array-table",
  "checkbox",
  "integer",
  "json",
  "number",
  "object",
  "percent-sum-table",
  "price-percent-ladder",
  "radio",
  "readonly-badge",
  "readonly-table",
  "select",
  "string-list",
  "switch",
  "symbol-picker",
  "text",
  "textarea",
]);
const WIDGET_ALIASES: Record<string, string | undefined> = {
  array: undefined,
  checkbox: "checkbox",
  integer: "updown",
  number: "updown",
  object: undefined,
  "readonly-badge": undefined,
  "readonly-table": undefined,
  switch: "checkbox",
  text: undefined,
};

export function StrategySchemaRenderer({
  copy,
  formData,
  hiddenPaths = [],
  isDarkTheme,
  mode,
  schema,
  signalSourceIdentityById,
  uiSchema,
  onChange,
  onValidationStateChange,
}: {
  copy: WorkspaceCopy;
  formData: JsonRecord;
  hiddenPaths?: readonly string[];
  isDarkTheme: boolean;
  mode: StrategySchemaRendererMode;
  schema?: JsonRecord;
  signalSourceIdentityById?: SignalSourceIdentityById;
  uiSchema?: JsonRecord;
  onChange?: (nextFormData: JsonRecord) => void;
  onValidationStateChange?: (state: StrategySchemaRendererState) => void;
}) {
  const readonly = mode === "readonly";
  const rendererCopy = copy.workspace.accountCenter.strategySchema;
  const language = getWorkspaceLanguageFromLocale(useLocale());
  const errors = useMemo(() => collectRendererErrors(schema, uiSchema), [schema, uiSchema]);
  const errorKey = errors.join("\n");
  const renderSchema = useMemo(() => schema ? withStrategyDisplayMetadata(schema, language) : undefined, [language, schema]);
  const rjsfUiSchema = useMemo(() => toRjsfUiSchema({
    formData,
    hiddenPaths,
    language,
    schema,
    uiSchema,
  }), [formData, hiddenPaths, language, schema, uiSchema]);

  useEffect(() => {
    onValidationStateChange?.({ canSubmit: errors.length === 0, errors });
  }, [errorKey, errors, onValidationStateChange]);

  if (!schema || Object.keys(schema).length === 0 || isEmptyObjectSchema(schema)) {
    return (
      <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-sm font-bold text-slate-400" : "rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 py-3 text-sm font-bold text-slate-600"}>
        {rendererCopy.noAdditionalConfig}
      </div>
    );
  }

  if (errors.length > 0) {
    return (
      <div className={isDarkTheme ? "rounded-2xl border border-rose-300/20 bg-rose-300/[0.07] px-3 py-3 text-sm text-rose-100" : "rounded-2xl border border-rose-100 bg-rose-50 px-3 py-3 text-sm text-rose-700"}>
        <div className="font-black">{rendererCopy.definitionRenderErrorTitle}</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5">
          {errors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      </div>
    );
  }

  if (readonly) {
    return (
      <StrategySchemaReadonlyView
        copy={copy}
        formData={formData}
        isDarkTheme={isDarkTheme}
        language={language}
        schema={schema}
        signalSourceIdentityById={signalSourceIdentityById}
        uiSchema={uiSchema}
      />
    );
  }

  return (
    <Form
      className={`${styles.form} ${isDarkTheme ? `${styles.darkForm} text-slate-100` : "text-slate-950"} space-y-4`}
      disabled={readonly}
      formContext={{ isDarkTheme, strategySchemaCopy: rendererCopy } satisfies RendererContext}
      formData={formData}
      liveOmit
      noHtml5Validate
      omitExtraData
      readonly={readonly}
      schema={renderSchema as RJSFSchema}
      showErrorList={false}
      templates={{ FieldTemplate: StrategyFieldTemplate }}
      uiSchema={rjsfUiSchema}
      validator={validator}
      widgets={STRATEGY_WIDGETS}
      onChange={(event) => onChange?.((event.formData ?? {}) as JsonRecord)}
    >
      <div />
    </Form>
  );
}

function StrategyFieldTemplate({ children, description, displayLabel, errors, help, hidden, id, label, rawErrors, registry, required, schema, uiSchema }: FieldTemplateProps) {
  if (hidden) {
    return <div className="hidden">{children}</div>;
  }

  const isDarkTheme = Boolean((registry.formContext as RendererContext | undefined)?.isDarkTheme);
  const widget = typeof uiSchema?.["ui:widget"] === "string" ? uiSchema["ui:widget"] : "";
  const shouldFrameField = Boolean(displayLabel && id !== "root" && (schema.type === "object" || schema.type === "array" || widget === "json" || widget === "array-table" || widget === "percent-sum-table" || widget === "price-percent-ladder"));
  const content = (
    <>
      {displayLabel ? <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}{required ? " *" : ""}</label> : null}
      {description}
      {children}
      {help}
      {rawErrors?.length ? <div className="text-xs font-bold text-rose-500">{errors}</div> : null}
    </>
  );

  if (!shouldFrameField) {
    return <div className="space-y-1.5">{content}</div>;
  }

  return (
    <div className={isDarkTheme ? "space-y-2 rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3" : "space-y-2 rounded-2xl border border-[#E8E8EC] bg-white p-3"}>
      {content}
    </div>
  );
}

export function createStrategyConfigSkeleton(schema?: JsonRecord): JsonRecord {
  const value = createDefaultValue(schema, true);
  return isRecord(value) ? value : {};
}

export function validateStrategySchemaData({
  formData,
  hiddenPaths = [],
  language,
  schema,
  uiSchema,
}: {
  formData: JsonRecord;
  hiddenPaths?: readonly string[];
  language: WorkspaceLanguage;
  schema?: JsonRecord;
  uiSchema?: JsonRecord;
}): string[] {
  const rendererErrors = collectRendererErrors(schema, uiSchema);
  if (rendererErrors.length > 0 || !schema || Object.keys(schema).length === 0 || isEmptyObjectSchema(schema)) {
    return rendererErrors;
  }

  const validation = validator.validateFormData(
    formData,
    withoutStrategyDisplayMetadata(schema) as RJSFSchema,
    undefined,
    undefined,
    toRjsfUiSchema({ formData, hiddenPaths, language, schema, uiSchema }),
  );
  return validation.errors
    .map((error) => error.stack || error.message || error.name)
    .filter((error): error is string => Boolean(error));
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
      if (childValue !== undefined) {
        output[key] = childValue;
      } else if (childRequired && isRecord(childSchema) && childSchema.type === "object") {
        output[key] = {};
      } else if (childRequired && isRecord(childSchema) && childSchema.type === "array") {
        output[key] = [];
      }
    }
    return isRequired || Object.keys(output).length > 0 ? output : undefined;
  }
  if (schema.type === "array") return isRequired ? [] : undefined;
  return undefined;
}

function toRjsfUiSchema({
  formData,
  hiddenPaths = [],
  language,
  schema,
  uiSchema,
}: {
  formData: JsonRecord;
  hiddenPaths?: readonly string[];
  language: WorkspaceLanguage;
  schema?: JsonRecord;
  uiSchema?: JsonRecord;
}): UiSchema {
  const converted = uiSchema ? convertTradingFoxUiSchema(uiSchema, formData, schema) : {};
  const displayUiSchema = createStrategyDisplayUiSchema(schema, language);
  const merged = mergeUiSchemas(converted, displayUiSchema);
  for (const path of hiddenPaths) {
    assignHiddenUi(merged, path);
  }
  return {
    ...merged,
    "ui:submitButtonOptions": { norender: true },
  } as UiSchema;
}

function assignHiddenUi(target: JsonRecord, path: string) {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) {
    return;
  }
  let current = target;
  for (const part of parts) {
    if (!isRecord(current[part])) current[part] = {};
    current = current[part] as JsonRecord;
  }
  current["ui:widget"] = "hidden";
}

function convertTradingFoxUiSchema(uiSchema: JsonRecord, formData: JsonRecord, schema?: JsonRecord): JsonRecord {
  const converted: JsonRecord = {};
  for (const field of normalizeUiFields(uiSchema)) {
    assignFieldUi(converted, field, formData, schema);
  }

  for (const [key, value] of Object.entries(uiSchema)) {
    if (key === "fields") {
      continue;
    }
    if (key === "sections" && Array.isArray(value)) {
      const orderedPaths: string[] = [];
      for (const section of normalizeUiSections(uiSchema) ?? []) {
        for (const field of section.fields.filter(isUiField).sort(compareUiFields)) {
          orderedPaths.push(field.path.split(".").filter(Boolean)[0] ?? "");
          assignFieldUi(converted, field, formData, schema);
        }
      }
      const uiOrder = Array.from(new Set(orderedPaths)).filter(Boolean);
      if (uiOrder.length > 0) converted["ui:order"] = [...uiOrder, "*"];
      continue;
    }
    converted[key] = isRecord(value) ? convertTradingFoxUiSchema(value, formData, propertySchemaForKey(schema, key)) : value;
  }
  return converted;
}

function assignFieldUi(target: JsonRecord, field: UiField, formData: JsonRecord, schema?: JsonRecord) {
  const parts = field.path.split(".").filter(Boolean);
  let current = target;
  for (const part of parts) {
    if (!isRecord(current[part])) current[part] = {};
    current = current[part] as JsonRecord;
  }
  const fieldSchema = schema ? schemaAtPath(schema, field.path) : null;
  if (typeof field.label === "string" && !hasSchemaDisplayLabel(fieldSchema)) current["ui:title"] = field.label;
  if (typeof field.help === "string" && !hasSchemaDisplayDescription(fieldSchema)) current["ui:description"] = field.help;
  if (typeof field.widget === "string") {
    const widget = Object.prototype.hasOwnProperty.call(WIDGET_ALIASES, field.widget)
      ? WIDGET_ALIASES[field.widget]
      : field.widget;
    if (widget) current["ui:widget"] = widget;
  }
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
    if (key === "fields") {
      if (!isRecord(value)) {
        errors.push(`${path}.fields must be an object.`);
        continue;
      }
      for (const [fieldPath, field] of Object.entries(value)) {
        validateUiField(schema, typeof field === "string" ? field : { ...(isRecord(field) ? field : {}), path: fieldPath }, `${path}.fields.${fieldPath}`, errors);
      }
      continue;
    }
    if (isRecord(value)) collectUiSchemaErrors(propertySchemaForKey(schema, key) ?? schema, value, `${path}.${key}`, errors);
  }
}

function validateUiField(schema: JsonRecord, field: unknown, path: string, errors: string[]) {
  if (typeof field === "string" && field.trim()) {
    if (!schemaPathExists(schema, field.trim())) errors.push(`${path} references missing schema path "${field.trim()}".`);
    return;
  }
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
