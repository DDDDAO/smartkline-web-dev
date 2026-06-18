"use client";

import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import { SheetTitle } from "@/components/ui/sheet";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { EXCHANGES, MOCK_MARGIN_BALANCE_PRESETS, type PrototypeExchange, type PrototypeExchangeId } from "./constants";
import { formatAccountBalance } from "./formatters";
import { ExchangeIcon, ExchangeResourceLinks, getExchangeName, PrototypeInput } from "./copy-trading-prototype-helpers";
import { getExchangeButtonClassName, getIconButtonClassName, getModalSectionClassName, getPrimaryButtonClassName, getSoftButtonClassName } from "./styles";

type AccountCenterCopy = WorkspaceCopy["workspace"]["accountCenter"];
type CommonCopy = WorkspaceCopy["common"];

type ApiCredentialFieldsProps = {
  accountCopy: AccountCenterCopy;
  apiKey: string;
  apiPassword: string;
  isDarkTheme: boolean;
  requiresApiPassword: boolean;
  secret: string;
  onApiKeyChange: (value: string) => void;
  onApiPasswordChange: (value: string) => void;
  onSecretChange: (value: string) => void;
};

type DemoExchangeSectionProps = {
  accountCopy: AccountCenterCopy;
  accountName: string;
  apiKey: string;
  apiPassword: string;
  isBuiltInMockExchange: boolean;
  isDarkTheme: boolean;
  mockMarginBalance: string;
  requiresApiCredentials: boolean;
  requiresApiPassword: boolean;
  secret: string;
  selectedExchange: PrototypeExchange;
  onAccountNameChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onApiPasswordChange: (value: string) => void;
  onMockMarginBalanceChange: (value: string) => void;
  onMockMarginBalancePresetSelect: (value: number) => void;
  onSecretChange: (value: string) => void;
};

type ExchangeApiSetupFooterProps = {
  accountCopy: AccountCenterCopy;
  canSave: boolean;
  commonCopy: CommonCopy;
  isDarkTheme: boolean;
  isHyperliquidExchange: boolean;
  isSavingManual: boolean;
  onClose: () => void;
  onSave: () => void;
};

type ExchangeApiSetupHeaderProps = {
  accountCopy: AccountCenterCopy;
  commonCopy: CommonCopy;
  isDarkTheme: boolean;
  onClose: () => void;
};

type ExchangeSelectorProps = {
  accountCopy: AccountCenterCopy;
  isDarkTheme: boolean;
  selectedExchangeId: PrototypeExchangeId;
  onExchangeSelect: (exchange: PrototypeExchange) => void;
};

type LiveExchangeCredentialsSectionProps = {
  accountCopy: AccountCenterCopy;
  accountName: string;
  apiKey: string;
  apiPassword: string;
  isDarkTheme: boolean;
  privateKey: string;
  requiresApiCredentials: boolean;
  requiresApiPassword: boolean;
  requiresPrivateKey: boolean;
  requiresWalletAddress: boolean;
  secret: string;
  walletAddress: string;
  walletAddressLabel: string;
  walletAddressPlaceholder: string;
  onAccountNameChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onApiPasswordChange: (value: string) => void;
  onPrivateKeyChange: (value: string) => void;
  onSecretChange: (value: string) => void;
  onWalletAddressChange: (value: string) => void;
};

type SelectedExchangeSummaryProps = {
  accountCopy: AccountCenterCopy;
  isBinanceDemoExchange: boolean;
  isBuiltInMockExchange: boolean;
  isDarkTheme: boolean;
  isDemoExchange: boolean;
  selectedExchange: PrototypeExchange;
};

export function ExchangeApiSetupHeader({ accountCopy, commonCopy, isDarkTheme, onClose }: ExchangeApiSetupHeaderProps): JSX.Element {
  return (
    <header className={isDarkTheme ? "border-b border-white/[0.075] px-4 py-4 sm:px-5 sm:py-5" : "border-b border-[#E5EAF0] px-4 py-4 sm:px-5 sm:py-5"}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.16em] text-sky-300" : "text-[11px] font-black uppercase tracking-[0.16em] text-[#008DCC]"}>
            {accountCopy.apiSetup.selectExchange}
          </div>
          <SheetTitle className="mt-2 text-xl font-black tracking-tight">{accountCopy.apiSetup.title}</SheetTitle>
        </div>
        <Button aria-label={commonCopy.close} className={getIconButtonClassName(isDarkTheme)} size="icon" type="button" variant="outline" onClick={onClose}>
          <span aria-hidden="true" className="text-lg leading-none">×</span>
        </Button>
      </div>
    </header>
  );
}

