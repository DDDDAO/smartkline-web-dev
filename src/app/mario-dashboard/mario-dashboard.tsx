"use client";

import { useEffect, useMemo, useState } from "react";
import { PendingOrdersCard } from "./pending-orders-card";
import { HistoryCard, PositionsCard } from "./position-history-cards";
import { MarketSymbolSearchInput } from "@/app/_components/market-symbol-search-input";
import {
  getAccountManagementTarget,
  getApiKeySyncStatus,
  LOGGED_OUT_AUTH_ME,
  requestAuthMe,
  requestTradingFoxAccount,
  selectPrimaryConnector,
} from "./account-sync";
import type { TradingFoxConnector } from "@/app/_lib/tradingfox-control-plane";
import { fetchUsdtPerpetualMarkets } from "@/app/_lib/binance-market-data";
import type { MarketSymbol } from "@/app/_types/market";
import {
  ACCOUNT_BALANCE,
  BUDGET_OPTIONS,
  COUNTDOWN_URGENT_MS,
  FALLBACK_MARKET_SYMBOLS,
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
import { AccountIcon, ClockIcon, LayersIcon, MoonIcon, SunIcon } from "./icons";
import { getThemeClasses } from "./theme";
import type { BulkAction, BudgetPercent, CalculatorForm, DashboardState, PendingOrder, RewardRiskRatio, TakeProfitTargetId, TradeDirection } from "./types";
import { ActionButton, CalculatedValue, Card, FormRow, IconButton, InfoRow, Modal, ModalActions, OverviewItem, SegmentedButtons } from "./ui";
import {
  calculatePosition,
  createTakeProfitTemplate,
  createPrioritizedMarketSymbols,
  formatAmount,
  formatCountdown,
  formatNumber,
  formatPrice,
  formatSignedNumber,
  formatTakeProfitTargetSummary,
  getActiveCountdowns,
  getBudgetTone,
  getBulkOrderLabel,
  getBulkPositionLabel,
  getHeaderTimerClassName,
  getMarketBaseSymbol,
  getRatioTone,
  parsePositiveInteger,
  parseStoredDashboardState,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
  toEntryAPercent,
  toRewardRiskRatio,
  toTakeProfitClosePercent,
  toUsdtPerpetualMarketSymbol,
} from "./utils";

export function MarioDashboard({ className = "" }: { className?: string }) {
  const [dashboardState, setDashboardState] = useState<DashboardState>(INITIAL_DASHBOARD_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [authMe, setAuthMe] = useState(LOGGED_OUT_AUTH_ME);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [apiConnector, setApiConnector] = useState<TradingFoxConnector | null>(null);
  const [apiSyncError, setApiSyncError] = useState("");
  const [syncRevision, setSyncRevision] = useState(0);
  const [form, setForm] = useState<CalculatorForm>(INITIAL_FORM);
  const [now, setNow] = useState<number | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [confirmDirection, setConfirmDirection] = useState<TradeDirection | null>(null);
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [isCountdownModalOpen, setIsCountdownModalOpen] = useState(false);
  const [countdownInput, setCountdownInput] = useState({ days: "", hours: "", minutes: "" });
  const [marketOptions, setMarketOptions] = useState<MarketSymbol[]>([...FALLBACK_MARKET_SYMBOLS]);

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
    let isActive = true;

    requestAuthMe()
      .then((nextAuthMe) => {
        if (isActive) {
          setAuthMe(nextAuthMe);
          setApiSyncError("");
          if (!nextAuthMe.isLoggedIn) {
            setApiConnector(null);
            setIsAccountLoading(false);
          }
        }
      })
      .catch(() => {
        if (isActive) {
          setAuthMe(LOGGED_OUT_AUTH_ME);
          setApiConnector(null);
          setApiSyncError("登录状态同步失败");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsAuthLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [syncRevision]);

  useEffect(() => {
    let isActive = true;

    if (isAuthLoading) {
      return () => {
        isActive = false;
      };
    }

    if (!authMe.isLoggedIn) {
      return () => {
        isActive = false;
      };
    }

    Promise.resolve()
      .then(() => {
        if (isActive) {
          setIsAccountLoading(true);
          setApiSyncError("");
        }
        return requestTradingFoxAccount();
      })
      .then((account) => {
        if (isActive) {
          setApiConnector(selectPrimaryConnector(account));
        }
      })
      .catch((error) => {
        if (isActive) {
          setApiConnector(null);
          setApiSyncError(error instanceof Error ? error.message : "API Key 状态同步失败");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsAccountLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [authMe.isLoggedIn, isAuthLoading, syncRevision]);

  useEffect(() => {
    const refreshApiKeyStatus = () => {
      setIsAuthLoading(true);
      setSyncRevision((currentRevision) => currentRevision + 1);
    };
    const refreshVisiblePage = () => {
      if (document.visibilityState === "visible") {
        refreshApiKeyStatus();
      }
    };

    window.addEventListener("focus", refreshApiKeyStatus);
    document.addEventListener("visibilitychange", refreshVisiblePage);

    return () => {
      window.removeEventListener("focus", refreshApiKeyStatus);
      document.removeEventListener("visibilitychange", refreshVisiblePage);
    };
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

        const loadedMarketsForSearch = createPrioritizedMarketSymbols(loadedMarkets);
        setMarketOptions(loadedMarketsForSearch.length > 0 ? loadedMarketsForSearch : [...FALLBACK_MARKET_SYMBOLS]);
      })
      .catch(() => {
        if (isActive) {
          setMarketOptions([...FALLBACK_MARKET_SYMBOLS]);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const calculation = useMemo(
    () => calculatePosition(form, dashboardState.budget, dashboardState.takeProfitTargets),
    [dashboardState.budget, dashboardState.takeProfitTargets, form],
  );
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

  const updateEntryAPercent = (value: string) => {
    const percentA = toEntryAPercent(value);
    setForm((currentForm) => ({
      ...currentForm,
      entryB: percentA === 100 ? "" : currentForm.entryB,
      percentA,
    }));
  };

  const selectBudget = (budget: BudgetPercent) => {
    setDashboardState((currentState) => ({ ...currentState, budget }));
  };

  const selectRatio = (ratio: RewardRiskRatio) => {
    setDashboardState((currentState) => ({
      ...currentState,
      ratio,
      takeProfitTargets: createTakeProfitTemplate(ratio),
    }));
  };

  const updateTakeProfitTarget = (targetId: TakeProfitTargetId, updates: Partial<DashboardState["takeProfitTargets"][number]>) => {
    setDashboardState((currentState) => ({
      ...currentState,
      takeProfitTargets: currentState.takeProfitTargets.map((target) => target.id === targetId ? { ...target, ...updates } : target),
    }));
  };

  const openConfirmModal = (direction: TradeDirection) => {
    if (!calculation.isValidOrder) {
      window.alert("请先填写有效的止损位、开仓点和分批止盈比例。");
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
      takeProfitTargets: calculation.takeProfitTargets.map((target) => ({
        closePercent: target.closePercent,
        id: target.id,
        price: target.price,
        ratio: target.ratio,
      })),
    };

    setDashboardState((currentState) => ({
      ...currentState,
      orders: [...currentState.orders, nextOrder],
    }));
    setConfirmDirection(null);
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
    } else {
      window.alert(`平仓成功: ${bulkAction.type}`);
    }

    setBulkAction(null);
  };

  const openCountdownModal = () => {
    setCountdownInput({ days: "", hours: "", minutes: "" });
    setIsCountdownModalOpen(true);
  };

  const addCountdown = () => {
    const days = parsePositiveInteger(countdownInput.days);
    const hours = parsePositiveInteger(countdownInput.hours);
    const minutes = parsePositiveInteger(countdownInput.minutes);
    const totalMs = (days * 24 * 60 + hours * 60 + minutes) * 60 * 1_000;

    if (totalMs <= 0) {
      setIsCountdownModalOpen(false);
      return;
    }

    if (activeCountdowns.length >= MAX_COUNTDOWNS) {
      window.alert("最多只能添加2个倒计时");
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
    setIsCountdownModalOpen(false);
  };

  const deleteCountdown = (countdownId: number) => {
    setDashboardState((currentState) => ({
      ...currentState,
      countdowns: currentState.countdowns.filter((countdown) => countdown.id !== countdownId),
    }));
  };

  const theme = getThemeClasses();
  const currentNow = now ?? 0;
  const headerCountdownText = activeCountdowns
    .map((countdown) => formatCountdown(countdown.targetTime - currentNow))
    .join(" | ");
  const firstCountdownRemaining = activeCountdowns[0] ? activeCountdowns[0].targetTime - currentNow : null;
  const apiKeyStatus = getApiKeySyncStatus({
    connector: apiConnector,
    error: apiSyncError,
    isAccountLoading,
    isAuthLoading,
    isLoggedIn: authMe.isLoggedIn,
  });
  const switchApiKey = () => {
    window.location.href = getAccountManagementTarget(authMe.isLoggedIn);
  };

  return (
    <main className={`${theme.page}${dashboardState.darkMode ? " dark-mode" : ""}${className ? ` ${className}` : ""}`}>
      <div className="container">
        <header className="header">
          <h1>
            马里奥的狙击台
            {activeCountdowns.length > 0 ? <span className={getHeaderTimerClassName(firstCountdownRemaining)}>{headerCountdownText}</span> : null}
            <span className="header-subtitle">{QUOTES[quoteIndex]}</span>
          </h1>
          <div className="header-actions">
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
            <button className="api-switch-btn" title={apiKeyStatus.title} type="button" onClick={switchApiKey}>
              <span>切换 API Key</span>
              <span className={`api-switch-status ${apiKeyStatus.tone}`}>{apiKeyStatus.label}</span>
            </button>
          </div>
        </header>

        <Card title="账号概况" icon={<AccountIcon />} theme={theme}>
          <div className="overview-grid">
            <OverviewItem label="保证金余额 (U)" theme={theme} value={formatNumber(ACCOUNT_BALANCE)} />
            <OverviewItem label="仓位数量" theme={theme} value={String(MOCK_POSITIONS.length)} />
            <OverviewItem label="实际杠杆" theme={theme} value="5x" />
            <OverviewItem label="浮盈亏 (U)" tone={totalPnl >= 0 ? "up" : "down"} theme={theme} value={formatSignedNumber(totalPnl)} />
            <OverviewItem label="胜率" theme={theme} value="65%" />
            <OverviewItem label="交易次数" theme={theme} value="42" />
            <OverviewItem label="平均盈利 (U)" tone="up" theme={theme} value="+380" />
            <OverviewItem label="平均亏损 (U)" tone="down" theme={theme} value="-195" />
          </div>
        </Card>

        <div className="two-cols">
          <Card title="坐标定位/持仓计算" icon={<LayersIcon />} theme={theme}>
            <div className="form-grid">
              <FormRow label="币种" theme={theme}>
                <MarketSymbolSearchInput
                  formatSymbolLabel={getMarketBaseSymbol}
                  id="mario-dashboard-symbol-search"
                  isDarkTheme={dashboardState.darkMode}
                  marketOptions={marketOptions}
                  noMatchesLabel="没有匹配币种"
                  placeholder="搜索币种"
                  symbol={toUsdtPerpetualMarketSymbol(form.symbol)}
                  variant="mario"
                  onSymbolChange={(symbol) => updateFormField("symbol", getMarketBaseSymbol(symbol))}
                />
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
                  id="stopLoss"
                  inputMode="decimal"
                  placeholder="价格"
                  value={form.stopLoss}
                  onChange={(event) => updateFormField("stopLoss", sanitizeDecimalInput(event.target.value))}
                />
              </FormRow>

              <FormRow label="开仓点A" theme={theme}>
                <input
                  id="entryA"
                  inputMode="decimal"
                  placeholder="价格"
                  value={form.entryA}
                  onChange={(event) => updateFormField("entryA", sanitizeDecimalInput(event.target.value))}
                />
                {calculation.entryAWarning ? <span className="warning">{calculation.entryAWarning}</span> : null}
                <select
                  id="percentA"
                  value={form.percentA}
                  onChange={(event) => updateEntryAPercent(event.target.value)}
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
                  onChange={(event) => updateFormField("entryB", sanitizeDecimalInput(event.target.value))}
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
                  onChange={selectRatio}
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
                          onChange={(event) => updateTakeProfitTarget(target.id, { ratio: toRewardRiskRatio(event.target.value) })}
                        >
                          {RATIO_OPTIONS.map((ratio) => <option key={ratio} value={ratio}>1:{ratio}</option>)}
                        </select>
                        <input
                          aria-label={`TP${index + 1} 平仓比例`}
                          inputMode="numeric"
                          maxLength={3}
                          value={target.closePercent}
                          onChange={(event) => updateTakeProfitTarget(target.id, { closePercent: toTakeProfitClosePercent(event.target.value) })}
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

        <div className="two-cols">
          <PositionsCard
            longPositions={longPositions}
            shortPositions={shortPositions}
            theme={theme}
            onOpenBulkAction={(type) => setBulkAction({ source: "position", type })}
          />
          <HistoryCard history={MOCK_HISTORY} theme={theme} />
        </div>
      </div>

      {confirmDirection ? (
        <Modal title="确认开仓" theme={theme} onClose={() => setConfirmDirection(null)}>
          <div className="modal-info">
            <InfoRow label="方向" theme={theme} value={confirmDirection === "long" ? "开多" : "开空"} />
            <InfoRow label="币种" theme={theme} value={form.symbol} />
            <InfoRow label="开仓点A" theme={theme} value={formatPrice(calculation.entryA)} />
            <InfoRow label="仓位A" theme={theme} value={formatAmount(calculation.amountA)} />
            {calculation.entryB > 0 ? <InfoRow label="开仓点B" theme={theme} value={formatPrice(calculation.entryB)} /> : null}
            {calculation.amountB > 0 ? <InfoRow label="仓位B" theme={theme} value={formatAmount(calculation.amountB)} /> : null}
            <InfoRow label="止损位" theme={theme} value={formatPrice(calculation.stopLoss)} />
            <InfoRow label="分批止盈" theme={theme} value={formatTakeProfitTargetSummary(calculation.takeProfitTargets)} />
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
          <p className="secondary-text" style={{ marginBottom: 16 }}>确定要执行此操作吗？</p>
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
          <div className="countdown-modal-list">
            {activeCountdowns.length > 0 ? activeCountdowns.map((countdown) => {
              const remaining = countdown.targetTime - currentNow;
              const isUrgent = remaining < COUNTDOWN_URGENT_MS;
              return (
                <div key={countdown.id} className={`countdown-modal-item${isUrgent ? " urgent" : ""}`}>
                  <span className="countdown-modal-time">{formatCountdown(remaining)}</span>
                  <button className="countdown-modal-delete" type="button" onClick={() => deleteCountdown(countdown.id)}>删除</button>
                </div>
              );
            }) : <div className="countdown-modal-empty">暂无倒计时</div>}
          </div>
          <div className="countdown-modal-add">
            <div className="input-row">
              <input inputMode="numeric" maxLength={2} placeholder="天" value={countdownInput.days} onChange={(event) => setCountdownInput((current) => ({ ...current, days: sanitizeIntegerInput(event.target.value) }))} />
              <input inputMode="numeric" maxLength={2} placeholder="时" value={countdownInput.hours} onChange={(event) => setCountdownInput((current) => ({ ...current, hours: sanitizeIntegerInput(event.target.value) }))} />
              <input inputMode="numeric" maxLength={2} placeholder="分" value={countdownInput.minutes} onChange={(event) => setCountdownInput((current) => ({ ...current, minutes: sanitizeIntegerInput(event.target.value) }))} />
            </div>
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

    </main>
  );
}
