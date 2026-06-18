import { WORKSPACE_COPY, type WorkspaceCopy, type WorkspaceLanguage } from "@/app/_lib/i18n";
import type {
  TradingFoxActionDefinition,
  TradingFoxDisplayMetadata,
  TradingFoxLocalizedText,
  TradingFoxStrategyDefinitionSummary,
} from "@/app/_lib/tradingfox-control-plane";

export type JsonRecord = Record<string, unknown>;

const FALLBACK_DISPLAY_LOCALES: readonly WorkspaceLanguage[] = ["zh-CN", "en-US"];
const SCHEMA_MAP_KEYS = new Set(["$defs", "definitions", "dependentSchemas", "patternProperties", "properties"]);
const SCHEMA_NODE_KEYS = new Set([
  "additionalItems",
  "additionalProperties",
  "contains",
  "else",
  "if",
  "items",
  "not",
  "propertyNames",
  "then",
  "unevaluatedItems",
  "unevaluatedProperties",
]);
const SCHEMA_ARRAY_KEYS = new Set(["allOf", "anyOf", "oneOf", "prefixItems"]);

export function resolveWorkspaceDisplayLanguage(copy: WorkspaceCopy): WorkspaceLanguage {
  return copy === WORKSPACE_COPY["en-US"] ? "en-US" : "zh-CN";
}

export function localizedDisplayText(
  text: TradingFoxLocalizedText | undefined,
  copy: WorkspaceCopy,
  fallback = "",
): string {
  if (!text) {
    return fallback;
  }

  for (const locale of prioritizedLocales(copy)) {
    const value = normalizeDisplayString(text[locale]);
    if (value) {
      return value;
    }
  }

  const firstAvailable = Object.keys(text)
    .sort()
    .map((locale) => normalizeDisplayString(text[locale]))
    .find(Boolean);
  return firstAvailable ?? fallback;
}

export function strategyDefinitionLabel(
  definition: TradingFoxStrategyDefinitionSummary,
  copy: WorkspaceCopy,
): string {
  return localizedDisplayText(definition.display?.label, copy, definition.name || definition.id);
}

export function strategyDefinitionDescription(
  definition: TradingFoxStrategyDefinitionSummary,
  copy: WorkspaceCopy,
  fallback = "",
): string {
  return localizedDisplayText(definition.display?.description, copy, definition.description || fallback);
}

export function actionDefinitionLabel(action: TradingFoxActionDefinition, copy: WorkspaceCopy): string {
  return localizedDisplayText(action.display?.label, copy, action.label || action.id);
}

export function actionDefinitionDescription(action: TradingFoxActionDefinition, copy: WorkspaceCopy): string {
  return localizedDisplayText(action.display?.description, copy, action.description || "");
}

export function schemaDisplayLabel(
  schema: unknown,
  copy: WorkspaceCopy,
  fallback: string,
): string {
  const record = isRecord(schema) ? schema : undefined;
  return localizedDisplayText(readDisplayMetadata(record)?.label, copy, stringProperty(record, "title") || fallback);
}

export function schemaDisplayDescription(schema: unknown, copy: WorkspaceCopy): string | undefined {
  const record = isRecord(schema) ? schema : undefined;
  const description = localizedDisplayText(
    readDisplayMetadata(record)?.description,
    copy,
    stringProperty(record, "description"),
  );
  return description || undefined;
}

export function schemaOptionLabel(schema: unknown, value: unknown, copy: WorkspaceCopy): string | null {
  const record = isRecord(schema) ? schema : undefined;
  const displayOption = optionDisplayMetadata(record, value);
  const oneOfTitle = oneOfOptionTitle(record, value);
  const enumName = enumNameForValue(record, value);
  const fallback = oneOfTitle || enumName;
  const label = localizedDisplayText(displayOption?.label, copy, fallback);
  return label || null;
}

export function hasSchemaDisplayLabel(schema: unknown): boolean {
  return Boolean(readDisplayMetadata(isRecord(schema) ? schema : undefined)?.label);
}

export function hasSchemaDisplayDescription(schema: unknown): boolean {
  return Boolean(readDisplayMetadata(isRecord(schema) ? schema : undefined)?.description);
}

export function withStrategyDisplayMetadata(schema: JsonRecord, copy: WorkspaceCopy): JsonRecord {
  return transformSchemaNode(schema, copy, true) as JsonRecord;
}

export function withoutStrategyDisplayMetadata(schema: JsonRecord): JsonRecord {
  return transformSchemaNode(schema, undefined, false) as JsonRecord;
}

export function createStrategyDisplayUiSchema(schema: JsonRecord | undefined, copy: WorkspaceCopy): JsonRecord {
  if (!schema) {
    return {};
  }
  return createDisplayUiSchemaNode(schema, copy);
}