export function ExchangeSelector({ accountCopy, isDarkTheme, selectedExchangeId, onExchangeSelect }: ExchangeSelectorProps): JSX.Element {
  return (
    <aside className={getExchangeSelectorClassName(isDarkTheme)}>
      <div className={isDarkTheme ? "px-1 pb-2 text-xs font-black text-slate-300" : "px-1 pb-2 text-xs font-black text-slate-700"}>
        {accountCopy.apiSetup.selectExchange}
      </div>
      <div className="kol-scroll-area flex gap-2 overflow-x-auto pb-1 lg:grid lg:content-start lg:overflow-visible lg:pb-0">
        {EXCHANGES.map((exchange) => (
          <Button
            key={exchange.id}
            className={getExchangeButtonClassName(isDarkTheme, exchange.enabled, exchange.id === selectedExchangeId)}
            disabled={!exchange.enabled}
            type="button"
            variant="ghost"
            onClick={() => onExchangeSelect(exchange)}
          >
            <ExchangeIcon enabled={exchange.enabled} exchange={exchange} isDarkTheme={isDarkTheme} />
            <span className="min-w-0 flex-1 whitespace-nowrap text-sm font-black">{getExchangeName(accountCopy, exchange.id)}</span>
            <ExchangeSelectorBadge accountCopy={accountCopy} exchange={exchange} isDarkTheme={isDarkTheme} />
          </Button>
        ))}
      </div>
    </aside>
  );
}

export function SelectedExchangeSummary({
  accountCopy,
  isBinanceDemoExchange,
  isBuiltInMockExchange,
  isDarkTheme,
  isDemoExchange,
  selectedExchange,
}: SelectedExchangeSummaryProps): JSX.Element {
  return (
    <section className={getModalSectionClassName(isDarkTheme)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <ExchangeIcon enabled exchange={selectedExchange} isDarkTheme={isDarkTheme} />
          <div className="min-w-0">
            <h3 className="truncate text-base font-black">{getExchangeName(accountCopy, selectedExchange.id)}</h3>
            <div className="mt-1 text-xs font-bold text-slate-500">
              {isDemoExchange ? accountCopy.apiSetup.demoMode : accountCopy.apiSetup.enabledExchange}
            </div>
          </div>
        </div>
        <SelectedExchangeBadge
          accountCopy={accountCopy}
          isBinanceDemoExchange={isBinanceDemoExchange}
          isBuiltInMockExchange={isBuiltInMockExchange}
          isDarkTheme={isDarkTheme}
        />
        <ExchangeResourceLinks accountCopy={accountCopy} exchange={selectedExchange} isDarkTheme={isDarkTheme} />
      </div>
    </section>
  );
}

export function DemoExchangeSection({
  accountCopy,
  accountName,
  apiKey,
  apiPassword,
  isBuiltInMockExchange,
  isDarkTheme,
  mockMarginBalance,
  requiresApiCredentials,
  requiresApiPassword,
  secret,
  selectedExchange,
  onAccountNameChange,
  onApiKeyChange,
  onApiPasswordChange,
  onMockMarginBalanceChange,
  onMockMarginBalancePresetSelect,
  onSecretChange,
}: DemoExchangeSectionProps): JSX.Element {
  return (
    <section className={getModalSectionClassName(isDarkTheme)}>
      <h3 className="text-base font-black">{accountCopy.apiSetup.demoTitle}</h3>
      <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
        {selectedExchange.id === "mockExchange" ? accountCopy.apiSetup.mockExchangeDescription : accountCopy.apiSetup.binanceDemoDescription}
      </p>
      <div className={isDarkTheme ? "mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] px-3 py-3 text-xs leading-5 text-emerald-100/85" : "mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800"}>
        {accountCopy.apiSetup.demoRiskNote}
      </div>
      <div className="mt-4 grid gap-3">
        <PrototypeInput autoComplete="off" fieldName="account-name" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.accountName} value={accountName} onChange={onAccountNameChange} />
        {requiresApiCredentials ? (
          <ApiCredentialFields
            accountCopy={accountCopy}
            apiKey={apiKey}
            apiPassword={apiPassword}
            isDarkTheme={isDarkTheme}
            requiresApiPassword={requiresApiPassword}
            secret={secret}
            onApiKeyChange={onApiKeyChange}
            onApiPasswordChange={onApiPasswordChange}
            onSecretChange={onSecretChange}
          />
        ) : null}
        {isBuiltInMockExchange ? (
          <MockMarginBalanceField
            accountCopy={accountCopy}
            isDarkTheme={isDarkTheme}
            mockMarginBalance={mockMarginBalance}
            onMockMarginBalanceChange={onMockMarginBalanceChange}
            onMockMarginBalancePresetSelect={onMockMarginBalancePresetSelect}
          />
        ) : null}
      </div>
      <SensitiveNote accountCopy={accountCopy} />
    </section>
  );
}

