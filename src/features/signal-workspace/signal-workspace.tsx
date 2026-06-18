"use client";

import { type SignalWorkspaceProps } from './signal-workspace-helpers';
import { useSignalWorkspaceRuntime } from './runtime/signal-workspace-runtime';
import { SignalWorkspaceView } from './shell/signal-workspace-view';

export function SignalWorkspace({
  initialProductTab = "strategySquare",
}: SignalWorkspaceProps = {}) {
  const runtime = useSignalWorkspaceRuntime({ initialProductTab });
  return <SignalWorkspaceView {...runtime} />;
}
