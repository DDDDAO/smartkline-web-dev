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

  const endX = range.endCoordinate === null
    ? scope.bitmapSize.width
    : Math.max(startX + scope.horizontalPixelRatio, Math.round(range.endCoordinate * scope.horizontalPixelRatio));
  const topY = Math.max(0, Math.round(Math.min(range.maxCoordinate, range.minCoordinate) * scope.verticalPixelRatio));
  const bottomY = Math.min(scope.bitmapSize.height, Math.round(Math.max(range.maxCoordinate, range.minCoordinate) * scope.verticalPixelRatio));
  if (bottomY <= topY) {
    return;
  }

  const rect = {
    bottomY,
    height: bottomY - topY,
    startX,
    topY,
    width: Math.min(scope.bitmapSize.width, endX) - startX,
  };

  if (rect.width <= 0) {
    return;
  }

  ctx.fillStyle = range.fillColor;
  ctx.fillRect(rect.startX, rect.topY, rect.width, rect.height);
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

  const endX = ray.endCoordinate === null
    ? scope.bitmapSize.width
    : Math.max(startX + scope.horizontalPixelRatio, Math.round(ray.endCoordinate * scope.horizontalPixelRatio));
  const yPosition = positionBitmapLine(ray.priceCoordinate, scope.verticalPixelRatio, ray.lineWidth);
  const yCenter = yPosition.position + yPosition.length / 2;

  ctx.beginPath();
  ctx.strokeStyle = ray.color;
  ctx.lineWidth = yPosition.length;
  ctx.setLineDash(createCanvasLineDash(ray.lineStyle, yPosition.length));
  ctx.moveTo(startX, yCenter);
  ctx.lineTo(Math.min(scope.bitmapSize.width, endX), yCenter);
  ctx.stroke();

  if (ray.label) {
    drawLineLabel(ctx, scope, {
      color: ray.color,
      label: ray.label,
      startX,
      yCenter,
    });
  }
}

function drawLineLabel(
  ctx: CanvasRenderingContext2D,
  scope: { bitmapSize: { width: number }; horizontalPixelRatio: number; verticalPixelRatio: number },
  input: { color: string; label: string; startX: number; yCenter: number },
) {
  const paddingX = 5 * scope.horizontalPixelRatio;
  const paddingY = 2 * scope.verticalPixelRatio;
  const gap = 7 * scope.horizontalPixelRatio;
  const fontSize = 11 * scope.verticalPixelRatio;
  const labelX = input.startX - gap;

  ctx.save();
  ctx.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;
  const textWidth = ctx.measureText(input.label).width;
  const pillWidth = textWidth + paddingX * 2;
  const pillHeight = fontSize + paddingY * 2;
  const hasLeftSpace = labelX - pillWidth > 2 * scope.horizontalPixelRatio;
  const left = hasLeftSpace ? labelX - pillWidth : input.startX + gap;
  const top = input.yCenter - pillHeight / 2;

  ctx.fillStyle = input.color;
  roundRect(ctx, left, top, pillWidth, pillHeight, 5 * scope.horizontalPixelRatio);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(input.label, left + paddingX, input.yCenter + 0.5 * scope.verticalPixelRatio);
  ctx.restore();
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
  const lineBitmapWidth = Math.max(1, Math.round(desiredWidthMedia * pixelRatio));
  const offset = Math.floor(lineBitmapWidth * 0.5);
  return { length: lineBitmapWidth, position: scaledPosition - offset };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}
