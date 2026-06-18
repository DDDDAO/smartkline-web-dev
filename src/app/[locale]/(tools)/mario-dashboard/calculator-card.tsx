import { MarketSymbolSearchInput } from "@/components/market/market-symbol-search-input";
import type { MarketSymbol } from "@/app/_types/market";
import {
  BUDGET_OPTIONS,
  PERCENT_A_OPTIONS,
  RATIO_OPTIONS,
} from "./constants";
import { LayersIcon } from "./icons";
import type { ThemeClasses } from "./theme";
import type { BudgetPercent, Calculation, CalculatorForm, DashboardState, RewardRiskRatio, TakeProfitTargetId, TradeDirection } from "./types";
import { ActionButton, CalculatedValue, Card, FormRow, SegmentedButtons } from "./ui";
import {
  getBudgetTone,
  getMarketBaseSymbol,
  getRatioTone,
  sanitizeDecimalInput,
  toRewardRiskRatio,
  toTakeProfitClosePercent,
  toUsdtPerpetualMarketSymbol,
} from "./utils";

type CalculatorCardProps = {
  calculation: Calculation;
  dashboardState: DashboardState;
  form: CalculatorForm;
  isDarkTheme: boolean;
  marketOptions: MarketSymbol[];
  theme: ThemeClasses;
  onConfirmDirection: (direction: TradeDirection) => void;
  onSelectBudget: (budget: BudgetPercent) => void;
  onSelectRatio: (ratio: RewardRiskRatio) => void;
  onUpdateEntryAPercent: (value: string) => void;
  onUpdateFormField: <TField extends keyof CalculatorForm>(field: TField, value: CalculatorForm[TField]) => void;
  onUpdateTakeProfitTarget: (targetId: TakeProfitTargetId, updates: Partial<DashboardState["takeProfitTargets"][number]>) => void;
};

