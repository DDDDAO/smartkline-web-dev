import { useEffect, useRef, useState } from "react";
import type { PaperPositionRecord } from "@/app/_lib/paper-position";
import type { StructuredSignal } from "@/app/_types/signal";
import type { ChartTheme } from "@/app/_components/kline-chart";
import {
  clampChartPaperPositionOverlayPosition,
  finishChartPaperPositionOverlayDrag,
  moveChartPaperPositionOverlayDrag,
  readStoredChartPaperPositionOverlayPosition,
  startChartPaperPositionOverlayDrag,
  writeStoredChartPaperPositionOverlayPosition,
  type ChartPaperPositionDragSession,
  type ChartPaperPositionOverlayPosition,
} from "./paper-position-overlay-drag";
import {
  createChartPaperPositionFields,
  formatChartPaperPositionStatus,
  getChartDirectionBadgeClass,
  getChartPaperPositionBadgeClass,
  getChartPaperPositionValueClass,
} from "./paper-position-overlay-format";

export function ChartPaperPositionOverlay({
  paperPosition,
  signal,
  theme,
}: {
  paperPosition: PaperPositionRecord | null;
  signal: StructuredSignal | null;
  theme: ChartTheme;
}) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dragSessionRef = useRef<ChartPaperPositionDragSession | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [position, setPosition] = useState<ChartPaperPositionOverlayPosition | null>(() => readStoredChartPaperPositionOverlayPosition());
  const positionRef = useRef<ChartPaperPositionOverlayPosition | null>(position);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    const handleResize = () => {
      const nextPosition = clampChartPaperPositionOverlayPosition(overlayRef.current, positionRef.current);
      if (!nextPosition) {
        return;
      }

      positionRef.current = nextPosition;
      setPosition(nextPosition);
      writeStoredChartPaperPositionOverlayPosition(nextPosition);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!signal) {
    return null;
  }

  const isDarkTheme = theme === "dark";
  const baseContainerClassName = "pointer-events-auto absolute z-30 w-72 max-w-[calc(100%-2rem)] touch-none select-none rounded-lg p-3 ";
  const defaultPositionClassName = position ? "" : "right-4 top-4 lg:right-32";
  const interactionClassName = isDragging
    ? "scale-[1.015] ring-2 ring-slate-400/60"
    : isPressing ? "ring-2 ring-slate-400/35" : "";
  const themeContainerClassName = isDarkTheme
    ? "border border-[#343946] bg-[#0B0E11] text-slate-100"
    : "border border-slate-200 bg-white text-slate-950";
  const containerClassName = `${baseContainerClassName} ${defaultPositionClassName} ${themeContainerClassName} ${interactionClassName}`;
  const containerStyle = position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined;
  const mutedClassName = isDarkTheme ? "text-slate-400" : "text-slate-500";
  const dragHintClassName = isDarkTheme ? "text-[10px] font-medium text-slate-500" : "text-[10px] font-medium text-slate-400";
  const dragClassName = isDragging ? "cursor-grabbing" : "cursor-grab";

  return (
    <div
      ref={overlayRef}
      className={`${containerClassName} ${dragClassName}`}
      style={containerStyle}
      title="长按后拖动位置"
      onPointerCancel={(event) => finishChartPaperPositionOverlayDrag(event.currentTarget, {
        dragSessionRef,
        setIsDragging,
        setIsPressing,
        positionRef,
      })}
      onPointerDown={(event) => startChartPaperPositionOverlayDrag({
        event,
        overlayRef,
        dragSessionRef,
        setIsDragging,
        setIsPressing,
        setPosition,
        positionRef,
      })}
      onPointerMove={(event) => moveChartPaperPositionOverlayDrag({
        event,
        overlayRef,
        dragSessionRef,
        setIsPressing,
        setPosition,
        positionRef,
      })}
      onPointerUp={(event) => finishChartPaperPositionOverlayDrag(event.currentTarget, {
        dragSessionRef,
        setIsDragging,
        setIsPressing,
        positionRef,
      })}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={isDarkTheme ? "text-xs font-semibold text-slate-300" : "text-xs font-semibold text-slate-600"}>模拟仓位</span>
            <span className={dragHintClassName}>{isDragging ? "拖动中" : "长按拖动"}</span>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-bold">{signal.symbol.replace("/USDT:USDT", "")}</span>
            <span className={getChartDirectionBadgeClass(isDarkTheme, signal.direction)}>
              {signal.direction === "long" ? "多" : "空"}
            </span>
          </div>
        </div>
        <span className={getChartPaperPositionBadgeClass(isDarkTheme, paperPosition)}>
          {formatChartPaperPositionStatus(paperPosition)}
        </span>
      </div>

      {paperPosition ? (
        paperPosition.status === "invalid" ? (
          <div className={`${mutedClassName} mt-3 text-xs leading-5`}>
            {paperPosition.dataIssue ?? "模拟仓位数据不完整"}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {createChartPaperPositionFields(paperPosition).map((field) => (
              <div
                key={field.label}
                className={isDarkTheme ? "rounded-lg border border-[#2A2E38] bg-[#181A20] px-2 py-2" : "rounded-lg border border-slate-200 bg-slate-50 px-2 py-2"}
              >
                <div className={isDarkTheme ? "text-[10px] text-slate-500" : "text-[10px] text-slate-400"}>{field.label}</div>
                <div className={getChartPaperPositionValueClass(isDarkTheme, field.tone)}>{field.value}</div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className={`${mutedClassName} mt-3 text-xs leading-5`}>正在计算模拟仓位</div>
      )}
    </div>
  );
}


