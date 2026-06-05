import type { StructuredSignal } from "@/app/_types/signal";
import { TelegramSignalMessage } from "./card-ui";

export function RawSignalDialog({
  isDarkTheme,
  signal,
  onClose,
}: {
  isDarkTheme: boolean;
  signal: StructuredSignal;
  onClose: () => void;
}) {
  const dialogClassName = isDarkTheme
    ? "relative max-h-[72vh] w-[min(92vw,560px)] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"
    : "relative max-h-[72vh] w-[min(92vw,560px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl";
  const closeButtonClassName = isDarkTheme
    ? "rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-500 hover:text-cyan-300"
    : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-cyan-300 hover:text-cyan-700";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        aria-labelledby="raw-signal-dialog-title"
        aria-modal="true"
        className={dialogClassName}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={isDarkTheme ? "flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4" : "flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4"}>
          <div className="min-w-0">
            <h3 id="raw-signal-dialog-title" className={isDarkTheme ? "truncate text-base font-semibold text-slate-50" : "truncate text-base font-semibold text-slate-950"}>
              情报源
            </h3>
            <p className={isDarkTheme ? "mt-1 text-xs text-slate-400" : "mt-1 text-xs text-slate-500"}>
              {signal.source_name} · {signal.created_at.replace("T", " ").slice(0, 16)}
            </p>
          </div>
          <button className={closeButtonClassName} type="button" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="max-h-[calc(72vh-82px)] overflow-y-auto px-5 py-4">
          <TelegramSignalMessage isDarkTheme={isDarkTheme} signal={signal} />
        </div>
      </div>
    </div>
  );
}
