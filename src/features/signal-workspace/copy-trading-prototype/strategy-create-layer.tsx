"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { getTradingFoxErrorMessage } from "@/lib/tradingfox-errors";
import type { TradingFoxStrategyDefinition, TradingFoxStrategyDefinitionSummary } from "@/lib/tradingfox-control-plane";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { TradingAccountSelect } from "./account-connection-ui";
import { CopyTradingCreateBody } from "./strategy-create-fields";
import { PrototypeInput } from "./prototype-form-fields";
import { DefinitionDrivenConfigForm, type JsonRecord } from "./strategy-definition-config-form";
import { StrategyDefinitionSelect } from "./strategy-definition-select";
import { COPY_TRADING_DEFINITION_ID, getStrategyPresentationForDefinitionId } from "./strategy-presentation-registry";
import { createStrategyConfigSkeleton, type StrategySchemaRendererState } from "./strategy-schema-renderer";
import type { CopyTradingPrototypeTarget, PrototypeApiConnection, PrototypeStrategy, PrototypeStrategyCreateInput, PrototypeStrategyType } from "./types";
import { getIconButtonClassName, getInlineErrorClassName, getLabelClassName, getPrimaryButtonClassName, getSoftButtonClassName } from "./styles";
import { formatDefaultCopyStrategyName } from "./target-utils";

export { SignalSourceOptionContent, SignalSourceSelect, StrategyTypeOptionButton } from "./strategy-create-fields";

