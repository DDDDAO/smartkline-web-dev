import type { MutableRefObject, PointerEvent as ReactPointerEvent, RefObject } from "react";

const PAPER_POSITION_OVERLAY_STORAGE_KEY = "smartkline:kline-paper-position-overlay";
const PAPER_POSITION_OVERLAY_LONG_PRESS_MS = 420;
const PAPER_POSITION_OVERLAY_MARGIN = 12;

export type ChartPaperPositionOverlayPosition = {
  x: number;
  y: number;
};

export type ChartPaperPositionDragSession = {
  hasActivated: boolean;
  latestClientX: number;
  latestClientY: number;
  overlayHeight: number;
  overlayWidth: number;
  parentHeight: number;
  parentWidth: number;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  timerId: number;
};

export function startChartPaperPositionOverlayDrag(input: {
  dragSessionRef: MutableRefObject<ChartPaperPositionDragSession | null>;
  event: ReactPointerEvent<HTMLDivElement>;
  overlayRef: RefObject<HTMLDivElement | null>;
  positionRef: MutableRefObject<ChartPaperPositionOverlayPosition | null>;
  setIsDragging: (isDragging: boolean) => void;
  setIsPressing: (isPressing: boolean) => void;
  setPosition: (position: ChartPaperPositionOverlayPosition) => void;
}) {
  const overlay = input.overlayRef.current;
  const parent = overlay?.parentElement;
  if (!overlay || !parent || (input.event.pointerType === "mouse" && input.event.button !== 0)) {
    return;
  }

  input.event.preventDefault();
  input.event.stopPropagation();

  const overlayRect = overlay.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  const startPosition = {
    x: overlayRect.left - parentRect.left,
    y: overlayRect.top - parentRect.top,
  };

  input.event.currentTarget.setPointerCapture(input.event.pointerId);
  input.setIsPressing(true);
  input.positionRef.current = startPosition;
  input.setPosition(startPosition);

  const session: ChartPaperPositionDragSession = {
    hasActivated: false,
    latestClientX: input.event.clientX,
    latestClientY: input.event.clientY,
    overlayHeight: overlayRect.height,
    overlayWidth: overlayRect.width,
    parentHeight: parentRect.height,
    parentWidth: parentRect.width,
    pointerId: input.event.pointerId,
    startClientX: input.event.clientX,
    startClientY: input.event.clientY,
    startX: startPosition.x,
    startY: startPosition.y,
    timerId: window.setTimeout(() => {
      const currentSession = input.dragSessionRef.current;
      if (!currentSession || currentSession.pointerId !== input.event.pointerId) {
        return;
      }

      currentSession.hasActivated = true;
      currentSession.startClientX = currentSession.latestClientX;
      currentSession.startClientY = currentSession.latestClientY;
      currentSession.startX = input.positionRef.current?.x ?? currentSession.startX;
      currentSession.startY = input.positionRef.current?.y ?? currentSession.startY;
      input.setIsPressing(false);
      input.setIsDragging(true);
    }, PAPER_POSITION_OVERLAY_LONG_PRESS_MS),
  };

  input.dragSessionRef.current = session;
}

