"use client";

import type { SignalWorkspaceState } from "./signal-workspace-state";
import type { SignalWorkspacePrimaryActions } from "./signal-workspace-primary-actions";
import {
  useSignalWorkspaceSecondaryActionHandlers,
  type SignalWorkspaceSecondaryActionHandlers,
} from "./signal-workspace-secondary-action-handlers";
import { useSignalWorkspaceSecondaryActionLoaders } from "./signal-workspace-secondary-action-loaders";

export function useSignalWorkspaceSecondaryActions(
  context: SignalWorkspaceState & SignalWorkspacePrimaryActions,
): SignalWorkspaceSecondaryActions {
  useSignalWorkspaceSecondaryActionLoaders(context);
  return useSignalWorkspaceSecondaryActionHandlers(context);
}

export type SignalWorkspaceSecondaryActions =
  SignalWorkspaceSecondaryActionHandlers;
