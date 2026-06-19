"use client";

import { Card } from "@/components/ui/card";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TradingFoxStrategyDefinition, TradingFoxStrategyDetail } from "@/lib/tradingfox-control-plane";
import type { SignalSourceIdentityById } from "./strategy-detail-shared";
import { StrategySchemaRenderer } from "./strategy-schema-renderer";
import { getInlineErrorClassName } from "./styles";

export function StrategyDetailConfigSection({
  copy,
  detail,
  isDarkTheme,
  signalSourceIdentityById,
  strategyCopy,
  strategyDefinition,
  strategyDefinitionError,
}: {
  copy: WorkspaceCopy;
  detail: TradingFoxStrategyDetail;
  isDarkTheme: boolean;
  signalSourceIdentityById: SignalSourceIdentityById;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  strategyDefinition: TradingFoxStrategyDefinition | null;
  strategyDefinitionError: string;
}) {
  return (
    <Card className={isDarkTheme ? "gap-0 rounded-[24px] border-white/[0.075] bg-white/[0.035] p-4 text-slate-100 shadow-none" : "gap-0 rounded-[24px] border-[#E8E8EC] bg-white p-4 text-slate-950 shadow-sm"}>
      <h3 className="text-sm font-black">{strategyCopy.strategyConfigTitle}</h3>
      <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>{strategyCopy.strategyConfigDescription}</p>
      <div className="mt-3">
        {strategyDefinitionError ? (
          <p className={getInlineErrorClassName(isDarkTheme)}>{strategyDefinitionError}</p>
        ) : strategyDefinition && detail.trader.configSchemaVersion !== strategyDefinition.configSchemaVersion ? (
          <p className={getInlineErrorClassName(isDarkTheme)}>{strategyCopy.strategyConfigVersionMismatch(detail.trader.configSchemaVersion, strategyDefinition.configSchemaVersion)}</p>
        ) : strategyDefinition ? (
          <StrategySchemaRenderer
            copy={copy}
            formData={detail.trader.config}
            isDarkTheme={isDarkTheme}
            mode="readonly"
            schema={strategyDefinition.configSchema}
            signalSourceIdentityById={signalSourceIdentityById}
            uiSchema={strategyDefinition.uiSchema}
          />
        ) : (
          <div className={isDarkTheme ? "text-sm text-slate-500" : "text-sm text-slate-500"}>{strategyCopy.loadingDetail}</div>
        )}
      </div>
    </Card>
  );
}
