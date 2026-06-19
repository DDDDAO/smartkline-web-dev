"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { TradingFoxStrategyDefinition } from "@/lib/tradingfox-control-plane";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { StrategySchemaRenderer, type StrategySchemaRendererState } from "./strategy-schema-renderer";

export type JsonRecord = Record<string, unknown>;

export function DefinitionDrivenConfigForm({
  config,
  copy,
  definition,
  isDarkTheme,
  onBranchChange,
  onRendererStateChange,
}: {
  config: JsonRecord;
  copy: WorkspaceCopy;
  definition: TradingFoxStrategyDefinition;
  isDarkTheme: boolean;
  onBranchChange: (branch: "common" | "strategy", nextBranchConfig: JsonRecord) => void;
  onRendererStateChange: (state: StrategySchemaRendererState) => void;
}) {
  const strategyCreateCopy = copy.workspace.accountCenter.strategyCreate;
  const [commonErrors, setCommonErrors] = useState<string[]>([]);
  const [strategyErrors, setStrategyErrors] = useState<string[]>([]);
  const commonSchema = schemaBranch(definition.configSchema, "common");
  const strategySchema = definition.strategyConfigSchema ?? schemaBranch(definition.configSchema, "strategy");
  const commonUiSchema = uiSchemaBranch(definition.uiSchema, "common");
  const strategyUiSchema = definition.strategyUiSchema ?? uiSchemaBranch(definition.uiSchema, "strategy");
  const commonConfig = recordBranch(config, "common");
  const strategyConfig = recordBranch(config, "strategy");

  useEffect(() => {
    const errors = [...commonErrors, ...strategyErrors];
    onRendererStateChange({ canSubmit: errors.length === 0, errors });
  }, [commonErrors, onRendererStateChange, strategyErrors]);

  return (
    <div className="space-y-4">
      <ConfigSection
        description={strategyCreateCopy.commonConfigDescription}
        isDarkTheme={isDarkTheme}
        title={strategyCreateCopy.commonConfigTitle}
      >
        <StrategySchemaRenderer
          copy={copy}
          formData={commonConfig}
          isDarkTheme={isDarkTheme}
          mode="create"
          schema={commonSchema}
          uiSchema={commonUiSchema}
          onChange={(nextConfig) => onBranchChange("common", nextConfig)}
          onValidationStateChange={(state) => setCommonErrors(state.errors)}
        />
      </ConfigSection>

      <ConfigSection
        description={strategyCreateCopy.genericConfigDescription}
        isDarkTheme={isDarkTheme}
        title={strategyCreateCopy.genericConfigTitle}
      >
        <StrategySchemaRenderer
          copy={copy}
          formData={strategyConfig}
          isDarkTheme={isDarkTheme}
          mode="create"
          schema={strategySchema}
          uiSchema={strategyUiSchema}
          onChange={(nextConfig) => onBranchChange("strategy", nextConfig)}
          onValidationStateChange={(state) => setStrategyErrors(state.errors)}
        />
      </ConfigSection>
    </div>
  );
}

function ConfigSection({
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
    <section className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3" : "rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] p-3"}>
      <h3 className="text-sm font-black">{title}</h3>
      <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>{description}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function schemaBranch(schema: JsonRecord | undefined, branch: "common" | "strategy"): JsonRecord | undefined {
  const properties = isRecord(schema?.properties) ? schema.properties : null;
  const branchSchema = properties && isRecord(properties[branch]) ? properties[branch] : undefined;
  return branchSchema;
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
