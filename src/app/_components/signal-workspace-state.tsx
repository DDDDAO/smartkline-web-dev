"use client";

import type { SignalWorkspaceProps } from "./signal-workspace/signal-workspace-helpers";
import {
  useSignalWorkspaceStateBase,
  type SignalWorkspaceStateBase,
} from "./signal-workspace-state-base";
import {
  useSignalWorkspaceStateDerived,
  type SignalWorkspaceStateDerived,
} from "./signal-workspace-state-derived";

export function useSignalWorkspaceState({
  initialProductTab = "strategySquare",
}: SignalWorkspaceProps = {}): SignalWorkspaceState {
  const base = useSignalWorkspaceStateBase({ initialProductTab });
  const derived = useSignalWorkspaceStateDerived(base);

  return {
    ...base,
    ...derived,
  };
}

export type SignalWorkspaceState = SignalWorkspaceStateBase &
  SignalWorkspaceStateDerived;
