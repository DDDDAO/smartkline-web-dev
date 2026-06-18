import { SignalWorkspace } from "@/features/signal-workspace";
import type { SignalWorkspaceProps } from "@/features/signal-workspace";

export function WorkspaceRoutePage({
  initialProductTab = "strategySquare",
}: SignalWorkspaceProps = {}) {
  return <SignalWorkspace initialProductTab={initialProductTab} />;
}
