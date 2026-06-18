"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useAccount, useDisconnect, useSignTypedData } from "wagmi";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TradingFoxAccountResponse } from "@/lib/tradingfox-control-plane";
import { MOCK_MARGIN_BALANCE_MAX, type PrototypeExchange, type PrototypeExchangeId } from "./constants";
import type { PrototypeConnectionSaveInput } from "./types";
import { getExchangeById } from "./copy-trading-prototype-helpers";
import { useHyperliquidAgentBinding } from "./use-hyperliquid-agent-binding";
import { useWhitelistIpAssignment } from "./use-exchange-whitelist-ip";

type AccountCenterCopy = WorkspaceCopy["workspace"]["accountCenter"];
type StringStateSetter = Dispatch<SetStateAction<string>>;

export type ExchangeApiSetupLayerProps = {
  copy: WorkspaceCopy;
  initialAccountName: string;
  initialMockMarginBalance: number | null;
  isDarkTheme: boolean;
  onClose: () => void;
  onHyperliquidAgentBound: (account: TradingFoxAccountResponse, accountName: string) => void;
  onSave: (input: PrototypeConnectionSaveInput) => Promise<boolean> | boolean;
};

export type ExchangeApiSetupController = {
  accountCopy: AccountCenterCopy;
  accountName: string;
  agentBindingError: string;
  agentBindingStep: string;
  agentWalletAddress: string;
  apiKey: string;
  apiPassword: string;
  canSave: boolean;
  commonCopy: WorkspaceCopy["common"];
  hasCopiedIp: boolean;
  hasWhitelistIp: boolean;
  isAgentBinding: boolean;
  isBinanceDemoExchange: boolean;
  isBuiltInMockExchange: boolean;
  isDemoExchange: boolean;
  isHyperliquidExchange: boolean;
  isSavingManual: boolean;
  isWhitelistIpLoading: boolean;
  mockMarginBalance: string;
  privateKey: string;
  requiresApiCredentials: boolean;
  requiresApiPassword: boolean;
  requiresPrivateKey: boolean;
  requiresWalletAddress: boolean;
  secret: string;
  selectedExchange: PrototypeExchange;
  selectedExchangeId: PrototypeExchangeId;
  walletAddress: string;
  walletAddressLabel: string;
  walletAddressPlaceholder: string;
  whitelistIp: string;
  whitelistIpError: string;
  chooseExchange: (exchange: PrototypeExchange) => void;
  copyWhitelistIp: () => void;
  handleHyperliquidAgentBind: () => Promise<void>;
  handleManualSave: () => Promise<void>;
  resetHyperliquidAgentBinding: () => void;
  selectMockMarginBalancePreset: (amount: number) => void;
  setAccountName: StringStateSetter;
  setApiKey: StringStateSetter;
  setApiPassword: StringStateSetter;
  setPrivateKey: StringStateSetter;
  setSecret: StringStateSetter;
  setWalletAddress: StringStateSetter;
  updateMockMarginBalance: (value: string) => void;
};

type CanSaveConnectionOptions = {
  accountName: string;
  hasApiCredentials: boolean;
  hasApiPassword: boolean;
  hasPrivateKey: boolean;
  hasValidMockMarginBalance: boolean;
  hasWalletAddress: boolean;
  hasWhitelistRequirement: boolean;
  isAgentBinding: boolean;
  isBinanceDemoExchange: boolean;
  isBuiltInMockExchange: boolean;
  isSavingManual: boolean;
  isWhitelistIpLoading: boolean;
};

