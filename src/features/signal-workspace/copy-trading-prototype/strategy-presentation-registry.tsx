"use client";

import type { ReactNode } from "react";
import { getAppLocaleFromPathname } from "@/i18n/locales";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TradingFoxStrategyDefinition, TradingFoxStrategyDefinitionSummary, TradingFoxStrategyDetail } from "@/lib/tradingfox-control-plane";
import { MarioStrategyConsole } from "@/features/mario-strategy/console";
import { MARIO_STRATEGY_CONSOLE_ACTION_IDS } from "@/features/mario-strategy/constants";
import { CopyTradingCreateBody } from "./strategy-create-fields";
import { CopyTradingSignalSourceConfigEditor } from "./copy-trading-signal-source-config-editor";
import { createCopyTradingConfigWithSourceRows, type CopyTradingSignalSourceConfigRow } from "./copy-trading-signal-source-config";
import { DefinitionDrivenConfigForm, type JsonRecord } from "./strategy-definition-config-form";
import type { SignalSourceIdentityById } from "./strategy-detail-shared";
import type { StrategySchemaRendererState } from "./strategy-schema-renderer";
import type { CopyTradingPrototypeTarget, PrototypeStrategy, PrototypeStrategyType } from "./types";

export const COPY_TRADING_DEFINITION_ID = "COPY_TRADING";
export const MARIO_DEFINITION_ID = "MARIO_STRATEGY";

export type StrategyPresentationMatchInput = {
  definition?: Pick<TradingFoxStrategyDefinitionSummary, "display" | "id"> | null;
  definitionId?: string | null;
  strategy?: Pick<PrototypeStrategy, "strategyDefinitionId" | "strategyType"> | null;
};

export type StrategyPresentationCreateContext = {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  copy: WorkspaceCopy;
  copyTrading: CopyTradingCreatePresentationState;
  definition: TradingFoxStrategyDefinition;
  genericConfig: JsonRecord;
  isDarkTheme: boolean;
  rendererErrors: readonly string[];
  onConfigBranchChange: (branch: "common" | "strategy", nextBranchConfig: JsonRecord) => void;
  onRendererStateChange: (state: StrategySchemaRendererState) => void;
};

export type CopyTradingCreatePresentationState = {
  advancedSourcesEnabled: boolean;
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  parsedStopLossPercent: number;
  parsedTakeProfitPercent: number;
  signalSourceErrors: readonly string[];
  signalSourceRows: readonly CopyTradingSignalSourceConfigRow[];
  stopLossPercent: string;
  takeProfitPercent: string;
  onAdvancedSourcesEnabledChange: (enabled: boolean) => void;
  onSignalSourceRowsChange: (rows: CopyTradingSignalSourceConfigRow[]) => void;
  onStopLossPercentChange: (value: string) => void;
  onTakeProfitPercentChange: (value: string) => void;
};

export type StrategyPresentationSettingsContext = {
  availableSignalSources: readonly CopyTradingPrototypeTarget[];
  config: JsonRecord;
  copy: WorkspaceCopy;
  copyTrading: CopyTradingSettingsPresentationState;
  detail: TradingFoxStrategyDetail;
  isDarkTheme: boolean;
  signalSourceIdentityById?: SignalSourceIdentityById;
};

export type CopyTradingSettingsPresentationState = {
  advancedSourcesEnabled: boolean;
  signalSourceErrors: readonly string[];
  signalSourceRows: readonly CopyTradingSignalSourceConfigRow[];
  onAdvancedSourcesEnabledChange: (enabled: boolean) => void;
  onSignalSourceRowsChange: (rows: CopyTradingSignalSourceConfigRow[]) => void;
};

export type StrategyPresentationDetailContext = {
  copy: WorkspaceCopy;
  detail: TradingFoxStrategyDetail;
  isDarkTheme: boolean;
  ordersSectionLoaded: boolean;
  onMarioRefresh: () => Promise<void> | void;
};

export type StrategyPresentationModule = {
  key: string;
  dashboardRouteSegment?: string;
  detail: {
    hiddenActionIds?: readonly string[];
    panels: readonly StrategyPresentationDetailPanel[];
    preloadTradeHistory?: boolean;
  };
  create: {
    buildConfig: (context: StrategyPresentationCreateContext) => JsonRecord;
    getValidationErrors: (context: StrategyPresentationCreateContext) => readonly string[];
    renderBody: (context: StrategyPresentationCreateContext) => ReactNode;
  };
  match: (input: StrategyPresentationMatchInput) => boolean;
  settings: {
    buildConfig: (context: StrategyPresentationSettingsContext) => JsonRecord;
    getHiddenConfigPaths: (context: StrategyPresentationSettingsContext) => readonly string[];
    getHiddenStrategyPaths: (context: StrategyPresentationSettingsContext) => readonly string[];
    getValidationErrors: (context: StrategyPresentationSettingsContext) => readonly string[];
    renderControls: (context: StrategyPresentationSettingsContext) => ReactNode;
  };
  strategyType: PrototypeStrategyType;
};

