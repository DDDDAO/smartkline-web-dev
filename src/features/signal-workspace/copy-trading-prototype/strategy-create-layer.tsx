"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getTradingFoxErrorMessage } from "@/lib/tradingfox-errors";
import type { TradingFoxStrategyDefinition, TradingFoxStrategyDefinitionSummary } from "@/lib/tradingfox-control-plane";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { TradingAccountSelect } from "./account-connection-ui";
import { CopyTradingCreateBody } from "./strategy-create-fields";
import {
  createAvailableSourceById,
  createCopyTradingConfigWithSourceRows,
  createDefaultCopyTradingSourceRows,
  updateCopyTradingSourceRow,
  validateCopyTradingSourceRows,
  type CopyTradingSignalSourceConfigRow,
} from "./copy-trading-signal-source-config";
import { PrototypeInput } from "./prototype-form-fields";
import { DefinitionDrivenConfigForm, type JsonRecord } from "./strategy-definition-config-form";
import { StrategyDefinitionSelect } from "./strategy-definition-select";
import { COPY_TRADING_DEFINITION_ID, getStrategyPresentationForDefinitionId } from "./strategy-presentation-registry";
import { createStrategyConfigSkeleton, type StrategySchemaRendererState } from "./strategy-schema-renderer";
import type { CopyTradingPrototypeTarget, PrototypeApiConnection, PrototypeStrategy, PrototypeStrategyCreateInput } from "./types";
import { getInlineErrorClassName } from "./styles";