export function useExchangeApiSetupController({
  copy,
  initialAccountName,
  initialMockMarginBalance,
  onClose,
  onHyperliquidAgentBound,
  onSave,
}: ExchangeApiSetupLayerProps): ExchangeApiSetupController {
  const [selectedExchangeId, setSelectedExchangeId] = useState<PrototypeExchangeId>("binance");
  const selectedExchange = getExchangeById(selectedExchangeId);
  const [accountName, setAccountName] = useState(initialAccountName || selectedExchange.defaultAccountName);
  const [mockMarginBalance, setMockMarginBalance] = useState(String(initialMockMarginBalance ?? 10000));
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [apiPassword, setApiPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);
  const { address: connectedWalletAddress } = useAccount();
  const { disconnect } = useDisconnect();
  const { signTypedDataAsync } = useSignTypedData();
  const accountCopy = copy.workspace.accountCenter;
  const exchangeState = getExchangeState(selectedExchange);
  const whitelist = useWhitelistIpAssignment({
    accountCopy,
    exchangePlatform: selectedExchange.connectorExchangePlatform,
    isLiveExchange: exchangeState.isLiveExchange,
  });
  const agentBinding = useHyperliquidAgentBinding({
    accountCopy,
    accountName,
    connectedWalletAddress,
    copy,
    disconnect,
    isHyperliquidExchange: exchangeState.isHyperliquidExchange,
    onClose,
    onHyperliquidAgentBound,
    selectedExchange,
    setWalletAddress,
    signTypedDataAsync,
  });
  const formRequirements = getFormRequirements(selectedExchange, exchangeState.isBuiltInMockExchange, exchangeState.isHyperliquidExchange);
  const formValidity = getFormValidity({
    apiKey,
    apiPassword,
    mockMarginBalance,
    privateKey,
    secret,
    walletAddress,
    ...formRequirements,
  });
  const canSave = canSaveConnection({
    accountName,
    hasWhitelistRequirement: !exchangeState.isLiveExchange || whitelist.hasWhitelistIp || whitelist.isWhitelistIpOptional,
    isAgentBinding: agentBinding.isAgentBinding,
    isBinanceDemoExchange: exchangeState.isBinanceDemoExchange,
    isBuiltInMockExchange: exchangeState.isBuiltInMockExchange,
    isSavingManual,
    isWhitelistIpLoading: whitelist.isWhitelistIpLoading,
    ...formValidity,
  });

  function updateMockMarginBalance(value: string): void {
    const normalizedValue = value.replace(/[^\d.]/gu, "");
    const parsedValue = Number(normalizedValue);
    if (Number.isFinite(parsedValue) && parsedValue > MOCK_MARGIN_BALANCE_MAX) {
      setMockMarginBalance(String(MOCK_MARGIN_BALANCE_MAX));
      return;
    }

    setMockMarginBalance(normalizedValue);
  }

  function selectMockMarginBalancePreset(amount: number): void {
    setMockMarginBalance(String(amount));
  }

  function chooseExchange(exchange: PrototypeExchange): void {
    if (!exchange.enabled) {
      return;
    }

    const previousDefaultAccountName = selectedExchange.defaultAccountName;
    setSelectedExchangeId(exchange.id);
    whitelist.resetCopiedIp();
    setApiKey("");
    setSecret("");
    setApiPassword("");
    setWalletAddress("");
    setPrivateKey("");
    agentBinding.resetAgentBindingState();
    setAccountName((currentAccountName) => {
      const trimmedAccountName = currentAccountName.trim();
      if (trimmedAccountName.length > 0 && trimmedAccountName !== previousDefaultAccountName) {
        return currentAccountName;
      }

      return exchange.defaultAccountName;
    });
  }

  async function handleManualSave(): Promise<void> {
    if (!canSave || isSavingManual) {
      return;
    }

    setIsSavingManual(true);
    try {
      const isSaved = await onSave({
        accountName: accountName.trim() || selectedExchange.defaultAccountName,
        apiKey: formRequirements.requiresApiCredentials ? apiKey.trim() : undefined,
        exchangePlatform: selectedExchange.connectorExchangePlatform,
        ipAddress: exchangeState.isLiveExchange && whitelist.hasWhitelistIp ? whitelist.whitelistIp.trim() : undefined,
        isMock: exchangeState.isBuiltInMockExchange,
        mockMarginBalance: exchangeState.isBuiltInMockExchange && formValidity.hasValidMockMarginBalance ? Number(mockMarginBalance) : undefined,
        password: formRequirements.requiresApiPassword ? apiPassword.trim() : undefined,
        privateKey: formRequirements.requiresPrivateKey ? privateKey.trim() : undefined,
        secret: formRequirements.requiresApiCredentials ? secret.trim() : undefined,
        walletAddress: formRequirements.requiresWalletAddress ? walletAddress.trim() : undefined,
      });
      if (isSaved) {
        onClose();
      }
    } finally {
      setIsSavingManual(false);
    }
  }

  return {
    accountCopy,
    accountName,
    agentBindingError: agentBinding.agentBindingError,
    agentBindingStep: agentBinding.agentBindingStep,
    agentWalletAddress: agentBinding.agentWalletAddress,
    apiKey,
    apiPassword,
    canSave,
    commonCopy: copy.common,
    hasCopiedIp: whitelist.hasCopiedIp,
    hasWhitelistIp: whitelist.hasWhitelistIp,
    isAgentBinding: agentBinding.isAgentBinding,
    isSavingManual,
    mockMarginBalance,
    privateKey,
    secret,
    selectedExchange,
    selectedExchangeId,
    walletAddress,
    walletAddressLabel: exchangeState.isHyperliquidExchange ? accountCopy.apiSetup.mainWalletAddress : accountCopy.apiSetup.walletAddress,
    walletAddressPlaceholder: exchangeState.isHyperliquidExchange ? accountCopy.apiSetup.mainWalletAddressPlaceholder : accountCopy.apiSetup.walletAddressPlaceholder,
    whitelistIp: whitelist.whitelistIp,
    whitelistIpError: whitelist.whitelistIpError,
    chooseExchange,
    copyWhitelistIp: whitelist.copyWhitelistIp,
    handleHyperliquidAgentBind: agentBinding.handleHyperliquidAgentBind,
    handleManualSave,
    resetHyperliquidAgentBinding: agentBinding.resetHyperliquidAgentBinding,
    selectMockMarginBalancePreset,
    setAccountName,
    setApiKey,
    setApiPassword,
    setPrivateKey,
    setSecret,
    setWalletAddress,
    updateMockMarginBalance,
    ...exchangeState,
    ...formRequirements,
    isWhitelistIpLoading: whitelist.isWhitelistIpLoading,
  };
}

