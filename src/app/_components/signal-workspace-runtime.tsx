"use client";

import { SignalWorkspaceProps } from './signal-workspace/signal-workspace-helpers';

import { useSignalWorkspaceState } from './signal-workspace-state';
import { useSignalWorkspacePrimaryActions, type SignalWorkspacePrimaryActions } from './signal-workspace-primary-actions';
import { useSignalWorkspaceSecondaryActions, type SignalWorkspaceSecondaryActions } from './signal-workspace-secondary-actions';
import { useSignalWorkspaceTradingActions, type SignalWorkspaceTradingActions } from './signal-workspace-trading-actions';

export type SignalWorkspaceRuntime = ReturnType<typeof useSignalWorkspaceState> & SignalWorkspacePrimaryActions & SignalWorkspaceSecondaryActions & SignalWorkspaceTradingActions;

export function useSignalWorkspaceRuntime({
  initialProductTab = 'strategySquare',
}: SignalWorkspaceProps = {}) {
  const state = useSignalWorkspaceState({ initialProductTab });
  const primary = useSignalWorkspacePrimaryActions(state);
  const secondary = useSignalWorkspaceSecondaryActions({
    ...state,
    ...primary,
  });
  const trading = useSignalWorkspaceTradingActions({
    ...state,
    ...primary,
    ...secondary,
  });

  return {
    ...state,
    ...primary,
    ...secondary,
    ...trading,
  };
}
