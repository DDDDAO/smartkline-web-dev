import type { ReactNode } from "react";

export function MarioSectionCard({ children, description, icon, isDarkTheme, title }: {
  children: ReactNode;
  description?: string;
  icon: ReactNode;
  isDarkTheme: boolean;
  title: string;
}) {
  return (
    <section className={getMarioCardClassName(isDarkTheme)}>
      <div className="flex items-start gap-3">
        <div className={isDarkTheme ? "mt-0.5 text-amber-300" : "mt-0.5 text-amber-600"}>{icon}</div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black">{title}</h3>
          {description ? <p className={isDarkTheme ? "mt-1 text-xs leading-5 text-slate-400" : "mt-1 text-xs leading-5 text-slate-600"}>{description}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function LayersIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

export function DocumentIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8" />
    </svg>
  );
}

export function getMarioCardClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-[24px] border border-white/[0.075] bg-white/[0.035] p-4 text-slate-100 shadow-none"
    : "rounded-[24px] border border-[#E8E8EC] bg-white p-4 text-slate-950 shadow-sm";
}

export function getMarioSoftPanelClassName(isDarkTheme: boolean): string {
  return isDarkTheme
    ? "rounded-2xl border border-white/[0.075] bg-[#0F131A]/70"
    : "rounded-2xl border border-[#E8E8EC] bg-[#FAFAFA]";
}
