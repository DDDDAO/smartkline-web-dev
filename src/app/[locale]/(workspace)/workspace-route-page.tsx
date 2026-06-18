import { SignalWorkspace } from "@/app/_components/signal-workspace";
import type { SignalWorkspaceProps } from "@/app/_components/signal-workspace/signal-workspace-helpers";

export function WorkspaceRoutePage({
  initialProductTab = "strategySquare",
}: SignalWorkspaceProps = {}) {
  return <SignalWorkspace initialProductTab={initialProductTab} />;
}
