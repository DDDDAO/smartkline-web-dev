import { LineStyle } from "lightweight-charts";
import type { SignalPriceRangeDrawing, SignalPriceRayDrawing } from "./signal-price-ray-types";

export function drawSignalPriceRange(
  ctx: CanvasRenderingContext2D,
  scope: {
    bitmapSize: { height: number; width: number };
    horizontalPixelRatio: number;
    verticalPixelRatio: number;
  },
  range: SignalPriceRangeDrawing,
) {
  const startX = Math.max(0, Math.round(range.startCoordinate * scope.horizontalPixelRatio));
  if (startX >= scope.bitmapSize.width) {
    return;
  }

  const topY = Math.max(0, Math.round(Math.min(range.maxCoordinate, range.minCoordinate) * scope.verticalPixelRatio));
  const bottomY = Math.min(scope.bitmapSize.height, Math.round(Math.max(range.maxCoordinate, range.minCoordinate) * scope.verticalPixelRatio));
  if (bottomY <= topY) {
    return;
  }

  ctx.fillStyle = range.fillColor;
  ctx.fillRect(startX, topY, scope.bitmapSize.width - startX, bottomY - topY);
}

export function drawSignalPriceRay(
  ctx: CanvasRenderingContext2D,
  scope: {
    bitmapSize: { width: number };
    horizontalPixelRatio: number;
    verticalPixelRatio: number;
  },
  ray: SignalPriceRayDrawing,
) {
  const startX = Math.max(0, Math.round(ray.startCoordinate * scope.horizontalPixelRatio));
  if (startX >= scope.bitmapSize.width) {
    return;
  }

  const yPosition = positionBitmapLine(ray.priceCoordinate, scope.verticalPixelRatio, ray.lineWidth);
  const yCenter = yPosition.position + yPosition.length / 2;

  ctx.beginPath();
  ctx.strokeStyle = ray.color;
  ctx.lineWidth = yPosition.length;
  ctx.setLineDash(createCanvasLineDash(ray.lineStyle, yPosition.length));
  ctx.moveTo(startX, yCenter);
  ctx.lineTo(scope.bitmapSize.width, yCenter);
  ctx.stroke();
}

function createCanvasLineDash(lineStyle: LineStyle, lineWidth: number): number[] {
  if (lineStyle === LineStyle.Dotted) {
    return [lineWidth, lineWidth];
  }

  if (lineStyle === LineStyle.Dashed) {
    return [2 * lineWidth, 2 * lineWidth];
  }

  if (lineStyle === LineStyle.LargeDashed) {
    return [6 * lineWidth, 6 * lineWidth];
  }

  if (lineStyle === LineStyle.SparseDotted) {
    return [lineWidth, 4 * lineWidth];
  }

  return [];
}

function positionBitmapLine(positionMedia: number, pixelRatio: number, desiredWidthMedia: number): { length: number; position: number } {
  const scaledPosition = Math.round(pixelRatio * positionMedia);
  const lineBitmapWidth = Math.round(desiredWidthMedia * pixelRatio);
  const offset = Math.floor(lineBitmapWidth * 0.5);
  return { length: lineBitmapWidth, position: scaledPosition - offset };
}

