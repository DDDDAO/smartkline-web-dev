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

  const rect = {
    bottomY,
    height: bottomY - topY,
    startX,
    topY,
    width: scope.bitmapSize.width - startX,
  };

  ctx.fillStyle = range.fillColor;
  ctx.fillRect(rect.startX, rect.topY, rect.width, rect.height);
  drawSignalPriceRangeStripes(ctx, scope, range, rect);
  drawSignalPriceRangeBorder(ctx, scope, range, rect);
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

function drawSignalPriceRangeStripes(
  ctx: CanvasRenderingContext2D,
  scope: {
    bitmapSize: { width: number };
    horizontalPixelRatio: number;
    verticalPixelRatio: number;
  },
  range: SignalPriceRangeDrawing,
  rect: { bottomY: number; height: number; startX: number; topY: number; width: number },
) {
  if (!range.stripeColor || rect.height < 2 || rect.width <= 0) {
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.startX, rect.topY, rect.width, rect.height);
  ctx.clip();
  ctx.strokeStyle = range.stripeColor;
  ctx.lineWidth = Math.max(1, Math.round(scope.verticalPixelRatio));
  ctx.setLineDash([]);

  const step = Math.max(7, Math.round(10 * scope.horizontalPixelRatio));
  const diagonalLength = rect.height + step;
  for (let x = rect.startX - diagonalLength; x < scope.bitmapSize.width + diagonalLength; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, rect.bottomY);
    ctx.lineTo(x + diagonalLength, rect.topY);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSignalPriceRangeBorder(
  ctx: CanvasRenderingContext2D,
  scope: {
    bitmapSize: { width: number };
    verticalPixelRatio: number;
  },
  range: SignalPriceRangeDrawing,
  rect: { bottomY: number; height: number; startX: number; topY: number },
) {
  if (!range.borderColor || range.borderLineStyle === undefined || range.borderLineWidth === undefined || rect.height < 2) {
    return;
  }

  const lineWidth = Math.max(1, Math.round(range.borderLineWidth * scope.verticalPixelRatio));
  const topCenterY = rect.topY + lineWidth / 2;
  const bottomCenterY = rect.bottomY - lineWidth / 2;
  if (bottomCenterY <= topCenterY) {
    return;
  }

  ctx.beginPath();
  ctx.strokeStyle = range.borderColor;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(createCanvasLineDash(range.borderLineStyle, lineWidth));
  ctx.moveTo(rect.startX, topCenterY);
  ctx.lineTo(scope.bitmapSize.width, topCenterY);
  ctx.moveTo(rect.startX, bottomCenterY);
  ctx.lineTo(scope.bitmapSize.width, bottomCenterY);
  ctx.stroke();
}

function positionBitmapLine(positionMedia: number, pixelRatio: number, desiredWidthMedia: number): { length: number; position: number } {
  const scaledPosition = Math.round(pixelRatio * positionMedia);
  const lineBitmapWidth = Math.round(desiredWidthMedia * pixelRatio);
  const offset = Math.floor(lineBitmapWidth * 0.5);
  return { length: lineBitmapWidth, position: scaledPosition - offset };
}
