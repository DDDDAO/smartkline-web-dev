import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { WorkspaceCopy } from "@/app/_lib/i18n";

type OnboardingGuideProps = {
  copy: WorkspaceCopy["onboarding"];
  isDarkTheme: boolean;
  isOpen: boolean;
  onComplete: () => void;
};

type GuideStep = {
  coachPlacement?: "above-left" | "above-right" | "side-right-center";
  padding: number;
  radius: number;
  target: string;
};

type HighlightRect = {
  height: number;
  radius: number;
  width: number;
  x: number;
  y: number;
};

type CoachMarkPosition = {
  left: number;
  top: number;
};

export const ONBOARDING_GUIDE_STORAGE_KEY = "smartkline:onboarding-guide-seen";

const GUIDE_STEPS: GuideStep[] = [
  {
    padding: 0,
    radius: 24,
    target: "kol-first-card",
  },
  {
    coachPlacement: "above-right",
    padding: 8,
    radius: 24,
    target: "kline-signal-data",
  },
  {
    coachPlacement: "above-left",
    padding: 8,
    radius: 22,
    target: "kline-kol-avatars",
  },
  {
    coachPlacement: "side-right-center",
    padding: 0,
    radius: 999,
    target: "ai-summary-button",
  },
];

const COACH_MARK_WIDTH = 340;
const COACH_MARK_ESTIMATED_HEIGHT = 146;
const VIEWPORT_SAFE_PADDING = 18;

export function hasSeenOnboardingGuide(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(ONBOARDING_GUIDE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function markOnboardingGuideSeen(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(ONBOARDING_GUIDE_STORAGE_KEY, "true");
  } catch {
    // Ignore storage failures in private browsing or restricted webviews.
  }
}

export function OnboardingGuide({ copy, isDarkTheme, isOpen, onComplete }: OnboardingGuideProps) {
  const maskId = useId().replaceAll(":", "");
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<HighlightRect>(() => createFallbackRect());
  const [coachMarkPosition, setCoachMarkPosition] = useState<CoachMarkPosition>(() => ({ left: 24, top: 96 }));
  const coachMarkRef = useRef<HTMLDivElement | null>(null);
  const step = GUIDE_STEPS[stepIndex];
  const stepCopy = copy.steps[stepIndex] ?? copy.steps[0] ?? "";

  const completeGuide = useCallback(() => {
    markOnboardingGuideSeen();
    setStepIndex(0);
    onComplete();
  }, [onComplete]);

  const advanceGuide = useCallback(() => {
    if (stepIndex >= GUIDE_STEPS.length - 1) {
      completeGuide();
      return;
    }

    setStepIndex((currentStepIndex) => currentStepIndex + 1);
  }, [completeGuide, stepIndex]);

  const updateHighlight = useCallback(() => {
    const nextRect = resolveTargetRect(step);
    const nextCoachMarkPosition = resolveCoachMarkPosition(nextRect, step);
    setRect(nextRect);
    setCoachMarkPosition(nextCoachMarkPosition);
  }, [step]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    const rafId = window.requestAnimationFrame(updateHighlight);
    const timeoutId = window.setTimeout(updateHighlight, 180);
    const settleTimeoutId = window.setTimeout(updateHighlight, 520);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      window.clearTimeout(settleTimeoutId);
    };
  }, [isOpen, stepIndex, updateHighlight]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const targetElement = resolveTargetElement(step);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateHighlight);
    if (targetElement && resizeObserver) {
      resizeObserver.observe(targetElement);
    }

    const handleResize = () => updateHighlight();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        completeGuide();
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        advanceGuide();
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
      window.removeEventListener("keydown", handleKeyDown);
      resizeObserver?.disconnect();
    };
  }, [advanceGuide, completeGuide, isOpen, step, updateHighlight]);

  if (!isOpen) {
    return null;
  }

  const dimColor = isDarkTheme ? "rgba(3, 6, 10, 0.84)" : "rgba(38, 52, 68, 0.34)";
  const coachMarkClassName = isDarkTheme
    ? "fixed z-[92] w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/[0.09] bg-[#181A20]/96 px-4 py-3 text-slate-100 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl"
    : "fixed z-[92] w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[#E5EAF0] bg-white/96 px-4 py-3 text-slate-900 shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl";
  const progressClassName = "text-lg font-black leading-none text-[#00A6F4]";
  const hintClassName = isDarkTheme ? "mt-2 text-[11px] text-slate-500" : "mt-2 text-[11px] text-slate-400";

  return (
    <div
      aria-label={copy.ariaLabel}
      className="fixed inset-0 z-[90] cursor-pointer select-none"
      role="button"
      tabIndex={0}
      onClick={advanceGuide}
    >
      <svg aria-hidden="true" className="fixed inset-0 h-full w-full">
        <defs>
          <mask id={maskId}>
            <rect fill="white" height="100%" width="100%" x="0" y="0" />
            <rect
              className="guide-highlight-hole"
              fill="black"
              height={rect.height}
              rx={rect.radius}
              ry={rect.radius}
              width={rect.width}
              x={rect.x}
              y={rect.y}
            />
          </mask>
        </defs>
        <rect fill={dimColor} height="100%" mask={`url(#${maskId})`} width="100%" x="0" y="0" />
      </svg>
      <div
        ref={coachMarkRef}
        className={`${coachMarkClassName} guide-coach-mark`}
        style={{ left: coachMarkPosition.left, top: coachMarkPosition.top }}
        onClick={(event) => {
          event.stopPropagation();
          advanceGuide();
        }}
      >
        <div className={progressClassName}>
          {stepIndex + 1}/{GUIDE_STEPS.length}
        </div>
        <div className="mt-1 text-sm font-semibold leading-6">
          {stepCopy}
        </div>
        <div className={hintClassName}>
          {copy.hint}
        </div>
      </div>
    </div>
  );
}

