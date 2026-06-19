import type { ReactNode } from "react";
import { MarketSymbolSearchInput } from "@/components/market/market-symbol-search-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MarketSymbol } from "@/types/market";
import { MARIO_BUDGET_OPTIONS, MARIO_PERCENT_A_OPTIONS, MARIO_RATIO_OPTIONS } from "./constants";
import {
  formatMarioNumber,
  formatMarioPrice,
  getMarioMarketBaseSymbol,
  sanitizeMarioDecimalInput,
  toMarioRewardRiskRatio,
  toMarioTakeProfitClosePercent,
  toMarioUsdtPerpetualMarketSymbol,
} from "./calculator";
import type { MarioStrategyConsoleCopy } from "./copy";
import { LayersIcon, MarioSectionCard } from "./section-card";
import type { MarioBudgetPercent, MarioCalculation, MarioCalculatorForm, MarioRewardRiskRatio, MarioTakeProfitTargetConfig, MarioTakeProfitTargetId, MarioTradeDirection } from "./types";

export function MarioStrategyCalculatorCard({
  calculation,
  copy,
  budget,
  form,
  isDarkTheme,
  marketOptions,
  marketLoadError,
  ratio,
  takeProfitTargets,
  onBudgetChange,
  onDirectionSelect,
  onEntryAPercentChange,
  onFormChange,
  onRatioChange,
  onTakeProfitTargetChange,
}: {
  calculation: MarioCalculation;
  copy: MarioStrategyConsoleCopy;
  budget: MarioBudgetPercent;
  form: MarioCalculatorForm;
  isDarkTheme: boolean;
  marketLoadError: string;
  marketOptions: readonly MarketSymbol[];
  ratio: MarioRewardRiskRatio;
  takeProfitTargets: readonly MarioTakeProfitTargetConfig[];
  onBudgetChange: (budget: MarioBudgetPercent) => void;
  onDirectionSelect: (direction: MarioTradeDirection) => void;
  onEntryAPercentChange: (value: string) => void;
  onFormChange: <TField extends keyof MarioCalculatorForm>(field: TField, value: MarioCalculatorForm[TField]) => void;
  onRatioChange: (ratio: MarioRewardRiskRatio) => void;
  onTakeProfitTargetChange: (targetId: MarioTakeProfitTargetId, updates: Partial<MarioTakeProfitTargetConfig>) => void;
}) {
  return (
    <MarioSectionCard description={copy.budgetHint} icon={<LayersIcon />} isDarkTheme={isDarkTheme} title="坐标定位/持仓计算">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label={copy.symbol}>
          <MarketSymbolSearchInput
            formatSymbolLabel={getMarioMarketBaseSymbol}
            id="mario-strategy-symbol-search"
            isDarkTheme={isDarkTheme}
            marketOptions={marketOptions}
            noMatchesLabel={copy.noMatches}
            placeholder={copy.searchSymbol}
            symbol={toMarioUsdtPerpetualMarketSymbol(form.symbol)}
            onSymbolChange={(symbol) => onFormChange("symbol", getMarioMarketBaseSymbol(symbol))}
          />
        </Field>
        <Field label={copy.budget}>
          <SegmentedButtons options={MARIO_BUDGET_OPTIONS} value={budget} getLabel={(value) => `${value}%`} isDarkTheme={isDarkTheme} onChange={onBudgetChange} />
        </Field>
        <Field label={copy.stopLoss}>
          <Input className={inputClassName(isDarkTheme)} inputMode="decimal" placeholder="0.00" value={form.stopLoss} onChange={(event) => onFormChange("stopLoss", sanitizeMarioDecimalInput(event.target.value))} />
        </Field>
        <Field label={copy.entryA}>
          <div className="grid grid-cols-[1fr_92px] gap-2">
            <Input className={inputClassName(isDarkTheme)} inputMode="decimal" placeholder="0.00" value={form.entryA} onChange={(event) => onFormChange("entryA", sanitizeMarioDecimalInput(event.target.value))} />
            <Select value={String(form.percentA)} onValueChange={onEntryAPercentChange}>
              <SelectTrigger className={selectTriggerClassName(isDarkTheme)}><SelectValue /></SelectTrigger>
              <SelectContent className={selectContentClassName(isDarkTheme)}>{MARIO_PERCENT_A_OPTIONS.map((percent) => <SelectItem key={percent} value={String(percent)}>{percent}%</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Warning isDarkTheme={isDarkTheme} value={calculation.entryAWarning} />
        </Field>
        <Field label={copy.availableQuantity}><Readout isDarkTheme={isDarkTheme} value={calculation.amountA > 0 ? formatMarioNumber(calculation.amountA, 8) : "-"} /></Field>
        <Field label={copy.entryB}>
          <Input className={inputClassName(isDarkTheme)} disabled={calculation.entryBDisabled} inputMode="decimal" placeholder="0.00" value={form.entryB} onChange={(event) => onFormChange("entryB", sanitizeMarioDecimalInput(event.target.value))} />
          <Warning isDarkTheme={isDarkTheme} value={calculation.entryBWarning} />
        </Field>
        <Field label={copy.availableQuantity}><Readout isDarkTheme={isDarkTheme} value={calculation.amountB > 0 ? formatMarioNumber(calculation.amountB, 8) : "-"} /></Field>
        <Field label={copy.remainingPosition}><Readout isDarkTheme={isDarkTheme} value={`${calculation.remainPercent}%`} /></Field>
        <Field label={copy.riskRewardRatio}>
          <SegmentedButtons options={MARIO_RATIO_OPTIONS} value={ratio} getLabel={(value) => `1:${value}`} isDarkTheme={isDarkTheme} onChange={onRatioChange} />
        </Field>
      </div>
      <TakeProfitEditor copy={copy} calculation={calculation} isDarkTheme={isDarkTheme} targets={takeProfitTargets} onChange={onTakeProfitTargetChange} />
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Field label={copy.takeProfit}><Readout isDarkTheme={isDarkTheme} value={calculation.takeProfit > 0 ? formatMarioPrice(calculation.takeProfit) : "-"} /></Field>
        <Field label={copy.estimatedProfit}><Readout isDarkTheme={isDarkTheme} value={calculation.profit > 0 ? `+${formatMarioNumber(calculation.profit, 2)}` : "-"} /></Field>
        <Field label={copy.quantity}><Readout isDarkTheme={isDarkTheme} value={calculation.totalQuantity > 0 ? formatMarioNumber(calculation.totalQuantity, 8) : "-"} /></Field>
      </div>
      {marketLoadError ? <p className={isDarkTheme ? "mt-3 text-xs font-bold text-amber-200" : "mt-3 text-xs font-bold text-amber-700"}>{marketLoadError}</p> : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <ActionButton disabled={!calculation.canPlaceLong} isDarkTheme={isDarkTheme} tone="long" onClick={() => onDirectionSelect("long")}>{copy.openLong}</ActionButton>
        <ActionButton disabled={!calculation.canPlaceShort} isDarkTheme={isDarkTheme} tone="short" onClick={() => onDirectionSelect("short")}>{copy.openShort}</ActionButton>
      </div>
    </MarioSectionCard>
  );
}

function TakeProfitEditor({ calculation, copy, isDarkTheme, targets, onChange }: {
  calculation: MarioCalculation;
  copy: MarioStrategyConsoleCopy;
  isDarkTheme: boolean;
  targets: readonly MarioTakeProfitTargetConfig[];
  onChange: (targetId: MarioTakeProfitTargetId, updates: Partial<MarioTakeProfitTargetConfig>) => void;
}) {
  return (
    <div className={isDarkTheme ? "mt-4 rounded-2xl border border-white/[0.075] bg-[#0F131A]/60 p-3" : "mt-4 rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] p-3"}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black">
        <span>{copy.takeProfitPlan}</span>
        <span className={calculation.takeProfitPlanWarning ? "text-rose-500" : "text-emerald-500"}>{copy.totalClosePercent(calculation.takeProfitClosePercentTotal)}</span>
      </div>
      <div className="mt-3 grid gap-2">
        {targets.map((target, index) => <TakeProfitRow key={target.id} calculatedPrice={calculation.takeProfitTargets[index]?.price ?? 0} index={index} isDarkTheme={isDarkTheme} target={target} onChange={onChange} />)}
      </div>
      <Warning isDarkTheme={isDarkTheme} value={calculation.takeProfitPlanWarning} />
    </div>
  );
}

function TakeProfitRow({ calculatedPrice, index, isDarkTheme, target, onChange }: {
  calculatedPrice: number;
  index: number;
  isDarkTheme: boolean;
  target: MarioTakeProfitTargetConfig;
  onChange: (targetId: MarioTakeProfitTargetId, updates: Partial<MarioTakeProfitTargetConfig>) => void;
}) {
  return (
    <div className="grid grid-cols-[44px_92px_1fr_92px] items-center gap-2">
      <span className="text-xs font-black">TP{index + 1}</span>
      <Select value={String(target.ratio)} onValueChange={(value) => onChange(target.id, { ratio: toMarioRewardRiskRatio(value) })}>
        <SelectTrigger className={selectTriggerClassName(isDarkTheme)}><SelectValue /></SelectTrigger>
        <SelectContent className={selectContentClassName(isDarkTheme)}>{MARIO_RATIO_OPTIONS.map((ratio) => <SelectItem key={ratio} value={String(ratio)}>1:{ratio}</SelectItem>)}</SelectContent>
      </Select>
      <Input className={inputClassName(isDarkTheme)} inputMode="numeric" maxLength={3} value={String(target.closePercent)} onChange={(event) => onChange(target.id, { closePercent: toMarioTakeProfitClosePercent(event.target.value) })} />
      <span className="font-mono text-xs font-black tabular-nums">{calculatedPrice > 0 ? formatMarioPrice(calculatedPrice) : "-"}</span>
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <div className="grid gap-1.5 text-xs font-black"><div>{label}</div><div>{children}</div></div>;
}

function Readout({ isDarkTheme, value }: { isDarkTheme: boolean; value: string }) {
  return <div className={isDarkTheme ? "min-h-10 rounded-2xl bg-white/[0.04] px-3 py-2 font-mono text-sm font-black" : "min-h-10 rounded-2xl bg-white px-3 py-2 font-mono text-sm font-black shadow-sm"}>{value}</div>;
}

function Warning({ isDarkTheme, value }: { isDarkTheme: boolean; value: string }) {
  return value ? <p className={isDarkTheme ? "mt-1 text-xs font-bold text-amber-200" : "mt-1 text-xs font-bold text-amber-700"}>{value}</p> : null;
}

function SegmentedButtons<TValue extends number>({ getLabel, isDarkTheme, onChange, options, value }: { getLabel: (value: TValue) => string; isDarkTheme: boolean; onChange: (value: TValue) => void; options: readonly TValue[]; value: TValue }) {
  return <div className="grid grid-cols-4 gap-1">{options.map((option) => <Button key={option} className={segmentClassName(isDarkTheme, option === value)} type="button" variant="outline" onClick={() => onChange(option)}>{getLabel(option)}</Button>)}</div>;
}

function ActionButton({ children, disabled, isDarkTheme, onClick, tone }: { children: ReactNode; disabled?: boolean; isDarkTheme: boolean; onClick: () => void; tone: "long" | "short" }) {
  const enabledClassName = tone === "long" ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-rose-500 text-white hover:bg-rose-600";
  return <Button className={`min-h-11 rounded-2xl font-black ${disabled ? "opacity-50" : enabledClassName} ${isDarkTheme && disabled ? "bg-white/[0.04] text-slate-500" : ""}`} disabled={disabled} type="button" onClick={onClick}>{children}</Button>;
}

function inputClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "h-10 rounded-2xl border-white/[0.075] bg-white/[0.04] font-mono text-sm text-slate-100" : "h-10 rounded-2xl border-[#E8E8EC] bg-white font-mono text-sm text-slate-950";
}

function selectTriggerClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "h-10 rounded-2xl border-white/[0.075] bg-white/[0.04] text-xs font-black text-slate-100" : "h-10 rounded-2xl border-[#E8E8EC] bg-white text-xs font-black text-slate-950";
}

function selectContentClassName(isDarkTheme: boolean): string {
  return isDarkTheme ? "z-[180] rounded-2xl border-white/[0.075] bg-[#181A20] text-slate-100" : "z-[180] rounded-2xl border-[#E8E8EC] bg-white text-slate-950";
}

function segmentClassName(isDarkTheme: boolean, isActive: boolean): string {
  if (isActive) {
    return isDarkTheme ? "h-10 rounded-2xl border-amber-300/30 bg-amber-300/15 text-amber-200" : "h-10 rounded-2xl border-amber-200 bg-amber-50 text-amber-700";
  }
  return isDarkTheme ? "h-10 rounded-2xl border-white/[0.075] bg-white/[0.04] text-slate-400" : "h-10 rounded-2xl border-[#E8E8EC] bg-white text-slate-600";
}
