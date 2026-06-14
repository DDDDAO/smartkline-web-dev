"use client";

import { useEffect, useMemo, useState } from "react";
import { MiniKlineCard } from "./mini-kline-card";
import { PendingOrdersCard } from "./pending-orders-card";
import { HistoryCard, PositionsCard } from "./position-history-cards";
import { SymbolPicker } from "./symbol-picker";
import {
  ACCOUNT_BALANCE,
  BINANCE_PRICE_UPDATE_INTERVAL_MS,
  BUDGET_OPTIONS,
  COUNTDOWN_URGENT_MS,
  FALLBACK_SYMBOLS,
  INITIAL_DASHBOARD_STATE,
  INITIAL_FORM,
  MAX_COUNTDOWNS,
  MOCK_HISTORY,
  MOCK_POSITIONS,
  PERCENT_A_OPTIONS,
  QUOTE_ROTATE_MS,
  QUOTES,
  RATIO_OPTIONS,
  STORAGE_KEY,
} from "./constants";
import { ClockIcon, LayersIcon, MoonIcon, SettingsIcon, SunIcon } from "./icons";
import { getThemeClasses } from "./theme";
import type { BulkAction, BudgetPercent, CalculatorForm, DashboardState, PendingOrder, RewardRiskRatio, TradeDirection } from "./types";
import { ActionButton, CalculatedValue, Card, FormRow, IconButton, InfoRow, Modal, ModalActions, OverviewItem, SegmentedButtons } from "./ui";
import {
  calculatePosition,
  createPrioritizedBaseSymbols,
  formatAmount,
  formatCountdown,
  formatLivePrice,
  formatNumber,
  formatPrice,
  formatSignedNumber,
  getActiveCountdowns,
  getBudgetTone,
  getBulkOrderLabel,
  getBulkOrderNotice,
  getBulkPositionLabel,
  getHeaderTimerClassName,
  getRatioTone,
  parsePositiveInteger,
  parseStoredDashboardState,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
  toEntryAPercent,
} from "./utils";
import { fetchUsdtPerpetualMarkets } from "@/app/_lib/binance-market-data";
import {
  readBinanceMiniTickerPrice,
  useBinanceMiniTickerPrices,
} from "@/app/_components/signal-workspace/use-binance-mini-ticker-prices";

