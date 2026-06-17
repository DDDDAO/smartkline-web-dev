"use client";

import Image from "next/image";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect, useSignTypedData } from "wagmi";
import { useEffect, useMemo, useRef, useState } from "react";
import { getTradingFoxErrorMessage } from "@/app/_lib/tradingfox-errors";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import { isWalletConnectConfigured } from "@/app/_lib/wallet-connect";
import type { TelegramSessionUser } from "@/app/_lib/auth/telegram-auth";
import type { TradingFoxAccountResponse, TradingFoxHyperliquidAgentBindingStartResponse, TradingFoxHyperliquidSigningAction } from "@/app/_lib/tradingfox-control-plane";
import { SourceAvatar } from "../card-ui";
import { StrategyDetailView } from "./strategy-detail-view";
import { StrategySettingsDialog } from "./strategy-settings-dialog";
import { TelegramUserAvatar, getTelegramUserDisplayName } from "./telegram-user-avatar";
import { EXCHANGES, HYPERLIQUID_DEPOSIT_URL, MOCK_MARGIN_BALANCE_MAX, MOCK_MARGIN_BALANCE_PRESETS, NOTIFICATION_CHANNELS, type PrototypeExchange, type PrototypeExchangeId } from "./constants";
import type { AccountCenterPrototypeProps, AccountManagementTab, CopyTradingPrototypeModalProps, CopyTradingPrototypeTarget, PrototypeApiConnection, PrototypeConnectionSaveInput, PrototypeStrategy, PrototypeStrategyCreateInput, PrototypeStrategySettingsUpdateInput, PrototypeStrategyStatus, PrototypeStrategyType } from "./types";
import { formatAccountBalance, formatDetailCurrency, formatSignedDetailCurrency, getPnlClassName, numberOrZero } from "./formatters";
import { CheckGlyph, CopyGlyph, ExternalLinkGlyph } from "./icons";
import { MiniMetric } from "./mini-metric";
import { getPrototypeStrategyType, getStrategyStatusLabel } from "./strategy-helpers";
import { getAccountCenterTabButtonClassName, getDangerButtonClassName, getExchangeButtonClassName, getExchangeResourceLinkClassName, getIconButtonClassName, getInlineErrorClassName, getLabelClassName, getModalSectionClassName, getNotificationIconClassName, getNotificationUnavailableBadgeClassName, getPrimaryButtonClassName, getSoftButtonClassName, getStrategyStatusClassName, getStrategyTypeOptionClassName, getWhitelistCopyButtonClassName } from "./styles";
import { createSignalSourceTargetById, formatDefaultCopyStrategyName, NotificationSettingsPlaceholder, ApiConnectionCard, StrategyCreateLayer, TradingAccountSelect, PercentInput, PrototypeInput, ExchangeIcon, ExchangeResourceLinks, getExchangeById, getExchangeName, HyperliquidAgentWalletPanel, WhitelistIpCopyPanel, requestTradingFoxConnectorWhitelistIP, requestHyperliquidAgentBindingStart, requestHyperliquidAgentBindingComplete, findHyperliquidSigningAction, signHyperliquidTypedData, resolveFollowedSignalSourceDisplay } from "./copy-trading-prototype-helpers";

