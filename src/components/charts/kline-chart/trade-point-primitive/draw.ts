import type { ChartTheme } from "@/components/charts/kline-chart/types";
import { TRADE_POINT_POINTER_SIZE } from "./constants";
import type { DrawnTradePoint } from "./types";
import { getAvatarFallbackColors, getTradePointColors, getTradePointTextMarkerColors } from "./style";

export function drawTradePoint(ctx: CanvasRenderingContext2D, input: {
  item: DrawnTradePoint;
  pixelRatio: number;
  theme: ChartTheme;
  x: number;
  y: number;
}) {
  const { item, pixelRatio, theme, x, y } = input;
  const colors = item.textMarkerLabel
    ? getTradePointTextMarkerColors(item.side, theme)
    : getTradePointColors(item.side, theme);
  const markerHeight = item.height * pixelRatio;
  const radius = markerHeight / 2;
  const pointerSize = TRADE_POINT_POINTER_SIZE * pixelRatio;

  ctx.save();
  if (item.isActive) {
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12 * pixelRatio;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  drawMarkerPointer(ctx, item.side, x, y, radius, pointerSize, colors.border, pixelRatio);
  if (item.textMarkerLabel) {
    drawTextMarkerBadge(ctx, { colors, item, pixelRatio, radius, x, y });
  } else {
    drawAvatarCircle(ctx, {
      colors,
      item,
      pixelRatio,
      radius,
      theme,
      x,
      y,
    });
  }
  ctx.restore();
}

function drawTextMarkerBadge(ctx: CanvasRenderingContext2D, input: {
  colors: ReturnType<typeof getTradePointColors>;
  item: DrawnTradePoint;
  pixelRatio: number;
  radius: number;
  x: number;
  y: number;
}) {
  const { colors, item, pixelRatio, radius, x, y } = input;
  const width = item.width * pixelRatio;
  const height = item.height * pixelRatio;
  const left = x - width / 2;
  const top = y - height / 2;
  const borderRadius = radius;
  const label = item.textMarkerLabel ?? item.initials;

  ctx.beginPath();
  ctx.roundRect(left, top, width, height, borderRadius);
  ctx.fillStyle = colors.border;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = Math.max(1, 1.2 * pixelRatio);
  ctx.strokeStyle = colors.innerRing;
  ctx.stroke();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `900 ${Math.max(10, 11 * pixelRatio)}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y + 0.4 * pixelRatio);
}

function drawAvatarCircle(ctx: CanvasRenderingContext2D, input: {
  colors: ReturnType<typeof getTradePointColors>;
  item: DrawnTradePoint;
  pixelRatio: number;
  radius: number;
  theme: ChartTheme;
  x: number;
  y: number;
}) {
  const { colors, item, pixelRatio, radius, theme, x, y } = input;
  const borderWidth = (item.isActive ? 3 : 2.2) * pixelRatio;
  const innerRadius = Math.max(1, radius - borderWidth);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = colors.surface;
  ctx.fill();
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = colors.border;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
  ctx.clip();

  if (item.avatarImage?.complete && item.avatarImage.naturalWidth > 0) {
    drawCoverImage(ctx, item.avatarImage, x - innerRadius, y - innerRadius, innerRadius * 2, innerRadius * 2);
  } else {
    const fallbackGradient = ctx.createLinearGradient(x - innerRadius, y - innerRadius, x + innerRadius, y + innerRadius);
    const fallbackColors = getAvatarFallbackColors(item.traderName ?? item.title, theme);
    fallbackGradient.addColorStop(0, fallbackColors[0]);
    fallbackGradient.addColorStop(1, fallbackColors[1]);
    ctx.fillStyle = fallbackGradient;
    ctx.fillRect(x - innerRadius, y - innerRadius, innerRadius * 2, innerRadius * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `900 ${Math.max(9, 10.5 * pixelRatio)}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.initials, x, y + 0.4 * pixelRatio);
  }

  ctx.restore();

  ctx.shadowColor = "transparent";
  ctx.beginPath();
  ctx.arc(x, y, radius - borderWidth / 2, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, 0.7 * pixelRatio);
  ctx.strokeStyle = colors.innerRing;
  ctx.stroke();
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawMarkerPointer(
  ctx: CanvasRenderingContext2D,
  side: "buy" | "sell",
  x: number,
  y: number,
  radius: number,
  pointerSize: number,
  fill: string,
  pixelRatio: number,
) {
  ctx.beginPath();
  if (side === "buy") {
    const top = y - radius + 1 * pixelRatio;
    ctx.moveTo(x - pointerSize, top);
    ctx.lineTo(x + pointerSize, top);
    ctx.lineTo(x, top - pointerSize);
  } else {
    const bottom = y + radius - 1 * pixelRatio;
    ctx.moveTo(x - pointerSize, bottom);
    ctx.lineTo(x + pointerSize, bottom);
    ctx.lineTo(x, bottom + pointerSize);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