export function mergeUiSchemas(base: JsonRecord, override: JsonRecord): JsonRecord {
  const merged: JsonRecord = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (isRecord(value) && isRecord(merged[key])) {
      merged[key] = mergeUiSchemas(merged[key] as JsonRecord, value);
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

export function schemaAtPath(schema: JsonRecord | undefined, path: string): JsonRecord | null {
  let current: unknown = schema;
  for (const part of path.split(".").filter(Boolean)) {
    if (!isRecord(current)) return null;
    if (current.type === "array") current = current.items;
    if (!isRecord(current)) return null;
    const properties = isRecord(current.properties) ? current.properties : null;
    if (!properties || !isRecord(properties[part])) return null;
    current = properties[part];
  }
  return isRecord(current) ? current : null;
}

export function propertySchemaForKey(schema: JsonRecord | undefined, key: string): JsonRecord | undefined {
  const properties = isRecord(schema?.properties) ? schema.properties : undefined;
  return properties && isRecord(properties[key]) ? properties[key] : undefined;
}

function prioritizedLocales(copy: WorkspaceCopy): readonly WorkspaceLanguage[] {
  const primary = resolveWorkspaceDisplayLanguage(copy);
  return [primary, ...FALLBACK_DISPLAY_LOCALES.filter((locale) => locale !== primary)];
}

function transformSchemaNode(value: unknown, copy: WorkspaceCopy | undefined, applyDisplay: boolean): unknown {
  if (!isRecord(value)) {
    return cloneJsonValue(value);
  }

  const output: JsonRecord = {};
  for (const [key, childValue] of Object.entries(value)) {
    if (key === "display") {
      continue;
    }
    if (SCHEMA_MAP_KEYS.has(key) && isRecord(childValue)) {
      output[key] = transformSchemaMap(childValue, copy, applyDisplay);
      continue;
    }
    if (SCHEMA_NODE_KEYS.has(key) && isRecord(childValue)) {
      output[key] = transformSchemaNode(childValue, copy, applyDisplay);
      continue;
    }
    if (key === "items" && Array.isArray(childValue)) {
      output[key] = childValue.map((item) => transformSchemaNode(item, copy, applyDisplay));
      continue;
    }
    if (SCHEMA_ARRAY_KEYS.has(key) && Array.isArray(childValue)) {
      output[key] = childValue.map((item) => transformSchemaNode(item, copy, applyDisplay));
      continue;
    }
    output[key] = cloneJsonValue(childValue);
  }

  if (applyDisplay && copy) {
    applySchemaDisplay(output, value, copy);
  }
  return output;
}

function transformSchemaMap(schemaMap: JsonRecord, copy: WorkspaceCopy | undefined, applyDisplay: boolean): JsonRecord {
  const output: JsonRecord = {};
  for (const [key, schema] of Object.entries(schemaMap)) {
    output[key] = transformSchemaNode(schema, copy, applyDisplay);
  }
  return output;
}

function applySchemaDisplay(output: JsonRecord, source: JsonRecord, copy: WorkspaceCopy) {
  const display = readDisplayMetadata(source);
  const label = localizedDisplayText(display?.label, copy);
  const description = localizedDisplayText(display?.description, copy);
  if (label) {
    output.title = label;
  }
  if (description) {
    output.description = description;
  }
  if (Array.isArray(source.enum) && display?.options) {
    const enumNames = Array.isArray(source.enumNames) ? source.enumNames : [];
    output.oneOf = source.enum.map((value, index) => {
      const optionDisplay = optionDisplayMetadata(source, value);
      const optionSchema: JsonRecord = { const: value };
      const title = localizedDisplayText(optionDisplay?.label, copy, typeof enumNames[index] === "string" ? enumNames[index] : String(value));
      const optionDescription = localizedDisplayText(optionDisplay?.description, copy);
      if (title) {
        optionSchema.title = title;
      }
      if (optionDescription) {
        optionSchema.description = optionDescription;
      }
      return optionSchema;
    });
    delete output.enum;
    delete output.enumNames;
  }
}

function createDisplayUiSchemaNode(schema: unknown, copy: WorkspaceCopy): JsonRecord {
  if (!isRecord(schema)) {
    return {};
  }

  const uiSchema: JsonRecord = {};
  const placeholder = localizedDisplayText(readDisplayMetadata(schema)?.placeholder, copy);
  if (placeholder) {
    uiSchema["ui:placeholder"] = placeholder;
  }

  const properties = isRecord(schema.properties) ? schema.properties : {};
  for (const [key, childSchema] of Object.entries(properties)) {
    const childUiSchema = createDisplayUiSchemaNode(childSchema, copy);
    if (Object.keys(childUiSchema).length > 0) {
      uiSchema[key] = childUiSchema;
    }
  }

  if (isRecord(schema.items)) {
    const itemUiSchema = createDisplayUiSchemaNode(schema.items, copy);
    if (Object.keys(itemUiSchema).length > 0) {
      uiSchema.items = itemUiSchema;
    }
  }

  return uiSchema;
}

function optionDisplayMetadata(schema: JsonRecord | undefined, value: unknown): TradingFoxDisplayMetadata | undefined {
  const options = readDisplayMetadata(schema)?.options;
  if (!options) {
    return undefined;
  }
  const key = optionKey(value);
  return options[key];
}

function oneOfOptionTitle(schema: JsonRecord | undefined, value: unknown): string {
  if (!schema || !Array.isArray(schema.oneOf)) {
    return "";
  }
  const match = schema.oneOf.find((option) => isRecord(option) && valuesEqual(option.const, value));
  return isRecord(match) ? stringProperty(match, "title") : "";
}

function enumNameForValue(schema: JsonRecord | undefined, value: unknown): string {
  if (!schema || !Array.isArray(schema.enum) || !Array.isArray(schema.enumNames)) {
    return "";
  }
  const index = schema.enum.findIndex((enumValue) => valuesEqual(enumValue, value));
  const enumName = index >= 0 ? schema.enumNames[index] : undefined;
  return typeof enumName === "string" ? enumName : "";
}

function readDisplayMetadata(schema: JsonRecord | undefined): TradingFoxDisplayMetadata | undefined {
  return isRecord(schema?.display) ? schema.display as TradingFoxDisplayMetadata : undefined;
}

function optionKey(value: unknown): string {
  if (value === null) {
    return "null";
  }
  return String(value);
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cloneJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cloneJsonValue);
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneJsonValue(item)]));
}

function stringProperty(record: JsonRecord | undefined, key: string): string {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function normalizeDisplayString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
