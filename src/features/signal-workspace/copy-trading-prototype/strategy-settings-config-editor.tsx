"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TradingFoxStrategyDefinition } from "@/lib/tradingfox-control-plane";
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
  hiddenStrategyPaths = [],
  isDarkTheme,
  strategyControls,
  signalSourceIdentityById,
  onBranchChange,
  onRendererStateChange,
}: {
  config: JsonRecord;
  configSchemaVersion: number;
  copy: WorkspaceCopy;
  definition: TradingFoxStrategyDefinition | null;
  definitionError: string;
  hiddenStrategyPaths?: readonly string[];
  isDarkTheme: boolean;
  strategyControls?: ReactNode;
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
        {strategyControls ? <div className="mb-3">{strategyControls}</div> : null}
        <StrategySchemaRenderer
          copy={copy}
          formData={recordBranch(config, "strategy")}
          hiddenPaths={hiddenStrategyPaths}
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
    <Card className={getSettingsConfigSectionClassName(isDarkTheme)}>
      <CardHeader className="px-0 py-0">
        <CardTitle className="text-sm font-black">{title}</CardTitle>
        <CardDescription className={isDarkTheme ? "text-xs leading-5 text-slate-400" : "text-xs leading-5 text-slate-600"}>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0 pt-3">{children}</CardContent>
    </Card>
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
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={getSettingsConfigSectionClassName(isDarkTheme)}>
        <CollapsibleTrigger className="w-full text-left">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-black">{title}</CardTitle>
            <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>{description}</p>
          </div>
          <span className={isDarkTheme ? "text-xs font-black text-slate-500" : "text-xs font-black text-slate-400"}>{isOpen ? "⌃" : "⌄"}</span>
        </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">{children}</CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function getSettingsConfigSectionClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "gap-0 rounded-2xl border-white/[0.075] bg-white/[0.035] p-3 text-slate-100 shadow-none"
    : "gap-0 rounded-2xl border-[#E5EAF0] bg-[#F8FAFC] p-3 text-slate-950 shadow-none";
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
