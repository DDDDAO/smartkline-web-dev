import type { ChartTheme } from "@/components/charts/kline-chart/types";
import type { KlineTradePointMarker } from "./types";
import { TRADE_POINT_TEXT_MARKER_PADDING_X } from "./constants";

export function resolveTradePointTextMarkerLabel(marker: KlineTradePointMarker): string | null {
  if (marker.avatarUrl) {
    return null;
  }

  const label = marker.actionLabel?.trim().toUpperCase();
  if (label === "BUY" || label === "B") {
    return "B";
  }
  if (label === "SELL" || label === "S") {
    return "S";
  }
  return null;
}

export function measureTradePointTextMarkerWidth(label: string, isActive: boolean): number {
  return label.length * 7 + TRADE_POINT_TEXT_MARKER_PADDING_X * 2 + (isActive ? 4 : 0);
}

export function getMarkerInitials(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "S";
  }

  const characters = Array.from(trimmedValue.replace(/\s+/gu, ""));
  return (characters[0] ?? "S").toUpperCase();
}

export function getAvatarFallbackColors(value: string, theme: ChartTheme): [string, string] {
  const palettes: Array<[string, string]> = theme === "dark"
    ? [
      ["#38bdf8", "#2563eb"],
      ["#22d3ee", "#7c3aed"],
      ["#34d399", "#0ea5e9"],
      ["#fb7185", "#7c3aed"],
      ["#f59e0b", "#ef4444"],
    ]
    : [
      ["#38bdf8", "#818cf8"],
      ["#60a5fa", "#22d3ee"],
      ["#93c5fd", "#a78bfa"],
      ["#67e8f9", "#0ea5e9"],
      ["#7dd3fc", "#c4b5fd"],
    ];

  return palettes[Math.abs(hashString(value)) % palettes.length] ?? palettes[0];
}

function hashString(value: string): number {
  return Array.from(value).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
}

export function getTradePointColors(side: "buy" | "sell", theme: ChartTheme) {
  const isBuy = side === "buy";

  if (theme === "dark") {
    return {
      border: isBuy ? "#22c55e" : "#ef4444",
      glow: isBuy ? "rgba(34, 197, 94, 0.45)" : "rgba(239, 68, 68, 0.45)",
      innerRing: "rgba(255,255,255,0.28)",
      surface: "#181A20",
    };
  }

  return {
    border: isBuy ? "#16a34a" : "#dc2626",
    glow: isBuy ? "rgba(22, 163, 74, 0.32)" : "rgba(220, 38, 38, 0.30)",
    innerRing: "rgba(255,255,255,0.78)",
    surface: "#FFFFFF",
  };
}

export function getTradePointTextMarkerColors(side: "buy" | "sell", theme: ChartTheme) {
  const isBuy = side === "buy";
  const border = isBuy ? "#2FBD85" : "#F6465D";

  return {
    border,
    glow: isBuy
      ? theme === "dark" ? "rgba(47, 189, 133, 0.38)" : "rgba(47, 189, 133, 0.28)"
      : theme === "dark" ? "rgba(246, 70, 93, 0.38)" : "rgba(246, 70, 93, 0.28)",
    innerRing: "rgba(255,255,255,0.82)",
    surface: "#FFFFFF",
  };
}
