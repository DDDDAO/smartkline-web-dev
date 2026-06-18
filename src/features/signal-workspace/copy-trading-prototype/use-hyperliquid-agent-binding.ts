"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { SignTypedDataMutateAsync as SignTypedDataAsync } from "wagmi/query";
import type { WorkspaceCopy } from "@/i18n/workspace";
import type { TradingFoxAccountResponse } from "@/lib/tradingfox-control-plane";
import { getTradingFoxErrorMessage } from "@/lib/tradingfox-errors";
import type { PrototypeExchange } from "./constants";
import {
  findHyperliquidSigningAction,
  requestHyperliquidAgentBindingComplete,
  requestHyperliquidAgentBindingStart,
  signHyperliquidTypedData,
} from "./copy-trading-prototype-helpers";

type AccountCenterCopy = WorkspaceCopy["workspace"]["accountCenter"];
type StringStateSetter = Dispatch<SetStateAction<string>>;

type HyperliquidAgentBindingOptions = {
  accountCopy: AccountCenterCopy;
  accountName: string;
  connectedWalletAddress: string | undefined;
  copy: WorkspaceCopy;
  disconnect: () => void;
  isHyperliquidExchange: boolean;
  onClose: () => void;
  onHyperliquidAgentBound: (account: TradingFoxAccountResponse, accountName: string) => void;
  selectedExchange: PrototypeExchange;
  setWalletAddress: StringStateSetter;
  signTypedDataAsync: SignTypedDataAsync;
};

export type HyperliquidAgentBindingState = {
  agentBindingError: string;
  agentBindingStep: string;
  agentWalletAddress: string;
  isAgentBinding: boolean;
  handleHyperliquidAgentBind: () => Promise<void>;
  resetAgentBindingState: () => void;
  resetHyperliquidAgentBinding: () => void;
};

export function useHyperliquidAgentBinding({
  accountCopy,
  accountName,
  connectedWalletAddress,
  copy,
  disconnect,
  isHyperliquidExchange,
  onClose,
  onHyperliquidAgentBound,
  selectedExchange,
  setWalletAddress,
  signTypedDataAsync,
}: HyperliquidAgentBindingOptions): HyperliquidAgentBindingState {
  const [agentWalletAddress, setAgentWalletAddress] = useState("");
  const [agentBindingError, setAgentBindingError] = useState("");
  const [agentBindingStep, setAgentBindingStep] = useState("");
  const [isAgentBinding, setIsAgentBinding] = useState(false);

  function resetAgentBindingState(): void {
    setAgentWalletAddress("");
    setAgentBindingError("");
    setAgentBindingStep("");
  }

  function resetHyperliquidAgentBinding(): void {
    if (isAgentBinding) {
      return;
    }

    resetAgentBindingState();
    setWalletAddress("");
    disconnect();
  }

  async function handleHyperliquidAgentBind(): Promise<void> {
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
  }

  return {
    agentBindingError,
    agentBindingStep,
    agentWalletAddress,
    isAgentBinding,
    handleHyperliquidAgentBind,
    resetAgentBindingState,
    resetHyperliquidAgentBinding,
  };
}
