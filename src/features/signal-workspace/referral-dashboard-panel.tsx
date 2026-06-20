"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { WorkspaceCopy, WorkspaceLanguage } from "@/i18n/workspace";
import type { TelegramSessionUser } from "@/lib/auth/telegram-auth";
import type {
  ReferralCommissionsResponse,
  ReferralDashboardResponse,
  ReferralInviteesResponse,
  ReferralUserSnapshot,
} from "@/lib/referral";
import {
  TelegramUserAvatar,
  getTelegramUserDisplayName,
} from "./copy-trading-prototype/telegram-user-avatar";
import {
  createWebInviteUrl,
  formatDate,
  formatMoney,
  formatRate,
  getCardClassName,
  getCopyRowClassName,
  getEyebrowClassName,
  getInlineMetricClassName,
  getListRowClassName,
  getMutedTextClassName,
  getPillClassName,
  getPrimaryButtonClassName,
  getSoftButtonClassName,
  getUserBadgeClassName,
} from "./referral-dashboard-panel-utils";

const RECENT_LIST_LIMIT = 8;

type ReferralDashboardPanelProps = {
  copy: WorkspaceCopy;
  isAuthLoading: boolean;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  telegramUser: TelegramSessionUser | null;
  onLogin: () => void;
};

export function ReferralDashboardPanel({
  copy,
  isAuthLoading,
  isDarkTheme,
  language,
  telegramUser,
  onLogin,
}: ReferralDashboardPanelProps) {
  const referralCopy = copy.workspace.referrals;
  const [dashboard, setDashboard] = useState<ReferralDashboardResponse | null>(null);
  const [invitees, setInvitees] = useState<ReferralInviteesResponse | null>(null);
  const [commissions, setCommissions] = useState<ReferralCommissionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(telegramUser));
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadReferralDashboard = useCallback(async (signal?: AbortSignal) => {
    if (!telegramUser) {
      setDashboard(null);
      setInvitees(null);
      setCommissions(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [dashboardPayload, inviteesPayload, commissionsPayload] = await Promise.all([
        requestJson<ReferralDashboardResponse>("/api/referral/me", signal),
        requestJson<ReferralInviteesResponse>(`/api/referral/invitees?limit=${RECENT_LIST_LIMIT}`, signal),
        requestJson<ReferralCommissionsResponse>(`/api/referral/commissions?limit=${RECENT_LIST_LIMIT}`, signal),
      ]);

      setDashboard(dashboardPayload);
      setInvitees(inviteesPayload);
      setCommissions(commissionsPayload);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") {
        return;
      }

      setError(referralCopy.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [referralCopy.loadError, telegramUser]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void loadReferralDashboard(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadReferralDashboard]);

  const webInviteUrl = dashboard?.invite.personalCode && typeof window !== "undefined"
    ? createWebInviteUrl(dashboard.invite.personalCode, language)
    : "";

  const handleCopy = useCallback(async (key: string, value: string) => {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((currentKey) => currentKey === key ? null : currentKey), 1600);
  }, []);

  if (!telegramUser) {
    return (
      <section className="min-h-0 flex-1 px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4 lg:px-6 lg:py-5">
        <div className="mx-auto grid w-full max-w-4xl gap-4">
          <Card className={getCardClassName(isDarkTheme, "p-6") }>
            <div className="max-w-2xl">
              <p className={getEyebrowClassName(isDarkTheme)}>{referralCopy.title}</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight">{referralCopy.loginTitle}</h1>
              <p className={getMutedTextClassName(isDarkTheme, "mt-3 text-sm leading-6")}>{referralCopy.loginDescription}</p>
              <Button className={getPrimaryButtonClassName(isDarkTheme, "mt-5")} disabled={isAuthLoading} type="button" onClick={onLogin}>
                {isAuthLoading ? referralCopy.loading : referralCopy.loginAction}
              </Button>
            </div>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4 lg:px-6 lg:py-5">
      <div className="mx-auto grid w-full max-w-6xl gap-4 sm:gap-5">
        <Card className={getCardClassName(isDarkTheme, "p-5") }>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className={getEyebrowClassName(isDarkTheme)}>{referralCopy.title}</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight">{referralCopy.title}</h1>
              <p className={getMutedTextClassName(isDarkTheme, "mt-2 max-w-3xl text-sm leading-6")}>{referralCopy.subtitle}</p>
            </div>
            <div className={getUserBadgeClassName(isDarkTheme)}>
              <TelegramUserAvatar isDarkTheme={isDarkTheme} size="large" user={telegramUser} />
              <div className="min-w-0">
                <div className="truncate text-sm font-black">{getTelegramUserDisplayName(telegramUser, copy.workspace.accountCenter.user.demoName)}</div>
                <div className="truncate text-xs text-slate-500">{telegramUser.username ? `@${telegramUser.username}` : telegramUser.id}</div>
              </div>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <Card className={getCardClassName(isDarkTheme, "p-5 text-sm")}>{referralCopy.loading}</Card>
        ) : error ? (
          <Card className={getCardClassName(isDarkTheme, "p-5") }>
            <p className={getMutedTextClassName(isDarkTheme, "text-sm")}>{error}</p>
            <Button className={getPrimaryButtonClassName(isDarkTheme, "mt-4")} type="button" onClick={() => void loadReferralDashboard()}>
              {referralCopy.retry}
            </Button>
          </Card>
        ) : dashboard ? (
          <>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <InviteCard
                copiedKey={copiedKey}
                dashboard={dashboard}
                isDarkTheme={isDarkTheme}
                referralCopy={referralCopy}
                webInviteUrl={webInviteUrl}
                onCopy={handleCopy}
              />
              <PlanCard dashboard={dashboard} isDarkTheme={isDarkTheme} referralCopy={referralCopy} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {dashboard.networkCounts.map((item) => (
                <Card key={item.depth} className={getCardClassName(isDarkTheme, "p-4") }>
                  <p className={getMutedTextClassName(isDarkTheme, "text-xs font-bold uppercase tracking-[0.2em]")}>{referralCopy.stats.depthLabel(item.depth)}</p>
                  <div className="mt-3 text-3xl font-black">{referralCopy.stats.inviteeCount(item.count)}</div>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <InviteesCard invitees={invitees} isDarkTheme={isDarkTheme} language={language} referralCopy={referralCopy} />
              <CommissionsCard commissions={commissions} dashboard={dashboard} isDarkTheme={isDarkTheme} language={language} referralCopy={referralCopy} />
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function InviteCard({
  copiedKey,
  dashboard,
  isDarkTheme,
  referralCopy,
  webInviteUrl,
  onCopy,
}: {
  copiedKey: string | null;
  dashboard: ReferralDashboardResponse;
  isDarkTheme: boolean;
  referralCopy: WorkspaceCopy["workspace"]["referrals"];
  webInviteUrl: string;
  onCopy: (key: string, value: string) => Promise<void>;
}) {
  const telegramUrl = dashboard.invite.telegramBotStartUrl ?? "";

  return (
    <Card className={getCardClassName(isDarkTheme, "p-5") }>
      <div>
        <h2 className="text-lg font-black">{referralCopy.invite.title}</h2>
        <p className={getMutedTextClassName(isDarkTheme, "mt-2 text-sm leading-6")}>{referralCopy.invite.description}</p>
      </div>
      <div className="mt-5 grid gap-3">
        <CopyRow
          copied={copiedKey === "code"}
          isDarkTheme={isDarkTheme}
          label={referralCopy.invite.codeLabel}
          value={dashboard.invite.personalCode}
          onCopy={() => onCopy("code", dashboard.invite.personalCode)}
          copy={referralCopy.invite.copy}
          copiedLabel={referralCopy.invite.copied}
        />
        <CopyRow
          copied={copiedKey === "web"}
          isDarkTheme={isDarkTheme}
          label={referralCopy.invite.webLinkLabel}
          value={webInviteUrl}
          onCopy={() => onCopy("web", webInviteUrl)}
          copy={referralCopy.invite.copy}
          copiedLabel={referralCopy.invite.copied}
        />
        <CopyRow
          copied={copiedKey === "telegram"}
          isDarkTheme={isDarkTheme}
          label={telegramUrl ? referralCopy.invite.telegramLinkLabel : referralCopy.invite.telegramPayloadLabel}
          value={telegramUrl || dashboard.invite.telegramStartPayload}
          onCopy={() => onCopy("telegram", telegramUrl || dashboard.invite.telegramStartPayload)}
          copy={referralCopy.invite.copy}
          copiedLabel={referralCopy.invite.copied}
        />
        {!telegramUrl ? (
          <p className={getMutedTextClassName(isDarkTheme, "text-xs leading-5")}>{referralCopy.invite.unavailableBot}</p>
        ) : null}
      </div>
    </Card>
  );
}

function PlanCard({
  dashboard,
  isDarkTheme,
  referralCopy,
}: {
  dashboard: ReferralDashboardResponse;
  isDarkTheme: boolean;
  referralCopy: WorkspaceCopy["workspace"]["referrals"];
}) {
  const badge = dashboard.profile.dashboardAccess
    ? referralCopy.plan.dashboardEnabled
    : referralCopy.plan.dashboardDisabled;
  const hint = dashboard.profile.dashboardAccess
    ? referralCopy.plan.distributorHint
    : referralCopy.plan.communityHint;

  return (
    <Card className={getCardClassName(isDarkTheme, "p-5") }>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">{referralCopy.plan.title}</h2>
          <p className={getMutedTextClassName(isDarkTheme, "mt-1 text-xs leading-5")}>{dashboard.profile.currentPlan.name}</p>
        </div>
        <span className={getPillClassName(isDarkTheme)}>{badge}</span>
      </div>
      <p className={getMutedTextClassName(isDarkTheme, "mt-4 text-sm leading-6")}>{hint}</p>
      <div className="mt-4 grid gap-2">
        {dashboard.profile.currentPlan.rates.map((rate) => (
          <div key={`${rate.eventType}-${rate.depth}`} className={getInlineMetricClassName(isDarkTheme)}>
            <span>{referralCopy.plan.rateLabel(rate.depth)}</span>
            <strong>{formatRate(rate.rateBps)}</strong>
          </div>
        ))}
      </div>
    </Card>
  );
}

function InviteesCard({
  invitees,
  isDarkTheme,
  language,
  referralCopy,
}: {
  invitees: ReferralInviteesResponse | null;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  referralCopy: WorkspaceCopy["workspace"]["referrals"];
}) {
  const items = invitees?.items ?? [];

  return (
    <Card className={getCardClassName(isDarkTheme, "p-5") }>
      <h2 className="text-lg font-black">{referralCopy.invitees.title}</h2>
      <div className="mt-4 grid gap-3">
        {items.length > 0 ? items.map((item) => (
          <div key={`${item.user.id}-${item.depth}`} className={getListRowClassName(isDarkTheme)}>
            <UserSummary user={item.user} />
            <div className="text-right text-xs">
              <div className="font-bold">{referralCopy.stats.depthLabel(item.depth)}</div>
              <div className="mt-1 text-slate-500">{formatDate(item.createdAt, language)}</div>
            </div>
          </div>
        )) : (
          <p className={getMutedTextClassName(isDarkTheme, "text-sm leading-6")}>{referralCopy.invitees.empty}</p>
        )}
      </div>
    </Card>
  );
}

function CommissionsCard({
  commissions,
  dashboard,
  isDarkTheme,
  language,
  referralCopy,
}: {
  commissions: ReferralCommissionsResponse | null;
  dashboard: ReferralDashboardResponse;
  isDarkTheme: boolean;
  language: WorkspaceLanguage;
  referralCopy: WorkspaceCopy["workspace"]["referrals"];
}) {
  const items = commissions?.items ?? dashboard.recentCommissions;

  return (
    <Card className={getCardClassName(isDarkTheme, "p-5") }>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-black">{referralCopy.commissions.title}</h2>
          <p className={getMutedTextClassName(isDarkTheme, "mt-1 text-xs leading-5")}>{referralCopy.commissions.totalsTitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {dashboard.commissionTotals.map((total) => (
            <span key={`${total.currency}-${total.status}`} className={getPillClassName(isDarkTheme)}>
              {referralCopy.commissions.status[total.status]} · {formatMoney(total.amount, total.currency)}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        {items.length > 0 ? items.map((item) => (
          <div key={item.id} className={getListRowClassName(isDarkTheme)}>
            <UserSummary user={item.referredUser} />
            <div className="text-right text-xs">
              <div className="font-black">{formatMoney(item.commissionAmount, item.currency)}</div>
              <div className="mt-1 text-slate-500">{referralCopy.commissions.status[item.status]} · {formatDate(item.createdAt, language)}</div>
            </div>
          </div>
        )) : (
          <p className={getMutedTextClassName(isDarkTheme, "text-sm leading-6")}>{referralCopy.commissions.empty}</p>
        )}
      </div>
    </Card>
  );
}

function CopyRow({
  copied,
  copiedLabel,
  copy,
  isDarkTheme,
  label,
  value,
  onCopy,
}: {
  copied: boolean;
  copiedLabel: string;
  copy: string;
  isDarkTheme: boolean;
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className={getCopyRowClassName(isDarkTheme)}>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-slate-500">{label}</div>
        <div className="mt-1 truncate font-mono text-sm font-black">{value || "--"}</div>
      </div>
      <Button className={getSoftButtonClassName(isDarkTheme)} disabled={!value} type="button" variant="outline" onClick={onCopy}>
        {copied ? copiedLabel : copy}
      </Button>
    </div>
  );
}

function UserSummary({ user }: { user: ReferralUserSnapshot }) {
  const name = user.telegram?.name || user.telegram?.username || user.id.slice(0, 8);

  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-black">{name}</div>
      <div className="mt-1 truncate text-xs text-slate-500">{user.telegram?.username ? `@${user.telegram.username}` : user.customerTier}</div>
    </div>
  );
}

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Referral request failed with status ${response.status}.`);
  }

  return await response.json() as T;
}