export { StrategyTypeOptionButton } from "./strategy-create-fields";

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
  const [selectedConnectorId, setSelectedConnectorId] = useState("");
  const [copyTradingAdvancedSourcesEnabled, setCopyTradingAdvancedSourcesEnabled] = useState(false);
  const [copyTradingSignalSourceRows, setCopyTradingSignalSourceRows] = useState<CopyTradingSignalSourceConfigRow[]>(() => createDefaultCopyTradingSourceRows(availableSignalSources));
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

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      if (!isMounted) {
        return;
      }
      const sourceById = createAvailableSourceById(availableSignalSources);
      setCopyTradingSignalSourceRows((currentRows) => {
        const nextRows = currentRows
          .filter((row) => sourceById.has(row.signalSourceId))
          .map((row) => updateCopyTradingSourceRow([row], row.rowKey, { signalSourceId: row.signalSourceId }, availableSignalSources)[0])
          .filter((row): row is CopyTradingSignalSourceConfigRow => row !== undefined);
        return nextRows.length > 0 ? nextRows : createDefaultCopyTradingSourceRows(availableSignalSources);
      });
    });

    return () => {
      isMounted = false;
    };
  }, [availableSignalSources]);

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
  const normalizedStrategyName = strategyName.trim();
  const parsedTakeProfit = Number(takeProfitPercent);
  const parsedStopLoss = Number(stopLossPercent);
  const copyTradingSignalSourceErrors = useMemo(() => validateCopyTradingSourceRows({
    advancedEnabled: copyTradingAdvancedSourcesEnabled,
    availableSignalSources,
    copy,
    rows: copyTradingSignalSourceRows,
  }), [availableSignalSources, copy, copyTradingAdvancedSourcesEnabled, copyTradingSignalSourceRows]);
  const hasValidCopyTradingInputs = strategyType !== "copyTrading" || (
    copyTradingSignalSourceErrors.length === 0
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

      const config = strategyType === "copyTrading"
        ? createCopyTradingConfigWithSourceRows({
          advancedEnabled: copyTradingAdvancedSourcesEnabled,
          baseConfig: genericConfig,
          rows: copyTradingSignalSourceRows,
          stopLossPercent: parsedStopLoss,
          takeProfitPercent: parsedTakeProfit,
        })
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
    <Sheet open onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <SheetContent
        aria-describedby={dialogDescriptionId}
        aria-labelledby={dialogTitleId}
        className={isDarkTheme
          ? "inset-x-0 bottom-0 max-h-[92dvh] overflow-hidden rounded-t-[28px] border-white/[0.085] bg-[#111820] p-0 text-slate-100 shadow-[0_-24px_80px_rgba(15,23,42,0.24)] sm:inset-x-4 sm:bottom-auto sm:top-6 sm:mx-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-[760px] sm:rounded-[28px] sm:shadow-[0_28px_90px_rgba(15,23,42,0.24)]"
          : "inset-x-0 bottom-0 max-h-[92dvh] overflow-hidden rounded-t-[28px] border-[#E8E8EC] bg-white p-0 text-slate-950 shadow-[0_-24px_80px_rgba(15,23,42,0.24)] sm:inset-x-4 sm:bottom-auto sm:top-6 sm:mx-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-[760px] sm:rounded-[28px] sm:shadow-[0_28px_90px_rgba(15,23,42,0.24)]"}
        side="bottom"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <SheetHeader className={isDarkTheme ? "border-b border-white/[0.075]" : "border-b border-[#E8E8EC]"}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <SheetTitle id={dialogTitleId} className="text-xl font-black tracking-tight">{strategyCreateCopy.modalTitle}</SheetTitle>
                <SheetDescription id={dialogDescriptionId} className={isDarkTheme ? "mt-2 text-sm leading-5 text-slate-400" : "mt-2 text-sm leading-5 text-slate-600"}>{strategyCreateCopy.modalDescription}</SheetDescription>
              </div>
              <Button aria-label={copy.common.close} className={getIconButtonClassName(isDarkTheme)} size="icon" type="button" variant="outline" onClick={onClose}>
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </Button>
            </div>
          </SheetHeader>

          <div className="kol-scroll-area min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
            <section>
              <Label className={getFormLabelClassName(isDarkTheme)}>{strategyCreateCopy.definitionSelect}</Label>
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
              value={strategyName}
              onChange={setStrategyName}
            />

            <div className="block">
              <Label className={getFormLabelClassName(isDarkTheme)}>{strategyCreateCopy.apiSelect}</Label>
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
            </div>

            {isDefinitionDetailLoading ? (
              <div className={getInfoPanelClassName(isDarkTheme)}>{strategyCreateCopy.definitionLoading}</div>
            ) : selectedDefinition && strategyPresentation.createPresentation === "copyTrading" ? (
              <CopyTradingCreateBody
                accountCopy={accountCopy}
                advancedSourcesEnabled={copyTradingAdvancedSourcesEnabled}
                availableSignalSources={availableSignalSources}
                copy={copy}
                isDarkTheme={isDarkTheme}
                signalSourceErrors={copyTradingSignalSourceErrors}
                signalSourceRows={copyTradingSignalSourceRows}
                stopLossPercent={stopLossPercent}
                takeProfitPercent={takeProfitPercent}
                onAdvancedSourcesEnabledChange={setCopyTradingAdvancedSourcesEnabled}
                onSignalSourceRowsChange={setCopyTradingSignalSourceRows}
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

          <SheetFooter className={isDarkTheme ? "grid grid-cols-2 gap-2 border-t border-white/[0.075] pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex" : "grid grid-cols-2 gap-2 border-t border-[#E8E8EC] pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex"}>
            <Button className={getSoftButtonClassName(isDarkTheme)} type="button" variant="outline" onClick={onClose}>{copy.common.close}</Button>
            <Button className={getPrimaryButtonClassName(isDarkTheme)} disabled={!canCreate} type="button" onClick={() => void submitStrategy()}>
              {isSubmitting ? strategyCreateCopy.starting : strategyCreateCopy.start}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function strategyDefinitionCacheKey(definition: Pick<TradingFoxStrategyDefinitionSummary, "configSchemaVersion" | "id" | "version">): string {
  return `${definition.id}:${definition.version}:${definition.configSchemaVersion}`;
}

function preferredDefinitionId(definitions: readonly TradingFoxStrategyDefinitionSummary[]): string {
  return definitions.find((definition) => definition.id === COPY_TRADING_DEFINITION_ID)?.id ?? definitions[0]?.id ?? "";
}

function getPrimaryButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "h-10 rounded-2xl bg-indigo-400 px-4 text-sm font-black text-slate-950 hover:bg-indigo-300"
    : "h-10 rounded-2xl bg-[#6366F1] px-4 text-sm font-black text-white hover:bg-[#4F46E5]";
}

function getSoftButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "h-10 rounded-2xl border-white/[0.075] bg-white/[0.04] text-sm font-black text-slate-200 hover:bg-white/[0.08]"
    : "h-10 rounded-2xl border-[#E8E8EC] bg-white text-sm font-black text-slate-700 hover:border-[#C7D2FE] hover:bg-[#F5F5FF] hover:text-slate-950";
}

function getIconButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-full border-white/[0.075] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-slate-50"
    : "rounded-full border-[#E8E8EC] bg-white text-slate-500 hover:border-[#C7D2FE] hover:text-slate-900";
}

function getFormLabelClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "text-xs font-black text-slate-300" : "text-xs font-black text-slate-700";
}

function getInfoPanelClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "mt-2 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-sm font-bold text-slate-300"
    : "mt-2 rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 py-3 text-sm font-bold text-slate-700";
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