export function LiveExchangeCredentialsSection({
  accountCopy,
  accountName,
  apiKey,
  apiPassword,
  isDarkTheme,
  privateKey,
  requiresApiCredentials,
  requiresApiPassword,
  requiresPrivateKey,
  requiresWalletAddress,
  secret,
  walletAddress,
  walletAddressLabel,
  walletAddressPlaceholder,
  onAccountNameChange,
  onApiKeyChange,
  onApiPasswordChange,
  onPrivateKeyChange,
  onSecretChange,
  onWalletAddressChange,
}: LiveExchangeCredentialsSectionProps): JSX.Element {
  return (
    <section className={getModalSectionClassName(isDarkTheme)}>
      <h3 className="text-base font-black">{accountCopy.api.title}</h3>
      <p className={isDarkTheme ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-600"}>
        {accountCopy.apiSetup.liveExchangeDescription}
      </p>
      <div className="mt-4 grid gap-3">
        <PrototypeInput autoComplete="off" fieldName="account-name" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.accountName} value={accountName} onChange={onAccountNameChange} />
        {requiresApiCredentials ? (
          <ApiCredentialFields
            accountCopy={accountCopy}
            apiKey={apiKey}
            apiPassword={apiPassword}
            isDarkTheme={isDarkTheme}
            requiresApiPassword={requiresApiPassword}
            secret={secret}
            onApiKeyChange={onApiKeyChange}
            onApiPasswordChange={onApiPasswordChange}
            onSecretChange={onSecretChange}
          />
        ) : null}
        {requiresWalletAddress ? (
          <PrototypeInput autoComplete="off" fieldName="wallet-address" isDarkTheme={isDarkTheme} label={walletAddressLabel} placeholder={walletAddressPlaceholder} value={walletAddress} onChange={onWalletAddressChange} />
        ) : null}
        {requiresPrivateKey ? (
          <PrototypeInput autoComplete="new-password" fieldName="private-key" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.privateKey} placeholder={accountCopy.apiSetup.privateKeyPlaceholder} type="password" value={privateKey} onChange={onPrivateKeyChange} />
        ) : null}
      </div>
      <SensitiveNote accountCopy={accountCopy} />
    </section>
  );
}

export function ExchangeApiSetupFooter({ accountCopy, canSave, commonCopy, isDarkTheme, isHyperliquidExchange, isSavingManual, onClose, onSave }: ExchangeApiSetupFooterProps): JSX.Element {
  return (
    <footer className={isDarkTheme ? "grid grid-cols-2 gap-2 border-t border-white/[0.075] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:px-5" : "grid grid-cols-2 gap-2 border-t border-[#E5EAF0] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:px-5"}>
      <Button className={getSoftButtonClassName(isDarkTheme)} type="button" variant="outline" onClick={onClose}>{commonCopy.close}</Button>
      {!isHyperliquidExchange ? (
        <Button
          className={getPrimaryButtonClassName(isDarkTheme)}
          disabled={!canSave}
          type="button"
          onClick={onSave}
        >
          {isSavingManual ? accountCopy.apiSetup.saving : accountCopy.apiSetup.save}
        </Button>
      ) : null}
    </footer>
  );
}

