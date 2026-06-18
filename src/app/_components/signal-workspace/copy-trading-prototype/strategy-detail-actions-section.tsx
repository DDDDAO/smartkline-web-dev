"use client";

import { useState } from "react";
import { getTradingFoxErrorMessage } from "@/app/_lib/tradingfox-errors";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { TradingFoxActionDefinition, TradingFoxStrategyDefinition, TradingFoxStrategyDetail } from "@/app/_lib/tradingfox-control-plane";
import { createStrategyConfigSkeleton, StrategySchemaRenderer, type StrategySchemaRendererState } from "./strategy-schema-renderer";
import { requestStrategyAction } from "./strategy-detail-utils";
import {
  actionDefinitionDescription,
  actionDefinitionLabel,
} from "./strategy-display-metadata";
import { getInlineErrorClassName, getModalSectionClassName, getPrimaryButtonClassName } from "./styles";

type JsonRecord = Record<string, unknown>;

export function StrategyDetailActionsSection({
  copy,
  detail,
  isDarkTheme,
  strategyCopy,
  strategyDefinition,
  onActionCompleted,
}: {
  copy: WorkspaceCopy;
  detail: TradingFoxStrategyDetail;
  isDarkTheme: boolean;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  strategyDefinition: TradingFoxStrategyDefinition | null;
  onActionCompleted: (detail?: TradingFoxStrategyDetail) => Promise<void> | void;
}) {
  const actionDefinitions = strategyDefinition?.capabilities.actionDefinitions ?? [];
  if (actionDefinitions.length === 0) {
    return null;
  }

  const isActionDisabled = detail.strategy.status !== "running";

  return (
    <section className={getModalSectionClassName(isDarkTheme)}>
      <h3 className="text-sm font-black">{strategyCopy.manualActionsTitle}</h3>
      <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>{strategyCopy.manualActionsDescription}</p>
      {isActionDisabled ? <p className={isDarkTheme ? "mt-2 text-xs leading-5 text-amber-200" : "mt-2 text-xs leading-5 text-amber-700"}>{strategyCopy.manualActionDisabled}</p> : null}
      <div className="mt-3 grid gap-3">
        {actionDefinitions.map((action) => (
          <StrategyActionCard
            key={`${strategyDefinition?.id}:${strategyDefinition?.version}:${action.id}`}
            action={action}
            copy={copy}
            detail={detail}
            isActionDisabled={isActionDisabled}
            isDarkTheme={isDarkTheme}
            strategyCopy={strategyCopy}
            onActionCompleted={onActionCompleted}
          />
        ))}
      </div>
    </section>
  );
}

function StrategyActionCard({
  action,
  copy,
  detail,
  isActionDisabled,
  isDarkTheme,
  strategyCopy,
  onActionCompleted,
}: {
  action: TradingFoxActionDefinition;
  copy: WorkspaceCopy;
  detail: TradingFoxStrategyDetail;
  isActionDisabled: boolean;
  isDarkTheme: boolean;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  onActionCompleted: (detail?: TradingFoxStrategyDetail) => Promise<void> | void;
}) {
  const [payload, setPayload] = useState<JsonRecord>(() => createStrategyConfigSkeleton(action.payloadSchema));
  const [rendererErrors, setRendererErrors] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const label = actionDefinitionLabel(action, copy);
  const description = actionDefinitionDescription(action, copy);
  const hasPayload = hasConfigurablePayload(action.payloadSchema);
  const canSubmit = !isActionDisabled && !isSubmitting && rendererErrors.length === 0;

  const submitAction = async () => {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const response = await requestStrategyAction(String(detail.trader.id), action.id, hasPayload ? payload : {});
      await onActionCompleted(response.detail);
      setMessage(strategyCopy.manualActionSuccess(label));
    } catch (actionError) {
      setError(getTradingFoxErrorMessage(actionError, copy));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3" : "rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-sm font-black">{label}</h4>
          {description ? <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>{description}</p> : null}
        </div>
        <button className={getPrimaryButtonClassName(isDarkTheme)} disabled={!canSubmit} type="button" onClick={() => void submitAction()}>
          {isSubmitting ? strategyCopy.manualActionRunning : strategyCopy.manualActionRun(label)}
        </button>
      </div>
      <div className="mt-3">
        {hasPayload ? (
          <StrategySchemaRenderer
            copy={copy}
            formData={payload}
            isDarkTheme={isDarkTheme}
            mode="action"
            schema={action.payloadSchema}
            uiSchema={action.uiSchema}
            onChange={setPayload}
            onValidationStateChange={(state: StrategySchemaRendererState) => setRendererErrors(state.errors)}
          />
        ) : (
          <div className={isDarkTheme ? "rounded-2xl border border-white/[0.075] bg-[#0F131A]/70 px-3 py-3 text-sm font-bold text-slate-400" : "rounded-2xl border border-[#E5EAF0] bg-white px-3 py-3 text-sm font-bold text-slate-600"}>
            {strategyCopy.manualActionNoPayload}
          </div>
        )}
      </div>
      {message ? <p className={isDarkTheme ? "mt-3 text-xs font-bold text-emerald-200" : "mt-3 text-xs font-bold text-emerald-700"}>{message}</p> : null}
      {error ? <p className={getInlineErrorClassName(isDarkTheme)}>{error}</p> : null}
    </article>
  );
}

function hasConfigurablePayload(schema: JsonRecord | undefined): boolean {
  if (!schema || Object.keys(schema).length === 0) {
    return false;
  }
  if (schema.type === "object" && isRecord(schema.properties) && Object.keys(schema.properties).length === 0) {
    return false;
  }
  return true;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
