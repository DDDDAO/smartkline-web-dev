"use client";

import type { WorkspaceCopy } from "@/app/_lib/i18n";
import type { TradingFoxStrategyDefinition, TradingFoxStrategyDetail } from "@/app/_lib/tradingfox-control-plane";
import { StrategySchemaRenderer } from "./strategy-schema-renderer";
import { getInlineErrorClassName, getModalSectionClassName } from "./styles";

export function StrategyDetailConfigSection({
  detail,
  isDarkTheme,
  strategyCopy,
  strategyDefinition,
  strategyDefinitionError,
}: {
  detail: TradingFoxStrategyDetail;
  isDarkTheme: boolean;
  strategyCopy: WorkspaceCopy["workspace"]["accountCenter"]["strategy"];
  strategyDefinition: TradingFoxStrategyDefinition | null;
  strategyDefinitionError: string;
}) {
  return (
    <section className={getModalSectionClassName(isDarkTheme)}>
      <h3 className="text-sm font-black">{strategyCopy.strategyConfigTitle}</h3>
      <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>{strategyCopy.strategyConfigDescription}</p>
      <div className="mt-3">
        {strategyDefinitionError ? (
          <p className={getInlineErrorClassName(isDarkTheme)}>{strategyDefinitionError}</p>
        ) : strategyDefinition && detail.trader.configSchemaVersion !== strategyDefinition.configSchemaVersion ? (
          <p className={getInlineErrorClassName(isDarkTheme)}>{strategyCopy.strategyConfigVersionMismatch(detail.trader.configSchemaVersion, strategyDefinition.configSchemaVersion)}</p>
        ) : strategyDefinition ? (
          <StrategySchemaRenderer
            formData={detail.trader.config}
            isDarkTheme={isDarkTheme}
            mode="readonly"
            schema={strategyDefinition.configSchema}
            uiSchema={strategyDefinition.uiSchema}
          />
        ) : (
          <div className={isDarkTheme ? "text-sm text-slate-500" : "text-sm text-slate-500"}>{strategyCopy.loadingDetail}</div>
        )}
      </div>
    </section>
  );
}
