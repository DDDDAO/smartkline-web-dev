"use client";

import type { WorkspaceCopy } from "@/app/_lib/i18n";
import { SourceAvatar } from "../card-ui";
import {
  hasSchemaDisplayDescription,
  hasSchemaDisplayLabel,
  propertySchemaForKey,
  schemaAtPath,
  schemaDisplayDescription,
  schemaDisplayLabel,
  schemaOptionLabel,
} from "./strategy-display-metadata";
import type { SignalSourceIdentityById } from "./strategy-detail-shared";
import {
  booleanPillClassName,
  compareUiFields,
  compareUiSections,
  formatPercentValue,
  hasReadableField,
  isReadonlyField,
  isRecord,
  isScalarValue,
  isUiField,
  isUiSection,
  joinSectionTitle,
  labelForKey,
  numberValue,
  stringValue,
  type JsonRecord,
  type ReadonlyField,
  type StrategySchemaCopy,
  type UiCondition,
  type UiField,
  type UiSection,
} from "./strategy-schema-readonly-helpers";

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
  const sections = createReadonlySections(schema, uiSchema, formData, rendererCopy, copy);
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
          <ReadonlyValue copy={copy} isDarkTheme={isDarkTheme} schema={field.schema} value={field.value} />
        </div>
      </div>
    </div>
  );
}

