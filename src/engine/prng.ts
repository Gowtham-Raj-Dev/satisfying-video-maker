import { SimulationParams } from "@/types/simulation";

export function createRng(seed: number): () => number {
  let state = (seed | 0) || 123456789;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let cachedBgKey = "";
let cachedBgCanvas: HTMLCanvasElement | null = null;

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  params: SimulationParams
) {
  const key = `${W}x${H}|${params.bgColor || "#0B0B0C"}|${params.bgStyle}|${params.lighting}`;
  if (typeof document !== "undefined") {
    if (!cachedBgCanvas || cachedBgKey !== key) {
      cachedBgCanvas = document.createElement("canvas");
      cachedBgCanvas.width = W;
      cachedBgCanvas.height = H;
      const bctx = cachedBgCanvas.getContext("2d");
      if (bctx) {
        bctx.fillStyle = params.bgColor || "#0B0B0C";
        bctx.fillRect(0, 0, W, H);
        if (params.bgStyle === "radial") {
          const grad = bctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.65);
          const alpha = Math.min(0.12, 0.05 * params.lighting);
          grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
          grad.addColorStop(1, "rgba(0, 0, 0, 0)");
          bctx.fillStyle = grad;
          bctx.fillRect(0, 0, W, H);
        } else if (params.bgStyle === "grid") {
          const step = Math.round(Math.min(W, H) / 14);
          bctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
          bctx.lineWidth = 1;
          bctx.beginPath();
          for (let x = step; x < W; x += step) {
            bctx.moveTo(x, 0);
            bctx.lineTo(x, H);
          }
          for (let y = step; y < H; y += step) {
            bctx.moveTo(0, y);
            bctx.lineTo(W, y);
          }
          bctx.stroke();
        } else if (params.bgStyle === "dots") {
          const step = Math.round(Math.min(W, H) / 16);
          bctx.fillStyle = "rgba(255, 255, 255, 0.07)";
          for (let x = step; x < W; x += step) {
            for (let y = step; y < H; y += step) {
              bctx.fillRect(x - 1, y - 1, 2, 2);
            }
          }
        }
        cachedBgKey = key;
      }
    }
    if (cachedBgCanvas) {
      ctx.drawImage(cachedBgCanvas, 0, 0);
      return;
    }
  }

  ctx.fillStyle = params.bgColor || "#0B0B0C";
  ctx.fillRect(0, 0, W, H);
}

export function getPerfFactor(perf: SimulationParams["performance"]): number {
  if (perf === "low") return 0.45;
  if (perf === "high") return 1.35;
  return 1;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