type StrategyPresentationDetailPanel = {
  id: string;
  render: (context: StrategyPresentationDetailContext) => ReactNode;
};

const GENERIC_STRATEGY_PRESENTATION_MODULE: StrategyPresentationModule = {
  key: "generic",
  strategyType: "generic",
  match: () => false,
  create: {
    buildConfig: ({ genericConfig }) => genericConfig,
    getValidationErrors: ({ rendererErrors }) => rendererErrors,
    renderBody: renderGenericCreateBody,
  },
  settings: {
    buildConfig: ({ config }) => config,
    getHiddenConfigPaths: () => [],
    getHiddenStrategyPaths: () => [],
    getValidationErrors: () => [],
    renderControls: () => null,
  },
  detail: {
    panels: [],
  },
};

const COPY_TRADING_STRATEGY_PRESENTATION_MODULE: StrategyPresentationModule = {
  key: "copyTrading",
  strategyType: "copyTrading",
  match: (input) => matchesPresentation(input, {
    definitionIds: [COPY_TRADING_DEFINITION_ID],
    presentationKeys: ["copyTrading", "copy-trading"],
    strategyTypes: ["copyTrading"],
  }),
  create: {
    buildConfig: ({ copyTrading, genericConfig }) => createCopyTradingConfigWithSourceRows({
      advancedEnabled: copyTrading.advancedSourcesEnabled,
      baseConfig: genericConfig,
      rows: copyTrading.signalSourceRows,
      stopLossPercent: copyTrading.parsedStopLossPercent,
      takeProfitPercent: copyTrading.parsedTakeProfitPercent,
    }),
    getValidationErrors: ({ copyTrading }) => [
      ...copyTrading.signalSourceErrors,
      ...positivePercentErrors(copyTrading.parsedTakeProfitPercent, copyTrading.parsedStopLossPercent),
    ],
    renderBody: ({ accountCopy, copy, copyTrading, isDarkTheme }) => (
      <CopyTradingCreateBody
        accountCopy={accountCopy}
        advancedSourcesEnabled={copyTrading.advancedSourcesEnabled}
        availableSignalSources={copyTrading.availableSignalSources}
        copy={copy}
        isDarkTheme={isDarkTheme}
        signalSourceErrors={copyTrading.signalSourceErrors}
        signalSourceRows={copyTrading.signalSourceRows}
        stopLossPercent={copyTrading.stopLossPercent}
        takeProfitPercent={copyTrading.takeProfitPercent}
        onAdvancedSourcesEnabledChange={copyTrading.onAdvancedSourcesEnabledChange}
        onSignalSourceRowsChange={copyTrading.onSignalSourceRowsChange}
        onStopLossPercentChange={copyTrading.onStopLossPercentChange}
        onTakeProfitPercentChange={copyTrading.onTakeProfitPercentChange}
      />
    ),
  },
  settings: {
    buildConfig: ({ config, copyTrading }) => createCopyTradingConfigWithSourceRows({
      advancedEnabled: copyTrading.advancedSourcesEnabled,
      baseConfig: config,
      rows: copyTrading.signalSourceRows,
    }),
    getHiddenConfigPaths: () => ["strategy.signalSourceConfigs"],
    getHiddenStrategyPaths: () => ["signalSourceConfigs"],
    getValidationErrors: ({ copyTrading }) => copyTrading.signalSourceErrors,
    renderControls: ({ availableSignalSources, copy, copyTrading, isDarkTheme }) => (
      <CopyTradingSignalSourceConfigEditor
        advancedEnabled={copyTrading.advancedSourcesEnabled}
        availableSignalSources={availableSignalSources}
        copy={copy}
        errors={copyTrading.signalSourceErrors}
        isDarkTheme={isDarkTheme}
        rows={copyTrading.signalSourceRows}
        onAdvancedEnabledChange={copyTrading.onAdvancedSourcesEnabledChange}
        onRowsChange={copyTrading.onSignalSourceRowsChange}
      />
    ),
  },
  detail: {
    panels: [],
  },
};

const MARIO_STRATEGY_PRESENTATION_MODULE: StrategyPresentationModule = {
  key: "mario",
  strategyType: "mario",
  match: (input) => matchesPresentation(input, {
    definitionIds: [MARIO_DEFINITION_ID],
    presentationKeys: ["mario"],
    strategyTypes: ["mario"],
  }),
  create: {
    buildConfig: ({ genericConfig }) => genericConfig,
    getValidationErrors: ({ rendererErrors }) => rendererErrors,
    renderBody: (context) => (
      <div className="space-y-4">
        <div className={context.isDarkTheme ? "rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-3 text-xs leading-5 text-emerald-100/80" : "rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800"}>
          {context.accountCopy.strategyCreate.marioDashboardHint}
        </div>
        {hasConfigurableDefinitionSchema(context.definition) ? renderGenericCreateBody(context) : null}
      </div>
    ),
  },
  settings: GENERIC_STRATEGY_PRESENTATION_MODULE.settings,
  detail: {
    hiddenActionIds: MARIO_STRATEGY_CONSOLE_ACTION_IDS,
    panels: [{
      id: "mario-console",
      render: ({ copy, detail, isDarkTheme, ordersSectionLoaded, onMarioRefresh }) => (
        <MarioStrategyConsole
          detail={detail}
          isDarkTheme={isDarkTheme}
          ordersSectionLoaded={ordersSectionLoaded}
          workspaceCopy={copy}
          onRefresh={onMarioRefresh}
        />
      ),
    }],
    preloadTradeHistory: true,
  },
};