function ReadonlyValue({
  copy,
  isDarkTheme,
  schema,
  value,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  schema?: JsonRecord;
  value: unknown;
}) {
  const rendererCopy = copy.workspace.accountCenter.strategySchema;
  if (!hasReadableField(value)) {
    return <span className="text-xs font-bold text-slate-500">{rendererCopy.notSet}</span>;
  }
  const optionLabel = schemaOptionLabel(schema, value, copy);
  if (optionLabel) {
    return <span className={isDarkTheme ? "break-words text-sm font-bold text-slate-100" : "break-words text-sm font-bold text-slate-900"}>{optionLabel}</span>;
  }
  if (typeof value === "boolean") {
    return <span className={booleanPillClassName(isDarkTheme, value)}>{value ? rendererCopy.booleanYes : rendererCopy.booleanNo}</span>;
  }
  if (typeof value === "number" || typeof value === "string") {
    return <span className={isDarkTheme ? "break-words text-sm font-bold text-slate-100" : "break-words text-sm font-bold text-slate-900"}>{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    return <ReadonlyArray copy={copy} isDarkTheme={isDarkTheme} schema={schema} value={value} />;
  }
  if (isRecord(value)) {
    return <ReadonlyObject copy={copy} isDarkTheme={isDarkTheme} schema={schema} value={value} />;
  }
  return <span className={isDarkTheme ? "break-words text-sm font-bold text-slate-100" : "break-words text-sm font-bold text-slate-900"}>{String(value)}</span>;
}

function ReadonlyArray({
  copy,
  isDarkTheme,
  schema,
  value,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  schema?: JsonRecord;
  value: unknown[];
}) {
  const rendererCopy = copy.workspace.accountCenter.strategySchema;
  const itemSchema = isRecord(schema?.items) ? schema.items : undefined;
  if (value.length === 0) {
    return <span className="text-xs font-bold text-slate-500">{rendererCopy.emptyList}</span>;
  }
  if (value.every(isScalarValue)) {
    return (
      <div className="flex flex-wrap gap-1.5 sm:justify-end">
        {value.map((item, index) => {
          const label = schemaOptionLabel(itemSchema, item, copy) ?? String(item);
          return (
            <span key={`${index}-${String(item)}`} className={isDarkTheme ? "rounded-full bg-white/[0.055] px-2 py-1 text-xs font-black text-slate-300" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-700"}>{label}</span>
          );
        })}
      </div>
    );
  }
  return (
    <div className="space-y-2 text-left">
      {value.map((item, index) => (
        <div key={index} className={isDarkTheme ? "rounded-xl border border-white/[0.065] bg-white/[0.035] p-2" : "rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] p-2"}>
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{rendererCopy.itemLabel(index + 1)}</div>
          <ReadonlyValue copy={copy} isDarkTheme={isDarkTheme} schema={itemSchema} value={item} />
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

function ReadonlyObject({
  copy,
  isDarkTheme,
  schema,
  value,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  schema?: JsonRecord;
  value: JsonRecord;
}) {
  const entries = Object.entries(value).filter(([, itemValue]) => hasReadableField(itemValue));
  if (entries.length === 0) {
    return <span className="text-xs font-bold text-slate-500">{copy.workspace.accountCenter.strategySchema.notSet}</span>;
  }
  return (
    <dl className="grid gap-1.5 text-left">
      {entries.map(([key, itemValue]) => {
        const propertySchema = propertySchemaForKey(schema, key);
        const label = schemaDisplayLabel(propertySchema, copy, labelForKey(copy.workspace.accountCenter.strategySchema, key));
        return (
          <div key={key} className={isDarkTheme ? "rounded-lg bg-white/[0.035] px-2 py-1.5" : "rounded-lg bg-slate-50 px-2 py-1.5"}>
            <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</dt>
            <dd className="mt-1"><ReadonlyValue copy={copy} isDarkTheme={isDarkTheme} schema={propertySchema} value={itemValue} /></dd>
          </div>
        );
      })}
    </dl>
  );
}

function createReadonlySections(
  schema: JsonRecord,
  uiSchema: JsonRecord | undefined,
  formData: JsonRecord,
  rendererCopy: StrategySchemaCopy,
  copy: WorkspaceCopy,
): UiSection[] {
  const uiSections = Array.isArray(uiSchema?.sections) ? uiSchema.sections : null;
  if (uiSections) {
    return createSectionsFromUiSections(schema, uiSections, formData, rendererCopy, copy);
  }

  const branchSections = createBranchReadonlySections(schema, uiSchema, formData, rendererCopy, copy);
  if (branchSections.length > 0) {
    return branchSections;
  }

  const properties = isRecord(schema.properties) ? schema.properties : {};
  return [{
    fields: Object.entries(properties).map(([key, childSchema]) => ({
      description: schemaDisplayDescription(childSchema, copy),
      label: schemaDisplayLabel(childSchema, copy, labelForKey(rendererCopy, key)),
      path: key,
      schema: isRecord(childSchema) ? childSchema : undefined,
      value: formData[key],
    })),
    title: schemaDisplayLabel(schema, copy, rendererCopy.configurationFallbackTitle),
  }];
}

function createSectionsFromUiSections(
  schema: JsonRecord,
  uiSections: unknown[],
  formData: JsonRecord,
  rendererCopy: StrategySchemaCopy,
  copy: WorkspaceCopy,
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
          .map((field) => createReadonlyField(schema, field, formData, rendererCopy, copy))
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
  copy: WorkspaceCopy,
): UiSection[] {
  const properties = isRecord(schema.properties) ? schema.properties : {};
  const branchSections: UiSection[] = [];
  for (const [branchKey, branchSchema] of Object.entries(properties)) {
    if (!isRecord(branchSchema) || !isRecord(branchSchema.properties)) {
      continue;
    }
    const branchData = isRecord(formData[branchKey]) ? formData[branchKey] : {};
    const branchUiSchema = isRecord(uiSchema?.[branchKey]) ? uiSchema[branchKey] : undefined;
    const branchTitle = schemaDisplayLabel(branchSchema, copy, labelForKey(rendererCopy, branchKey));
    const branchUiSections = Array.isArray(branchUiSchema?.sections) ? branchUiSchema.sections : null;
    if (branchUiSections) {
      branchSections.push(...createSectionsFromUiSections(branchSchema, branchUiSections, branchData, rendererCopy, copy, branchTitle));
      continue;
    }
    branchSections.push(...createSectionsFromObjectSchema(branchSchema, branchData, rendererCopy, copy, branchTitle));
  }
  return branchSections;
}

function createSectionsFromObjectSchema(
  schema: JsonRecord,
  formData: JsonRecord,
  rendererCopy: StrategySchemaCopy,
  copy: WorkspaceCopy,
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
        copy,
        rendererCopy,
        schema: fieldSchema,
        value: isRecord(value) ? value[fieldKey] : undefined,
      }));
      sections.push({
        description: schemaDisplayDescription(childRecord, copy),
        fields: childFields,
        title: joinSectionTitle(titlePrefix, schemaDisplayLabel(childRecord, copy, labelForKey(rendererCopy, key))),
      });
      continue;
    }
    scalarFields.push(createSchemaField({ copy, key, rendererCopy, schema: childSchema, value }));
  }

  if (scalarFields.length > 0) {
    sections.unshift({
      fields: scalarFields,
      title: titlePrefix || schemaDisplayLabel(schema, copy, rendererCopy.configurationFallbackTitle),
    });
  }

  return sections;
}

function createSchemaField({
  copy,
  key,
  rendererCopy,
  schema,
  value,
}: {
  copy: WorkspaceCopy;
  key: string;
  rendererCopy: StrategySchemaCopy;
  schema: unknown;
  value: unknown;
}): ReadonlyField {
  const schemaRecord = isRecord(schema) ? schema : undefined;
  return {
    description: schemaDisplayDescription(schemaRecord, copy),
    label: schemaDisplayLabel(schemaRecord, copy, labelForKey(rendererCopy, key)),
    path: key,
    schema: schemaRecord,
    value,
  };
}

function createReadonlyField(
  schema: JsonRecord,
  field: UiField,
  formData: JsonRecord,
  rendererCopy: StrategySchemaCopy,
  copy: WorkspaceCopy,
): ReadonlyField | null {
  if (field.visibleWhen && !evaluateCondition(field.visibleWhen, formData)) {
    return null;
  }
  const fieldSchema = schemaAtPath(schema, field.path);
  const fallbackKey = field.path.split(".").pop() ?? field.path;
  return {
    description: fieldSchema && hasSchemaDisplayDescription(fieldSchema) ? schemaDisplayDescription(fieldSchema, copy) : typeof field.help === "string" ? field.help : schemaDisplayDescription(fieldSchema, copy),
    label: fieldSchema && hasSchemaDisplayLabel(fieldSchema) ? schemaDisplayLabel(fieldSchema, copy, labelForKey(rendererCopy, fallbackKey)) : typeof field.label === "string" ? field.label : schemaDisplayLabel(fieldSchema, copy, labelForKey(rendererCopy, fallbackKey)),
    path: field.path,
    schema: fieldSchema ?? undefined,
    value: getValueAtPath(formData, field.path),
  };
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