function ApiCredentialFields({
  accountCopy,
  apiKey,
  apiPassword,
  isDarkTheme,
  requiresApiPassword,
  secret,
  onApiKeyChange,
  onApiPasswordChange,
  onSecretChange,
}: ApiCredentialFieldsProps): JSX.Element {
  return (
    <>
      <PrototypeInput autoComplete="off" fieldName="api-key" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.apiKey} placeholder={accountCopy.apiSetup.apiKeyPlaceholder} value={apiKey} onChange={onApiKeyChange} />
      <PrototypeInput autoComplete="new-password" fieldName="secret" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.secret} placeholder={accountCopy.apiSetup.secretPlaceholder} type="password" value={secret} onChange={onSecretChange} />
      {requiresApiPassword ? (
        <PrototypeInput autoComplete="new-password" fieldName="api-password" isDarkTheme={isDarkTheme} label={accountCopy.apiSetup.apiPassword} placeholder={accountCopy.apiSetup.apiPasswordPlaceholder} type="password" value={apiPassword} onChange={onApiPasswordChange} />
      ) : null}
    </>
  );
}

function ExchangeSelectorBadge({ accountCopy, exchange, isDarkTheme }: { accountCopy: AccountCenterCopy; exchange: PrototypeExchange; isDarkTheme: boolean }): JSX.Element | null {
  if (!exchange.enabled) {
    return <span className={isDarkTheme ? "shrink-0 text-[10px] font-bold text-slate-500" : "shrink-0 text-[10px] font-bold text-slate-400"}>{accountCopy.apiSetup.comingSoon}</span>;
  }

  if (exchange.mode === "demo") {
    return <span className={isDarkTheme ? "shrink-0 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black text-emerald-300" : "shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700"}>{accountCopy.apiSetup.demoBadge}</span>;
  }

  return null;
}

function MockMarginBalanceField({
  accountCopy,
  isDarkTheme,
  mockMarginBalance,
  onMockMarginBalanceChange,
  onMockMarginBalancePresetSelect,
}: {
  accountCopy: AccountCenterCopy;
  isDarkTheme: boolean;
  mockMarginBalance: string;
  onMockMarginBalanceChange: (value: string) => void;
  onMockMarginBalancePresetSelect: (value: number) => void;
}): JSX.Element {
  return (
    <div>
      <PrototypeInput
        autoComplete="off"
        fieldName="mock-margin-balance"
        inputMode="decimal"
        isDarkTheme={isDarkTheme}
        label={accountCopy.apiSetup.mockMarginBalance}
        placeholder={accountCopy.apiSetup.mockMarginBalancePlaceholder}
        value={mockMarginBalance}
        onChange={onMockMarginBalanceChange}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {MOCK_MARGIN_BALANCE_PRESETS.map((amount) => (
          <Button
            key={amount}
            className={getSoftButtonClassName(isDarkTheme)}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onMockMarginBalancePresetSelect(amount)}
          >
            {formatAccountBalance(amount)}
          </Button>
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{accountCopy.apiSetup.mockMarginBalanceLimit}</p>
    </div>
  );
}

function SelectedExchangeBadge({
  accountCopy,
  isBinanceDemoExchange,
  isBuiltInMockExchange,
  isDarkTheme,
}: {
  accountCopy: AccountCenterCopy;
  isBinanceDemoExchange: boolean;
  isBuiltInMockExchange: boolean;
  isDarkTheme: boolean;
}): JSX.Element | null {
  if (isBuiltInMockExchange) {
    return <span className={getDemoStatusBadgeClassName(isDarkTheme)}>{accountCopy.apiSetup.noKeysRequired}</span>;
  }

  if (isBinanceDemoExchange) {
    return <span className={getDemoStatusBadgeClassName(isDarkTheme)}>{accountCopy.apiSetup.noWhitelistIpRequired}</span>;
  }

  return null;
}

function SensitiveNote({ accountCopy }: { accountCopy: AccountCenterCopy }): JSX.Element {
  return <p className="mt-3 text-xs leading-5 text-slate-500">{accountCopy.apiSetup.sensitiveNote}</p>;
}

function getDemoStatusBadgeClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200"
    : "rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700";
}

function getExchangeSelectorClassName(isDarkTheme: boolean): string {
  const baseClassName = "flex min-h-0 flex-col overflow-hidden rounded-[24px] p-3 self-start";
  return isDarkTheme
    ? `${baseClassName} border border-white/[0.075] bg-white/[0.035]`
    : `${baseClassName} border border-[#E5EAF0] bg-[#FAFBFD]`;
}
