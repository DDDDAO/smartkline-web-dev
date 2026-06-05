import type { KolSignalSourceStatus } from "./types";
import type { StructuredSignal } from "@/app/_types/signal";

export function SourceAvatar({
  isDarkTheme,
  name,
  url,
}: {
  isDarkTheme: boolean;
  name: string;
  url: string | null;
}) {
  const fallbackLabel = name.trim().slice(0, 1).toUpperCase() || "K";
  const className = isDarkTheme
    ? "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-800 bg-cover bg-center text-xs font-semibold text-slate-200"
    : "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 bg-cover bg-center text-xs font-semibold text-slate-600";

  return (
    <span
      aria-hidden="true"
      className={className}
      style={url ? { backgroundImage: `url(${url})` } : undefined}
    >
      {url ? null : fallbackLabel}
    </span>
  );
}

export function TelegramSignalMessage({
  isDarkTheme,
  signal,
}: {
  isDarkTheme: boolean;
  signal: StructuredSignal;
}) {
  const shellClassName = isDarkTheme
    ? "rounded-2xl border border-slate-800 bg-slate-950/92 p-3"
    : "rounded-2xl border border-slate-200 bg-slate-50 p-3";
  const bubbleClassName = isDarkTheme
    ? "relative mt-3 rounded-2xl rounded-tl-md border border-slate-800 bg-slate-900 px-3 py-3 text-slate-200 shadow-sm"
    : "relative mt-3 rounded-2xl rounded-tl-md border border-sky-100 bg-white px-3 py-3 text-slate-800 shadow-sm";
  const metaClassName = isDarkTheme ? "text-[11px] text-slate-500" : "text-[11px] text-slate-400";
  const sourceTypeClassName = isDarkTheme
    ? "rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-300"
    : "rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700";

  return (
    <div className={shellClassName}>
      <div className="flex items-center gap-3">
        <SourceAvatar isDarkTheme={isDarkTheme} name={signal.source_name} url={signal.source_avatar_url} />
        <div className="min-w-0 flex-1">
          <div className={isDarkTheme ? "truncate text-sm font-bold text-slate-50" : "truncate text-sm font-bold text-slate-950"}>
            {signal.source_name}
          </div>
          <div className={metaClassName}>Telegram 群消息 · {signal.created_at.replace("T", " ").slice(0, 16)}</div>
        </div>
        <span className={sourceTypeClassName}>{signal.source_type}</span>
      </div>
      <div className={bubbleClassName}>
        <div className="whitespace-pre-wrap text-xs leading-5">{signal.raw_text}</div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className={metaClassName}>原始信源 · 可追溯</span>
          <span className="text-[11px] font-bold text-sky-500" aria-label="Telegram message delivered">
            ✓✓
          </span>
        </div>
      </div>
    </div>
  );
}

export function KolSignalSourceNotice({
  isDarkTheme,
  signalCount,
  status,
}: {
  isDarkTheme: boolean;
  signalCount: number;
  status: KolSignalSourceStatus;
}) {
  if (status.error) {
    const message = signalCount > 0
      ? "KOL 信源实时连接异常，当前展示最近一次成功加载的数据。"
      : "KOL 信源接口请求失败，当前没有展示备用样例。请检查 API 域名、HTTPS 连接和 CORS 配置。";

    return (
      <div className={isDarkTheme ? "rounded-2xl border border-rose-900/70 bg-rose-950/40 p-3 text-xs leading-5 text-rose-200" : "rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700"}>
        {message}错误：{status.error}
      </div>
    );
  }

  if (status.isLoading) {
    return (
      <div className={isDarkTheme ? "rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400" : "rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500"}>
        正在加载 KOL 信源接口…
      </div>
    );
  }

  if (signalCount === 0) {
    return (
      <div className={isDarkTheme ? "rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400" : "rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500"}>
        当前接口没有返回 KOL 信号。
      </div>
    );
  }

  return null;
}

export function SignalField({ isDarkTheme, label, value }: { isDarkTheme: boolean; label: string; value: string }) {
  return (
    <div className={isDarkTheme ? "rounded-xl bg-slate-900 px-2 py-2" : "rounded-xl bg-slate-50 px-2 py-2"}>
      <div className={isDarkTheme ? "text-slate-500" : "text-slate-400"}>{label}</div>
      <div className={isDarkTheme ? "mt-1 truncate text-slate-200" : "mt-1 truncate text-slate-800"}>{value}</div>
    </div>
  );
}
