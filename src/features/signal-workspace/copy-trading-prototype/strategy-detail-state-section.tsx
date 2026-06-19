"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type {
  TradingFoxStrategyDefinition,
  TradingFoxStrategyDetail,
  TradingFoxStrategyStateResponse,
} from "@/lib/tradingfox-control-plane";
import { getTradingFoxErrorMessage } from "@/lib/tradingfox-errors";
import { getStrategyRendererResolutionError, MARIO_STATE_RENDERER_KEY, resolveStrategyRendererKey } from "./strategy-renderer-registry";
import { requestStrategyState } from "./strategy-detail-utils";
import { StrategySchemaRenderer } from "./strategy-schema-renderer";
import { getInlineErrorClassName, getModalSectionClassName } from "./styles";

type JsonRecord = Record<string, unknown>;

export function StrategyDetailStateSection({
  copy,
  detail,
  isDarkTheme,
  strategyDefinition,
  strategyDefinitionError,
}: {
  copy: WorkspaceCopy;
  detail: TradingFoxStrategyDetail;
  isDarkTheme: boolean;
  strategyDefinition: TradingFoxStrategyDefinition | null;
  strategyDefinitionError: string;
}) {
  const strategyCopy = copy.workspace.accountCenter.strategy;
  const stateSchemaVersion = strategyDefinition?.stateSchemaVersion ?? 0;
  const rendererError = strategyDefinition
    ? getStrategyRendererResolutionError(strategyDefinition, "state")
    : "";
  const stateQuery = useQuery({
    enabled: Boolean(strategyDefinition && stateSchemaVersion > 0 && !rendererError),
    queryFn: () => requestStrategyState(String(detail.trader.id)),
    queryKey: ["tradingfox", "strategy-state", detail.trader.id, strategyDefinition?.id, strategyDefinition?.version, stateSchemaVersion],
    refetchOnMount: "always",
  });

  return (
    <Card className={getModalSectionClassName(isDarkTheme)}>
      <h3 className="text-sm font-black">{strategyCopy.strategyStateTitle}</h3>
      <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>{strategyCopy.strategyStateDescription}</p>
      <div className="mt-3">
        {renderStateContent({
          copy,
          error: stateQuery.error,
          isDarkTheme,
          isLoading: stateQuery.isLoading || stateQuery.isFetching,
          rendererError,
          state: stateQuery.data ?? null,
          stateSchemaVersion,
          strategyDefinition,
          strategyDefinitionError,
        })}
      </div>
    </Card>
  );
}

function renderStateContent({
  copy,
  error,
  isDarkTheme,
  isLoading,
  rendererError,
  state,
  stateSchemaVersion,
  strategyDefinition,
  strategyDefinitionError,
}: {
  copy: WorkspaceCopy;
  error: Error | null;
  isDarkTheme: boolean;
  isLoading: boolean;
  rendererError: string;
  state: TradingFoxStrategyStateResponse | null;
  stateSchemaVersion: number;
  strategyDefinition: TradingFoxStrategyDefinition | null;
  strategyDefinitionError: string;
}) {
  const strategyCopy = copy.workspace.accountCenter.strategy;
  if (strategyDefinitionError) {
    return <p className={getInlineErrorClassName(isDarkTheme)}>{strategyDefinitionError}</p>;
  }
  if (!strategyDefinition) {
    return <div className={getStateInfoClassName(isDarkTheme)}>{strategyCopy.loadingDetail}</div>;
  }
  if (stateSchemaVersion <= 0) {
    return <div className={getStateInfoClassName(isDarkTheme)}>{strategyCopy.strategyStateNotDeclared}</div>;
  }
  if (!isRecord(strategyDefinition.stateSchema)) {
    return <p className={getInlineErrorClassName(isDarkTheme)}>{strategyCopy.strategyStateSchemaMissing}</p>;
  }
  if (rendererError) {
    return <p className={getInlineErrorClassName(isDarkTheme)}>{rendererError}</p>;
  }
  if (isLoading) {
    return <div className={getStateInfoClassName(isDarkTheme)}>{strategyCopy.strategyStateLoading}</div>;
  }
  if (error) {
    return <p className={getInlineErrorClassName(isDarkTheme)}>{getTradingFoxErrorMessage(error, copy)}</p>;
  }
  if (!state) {
    return null;
  }
  if (state.stateSchemaVersion !== stateSchemaVersion) {
    return (
      <p className={getInlineErrorClassName(isDarkTheme)}>
        {strategyCopy.strategyStateVersionMismatch(state.stateSchemaVersion, stateSchemaVersion)}
      </p>
    );
  }
  if (!state.initialized) {
    return <div className={getStateInfoClassName(isDarkTheme)}>{strategyCopy.strategyStateNotInitialized}</div>;
  }
  if (!isRecord(state.state)) {
    return <p className={getInlineErrorClassName(isDarkTheme)}>{strategyCopy.strategyStateInvalidPayload}</p>;
  }

  const rendererKey = resolveStrategyRendererKey(strategyDefinition, "state");
  return (
    <div className="space-y-3">
      {state.updatedAt ? <div className="text-xs font-bold text-slate-500">{strategyCopy.strategyStateUpdatedAt(state.updatedAt)}</div> : null}
      {rendererKey === MARIO_STATE_RENDERER_KEY ? (
        <MarioStrategyStateView copy={copy} isDarkTheme={isDarkTheme} state={state.state} />
      ) : (
        <StrategySchemaRenderer
          copy={copy}
          formData={state.state}
          isDarkTheme={isDarkTheme}
          mode="readonly"
          schema={strategyDefinition.stateSchema}
          uiSchema={strategyDefinition.stateUiSchema}
        />
      )}
    </div>
  );
}

