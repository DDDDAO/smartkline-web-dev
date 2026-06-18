"use client";

import type { JSX } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DemoExchangeSection,
  ExchangeApiSetupFooter,
  ExchangeApiSetupHeader,
  ExchangeSelector,
  LiveExchangeCredentialsSection,
  SelectedExchangeSummary,
} from "./exchange-api-setup-sections";
import { HyperliquidAgentWalletPanel, WhitelistIpCopyPanel } from "./copy-trading-prototype-helpers";
import { useExchangeApiSetupController, type ExchangeApiSetupController, type ExchangeApiSetupLayerProps } from "./use-exchange-api-setup-controller";

const EXCHANGE_SETUP_GRID_CLASS_NAME = "grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]";

export function ExchangeApiSetupLayer(props: ExchangeApiSetupLayerProps): JSX.Element {
  const { isDarkTheme, onClose } = props;
  const controller = useExchangeApiSetupController(props);

  return (
    <Sheet open onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <SheetContent
        aria-label={controller.accountCopy.apiSetup.title}
        className="inset-x-0 bottom-0 h-[96dvh] overflow-hidden rounded-t-[30px] p-0 shadow-[0_-26px_88px_rgba(15,23,42,0.26)] sm:inset-x-3 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:h-[min(920px,calc(100dvh-1rem))] sm:max-w-[920px] sm:-translate-y-1/2 sm:rounded-[30px] sm:shadow-[0_30px_90px_rgba(15,23,42,0.26)]"
        side="bottom"
      >
        <form
          className={isDarkTheme ? "flex h-full flex-col border border-white/[0.085] bg-[#111820] text-slate-100" : "flex h-full flex-col border border-[#D5E4EF] bg-white text-slate-950"}
          onSubmit={(event) => event.preventDefault()}
        >
          <ExchangeApiSetupHeader accountCopy={controller.accountCopy} commonCopy={controller.commonCopy} isDarkTheme={isDarkTheme} onClose={onClose} />

          <div className="kol-scroll-area min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            <div className={EXCHANGE_SETUP_GRID_CLASS_NAME}>
              <ExchangeSelector accountCopy={controller.accountCopy} isDarkTheme={isDarkTheme} selectedExchangeId={controller.selectedExchangeId} onExchangeSelect={controller.chooseExchange} />
              <main className={getExchangeContentClassName(controller.isHyperliquidExchange)}>
                <SelectedExchangeSummary
                  accountCopy={controller.accountCopy}
                  isBinanceDemoExchange={controller.isBinanceDemoExchange}
                  isBuiltInMockExchange={controller.isBuiltInMockExchange}
                  isDarkTheme={isDarkTheme}
                  isDemoExchange={controller.isDemoExchange}
                  selectedExchange={controller.selectedExchange}
                />
                <ExchangeSetupBody controller={controller} isDarkTheme={isDarkTheme} />
              </main>
            </div>
          </div>

          <ExchangeApiSetupFooter
            accountCopy={controller.accountCopy}
            canSave={controller.canSave}
            commonCopy={controller.commonCopy}
            isDarkTheme={isDarkTheme}
            isHyperliquidExchange={controller.isHyperliquidExchange}
            isSavingManual={controller.isSavingManual}
            onClose={onClose}
            onSave={() => void controller.handleManualSave()}
          />
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ExchangeSetupBody({
  controller,
  isDarkTheme,
}: {
  controller: ExchangeApiSetupController;
  isDarkTheme: boolean;
}): JSX.Element {
  if (controller.isDemoExchange) {
    return (
      <DemoExchangeSection
        accountCopy={controller.accountCopy}
        accountName={controller.accountName}
        apiKey={controller.apiKey}
        apiPassword={controller.apiPassword}
        isBuiltInMockExchange={controller.isBuiltInMockExchange}
        isDarkTheme={isDarkTheme}
        mockMarginBalance={controller.mockMarginBalance}
        requiresApiCredentials={controller.requiresApiCredentials}
        requiresApiPassword={controller.requiresApiPassword}
        secret={controller.secret}
        selectedExchange={controller.selectedExchange}
        onAccountNameChange={controller.setAccountName}
        onApiKeyChange={controller.setApiKey}
        onApiPasswordChange={controller.setApiPassword}
        onMockMarginBalanceChange={controller.updateMockMarginBalance}
        onMockMarginBalancePresetSelect={controller.selectMockMarginBalancePreset}
        onSecretChange={controller.setSecret}
      />
    );
  }

  return (
    <>
      <ExchangeAuthorizationPanel controller={controller} isDarkTheme={isDarkTheme} />
      {!controller.isHyperliquidExchange ? (
        <LiveExchangeCredentialsSection
          accountCopy={controller.accountCopy}
          accountName={controller.accountName}
          apiKey={controller.apiKey}
          apiPassword={controller.apiPassword}
          isDarkTheme={isDarkTheme}
          privateKey={controller.privateKey}
          requiresApiCredentials={controller.requiresApiCredentials}
          requiresApiPassword={controller.requiresApiPassword}
          requiresPrivateKey={controller.requiresPrivateKey}
          requiresWalletAddress={controller.requiresWalletAddress}
          secret={controller.secret}
          walletAddress={controller.walletAddress}
          walletAddressLabel={controller.walletAddressLabel}
          walletAddressPlaceholder={controller.walletAddressPlaceholder}
          onAccountNameChange={controller.setAccountName}
          onApiKeyChange={controller.setApiKey}
          onApiPasswordChange={controller.setApiPassword}
          onPrivateKeyChange={controller.setPrivateKey}
          onSecretChange={controller.setSecret}
          onWalletAddressChange={controller.setWalletAddress}
        />
      ) : null}
    </>
  );
}

function ExchangeAuthorizationPanel({
  controller,
  isDarkTheme,
}: {
  controller: ExchangeApiSetupController;
  isDarkTheme: boolean;
}): JSX.Element {
  if (controller.isHyperliquidExchange) {
    return (
      <HyperliquidAgentWalletPanel
        accountCopy={controller.accountCopy}
        agentBindingError={controller.agentBindingError}
        agentBindingStep={controller.agentBindingStep}
        agentWalletAddress={controller.agentWalletAddress}
        isBinding={controller.isAgentBinding}
        isDarkTheme={isDarkTheme}
        onBind={controller.handleHyperliquidAgentBind}
        onReset={controller.resetHyperliquidAgentBinding}
      />
    );
  }

  return (
    <WhitelistIpCopyPanel
      accountCopy={controller.accountCopy}
      description={controller.accountCopy.apiSetup.whitelistIpDescription}
      hasCopiedIp={controller.hasCopiedIp}
      hasWhitelistIp={controller.hasWhitelistIp}
      isDarkTheme={isDarkTheme}
      isLoading={controller.isWhitelistIpLoading}
      whitelistIp={controller.whitelistIp}
      whitelistIpError={controller.whitelistIpError}
      onCopy={controller.copyWhitelistIp}
    />
  );
}

function getExchangeContentClassName(isHyperliquidExchange: boolean): string {
  return isHyperliquidExchange ? "grid min-w-0 content-start gap-3 self-start" : "grid min-w-0 gap-4";
}
