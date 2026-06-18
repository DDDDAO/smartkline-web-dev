"use client";

import type { SignalWorkspacePrimaryActions } from "./signal-workspace-primary-actions";
import type { SignalWorkspaceSecondaryActions } from "./signal-workspace-secondary-actions";
import type { SignalWorkspaceState } from "./signal-workspace-state";
import {
  useSignalWorkspaceTradingCopyActions,
  type SignalWorkspaceTradingCopyActions,
} from "./signal-workspace-trading-copy-actions";
import {
  useSignalWorkspaceTradingStrategyActions,
  type SignalWorkspaceTradingStrategyActions,
} from "./signal-workspace-trading-strategy-actions";

export function useSignalWorkspaceTradingActionHandlers(
  context: SignalWorkspaceState &
    SignalWorkspacePrimaryActions &
    SignalWorkspaceSecondaryActions,
): SignalWorkspaceTradingActionHandlers {
  const copyActions = useSignalWorkspaceTradingCopyActions(context);
  const strategyActions = useSignalWorkspaceTradingStrategyActions({
    ...context,
    ...copyActions,
  });

  return {
    ...copyActions,
    ...strategyActions,
  };
}

export type SignalWorkspaceTradingActionHandlers =
  SignalWorkspaceTradingCopyActions & SignalWorkspaceTradingStrategyActions;
