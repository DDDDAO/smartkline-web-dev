"use client";

import Form from "@rjsf/core";
import type { FieldTemplateProps, RJSFSchema, RegistryWidgetsType, UiSchema, WidgetProps } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";

export type StrategySchemaRendererMode = "action" | "create" | "edit" | "readonly";

type JsonRecord = Record<string, unknown>;

export function StrategySchemaRenderer({
  formData,
  isDarkTheme,
  mode,
  schema,
  uiSchema,
  onChange,
}: {
  formData: JsonRecord;
  isDarkTheme: boolean;
  mode: StrategySchemaRendererMode;
  schema?: JsonRecord;
  uiSchema?: JsonRecord;
  onChange?: (nextFormData: JsonRecord) => void;
}) {
  const readonly = mode === "readonly";
  const formClassName = isDarkTheme
    ? "strategy-schema-form space-y-4 text-slate-100"
    : "strategy-schema-form space-y-4 text-slate-950";

  if (!schema || Object.keys(schema).length === 0) {
    return (
      <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-sm font-bold text-slate-400" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-3 text-sm font-bold text-slate-600"}>
        This strategy does not require additional configuration.
      </div>
    );
  }

  return (
    <Form
      className={formClassName}
      disabled={readonly}
      formData={formData}
      noHtml5Validate
      readonly={readonly}
      schema={schema as RJSFSchema}
      showErrorList={false}
      templates={{ FieldTemplate: StrategyFieldTemplate }}
      uiSchema={toRjsfUiSchema(uiSchema)}
      validator={validator}
      widgets={STRATEGY_WIDGETS}
      onChange={(event) => onChange?.((event.formData ?? {}) as JsonRecord)}
    >
      <div />
    </Form>
  );
}

function StrategyFieldTemplate(props: FieldTemplateProps) {
  const { children, description, displayLabel, errors, help, label, rawErrors, required } = props;
  const hasErrors = rawErrors && rawErrors.length > 0;
  return (
    <div className="space-y-1.5">
      {displayLabel ? (
        <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          {label}{required ? " *" : ""}
        </label>
      ) : null}
      {description}
      {children}
      {help}
      {hasErrors ? <div className="text-xs font-bold text-rose-500">{errors}</div> : null}
    </div>
  );
}

const JsonWidget = (props: WidgetProps) => {
  const value = typeof props.value === "string" ? props.value : JSON.stringify(props.value ?? null, null, 2);
  return (
    <textarea
      className="min-h-28 w-full rounded-2xl border border-slate-300 bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-sky-400"
      disabled={props.disabled || props.readonly}
      value={value}
      onChange={(event) => {
        try {
          props.onChange(JSON.parse(event.target.value));
        } catch {
          props.onChange(event.target.value);
        }
      }}
    />
  );
};

const STRATEGY_WIDGETS: RegistryWidgetsType = {
  "array-table": JsonWidget,
  json: JsonWidget,
  "percent-sum-table": JsonWidget,
  "price-percent-ladder": JsonWidget,
  "string-list": JsonWidget,
  "symbol-picker": (props: WidgetProps) => (
    <input
      className="h-11 w-full rounded-2xl border border-slate-300 bg-transparent px-3 text-sm font-bold outline-none focus:border-sky-400"
      disabled={props.disabled || props.readonly}
      placeholder="BTC/USDT:USDT"
      value={props.value ?? ""}
      onChange={(event) => props.onChange(event.target.value)}
    />
  ),
};

export function createStrategyConfigSkeleton(schema?: JsonRecord): JsonRecord {
  const value = createDefaultValue(schema, true);
  return isRecord(value) ? value : {};
}

function createDefaultValue(schema: unknown, isRequired: boolean): unknown {
  if (!isRecord(schema)) {
    return undefined;
  }
  if (schema.default !== undefined) {
    return schema.default;
  }
  const type = typeof schema.type === "string" ? schema.type : "";
  if (type === "object") {
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const required = new Set(Array.isArray(schema.required) ? schema.required.map(String) : []);
    const output: JsonRecord = {};
    for (const [key, childSchema] of Object.entries(properties)) {
      const childRequired = required.has(key);
      const childValue = createDefaultValue(childSchema, childRequired);
      if (childRequired || childValue !== undefined) {
        output[key] = childValue ?? {};
      }
    }
    return output;
  }
  if (type === "array") {
    return isRequired ? [] : undefined;
  }
  return undefined;
}

function toRjsfUiSchema(uiSchema?: JsonRecord): UiSchema {
  if (!uiSchema) {
    return DEFAULT_UI_SCHEMA;
  }
  return {
    ...convertTradingFoxUiSchema(uiSchema),
    "ui:submitButtonOptions": { norender: true },
  } as UiSchema;
}

const DEFAULT_UI_SCHEMA: UiSchema = {
  "ui:submitButtonOptions": { norender: true },
};

function convertTradingFoxUiSchema(uiSchema: JsonRecord): JsonRecord {
  const converted: JsonRecord = {};
  for (const [key, value] of Object.entries(uiSchema)) {
    if (key === "sections" && Array.isArray(value)) {
      for (const section of value) {
        if (!isRecord(section) || !Array.isArray(section.fields)) {
          continue;
        }
        for (const field of section.fields) {
          if (!isRecord(field) || typeof field.path !== "string") {
            continue;
          }
          assignFieldUi(converted, field.path, field);
        }
      }
      continue;
    }
    converted[key] = isRecord(value) ? convertTradingFoxUiSchema(value) : value;
  }
  return converted;
}

function assignFieldUi(target: JsonRecord, path: string, field: JsonRecord) {
  const parts = path.split(".").filter(Boolean);
  let current = target;
  for (const part of parts) {
    const next = current[part];
    if (!isRecord(next)) {
      current[part] = {};
    }
    current = current[part] as JsonRecord;
  }
  if (typeof field.label === "string") {
    current["ui:title"] = field.label;
  }
  if (typeof field.help === "string") {
    current["ui:description"] = field.help;
  }
  if (typeof field.widget === "string") {
    current["ui:widget"] = normalizeWidgetKey(field.widget);
  }
}

function normalizeWidgetKey(widget: string): string {
  if (widget === "integer") {
    return "updown";
  }
  if (widget === "switch") {
    return "checkbox";
  }
  return widget;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
