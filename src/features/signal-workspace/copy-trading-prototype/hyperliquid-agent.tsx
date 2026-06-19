"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { isWalletConnectConfigured } from "@/lib/wallet-connect";
import type { TradingFoxAccountResponse, TradingFoxHyperliquidAgentBindingStartResponse, TradingFoxHyperliquidSigningAction } from "@/lib/tradingfox-control-plane";
import { HYPERLIQUID_DEPOSIT_URL } from "./constants";
import { CheckGlyph, CopyGlyph } from "./icons";
import { getLabelClassName, getModalSectionClassName } from "./styles";
import type { SignTypedDataMutateAsync as SignTypedDataAsync, SignTypedDataVariables as WagmiSignTypedDataVariables } from "wagmi/query";

export function HyperliquidAgentWalletPanel({
  accountCopy,
  agentBindingError,
  agentBindingStep,
  agentWalletAddress,
  isBinding,
  isDarkTheme,
  onBind,
  onReset,
}: {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  agentBindingError: string;
  agentBindingStep: string;
  agentWalletAddress: string;
  isBinding: boolean;
  isDarkTheme: boolean;
  onBind: () => void;
  onReset: () => void;
}) {
  const bindingActionLabel = agentBindingStep || accountCopy.apiSetup.hyperliquidAgentBinding;
  const connectActionLabel = isBinding ? bindingActionLabel : accountCopy.apiSetup.hyperliquidAgentConnectAuthorize;
  const authorizeActionLabel = isBinding ? bindingActionLabel : accountCopy.apiSetup.hyperliquidAgentContinueAuthorize;
  const renderConnectButton = (openConnectModal: (() => void) | undefined) => (
    <Button
      className={getPrimaryButtonClassName(isDarkTheme)}
      disabled={isBinding || !openConnectModal}
      type="button"
      onClick={() => openConnectModal?.()}
    >
      {connectActionLabel}
    </Button>
  );

  return (
    <section className={isDarkTheme ? "rounded-[24px] border border-indigo-300/20 bg-indigo-300/[0.07] p-3 sm:p-4" : "rounded-[24px] border border-[#C7D2FE] bg-[#EEF2FF] p-3 sm:p-4"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={isDarkTheme ? "rounded-full bg-indigo-300/15 px-2.5 py-1 text-[11px] font-black text-indigo-100" : "rounded-full bg-[#DDF5FF] px-2.5 py-1 text-[11px] font-black text-[#4F46E5]"}>
              {accountCopy.apiSetup.recommendedBadge}
            </span>
            <span className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.14em] text-indigo-200/70" : "text-[11px] font-black uppercase tracking-[0.14em] text-[#4F46E5]/70"}>
              {accountCopy.apiSetup.hyperliquidAgentMode}
            </span>
          </div>
          <h3 className="mt-3 text-base font-black">{accountCopy.apiSetup.hyperliquidAgentTitle}</h3>
          <p className={isDarkTheme ? "mt-2 max-w-2xl text-sm leading-6 text-slate-300" : "mt-2 max-w-2xl text-sm leading-6 text-slate-700"}>
            {accountCopy.apiSetup.hyperliquidAgentDescription}
          </p>
          {!isWalletConnectConfigured ? (
            <div className={isDarkTheme ? "mt-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.08] px-3 py-2 text-xs leading-5 text-amber-100" : "mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800"}>
              {accountCopy.apiSetup.hyperliquidWalletConnectMissing}
            </div>
          ) : null}
        </div>
        <ConnectButton.Custom>
          {({ account, mounted, openConnectModal }) => (
            mounted && account ? (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button
                  className={getPrimaryButtonClassName(isDarkTheme)}
                  disabled={isBinding}
                  type="button"
                  onClick={() => onBind()}
                >
                  {authorizeActionLabel}
                </Button>
                <Button
                  className={getSoftButtonClassName(isDarkTheme)}
                  disabled={isBinding}
                  type="button"
                  variant="outline"
                  onClick={() => onReset()}
                >
                  {accountCopy.apiSetup.hyperliquidAgentReconnect}
                </Button>
              </div>
            ) : renderConnectButton(openConnectModal)
          )}
        </ConnectButton.Custom>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {accountCopy.apiSetup.hyperliquidAgentSteps.map((step, index) => (
          <div
            key={step}
            className={isDarkTheme ? "rounded-2xl border border-indigo-200/10 bg-[#0F141B]/70 px-3 py-2.5" : "rounded-2xl border border-[#C7D2FE] bg-white/80 px-3 py-2.5"}
          >
            <div className={isDarkTheme ? "text-[10px] font-black uppercase tracking-[0.14em] text-indigo-200/60" : "text-[10px] font-black uppercase tracking-[0.14em] text-[#4F46E5]/60"}>
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className={isDarkTheme ? "mt-1 text-xs font-black text-indigo-50" : "mt-1 text-xs font-black text-slate-900"}>
              {step}
            </div>
          </div>
        ))}
      </div>

      <div className={isDarkTheme ? "mt-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.08] px-3 py-2.5" : "mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2.5"}>
        <div className={isDarkTheme ? "text-xs font-black text-amber-100" : "text-xs font-black text-amber-800"}>
          {accountCopy.apiSetup.hyperliquidDepositRequired}
        </div>
        <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-amber-100/80" : "mt-1 text-xs leading-5 text-amber-800/85"}>
          {accountCopy.apiSetup.hyperliquidDepositDescription}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-black">
          <span className={isDarkTheme ? "text-amber-100/80" : "text-amber-800/80"}>{accountCopy.apiSetup.hyperliquidCurrentBalance}</span>
          <span className={isDarkTheme ? "rounded-full bg-[#0F141B]/70 px-2.5 py-1 text-amber-100" : "rounded-full bg-white px-2.5 py-1 text-amber-800"}>5 USDC</span>
          <a
            className={isDarkTheme ? "text-indigo-200 underline decoration-indigo-200/40 underline-offset-4 hover:text-indigo-100" : "text-[#4F46E5] underline decoration-[#4F46E5]/35 underline-offset-4 hover:text-[#005F8C]"}
            href={HYPERLIQUID_DEPOSIT_URL}
            rel="noreferrer"
            target="_blank"
          >
            {accountCopy.apiSetup.hyperliquidDepositAction}
          </a>
        </div>
      </div>

      {agentWalletAddress ? (
        <div className={isDarkTheme ? "mt-3 break-all rounded-2xl border border-indigo-200/10 bg-[#0F141B]/70 px-3 py-2 font-mono text-xs font-black text-indigo-100" : "mt-3 break-all rounded-2xl border border-[#C7D2FE] bg-white/80 px-3 py-2 font-mono text-xs font-black text-[#4F46E5]"}>
          {agentWalletAddress}
        </div>
      ) : null}
      {agentBindingError ? (
        <div className={isDarkTheme ? "mt-3 rounded-2xl border border-rose-300/15 bg-rose-400/[0.08] px-3 py-2 text-xs leading-5 text-rose-100" : "mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700"}>
          {agentBindingError}
        </div>
      ) : null}
    </section>
  );
}

export function WhitelistIpCopyPanel({
  accountCopy,
  description,
  hasCopiedIp,
  hasWhitelistIp,
  isDarkTheme,
  isLoading,
  whitelistIp,
  whitelistIpError,
  onCopy,
}: {
  accountCopy: WorkspaceCopy["workspace"]["accountCenter"];
  description: string;
  hasCopiedIp: boolean;
  hasWhitelistIp: boolean;
  isDarkTheme: boolean;
  isLoading: boolean;
  whitelistIp: string;
  whitelistIpError: string;
  onCopy: () => void;
}) {
  return (
    <section className={getModalSectionClassName(isDarkTheme)}>
      <div className={getLabelClassName(isDarkTheme)}>{accountCopy.apiSetup.whitelistIp}</div>
      <div className="mt-2 flex items-stretch gap-2">
        <div className={isDarkTheme ? "flex min-h-11 min-w-0 flex-1 items-center break-all rounded-[18px] border border-white/[0.085] bg-[#0F141B] px-3 font-mono text-sm font-black tracking-[0.045em] text-slate-100" : "flex min-h-11 min-w-0 flex-1 items-center break-all rounded-[18px] border border-[#E8E8EC] bg-[#FAFAFA] px-3 font-mono text-sm font-black tracking-[0.045em] text-slate-900"}>
          {isLoading ? accountCopy.apiSetup.whitelistIpLoading : (whitelistIp || accountCopy.apiSetup.whitelistIpUnavailable)}
        </div>
        <Button
          aria-label={accountCopy.apiSetup.copyWhitelistIp}
          className={getWhitelistCopyButtonClassName(isDarkTheme)}
          disabled={!hasWhitelistIp}
          size="icon"
          title={accountCopy.apiSetup.copyWhitelistIp}
          type="button"
          variant="outline"
          onClick={onCopy}
        >
          {hasCopiedIp ? <CheckGlyph /> : <CopyGlyph />}
        </Button>
      </div>
      <p className={whitelistIpError
        ? isDarkTheme ? "mt-3 text-xs leading-5 text-amber-200" : "mt-3 text-xs leading-5 text-amber-700"
        : isDarkTheme ? "mt-3 text-xs leading-5 text-slate-500" : "mt-3 text-xs leading-5 text-slate-500"}
      >
        {whitelistIpError || description}
      </p>
    </section>
  );
}

export type TradingFoxWhitelistIPAssignment = {
  assignmentStatus?: "assigned" | "unassigned";
  whitelistIp: string;
};

function getPrimaryButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-2xl bg-indigo-400 text-slate-950 hover:bg-indigo-300"
    : "rounded-2xl bg-[#6366F1] text-white hover:bg-[#4F46E5]";
}

function getSoftButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-2xl border-white/[0.075] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
    : "rounded-2xl border-[#E8E8EC] bg-white text-slate-700 hover:border-[#C7D2FE] hover:bg-[#F5F5FF] hover:text-slate-950";
}

function getWhitelistCopyButtonClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "h-11 w-11 rounded-full border-white/[0.085] bg-white/[0.04] text-slate-300 hover:border-indigo-300/25 hover:bg-white/[0.08] hover:text-slate-50"
    : "h-11 w-11 rounded-full border-[#E8E8EC] bg-white text-slate-500 shadow-sm hover:border-[#C7D2FE] hover:text-slate-900";
}

export async function requestTradingFoxConnectorWhitelistIP(exchangePlatform: string): Promise<TradingFoxWhitelistIPAssignment> {
  const query = new URLSearchParams({ exchangePlatform });
  const response = await fetch(`/api/tradingfox/connectors/whitelist-ip?${query.toString()}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await response.json() as {
    assignmentStatus?: "assigned" | "unassigned";
    error?: string;
    ipAddress?: { address?: string } | null;
    whitelistIp?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || `Whitelist IP request failed with status ${response.status}.`);
  }
  const ipAddress = typeof payload.ipAddress?.address === "string" ? payload.ipAddress.address.trim() : "";
  return {
    assignmentStatus: payload.assignmentStatus,
    whitelistIp: ipAddress || (typeof payload.whitelistIp === "string" ? payload.whitelistIp.trim() : ""),
  };
}

export async function requestHyperliquidAgentBindingStart(input: {
  accountName: string;
  walletAddress: string;
}): Promise<TradingFoxHyperliquidAgentBindingStartResponse> {
  const response = await fetch("/api/tradingfox/connectors/hyperliquid-agent", {
    body: JSON.stringify(input),
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await response.json().catch(() => null) as TradingFoxHyperliquidAgentBindingStartResponse & { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || `HyperLiquid agent binding request failed with status ${response.status}.`);
  }
  if (!payload) {
    throw new Error("HyperLiquid agent binding response is empty.");
  }
  return payload;
}

export async function requestHyperliquidAgentBindingComplete(
  bindingId: number,
  input: {
    approveAgentSignature: string;
    approveBuilderFeeSignature: string;
  },
): Promise<TradingFoxAccountResponse> {
  const response = await fetch(`/api/tradingfox/connectors/hyperliquid-agent/${encodeURIComponent(String(bindingId))}/complete`, {
    body: JSON.stringify(input),
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await response.json().catch(() => null) as TradingFoxAccountResponse & { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || `HyperLiquid agent binding completion failed with status ${response.status}.`);
  }
  if (!payload) {
    throw new Error("HyperLiquid agent binding completion response is empty.");
  }
  return payload;
}

export function findHyperliquidSigningAction(
  actions: readonly TradingFoxHyperliquidSigningAction[],
  kind: TradingFoxHyperliquidSigningAction["kind"],
): TradingFoxHyperliquidSigningAction | null {
  return actions.find((action) => action.kind === kind) ?? null;
}

export async function signHyperliquidTypedData(
  signTypedDataAsync: SignTypedDataAsync,
  walletAddress: string,
  action: TradingFoxHyperliquidSigningAction,
): Promise<string> {
  const signature = await signTypedDataAsync({
    account: walletAddress as `0x${string}`,
    domain: action.typedData.domain,
    message: action.typedData.message,
    primaryType: action.typedData.primaryType,
    types: action.typedData.types,
  } as unknown as WagmiSignTypedDataVariables);
  if (typeof signature !== "string" || !signature.trim()) {
    throw new Error("Wallet did not return a typed-data signature.");
  }
  return signature;
}
