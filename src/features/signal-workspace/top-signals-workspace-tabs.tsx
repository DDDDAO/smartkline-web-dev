import { Button } from "@/components/ui/button";
import type { WorkspaceCopy } from "@/i18n/workspace";

export type TopSignalsWorkspacePanel = "lead" | "kol";

export const DEFAULT_TOP_SIGNALS_WORKSPACE_PANEL: TopSignalsWorkspacePanel =
  "lead";

export const TOP_SIGNALS_WORKSPACE_PANELS: readonly TopSignalsWorkspacePanel[] = [
  "lead",
  "kol",
];

export function isTopSignalsWorkspacePanel(
  value: string | null | undefined,
): value is TopSignalsWorkspacePanel {
  return TOP_SIGNALS_WORKSPACE_PANELS.includes(
    value as TopSignalsWorkspacePanel,
  );
}

export function normalizeTopSignalsWorkspacePanel(
  value: string | null | undefined,
): TopSignalsWorkspacePanel {
  return isTopSignalsWorkspacePanel(value)
    ? value
    : DEFAULT_TOP_SIGNALS_WORKSPACE_PANEL;
}

export function TopSignalsWorkspaceTabs({
  activePanel,
  copy,
  isDarkTheme,
  onPanelChange,
}: {
  activePanel: TopSignalsWorkspacePanel;
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onPanelChange: (panel: TopSignalsWorkspacePanel) => void;
}) {
  const shellClassName = isDarkTheme
    ? "grid grid-cols-2 gap-1 rounded-[18px] border border-white/[0.075] bg-white/[0.035] p-1"
    : "grid grid-cols-2 gap-1 rounded-[18px] border border-[#E8E8EC] bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.035)]";

  return (
    <nav aria-label={copy.workspace.topSignals.panelTabsAria} className={shellClassName}>
      {TOP_SIGNALS_WORKSPACE_PANELS.map((panel) => {
        const isActive = panel === activePanel;
        const buttonClassName = isActive
          ? "motion-fx-1-nav-button flex h-9 items-center justify-center rounded-[14px] bg-[#6366F1] px-3 text-xs font-black text-white transition sm:text-sm"
          : isDarkTheme
            ? "motion-fx-1-nav-button flex h-9 items-center justify-center rounded-[14px] px-3 text-xs font-bold text-slate-400 transition hover:bg-white/[0.08] hover:text-indigo-200 sm:text-sm"
            : "motion-fx-1-nav-button flex h-9 items-center justify-center rounded-[14px] px-3 text-xs font-bold text-slate-500 transition hover:bg-[#EEF2FF] hover:text-[#4F46E5] sm:text-sm";

        return (
          <Button
            key={panel}
            aria-pressed={isActive}
            className={buttonClassName}
            type="button"
            variant="ghost"
            onClick={() => onPanelChange(panel)}
          >
            {copy.workspace.topSignals.panelTabs[panel]}
          </Button>
        );
      })}
    </nav>
  );
}
