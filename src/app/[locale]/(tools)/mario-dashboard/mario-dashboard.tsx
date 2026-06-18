"use client";

import { useEffect, useMemo, useState } from "react";
import { CalculatorCard } from "./calculator-card";
import { DashboardModals } from "./dashboard-modals";
import { DashboardHeader } from "./dashboard-header";
import { PendingOrdersCard } from "./pending-orders-card";
import { HistoryCard, PositionsCard } from "./position-history-cards";
import {
  getAccountManagementTarget,
  getApiKeySyncStatus,
  LOGGED_OUT_AUTH_ME,
  requestAuthMe,
  requestTradingFoxAccount,
  selectPrimaryConnector,
} from "./account-sync";
import type { TradingFoxConnector } from "@/lib/tradingfox-control-plane";
import { fetchUsdtPerpetualMarkets } from "@/lib/binance-market-data";
import type { MarketSymbol } from "@/types/market";
import {
  ACCOUNT_BALANCE,
  FALLBACK_MARKET_SYMBOLS,
  INITIAL_DASHBOARD_STATE,
  INITIAL_FORM,
  MAX_COUNTDOWNS,
  MOCK_HISTORY,
  MOCK_POSITIONS,
  QUOTE_ROTATE_MS,
  QUOTES,
  STORAGE_KEY,
} from "./constants";
import { AccountIcon } from "./icons";
import { getThemeClasses } from "./theme";
import type { BulkAction, BudgetPercent, CalculatorForm, DashboardState, PendingOrder, RewardRiskRatio, TakeProfitTargetId, TradeDirection } from "./types";
import { Card, OverviewItem } from "./ui";
import {
  calculatePosition,
  createTakeProfitTemplate,
  createPrioritizedMarketSymbols,
  formatNumber,
  formatSignedNumber,
  getActiveCountdowns,
  parsePositiveInteger,
  parseStoredDashboardState,
  toEntryAPercent,
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
  const apiKeyStatus = getApiKeySyncStatus({
    connector: apiConnector,
    error: apiSyncError,
    isAccountLoading,
    isAuthLoading,
    isLoggedIn: authMe.isLoggedIn,
  });
  const switchApiKey = () => {
    window.location.href = getAccountManagementTarget({
      currentPathname: window.location.pathname,
      isLoggedIn: authMe.isLoggedIn,
    });
  };

  return (
    <main className={`${theme.page}${dashboardState.darkMode ? " dark-mode" : ""}${className ? ` ${className}` : ""}`}>
      <div className="container">
        <DashboardHeader
          activeCountdowns={activeCountdowns}
          apiKeyStatus={apiKeyStatus}
          currentNow={currentNow}
          isDarkMode={dashboardState.darkMode}
          quote={QUOTES[quoteIndex]}
          theme={theme}
          onOpenCountdownModal={openCountdownModal}
          onSwitchApiKey={switchApiKey}
          onToggleTheme={() => setDashboardState((currentState) => ({ ...currentState, darkMode: !currentState.darkMode }))}
        />

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
          <CalculatorCard
            calculation={calculation}
            dashboardState={dashboardState}
            form={form}
            isDarkTheme={dashboardState.darkMode}
            marketOptions={marketOptions}
            theme={theme}
            onConfirmDirection={openConfirmModal}
            onSelectBudget={selectBudget}
            onSelectRatio={selectRatio}
            onUpdateEntryAPercent={updateEntryAPercent}
            onUpdateFormField={updateFormField}
            onUpdateTakeProfitTarget={updateTakeProfitTarget}
          />

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

      <DashboardModals
        activeCountdowns={activeCountdowns}
        bulkAction={bulkAction}
        calculation={calculation}
        confirmDirection={confirmDirection}
        countdownInput={countdownInput}
        currentNow={currentNow}
        form={form}
        isCountdownModalOpen={isCountdownModalOpen}
        setCountdownInput={setCountdownInput}
        theme={theme}
        onAddCountdown={addCountdown}
        onCloseBulkAction={() => setBulkAction(null)}
        onCloseConfirm={() => setConfirmDirection(null)}
        onCloseCountdown={() => setIsCountdownModalOpen(false)}
        onConfirmBulkAction={confirmBulkAction}
        onConfirmOrder={confirmOrder}
        onDeleteCountdown={deleteCountdown}
      />

    </main>
  );
}
