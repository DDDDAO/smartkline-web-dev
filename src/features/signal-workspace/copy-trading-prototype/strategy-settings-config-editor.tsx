"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TradingFoxStrategyDefinition } from "@/lib/tradingfox-control-plane";
import type { SignalSourceIdentityById } from "./strategy-detail-shared";
import { createDefinitionConfigSchema, createDefinitionConfigUiSchema } from "./strategy-definition-schema";
import { StrategySchemaRenderer, type StrategySchemaRendererState } from "./strategy-schema-renderer";
import { getInlineErrorClassName } from "./styles";

type JsonRecord = Record<string, unknown>;

export function StrategySettingsConfigEditor({
  config,
  configSchemaVersion,
  copy,
  definition,
  definitionError,
  hiddenPaths = [],
  isDarkTheme,
  strategyControls,
  signalSourceIdentityById,
  onConfigChange,
  onRendererStateChange,
}: {
  config: JsonRecord;
  configSchemaVersion: number;
  copy: WorkspaceCopy;
  definition: TradingFoxStrategyDefinition | null;
  definitionError: string;
  hiddenPaths?: readonly string[];
  isDarkTheme: boolean;
  strategyControls?: ReactNode;
  signalSourceIdentityById?: SignalSourceIdentityById;
  onConfigChange: (nextConfig: JsonRecord) => void;
  onRendererStateChange: (state: StrategySchemaRendererState) => void;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const strategyCopy = accountCopy.strategy;
  const strategyCreateCopy = accountCopy.strategyCreate;
  const [rendererErrors, setRendererErrors] = useState<string[]>([]);
  const versionMismatch = definition && configSchemaVersion !== definition.configSchemaVersion
    ? strategyCopy.strategyConfigVersionMismatch(configSchemaVersion, definition.configSchemaVersion)
    : "";
  const schema = definition ? createDefinitionConfigSchema(definition) : undefined;
  const uiSchema = definition ? createDefinitionConfigUiSchema(definition) : undefined;

  useEffect(() => {
    const errors = [
      ...rendererErrors,
      ...(definitionError ? [definitionError] : []),
      ...(versionMismatch ? [versionMismatch] : []),
    ];
    onRendererStateChange({ canSubmit: Boolean(definition) && errors.length === 0, errors });
  }, [definition, definitionError, onRendererStateChange, rendererErrors, versionMismatch]);

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
          formData={config}
          hiddenPaths={hiddenPaths}
          isDarkTheme={isDarkTheme}
          mode="edit"
          schema={schema}
          signalSourceIdentityById={signalSourceIdentityById}
          uiSchema={uiSchema}
          onChange={onConfigChange}
          onValidationStateChange={(state) => setRendererErrors(state.errors)}
        />
      </SettingsConfigSection>
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

function getSettingsConfigSectionClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "gap-0 rounded-2xl border-white/[0.075] bg-white/[0.035] p-3 text-slate-100 shadow-none"
    : "gap-0 rounded-2xl border-[#E8E8EC] bg-[#FAFAFA] p-3 text-slate-950 shadow-none";
}
