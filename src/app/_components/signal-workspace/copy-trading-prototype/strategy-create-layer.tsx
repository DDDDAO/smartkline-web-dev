"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getTradingFoxErrorMessage } from "@/app/_lib/tradingfox-errors";
import type { TradingFoxStrategyDefinition, TradingFoxStrategyDefinitionSummary } from "@/app/_lib/tradingfox-control-plane";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import { SourceAvatar } from "../card-ui";
import { TradingAccountSelect } from "./account-connection-ui";
import { PercentInput, PrototypeInput } from "./prototype-form-fields";
import { createStrategyConfigSkeleton, StrategySchemaRenderer } from "./strategy-schema-renderer";
import type { CopyTradingPrototypeTarget, PrototypeApiConnection, PrototypeStrategy, PrototypeStrategyCreateInput, PrototypeStrategyType } from "./types";
import { getIconButtonClassName, getInlineErrorClassName, getLabelClassName, getPrimaryButtonClassName, getSoftButtonClassName, getStrategyTypeOptionClassName } from "./styles";
import { formatDefaultCopyStrategyName } from "./target-utils";

const COPY_TRADING_DEFINITION_ID = "COPY_TRADING";
const MARIO_DEFINITION_ID = "MARIO_STRATEGY";

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
  const [definitionError, setDefinitionError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isDefinitionsLoading, setIsDefinitionsLoading] = useState(true);
  const [isDefinitionDetailLoading, setIsDefinitionDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsDefinitionsLoading(true);
    setDefinitionError("");
    fetch("/api/tradingfox/strategy-definitions", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readTradingFoxClientError(response));
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
  }, [copy]);

  useEffect(() => {
    if (!selectedDefinitionId || definitionDetailsById[selectedDefinitionId]) {
      return;
    }

    let isMounted = true;
    setIsDefinitionDetailLoading(true);
    setDefinitionError("");
    fetch(`/api/tradingfox/strategy-definitions/${encodeURIComponent(selectedDefinitionId)}`, {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readTradingFoxClientError(response));
        }
        return response.json() as Promise<TradingFoxStrategyDefinition>;
      })
      .then((definition) => {
        if (isMounted) {
          setDefinitionDetailsById((currentDetails) => ({
            ...currentDetails,
            [definition.id]: definition,
          }));
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
  }, [copy, definitionDetailsById, selectedDefinitionId]);

  const occupiedConnectorIds = useMemo(() => new Set(strategies
    .filter((strategy) => strategy.status !== "stopped")
    .map((strategy) => strategy.exchangeConnectorId)), [strategies]);
  const availableApiConnections = useMemo(() => apiConnections.filter((connection) =>
    connection.status === "connected" && !occupiedConnectorIds.has(connection.id),
  ), [apiConnections, occupiedConnectorIds]);
  const selectedApiConnection = availableApiConnections.find((connection) => String(connection.id) === selectedConnectorId) ?? availableApiConnections[0] ?? null;
  const selectedTradingAccountId = selectedApiConnection ? String(selectedApiConnection.id) : "";
  const selectedDefinition = selectedDefinitionId ? definitionDetailsById[selectedDefinitionId] : undefined;
  const selectedSummary = definitions.find((definition) => definition.id === selectedDefinitionId) ?? null;
  const strategyType = getStrategyTypeFromDefinitionId(selectedDefinitionId);
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
    && hasValidCopyTradingInputs;

  useEffect(() => {
    if (!selectedDefinition) {
      setGenericConfig({});
      return;
    }
    setGenericConfig(createStrategyConfigSkeleton(selectedDefinition.configSchema));
  }, [selectedDefinition]);

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

  return (
    <>
      <button
        aria-label={copy.common.close}
        className={isDarkTheme ? "fixed inset-0 z-[95] bg-black/52 backdrop-blur-[4px]" : "fixed inset-0 z-[95] bg-slate-950/24 backdrop-blur-[4px]"}
        type="button"
        onClick={onClose}
      />
      <section
        aria-label={strategyCreateCopy.modalTitle}
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-[100] max-h-[92dvh] overflow-hidden rounded-t-[28px] shadow-[0_-24px_80px_rgba(15,23,42,0.24)] sm:inset-x-3 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:max-h-[min(820px,calc(100dvh-2rem))] sm:max-w-[680px] sm:-translate-y-1/2 sm:rounded-[28px] sm:shadow-[0_28px_90px_rgba(15,23,42,0.24)]"
        role="dialog"
      >
        <div className={isDarkTheme ? "flex max-h-[92dvh] flex-col border border-white/[0.085] bg-[#111820] text-slate-100 sm:max-h-[min(820px,calc(100dvh-2rem))]" : "flex max-h-[92dvh] flex-col border border-[#D5E4EF] bg-white text-slate-950 sm:max-h-[min(820px,calc(100dvh-2rem))]"}>
          <div className={isDarkTheme ? "border-b border-white/[0.075] px-4 py-4 sm:px-5 sm:py-5" : "border-b border-[#E5EAF0] px-4 py-4 sm:px-5 sm:py-5"}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.16em] text-sky-300" : "text-[11px] font-black uppercase tracking-[0.16em] text-[#008DCC]"}>{strategyCreateCopy.modalEyebrow}</div>
                <h2 className="mt-2 text-xl font-black tracking-tight">{strategyCreateCopy.modalTitle}</h2>
                <p className={isDarkTheme ? "mt-2 text-sm leading-5 text-slate-400" : "mt-2 text-sm leading-5 text-slate-600"}>{strategyCreateCopy.modalDescription}</p>
              </div>
              <button aria-label={copy.common.close} className={getIconButtonClassName(isDarkTheme)} type="button" onClick={onClose}>
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </button>
            </div>
          </div>

          <div className="kol-scroll-area min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            <section>
              <div className={getLabelClassName(isDarkTheme)}>{strategyCreateCopy.definitionSelect}</div>
              {isDefinitionsLoading ? (
                <div className={getInfoPanelClassName(isDarkTheme)}>{strategyCreateCopy.definitionsLoading}</div>
              ) : definitions.length > 0 ? (
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {definitions.map((definition) => (
                    <StrategyTypeOptionButton
                      key={definition.id}
                      description={definition.description || definition.id}
                      isDarkTheme={isDarkTheme}
                      isSelected={selectedDefinitionId === definition.id}
                      title={definition.name || definition.id}
                      onSelect={() => {
                        setSelectedDefinitionId(definition.id);
                        setHasEditedStrategyName(false);
                        setStrategyName("");
                        setSubmitError("");
                      }}
                    />
                  ))}
                </div>
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
            ) : selectedDefinition && strategyType === "copyTrading" ? (
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
            ) : selectedDefinition && strategyType === "mario" ? (
              <div className={isDarkTheme ? "rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-3 text-xs leading-5 text-emerald-100/80" : "rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800"}>
                {strategyCreateCopy.marioDashboardHint}
              </div>
            ) : selectedDefinition ? (
              <section className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3"}>
                <h3 className="text-sm font-black">{strategyCreateCopy.genericConfigTitle}</h3>
                <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>{strategyCreateCopy.genericConfigDescription}</p>
                <div className="mt-3">
                  <StrategySchemaRenderer
                    formData={genericConfig}
                    isDarkTheme={isDarkTheme}
                    mode="create"
                    schema={selectedDefinition.configSchema}
                    uiSchema={selectedDefinition.uiSchema}
                    onChange={setGenericConfig}
                  />
                </div>
              </section>
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

function CopyTradingCreateBody({
  accountCopy,
  availableSignalSources,
  copy,
  isDarkTheme,
  selectedSignalSource,
  stopLossPercent,
  takeProfitPercent,
  onSelectedSignalSourceIdChange,
  onStopLossPercentChange,
  onTakeProfitPercentChange,
}: {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  selectedSignalSource: CopyTradingPrototypeTarget | null;
  stopLossPercent: string;
  takeProfitPercent: string;
  onSelectedSignalSourceIdChange: (value: string) => void;
  onStopLossPercentChange: (value: string) => void;
  onTakeProfitPercentChange: (value: string) => void;
}) {
  const strategyCreateCopy = accountCopy.strategyCreate;
  return (
    <>
      <label className="block">
        <span className={getLabelClassName(isDarkTheme)}>{strategyCreateCopy.signalSourceSelect}</span>
        {availableSignalSources.length > 0 ? (
          <SignalSourceSelect
            copy={copy}
            isDarkTheme={isDarkTheme}
            sources={availableSignalSources}
            value={selectedSignalSource?.trader.trader_id ?? ""}
            onChange={onSelectedSignalSourceIdChange}
          />
        ) : (
          <div className={getInfoPanelClassName(isDarkTheme)}>
            {strategyCreateCopy.signalSourceEmpty}
          </div>
        )}
      </label>
      <div className={isDarkTheme ? "rounded-2xl border border-sky-300/15 bg-sky-300/[0.07] px-3 py-3" : "rounded-2xl border border-sky-100 bg-sky-50 px-3 py-3"}>
        <div className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.14em] text-sky-200/70" : "text-[11px] font-black uppercase tracking-[0.14em] text-sky-700/70"}>{strategyCreateCopy.followRatioLabel}</div>
        <div className={isDarkTheme ? "mt-1 text-sm font-black text-sky-100" : "mt-1 text-sm font-black text-sky-800"}>{strategyCreateCopy.followRatioValue}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PercentInput
          copyLabel={accountCopy.copyTrading.takeProfit}
          fieldName="create-take-profit"
          isDarkTheme={isDarkTheme}
          placeholder={accountCopy.copyTrading.takeProfitPlaceholder}
          value={takeProfitPercent}
          onChange={onTakeProfitPercentChange}
        />
        <PercentInput
          copyLabel={accountCopy.copyTrading.stopLoss}
          fieldName="create-stop-loss"
          isDarkTheme={isDarkTheme}
          placeholder={accountCopy.copyTrading.stopLossPlaceholder}
          value={stopLossPercent}
          onChange={onStopLossPercentChange}
        />
      </div>
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
    <button
      aria-pressed={isSelected}
      className={getStrategyTypeOptionClassName(isDarkTheme, isSelected)}
      type="button"
      onClick={onSelect}
    >
      <span className="block text-sm font-black">{title}</span>
      <span className={isDarkTheme ? "mt-2 block text-xs leading-5 text-slate-400" : "mt-2 block text-xs leading-5 text-slate-600"}>{description}</span>
    </button>
  );
}

export function SignalSourceSelect({
  copy,
  isDarkTheme,
  sources,
  value,
  onChange,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  sources: readonly CopyTradingPrototypeTarget[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const strategyCreateCopy = copy.workspace.accountCenter.strategyCreate;
  const selectedSource = sources.find((source) => source.trader.trader_id === value) ?? sources[0];
  const filteredSources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return sources;
    }

    return sources.filter((source) => {
      return source.trader.name.toLowerCase().includes(normalizedQuery)
        || source.trader.trader_id.toLowerCase().includes(normalizedQuery)
        || source.trader.platform.toLowerCase().includes(normalizedQuery);
    });
  }, [query, sources]);
  const triggerClassName = isDarkTheme
    ? "mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-left text-sm font-bold text-slate-100 outline-none transition hover:bg-white/[0.055] focus:border-sky-400/45 focus:ring-2 focus:ring-sky-400/10"
    : "mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[#D5E4EF] bg-white px-3 py-2 text-left text-sm font-bold text-slate-950 shadow-sm outline-none transition hover:bg-[#F8FAFC] focus:border-[#7DBEFF] focus:ring-2 focus:ring-[#16AFF5]/10";
  const dropdownClassName = isDarkTheme
    ? "absolute left-0 right-0 top-full z-[130] mt-2 overflow-hidden rounded-2xl border border-white/[0.075] bg-[#111820] p-1 text-slate-100 shadow-[0_18px_44px_rgba(0,0,0,0.38)]"
    : "absolute left-0 right-0 top-full z-[130] mt-2 overflow-hidden rounded-2xl border border-[#D5E4EF] bg-white p-1 text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.14)]";
  const searchClassName = isDarkTheme
    ? "h-10 w-full rounded-xl border border-white/[0.075] bg-[#0F131A] px-3 text-xs font-medium text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400/40"
    : "h-10 w-full rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#B7E8FC]";

  const chooseSource = (sourceId: string) => {
    onChange(sourceId);
    setIsOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    searchInputRef.current?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && containerRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        aria-expanded={isOpen}
        className={triggerClassName}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        {selectedSource ? <SignalSourceOptionContent copy={copy} isDarkTheme={isDarkTheme} target={selectedSource} /> : null}
        <span aria-hidden="true" className={isDarkTheme ? "text-xs text-slate-500" : "text-xs text-slate-400"}>⌄</span>
      </button>
      {isOpen ? (
        <div className={dropdownClassName}>
          <div className="p-2">
            <input
              ref={searchInputRef}
              aria-label={strategyCreateCopy.signalSourceSearchPlaceholder}
              className={searchClassName}
              placeholder={strategyCreateCopy.signalSourceSearchPlaceholder}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto px-2 pb-2">
            {filteredSources.length > 0 ? filteredSources.map((target) => {
              const isSelected = selectedSource ? target.trader.trader_id === selectedSource.trader.trader_id : false;
              return (
                <button
                  key={target.trader.trader_id}
                  className={isDarkTheme
                    ? `flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none transition hover:bg-white/[0.055] focus:bg-white/[0.055] ${isSelected ? "bg-sky-400/10 text-sky-100" : ""}`
                    : `flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none transition hover:bg-[#F8FAFC] focus:bg-[#F8FAFC] ${isSelected ? "bg-[#EAF8FE] text-[#007DB8]" : ""}`}
                  type="button"
                  onClick={() => chooseSource(target.trader.trader_id)}
                >
                  <SignalSourceOptionContent copy={copy} isDarkTheme={isDarkTheme} target={target} />
                  {isSelected ? <span className="text-xs font-black">✓</span> : null}
                </button>
              );
            }) : (
              <div className={isDarkTheme ? "rounded-xl px-3 py-4 text-center text-xs font-bold text-slate-500" : "rounded-xl px-3 py-4 text-center text-xs font-bold text-slate-500"}>
                {strategyCreateCopy.signalSourceNoMatches}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SignalSourceOptionContent({
  copy,
  isDarkTheme,
  target,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  target: CopyTradingPrototypeTarget;
}) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <SourceAvatar isDarkTheme={isDarkTheme} name={target.trader.name} url={target.trader.avatar} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black">{target.trader.name}</span>
        <span className={isDarkTheme ? "mt-0.5 block truncate text-xs font-semibold text-slate-500" : "mt-0.5 block truncate text-xs font-semibold text-slate-500"}>
          {target.trader.platform} · {copy.workspace.topSignals.currentPositions}: {target.positionsCount} · {copy.workspace.topSignals.tradeHistory}: {target.eventsCount}
        </span>
      </span>
    </span>
  );
}

function preferredDefinitionId(definitions: readonly TradingFoxStrategyDefinitionSummary[]): string {
  return definitions.find((definition) => definition.id === COPY_TRADING_DEFINITION_ID)?.id ?? definitions[0]?.id ?? "";
}

function getStrategyTypeFromDefinitionId(definitionId: string): PrototypeStrategyType {
  if (definitionId === COPY_TRADING_DEFINITION_ID) {
    return "copyTrading";
  }
  if (definitionId === MARIO_DEFINITION_ID) {
    return "mario";
  }
  return "generic";
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
  return selectedDefinition?.name ? `${selectedDefinition.name} Strategy` : "Trading Strategy";
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

async function readTradingFoxClientError(response: Response): Promise<string> {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  return payload?.error || `TradingFox request failed with status ${response.status}.`;
}