export function MarioDashboard() {
  const [dashboardState, setDashboardState] = useState<DashboardState>(INITIAL_DASHBOARD_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [form, setForm] = useState<CalculatorForm>(INITIAL_FORM);
  const [now, setNow] = useState<number | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [confirmDirection, setConfirmDirection] = useState<TradeDirection | null>(null);
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [isCountdownModalOpen, setIsCountdownModalOpen] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [countdownInput, setCountdownInput] = useState({ days: "", hours: "", minutes: "" });
  const [countdownError, setCountdownError] = useState("");
  const [apiInput, setApiInput] = useState({ key: "", secret: "" });
  const [apiError, setApiError] = useState("");
  const [notice, setNotice] = useState("");
  const [symbolOptions, setSymbolOptions] = useState<string[]>([...FALLBACK_SYMBOLS]);
  const [isSymbolOptionsLoading, setIsSymbolOptionsLoading] = useState(true);
  const [symbolOptionsError, setSymbolOptionsError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const rawState = window.localStorage.getItem(STORAGE_KEY);
        setDashboardState(parseStoredDashboardState(rawState));
      } catch {
        setDashboardState(INITIAL_DASHBOARD_STATE);
      } finally {
        setIsHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboardState));
    } catch {
      // Local persistence is optional; the trading simulator must still work in restricted browsers.
    }
  }, [dashboardState, isHydrated]);

  useEffect(() => {
    const syncClock = () => {
      const currentNow = Date.now();
      setNow(currentNow);
      setDashboardState((currentState) => {
        const activeCountdowns = currentState.countdowns.filter((countdown) => countdown.targetTime > currentNow);
        if (activeCountdowns.length === currentState.countdowns.length) {
          return currentState;
        }

        return { ...currentState, countdowns: activeCountdowns };
      });
    };

    const timeoutId = window.setTimeout(syncClock, 0);
    const intervalId = window.setInterval(syncClock, 1_000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setQuoteIndex((currentIndex) => (currentIndex + 1) % QUOTES.length);
    }, QUOTE_ROTATE_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let isActive = true;

    fetchUsdtPerpetualMarkets()
      .then((loadedMarkets) => {
        if (!isActive) {
          return;
        }

        const loadedSymbols = createPrioritizedBaseSymbols(loadedMarkets);
        setSymbolOptions(loadedSymbols.length > 0 ? loadedSymbols : [...FALLBACK_SYMBOLS]);
        setSymbolOptionsError(null);
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setSymbolOptions([...FALLBACK_SYMBOLS]);
        setSymbolOptionsError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (isActive) {
          setIsSymbolOptionsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => setNotice(""), 3_200);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const calculation = useMemo(
    () => calculatePosition(form, dashboardState.budget, dashboardState.ratio),
    [dashboardState.budget, dashboardState.ratio, form],
  );
  const binanceMarketSymbol = useMemo(() => `${form.symbol}/USDT:USDT`, [form.symbol]);
  const binancePriceSymbols = useMemo(() => [binanceMarketSymbol], [binanceMarketSymbol]);
  const { latestPricesBySymbol } = useBinanceMiniTickerPrices(binancePriceSymbols, {
    updateIntervalMs: BINANCE_PRICE_UPDATE_INTERVAL_MS,
  });
  const selectedBinancePrice = readBinanceMiniTickerPrice(latestPricesBySymbol, binanceMarketSymbol);

  const activeCountdowns = useMemo(
    () => getActiveCountdowns(dashboardState.countdowns, now),
    [dashboardState.countdowns, now],
  );

  const pendingLongOrders = dashboardState.orders.filter((order) => order.direction === "long" && order.status === "pending");
  const pendingShortOrders = dashboardState.orders.filter((order) => order.direction === "short" && order.status === "pending");
  const longPositions = MOCK_POSITIONS.filter((position) => position.direction === "long");
  const shortPositions = MOCK_POSITIONS.filter((position) => position.direction === "short");
  const totalPnl = MOCK_POSITIONS.reduce((sum, position) => sum + position.pnl, 0);

  const updateFormField = <TField extends keyof CalculatorForm>(field: TField, value: CalculatorForm[TField]) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const selectBudget = (budget: BudgetPercent) => {
    setDashboardState((currentState) => ({ ...currentState, budget }));
  };

  const selectRatio = (ratio: RewardRiskRatio) => {
    setDashboardState((currentState) => ({ ...currentState, ratio }));
  };

  const openConfirmModal = (direction: TradeDirection) => {
    if (!calculation.isValidOrder) {
      setNotice("请先填写有效的止损位和开仓点。");
      return;
    }

    setConfirmDirection(direction);
  };

  const confirmOrder = () => {
    if (!confirmDirection || !calculation.isValidOrder) {
      return;
    }

    const nextOrder: PendingOrder = {
      amountA: calculation.amountA,
      amountB: calculation.amountB,
      direction: confirmDirection,
      entryA: calculation.entryA,
      entryB: calculation.entryB,
      id: Date.now(),
      status: "pending",
      stopLoss: calculation.stopLoss,
      symbol: form.symbol,
    };

    setDashboardState((currentState) => ({
      ...currentState,
      orders: [nextOrder, ...currentState.orders],
    }));
    setConfirmDirection(null);
    setNotice("模拟挂单已创建，当前不会触发真实交易。");
  };

  const cancelOrder = (orderId: number) => {
    setDashboardState((currentState) => ({
      ...currentState,
      orders: currentState.orders.filter((order) => order.id !== orderId),
    }));
  };

  const confirmBulkAction = () => {
    if (!bulkAction) {
      return;
    }

    if (bulkAction.source === "order") {
      setDashboardState((currentState) => ({
        ...currentState,
        orders: bulkAction.type === "all"
          ? []
          : currentState.orders.filter((order) => order.direction !== bulkAction.type),
      }));
      setNotice(getBulkOrderNotice(bulkAction.type));
    } else {
      setNotice(`模拟平仓完成：${getBulkPositionLabel(bulkAction.type)}`);
    }

    setBulkAction(null);
  };

  const openCountdownModal = () => {
    setCountdownInput({ days: "", hours: "", minutes: "" });
    setCountdownError("");
    setIsCountdownModalOpen(true);
  };

  const addCountdown = () => {
    const days = parsePositiveInteger(countdownInput.days);
    const hours = parsePositiveInteger(countdownInput.hours);
    const minutes = parsePositiveInteger(countdownInput.minutes);
    const totalMs = (days * 24 * 60 + hours * 60 + minutes) * 60 * 1_000;

    if (totalMs <= 0) {
      setCountdownError("请输入一个大于 0 的倒计时。");
      return;
    }

    if (activeCountdowns.length >= MAX_COUNTDOWNS) {
      setCountdownError("最多只能添加 2 个倒计时。");
      return;
    }

    setDashboardState((currentState) => ({
      ...currentState,
      countdowns: [
        ...activeCountdowns,
        { id: Date.now(), targetTime: Date.now() + totalMs },
      ],
    }));
    setCountdownInput({ days: "", hours: "", minutes: "" });
    setCountdownError("");
    setIsCountdownModalOpen(false);
  };

  const deleteCountdown = (countdownId: number) => {
    setDashboardState((currentState) => ({
      ...currentState,
      countdowns: currentState.countdowns.filter((countdown) => countdown.id !== countdownId),
    }));
  };

  const bindApi = () => {
    if (apiInput.key.trim().length < 5 || apiInput.secret.trim().length < 5) {
      setApiError("API Key 和 Secret Key 长度不足。");
      return;
    }

    setDashboardState((currentState) => ({ ...currentState, apiBound: true }));
    setApiInput({ key: "", secret: "" });
    setApiError("");
    setIsApiModalOpen(false);
    setNotice("API 已模拟绑定；密钥没有保存到浏览器状态里。");
  };

  const theme = getThemeClasses(dashboardState.darkMode);
  const currentNow = now ?? 0;
  const headerCountdownText = activeCountdowns
    .map((countdown) => formatCountdown(countdown.targetTime - currentNow))
    .join(" | ");
  const firstCountdownRemaining = activeCountdowns[0] ? activeCountdowns[0].targetTime - currentNow : null;

  return (
    <main className={theme.page}>
      <div className="mx-auto max-w-[1280px] px-3 py-3 font-mono text-[12px] leading-6 sm:px-4 sm:py-4">
        {notice ? <div className={theme.notice}>{notice}</div> : null}

        <section className={theme.titleCard}>
          <div className="relative flex min-h-[220px] flex-col justify-between gap-5 pr-32">
            <div className="min-w-0 space-y-2">
              {activeCountdowns.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className={getHeaderTimerClassName(firstCountdownRemaining)}>{headerCountdownText}</span>
                </div>
              ) : null}
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                <h1 className="text-[22px] font-black tracking-[-0.04em] sm:text-[28px]">马里奥的狙击台</h1>
                <span className={theme.quote}>{QUOTES[quoteIndex]}</span>
              </div>
            </div>

            <div className="absolute right-0 top-0 flex shrink-0 justify-end gap-2">
              <IconButton label="倒计时" theme={theme} onClick={openCountdownModal}>
                <ClockIcon />
              </IconButton>
              <IconButton
                label="切换主题"
                theme={theme}
                onClick={() => setDashboardState((currentState) => ({ ...currentState, darkMode: !currentState.darkMode }))}
              >
                {dashboardState.darkMode ? <MoonIcon /> : <SunIcon />}
              </IconButton>
              <IconButton label="系统设置" theme={theme} onClick={() => setIsApiModalOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </div>

            <div className="grid max-w-[760px] grid-cols-2 gap-2 sm:grid-cols-4">
              <OverviewItem label="保证金余额 (U)" theme={theme} value={formatNumber(ACCOUNT_BALANCE)} />
              <OverviewItem label="仓位数量" theme={theme} value={String(MOCK_POSITIONS.length)} />
              <OverviewItem label="实际杠杆" theme={theme} value="5x" />
              <OverviewItem label="浮盈亏 (U)" tone={totalPnl >= 0 ? "up" : "down"} theme={theme} value={formatSignedNumber(totalPnl)} />
              <OverviewItem label="胜率" theme={theme} value="65%" />
              <OverviewItem label="交易次数" theme={theme} value="42" />
              <OverviewItem label="平均盈利 (U)" tone="up" theme={theme} value="+380" />
              <OverviewItem label="平均亏损 (U)" tone="down" theme={theme} value="-195" />
            </div>
          </div>
        </section>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start">
          <div className="flex flex-col">
            <MiniKlineCard
              currentNow={currentNow}
              isDarkTheme={dashboardState.darkMode}
              price={selectedBinancePrice}
              symbol={form.symbol}
              theme={theme}
            />

            <PositionsCard
              longPositions={longPositions}
              shortPositions={shortPositions}
              theme={theme}
              onOpenBulkAction={(type) => setBulkAction({ source: "position", type })}
            />
            <HistoryCard history={MOCK_HISTORY} theme={theme} />
          </div>

          <div className="flex flex-col xl:sticky xl:top-4">
            <Card title="坐标定位/持仓计算" icon={<LayersIcon />} theme={theme}>
              <div className="flex flex-col gap-2">
                <FormRow label="币种" theme={theme}>
                  <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-1.5">
                    <SymbolPicker
                      key={form.symbol}
                      error={symbolOptionsError}
                      isLoading={isSymbolOptionsLoading}
                      options={symbolOptions}
                      theme={theme}
                      value={form.symbol}
                      onChange={(symbol) => updateFormField("symbol", symbol)}
                    />
                    <div className={theme.inlinePrice}>BN {formatLivePrice(selectedBinancePrice)}</div>
                  </div>
                </FormRow>

                <FormRow label="预算" theme={theme}>
                  <SegmentedButtons
                    options={BUDGET_OPTIONS}
                    value={dashboardState.budget}
                    getLabel={(value) => `${value}%`}
                    getTone={getBudgetTone}
                    onChange={selectBudget}
                  />
                </FormRow>

                <FormRow label="止损位" theme={theme}>
                  <input
                    className={theme.input}
                    inputMode="decimal"
                    placeholder="价格"
                    value={form.stopLoss}
                    onChange={(event) => updateFormField("stopLoss", sanitizeDecimalInput(event.target.value))}
                  />
                </FormRow>

                <FormRow label="开仓点A" theme={theme}>
                  <div className="flex min-w-0 flex-1 gap-1">
                    <input
                      className={theme.input}
                      inputMode="decimal"
                      placeholder="价格"
                      value={form.entryA}
                      onChange={(event) => updateFormField("entryA", sanitizeDecimalInput(event.target.value))}
                    />
                    <select
                      className={`${theme.input} max-w-[92px]`}
                      value={form.percentA}
                      onChange={(event) => updateFormField("percentA", toEntryAPercent(event.target.value))}
                    >
                      {PERCENT_A_OPTIONS.map((percent) => <option key={percent} value={percent}>{percent}%</option>)}
                    </select>
                  </div>
                  {calculation.entryAWarning ? <span className="text-[9px] font-semibold text-[#ff4757]">{calculation.entryAWarning}</span> : null}
                </FormRow>

                <FormRow label="可开数量" theme={theme}>
                  <CalculatedValue theme={theme} value={calculation.amountA > 0 ? calculation.amountA.toFixed(2) : "-"} />
                </FormRow>

                <FormRow label="开仓点B" theme={theme}>
                  <input
                    className={`${theme.input} flex-[0_0_80px] disabled:cursor-not-allowed disabled:opacity-50`}
                    disabled={calculation.entryBDisabled}
                    inputMode="decimal"
                    placeholder="价格"
                    value={form.entryB}
                    onChange={(event) => updateFormField("entryB", sanitizeDecimalInput(event.target.value))}
                  />
                  {calculation.entryBWarning ? <span className="text-[9px] font-semibold text-[#ff4757]">{calculation.entryBWarning}</span> : null}
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
                    onChange={selectRatio}
                  />
                </FormRow>

                <FormRow label="参考止盈位" theme={theme}>
                  <CalculatedValue theme={theme} value={calculation.takeProfit > 0 ? calculation.takeProfit.toFixed(2) : "-"} />
                </FormRow>

                <FormRow label="止盈利润" theme={theme}>
                  <CalculatedValue theme={theme} value={calculation.profit > 0 ? `+${calculation.profit.toFixed(2)}` : "-"} />
                </FormRow>
              </div>

              <div className="mt-2 flex gap-2">
                <ActionButton disabled={!calculation.canPlaceLong} tone="long" onClick={() => openConfirmModal("long")}>开多</ActionButton>
                <ActionButton disabled={!calculation.canPlaceShort} tone="short" onClick={() => openConfirmModal("short")}>开空</ActionButton>
              </div>
            </Card>

            <PendingOrdersCard
              longOrders={pendingLongOrders}
              shortOrders={pendingShortOrders}
              theme={theme}
              onCancelOrder={cancelOrder}
              onOpenBulkAction={(type) => setBulkAction({ source: "order", type })}
            />
          </div>
        </div>
      </div>

      {confirmDirection ? (
        <Modal title="确认开仓" theme={theme} onClose={() => setConfirmDirection(null)}>
          <div className="mb-3">
            <InfoRow label="方向" theme={theme} value={confirmDirection === "long" ? "开多" : "开空"} />
            <InfoRow label="币种" theme={theme} value={form.symbol} />
            <InfoRow label="开仓点A" theme={theme} value={formatPrice(calculation.entryA)} />
            <InfoRow label="仓位A" theme={theme} value={formatAmount(calculation.amountA)} />
            {calculation.entryB > 0 ? <InfoRow label="开仓点B" theme={theme} value={formatPrice(calculation.entryB)} /> : null}
            {calculation.amountB > 0 ? <InfoRow label="仓位B" theme={theme} value={formatAmount(calculation.amountB)} /> : null}
            <InfoRow label="止损位" theme={theme} value={formatPrice(calculation.stopLoss)} />
            <InfoRow label="止盈位" theme={theme} value={calculation.takeProfit > 0 ? calculation.takeProfit.toFixed(2) : "-"} />
            <InfoRow label="预计盈亏" theme={theme} value={calculation.profit > 0 ? `+${calculation.profit.toFixed(2)}` : "-"} />
          </div>
          <ModalActions
            cancelLabel="取消"
            confirmLabel="确认"
            theme={theme}
            onCancel={() => setConfirmDirection(null)}
            onConfirm={confirmOrder}
          />
        </Modal>
      ) : null}

      {bulkAction ? (
        <Modal title={bulkAction.source === "order" ? getBulkOrderLabel(bulkAction.type) : getBulkPositionLabel(bulkAction.type)} theme={theme} onClose={() => setBulkAction(null)}>
          <p className={`mb-4 ${theme.secondaryText}`}>确定要执行此操作吗？当前页面仍使用模拟交易状态。</p>
          <ModalActions
            cancelLabel="取消"
            confirmLabel="确认"
            theme={theme}
            onCancel={() => setBulkAction(null)}
            onConfirm={confirmBulkAction}
          />
        </Modal>
      ) : null}

      {isCountdownModalOpen ? (
        <Modal title="倒计时" theme={theme} onClose={() => setIsCountdownModalOpen(false)}>
          <div className="mb-3 flex max-h-[150px] flex-col gap-2 overflow-y-auto">
            {activeCountdowns.length > 0 ? activeCountdowns.map((countdown) => {
              const remaining = countdown.targetTime - currentNow;
              const isUrgent = remaining < COUNTDOWN_URGENT_MS;
              return (
                <div key={countdown.id} className={`${theme.countdownItem} ${isUrgent ? "border-[#ff4757]" : ""}`}>
                  <span className={`text-base font-bold tabular-nums ${isUrgent ? "text-[#ff4757]" : "text-[#00d4aa]"}`}>{formatCountdown(remaining)}</span>
                  <button className="rounded bg-[#ff4757] px-2.5 py-1 text-[11px] font-semibold text-white" type="button" onClick={() => deleteCountdown(countdown.id)}>删除</button>
                </div>
              );
            }) : <div className={theme.emptyState}>暂无倒计时</div>}
          </div>
          <div className={`border-t pt-3 ${theme.borderColor}`}>
            <div className="mb-2 flex gap-1.5">
              <input className={`${theme.input} text-center`} inputMode="numeric" maxLength={2} placeholder="天" value={countdownInput.days} onChange={(event) => setCountdownInput((current) => ({ ...current, days: sanitizeIntegerInput(event.target.value) }))} />
              <input className={`${theme.input} text-center`} inputMode="numeric" maxLength={2} placeholder="时" value={countdownInput.hours} onChange={(event) => setCountdownInput((current) => ({ ...current, hours: sanitizeIntegerInput(event.target.value) }))} />
              <input className={`${theme.input} text-center`} inputMode="numeric" maxLength={2} placeholder="分" value={countdownInput.minutes} onChange={(event) => setCountdownInput((current) => ({ ...current, minutes: sanitizeIntegerInput(event.target.value) }))} />
            </div>
            {countdownError ? <p className="text-[11px] font-semibold text-[#ff4757]">{countdownError}</p> : null}
          </div>
          <ModalActions
            cancelLabel="关闭"
            confirmLabel="添加"
            theme={theme}
            onCancel={() => setIsCountdownModalOpen(false)}
            onConfirm={addCountdown}
          />
        </Modal>
      ) : null}

      {isApiModalOpen ? (
        <Modal title="系统设置" theme={theme} onClose={() => setIsApiModalOpen(false)}>
          <div className="flex flex-col">
            <FormRow label="API Key" theme={theme}>
              <input className={theme.input} maxLength={64} placeholder="输入 API Key" value={apiInput.key} onChange={(event) => setApiInput((current) => ({ ...current, key: event.target.value }))} />
            </FormRow>
            <FormRow label="Secret Key" theme={theme}>
              <input className={theme.input} maxLength={64} placeholder="输入 Secret Key" type="password" value={apiInput.secret} onChange={(event) => setApiInput((current) => ({ ...current, secret: event.target.value }))} />
            </FormRow>
            <p className={`rounded-md px-3 py-2 text-[11px] ${theme.hintBox}`}>
              {dashboardState.apiBound ? "当前为模拟绑定状态。Secret 不会保存到 localStorage。" : "当前只保存模拟绑定标记，不保存密钥，不会真实下单。"}
            </p>
            {apiError ? <p className="text-[11px] font-semibold text-[#ff4757]">{apiError}</p> : null}
          </div>
          <ModalActions
            cancelLabel="关闭"
            confirmLabel="保存"
            theme={theme}
            onCancel={() => setIsApiModalOpen(false)}
            onConfirm={bindApi}
          />
        </Modal>
      ) : null}
    </main>
  );
}