export function ExchangeApiSetupLayer({
  copy,
  initialAccountName,
  initialMockMarginBalance,
  isDarkTheme,
  onClose,
  onHyperliquidAgentBound,
  onSave,
}: {
  copy: WorkspaceCopy;
  initialAccountName: string;
  initialMockMarginBalance: number | null;
  isDarkTheme: boolean;
  onClose: () => void;
  onHyperliquidAgentBound: (account: TradingFoxAccountResponse, accountName: string) => void;
  onSave: (input: PrototypeConnectionSaveInput) => Promise<boolean> | boolean;
}) {
  const [selectedExchangeId, setSelectedExchangeId] = useState<PrototypeExchangeId>("binance");
  const selectedExchange = getExchangeById(selectedExchangeId);
  const [accountName, setAccountName] = useState(initialAccountName || selectedExchange.defaultAccountName);
  const [mockMarginBalance, setMockMarginBalance] = useState(String(initialMockMarginBalance ?? 10000));
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [apiPassword, setApiPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [hasCopiedIp, setHasCopiedIp] = useState(false);
  const [whitelistIp, setWhitelistIp] = useState("");
  const [whitelistIpError, setWhitelistIpError] = useState("");
  const [isWhitelistIpOptional, setIsWhitelistIpOptional] = useState(false);
  const [isWhitelistIpLoading, setIsWhitelistIpLoading] = useState(false);
  const [agentWalletAddress, setAgentWalletAddress] = useState("");
  const [agentBindingError, setAgentBindingError] = useState("");
  const [agentBindingStep, setAgentBindingStep] = useState("");
  const [isAgentBinding, setIsAgentBinding] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const { address: connectedWalletAddress } = useAccount();
  const { disconnect } = useDisconnect();
  const { signTypedDataAsync } = useSignTypedData();
  const accountCopy = copy.workspace.accountCenter;
  const isDemoExchange = selectedExchange.mode === "demo";
  const isBuiltInMockExchange = selectedExchange.id === "mockExchange";
  const isBinanceDemoExchange = selectedExchange.id === "binanceDemo";
  const isHyperliquidExchange = selectedExchange.id === "hyperliquid";
  const isLiveExchange = !isDemoExchange && !isHyperliquidExchange;
  const requiresApiCredentials = !isBuiltInMockExchange && !isHyperliquidExchange;
  const requiresApiPassword = selectedExchange.requiresApiPassword;
  const requiresWalletAddress = selectedExchange.requiresWalletAddress;
  const requiresPrivateKey = selectedExchange.requiresPrivateKey;
  const parsedMockMarginBalance = Number(mockMarginBalance);
  const hasValidMockMarginBalance = Number.isFinite(parsedMockMarginBalance) && parsedMockMarginBalance > 0 && parsedMockMarginBalance <= MOCK_MARGIN_BALANCE_MAX;
  const hasApiCredentials = !requiresApiCredentials || (apiKey.trim().length > 0 && secret.trim().length > 0);
  const hasApiPassword = !requiresApiPassword || apiPassword.trim().length > 0;
  const hasWalletAddress = !requiresWalletAddress || walletAddress.trim().length > 0;
  const hasPrivateKey = !requiresPrivateKey || privateKey.trim().length > 0;
  const hasWhitelistIp = whitelistIp.trim().length > 0;
  const hasWhitelistRequirement = !isLiveExchange || hasWhitelistIp || isWhitelistIpOptional;
  const agentWalletDisplayAddress = agentWalletAddress;
  const walletAddressLabel = isHyperliquidExchange ? accountCopy.apiSetup.mainWalletAddress : accountCopy.apiSetup.walletAddress;
  const walletAddressPlaceholder = isHyperliquidExchange ? accountCopy.apiSetup.mainWalletAddressPlaceholder : accountCopy.apiSetup.walletAddressPlaceholder;

  const canSave = isBuiltInMockExchange
    ? accountName.trim().length > 0 && hasValidMockMarginBalance
    : isBinanceDemoExchange
      ? accountName.trim().length > 0 && hasApiCredentials
      : accountName.trim().length > 0 && hasApiCredentials && hasApiPassword && hasWalletAddress && hasPrivateKey && hasWhitelistRequirement && !isWhitelistIpLoading && !isSavingManual && !isAgentBinding;

  useEffect(() => {
    let isMounted = true;

    async function loadWhitelistIp() {
      if (!isLiveExchange) {
        if (!isMounted) {
          return;
        }
        setWhitelistIp("");
        setWhitelistIpError("");
        setIsWhitelistIpOptional(false);
        setIsWhitelistIpLoading(false);
        return;
      }

      setWhitelistIp("");
      setWhitelistIpError("");
      setIsWhitelistIpOptional(false);
      setHasCopiedIp(false);
      setIsWhitelistIpLoading(true);
      try {
        const whitelistAssignment = await requestTradingFoxConnectorWhitelistIP(selectedExchange.connectorExchangePlatform);
        if (!isMounted) {
          return;
        }
        const nextWhitelistIp = whitelistAssignment.whitelistIp;
        const isUnassigned = whitelistAssignment.assignmentStatus === "unassigned";
        setWhitelistIp(nextWhitelistIp);
        setIsWhitelistIpOptional(isUnassigned);
        setWhitelistIpError(nextWhitelistIp ? "" : isUnassigned ? accountCopy.apiSetup.whitelistIpUnassignedFallback : accountCopy.apiSetup.whitelistIpUnavailable);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setWhitelistIp("");
        setIsWhitelistIpOptional(false);
        setWhitelistIpError(error instanceof Error ? error.message : accountCopy.apiSetup.whitelistIpUnavailable);
      } finally {
        if (isMounted) {
          setIsWhitelistIpLoading(false);
        }
      }
    }

    void loadWhitelistIp();

    return () => {
      isMounted = false;
    };
  }, [accountCopy.apiSetup.whitelistIpUnavailable, accountCopy.apiSetup.whitelistIpUnassignedFallback, isLiveExchange, selectedExchange.connectorExchangePlatform]);

  const updateMockMarginBalance = (value: string) => {
    const normalizedValue = value.replace(/[^\d.]/gu, "");
    const parsedValue = Number(normalizedValue);
    if (Number.isFinite(parsedValue) && parsedValue > MOCK_MARGIN_BALANCE_MAX) {
      setMockMarginBalance(String(MOCK_MARGIN_BALANCE_MAX));
      return;
    }

    setMockMarginBalance(normalizedValue);
  };
  const chooseExchange = (exchange: PrototypeExchange) => {
    if (!exchange.enabled) {
      return;
    }

    const previousDefaultAccountName = selectedExchange.defaultAccountName;
    setSelectedExchangeId(exchange.id);
    setHasCopiedIp(false);
    setApiKey("");
    setSecret("");
    setApiPassword("");
    setWalletAddress("");
    setPrivateKey("");
    setAgentWalletAddress("");
    setAgentBindingError("");
    setAgentBindingStep("");
    setAccountName((currentAccountName) => {
      const trimmedAccountName = currentAccountName.trim();
      if (trimmedAccountName.length > 0 && trimmedAccountName !== previousDefaultAccountName) {
        return currentAccountName;
      }

      return exchange.defaultAccountName;
    });
  };
  const resetHyperliquidAgentBinding = () => {
    if (isAgentBinding) {
      return;
    }

    setAgentWalletAddress("");
    setWalletAddress("");
    setAgentBindingError("");
    setAgentBindingStep("");
    disconnect();
  };
  const handleHyperliquidAgentBind = async () => {
    if (!isHyperliquidExchange || isAgentBinding) {
      return;
    }

    setAgentBindingError("");
    setAgentBindingStep(accountCopy.apiSetup.hyperliquidAgentStepConnect);
    const selectedWalletAddress = connectedWalletAddress?.trim() ?? "";
    if (!selectedWalletAddress) {
      setAgentBindingError(accountCopy.apiSetup.hyperliquidAgentWalletMissing);
      return;
    }

    setIsAgentBinding(true);
    try {
      setAgentWalletAddress(selectedWalletAddress);
      setWalletAddress(selectedWalletAddress);
      setAgentBindingStep(accountCopy.apiSetup.hyperliquidAgentStepCreate);
      const bindingStart = await requestHyperliquidAgentBindingStart({
        accountName: accountName.trim() || selectedExchange.defaultAccountName,
        walletAddress: selectedWalletAddress,
      });
      const approveAgentAction = findHyperliquidSigningAction(bindingStart.actions, "approveAgent");
      const approveBuilderFeeAction = findHyperliquidSigningAction(bindingStart.actions, "approveBuilderFee");
      if (!approveAgentAction || !approveBuilderFeeAction) {
        throw new Error(accountCopy.apiSetup.hyperliquidAgentActionMissing);
      }

      setAgentBindingStep(accountCopy.apiSetup.hyperliquidAgentStepApproveAgent);
      const approveAgentSignature = await signHyperliquidTypedData(signTypedDataAsync, selectedWalletAddress, approveAgentAction);
      setAgentBindingStep(accountCopy.apiSetup.hyperliquidAgentStepApproveBuilderFee);
      const approveBuilderFeeSignature = await signHyperliquidTypedData(signTypedDataAsync, selectedWalletAddress, approveBuilderFeeAction);
      setAgentBindingStep(accountCopy.apiSetup.hyperliquidAgentStepComplete);
      const account = await requestHyperliquidAgentBindingComplete(bindingStart.binding.id, {
        approveAgentSignature,
        approveBuilderFeeSignature,
      });
      onHyperliquidAgentBound(account, bindingStart.binding.connectorName || accountName.trim() || selectedExchange.defaultAccountName);
      onClose();
    } catch (error) {
      // A failed or rejected signature leaves the generated binding payload incomplete,
      // so the next attempt must start from a fresh wallet confirmation.
      setAgentWalletAddress("");
      setWalletAddress("");
      setAgentBindingStep("");
      setAgentBindingError(getTradingFoxErrorMessage(error, copy));
    } finally {
      setIsAgentBinding(false);
    }
  };
  const handleManualSave = async () => {
    if (!canSave || isSavingManual) {
      return;
    }

    setIsSavingManual(true);
    try {
      const isSaved = await onSave({
        accountName: accountName.trim() || selectedExchange.defaultAccountName,
        apiKey: requiresApiCredentials ? apiKey.trim() : undefined,
        exchangePlatform: selectedExchange.connectorExchangePlatform,
        ipAddress: isLiveExchange && hasWhitelistIp ? whitelistIp.trim() : undefined,
        isMock: isDemoExchange,
        mockMarginBalance: isBuiltInMockExchange && hasValidMockMarginBalance ? parsedMockMarginBalance : undefined,
        password: requiresApiPassword ? apiPassword.trim() : undefined,
        privateKey: requiresPrivateKey ? privateKey.trim() : undefined,
        secret: requiresApiCredentials ? secret.trim() : undefined,
        walletAddress: requiresWalletAddress ? walletAddress.trim() : undefined,
      });
      if (isSaved) {
        onClose();
      }
    } finally {
      setIsSavingManual(false);
    }
  };
  const exchangeSetupGridClassName = "grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]";
  const exchangeSelectorClassName = [
    isDarkTheme
      ? "flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/[0.075] bg-white/[0.035] p-3"
      : "flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-[#E5EAF0] bg-[#FAFBFD] p-3",
    "self-start",
  ].join(" ");
  const exchangeSelectorListClassName = "kol-scroll-area flex gap-2 overflow-x-auto pb-1 lg:grid lg:content-start lg:overflow-visible lg:pb-0";
  const exchangeContentClassName = isHyperliquidExchange
    ? "grid min-w-0 content-start gap-3 self-start"
    : "grid min-w-0 gap-4";

  return (
    <>
      <button
        aria-label={copy.common.close}
        className={isDarkTheme ? "fixed inset-0 z-[110] bg-black/58 backdrop-blur-[5px]" : "fixed inset-0 z-[110] bg-slate-950/28 backdrop-blur-[5px]"}
        type="button"
        onClick={onClose}
      />
      <section
        aria-label={accountCopy.apiSetup.title}
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-[115] h-[96dvh] overflow-hidden rounded-t-[30px] shadow-[0_-26px_88px_rgba(15,23,42,0.26)] sm:inset-x-3 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:h-[min(920px,calc(100dvh-1rem))] sm:max-w-[920px] sm:-translate-y-1/2 sm:rounded-[30px] sm:shadow-[0_30px_90px_rgba(15,23,42,0.26)]"
        role="dialog"
      >
        <form
          className={isDarkTheme ? "flex h-full flex-col border border-white/[0.085] bg-[#111820] text-slate-100" : "flex h-full flex-col border border-[#D5E4EF] bg-white text-slate-950"}
          onSubmit={(event) => event.preventDefault()}
        >
          <header className={isDarkTheme ? "border-b border-white/[0.075] px-4 py-4 sm:px-5 sm:py-5" : "border-b border-[#E5EAF0] px-4 py-4 sm:px-5 sm:py-5"}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.16em] text-sky-300" : "text-[11px] font-black uppercase tracking-[0.16em] text-[#008DCC]"}>
                  {accountCopy.apiSetup.selectExchange}
                </div>
                <h2 className="mt-2 text-xl font-black tracking-tight">{accountCopy.apiSetup.title}</h2>
              </div>
              <button aria-label={copy.common.close} className={getIconButtonClassName(isDarkTheme)} type="button" onClick={onClose}>
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </button>
            </div>
          </header>

          <div className="kol-scroll-area min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            <div className={exchangeSetupGridClassName}>
              <aside className={exchangeSelectorClassName}>
                <div className={isDarkTheme ? "px-1 pb-2 text-xs font-black text-slate-300" : "px-1 pb-2 text-xs font-black text-slate-700"}>
                  {accountCopy.apiSetup.selectExchange}
                </div>
                <div className={exchangeSelectorListClassName}>
                  {EXCHANGES.map((exchange) => (
                    <button
                      key={exchange.id}
                      className={getExchangeButtonClassName(isDarkTheme, exchange.enabled, exchange.id === selectedExchangeId)}
                      disabled={!exchange.enabled}
                      type="button"
                      onClick={() => chooseExchange(exchange)}
                    >
                      <ExchangeIcon enabled={exchange.enabled} exchange={exchange} isDarkTheme={isDarkTheme} />
                      <span className="min-w-0 flex-1 whitespace-nowrap text-sm font-black">{getExchangeName(accountCopy, exchange.id)}</span>
                      {!exchange.enabled ? (
                        <span className={isDarkTheme ? "shrink-0 text-[10px] font-bold text-slate-500" : "shrink-0 text-[10px] font-bold text-slate-400"}>{accountCopy.apiSetup.comingSoon}</span>
                      ) : exchange.mode === "demo" ? (
                        <span className={isDarkTheme ? "shrink-0 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-300" : "shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700"}>{accountCopy.apiSetup.demoBadge}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </aside>

              <main className={exchangeContentClassName}>
                <section className={getModalSectionClassName(isDarkTheme)}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <ExchangeIcon enabled exchange={selectedExchange} isDarkTheme={isDarkTheme} />
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black">{getExchangeName(accountCopy, selectedExchange.id)}</h3>
                        <div className={isDarkTheme ? "mt-1 text-xs font-bold text-slate-500" : "mt-1 text-xs font-bold text-slate-500"}>
                          {isDemoExchange ? accountCopy.apiSetup.demoMode : accountCopy.apiSetup.enabledExchange}
                        </div>
                      </div>
                    </div>
                    {isBuiltInMockExchange ? (
                      <span className={isDarkTheme ? "rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200" : "rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"}>
                        {accountCopy.apiSetup.noKeysRequired}
                      </span>
                    ) : isBinanceDemoExchange ? (
                      <span className={isDarkTheme ? "rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200" : "rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"}>
                        {accountCopy.apiSetup.noWhitelistIpRequired}
                      </span>
                    ) : null}
                    <ExchangeResourceLinks accountCopy={accountCopy} exchange={selectedExchange} isDarkTheme={isDarkTheme} />
                  </div>
                </section>

                {isDemoExchange ? (
                  <section className={getModalSectionClassName(isDarkTheme)}>
                    <h3 className="text-base font-black">{accountCopy.apiSetup.demoTitle}</h3>
                    <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                      {selectedExchange.id === "mockExchange" ? accountCopy.apiSetup.mockExchangeDescription : accountCopy.apiSetup.binanceDemoDescription}
                    </p>
                    <div className={isDarkTheme ? "mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] px-3 py-3 text-xs leading-5 text-emerald-100/85" : "mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800"}>
                      {accountCopy.apiSetup.demoRiskNote}
                    </div>
                    <div className="mt-4 grid gap-3">
                      <PrototypeInput autoComplete="off" fieldName="account-name" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.accountName} value={accountName} onChange={setAccountName} />
                      {requiresApiCredentials ? (
                        <>
                          <PrototypeInput autoComplete="off" fieldName="api-key" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.apiKey} placeholder={accountCopy.apiSetup.apiKeyPlaceholder} value={apiKey} onChange={setApiKey} />
                          <PrototypeInput autoComplete="new-password" fieldName="secret" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.secret} placeholder={accountCopy.apiSetup.secretPlaceholder} type="password" value={secret} onChange={setSecret} />
                          {requiresApiPassword ? (
                            <PrototypeInput autoComplete="new-password" fieldName="api-password" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.apiPassword} placeholder={accountCopy.apiSetup.apiPasswordPlaceholder} type="password" value={apiPassword} onChange={setApiPassword} />
                          ) : null}
                        </>
                      ) : null}
                      {isBuiltInMockExchange ? (
                      <div>
                        <PrototypeInput
                          autoComplete="off"
                          fieldName="mock-margin-balance"
                          inputMode="decimal"
                          isDarkTheme={isDarkTheme}
                          label={accountCopy.apiSetup.mockMarginBalance}
                          placeholder={accountCopy.apiSetup.mockMarginBalancePlaceholder}
                          value={mockMarginBalance}
                          onChange={updateMockMarginBalance}
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          {MOCK_MARGIN_BALANCE_PRESETS.map((amount) => (
                            <button
                              key={amount}
                              className={getSoftButtonClassName(isDarkTheme)}
                              type="button"
                              onClick={() => setMockMarginBalance(String(amount))}
                            >
                              {formatAccountBalance(amount)}
                            </button>
                          ))}
                        </div>
                        <p className={isDarkTheme ? "mt-2 text-xs leading-5 text-slate-500" : "mt-2 text-xs leading-5 text-slate-500"}>{accountCopy.apiSetup.mockMarginBalanceLimit}</p>
                      </div>
                      ) : null}
                    </div>
                    <p className={isDarkTheme ? "mt-3 text-xs leading-5 text-slate-500" : "mt-3 text-xs leading-5 text-slate-500"}>{accountCopy.apiSetup.sensitiveNote}</p>
                  </section>
                ) : (
                  <>
                    {isHyperliquidExchange ? (
                      <HyperliquidAgentWalletPanel
                        accountCopy={accountCopy}
                        agentBindingError={agentBindingError}
                        agentBindingStep={agentBindingStep}
                        agentWalletAddress={agentWalletDisplayAddress}
                        isBinding={isAgentBinding}
                        isDarkTheme={isDarkTheme}
                        onBind={handleHyperliquidAgentBind}
                        onReset={resetHyperliquidAgentBinding}
                      />
                    ) : (
                      <WhitelistIpCopyPanel
                        accountCopy={accountCopy}
                        description={accountCopy.apiSetup.whitelistIpDescription}
                        hasCopiedIp={hasCopiedIp}
                        hasWhitelistIp={hasWhitelistIp}
                        isDarkTheme={isDarkTheme}
                        isLoading={isWhitelistIpLoading}
                        whitelistIp={whitelistIp}
                        whitelistIpError={whitelistIpError}
                        onCopy={() => {
                          setHasCopiedIp(true);
                          void navigator.clipboard?.writeText(whitelistIp);
                        }}
                      />
                    )}

                    {!isHyperliquidExchange ? (
                    <section className={getModalSectionClassName(isDarkTheme)}>
                      <h3 className="text-base font-black">
                        {accountCopy.api.title}
                      </h3>
                      <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
                        {accountCopy.apiSetup.liveExchangeDescription}
                      </p>
                      <div className="mt-4 grid gap-3">
                        <PrototypeInput autoComplete="off" fieldName="account-name" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.accountName} value={accountName} onChange={setAccountName} />
                        {requiresApiCredentials ? (
                          <>
                            <PrototypeInput autoComplete="off" fieldName="api-key" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.apiKey} placeholder={accountCopy.apiSetup.apiKeyPlaceholder} value={apiKey} onChange={setApiKey} />
                            <PrototypeInput autoComplete="new-password" fieldName="secret" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.secret} placeholder={accountCopy.apiSetup.secretPlaceholder} type="password" value={secret} onChange={setSecret} />
                            {requiresApiPassword ? (
                              <PrototypeInput autoComplete="new-password" fieldName="api-password" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.apiPassword} placeholder={accountCopy.apiSetup.apiPasswordPlaceholder} type="password" value={apiPassword} onChange={setApiPassword} />
                            ) : null}
                          </>
                        ) : null}
                        {requiresWalletAddress ? (
                          <PrototypeInput autoComplete="off" fieldName="wallet-address" isDarkTheme={isDarkTheme} label={walletAddressLabel} placeholder={walletAddressPlaceholder} value={walletAddress} onChange={setWalletAddress} />
                        ) : null}
                        {requiresPrivateKey ? (
                          <PrototypeInput autoComplete="new-password" fieldName="private-key" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.privateKey} placeholder={accountCopy.apiSetup.privateKeyPlaceholder} type="password" value={privateKey} onChange={setPrivateKey} />
                        ) : null}
                      </div>
                      <p className={isDarkTheme ? "mt-3 text-xs leading-5 text-slate-500" : "mt-3 text-xs leading-5 text-slate-500"}>{accountCopy.apiSetup.sensitiveNote}</p>
                    </section>
                    ) : null}
                  </>
                )}

              </main>
            </div>
          </div>

          <footer className={isDarkTheme ? "grid grid-cols-2 gap-2 border-t border-white/[0.075] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:px-5" : "grid grid-cols-2 gap-2 border-t border-[#E5EAF0] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:px-5"}>
            <button className={getSoftButtonClassName(isDarkTheme)} type="button" onClick={onClose}>{copy.common.close}</button>
            {!isHyperliquidExchange ? (
              <button
                className={getPrimaryButtonClassName(isDarkTheme)}
                disabled={!canSave}
                type="button"
                onClick={() => void handleManualSave()}
              >
                {isSavingManual ? accountCopy.apiSetup.saving : accountCopy.apiSetup.save}
              </button>
            ) : null}
          </footer>
        </form>
      </section>
    </>
  );
}

