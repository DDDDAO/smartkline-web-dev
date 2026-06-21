"use client";

import { Button } from "@/components/ui/button";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TradingFoxStrategyDefinition } from "@/lib/tradingfox-control-plane";
import { CopyTradingSignalSourceConfigEditor } from "./copy-trading-signal-source-config-editor";
import { CopyTradingSltpConfigEditor } from "./copy-trading-sltp-config-editor";
import type { CopyTradingSignalSourceConfigRow } from "./copy-trading-signal-source-config";
import { PercentInput } from "./prototype-form-fields";
import { DefinitionDrivenConfigForm } from "./strategy-definition-config-form";
import type { StrategySchemaRendererState } from "./strategy-schema-renderer";
import type { CopyTradingPrototypeTarget } from "./types";

type JsonRecord = Record<string, unknown>;

export function CopyTradingCreateBody({
  accountCopy,
  advancedSourcesEnabled,
  advancedConfig,
  advancedConfigHiddenPaths,
  availableSignalSources,
  copy,
  definition,
  isDarkTheme,
  signalSourceErrors,
  signalSourceRows,
  stopLossPercent,
  takeProfitPercent,
  onAdvancedConfigChange,
  onAdvancedConfigRendererStateChange,
  onAdvancedSourcesEnabledChange,
  onSignalSourceRowsChange,
  onStopLossPercentChange,
  onTakeProfitPercentChange,
}: {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  advancedSourcesEnabled: boolean;
  advancedConfig: JsonRecord;
  advancedConfigHiddenPaths: readonly string[];
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  copy: WorkspaceCopy;
  definition: TradingFoxStrategyDefinition;
  isDarkTheme: boolean;
  signalSourceErrors: readonly string[];
  signalSourceRows: readonly CopyTradingSignalSourceConfigRow[];
  stopLossPercent: string;
  takeProfitPercent: string;
  onAdvancedConfigChange: (nextConfig: JsonRecord) => void;
  onAdvancedConfigRendererStateChange: (state: StrategySchemaRendererState) => void;
  onAdvancedSourcesEnabledChange: (value: boolean) => void;
  onSignalSourceRowsChange: (rows: CopyTradingSignalSourceConfigRow[]) => void;
  onStopLossPercentChange: (value: string) => void;
  onTakeProfitPercentChange: (value: string) => void;
}) {
  const strategyCreateCopy = accountCopy.strategyCreate;
  return (
    <>
      <CopyTradingSignalSourceConfigEditor
        advancedEnabled={advancedSourcesEnabled}
        availableSignalSources={availableSignalSources}
        copy={copy}
        errors={signalSourceErrors}
        isDarkTheme={isDarkTheme}
        rows={signalSourceRows}
        onAdvancedEnabledChange={onAdvancedSourcesEnabledChange}
        onRowsChange={onSignalSourceRowsChange}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <PercentInput
          copyLabel={accountCopy.copyTrading.takeProfit}
          fieldName="create-take-profit"
          isDarkTheme={isDarkTheme}
          placeholder={accountCopy.copyTrading.takeProfitPlaceholder}
          required
          requiredLabel={accountCopy.strategySchema.requiredLabel}
          value={takeProfitPercent}
          onChange={onTakeProfitPercentChange}
        />
        <PercentInput
          copyLabel={accountCopy.copyTrading.stopLoss}
          fieldName="create-stop-loss"
          isDarkTheme={isDarkTheme}
          placeholder={accountCopy.copyTrading.stopLossPlaceholder}
          required
          requiredLabel={accountCopy.strategySchema.requiredLabel}
          value={stopLossPercent}
          onChange={onStopLossPercentChange}
        />
      </div>
      <CopyTradingSltpConfigEditor
        advancedEnabled={advancedSourcesEnabled}
        config={advancedConfig}
        copy={copy}
        isDarkTheme={isDarkTheme}
        onConfigChange={onAdvancedConfigChange}
      />
      {advancedSourcesEnabled ? (
        <DefinitionDrivenConfigForm
          config={advancedConfig}
          copy={copy}
          definition={definition}
          description={strategyCreateCopy.commonConfigDescription}
          hiddenPaths={advancedConfigHiddenPaths}
          isDarkTheme={isDarkTheme}
          title={accountCopy.strategy.advancedCommonConfigTitle}
          onConfigChange={onAdvancedConfigChange}
          onRendererStateChange={onAdvancedConfigRendererStateChange}
        />
      ) : null}
      <div className={isDarkTheme ? "rounded-2xl border border-amber-300/15 bg-amber-300/[0.07] px-3 py-3 text-xs leading-5 text-amber-100/80" : "rounded-2xl border border-amber-100 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800"}>
        {strategyCreateCopy.copyTradingRiskNote}
      </div>
    </>
  );
}

export function StrategyTypeOptionButton({
  description,
  isDarkTheme,
  isSelected,
  title,
  onSelect,
}: {
  description: string;
  isDarkTheme: boolean;
  isSelected: boolean;
  title: string;
  onSelect: () => void;
}) {
  return (
    <Button
      aria-pressed={isSelected}
      className={getStrategyTypeOptionClassName(isDarkTheme, isSelected)}
      type="button"
      variant="outline"
      onClick={onSelect}
    >
      <span className="block text-sm font-black">{title}</span>
      <span className={isDarkTheme ? "mt-2 block text-xs leading-5 text-slate-400" : "mt-2 block text-xs leading-5 text-slate-600"}>{description}</span>
    </Button>
  );
}

function getStrategyTypeOptionClassName(isDarkTheme: boolean, isSelected: boolean): string {
  const baseClassName = "h-auto flex-col items-start justify-start whitespace-normal rounded-2xl px-3 py-3 text-left";
  if (isSelected) {
    return isDarkTheme
      ? `${baseClassName} border-indigo-400/30 bg-indigo-400/10 text-indigo-100 shadow-[0_0_0_3px_rgba(99,102,241,0.10)] hover:bg-indigo-400/10`
      : `${baseClassName} border-[#C7D2FE] bg-[#EEF2FF] text-[#4F46E5] shadow-[0_0_0_3px_rgba(99,102,241,0.10)] hover:bg-[#EEF2FF]`;
  }

  return isDarkTheme
    ? `${baseClassName} border-white/[0.075] bg-white/[0.035] text-slate-200 hover:bg-white/[0.055]`
    : `${baseClassName} border-[#E8E8EC] bg-white text-slate-900 hover:border-[#C7D2FE] hover:bg-[#F5F5FF]`;
}
