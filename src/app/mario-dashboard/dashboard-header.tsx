import type { Countdown } from "./types";
import { ClockIcon, MoonIcon, SunIcon } from "./icons";
import type { ThemeClasses } from "./theme";
import { IconButton } from "./ui";
import { formatCountdown, getHeaderTimerClassName } from "./utils";

type ApiKeyStatus = {
  label: string;
  title: string;
  tone: string;
};

type DashboardHeaderProps = {
  activeCountdowns: Countdown[];
  apiKeyStatus: ApiKeyStatus;
  currentNow: number;
  isDarkMode: boolean;
  quote: string;
  theme: ThemeClasses;
  onOpenCountdownModal: () => void;
  onSwitchApiKey: () => void;
  onToggleTheme: () => void;
};

export function DashboardHeader({
  activeCountdowns,
  apiKeyStatus,
  currentNow,
  isDarkMode,
  onOpenCountdownModal,
  onSwitchApiKey,
  onToggleTheme,
  quote,
  theme,
}: DashboardHeaderProps) {
  const headerCountdownText = activeCountdowns
    .map((countdown) => formatCountdown(countdown.targetTime - currentNow))
    .join(" | ");
  const firstCountdownRemaining = activeCountdowns[0] ? activeCountdowns[0].targetTime - currentNow : null;

  return (
    <header className="header">
      <h1>
        马里奥的狙击台
        {activeCountdowns.length > 0 ? <span className={getHeaderTimerClassName(firstCountdownRemaining)}>{headerCountdownText}</span> : null}
        <span className="header-subtitle">{quote}</span>
      </h1>
      <div className="header-actions">
        <IconButton label="倒计时" theme={theme} onClick={onOpenCountdownModal}>
          <ClockIcon />
        </IconButton>
        <IconButton label="切换主题" theme={theme} onClick={onToggleTheme}>
          {isDarkMode ? <MoonIcon /> : <SunIcon />}
        </IconButton>
        <button className="api-switch-btn" title={apiKeyStatus.title} type="button" onClick={onSwitchApiKey}>
          <span>切换 API Key</span>
          <span className={`api-switch-status ${apiKeyStatus.tone}`}>{apiKeyStatus.label}</span>
        </button>
      </div>
    </header>
  );
}
