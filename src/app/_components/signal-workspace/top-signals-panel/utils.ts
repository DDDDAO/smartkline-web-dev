import type { CSSProperties } from "react";

import { EXPANDED_POSITION_CARD_MIN_HEIGHT } from "./constants";

export function getSafePageOffset(offset: number, totalCount: number, pageSize: number): number {
  if (totalCount <= 0) {
    return 0;
  }

  const safePageSize = Math.max(1, pageSize);
  const maxOffset = Math.floor((totalCount - 1) / safePageSize) * safePageSize;
  return Math.max(0, Math.min(Math.floor(offset), maxOffset));
}

export function createPageRangeLabel(pageOffset: number, visibleCount: number, totalCount: number): string {
  if (totalCount <= 0 || visibleCount <= 0) {
    return "0 / 0";
  }

  const start = pageOffset + 1;
  const end = Math.min(totalCount, pageOffset + visibleCount);
  return `${start}-${end} / ${totalCount}`;
}

export function getSafeExternalUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getTopSignalCardHeightStyle({
  expandPositionList,
  isFlipped,
  lockedCardHeight,
  shouldLockCardHeight,
}: {
  expandPositionList: boolean;
  isFlipped: boolean;
  lockedCardHeight: number | null;
  shouldLockCardHeight: boolean;
}): CSSProperties | undefined {
  if (expandPositionList && isFlipped) {
    return {
      height: EXPANDED_POSITION_CARD_MIN_HEIGHT,
      minHeight: EXPANDED_POSITION_CARD_MIN_HEIGHT,
    };
  }

  if (lockedCardHeight === null || !shouldLockCardHeight) {
    return undefined;
  }

  return { minHeight: lockedCardHeight };
}

export function scrollElementIntoContainer(
  container: HTMLElement | null,
  element: HTMLElement,
  options: {
    block: "center" | "start";
    offset?: number;
  },
): void {
  if (!container) {
    element.scrollIntoView({ block: options.block, behavior: "smooth" });
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const offset = options.offset ?? 0;
  const currentTop = container.scrollTop + elementRect.top - containerRect.top;
  const targetTop = options.block === "center"
    ? currentTop - (container.clientHeight - elementRect.height) / 2
    : currentTop - offset;

  container.scrollTo({
    behavior: "smooth",
    top: Math.max(0, targetTop),
  });
}