const SPECIAL_STRATEGY_PRESENTATION_MODULES: readonly StrategyPresentationModule[] = [
  COPY_TRADING_STRATEGY_PRESENTATION_MODULE,
  MARIO_STRATEGY_PRESENTATION_MODULE,
];

export function getStrategyPresentationModule(input: StrategyPresentationMatchInput): StrategyPresentationModule {
  return SPECIAL_STRATEGY_PRESENTATION_MODULES.find((module) => module.match(input)) ?? GENERIC_STRATEGY_PRESENTATION_MODULE;
}

export function getStrategyPresentationForDefinitionId(definitionId: string | null | undefined): StrategyPresentationModule {
  return getStrategyPresentationModule({ definitionId });
}

export function getStrategyPresentation(strategy: Pick<PrototypeStrategy, "strategyDefinitionId" | "strategyType">): StrategyPresentationModule {
  return getStrategyPresentationModule({ definitionId: strategy.strategyDefinitionId, strategy });
}

export function getStrategyTypeForDefinitionId(definitionId: string | null | undefined): PrototypeStrategyType {
  return getStrategyPresentationForDefinitionId(definitionId).strategyType;
}

export function getStrategyDashboardPath(
  strategy: Pick<PrototypeStrategy, "strategyDefinitionId" | "strategyType">,
  currentPathname: string,
): string | null {
  const presentation = getStrategyPresentation(strategy);
  if (!presentation.dashboardRouteSegment) {
    return null;
  }

  const locale = getAppLocaleFromPathname(currentPathname);
  return `/${locale}/${presentation.dashboardRouteSegment}`;
}

function renderGenericCreateBody({
  copy,
  definition,
  genericConfig,
  isDarkTheme,
  onConfigBranchChange,
  onRendererStateChange,
}: StrategyPresentationCreateContext): ReactNode {
  return (
    <DefinitionDrivenConfigForm
      config={genericConfig}
      copy={copy}
      definition={definition}
      isDarkTheme={isDarkTheme}
      onBranchChange={onConfigBranchChange}
      onRendererStateChange={onRendererStateChange}
    />
  );
}

function matchesPresentation(
  input: StrategyPresentationMatchInput,
  matcher: {
    definitionIds: readonly string[];
    presentationKeys: readonly string[];
    strategyTypes: readonly PrototypeStrategyType[];
  },
): boolean {
  const definitionId = normalizeStrategyDefinitionId(input.definition?.id ?? input.definitionId ?? input.strategy?.strategyDefinitionId);
  const strategyType = input.strategy?.strategyType;
  const presentationKey = normalizePresentationKey(presentationKeyFromDefinition(input.definition));
  return matcher.definitionIds.some((id) => normalizeStrategyDefinitionId(id) === definitionId)
    || (strategyType !== undefined && matcher.strategyTypes.includes(strategyType))
    || (presentationKey !== "" && matcher.presentationKeys.some((key) => normalizePresentationKey(key) === presentationKey));
}

function presentationKeyFromDefinition(definition: StrategyPresentationMatchInput["definition"]): string {
  const display = definition?.display as Record<string, unknown> | undefined;
  return typeof display?.presentationKey === "string" ? display.presentationKey : "";
}

function normalizeStrategyDefinitionId(definitionId: string | null | undefined): string {
  return typeof definitionId === "string" ? definitionId.trim().toUpperCase() : "";
}

function normalizePresentationKey(value: string): string {
  return value.trim().toLowerCase();
}

function positivePercentErrors(takeProfitPercent: number, stopLossPercent: number): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(takeProfitPercent) || takeProfitPercent <= 0) {
    errors.push("takeProfitPercent must be a positive number.");
  }
  if (!Number.isFinite(stopLossPercent) || stopLossPercent <= 0) {
    errors.push("stopLossPercent must be a positive number.");
  }
  return errors;
}

function hasConfigurableDefinitionSchema(definition: TradingFoxStrategyDefinition): boolean {
  return hasConfigurableSchema(definition.configSchema)
    || hasConfigurableSchema(definition.strategyConfigSchema)
    || hasConfigurableSchema(definition.strategyUiSchema)
    || hasConfigurableSchema(definition.uiSchema);
}

function hasConfigurableSchema(schema: JsonRecord | undefined): boolean {
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
