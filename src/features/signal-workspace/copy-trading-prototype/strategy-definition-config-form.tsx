"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { TradingFoxStrategyDefinition } from "@/lib/tradingfox-control-plane";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { createDefinitionConfigSchema, createDefinitionConfigUiSchema } from "./strategy-definition-schema";
import { StrategySchemaRenderer, type StrategySchemaRendererState } from "./strategy-schema-renderer";

export type JsonRecord = Record<string, unknown>;

export function DefinitionDrivenConfigForm({
  config,
  copy,
  definition,
  isDarkTheme,
  onConfigChange,
  onRendererStateChange,
}: {
  config: JsonRecord;
  copy: WorkspaceCopy;
  definition: TradingFoxStrategyDefinition;
  isDarkTheme: boolean;
  onConfigChange: (nextConfig: JsonRecord) => void;
  onRendererStateChange: (state: StrategySchemaRendererState) => void;
}) {
  const strategyCreateCopy = copy.workspace.accountCenter.strategyCreate;
  const [rendererErrors, setRendererErrors] = useState<string[]>([]);
  const schema = createDefinitionConfigSchema(definition);
  const uiSchema = createDefinitionConfigUiSchema(definition);

  useEffect(() => {
    onRendererStateChange({ canSubmit: rendererErrors.length === 0, errors: rendererErrors });
  }, [onRendererStateChange, rendererErrors]);

  return (
    <div className="space-y-4">
      <ConfigSection
        description={strategyCreateCopy.genericConfigDescription}
        isDarkTheme={isDarkTheme}
        title={strategyCreateCopy.genericConfigTitle}
      >
        <StrategySchemaRenderer
          copy={copy}
          formData={config}
          isDarkTheme={isDarkTheme}
          mode="create"
          schema={schema}
          uiSchema={uiSchema}
          onChange={onConfigChange}
          onValidationStateChange={(state) => setRendererErrors(state.errors)}
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