function getExchangeState(selectedExchange: PrototypeExchange): {
  isBinanceDemoExchange: boolean;
  isBuiltInMockExchange: boolean;
  isDemoExchange: boolean;
  isHyperliquidExchange: boolean;
  isLiveExchange: boolean;
} {
  const isDemoExchange = selectedExchange.mode === "demo";
  const isHyperliquidExchange = selectedExchange.id === "hyperliquid";

  return {
    isBinanceDemoExchange: selectedExchange.id === "binanceDemo",
    isBuiltInMockExchange: selectedExchange.id === "mockExchange",
    isDemoExchange,
    isHyperliquidExchange,
    isLiveExchange: !isDemoExchange && !isHyperliquidExchange,
  };
}

function getFormRequirements(
  selectedExchange: PrototypeExchange,
  isBuiltInMockExchange: boolean,
  isHyperliquidExchange: boolean,
): {
  requiresApiCredentials: boolean;
  requiresApiPassword: boolean;
  requiresPrivateKey: boolean;
  requiresWalletAddress: boolean;
} {
  return {
    requiresApiCredentials: !isBuiltInMockExchange && !isHyperliquidExchange,
    requiresApiPassword: selectedExchange.requiresApiPassword,
    requiresPrivateKey: selectedExchange.requiresPrivateKey,
    requiresWalletAddress: selectedExchange.requiresWalletAddress,
  };
}

function getFormValidity({
  apiKey,
  apiPassword,
  mockMarginBalance,
  privateKey,
  requiresApiCredentials,
  requiresApiPassword,
  requiresPrivateKey,
  requiresWalletAddress,
  secret,
  walletAddress,
}: {
  apiKey: string;
  apiPassword: string;
  mockMarginBalance: string;
  privateKey: string;
  requiresApiCredentials: boolean;
  requiresApiPassword: boolean;
  requiresPrivateKey: boolean;
  requiresWalletAddress: boolean;
  secret: string;
  walletAddress: string;
}): {
  hasApiCredentials: boolean;
  hasApiPassword: boolean;
  hasPrivateKey: boolean;
  hasValidMockMarginBalance: boolean;
  hasWalletAddress: boolean;
} {
  const parsedMockMarginBalance = Number(mockMarginBalance);

  return {
    hasApiCredentials: !requiresApiCredentials || (apiKey.trim().length > 0 && secret.trim().length > 0),
    hasApiPassword: !requiresApiPassword || apiPassword.trim().length > 0,
    hasPrivateKey: !requiresPrivateKey || privateKey.trim().length > 0,
    hasValidMockMarginBalance: Number.isFinite(parsedMockMarginBalance) && parsedMockMarginBalance > 0 && parsedMockMarginBalance <= MOCK_MARGIN_BALANCE_MAX,
    hasWalletAddress: !requiresWalletAddress || walletAddress.trim().length > 0,
  };
}

function canSaveConnection({
  accountName,
  hasApiCredentials,
  hasApiPassword,
  hasPrivateKey,
  hasValidMockMarginBalance,
  hasWalletAddress,
  hasWhitelistRequirement,
  isAgentBinding,
  isBinanceDemoExchange,
  isBuiltInMockExchange,
  isSavingManual,
  isWhitelistIpLoading,
}: CanSaveConnectionOptions): boolean {
  if (accountName.trim().length === 0) {
    return false;
  }

  if (isBuiltInMockExchange) {
    return hasValidMockMarginBalance;
  }

  if (isBinanceDemoExchange) {
    return hasApiCredentials;
  }

  return hasApiCredentials && hasApiPassword && hasWalletAddress && hasPrivateKey && hasWhitelistRequirement && !isWhitelistIpLoading && !isSavingManual && !isAgentBinding;
}
