import type { ReactNode } from "react";
import { getSegmentButtonClassName } from "./utils";
import type { ThemeClasses } from "./theme";
import type { SegmentTone, TradeDirection } from "./types";

export function Card({ children, icon, theme, title }: { children: ReactNode; icon: ReactNode; theme: ThemeClasses; title: string }) {
  return (
    <section className={theme.card}>
      <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
        <span className="grid h-4 w-4 place-items-center text-[#00d4aa]">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

export function OverviewItem({ label, theme, tone, value }: { label: string; theme: ThemeClasses; tone?: "down" | "up"; value: string }) {
  return (
    <div className={theme.overviewItem}>
      <div className={`mb-0.5 text-lg font-bold ${tone === "up" ? "text-[#00d4aa]" : tone === "down" ? "text-[#ff4757]" : ""}`}>{value}</div>
      <div className={theme.overviewLabel}>{label}</div>
    </div>
  );
}

export function FormRow({ children, label, theme }: { children: ReactNode; label: string; theme: ThemeClasses }) {
  return (
    <label className="flex items-center gap-2">
      <span className={`w-[70px] shrink-0 text-[10px] ${theme.secondaryText}`}>{label}</span>
      <span className="flex min-w-0 flex-1 items-center gap-1">{children}</span>
    </label>
  );
}

export function CalculatedValue({ theme, value }: { theme: ThemeClasses; value: string }) {
  return <div className={theme.calculatedValue}>{value}</div>;
}

export function SegmentedButtons<TValue extends number>({ getLabel, getTone, onChange, options, value }: {
  getLabel: (value: TValue) => string;
  getTone: (value: TValue) => SegmentTone;
  onChange: (value: TValue) => void;
  options: readonly TValue[];
  value: TValue;
}) {
  return (
    <div className="flex flex-1 flex-wrap gap-1">
      {options.map((option) => {
        const isActive = option === value;
        return (
          <button
            key={option}
            className={getSegmentButtonClassName(isActive, getTone(option))}
            type="button"
            onClick={() => onChange(option)}
          >
            {getLabel(option)}
          </button>
        );
      })}
    </div>
  );
}

export function ActionButton({ children, disabled, onClick, tone }: { children: ReactNode; disabled?: boolean; onClick: () => void; tone: TradeDirection }) {
  return (
    <button
      className={`h-9 flex-1 rounded-md text-[13px] font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 ${tone === "long" ? "bg-[#00d4aa] text-[#18181f]" : "bg-[#ff4757] text-white"}`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function ResponsiveTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[360px] border-collapse text-[10px]">{children}</table>
    </div>
  );
}

export function TableHeader({ children, theme }: { children: ReactNode; theme: ThemeClasses }) {
  return <th className={`border-b px-1 py-1.5 text-left font-medium ${theme.borderColor} ${theme.secondaryText}`}>{children}</th>;
}

export function TableCell({ children, className = "", theme }: { children: ReactNode; className?: string; theme: ThemeClasses }) {
  return <td className={`border-b px-1 py-1.5 font-medium ${theme.borderColor} ${className}`}>{children}</td>;
}

export function CountBadge({ children, tone }: { children: ReactNode; tone: TradeDirection }) {
  return <span className={`rounded-lg px-1.5 py-px text-[10px] ${tone === "long" ? "bg-[#00d4aa] text-[#18181f]" : "bg-[#ff4757] text-white"}`}>{children}</span>;
}

export function Modal({ children, onClose, theme, title }: { children: ReactNode; onClose: () => void; theme: ThemeClasses; title: string }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" role="presentation" onMouseDown={onClose}>
      <section
        aria-label={title}
        aria-modal="true"
        className={theme.modal}
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="mb-3 text-base font-semibold">{title}</h2>
        {children}
      </section>
    </div>
  );
}

export function ModalActions({ cancelLabel, confirmLabel, onCancel, onConfirm, theme }: {
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  theme: ThemeClasses;
}) {
  return (
    <div className="mt-4 flex gap-2">
      <button className={theme.modalCancelButton} type="button" onClick={onCancel}>{cancelLabel}</button>
      <button className="h-9 flex-1 rounded-md bg-[#00d4aa] text-xs font-semibold text-[#18181f]" type="button" onClick={onConfirm}>{confirmLabel}</button>
    </div>
  );
}

export function InfoRow({ label, theme, value }: { label: string; theme: ThemeClasses; value: string }) {
  return (
    <div className={`flex justify-between border-b py-1.5 ${theme.borderColor}`}>
      <span className={theme.secondaryText}>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export function IconButton({ children, label, onClick, theme }: { children: ReactNode; label: string; onClick: () => void; theme: ThemeClasses }) {
  return (
    <button aria-label={label} className={theme.iconButton} title={label} type="button" onClick={onClick}>
      {children}
    </button>
  );
}
