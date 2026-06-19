"use client";

import type { WorkspaceCopy, WorkspaceLanguage } from "@/i18n/workspace";
import { SourceAvatar } from "../card-ui";
import { propertySchemaForKey, schemaDisplayLabel, schemaOptionLabel } from "./strategy-display-metadata";
import type { SignalSourceIdentityById } from "./strategy-detail-shared";
import { createReadonlySections, createVisibleReadonlySections } from "./strategy-schema-readonly-sections";
import {
  booleanPillClassName,
  formatPercentValue,
  hasReadableField,
  isRecord,
  isScalarValue,
  labelForKey,
  numberValue,
  stringValue,
  type JsonRecord,
  type ReadonlyField,
  type StrategySchemaCopy,
} from "./strategy-schema-readonly-helpers";

export function StrategySchemaReadonlyView({
  copy,
  formData,
  isDarkTheme,
  language,
  schema,
  signalSourceIdentityById,
  uiSchema,
}: {
  copy: WorkspaceCopy;
  formData: JsonRecord;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  schema: JsonRecord;
  signalSourceIdentityById?: SignalSourceIdentityById;
  uiSchema?: JsonRecord;
}) {
  const rendererCopy = copy.workspace.accountCenter.strategySchema;
  const sections = createReadonlySections(schema, uiSchema, formData, rendererCopy, language);
  const visibleSections = createVisibleReadonlySections(sections);

  if (visibleSections.length === 0) {
    return (
      <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-sm font-bold text-slate-400" : "rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 py-3 text-sm font-bold text-slate-600"}>
        {rendererCopy.noAdditionalConfig}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleSections.map((section) => (
        <section key={section.title} className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3" : "rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] p-3"}>
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
                language={language}
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
  language,
  signalSourceIdentityById,
}: {
  copy: WorkspaceCopy;
  field: ReadonlyField;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  signalSourceIdentityById?: SignalSourceIdentityById;
}) {
  if (field.path.split(".").pop() === "signalSourceConfigs" && Array.isArray(field.value)) {
    return (
      <div className={isDarkTheme ? "rounded-xl border border-white/[0.065] bg-[#0F131A]/70 px-3 py-3" : "rounded-xl border border-[#E8E8EC] bg-white px-3 py-3"}>
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
    <div className={isDarkTheme ? "rounded-xl border border-white/[0.065] bg-[#0F131A]/70 px-3 py-2" : "rounded-xl border border-[#E8E8EC] bg-white px-3 py-2"}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 sm:max-w-[42%]">
          <div className={isDarkTheme ? "text-xs font-black text-slate-200" : "text-xs font-black text-slate-800"}>{field.label}</div>
          {field.description ? <div className={isDarkTheme ? "mt-1 text-[11px] leading-4 text-slate-500" : "mt-1 text-[11px] leading-4 text-slate-500"}>{field.description}</div> : null}
        </div>
        <div className="min-w-0 flex-1 sm:text-right">
          <ReadonlyValue copy={copy} isDarkTheme={isDarkTheme} language={language} schema={field.schema} value={field.value} />
        </div>
      </div>
    </div>
  );
}

function ReadonlyValue({
  copy,
  isDarkTheme,
  language,
  schema,
  value,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  schema?: JsonRecord;
  value: unknown;
}) {
  const rendererCopy = copy.workspace.accountCenter.strategySchema;
  if (!hasReadableField(value)) {
    return <span className="text-xs font-bold text-slate-500">{rendererCopy.notSet}</span>;
  }
  const optionLabel = schemaOptionLabel(schema, value, language);
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
    return <ReadonlyArray copy={copy} isDarkTheme={isDarkTheme} language={language} schema={schema} value={value} />;
  }
  if (isRecord(value)) {
    return <ReadonlyObject copy={copy} isDarkTheme={isDarkTheme} language={language} schema={schema} value={value} />;
  }
  return <span className={isDarkTheme ? "break-words text-sm font-bold text-slate-100" : "break-words text-sm font-bold text-slate-900"}>{String(value)}</span>;
}

function ReadonlyArray({
  copy,
  isDarkTheme,
  language,
  schema,
  value,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  schema?: JsonRecord;
  value: unknown[];
}) {
  const rendererCopy = copy.workspace.accountCenter.strategySchema;
  const itemSchema = isRecord(schema?.items) ? schema.items : undefined;
  if (value.length === 0) {
    return <span className="text-xs font-bold text-slate-500">{rendererCopy.emptyList}</span>;
  }
  if (value.every(isScalarValue)) {
    const entries = createReadonlyArrayEntries(value);
    return (
      <div className="flex flex-wrap gap-1.5 sm:justify-end">
        {entries.map(({ item, key }) => {
          const label = schemaOptionLabel(itemSchema, item, language) ?? String(item);
          return (
            <span key={key} className={isDarkTheme ? "rounded-full bg-white/[0.055] px-2 py-1 text-xs font-black text-slate-300" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-700"}>{label}</span>
          );
        })}
      </div>
    );
  }
  const entries = createReadonlyArrayEntries(value);
  return (
    <div className="space-y-2 text-left">
      {entries.map(({ item, key, ordinal }) => (
        <div key={key} className={isDarkTheme ? "rounded-xl border border-white/[0.065] bg-white/[0.035] p-2" : "rounded-xl border border-[#E8E8EC] bg-[#FAFAFA] p-2"}>
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{rendererCopy.itemLabel(ordinal)}</div>
          <ReadonlyValue copy={copy} isDarkTheme={isDarkTheme} language={language} schema={itemSchema} value={item} />
        </div>
      ))}
    </div>
  );
}

function createReadonlyArrayEntries(value: readonly unknown[]): Array<{ item: unknown; key: string; ordinal: number }> {
  const seenCounts = new Map<string, number>();
  return value.map((item, position) => {
    const stableKey = createReadonlyArrayItemKey(item);
    const occurrence = seenCounts.get(stableKey) ?? 0;
    seenCounts.set(stableKey, occurrence + 1);
    return {
      item,
      key: `${stableKey}:${occurrence}`,
      ordinal: position + 1,
    };
  });
}

function createReadonlyArrayItemKey(item: unknown): string {
  if (isScalarValue(item)) {
    return `${typeof item}:${String(item)}`;
  }

  return JSON.stringify(item);
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
  const configs = value.flatMap((config) => (
    isRecord(config) ? [createSignalSourceConfigViewModel(config, signalSourceIdentityById, rendererCopy)] : []
  ));

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
            : "flex min-w-0 items-center gap-3 rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 py-3"}
        >
          <SourceAvatar isDarkTheme={isDarkTheme} name={config.name} url={config.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className={isDarkTheme ? "truncate text-sm font-black text-slate-100" : "truncate text-sm font-black text-slate-950"}>
              {config.name}
            </div>
          </div>
          <span className={isDarkTheme ? "shrink-0 rounded-full bg-indigo-400/15 px-2.5 py-1 text-xs font-black text-indigo-200" : "shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700"}>
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
  language,
  schema,
  value,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
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
        const label = schemaDisplayLabel(propertySchema, language, labelForKey(copy.workspace.accountCenter.strategySchema, key));
        return (
          <div key={key} className={isDarkTheme ? "rounded-lg bg-white/[0.035] px-2 py-1.5" : "rounded-lg bg-slate-50 px-2 py-1.5"}>
            <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</dt>
            <dd className="mt-1"><ReadonlyValue copy={copy} isDarkTheme={isDarkTheme} language={language} schema={propertySchema} value={itemValue} /></dd>
          </div>
        );
      })}
    </dl>
  );
}
