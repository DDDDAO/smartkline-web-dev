"use client";

import { type SignalWorkspaceProps } from './signal-workspace/signal-workspace-helpers';
import { useSignalWorkspaceRuntime } from './signal-workspace-runtime';
import { SignalWorkspaceView } from './signal-workspace-view';

export function SignalWorkspace({
  initialProductTab = "strategySquare",
}: SignalWorkspaceProps = {}) {
  const runtime = useSignalWorkspaceRuntime({ initialProductTab });
  return <SignalWorkspaceView {...runtime} />;
}
