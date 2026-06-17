"use client";

import { type SignalWorkspaceState } from "./signal-workspace-state";
import {
  useSignalWorkspacePrimaryActionHandlers,
  type SignalWorkspacePrimaryActionHandlers,
} from "./signal-workspace-primary-action-handlers";
import {
  useSignalWorkspacePrimaryActionLifecycle,
  type SignalWorkspacePrimaryActionLifecycle,
} from "./signal-workspace-primary-action-lifecycle";

export function useSignalWorkspacePrimaryActions(context: SignalWorkspaceState): SignalWorkspacePrimaryActions {
  const handlers = useSignalWorkspacePrimaryActionHandlers(context);
  useSignalWorkspacePrimaryActionLifecycle({
    ...context,
    ...handlers,
  });

  return {
    ...handlers,
  };
}

export type SignalWorkspacePrimaryActions = SignalWorkspacePrimaryActionHandlers & SignalWorkspacePrimaryActionLifecycle;