export function CalculatorCard({
  calculation,
  dashboardState,
  form,
  isDarkTheme,
  marketOptions,
  onConfirmDirection,
  onSelectBudget,
  onSelectRatio,
  onUpdateEntryAPercent,
  onUpdateFormField,
  onUpdateTakeProfitTarget,
  theme,
}: CalculatorCardProps) {
  return (
    <Card title="坐标定位/持仓计算" icon={<LayersIcon />} theme={theme}>
      <div className="form-grid">
        <FormRow label="币种" theme={theme}>
          <MarketSymbolSearchInput
            formatSymbolLabel={getMarketBaseSymbol}
            id="mario-dashboard-symbol-search"
            isDarkTheme={isDarkTheme}
            marketOptions={marketOptions}
            noMatchesLabel="没有匹配币种"
            placeholder="搜索币种"
            symbol={toUsdtPerpetualMarketSymbol(form.symbol)}
            variant="mario"
            onSymbolChange={(symbol) => onUpdateFormField("symbol", getMarketBaseSymbol(symbol))}
          />
        </FormRow>

        <FormRow label="预算" theme={theme}>
          <SegmentedButtons
            options={BUDGET_OPTIONS}
            value={dashboardState.budget}
            getLabel={(value) => `${value}%`}
            getTone={getBudgetTone}
            onChange={onSelectBudget}
          />
        </FormRow>

        <FormRow label="止损位" theme={theme}>
          <input
            id="stopLoss"
            inputMode="decimal"
            placeholder="价格"
            value={form.stopLoss}
            onChange={(event) => onUpdateFormField("stopLoss", sanitizeDecimalInput(event.target.value))}
          />
        </FormRow>

        <FormRow label="开仓点A" theme={theme}>
          <input
            id="entryA"
            inputMode="decimal"
            placeholder="价格"
            value={form.entryA}
            onChange={(event) => onUpdateFormField("entryA", sanitizeDecimalInput(event.target.value))}
          />
          {calculation.entryAWarning ? <span className="warning">{calculation.entryAWarning}</span> : null}
          <select
            id="percentA"
            value={form.percentA}
            onChange={(event) => onUpdateEntryAPercent(event.target.value)}
          >
            {PERCENT_A_OPTIONS.map((percent) => <option key={percent} value={percent}>{percent}%</option>)}
          </select>
        </FormRow>

        <FormRow label="可开数量" theme={theme}>
          <CalculatedValue theme={theme} value={calculation.amountA > 0 ? calculation.amountA.toFixed(2) : "-"} />
        </FormRow>

        <FormRow label="开仓点B" theme={theme}>
          <input
            id="entryB"
            disabled={calculation.entryBDisabled}
            inputMode="decimal"
            placeholder="价格"
            style={{ flex: "0 0 80px" }}
            value={form.entryB}
            onChange={(event) => onUpdateFormField("entryB", sanitizeDecimalInput(event.target.value))}
          />
          {calculation.entryBWarning ? <span className="warning">{calculation.entryBWarning}</span> : null}
        </FormRow>

        <FormRow label="可开数量" theme={theme}>
          <CalculatedValue theme={theme} value={calculation.amountB > 0 ? calculation.amountB.toFixed(2) : "-"} />
        </FormRow>

        <FormRow label="剩余仓位" theme={theme}>
          <CalculatedValue theme={theme} value={`${calculation.remainPercent}%`} />
        </FormRow>

        <FormRow label="盈亏比" theme={theme}>
          <SegmentedButtons
            options={RATIO_OPTIONS}
            value={dashboardState.ratio}
            getLabel={(value) => `1:${value}`}
            getTone={getRatioTone}
            onChange={onSelectRatio}
          />
        </FormRow>

        <FormRow label="分批止盈" theme={theme}>
          <div className="take-profit-plan" aria-label="分批止盈设置">
            <div className="take-profit-plan-header">
              <span>目标 / 盈亏比 / 仓位 / 价格</span>
              <span className={calculation.takeProfitPlanWarning ? "loss" : "profit"}>合计 {calculation.takeProfitClosePercentTotal}%</span>
            </div>
            {dashboardState.takeProfitTargets.map((target, index) => {
              const calculatedTarget = calculation.takeProfitTargets.find((calculated) => calculated.id === target.id);
              return (
                <div key={target.id} className="take-profit-target-row">
                  <span className="take-profit-target-name">TP{index + 1}</span>
                  <select
                    aria-label={`TP${index + 1} 盈亏比`}
                    value={target.ratio}
                    onChange={(event) => onUpdateTakeProfitTarget(target.id, { ratio: toRewardRiskRatio(event.target.value) })}
                  >
                    {RATIO_OPTIONS.map((ratio) => <option key={ratio} value={ratio}>1:{ratio}</option>)}
                  </select>
                  <input
                    aria-label={`TP${index + 1} 平仓比例`}
                    inputMode="numeric"
                    maxLength={3}
                    value={target.closePercent}
                    onChange={(event) => onUpdateTakeProfitTarget(target.id, { closePercent: toTakeProfitClosePercent(event.target.value) })}
                  />
                  <span className="take-profit-target-price">{calculatedTarget && calculatedTarget.price > 0 ? calculatedTarget.price.toFixed(2) : "-"}</span>
                </div>
              );
            })}
            {calculation.takeProfitPlanWarning ? <span className="warning">{calculation.takeProfitPlanWarning}</span> : null}
          </div>
        </FormRow>

        <FormRow label="参考止盈位" theme={theme}>
          <CalculatedValue theme={theme} value={calculation.takeProfit > 0 ? calculation.takeProfit.toFixed(2) : "-"} />
        </FormRow>

        <FormRow label="止盈利润" theme={theme}>
          <CalculatedValue theme={theme} value={calculation.profit > 0 ? `+${calculation.profit.toFixed(2)}` : "-"} />
        </FormRow>
      </div>

      <div className="action-btns">
        <ActionButton disabled={!calculation.canPlaceLong} tone="long" onClick={() => onConfirmDirection("long")}>开多</ActionButton>
        <ActionButton disabled={!calculation.canPlaceShort} tone="short" onClick={() => onConfirmDirection("short")}>开空</ActionButton>
      </div>
    </Card>
  );
}
