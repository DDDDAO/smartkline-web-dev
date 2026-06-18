"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { TradingFoxStrategyDefinition } from "@/app/_lib/tradingfox-control-plane";
import type { SignalSourceIdentityById } from "./strategy-detail-shared";
import { StrategySchemaRenderer, type StrategySchemaRendererState } from "./strategy-schema-renderer";
import { getInlineErrorClassName } from "./styles";

type JsonRecord = Record<string, unknown>;

export function StrategySettingsConfigEditor({
  config,
  configSchemaVersion,
  copy,
  definition,
  definitionError,
  isDarkTheme,
  signalSourceIdentityById,
  onBranchChange,
  onRendererStateChange,
}: {
  config: JsonRecord;
  configSchemaVersion: number;
  copy: WorkspaceCopy;
  definition: TradingFoxStrategyDefinition | null;
  definitionError: string;
  isDarkTheme: boolean;
  signalSourceIdentityById?: SignalSourceIdentityById;
  onBranchChange: (branch: "common" | "strategy", nextBranchConfig: JsonRecord) => void;
  onRendererStateChange: (state: StrategySchemaRendererState) => void;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const strategyCopy = accountCopy.strategy;
  const strategyCreateCopy = accountCopy.strategyCreate;
  const [commonErrors, setCommonErrors] = useState<string[]>([]);
  const [strategyErrors, setStrategyErrors] = useState<string[]>([]);
  const versionMismatch = definition && configSchemaVersion !== definition.configSchemaVersion
    ? strategyCopy.strategyConfigVersionMismatch(configSchemaVersion, definition.configSchemaVersion)
    : "";
  const commonSchema = schemaBranch(definition?.configSchema, "common");
  const strategySchema = definition?.strategyConfigSchema ?? schemaBranch(definition?.configSchema, "strategy");
  const commonUiSchema = uiSchemaBranch(definition?.uiSchema, "common");
  const strategyUiSchema = definition?.strategyUiSchema ?? uiSchemaBranch(definition?.uiSchema, "strategy");

  useEffect(() => {
    const errors = [
      ...commonErrors,
      ...strategyErrors,
      ...(definitionError ? [definitionError] : []),
      ...(versionMismatch ? [versionMismatch] : []),
    ];
    onRendererStateChange({ canSubmit: Boolean(definition) && errors.length === 0, errors });
  }, [commonErrors, definition, definitionError, onRendererStateChange, strategyErrors, versionMismatch]);

  if (definitionError) {
    return <p className={getInlineErrorClassName(isDarkTheme)}>{definitionError}</p>;
  }

  if (!definition) {
    return <div className={isDarkTheme ? "text-sm text-slate-500" : "text-sm text-slate-500"}>{strategyCopy.loadingDetail}</div>;
  }

  return (
    <div className="space-y-3">
      {versionMismatch ? <p className={getInlineErrorClassName(isDarkTheme)}>{versionMismatch}</p> : null}
      <SettingsConfigSection
        description={strategyCreateCopy.genericConfigDescription}
        isDarkTheme={isDarkTheme}
        title={strategyCreateCopy.genericConfigTitle}
      >
        <StrategySchemaRenderer
          copy={copy}
          formData={recordBranch(config, "strategy")}
          isDarkTheme={isDarkTheme}
          mode="edit"
          schema={strategySchema}
          signalSourceIdentityById={signalSourceIdentityById}
          uiSchema={strategyUiSchema}
          onChange={(nextConfig) => onBranchChange("strategy", nextConfig)}
          onValidationStateChange={(state) => setStrategyErrors(state.errors)}
        />
      </SettingsConfigSection>

      <SettingsConfigDisclosure
        description={strategyCreateCopy.commonConfigDescription}
        isDarkTheme={isDarkTheme}
        title={strategyCopy.advancedCommonConfigTitle}
      >
        <StrategySchemaRenderer
          copy={copy}
          formData={recordBranch(config, "common")}
          isDarkTheme={isDarkTheme}
          mode="edit"
          schema={commonSchema}
          signalSourceIdentityById={signalSourceIdentityById}
          uiSchema={commonUiSchema}
          onChange={(nextConfig) => onBranchChange("common", nextConfig)}
          onValidationStateChange={(state) => setCommonErrors(state.errors)}
        />
      </SettingsConfigDisclosure>
    </div>
  );
}

function SettingsConfigSection({
  children,
  description,
  isDarkTheme,
  title,
}: {
  children: ReactNode;
  description: string;
  isDarkTheme: boolean;
  title: string;
}) {
  return (
    <section className={getSettingsConfigSectionClassName(isDarkTheme)}>
      <h3 className="text-sm font-black">{title}</h3>
      <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>{description}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SettingsConfigDisclosure({
  children,
  description,
  isDarkTheme,
  title,
}: {
  children: ReactNode;
  description: string;
  isDarkTheme: boolean;
  title: string;
}) {
  return (
    <details className={getSettingsConfigSectionClassName(isDarkTheme)}>
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black">{title}</h3>
            <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>{description}</p>
          </div>
          <span className={isDarkTheme ? "text-xs font-black text-slate-500" : "text-xs font-black text-slate-400"}>⌄</span>
        </div>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function getSettingsConfigSectionClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3"
    : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3";
}

function schemaBranch(schema: JsonRecord | undefined, branch: "common" | "strategy"): JsonRecord | undefined {
  const properties = isRecord(schema?.properties) ? schema.properties : null;
  return properties && isRecord(properties[branch]) ? properties[branch] : undefined;
}

function uiSchemaBranch(uiSchema: JsonRecord | undefined, branch: "common" | "strategy"): JsonRecord | undefined {
  return isRecord(uiSchema?.[branch]) ? uiSchema[branch] : undefined;
}

function recordBranch(config: JsonRecord, branch: "common" | "strategy"): JsonRecord {
  return isRecord(config[branch]) ? config[branch] : {};
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
