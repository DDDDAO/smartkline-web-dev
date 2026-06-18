import type { ReactNode } from "react";
import { getSegmentButtonClassName } from "./utils";
import type { ThemeClasses } from "./theme";
import type { SegmentTone, TradeDirection } from "./types";

export function Card({ children, icon, title }: { children: ReactNode; icon: ReactNode; theme: ThemeClasses; title: string }) {
  return (
    <div className="card">
      <div className="card-title">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

export function OverviewItem({ label, tone, value }: { label: string; theme: ThemeClasses; tone?: "down" | "up"; value: string }) {
  return (
    <div className="overview-item">
      <div className={`overview-value ${tone ?? ""}`}>{value}</div>
      <div className="overview-label">{label}</div>
    </div>
  );
}

export function FormRow({ children, label }: { children: ReactNode; label: string; theme: ThemeClasses }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function CalculatedValue({ value }: { theme: ThemeClasses; value: string }) {
  return <div className="calculated-value">{value}</div>;
}

export function SegmentedButtons<TValue extends number>({ getLabel, getTone, onChange, options, value }: {
  getLabel: (value: TValue) => string;
  getTone: (value: TValue) => SegmentTone;
  onChange: (value: TValue) => void;
  options: readonly TValue[];
  value: TValue;
}) {
  return (
    <div className="radio-group">
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
      className={`action-btn ${tone}`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function ResponsiveTable({ children, variant = "order" }: { children: ReactNode; variant?: "history" | "order" }) {
  return <table className={variant === "history" ? "history-table" : "order-table"}>{children}</table>;
}

export function TableHeader({ children }: { children: ReactNode; theme: ThemeClasses }) {
  return <th>{children}</th>;
}

export function TableCell({ children, className = "" }: { children: ReactNode; className?: string; theme: ThemeClasses }) {
  return <td className={className}>{children}</td>;
}

export function CountBadge({ children, tone }: { children: ReactNode; tone: TradeDirection }) {
  return <span className={`count ${tone === "short" ? "short" : ""}`}>{children}</span>;
}

export function Modal({ children, onClose, title }: { children: ReactNode; onClose: () => void; theme: ThemeClasses; title: string }) {
  return (
    <div className="modal-overlay active" role="presentation" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({ cancelLabel, confirmLabel, onCancel, onConfirm }: {
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  theme: ThemeClasses;
}) {
  return (
    <div className="modal-actions">
      <button className="modal-cancel" type="button" onClick={onCancel}>{cancelLabel}</button>
      <button className="modal-confirm" type="button" onClick={onConfirm}>{confirmLabel}</button>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; theme: ThemeClasses; value: string }) {
  return (
    <div className="modal-info-row">
      <span className="modal-info-label">{label}</span>
      <span className="modal-info-value">{value}</span>
    </div>
  );
}

export function IconButton({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void; theme: ThemeClasses }) {
  return (
    <button aria-label={label} className="icon-btn" title={label} type="button" onClick={onClick}>
      {children}
    </button>
  );
}
