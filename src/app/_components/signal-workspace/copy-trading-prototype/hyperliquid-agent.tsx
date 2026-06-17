"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { WorkspaceCopy } from "@/app/_lib/i18n";
import { isWalletConnectConfigured } from "@/app/_lib/wallet-connect";
import type { TradingFoxAccountResponse, TradingFoxHyperliquidAgentBindingStartResponse, TradingFoxHyperliquidSigningAction } from "@/app/_lib/tradingfox-control-plane";
import { HYPERLIQUID_DEPOSIT_URL } from "./constants";
import { CheckGlyph, CopyGlyph } from "./icons";
import { getLabelClassName, getModalSectionClassName, getPrimaryButtonClassName, getSoftButtonClassName, getWhitelistCopyButtonClassName } from "./styles";
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
    <button
      className={getPrimaryButtonClassName(isDarkTheme)}
      disabled={isBinding || !openConnectModal}
      type="button"
      onClick={() => openConnectModal?.()}
    >
      {connectActionLabel}
    </button>
  );

  return (
    <section className={isDarkTheme ? "rounded-[24px] border border-sky-300/20 bg-sky-300/[0.07] p-3 sm:p-4" : "rounded-[24px] border border-[#BFE7FB] bg-[#F1FBFF] p-3 sm:p-4"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={isDarkTheme ? "rounded-full bg-sky-300/15 px-2.5 py-1 text-[11px] font-black text-sky-100" : "rounded-full bg-[#DDF5FF] px-2.5 py-1 text-[11px] font-black text-[#007DB8]"}>
              {accountCopy.apiSetup.recommendedBadge}
            </span>
            <span className={isDarkTheme ? "text-[11px] font-black uppercase tracking-[0.14em] text-sky-200/70" : "text-[11px] font-black uppercase tracking-[0.14em] text-[#007DB8]/70"}>
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
                <button
                  className={getPrimaryButtonClassName(isDarkTheme)}
                  disabled={isBinding}
                  type="button"
                  onClick={() => onBind()}
                >
                  {authorizeActionLabel}
                </button>
                <button
                  className={getSoftButtonClassName(isDarkTheme)}
                  disabled={isBinding}
                  type="button"
                  onClick={() => onReset()}
                >
                  {accountCopy.apiSetup.hyperliquidAgentReconnect}
                </button>
              </div>
            ) : renderConnectButton(openConnectModal)
          )}
        </ConnectButton.Custom>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {accountCopy.apiSetup.hyperliquidAgentSteps.map((step, index) => (
          <div
            key={step}
            className={isDarkTheme ? "rounded-2xl border border-sky-200/10 bg-[#0F141B]/70 px-3 py-2.5" : "rounded-2xl border border-[#BFE7FB] bg-white/80 px-3 py-2.5"}
          >
            <div className={isDarkTheme ? "text-[10px] font-black uppercase tracking-[0.14em] text-sky-200/60" : "text-[10px] font-black uppercase tracking-[0.14em] text-[#007DB8]/60"}>
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className={isDarkTheme ? "mt-1 text-xs font-black text-sky-50" : "mt-1 text-xs font-black text-slate-900"}>
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
            className={isDarkTheme ? "text-sky-200 underline decoration-sky-200/40 underline-offset-4 hover:text-sky-100" : "text-[#007DB8] underline decoration-[#007DB8]/35 underline-offset-4 hover:text-[#005F8C]"}
            href={HYPERLIQUID_DEPOSIT_URL}
            rel="noreferrer"
            target="_blank"
          >
            {accountCopy.apiSetup.hyperliquidDepositAction}
          </a>
        </div>
      </div>

      {agentWalletAddress ? (
        <div className={isDarkTheme ? "mt-3 break-all rounded-2xl border border-sky-200/10 bg-[#0F141B]/70 px-3 py-2 font-mono text-xs font-black text-sky-100" : "mt-3 break-all rounded-2xl border border-[#BFE7FB] bg-white/80 px-3 py-2 font-mono text-xs font-black text-[#007DB8]"}>
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
        <div className={isDarkTheme ? "flex min-h-11 min-w-0 flex-1 items-center break-all rounded-[18px] border border-white/[0.085] bg-[#0F141B] px-3 font-mono text-sm font-black tracking-[0.045em] text-slate-100" : "flex min-h-11 min-w-0 flex-1 items-center break-all rounded-[18px] border border-[#D5E4EF] bg-[#F8FAFC] px-3 font-mono text-sm font-black tracking-[0.045em] text-slate-900"}>
          {isLoading ? accountCopy.apiSetup.whitelistIpLoading : (whitelistIp || accountCopy.apiSetup.whitelistIpUnavailable)}
        </div>
        <button
          aria-label={accountCopy.apiSetup.copyWhitelistIp}
          className={getWhitelistCopyButtonClassName(isDarkTheme)}
          disabled={!hasWhitelistIp}
          title={accountCopy.apiSetup.copyWhitelistIp}
          type="button"
          onClick={onCopy}
        >
          {hasCopiedIp ? <CheckGlyph /> : <CopyGlyph />}
        </button>
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