function MarioStrategyStateView({
  copy,
  isDarkTheme,
  state,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  state: JsonRecord;
}) {
  const strategyCopy = copy.workspace.accountCenter.strategy;
  const strategyState = isRecord(state.strategy) ? state.strategy : {};
  const plans = Array.isArray(strategyState.plans) ? strategyState.plans.filter(isRecord) : null;

  if (!plans) {
    return <p className={getInlineErrorClassName(isDarkTheme)}>{strategyCopy.marioStatePlansMissing}</p>;
  }
  if (plans.length === 0) {
    return <div className={getStateInfoClassName(isDarkTheme)}>{strategyCopy.marioStatePlansEmpty}</div>;
  }

  return (
    <div className="grid gap-2">
      <div className={isDarkTheme ? "text-xs font-black text-slate-400" : "text-xs font-black text-slate-500"}>
        {strategyCopy.marioStatePlanCount(plans.length)}
      </div>
      {plans.map((plan, index) => (
        <MarioStatePlanCard
          key={stringValue(plan.id) || `${stringValue(plan.symbol)}:${index}`}
          copy={copy}
          isDarkTheme={isDarkTheme}
          plan={plan}
        />
      ))}
    </div>
  );
}

function MarioStatePlanCard({
  copy,
  isDarkTheme,
  plan,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  plan: JsonRecord;
}) {
  const strategyCopy = copy.workspace.accountCenter.strategy;
  const entryOrders = Array.isArray(plan.entryOrders) ? plan.entryOrders.length : 0;
  const takeProfitOrders = Array.isArray(plan.takeProfitOrders) ? plan.takeProfitOrders.length : 0;
  const hasStopLoss = isRecord(plan.stopLossOrder);

  return (
    <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3" : "rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] p-3"}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-black">{stringValue(plan.symbol) || "-"}</div>
          <div className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-400" : "mt-1 text-xs font-bold text-slate-500"}>
            {stringValue(plan.positionSide) || "-"} · {stringValue(plan.id) || "-"}
          </div>
        </div>
        <span className={getStatusClassName(isDarkTheme)}>{stringValue(plan.status) || "-"}</span>
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
        <MarioStateMetric label={strategyCopy.orderQuantity} value={numberOrText(plan.quantity)} />
        <MarioStateMetric label={strategyCopy.marioStateEntryOrders} value={String(entryOrders)} />
        <MarioStateMetric label={strategyCopy.marioStateTakeProfitOrders} value={String(takeProfitOrders)} />
        <MarioStateMetric label={strategyCopy.marioStateStopLossOrder} value={hasStopLoss ? strategyCopy.strategyStateBooleanYes : strategyCopy.strategyStateBooleanNo} />
      </div>
      {stringValue(plan.failedReason) ? (
        <p className={isDarkTheme ? "mt-3 text-xs font-bold text-rose-200" : "mt-3 text-xs font-bold text-rose-700"}>
          {stringValue(plan.failedReason)}
        </p>
      ) : null}
    </div>
  );
}

function MarioStateMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-1 font-mono font-black tabular-nums">{value}</div>
    </div>
  );
}

function getStateInfoClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-3 text-sm font-bold text-slate-400"
    : "rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-3 py-3 text-sm font-bold text-slate-600";
}

function getStatusClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "w-fit rounded-full bg-indigo-400/15 px-2.5 py-1 text-xs font-black text-indigo-200"
    : "w-fit rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700";
}

function numberOrText(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : stringValue(value) || "-";
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
