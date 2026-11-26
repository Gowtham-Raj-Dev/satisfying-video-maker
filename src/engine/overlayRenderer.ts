import { OverlayConfig, TextOverlayLayer } from "@/types/simulation";

function resolveFontFamily(font: TextOverlayLayer["font"]): string {
  switch (font) {
    case "Impact":
      return 'Impact, "Arial Black", sans-serif';
    case "Mono":
      return '"JetBrains Mono", ui-monospace, monospace';
    case "Georgia":
      return 'Georgia, "Times New Roman", serif';
    default:
      return 'Inter, system-ui, -apple-system, sans-serif';
  }
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  layer: TextOverlayLayer,
  elapsedSec: number
) {
  if (!layer.enabled || !layer.text.trim()) return;

  const scale = Math.min(W, H) / 1080;
  const fontSize = Math.max(14, Math.round(layer.fontSize * scale));
  const x = W / 2;

  let alpha = 1;
  let ySlide = 0;

  if (layer.animation === "fade") {
    alpha = Math.min(1, elapsedSec / 0.55);
  } else if (layer.animation === "slide") {
    const t = Math.min(1, elapsedSec / 0.55);
    const ease = 1 - Math.pow(1 - t, 3);
    alpha = ease;
    ySlide = (1 - ease) * 24 * scale;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `700 ${fontSize}px ${resolveFontFamily(layer.font)}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const metrics = ctx.measureText(layer.text);
  const padX = 24 * scale;
  const padY = 14 * scale;
  const boxW = Math.min(W * 0.9, metrics.width + padX * 2);
  const boxH = fontSize + padY * 1.4;

  // Clamp center Y so pill/bar never clips outside top or bottom edge
  const minCenterY = boxH * 0.5 + 14 * scale;
  const maxCenterY = H - boxH * 0.5 - 14 * scale;
  const rawY = (layer.yOffsetPct / 100) * H;
  const drawY = Math.max(minCenterY, Math.min(maxCenterY, rawY)) + ySlide;

  if (layer.background === "pill") {
    ctx.fillStyle = "rgba(11, 11, 12, 0.78)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.beginPath();
    ctx.roundRect(x - boxW / 2, drawY - boxH / 2, boxW, boxH, boxH / 2);
    ctx.fill();
    ctx.stroke();
  } else if (layer.background === "bar") {
    ctx.fillStyle = "rgba(11, 11, 12, 0.8)";
    ctx.fillRect(0, drawY - boxH / 2, W, boxH);
  }

  if (layer.shadow) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillText(layer.text, x + 2 * scale, drawY + 2.5 * scale, W * 0.86);
  }

  ctx.fillStyle = layer.color || "#F5F5F5";
  ctx.fillText(layer.text, x, drawY, W * 0.86);
  ctx.restore();
}

export function renderOverlays(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  overlays: OverlayConfig,
  elapsedSec: number
) {
  drawLayer(ctx, W, H, overlays.top, elapsedSec);
  drawLayer(ctx, W, H, overlays.bottom, elapsedSec);
}
