"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getWorkspaceLanguageFromLocale, type WorkspaceCopy } from "@/i18n/workspace";
import { fetchUsdtPerpetualMarkets } from "@/lib/binance-market-data";
import type { TradingFoxStrategyDetail } from "@/lib/tradingfox-control-plane";
import { getTradingFoxErrorMessage } from "@/lib/tradingfox-errors";
import type { MarketSymbol } from "@/types/market";
import { createMarioOpenPositionPayload } from "./action-payload";
import { calculateMarioPosition, createMarioTakeProfitTemplate, createPrioritizedMarioMarketSymbols, formatMarioNumber, formatMarioPrice, toMarioEntryAPercent } from "./calculator";
import { MARIO_DEFAULT_TAKE_PROFIT_TARGETS, MARIO_FALLBACK_MARKET_SYMBOLS, MARIO_INITIAL_BUDGET, MARIO_INITIAL_FORM, MARIO_INITIAL_RATIO, MARIO_STRATEGY_ACTION_IDS } from "./constants";
import { getMarioStrategyConsoleCopy } from "./copy";
import { MarioStrategyCalculatorCard } from "./calculator-card";
import { MarioMiniMetric } from "./mini-metric";
import { MarioStrategyPendingOrdersCard, type MarioCancelAction } from "./pending-orders-card";
import { getMarioCardClassName } from "./section-card";
import type { MarioBudgetPercent, MarioCalculatorForm, MarioRewardRiskRatio, MarioTakeProfitTargetConfig, MarioTakeProfitTargetId, MarioTradeDirection } from "./types";
import { requestStrategyAction } from "../signal-workspace/copy-trading-prototype/strategy-detail-utils";