function resolveTargetRect(step: GuideStep): HighlightRect {
  const element = resolveTargetElement(step);
  if (!element) {
    return createFallbackRect();
  }

  if (step.target === "kol-first-card") {
    element.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
  }

  const targetRect = element.getBoundingClientRect();
  if (targetRect.width <= 1 || targetRect.height <= 1) {
    return createFallbackRect();
  }

  return normalizeRect({
    height: targetRect.height + step.padding * 2,
    radius: step.radius,
    width: targetRect.width + step.padding * 2,
    x: targetRect.left - step.padding,
    y: targetRect.top - step.padding,
  });
}

function resolveTargetElement(step: GuideStep): HTMLElement | null {
  const primaryElement = document.querySelector<HTMLElement>(`[data-guide-target="${step.target}"]`);
  if (isUsableTargetElement(primaryElement)) {
    return primaryElement;
  }

  if (step.target === "kol-first-card") {
    return findFirstUsableElement([
      ".signal-card-scene .signal-card-face[role='button']",
      ".signal-card-scene .signal-card-face",
    ]);
  }

  if (step.target === "kline-signal-data") {
    return findFirstUsableElement([
      "[data-guide-target='kline-signal-data']",
      ".tv-lightweight-charts",
    ]);
  }

  return primaryElement;
}

function findFirstUsableElement(selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      if (isUsableTargetElement(element)) {
        return element;
      }
    }
  }

  return null;
}

function isUsableTargetElement(element: HTMLElement | null): element is HTMLElement {
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1;
}

function normalizeRect(rect: HighlightRect): HighlightRect {
  const maxWidth = Math.max(80, window.innerWidth - VIEWPORT_SAFE_PADDING * 2);
  const maxHeight = Math.max(80, window.innerHeight - VIEWPORT_SAFE_PADDING * 2);
  const width = Math.min(Math.max(rect.width, 1), maxWidth);
  const height = Math.min(Math.max(rect.height, 1), maxHeight);
  const x = clamp(rect.x, VIEWPORT_SAFE_PADDING, window.innerWidth - width - VIEWPORT_SAFE_PADDING);
  const y = clamp(rect.y, VIEWPORT_SAFE_PADDING, window.innerHeight - height - VIEWPORT_SAFE_PADDING);

  return {
    height,
    radius: Math.min(rect.radius, height / 2, width / 2),
    width,
    x,
    y,
  };
}

function createFallbackRect(): HighlightRect {
  if (typeof window === "undefined") {
    return { height: 120, radius: 24, width: 320, x: 24, y: 96 };
  }

  return normalizeRect({
    height: 132,
    radius: 24,
    width: Math.min(360, window.innerWidth - 48),
    x: 24,
    y: 96,
  });
}

function resolveCoachMarkPosition(rect: HighlightRect, step: GuideStep): CoachMarkPosition {
  const safePadding = VIEWPORT_SAFE_PADDING;
  const maxLeft = window.innerWidth - COACH_MARK_WIDTH - safePadding;

  if (step.coachPlacement === "above-right") {
    return {
      left: clamp(rect.x + rect.width - COACH_MARK_WIDTH, safePadding, maxLeft),
      top: clamp(rect.y - COACH_MARK_ESTIMATED_HEIGHT - 1, safePadding, window.innerHeight - COACH_MARK_ESTIMATED_HEIGHT - safePadding),
    };
  }

  if (step.coachPlacement === "above-left") {
    return {
      left: clamp(rect.x, safePadding, maxLeft),
      top: clamp(rect.y - COACH_MARK_ESTIMATED_HEIGHT - 1, safePadding, window.innerHeight - COACH_MARK_ESTIMATED_HEIGHT - safePadding),
    };
  }

  if (step.coachPlacement === "side-right-center") {
    const hasRightRoom = rect.x + rect.width + COACH_MARK_WIDTH + 16 <= window.innerWidth - safePadding;
    const left = hasRightRoom
      ? rect.x + rect.width + 16
      : clamp(rect.x, safePadding, maxLeft);

    return {
      left: clamp(left, safePadding, maxLeft),
      top: clamp(rect.y + rect.height / 2 - COACH_MARK_ESTIMATED_HEIGHT / 2, safePadding, window.innerHeight - COACH_MARK_ESTIMATED_HEIGHT - safePadding),
    };
  }

  const hasRightRoom = rect.x + rect.width + COACH_MARK_WIDTH + 22 <= window.innerWidth - safePadding;
  const hasLeftRoom = rect.x - COACH_MARK_WIDTH - 22 >= safePadding;
  const preferredTop = clamp(rect.y + rect.height / 2 - 68, safePadding, window.innerHeight - 160);

  if (hasRightRoom) {
    return { left: rect.x + rect.width + 16, top: preferredTop };
  }

  if (hasLeftRoom) {
    return { left: rect.x - COACH_MARK_WIDTH - 16, top: preferredTop };
  }

  const left = clamp(rect.x, safePadding, window.innerWidth - COACH_MARK_WIDTH - safePadding);
  const belowTop = rect.y + rect.height + 14;
  if (belowTop + 132 <= window.innerHeight - safePadding) {
    return { left, top: belowTop };
  }

  return { left, top: Math.max(safePadding, rect.y - 146) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