export function moveChartPaperPositionOverlayDrag(input: {
  dragSessionRef: MutableRefObject<ChartPaperPositionDragSession | null>;
  event: ReactPointerEvent<HTMLDivElement>;
  overlayRef: RefObject<HTMLDivElement | null>;
  positionRef: MutableRefObject<ChartPaperPositionOverlayPosition | null>;
  setIsPressing: (isPressing: boolean) => void;
  setPosition: (position: ChartPaperPositionOverlayPosition) => void;
}) {
  const session = input.dragSessionRef.current;
  if (!session || session.pointerId !== input.event.pointerId) {
    return;
  }

  input.event.preventDefault();
  input.event.stopPropagation();

  const deltaX = input.event.clientX - session.startClientX;
  const deltaY = input.event.clientY - session.startClientY;
  session.latestClientX = input.event.clientX;
  session.latestClientY = input.event.clientY;

  if (!session.hasActivated) {
    const nextPosition = clampChartPaperPositionOverlayPosition(input.overlayRef.current, {
      x: session.startX + deltaX,
      y: session.startY + deltaY,
    }, session);
    if (nextPosition) {
      input.positionRef.current = nextPosition;
      input.setPosition(nextPosition);
    }
    return;
  }

  const nextPosition = clampChartPaperPositionOverlayPosition(input.overlayRef.current, {
    x: session.startX + deltaX,
    y: session.startY + deltaY,
  }, session);
  if (!nextPosition) {
    return;
  }

  input.positionRef.current = nextPosition;
  input.setPosition(nextPosition);
}

export function finishChartPaperPositionOverlayDrag(
  handle: HTMLDivElement,
  input?: {
    dragSessionRef: MutableRefObject<ChartPaperPositionDragSession | null>;
    positionRef: MutableRefObject<ChartPaperPositionOverlayPosition | null>;
    setIsDragging: (isDragging: boolean) => void;
    setIsPressing: (isPressing: boolean) => void;
  },
) {
  const session = input?.dragSessionRef.current;
  if (!session) {
    input?.setIsDragging(false);
    input?.setIsPressing(false);
    return;
  }

  window.clearTimeout(session.timerId);
  input.dragSessionRef.current = null;
  input.setIsDragging(false);
  input.setIsPressing(false);

  if (handle.hasPointerCapture(session.pointerId)) {
    handle.releasePointerCapture(session.pointerId);
  }

  if (session.hasActivated && input.positionRef.current) {
    writeStoredChartPaperPositionOverlayPosition(input.positionRef.current);
  }
}

export function clampChartPaperPositionOverlayPosition(
  overlay: HTMLDivElement | null,
  position: ChartPaperPositionOverlayPosition | null,
  session?: Pick<ChartPaperPositionDragSession, "overlayHeight" | "overlayWidth" | "parentHeight" | "parentWidth">,
): ChartPaperPositionOverlayPosition | null {
  if (!position) {
    return null;
  }

  const parent = overlay?.parentElement;
  const overlayWidth = session?.overlayWidth ?? overlay?.getBoundingClientRect().width;
  const overlayHeight = session?.overlayHeight ?? overlay?.getBoundingClientRect().height;
  const parentWidth = session?.parentWidth ?? parent?.getBoundingClientRect().width;
  const parentHeight = session?.parentHeight ?? parent?.getBoundingClientRect().height;

  if (!overlayWidth || !overlayHeight || !parentWidth || !parentHeight) {
    return position;
  }

  return {
    x: clampNumber(position.x, PAPER_POSITION_OVERLAY_MARGIN, Math.max(PAPER_POSITION_OVERLAY_MARGIN, parentWidth - overlayWidth - PAPER_POSITION_OVERLAY_MARGIN)),
    y: clampNumber(position.y, PAPER_POSITION_OVERLAY_MARGIN, Math.max(PAPER_POSITION_OVERLAY_MARGIN, parentHeight - overlayHeight - PAPER_POSITION_OVERLAY_MARGIN)),
  };
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function readStoredChartPaperPositionOverlayPosition(): ChartPaperPositionOverlayPosition | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(PAPER_POSITION_OVERLAY_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<ChartPaperPositionOverlayPosition>;
    if (!Number.isFinite(parsedValue.x) || !Number.isFinite(parsedValue.y)) {
      return null;
    }

    return { x: Number(parsedValue.x), y: Number(parsedValue.y) };
  } catch {
    return null;
  }
}

export function writeStoredChartPaperPositionOverlayPosition(position: ChartPaperPositionOverlayPosition) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PAPER_POSITION_OVERLAY_STORAGE_KEY, JSON.stringify(position));
}