export function MarioStrategyConsole({
  detail,
  isDarkTheme,
  ordersSectionLoaded,
  workspaceCopy,
  onRefresh,
}: {
  detail: TradingFoxStrategyDetail;
  isDarkTheme: boolean;
  ordersSectionLoaded: boolean;
  workspaceCopy: WorkspaceCopy;
  onRefresh: () => Promise<void> | void;
}) {
  const language = getWorkspaceLanguageFromLocale(useLocale());
  const copy = getMarioStrategyConsoleCopy(language);
  const [budget, setBudget] = useState<MarioBudgetPercent>(MARIO_INITIAL_BUDGET);
  const [ratio, setRatio] = useState<MarioRewardRiskRatio>(MARIO_INITIAL_RATIO);
  const [takeProfitTargets, setTakeProfitTargets] = useState<MarioTakeProfitTargetConfig[]>([...MARIO_DEFAULT_TAKE_PROFIT_TARGETS]);
  const [form, setForm] = useState<MarioCalculatorForm>(MARIO_INITIAL_FORM);
  const [marketOptions, setMarketOptions] = useState<MarketSymbol[]>([...MARIO_FALLBACK_MARKET_SYMBOLS]);
  const [marketLoadError, setMarketLoadError] = useState("");
  const [openDirection, setOpenDirection] = useState<MarioTradeDirection | null>(null);
  const [isSubmittingOpen, setIsSubmittingOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const accountBalance = detail.account?.equity ?? detail.strategy.accountEquity ?? 0;
  const calculation = useMemo(
    () => calculateMarioPosition({ accountBalance, budgetPercent: budget, form, takeProfitTargets }),
    [accountBalance, budget, form, takeProfitTargets],
  );

  useEffect(() => {
    let isActive = true;
    fetchUsdtPerpetualMarkets()
      .then((loadedMarkets) => {
        if (!isActive) {
          return;
        }
        setMarketOptions(createPrioritizedMarioMarketSymbols(loadedMarkets));
        setMarketLoadError("");
      })
      .catch(() => {
        if (isActive) {
          setMarketLoadError(copy.marketLoadFailed);
        }
      });
    return () => {
      isActive = false;
    };
  }, [copy.marketLoadFailed]);

  const updateFormField = <TField extends keyof MarioCalculatorForm>(field: TField, value: MarioCalculatorForm[TField]) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const updateEntryAPercent = (value: string) => {
    const percentA = toMarioEntryAPercent(value);
    setForm((currentForm) => ({ ...currentForm, entryB: percentA === 100 ? "" : currentForm.entryB, percentA }));
  };

  const updateTakeProfitTarget = (targetId: MarioTakeProfitTargetId, updates: Partial<MarioTakeProfitTargetConfig>) => {
    setTakeProfitTargets((currentTargets) => currentTargets.map((target) => target.id === targetId ? { ...target, ...updates } : target));
  };

  const changeRatio = (nextRatio: MarioRewardRiskRatio) => {
    setRatio(nextRatio);
    setTakeProfitTargets(createMarioTakeProfitTemplate(nextRatio));
  };

  const submitOpenPosition = async () => {
    if (!openDirection || !calculation.isValidOrder) {
      return;
    }
    setIsSubmittingOpen(true);
    setActionError("");
    setActionMessage("");
    try {
      await requestStrategyAction(String(detail.trader.id), MARIO_STRATEGY_ACTION_IDS.openPosition, createMarioOpenPositionPayload({ calculation, direction: openDirection, ratio, symbol: form.symbol }));
      await onRefresh();
      setActionMessage(copy.planSubmitted);
      setOpenDirection(null);
    } catch (error) {
      setActionError(getTradingFoxErrorMessage(error, workspaceCopy));
    } finally {
      setIsSubmittingOpen(false);
    }
  };

  const submitCancelAction = async (action: MarioCancelAction) => {
    setIsCancelling(true);
    setActionError("");
    setActionMessage("");
    try {
      await requestStrategyAction(String(detail.trader.id), getCancelActionId(action), getCancelActionPayload(action));
      await onRefresh();
      setActionMessage(copy.cancelPlan);
    } catch (error) {
      setActionError(getTradingFoxErrorMessage(error, workspaceCopy));
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <section className="grid gap-4">
      <Card className={getMarioCardClassName(isDarkTheme)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight">{copy.consoleTitle}</h2>
            <p className={isDarkTheme ? "mt-1 max-w-3xl text-xs leading-5 text-slate-400" : "mt-1 max-w-3xl text-xs leading-5 text-slate-600"}>{copy.consoleDescription}</p>
          </div>
          <div className="grid gap-2 text-xs sm:grid-cols-3 lg:min-w-[420px]">
            <MarioMiniMetric isDarkTheme={isDarkTheme} label={workspaceCopy.workspace.accountCenter.strategy.accountEquity} value={accountBalance > 0 ? formatMarioNumber(accountBalance, 2) : "-"} />
            <MarioMiniMetric isDarkTheme={isDarkTheme} label={copy.budget} value={calculation.riskBudget > 0 ? formatMarioNumber(calculation.riskBudget, 2) : "-"} />
            <MarioMiniMetric isDarkTheme={isDarkTheme} label={copy.quantity} value={calculation.totalQuantity > 0 ? formatMarioNumber(calculation.totalQuantity, 8) : "-"} />
          </div>
        </div>
        {actionMessage ? <p className={isDarkTheme ? "mt-3 text-xs font-bold text-emerald-200" : "mt-3 text-xs font-bold text-emerald-700"}>{actionMessage}</p> : null}
        {actionError ? <p className={isDarkTheme ? "mt-3 text-xs font-bold text-rose-200" : "mt-3 text-xs font-bold text-rose-700"}>{actionError}</p> : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <MarioStrategyCalculatorCard
          budget={budget}
          calculation={calculation}
          copy={copy}
          form={form}
          isDarkTheme={isDarkTheme}
          marketLoadError={marketLoadError}
          marketOptions={marketOptions}
          ratio={ratio}
          takeProfitTargets={takeProfitTargets}
          onBudgetChange={setBudget}
          onDirectionSelect={setOpenDirection}
          onEntryAPercentChange={updateEntryAPercent}
          onFormChange={updateFormField}
          onRatioChange={changeRatio}
          onTakeProfitTargetChange={updateTakeProfitTarget}
        />
        <MarioStrategyPendingOrdersCard
          copy={copy}
          detail={detail}
          error={detail.orderHistoryError}
          isCancelling={isCancelling}
          isDarkTheme={isDarkTheme}
          isLoaded={ordersSectionLoaded}
          workspaceCopy={workspaceCopy}
          onCancel={(action) => void submitCancelAction(action)}
        />
      </div>

      {openDirection ? <OpenPositionDialog calculation={calculation} copy={copy} direction={openDirection} form={form} isDarkTheme={isDarkTheme} isSubmitting={isSubmittingOpen} onClose={() => setOpenDirection(null)} onConfirm={() => void submitOpenPosition()} /> : null}
    </section>
  );
}

function OpenPositionDialog({ calculation, copy, direction, form, isDarkTheme, isSubmitting, onClose, onConfirm }: {
  calculation: ReturnType<typeof calculateMarioPosition>;
  copy: ReturnType<typeof getMarioStrategyConsoleCopy>;
  direction: MarioTradeDirection;
  form: MarioCalculatorForm;
  isDarkTheme: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const cancelLabel = useCancelLabel();
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={onClose}>
      <div className={isDarkTheme ? "w-full max-w-md rounded-[24px] border border-white/[0.075] bg-[#181A20] p-5 text-slate-100 shadow-2xl" : "w-full max-w-md rounded-[24px] border border-[#E8E8EC] bg-white p-5 text-slate-950 shadow-2xl"} role="dialog" aria-modal="true" aria-label={copy.confirmOpenTitle} onMouseDown={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-black">{copy.confirmOpenTitle}</h3>
        <div className="mt-4 grid gap-2 text-sm">
          <InfoRow label={copy.direction} value={direction === "long" ? copy.sideLong : copy.sideShort} />
          <InfoRow label={copy.symbol} value={form.symbol} />
          <InfoRow label={copy.entryA} value={formatMarioPrice(calculation.entryA)} />
          {calculation.entryB > 0 ? <InfoRow label={copy.entryB} value={formatMarioPrice(calculation.entryB)} /> : null}
          <InfoRow label={copy.stopLoss} value={formatMarioPrice(calculation.stopLoss)} />
          <InfoRow label={copy.quantity} value={formatMarioNumber(calculation.totalQuantity, 8)} />
          <InfoRow label={copy.estimatedProfit} value={calculation.profit > 0 ? `+${formatMarioNumber(calculation.profit, 2)}` : "-"} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button className={isDarkTheme ? "rounded-2xl border-white/[0.075] bg-white/[0.04] text-slate-200" : "rounded-2xl border-[#E8E8EC] bg-white text-slate-700"} type="button" variant="outline" onClick={onClose}>{cancelLabel}</Button>
          <Button className="rounded-2xl bg-amber-500 font-black text-slate-950 hover:bg-amber-400" disabled={isSubmitting} type="button" onClick={onConfirm}>{isSubmitting ? copy.opening : copy.confirm}</Button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-slate-500">{label}</span><span className="font-mono font-black tabular-nums">{value}</span></div>;
}

function getCancelActionId(action: MarioCancelAction): string {
  if (action.type === "plan") {
    return MARIO_STRATEGY_ACTION_IDS.cancelPlan;
  }
  if (action.type === "long") {
    return MARIO_STRATEGY_ACTION_IDS.cancelLong;
  }
  if (action.type === "short") {
    return MARIO_STRATEGY_ACTION_IDS.cancelShort;
  }
  return MARIO_STRATEGY_ACTION_IDS.cancelAll;
}

function getCancelActionPayload(action: MarioCancelAction): Record<string, unknown> {
  if (action.type !== "plan") {
    return {};
  }
  return { positionSide: action.positionSide, symbol: action.symbol };
}

function useCancelLabel(): string {
  const language = getWorkspaceLanguageFromLocale(useLocale());
  return language === "zh-CN" ? "取消" : "Cancel";
}
