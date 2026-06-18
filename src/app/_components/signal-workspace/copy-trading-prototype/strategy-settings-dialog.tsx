"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { getTradingFoxErrorMessage } from "@/app/_lib/tradingfox-errors";
import {
  getWorkspaceLanguageFromLocale,
  type WorkspaceCopy,
} from "@/app/_lib/i18n";
import type { TradingFoxStrategyDefinition, TradingFoxStrategyDetail } from "@/app/_lib/tradingfox-control-plane";
import type { SignalSourceIdentityById } from "./strategy-detail-shared";
import { requestStrategyConfigValidation } from "./strategy-detail-utils";
import { getPrototypeStrategyType } from "./strategy-helpers";
import { StrategySettingsConfigEditor } from "./strategy-settings-config-editor";
import { validateStrategySchemaData, type StrategySchemaRendererState } from "./strategy-schema-renderer";
import {
  getIconButtonClassName,
  getInlineErrorClassName,
  getPrimaryButtonClassName,
  getSoftButtonClassName,
} from "./styles";
import type { PrototypeStrategy, PrototypeStrategySettingsUpdateInput } from "./types";

type JsonRecord = Record<string, unknown>;

export function StrategySettingsDialog({
  copy,
  detail,
  isDarkTheme,
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
  const isCopyStrategy = getPrototypeStrategyType(strategy) === "copyTrading";
  const hasConfigEditor = detail !== undefined;
  const [strategyName, setStrategyName] = useState(strategy.traderName);
  const [config, setConfig] = useState<JsonRecord>(() => cloneJsonRecord(detail?.trader.config));
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
  const canSave = normalizedStrategyName.length > 0
    && !isSubmitting
    && (!hasConfigEditor || rendererState.canSubmit)
    && (!shouldShowLegacyRiskInputs || (
      Number.isFinite(parsedTakeProfitPercent)
      && Number.isFinite(parsedStopLossPercent)
      && parsedTakeProfitPercent > 0
      && parsedStopLossPercent > 0
    ));

  const updateConfigBranch = (branch: "common" | "strategy", nextBranchConfig: JsonRecord) => {
    setConfig((currentConfig) => ({ ...currentConfig, [branch]: nextBranchConfig }));
    setValidationErrors([]);
  };

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
    const localValidationErrors = validateStrategySchemaData({
      formData: config,
      language,
      schema: strategyDefinition.configSchema,
      uiSchema: strategyDefinition.uiSchema,
    });
    if (localValidationErrors.length > 0) {
      setValidationErrors(localValidationErrors);
      throw new Error(strategyCopy.settingsValidationFailed);
    }

    await requestStrategyConfigValidation({
      config,
      configSchemaVersion: detail.trader.configSchemaVersion,
      strategyDefinitionId: detail.trader.strategyDefinitionId,
    });
    await onSave({
      config,
      configSchemaVersion: detail.trader.configSchemaVersion,
      stopLossPercent: strategy.stopLossPercent,
      strategyDefinitionId: detail.trader.strategyDefinitionId,
      strategyId: strategy.id,
      strategyName: strategyNameValue,
      takeProfitPercent: strategy.takeProfitPercent,
    });
  };

  return (
    <>
      <button
        aria-label={copy.common.close}
        className={isDarkTheme ? "fixed inset-0 z-[125] bg-black/58 backdrop-blur-[5px]" : "fixed inset-0 z-[125] bg-slate-950/28 backdrop-blur-[5px]"}
        type="button"
        onClick={onClose}
      />
      <section
        aria-label={strategyCopy.editSettingsTitle}
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-[130] max-h-[92dvh] overflow-hidden rounded-t-[30px] shadow-[0_-26px_88px_rgba(15,23,42,0.26)] sm:inset-x-3 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:max-h-[min(760px,calc(100dvh-1rem))] sm:max-w-[760px] sm:-translate-y-1/2 sm:rounded-[30px] sm:shadow-[0_30px_90px_rgba(15,23,42,0.26)]"
        role="dialog"
      >
        <div className={isDarkTheme ? "flex max-h-[92dvh] flex-col border border-white/[0.085] bg-[#111820] text-slate-100 sm:max-h-[min(760px,calc(100dvh-1rem))]" : "flex max-h-[92dvh] flex-col border border-[#D5E4EF] bg-white text-slate-950 sm:max-h-[min(760px,calc(100dvh-1rem))]"}>
          <header className={isDarkTheme ? "border-b border-white/[0.075] px-4 py-4 sm:px-5 sm:py-5" : "border-b border-[#E5EAF0] px-4 py-4 sm:px-5 sm:py-5"}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.16em] text-sky-300" : "text-[11px] font-black uppercase tracking-[0.16em] text-[#008DCC]"}>{strategyCopy.editSettingsEyebrow}</div>
                <h2 className="mt-2 text-xl font-black tracking-tight">{strategyCopy.editSettingsTitle}</h2>
                <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                  {hasConfigEditor ? strategyCopy.editSettingsDescription : strategyCopy.editLegacySettingsDescription}
                </p>
              </div>
              <button aria-label={copy.common.close} className={getIconButtonClassName(isDarkTheme)} type="button" onClick={onClose}>
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </button>
            </div>
          </header>

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
                isDarkTheme={isDarkTheme}
                signalSourceIdentityById={signalSourceIdentityById}
                onBranchChange={updateConfigBranch}
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

          <footer className={isDarkTheme ? "grid grid-cols-2 gap-2 border-t border-white/[0.075] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:items-center sm:justify-end sm:px-5" : "grid grid-cols-2 gap-2 border-t border-[#E5EAF0] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:items-center sm:justify-end sm:px-5"}>
            <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={onClose}>{copy.common.close}</button>
            <button className={getPrimaryButtonClassName(isDarkTheme)} disabled={!canSave} type="button" onClick={() => void saveSettings()}>
              {isSubmitting ? strategyCopy.savingSettings : strategyCopy.saveSettings}
            </button>
          </footer>
        </div>
      </section>
    </>
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
    <label className="block" htmlFor={fieldName}>
      <span className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.13em] text-slate-500" : "text-[11px] font-black uppercase tracking-[0.13em] text-slate-400"}>{label}</span>
      <input
        className={isDarkTheme ? "mt-2 h-12 w-full rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-400/45" : "mt-2 h-12 w-full rounded-2xl border border-[#D5E4EF] bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#7DBEFF]"}
        id={fieldName}
        name={fieldName}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
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
    <label className="block" htmlFor={fieldName}>
      <span className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.13em] text-slate-500" : "text-[11px] font-black uppercase tracking-[0.13em] text-slate-400"}>{label}</span>
      <div className="relative mt-2">
        <input
          className={isDarkTheme ? "h-12 w-full rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 pr-8 text-sm font-black text-slate-100 outline-none transition focus:border-sky-400/45" : "h-12 w-full rounded-2xl border border-[#D5E4EF] bg-white px-3 pr-8 text-sm font-black text-slate-950 outline-none transition focus:border-[#7DBEFF]"}
          id={fieldName}
          inputMode="decimal"
          name={fieldName}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className={isDarkTheme ? "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500" : "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400"}>%</span>
      </div>
    </label>
  );
}

function cloneJsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return JSON.parse(JSON.stringify(value)) as JsonRecord;
}