type StrategyDefinitionDetailsById = Record<string, TradingFoxStrategyDefinition | undefined>;
export function StrategyCreateLayer({
  apiConnections,
  availableSignalSources,
  copy,
  isDarkTheme,
  strategies,
  onClose,
  onCreate,
}: {
  apiConnections: readonly PrototypeApiConnection[];
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  strategies: readonly PrototypeStrategy[];
  onClose: () => void;
  onCreate: (input: PrototypeStrategyCreateInput) => Promise<void> | void;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const strategyCreateCopy = accountCopy.strategyCreate;
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const [definitions, setDefinitions] = useState<TradingFoxStrategyDefinitionSummary[]>([]);
  const [definitionDetailsById, setDefinitionDetailsById] = useState<StrategyDefinitionDetailsById>({});
  const [selectedDefinitionId, setSelectedDefinitionId] = useState("");
  const [strategyName, setStrategyName] = useState("");
  const [hasEditedStrategyName, setHasEditedStrategyName] = useState(false);
  const [selectedConnectorId, setSelectedConnectorId] = useState("");
  const [selectedSignalSourceId, setSelectedSignalSourceId] = useState("");
  const [takeProfitPercent, setTakeProfitPercent] = useState("20");
  const [stopLossPercent, setStopLossPercent] = useState("10");
  const [genericConfig, setGenericConfig] = useState<Record<string, unknown>>({});
  const [rendererErrors, setRendererErrors] = useState<string[]>([]);
  const [definitionError, setDefinitionError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isDefinitionsLoading, setIsDefinitionsLoading] = useState(true);
  const [isDefinitionDetailLoading, setIsDefinitionDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) {
        setIsDefinitionsLoading(true);
        setDefinitionError("");
      }
    });
    fetch("/api/tradingfox/strategy-definitions", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readTradingFoxClientError(response, strategyCreateCopy.requestFailed));
        }
        return response.json() as Promise<{ items: TradingFoxStrategyDefinitionSummary[] }>;
      })
      .then((payload) => {
        if (!isMounted) {
          return;
        }
        const activeDefinitions = payload.items.filter((definition) => definition.status === "active");
        setDefinitions(activeDefinitions);
        setSelectedDefinitionId((currentDefinitionId) => currentDefinitionId || preferredDefinitionId(activeDefinitions));
      })
      .catch((error) => {
        if (isMounted) {
          setDefinitionError(getTradingFoxErrorMessage(error, copy));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsDefinitionsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [copy, strategyCreateCopy.requestFailed]);

  const selectedSummary = definitions.find((definition) => definition.id === selectedDefinitionId) ?? null;
  const selectedDefinitionCacheKey = selectedSummary ? strategyDefinitionCacheKey(selectedSummary) : "";

  useEffect(() => {
    if (!selectedSummary || !selectedDefinitionCacheKey || definitionDetailsById[selectedDefinitionCacheKey]) {
      return;
    }

    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) {
        setIsDefinitionDetailLoading(true);
        setDefinitionError("");
      }
    });
    fetch(`/api/tradingfox/strategy-definitions/${encodeURIComponent(selectedSummary.id)}`, {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readTradingFoxClientError(response, strategyCreateCopy.requestFailed));
        }
        return response.json() as Promise<TradingFoxStrategyDefinition>;
      })
      .then((definition) => {
        if (isMounted) {
          setDefinitionDetailsById((currentDetails) => ({
            ...currentDetails,
            [strategyDefinitionCacheKey(definition)]: definition,
          }));
          setGenericConfig(createStrategyConfigSkeleton(definition.configSchema));
          setRendererErrors([]);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setDefinitionError(getTradingFoxErrorMessage(error, copy));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsDefinitionDetailLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [copy, definitionDetailsById, selectedDefinitionCacheKey, selectedSummary, strategyCreateCopy.requestFailed]);

  const occupiedConnectorIds = useMemo(() => new Set(strategies
    .filter((strategy) => strategy.status !== "stopped")
    .map((strategy) => strategy.exchangeConnectorId)), [strategies]);
  const availableApiConnections = useMemo(() => apiConnections.filter((connection) =>
    connection.status === "connected" && !occupiedConnectorIds.has(connection.id),
  ), [apiConnections, occupiedConnectorIds]);
  const selectedApiConnection = availableApiConnections.find((connection) => String(connection.id) === selectedConnectorId) ?? availableApiConnections[0] ?? null;
  const selectedTradingAccountId = selectedApiConnection ? String(selectedApiConnection.id) : "";
  const selectedDefinition = selectedDefinitionCacheKey ? definitionDetailsById[selectedDefinitionCacheKey] : undefined;
  const strategyPresentation = getStrategyPresentationForDefinitionId(selectedDefinitionId);
  const strategyType = strategyPresentation.strategyType;
  const selectedSignalSource = availableSignalSources.find((target) => target.trader.trader_id === selectedSignalSourceId) ?? availableSignalSources[0] ?? null;
  const defaultStrategyName = defaultNameForStrategy({
    selectedDefinition,
    selectedSignalSource,
    strategyCreateCopy,
    strategyType,
  });
  const effectiveStrategyName = hasEditedStrategyName ? strategyName : defaultStrategyName;
  const normalizedStrategyName = effectiveStrategyName.trim();
  const parsedTakeProfit = Number(takeProfitPercent);
  const parsedStopLoss = Number(stopLossPercent);
  const hasValidCopyTradingInputs = strategyType !== "copyTrading" || (
    selectedSignalSource !== null
    && Number.isFinite(parsedTakeProfit)
    && Number.isFinite(parsedStopLoss)
    && parsedTakeProfit > 0
    && parsedStopLoss > 0
  );
  const canCreate = selectedApiConnection !== null
    && selectedDefinition !== undefined
    && !isSubmitting
    && !isDefinitionDetailLoading
    && normalizedStrategyName.length > 0
    && hasValidCopyTradingInputs
    && (strategyType !== "generic" || rendererErrors.length === 0);

  const submitStrategy = async () => {
    if (!canCreate || !selectedApiConnection || !selectedDefinition) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      if (!normalizedStrategyName) {
        throw new Error(strategyCreateCopy.strategyNameRequired);
      }

      const config = strategyType === "copyTrading" && selectedSignalSource
        ? createCopyTradingConfig(selectedSignalSource, parsedTakeProfit, parsedStopLoss)
        : genericConfig;
      await validateStrategyConfig({
        config,
        configSchemaVersion: selectedDefinition.configSchemaVersion,
        requestFailed: strategyCreateCopy.requestFailed,
        strategyDefinitionId: selectedDefinition.id,
      });
      await onCreate({
        autoStart: true,
        config,
        configSchemaVersion: selectedDefinition.configSchemaVersion,
        copyTrading: strategyType === "copyTrading" && selectedSignalSource ? {
          avatarUrl: selectedSignalSource.trader.avatar,
          eventsCount: selectedSignalSource.eventsCount,
          platform: selectedSignalSource.trader.platform,
          positionsCount: selectedSignalSource.positionsCount,
          signalSourceId: selectedSignalSource.trader.trader_id,
          stopLossPercent: parsedStopLoss,
          takeProfitPercent: parsedTakeProfit,
          traderName: selectedSignalSource.trader.name,
        } : undefined,
        definition: selectedDefinition,
        exchangeConnectorId: selectedApiConnection.id,
        strategyDefinitionId: selectedDefinition.id,
        strategyName: normalizedStrategyName,
        strategyType,
      });
      onClose();
    } catch (error) {
      setSubmitError(getTradingFoxErrorMessage(error, copy));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateRendererState = (state: StrategySchemaRendererState) => {
    setRendererErrors((currentErrors) => {
      const currentKey = currentErrors.join("\n");
      const nextKey = state.errors.join("\n");
      return currentKey === nextKey ? currentErrors : state.errors;
    });
  };

  const updateConfigBranch = (branch: "common" | "strategy", nextBranchConfig: JsonRecord) => {
    setGenericConfig((currentConfig) => ({
      ...currentConfig,
      [branch]: nextBranchConfig,
    }));
  };

  return (
    <>
      <button
        aria-label={copy.common.close}
        className={isDarkTheme ? "fixed inset-0 z-[95] bg-black/52 backdrop-blur-[4px]" : "fixed inset-0 z-[95] bg-slate-950/24 backdrop-blur-[4px]"}
        type="button"
        onClick={onClose}
      />
      <section
        aria-describedby={dialogDescriptionId}
        aria-labelledby={dialogTitleId}
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-[100] max-h-[92dvh] overflow-hidden rounded-t-[28px] shadow-[0_-24px_80px_rgba(15,23,42,0.24)] sm:inset-x-4 sm:bottom-auto sm:top-6 sm:mx-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-[760px] sm:rounded-[28px] sm:shadow-[0_28px_90px_rgba(15,23,42,0.24)]"
        role="dialog"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
      >
        <div className={isDarkTheme ? "flex max-h-[92dvh] flex-col border border-white/[0.085] bg-[#111820] text-slate-100 sm:max-h-[calc(100dvh-3rem)]" : "flex max-h-[92dvh] flex-col border border-[#D5E4EF] bg-white text-slate-950 sm:max-h-[calc(100dvh-3rem)]"}>
          <div className={isDarkTheme ? "border-b border-white/[0.075] px-4 py-4 sm:px-5 sm:py-5" : "border-b border-[#E5EAF0] px-4 py-4 sm:px-5 sm:py-5"}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.16em] text-sky-300" : "text-[11px] font-black uppercase tracking-[0.16em] text-[#008DCC]"}>{strategyCreateCopy.modalEyebrow}</div>
                <h2 id={dialogTitleId} className="mt-2 text-xl font-black tracking-tight">{strategyCreateCopy.modalTitle}</h2>
                <p id={dialogDescriptionId} className={isDarkTheme ? "mt-2 text-sm leading-5 text-slate-400" : "mt-2 text-sm leading-5 text-slate-600"}>{strategyCreateCopy.modalDescription}</p>
              </div>
              <button aria-label={copy.common.close} className={getIconButtonClassName(isDarkTheme)} type="button" onClick={onClose}>
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </button>
            </div>
          </div>

          <div className="kol-scroll-area min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
            <section>
              <div className={getLabelClassName(isDarkTheme)}>{strategyCreateCopy.definitionSelect}</div>
              {isDefinitionsLoading ? (
                <div className={getInfoPanelClassName(isDarkTheme)}>{strategyCreateCopy.definitionsLoading}</div>
              ) : definitions.length > 0 ? (
                <StrategyDefinitionSelect
                  copy={copy}
                  definitions={definitions}
                  isDarkTheme={isDarkTheme}
                  value={selectedDefinitionId}
                  onChange={(definitionId) => {
                    const nextDefinition = definitions.find((definition) => definition.id === definitionId);
                    const definitionDetail = nextDefinition ? definitionDetailsById[strategyDefinitionCacheKey(nextDefinition)] : undefined;
                    setSelectedDefinitionId(definitionId);
                    setHasEditedStrategyName(false);
                    setStrategyName("");
                    setGenericConfig(definitionDetail
                      ? createStrategyConfigSkeleton(definitionDetail.configSchema)
                      : {});
                    setRendererErrors([]);
                    setSubmitError("");
                  }}
                />
              ) : (
                <div className={getInfoPanelClassName(isDarkTheme)}>{strategyCreateCopy.definitionsEmpty}</div>
              )}
            </section>

            <PrototypeInput
              fieldName="strategy-name"
              isDarkTheme={isDarkTheme}
              label={strategyCreateCopy.strategyName}
              placeholder={strategyCreateCopy.strategyNamePlaceholder}
              value={effectiveStrategyName}
              onChange={(value) => {
                setHasEditedStrategyName(true);
                setStrategyName(value);
              }}
            />

            <label className="block">
              <span className={getLabelClassName(isDarkTheme)}>{strategyCreateCopy.apiSelect}</span>
              {availableApiConnections.length > 0 ? (
                <TradingAccountSelect
                  accountCopy={accountCopy}
                  connections={availableApiConnections}
                  isDarkTheme={isDarkTheme}
                  value={selectedTradingAccountId}
                  onChange={setSelectedConnectorId}
                />
              ) : (
                <div className={getInfoPanelClassName(isDarkTheme)}>
                  {apiConnections.length > 0 ? strategyCreateCopy.noAvailableAccount : accountCopy.copyTrading.apiRequired}
                </div>
              )}
            </label>

            {isDefinitionDetailLoading ? (
              <div className={getInfoPanelClassName(isDarkTheme)}>{strategyCreateCopy.definitionLoading}</div>
            ) : selectedDefinition && strategyPresentation.createPresentation === "copyTrading" ? (
              <CopyTradingCreateBody
                accountCopy={accountCopy}
                availableSignalSources={availableSignalSources}
                copy={copy}
                isDarkTheme={isDarkTheme}
                selectedSignalSource={selectedSignalSource}
                stopLossPercent={stopLossPercent}
                takeProfitPercent={takeProfitPercent}
                onSelectedSignalSourceIdChange={setSelectedSignalSourceId}
                onStopLossPercentChange={setStopLossPercent}
                onTakeProfitPercentChange={setTakeProfitPercent}
              />
            ) : selectedDefinition && strategyPresentation.createPresentation === "marioDashboardHint" ? (
              <div className={isDarkTheme ? "rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-3 text-xs leading-5 text-emerald-100/80" : "rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800"}>
                {strategyCreateCopy.marioDashboardHint}
              </div>
            ) : selectedDefinition ? (
              <DefinitionDrivenConfigForm
                config={genericConfig}
                copy={copy}
                definition={selectedDefinition}
                isDarkTheme={isDarkTheme}
                onBranchChange={updateConfigBranch}
                onRendererStateChange={updateRendererState}
              />
            ) : selectedSummary ? (
              <div className={getInfoPanelClassName(isDarkTheme)}>{strategyCreateCopy.definitionLoading}</div>
            ) : null}

            {definitionError ? <p className={getInlineErrorClassName(isDarkTheme)}>{definitionError}</p> : null}
            {submitError ? <p className={getInlineErrorClassName(isDarkTheme)}>{submitError}</p> : null}
          </div>

          <div className={isDarkTheme ? "grid grid-cols-2 gap-2 border-t border-white/[0.075] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:items-center sm:justify-end sm:px-5" : "grid grid-cols-2 gap-2 border-t border-[#E5EAF0] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:items-center sm:justify-end sm:px-5"}>
            <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={onClose}>{copy.common.close}</button>
            <button className={getPrimaryButtonClassName(isDarkTheme)} disabled={!canCreate} type="button" onClick={() => void submitStrategy()}>
              {isSubmitting ? strategyCreateCopy.starting : strategyCreateCopy.start}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function strategyDefinitionCacheKey(definition: Pick<TradingFoxStrategyDefinitionSummary, "configSchemaVersion" | "id" | "version">): string {
  return `${definition.id}:${definition.version}:${definition.configSchemaVersion}`;
}

function preferredDefinitionId(definitions: readonly TradingFoxStrategyDefinitionSummary[]): string {
  return definitions.find((definition) => definition.id === COPY_TRADING_DEFINITION_ID)?.id ?? definitions[0]?.id ?? "";
}

function defaultNameForStrategy({
  selectedDefinition,
  selectedSignalSource,
  strategyCreateCopy,
  strategyType,
}: {
  selectedDefinition?: TradingFoxStrategyDefinition;
  selectedSignalSource: CopyTradingPrototypeTarget | null;
  strategyCreateCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategyCreate"];
  strategyType: PrototypeStrategyType;
}): string {
  if (strategyType === "copyTrading") {
    return formatDefaultCopyStrategyName(selectedSignalSource, strategyCreateCopy.copyTradingTitle);
  }
  if (strategyType === "mario") {
    return strategyCreateCopy.marioStrategyName;
  }
  return selectedDefinition?.name
    ? strategyCreateCopy.genericStrategyName(selectedDefinition.name)
    : strategyCreateCopy.genericStrategyFallbackName;
}

function createCopyTradingConfig(
  selectedSignalSource: CopyTradingPrototypeTarget,
  takeProfitPercent: number,
  stopLossPercent: number,
): Record<string, unknown> {
  return {
    common: {
      execution: { leverage: 10 },
      market: {},
      orders: {},
      risk: { stopLossPercent },
      sltp: {},
    },
    strategy: {
      signalSourceConfigs: [{
        followSide: "BOTH",
        id: 1,
        marginPercent: 100,
        signalSourceID: selectedSignalSource.trader.trader_id,
        smartklineTakeProfitPercent: takeProfitPercent,
        startTime: new Date().toISOString(),
        traderID: 0,
      }],
    },
  };
}

function getInfoPanelClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "mt-2 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-sm font-bold text-slate-300"
    : "mt-2 rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-3 text-sm font-bold text-slate-700";
}

async function validateStrategyConfig({
  config,
  configSchemaVersion,
  requestFailed,
  strategyDefinitionId,
}: {
  config: JsonRecord;
  configSchemaVersion: number;
  requestFailed: (status: number) => string;
  strategyDefinitionId: string;
}) {
  const response = await fetch(`/api/tradingfox/strategy-definitions/${encodeURIComponent(strategyDefinitionId)}/validate-config`, {
    body: JSON.stringify({ config, configSchemaVersion }),
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(await readTradingFoxClientError(response, requestFailed));
  }
}

async function readTradingFoxClientError(response: Response, requestFailed: (status: number) => string): Promise<string> {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  return payload?.error || requestFailed(response.status);
}
