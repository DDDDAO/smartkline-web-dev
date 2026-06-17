"use client";

import type { WorkspaceCopy } from "@/app/_lib/i18n";
import { SourceAvatar } from "../card-ui";
import type { SignalSourceIdentityById } from "./strategy-detail-shared";

type JsonRecord = Record<string, unknown>;
type UiCondition = { path?: string; eq?: unknown; ne?: unknown; in?: unknown[]; exists?: boolean };
type UiField = JsonRecord & { path: string; label?: string; help?: string; order?: number; visibleWhen?: UiCondition };
type UiSection = { title: string; description?: string; fields: ReadonlyField[] };
type ReadonlyField = { description?: string; label: string; path: string; schema?: JsonRecord; value: unknown };
type StrategySchemaCopy = WorkspaceCopy["workspace"]["accountCenter"]["strategySchema"];

export function StrategySchemaReadonlyView({
  copy,
  formData,
  isDarkTheme,
  schema,
  signalSourceIdentityById,
  uiSchema,
}: {
  copy: WorkspaceCopy;
  formData: JsonRecord;
  isDarkTheme: boolean;
  schema: JsonRecord;
  signalSourceIdentityById?: SignalSourceIdentityById;
  uiSchema?: JsonRecord;
}) {
  const rendererCopy = copy.workspace.accountCenter.strategySchema;
  const sections = createReadonlySections(schema, uiSchema, formData, rendererCopy);
  const visibleSections = sections
    .map((section) => ({ ...section, fields: section.fields.filter((field) => hasReadableField(field.value)) }))
    .filter((section) => section.fields.length > 0);

  if (visibleSections.length === 0) {
    return (
      <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-sm font-bold text-slate-400" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-3 text-sm font-bold text-slate-600"}>
        {rendererCopy.noAdditionalConfig}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleSections.map((section) => (
        <section key={section.title} className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3"}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-black">{section.title}</h4>
              {section.description ? <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>{section.description}</p> : null}
            </div>
            <span className={isDarkTheme ? "rounded-full bg-white/[0.055] px-2 py-0.5 text-[10px] font-black text-slate-400" : "rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-500"}>
              {rendererCopy.itemCount(section.fields.length)}
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {section.fields.map((field) => (
              <ReadonlyFieldCard
                key={field.path}
                copy={copy}
                field={field}
                isDarkTheme={isDarkTheme}
                signalSourceIdentityById={signalSourceIdentityById}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ReadonlyFieldCard({
  copy,
  field,
  isDarkTheme,
  signalSourceIdentityById,
}: {
  copy: WorkspaceCopy;
  field: ReadonlyField;
  isDarkTheme: boolean;
  signalSourceIdentityById?: SignalSourceIdentityById;
}) {
  if (field.path.split(".").pop() === "signalSourceConfigs" && Array.isArray(field.value)) {
    return (
      <div className={isDarkTheme ? "rounded-xl border border-white/[0.065] bg-[#0F131A]/70 px-3 py-3" : "rounded-xl border border-[#E5EAF0] bg-white px-3 py-3"}>
        <div className={isDarkTheme ? "text-xs font-black text-slate-200" : "text-xs font-black text-slate-800"}>{field.label}</div>
        {field.description ? <div className={isDarkTheme ? "mt-1 text-[11px] leading-4 text-slate-500" : "mt-1 text-[11px] leading-4 text-slate-500"}>{field.description}</div> : null}
        <SignalSourceConfigGrid
          copy={copy}
          isDarkTheme={isDarkTheme}
          signalSourceIdentityById={signalSourceIdentityById}
          value={field.value}
        />
      </div>
    );
  }

  return (
    <div className={isDarkTheme ? "rounded-xl border border-white/[0.065] bg-[#0F131A]/70 px-3 py-2" : "rounded-xl border border-[#E5EAF0] bg-white px-3 py-2"}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 sm:max-w-[42%]">
          <div className={isDarkTheme ? "text-xs font-black text-slate-200" : "text-xs font-black text-slate-800"}>{field.label}</div>
          {field.description ? <div className={isDarkTheme ? "mt-1 text-[11px] leading-4 text-slate-500" : "mt-1 text-[11px] leading-4 text-slate-500"}>{field.description}</div> : null}
        </div>
        <div className="min-w-0 flex-1 sm:text-right">
          <ReadonlyValue copy={copy} isDarkTheme={isDarkTheme} value={field.value} />
        </div>
      </div>
    </div>
  );
}

function ReadonlyValue({
  copy,
  isDarkTheme,
  value,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  value: unknown;
}) {
  const rendererCopy = copy.workspace.accountCenter.strategySchema;
  if (!hasReadableField(value)) {
    return <span className="text-xs font-bold text-slate-500">{rendererCopy.notSet}</span>;
  }
  if (typeof value === "boolean") {
    return <span className={booleanPillClassName(isDarkTheme, value)}>{value ? rendererCopy.booleanYes : rendererCopy.booleanNo}</span>;
  }
  if (typeof value === "number" || typeof value === "string") {
    return <span className={isDarkTheme ? "break-words text-sm font-bold text-slate-100" : "break-words text-sm font-bold text-slate-900"}>{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    return <ReadonlyArray copy={copy} isDarkTheme={isDarkTheme} value={value} />;
  }
  if (isRecord(value)) {
    return <ReadonlyObject copy={copy} isDarkTheme={isDarkTheme} value={value} />;
  }
  return <span className={isDarkTheme ? "break-words text-sm font-bold text-slate-100" : "break-words text-sm font-bold text-slate-900"}>{String(value)}</span>;
}

function ReadonlyArray({ copy, isDarkTheme, value }: { copy: WorkspaceCopy; isDarkTheme: boolean; value: unknown[] }) {
  const rendererCopy = copy.workspace.accountCenter.strategySchema;
  if (value.length === 0) {
    return <span className="text-xs font-bold text-slate-500">{rendererCopy.emptyList}</span>;
  }
  if (value.every(isScalarValue)) {
    return (
      <div className="flex flex-wrap gap-1.5 sm:justify-end">
        {value.map((item, index) => (
          <span key={`${index}-${String(item)}`} className={isDarkTheme ? "rounded-full bg-white/[0.055] px-2 py-1 text-xs font-black text-slate-300" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-700"}>{String(item)}</span>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2 text-left">
      {value.map((item, index) => (
        <div key={index} className={isDarkTheme ? "rounded-xl border border-white/[0.065] bg-white/[0.035] p-2" : "rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] p-2"}>
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{rendererCopy.itemLabel(index + 1)}</div>
          <ReadonlyValue copy={copy} isDarkTheme={isDarkTheme} value={item} />
        </div>
      ))}
    </div>
  );
}

function SignalSourceConfigGrid({
  copy,
  isDarkTheme,
  signalSourceIdentityById,
  value,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  signalSourceIdentityById?: SignalSourceIdentityById;
  value: unknown[];
}) {
  const rendererCopy = copy.workspace.accountCenter.strategySchema;
  const configs = value
    .filter(isRecord)
    .map((config) => createSignalSourceConfigViewModel(config, signalSourceIdentityById, rendererCopy));

  if (configs.length === 0) {
    return <div className="mt-2 text-xs font-bold text-slate-500">{rendererCopy.emptyList}</div>;
  }

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {configs.map((config, index) => (
        <div
          key={`${config.name}-${index}`}
          className={isDarkTheme
            ? "flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.04] px-3 py-3"
            : "flex min-w-0 items-center gap-3 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-3"}
        >
          <SourceAvatar isDarkTheme={isDarkTheme} name={config.name} url={config.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className={isDarkTheme ? "truncate text-sm font-black text-slate-100" : "truncate text-sm font-black text-slate-950"}>
              {config.name}
            </div>
          </div>
          <span className={isDarkTheme ? "shrink-0 rounded-full bg-sky-400/15 px-2.5 py-1 text-xs font-black text-sky-200" : "shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700"}>
            {config.ratio}
          </span>
        </div>
      ))}
    </div>
  );
}

function createSignalSourceConfigViewModel(
  config: JsonRecord,
  signalSourceIdentityById: SignalSourceIdentityById | undefined,
  rendererCopy: StrategySchemaCopy,
): { avatarUrl: string | null; name: string; ratio: string } {
  const signalSourceId = stringValue(config.signalSourceID ?? config.signalSourceId);
  const identity = signalSourceId ? signalSourceIdentityById?.get(signalSourceId) : undefined;
  const name = identity?.name
    || stringValue(config.signalSourceName ?? config.name)
    || rendererCopy.unknownSignalSource;
  return {
    avatarUrl: identity?.avatarUrl ?? (stringValue(config.avatarUrl) || null),
    name,
    ratio: formatPercentValue(numberValue(config.marginPercent ?? config.followRatioPercent ?? config.useAmountPercent), rendererCopy),
  };
}

function ReadonlyObject({ copy, isDarkTheme, value }: { copy: WorkspaceCopy; isDarkTheme: boolean; value: JsonRecord }) {
  const entries = Object.entries(value).filter(([, itemValue]) => hasReadableField(itemValue));
  if (entries.length === 0) {
    return <span className="text-xs font-bold text-slate-500">{copy.workspace.accountCenter.strategySchema.notSet}</span>;
  }
  return (
    <dl className="grid gap-1.5 text-left">
      {entries.map(([key, itemValue]) => (
        <div key={key} className={isDarkTheme ? "rounded-lg bg-white/[0.035] px-2 py-1.5" : "rounded-lg bg-slate-50 px-2 py-1.5"}>
          <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{labelForKey(copy.workspace.accountCenter.strategySchema, key)}</dt>
          <dd className="mt-1"><ReadonlyValue copy={copy} isDarkTheme={isDarkTheme} value={itemValue} /></dd>
        </div>
      ))}
    </dl>
  );
}

function createReadonlySections(
  schema: JsonRecord,
  uiSchema: JsonRecord | undefined,
  formData: JsonRecord,
  rendererCopy: StrategySchemaCopy,
): UiSection[] {
  const uiSections = Array.isArray(uiSchema?.sections) ? uiSchema.sections : null;
  if (uiSections) {
    return createSectionsFromUiSections(schema, uiSections, formData, rendererCopy);
  }

  const branchSections = createBranchReadonlySections(schema, uiSchema, formData, rendererCopy);
  if (branchSections.length > 0) {
    return branchSections;
  }

  const properties = isRecord(schema.properties) ? schema.properties : {};
  return [{
    fields: Object.entries(properties).map(([key, childSchema]) => ({
      description: isRecord(childSchema) && typeof childSchema.description === "string" ? childSchema.description : undefined,
      label: isRecord(childSchema) && typeof childSchema.title === "string" ? childSchema.title : labelForKey(rendererCopy, key),
      path: key,
      schema: isRecord(childSchema) ? childSchema : undefined,
      value: formData[key],
    })),
    title: typeof schema.title === "string" ? schema.title : rendererCopy.configurationFallbackTitle,
  }];
}

function createSectionsFromUiSections(
  schema: JsonRecord,
  uiSections: unknown[],
  formData: JsonRecord,
  rendererCopy: StrategySchemaCopy,
  titlePrefix = "",
): UiSection[] {
  return uiSections
    .filter(isUiSection)
    .sort(compareUiSections)
    .map((section, index) => {
      const sectionTitle = typeof section.title === "string" && section.title.trim()
        ? section.title
        : rendererCopy.sectionFallbackTitle(index + 1);
      return {
        description: typeof section.description === "string" ? section.description : undefined,
        fields: section.fields
          .filter(isUiField)
          .sort(compareUiFields)
          .map((field) => createReadonlyField(schema, field, formData, rendererCopy))
          .filter(isReadonlyField),
        title: titlePrefix ? `${titlePrefix} · ${sectionTitle}` : sectionTitle,
      };
    });
}

function createBranchReadonlySections(
  schema: JsonRecord,
  uiSchema: JsonRecord | undefined,
  formData: JsonRecord,
  rendererCopy: StrategySchemaCopy,
): UiSection[] {
  const properties = isRecord(schema.properties) ? schema.properties : {};
  const branchSections: UiSection[] = [];
  for (const [branchKey, branchSchema] of Object.entries(properties)) {
    if (!isRecord(branchSchema) || !isRecord(branchSchema.properties)) {
      continue;
    }
    const branchData = isRecord(formData[branchKey]) ? formData[branchKey] : {};
    const branchUiSchema = isRecord(uiSchema?.[branchKey]) ? uiSchema[branchKey] : undefined;
    const branchTitle = typeof branchSchema.title === "string" ? branchSchema.title : labelForKey(rendererCopy, branchKey);
    const branchUiSections = Array.isArray(branchUiSchema?.sections) ? branchUiSchema.sections : null;
    if (branchUiSections) {
      branchSections.push(...createSectionsFromUiSections(branchSchema, branchUiSections, branchData, rendererCopy, branchTitle));
      continue;
    }
    branchSections.push(...createSectionsFromObjectSchema(branchSchema, branchData, rendererCopy, branchTitle));
  }
  return branchSections;
}

function createSectionsFromObjectSchema(
  schema: JsonRecord,
  formData: JsonRecord,
  rendererCopy: StrategySchemaCopy,
  titlePrefix = "",
): UiSection[] {
  const properties = isRecord(schema.properties) ? schema.properties : {};
  const scalarFields: ReadonlyField[] = [];
  const sections: UiSection[] = [];

  for (const [key, childSchema] of Object.entries(properties)) {
    const childRecord = isRecord(childSchema) ? childSchema : undefined;
    const value = formData[key];
    if (childRecord && isRecord(childRecord.properties)) {
      const childFields = Object.entries(childRecord.properties).map(([fieldKey, fieldSchema]) => createSchemaField({
        key: fieldKey,
        rendererCopy,
        schema: fieldSchema,
        value: isRecord(value) ? value[fieldKey] : undefined,
      }));
      sections.push({
        description: typeof childRecord.description === "string" ? childRecord.description : undefined,
        fields: childFields,
        title: joinSectionTitle(titlePrefix, childRecord.title ?? labelForKey(rendererCopy, key)),
      });
      continue;
    }
    scalarFields.push(createSchemaField({ key, rendererCopy, schema: childSchema, value }));
  }

  if (scalarFields.length > 0) {
    sections.unshift({
      fields: scalarFields,
      title: titlePrefix || (typeof schema.title === "string" ? schema.title : rendererCopy.configurationFallbackTitle),
    });
  }

  return sections;
}

function createSchemaField({
  key,
  rendererCopy,
  schema,
  value,
}: {
  key: string;
  rendererCopy: StrategySchemaCopy;
  schema: unknown;
  value: unknown;
}): ReadonlyField {
  const schemaRecord = isRecord(schema) ? schema : undefined;
  return {
    description: typeof schemaRecord?.description === "string" ? schemaRecord.description : undefined,
    label: typeof schemaRecord?.title === "string" ? schemaRecord.title : labelForKey(rendererCopy, key),
    path: key,
    schema: schemaRecord,
    value,
  };
}

function createReadonlyField(schema: JsonRecord, field: UiField, formData: JsonRecord, rendererCopy: StrategySchemaCopy): ReadonlyField | null {
  if (field.visibleWhen && !evaluateCondition(field.visibleWhen, formData)) {
    return null;
  }
  const fieldSchema = schemaAtPath(schema, field.path);
  const fallbackKey = field.path.split(".").pop() ?? field.path;
  return {
    description: typeof field.help === "string" ? field.help : fieldSchema && typeof fieldSchema.description === "string" ? fieldSchema.description : undefined,
    label: typeof field.label === "string" ? field.label : fieldSchema && typeof fieldSchema.title === "string" ? fieldSchema.title : labelForKey(rendererCopy, fallbackKey),
    path: field.path,
    schema: fieldSchema ?? undefined,
    value: getValueAtPath(formData, field.path),
  };
}

function schemaAtPath(schema: JsonRecord, path: string): JsonRecord | null {
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

function getValueAtPath(data: JsonRecord, path: string): unknown {
  let current: unknown = data;
  for (const part of path.split(".").filter(Boolean)) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

function evaluateCondition(condition: UiCondition, formData: JsonRecord): boolean {
  if (!condition.path) return true;
  const value = getValueAtPath(formData, condition.path);
  if (Object.prototype.hasOwnProperty.call(condition, "eq")) return value === condition.eq;
  if (Object.prototype.hasOwnProperty.call(condition, "ne")) return value !== condition.ne;
  if (Array.isArray(condition.in)) return condition.in.some((item) => item === value);
  if (typeof condition.exists === "boolean") return hasReadableField(value) === condition.exists;
  return true;
}

function formatLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_.-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function labelForKey(rendererCopy: StrategySchemaCopy, key: string): string {
  const fieldLabels: Readonly<Record<string, string>> = rendererCopy.fieldLabels;
  return fieldLabels[key] ?? formatLabel(key);
}

function formatPercentValue(value: number | null, rendererCopy: StrategySchemaCopy): string {
  if (value === null) {
    return rendererCopy.notSet;
  }
  if (Number.isInteger(value)) {
    return `${value}%`;
  }
  return `${value.toFixed(2).replace(/\.?0+$/, "")}%`;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function joinSectionTitle(prefix: string, title: unknown): string {
  const normalizedTitle = typeof title === "string" && title.trim() ? title : "";
  if (!prefix) {
    return normalizedTitle;
  }
  return normalizedTitle ? `${prefix} · ${normalizedTitle}` : prefix;
}

function booleanPillClassName(isDarkTheme: boolean, value: boolean): string {
  if (value) {
    return isDarkTheme ? "rounded-full bg-emerald-400/15 px-2 py-1 text-xs font-black text-emerald-300" : "rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700";
  }
  return isDarkTheme ? "rounded-full bg-slate-700 px-2 py-1 text-xs font-black text-slate-300" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600";
}

function hasReadableField(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.values(value).some(hasReadableField);
  return true;
}

function isScalarValue(value: unknown): boolean {
  return ["boolean", "number", "string"].includes(typeof value);
}

function isUiSection(value: unknown): value is JsonRecord & { fields: unknown[]; order?: number; title?: string; description?: string } {
  return isRecord(value) && Array.isArray(value.fields);
}

function isUiField(value: unknown): value is UiField {
  return isRecord(value) && typeof value.path === "string";
}

function isReadonlyField(value: ReadonlyField | null): value is ReadonlyField {
  return value !== null;
}

function compareUiSections(left: JsonRecord, right: JsonRecord): number {
  const leftOrder = typeof left.order === "number" ? left.order : Number.MAX_SAFE_INTEGER;
  const rightOrder = typeof right.order === "number" ? right.order : Number.MAX_SAFE_INTEGER;
  return leftOrder - rightOrder;
}

function compareUiFields(left: UiField, right: UiField): number {
  const leftOrder = typeof left.order === "number" ? left.order : Number.MAX_SAFE_INTEGER;
  const rightOrder = typeof right.order === "number" ? right.order : Number.MAX_SAFE_INTEGER;
  return leftOrder - rightOrder || left.path.localeCompare(right.path);
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
