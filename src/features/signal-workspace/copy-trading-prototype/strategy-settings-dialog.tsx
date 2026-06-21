"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getTradingFoxErrorMessage } from "@/lib/tradingfox-errors";
import {
  getWorkspaceLanguageFromLocale,
  type WorkspaceCopy,
} from "@/i18n/workspace";
import type { TradingFoxStrategyDefinition, TradingFoxStrategyDetail } from "@/lib/tradingfox-control-plane";
import {
  createAvailableSourceById,
  createCopyTradingSourceRowsFromConfig,
  updateCopyTradingSourceRow,
  validateCopyTradingSourceRows,
  type CopyTradingSignalSourceConfigRow,
} from "./copy-trading-signal-source-config";
import { hasCopyTradingAdvancedSltpConfig } from "./copy-trading-sltp-config-editor";
import type { SignalSourceIdentityById } from "./strategy-detail-shared";
import { requestStrategyConfigValidation } from "./strategy-detail-utils";
import { createDefinitionConfigSchema, createDefinitionConfigUiSchema } from "./strategy-definition-schema";
import { getStrategyPresentation } from "./strategy-presentation-registry";
import { StrategySettingsConfigEditor } from "./strategy-settings-config-editor";
import { validateStrategySchemaData, type StrategySchemaRendererState } from "./strategy-schema-renderer";
import { getInlineErrorClassName } from "./styles";
import type { CopyTradingPrototypeTarget, PrototypeStrategy, PrototypeStrategySettingsUpdateInput } from "./types";

type JsonRecord = Record<string, unknown>;

