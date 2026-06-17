"use client";

import type { WorkspaceCopy } from "@/app/_lib/i18n";
import { NOTIFICATION_CHANNELS } from "./constants";
import { getLabelClassName, getNotificationIconClassName, getNotificationUnavailableBadgeClassName, getPrimaryButtonClassName } from "./styles";

export function NotificationSettingsPlaceholder({
  copy,
  isDarkTheme,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
}) {
  const accountCopy = copy.workspace.accountCenter;
  const notificationCopy = accountCopy.notifications;

  return (
    <section className={isDarkTheme ? "rounded-[28px] border border-white/[0.075] bg-white/[0.035] p-4" : "rounded-[28px] border border-[#E5EAF0] bg-white p-4 shadow-sm"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black">{notificationCopy.title}</h2>
          <p className={isDarkTheme ? "mt-1 max-w-3xl text-xs leading-5 text-slate-400" : "mt-1 max-w-3xl text-xs leading-5 text-slate-600"}>
            {notificationCopy.description}
          </p>
        </div>
        <span className={getNotificationUnavailableBadgeClassName(isDarkTheme)}>
          {notificationCopy.unavailable}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {NOTIFICATION_CHANNELS.map((channel) => (
          <NotificationChannelCard
            key={channel.key}
            channel={channel}
            copy={copy}
            isDarkTheme={isDarkTheme}
          />
        ))}
      </div>
    </section>
  );
}

export function NotificationChannelCard({
  channel,
  copy,
  isDarkTheme,
}: {
  channel: typeof NOTIFICATION_CHANNELS[number];
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
}) {
  const notificationCopy = copy.workspace.accountCenter.notifications;
  const channelCopy = notificationCopy.channels[channel.key];
  const cardClassName = isDarkTheme
    ? "overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#111820]"
    : "overflow-hidden rounded-[24px] border border-[#E5EAF0] bg-white shadow-sm";
  const mutedPanelClassName = isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3"
    : "rounded-2xl border border-[#E5EAF0] bg-[#FAFBFD] p-3";
  const inputClassName = isDarkTheme
    ? "mt-2 h-11 w-full cursor-not-allowed rounded-xl border border-white/[0.075] bg-white/[0.025] px-3 text-sm font-semibold text-slate-500 outline-none placeholder:text-slate-700"
    : "mt-2 h-11 w-full cursor-not-allowed rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 text-sm font-semibold text-slate-500 outline-none placeholder:text-slate-400";

  return (
    <article className={cardClassName}>
      <div className={isDarkTheme ? "border-b border-white/[0.075] p-4" : "border-b border-[#EEF2F6] p-4"}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={getNotificationIconClassName(isDarkTheme)} aria-hidden="true">
              {channel.icon}
            </span>
            <div className="min-w-0">
              <h3 className={isDarkTheme ? "truncate text-sm font-black text-slate-100" : "truncate text-sm font-black text-slate-950"}>
                {channelCopy.title}
              </h3>
              <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-500" : "mt-1 text-xs leading-5 text-slate-600"}>
                {channelCopy.description}
              </p>
            </div>
          </div>
          <span className={getNotificationUnavailableBadgeClassName(isDarkTheme)}>
            {notificationCopy.unavailable}
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4">
        <div className={mutedPanelClassName}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className={isDarkTheme ? "text-sm font-black text-slate-200" : "text-sm font-black text-slate-800"}>
                {notificationCopy.enableChannel}
              </div>
              <div className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-500" : "mt-1 text-xs leading-5 text-slate-500"}>
                {notificationCopy.enableDescription}
              </div>
            </div>
            <button
              aria-label={notificationCopy.enableChannel}
              className={isDarkTheme ? "relative h-6 w-11 cursor-not-allowed rounded-full bg-white/[0.06] opacity-60" : "relative h-6 w-11 cursor-not-allowed rounded-full bg-slate-200 opacity-70"}
              disabled
              type="button"
            >
              <span className={isDarkTheme ? "absolute left-1 top-1 h-4 w-4 rounded-full bg-slate-600" : "absolute left-1 top-1 h-4 w-4 rounded-full bg-white"} />
            </button>
          </div>
        </div>

        <label className="block">
          <span className={getLabelClassName(isDarkTheme)}>{notificationCopy.displayName}</span>
          <input
            className={inputClassName}
            disabled
            readOnly
            value={channelCopy.defaultName}
          />
        </label>

        {channel.requiresWebhookUrl ? (
          <label className="block">
            <span className={getLabelClassName(isDarkTheme)}>{notificationCopy.webhookUrl}</span>
            <input
              className={inputClassName}
              disabled
              placeholder={notificationCopy.webhookPlaceholder}
              readOnly
              value=""
            />
            <div className={isDarkTheme ? "mt-2 text-xs font-bold text-amber-300" : "mt-2 text-xs font-bold text-amber-600"}>
              {notificationCopy.unavailableHint}
            </div>
          </label>
        ) : (
          <div className={mutedPanelClassName}>
            <div className={isDarkTheme ? "text-xs leading-5 text-slate-400" : "text-xs leading-5 text-slate-600"}>
              {notificationCopy.telegramHint}
            </div>
          </div>
        )}
      </div>

      <div className={isDarkTheme ? "flex items-center justify-between gap-3 border-t border-white/[0.075] px-4 py-3" : "flex items-center justify-between gap-3 border-t border-[#EEF2F6] px-4 py-3"}>
        <span className={isDarkTheme ? "text-xs text-slate-500" : "text-xs text-slate-500"}>
          {notificationCopy.placeholderStatus}
        </span>
        <button className={getPrimaryButtonClassName(isDarkTheme)} disabled type="button">
          {notificationCopy.save}
        </button>
      </div>
    </article>
  );
}
