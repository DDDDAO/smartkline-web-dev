"use client";

import { useEffect, useState } from "react";
import type { WorkspaceCopy } from "@/i18n/workspace";
import { requestTradingFoxConnectorWhitelistIP } from "./copy-trading-prototype-helpers";

type AccountCenterCopy = WorkspaceCopy["workspace"]["accountCenter"];

type WhitelistIpAssignmentOptions = {
  accountCopy: AccountCenterCopy;
  exchangePlatform: string;
  isLiveExchange: boolean;
};

export type WhitelistIpAssignmentState = {
  hasCopiedIp: boolean;
  hasWhitelistIp: boolean;
  isWhitelistIpLoading: boolean;
  isWhitelistIpOptional: boolean;
  whitelistIp: string;
  whitelistIpError: string;
  copyWhitelistIp: () => void;
  resetCopiedIp: () => void;
};

export function useWhitelistIpAssignment({ accountCopy, exchangePlatform, isLiveExchange }: WhitelistIpAssignmentOptions): WhitelistIpAssignmentState {
  const [hasCopiedIp, setHasCopiedIp] = useState(false);
  const [whitelistIp, setWhitelistIp] = useState("");
  const [whitelistIpError, setWhitelistIpError] = useState("");
  const [isWhitelistIpOptional, setIsWhitelistIpOptional] = useState(false);
  const [isWhitelistIpLoading, setIsWhitelistIpLoading] = useState(false);
  const hasWhitelistIp = whitelistIp.trim().length > 0;

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
        const whitelistAssignment = await requestTradingFoxConnectorWhitelistIP(exchangePlatform);
        if (!isMounted) {
          return;
        }
        const nextWhitelistIp = whitelistAssignment.whitelistIp;
        const isUnassigned = whitelistAssignment.assignmentStatus === "unassigned";
        setWhitelistIp(nextWhitelistIp);
        setIsWhitelistIpOptional(isUnassigned);
        setWhitelistIpError(getWhitelistIpError(nextWhitelistIp, isUnassigned, accountCopy.apiSetup.whitelistIpUnassignedFallback, accountCopy.apiSetup.whitelistIpUnavailable));
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
  }, [accountCopy.apiSetup.whitelistIpUnavailable, accountCopy.apiSetup.whitelistIpUnassignedFallback, exchangePlatform, isLiveExchange]);

  function copyWhitelistIp(): void {
    setHasCopiedIp(true);
    void navigator.clipboard?.writeText(whitelistIp);
  }

  function resetCopiedIp(): void {
    setHasCopiedIp(false);
  }

  return {
    hasCopiedIp,
    hasWhitelistIp,
    isWhitelistIpLoading,
    isWhitelistIpOptional,
    whitelistIp,
    whitelistIpError,
    copyWhitelistIp,
    resetCopiedIp,
  };
}

function getWhitelistIpError(whitelistIp: string, isUnassigned: boolean, unassignedFallback: string, unavailableFallback: string): string {
  if (whitelistIp) {
    return "";
  }

  return isUnassigned ? unassignedFallback : unavailableFallback;
}