export function StrategySettingsDialog({
  copy,
  detail,
  isDarkTheme,
  availableSignalSources = [],
  signalSourceIdentityById,
  strategy,
  strategyDefinition,
  strategyDefinitionError = "",
  onClose,
  onSave,
}: {
  copy: WorkspaceCopy;
  detail?: TradingFoxStrategyDetail | null;
  isDarkTheme: boolean;
  availableSignalSources?: readonly CopyTradingPrototypeTarget[];
  signalSourceIdentityById?: SignalSourceIdentityById;
  strategy: PrototypeStrategy;
  strategyDefinition?: TradingFoxStrategyDefinition | null;
  strategyDefinitionError?: string;
  onClose: () => void;
  onSave: (input: PrototypeStrategySettingsUpdateInput) => Promise<void> | void;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const strategyCopy = accountCopy.strategy;
  const strategyCreateCopy = accountCopy.strategyCreate;
  const copyTradingCopy = accountCopy.copyTrading;
  const language = getWorkspaceLanguageFromLocale(useLocale());
  const strategyPresentation = getStrategyPresentation(strategy);
  const isCopyStrategy = strategyPresentation.strategyType === "copyTrading";
  const hasConfigEditor = detail !== undefined;
  const [strategyName, setStrategyName] = useState(strategy.traderName);
  const [config, setConfig] = useState<JsonRecord>(() => cloneJsonRecord(detail?.trader.config));
  const [copyTradingSignalSourceRows, setCopyTradingSignalSourceRows] = useState<CopyTradingSignalSourceConfigRow[]>(() => (
    isCopyStrategy && detail?.trader.config
      ? createCopyTradingSourceRowsFromConfig({ availableSignalSources, config: cloneJsonRecord(detail.trader.config) })
      : []
  ));
  const [copyTradingAdvancedSourcesEnabled, setCopyTradingAdvancedSourcesEnabled] = useState(() => (
    copyTradingSignalSourceRows.length > 1 || hasCopyTradingAdvancedSltpConfig(cloneJsonRecord(detail?.trader.config))
  ));
  const [takeProfitPercent, setTakeProfitPercent] = useState(String(strategy.takeProfitPercent || 20));
  const [stopLossPercent, setStopLossPercent] = useState(String(strategy.stopLossPercent || 10));
  const [rendererState, setRendererState] = useState<StrategySchemaRendererState>({ canSubmit: !hasConfigEditor, errors: [] });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedStrategyName = strategyName.trim();
  const parsedTakeProfitPercent = Number(takeProfitPercent);
  const parsedStopLossPercent = Number(stopLossPercent);
  const shouldShowLegacyRiskInputs = isCopyStrategy && !hasConfigEditor;
  const hasPresentationConfigEditor = hasConfigEditor && detail !== null;
  const shouldUseCopyTradingSettingsState = isCopyStrategy && hasPresentationConfigEditor;
  const copyTradingSignalSourceErrors = useMemo(() => shouldUseCopyTradingSettingsState ? validateCopyTradingSourceRows({
    advancedEnabled: copyTradingAdvancedSourcesEnabled,
    availableSignalSources,
    copy,
    rows: copyTradingSignalSourceRows,
  }) : [], [availableSignalSources, copy, copyTradingAdvancedSourcesEnabled, copyTradingSignalSourceRows, shouldUseCopyTradingSettingsState]);
  const settingsPresentationContext = hasPresentationConfigEditor && detail ? {
    availableSignalSources,
    config,
    copy,
    copyTrading: {
      advancedSourcesEnabled: copyTradingAdvancedSourcesEnabled,
      signalSourceErrors: copyTradingSignalSourceErrors,
      signalSourceRows: copyTradingSignalSourceRows,
      onAdvancedSourcesEnabledChange: setCopyTradingAdvancedSourcesEnabled,
      onSignalSourceRowsChange: setCopyTradingSignalSourceRows,
    },
    detail,
    isDarkTheme,
    signalSourceIdentityById,
    onConfigChange: updateConfig,
  } : null;
  const hiddenConfigPaths = settingsPresentationContext
    ? strategyPresentation.settings.getHiddenConfigPaths(settingsPresentationContext)
    : [];
  const presentationValidationErrors = settingsPresentationContext
    ? strategyPresentation.settings.getValidationErrors(settingsPresentationContext)
    : [];
  const canSave = normalizedStrategyName.length > 0
    && !isSubmitting
    && (!hasConfigEditor || rendererState.canSubmit)
    && presentationValidationErrors.length === 0
    && (!shouldShowLegacyRiskInputs || (
      Number.isFinite(parsedTakeProfitPercent)
      && Number.isFinite(parsedStopLossPercent)
      && parsedTakeProfitPercent > 0
      && parsedStopLossPercent > 0
    ));

  useEffect(() => {
    if (!shouldUseCopyTradingSettingsState) {
      return;
    }
    let isMounted = true;
    Promise.resolve().then(() => {
      if (!isMounted) {
        return;
      }
      const sourceById = createAvailableSourceById(availableSignalSources);
      setCopyTradingSignalSourceRows((currentRows) => {
        if (currentRows.length > 0) {
          return currentRows
            .filter((row) => sourceById.has(row.signalSourceId))
            .map((row) => updateCopyTradingSourceRow([row], row.rowKey, { signalSourceId: row.signalSourceId }, availableSignalSources)[0])
            .filter((row): row is CopyTradingSignalSourceConfigRow => row !== undefined);
        }
        const rowsFromConfig = createCopyTradingSourceRowsFromConfig({ availableSignalSources, config: cloneJsonRecord(detail?.trader.config) });
        if (rowsFromConfig.length > 0) {
          return rowsFromConfig;
        }
        return [];
      });
    });

    return () => {
      isMounted = false;
    };
  }, [availableSignalSources, detail?.trader.config, shouldUseCopyTradingSettingsState]);

  function updateConfig(nextConfig: JsonRecord) {
    setConfig(nextConfig);
    setValidationErrors([]);
  }

  const saveSettings = async () => {
    if (!canSave) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setValidationErrors([]);
    try {
      if (!normalizedStrategyName) {
        throw new Error(strategyCopy.settingsNameRequired);
      }
      if (shouldShowLegacyRiskInputs && (!Number.isFinite(parsedTakeProfitPercent) || parsedTakeProfitPercent <= 0 || !Number.isFinite(parsedStopLossPercent) || parsedStopLossPercent <= 0)) {
        throw new Error(strategyCopy.settingsPercentRequired);
      }

      if (hasConfigEditor) {
        await validateAndSaveConfig(normalizedStrategyName);
      } else {
        await onSave({
          stopLossPercent: shouldShowLegacyRiskInputs ? parsedStopLossPercent : strategy.stopLossPercent,
          strategyId: strategy.id,
          strategyName: normalizedStrategyName,
          takeProfitPercent: shouldShowLegacyRiskInputs ? parsedTakeProfitPercent : strategy.takeProfitPercent,
        });
      }
      onClose();
    } catch (error) {
      setSubmitError(getTradingFoxErrorMessage(error, copy));
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateAndSaveConfig = async (strategyNameValue: string) => {
    if (!detail || !strategyDefinition) {
      throw new Error(strategyDefinitionError || strategyCopy.settingsConfigUnavailable);
    }
    if (!settingsPresentationContext) {
      throw new Error(strategyCopy.settingsConfigUnavailable);
    }
    const configToSave = strategyPresentation.settings.buildConfig(settingsPresentationContext);
    if (presentationValidationErrors.length > 0) {
      setValidationErrors([...presentationValidationErrors]);
      throw new Error(strategyCopy.settingsValidationFailed);
    }
    const localValidationErrors = validateStrategySchemaData({
      formData: configToSave,
      hiddenPaths: hiddenConfigPaths,
      language,
      schema: createDefinitionConfigSchema(strategyDefinition),
      uiSchema: createDefinitionConfigUiSchema(strategyDefinition),
    });
    if (localValidationErrors.length > 0) {
      setValidationErrors(localValidationErrors);
      throw new Error(strategyCopy.settingsValidationFailed);
    }

    await requestStrategyConfigValidation({
      config: configToSave,
      configSchemaVersion: detail.trader.configSchemaVersion,
      strategyDefinitionId: detail.trader.strategyDefinitionId,
    });
    await onSave({
      config: configToSave,
      configSchemaVersion: detail.trader.configSchemaVersion,
      stopLossPercent: strategy.stopLossPercent,
      strategyDefinitionId: detail.trader.strategyDefinitionId,
      strategyId: strategy.id,
      strategyName: strategyNameValue,
      takeProfitPercent: strategy.takeProfitPercent,
    });
  };

  return (
    <Sheet open onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <SheetContent
        aria-label={strategyCopy.editSettingsTitle}
        className={isDarkTheme
          ? "max-h-[92dvh] overflow-hidden border-white/[0.085] bg-[#111820] p-0 text-slate-100 sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[min(760px,calc(100vw-1.5rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[30px] sm:border"
          : "max-h-[92dvh] overflow-hidden border-[#E8E8EC] bg-white p-0 text-slate-950 sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[min(760px,calc(100vw-1.5rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[30px] sm:border"}
        side="bottom"
      >
        <SheetHeader className={isDarkTheme ? "border-b border-white/[0.075]" : "border-b border-[#E8E8EC]"}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.16em] text-indigo-300" : "text-[11px] font-black uppercase tracking-[0.16em] text-[#4F46E5]"}>{strategyCopy.editSettingsEyebrow}</div>
              <SheetTitle className="mt-2 text-xl font-black tracking-tight">{strategyCopy.editSettingsTitle}</SheetTitle>
              <SheetDescription className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                {hasConfigEditor ? strategyCopy.editSettingsDescription : strategyCopy.editLegacySettingsDescription}
              </SheetDescription>
            </div>
            <Button
              aria-label={copy.common.close}
              className={isDarkTheme ? "rounded-full border-white/[0.075] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-slate-50" : "rounded-full border-[#E8E8EC] bg-white text-slate-500 hover:border-[#C7D2FE] hover:text-slate-900"}
              size="icon"
              type="button"
              variant="outline"
              onClick={onClose}
            >
              <span aria-hidden="true" className="text-lg leading-none">×</span>
            </Button>
          </div>
        </SheetHeader>

        <div className="kol-scroll-area min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <StrategySettingsTextInput
            fieldName="strategy-settings-name"
            isDarkTheme={isDarkTheme}
            label={strategyCreateCopy.strategyName}
            placeholder={strategyCreateCopy.strategyNamePlaceholder}
            value={strategyName}
            onChange={setStrategyName}
          />

          {shouldShowLegacyRiskInputs ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <StrategySettingsPercentInput
                fieldName="strategy-settings-take-profit"
                isDarkTheme={isDarkTheme}
                label={copyTradingCopy.takeProfit}
                placeholder={copyTradingCopy.takeProfitPlaceholder}
                value={takeProfitPercent}
                onChange={setTakeProfitPercent}
              />
              <StrategySettingsPercentInput
                fieldName="strategy-settings-stop-loss"
                isDarkTheme={isDarkTheme}
                label={copyTradingCopy.stopLoss}
                placeholder={copyTradingCopy.stopLossPlaceholder}
                value={stopLossPercent}
                onChange={setStopLossPercent}
              />
            </div>
          ) : null}

          {hasConfigEditor ? (
            <StrategySettingsConfigEditor
              config={config}
              configSchemaVersion={detail?.trader.configSchemaVersion ?? 0}
              copy={copy}
              definition={strategyDefinition ?? null}
              definitionError={strategyDefinitionError}
              hiddenPaths={hiddenConfigPaths}
              isDarkTheme={isDarkTheme}
              signalSourceIdentityById={signalSourceIdentityById}
              strategyControls={settingsPresentationContext
                ? strategyPresentation.settings.renderControls(settingsPresentationContext)
                : null}
              onConfigChange={updateConfig}
              onRendererStateChange={setRendererState}
            />
          ) : null}

          {validationErrors.length > 0 ? (
            <div className={getInlineErrorClassName(isDarkTheme)}>
              <div className="font-black">{strategyCopy.settingsValidationTitle}</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5">
                {validationErrors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          ) : null}
          {submitError ? <p className={getInlineErrorClassName(isDarkTheme)}>{submitError}</p> : null}
        </div>

        <SheetFooter className={isDarkTheme ? "border-t border-white/[0.075]" : "border-t border-[#E8E8EC]"}>
          <Button className={isDarkTheme ? "border-white/[0.075] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]" : "border-[#E8E8EC] bg-white text-slate-700 hover:bg-[#FAFAFA]"} type="button" variant="outline" onClick={onClose}>{copy.common.close}</Button>
          <Button disabled={!canSave} type="button" onClick={() => void saveSettings()}>
            {isSubmitting ? strategyCopy.savingSettings : strategyCopy.saveSettings}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function StrategySettingsTextInput({
  fieldName,
  isDarkTheme,
  label,
  placeholder,
  value,
  onChange,
}: {
  fieldName: string;
  isDarkTheme: boolean;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className={isDarkTheme ? "text-[11px] uppercase tracking-[0.13em] text-slate-500" : "text-[11px] uppercase tracking-[0.13em] text-slate-400"} htmlFor={fieldName}>{label}</Label>
      <Input
        className={isDarkTheme ? "h-12 rounded-2xl border-white/[0.075] bg-white/[0.035] text-slate-100 placeholder:text-slate-600" : "h-12 rounded-2xl border-[#E8E8EC] bg-white text-slate-950 placeholder:text-slate-400"}
        id={fieldName}
        name={fieldName}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function StrategySettingsPercentInput({
  fieldName,
  isDarkTheme,
  label,
  placeholder,
  value,
  onChange,
}: {
  fieldName: string;
  isDarkTheme: boolean;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className={isDarkTheme ? "text-[11px] uppercase tracking-[0.13em] text-slate-500" : "text-[11px] uppercase tracking-[0.13em] text-slate-400"} htmlFor={fieldName}>{label}</Label>
      <div className="relative mt-2">
        <Input
          className={isDarkTheme ? "h-12 rounded-2xl border-white/[0.075] bg-white/[0.035] pr-8 text-slate-100" : "h-12 rounded-2xl border-[#E8E8EC] bg-white pr-8 text-slate-950"}
          id={fieldName}
          inputMode="decimal"
          name={fieldName}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className={isDarkTheme ? "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500" : "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400"}>%</span>
      </div>
    </div>
  );
}

function cloneJsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return JSON.parse(JSON.stringify(value)) as JsonRecord;
}
