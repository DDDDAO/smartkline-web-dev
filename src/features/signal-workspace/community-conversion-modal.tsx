import type { WorkspaceCopy } from "@/i18n/workspace";
import {
  getIconButtonClassName,
  getPrimaryButtonClassName,
} from "./kol-follow-ui";

export function CommunityConversionModal({
  copy,
  isDarkTheme,
  onClose,
  onCommunityOpen,
}: {
  copy: WorkspaceCopy;
  isDarkTheme: boolean;
  onClose: () => void;
  onCommunityOpen: () => void;
}) {
  const modalClassName = isDarkTheme
    ? "w-[min(560px,92vw)] rounded-[28px] border border-white/[0.08] bg-[#181A20] p-6 text-slate-100 shadow-[0_24px_72px_rgba(0,0,0,0.42)]"
    : "w-[min(560px,92vw)] rounded-[28px] border border-[#E8E8EC] bg-white p-6 text-slate-950 shadow-[0_22px_64px_rgba(15,23,42,0.16)]";

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/42 p-4 backdrop-blur-[6px]">
      <div className={modalClassName}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {copy.workspace.communityConversion.title}
            </h2>
          </div>
          <button
            aria-label={copy.common.close}
            className={getIconButtonClassName(isDarkTheme)}
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p
          className={
            isDarkTheme
              ? "mt-4 text-sm leading-6 text-slate-300"
              : "mt-4 text-sm leading-6 text-slate-600"
          }
        >
          {copy.workspace.communityConversion.description}
        </p>
        <div className="mt-3 grid gap-3">
          {copy.workspace.communityConversion.benefits.map((benefit, index) => (
            <div
              key={benefit}
              className={
                isDarkTheme
                  ? "flex items-center gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-4 py-3"
                  : "flex items-center gap-3 rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA] px-4 py-3"
              }
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#EEF2FF] text-base font-bold text-[#6366F1]">
                {index + 1}
              </span>
              <span
                className={
                  isDarkTheme
                    ? "text-base font-semibold text-slate-100"
                    : "text-base font-semibold text-slate-950"
                }
              >
                {benefit}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            className={getPrimaryButtonClassName()}
            type="button"
            onClick={onCommunityOpen}
          >
            {copy.workspace.communityConversion.primaryAction}
          </button>
        </div>
      </div>
    </div>
  );
}
