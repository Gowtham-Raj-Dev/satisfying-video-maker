import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, drawBackground } from "../prng";
import { PointerEventData } from "../types";
import { SimulationParams } from "@/types/simulation";

interface CradleRow {
  pivotY: number;
  len: number;
  count: number;
  phase: number;
  freq: number;
  lastHalf: number;
  color: string;
}

interface ToneBar {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  noteIndex: number;
  color: string;
  glow: number;
}

interface XyloBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  trail: { x: number; y: number }[];
}

interface ChainTile {
  flipped: boolean;
  progress: number; // 0..1 animation
  pendingDelay: number;
}

export class KineticArtEngine extends BaseCanvasSimulation {
  private cradleRows: CradleRow[] = [];
  private toneBars: ToneBar[] = [];
  private xyloBalls: XyloBall[] = [];
  private tiles: ChainTile[] = [];
  private gridCols = 11;
  private gridRows = 16;
  private spawnTimer = 0;
  private waveTime = 0;
  private score = 0;
  private cradleTargets: { x: number; y: number; color: string; r: number }[] = [];

  protected onReset(): void {
    this.cradleRows = [];
    this.toneBars = [];
    this.xyloBalls = [];
    this.tiles = [];
    this.cradleTargets = [];
    this.spawnTimer = 0;
    this.waveTime = 0;
    this.score = 0;
    this.initVariant();
    this.statusLabel = "Active";
  }

  protected onResize(): void {
    this.initVariant();
  }

  protected onConfigUpdated(prev: SimulationParams, curr: SimulationParams): void {
    if (
      prev.variant !== curr.variant ||
      prev.objectCount !== curr.objectCount ||
      prev.colors !== curr.colors
    ) {
      this.onReset();
    }
  }

  public handlePointer(ev: PointerEventData): void {
    if (ev.type !== "down") return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const colors = this.getPalette();
    const variant = this.params.variant || "newton-polyrhythm";

    if (variant === "xylophone-loop") {
      const r = clamp(minDim * 0.02 * this.params.objectSize, 8, 22);
      this.xyloBalls.push({
        x: clamp(ev.x, 0.12, 0.88) * W,
        y: clamp(ev.y, 0.08, 0.45) * H,
        vx: (ev.x - 0.5) * 4,
        vy: 0.5,
        radius: r,
        color: colors[this.xyloBalls.length % colors.length],
        trail: [],
      });
      if (this.xyloBalls.length > 18) this.xyloBalls.shift();
      soundEngine.playImpact(0.55, this.xyloBalls.length % 10, ev.x * 2 - 1);
    } else if (variant === "flip-wall") {
      const padX = W * 0.08;
      const padY = H * 0.14;
      const cellW = (W - padX * 2) / this.gridCols;
      const cellH = (H - padY * 2) / this.gridRows;
      const col = clamp(Math.floor((ev.x * W - padX) / cellW), 0, this.gridCols - 1);
      const row = clamp(Math.floor((ev.y * H - padY) / cellH), 0, this.gridRows - 1);
      this.triggerTileChain(row, col);
    }
  }

  private getPalette(): string[] {
    return this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#A855F7", "#F43F5E"];
  }

  private triggerTileChain(startR: number, startC: number): void {
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const dist = Math.abs(r - startR) + Math.abs(c - startC);
        const tile = this.tiles[r * this.gridCols + c];
        if (tile) {
          tile.pendingDelay = 0.01 + dist * 0.055;
        }
      }
    }
    this.eventsCount++;
    soundEngine.playImpact(0.75, this.eventsCount % 12, 0);
  }

  private initVariant(): void {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const colors = this.getPalette();
    const variant = this.params.variant || "newton-polyrhythm";

    if (variant === "xylophone-loop") {
      const bars = 9;
      for (let i = 0; i < bars; i++) {
        const y = H * (0.2 + i * 0.072);
        const dir = i % 2 === 0 ? 1 : -1;
        const barW = W * 0.34;
        const cX = W * 0.5 + dir * (W * 0.08);
        const tilt = dir * H * 0.032;
        this.toneBars.push({
          x1: cX - barW * 0.5,
          y1: y - tilt,
          x2: cX + barW * 0.5,
          y2: y + tilt,
          noteIndex: i,
          color: colors[i % colors.length],
          glow: 0,
        });
      }
      this.spawnXyloBall(W, H, colors);
      this.activeObjects = this.toneBars.length + this.xyloBalls.length;
    } else if (variant === "flip-wall") {
      this.gridCols = W > H ? 16 : 10;
      this.gridRows = W > H ? 10 : 16;
      this.tiles = [];
      for (let i = 0; i < this.gridCols * this.gridRows; i++) {
        this.tiles.push({ flipped: false, progress: 0, pendingDelay: -1 });
      }
      this.triggerTileChain(Math.floor(this.gridRows * 0.5), Math.floor(this.gridCols * 0.5));
      this.activeObjects = this.tiles.length;
    } else {
      // newton-polyrhythm: Pendulum Hammer Target Bash
      const rows = 3;
      for (let r = 0; r < rows; r++) {
        const py = H * (0.14 + r * 0.25);
        const len = H * 0.16;
        this.cradleRows.push({
          pivotY: py,
          len,
          count: 5,
          phase: 0,
          freq: (2.6 + r * 0.45) * Math.PI,
          lastHalf: 0,
          color: colors[r % colors.length],
        });
        this.cradleTargets.push(
          { x: W * 0.5 - minDim * 0.24, y: py + len * 0.85, color: colors[r % colors.length], r: minDim * 0.022 },
          { x: W * 0.5 + minDim * 0.24, y: py + len * 0.85, color: colors[(r + 1) % colors.length], r: minDim * 0.022 }
        );
      }
      this.activeObjects = rows * 5 + this.cradleTargets.length;
    }
  }

  private spawnXyloBall(W: number, H: number, colors: string[]): void {
    const minDim = Math.min(W, H);
    const radius = clamp(minDim * 0.02 * this.params.objectSize, 8, 22);
    this.xyloBalls.push({
      x: W * 0.46,
      y: H * 0.08,
      vx: 0.6,
      vy: 0.5,
      radius,
      color: colors[this.eventsCount % colors.length],
      trail: [],
    });
  }

  public stepFixed(dt: number): void {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const colors = this.getPalette();
    const variant = this.params.variant || "newton-polyrhythm";

    if (variant === "xylophone-loop") {
      this.stepXylophone(dt, W, H, colors);
    } else if (variant === "flip-wall") {
      this.stepFlipWall(dt);
    } else {
      this.stepNewtonCradle(dt);
    }

    this.progressPct = clamp(Math.round((this.elapsedSeconds / 32) * 100), 0, 100);
    if (this.elapsedSeconds >= 32) {
      this.markCompleted(`Chain Challenge Complete · ${this.score} pts`, "Completed 32-second kinetic challenge.");
    }
  }

  private stepNewtonCradle(dt: number): void {
    const inten = clamp(this.params.animationIntensity, 0.4, 2);
    for (let r = 0; r < this.cradleRows.length; r++) {
      const row = this.cradleRows[r];
      row.phase += row.freq * dt * inten * 0.55;
      const half = Math.floor(row.phase / Math.PI);
      if (half !== row.lastHalf) {
        row.lastHalf = half;
        this.eventsCount++;
        this.score += 15;
        soundEngine.playImpact(0.75, r * 3 + (half % 4), (r - 1) * 0.45);
      }
    }
    this.statusLabel = `Strikes: ${this.eventsCount}`;
  }

  private stepXylophone(dt: number, W: number, H: number, colors: string[]): void {
    const step = dt * 60;
    this.spawnTimer += dt;
    if (this.spawnTimer >= 1.35 && this.xyloBalls.length < 8) {
      this.spawnTimer = 0;
      this.spawnXyloBall(W, H, colors);
    }

    for (const bar of this.toneBars) {
      bar.glow = Math.max(0, bar.glow - dt * 2.4);
    }

    const grav = 0.24 * clamp(this.params.gravity, 0.5, 1.8) * (H / 1080 + 0.3) * step;
    for (let i = this.xyloBalls.length - 1; i >= 0; i--) {
      const b = this.xyloBalls[i];
      b.vy += grav;
      b.x += b.vx * step;
      b.y += b.vy * step;

      if (b.trail.length > 14) b.trail.shift();
      b.trail.push({ x: b.x, y: b.y });

      for (const bar of this.toneBars) {
        const dx = bar.x2 - bar.x1;
        const dy = bar.y2 - bar.y1;
        const lenSq = dx * dx + dy * dy || 1;
        const t = clamp(((b.x - bar.x1) * dx + (b.y - bar.y1) * dy) / lenSq, 0, 1);
        const cx = bar.x1 + t * dx;
        const cy = bar.y1 + t * dy;
        const dist = Math.hypot(b.x - cx, b.y - cy);
        if (dist < b.radius + 5) {
          const nx = (b.x - cx) / (dist || 1);
          const ny = (b.y - cy) / (dist || 1);
          b.x = cx + nx * (b.radius + 5.5);
          b.y = cy + ny * (b.radius + 5.5);
          const dot = b.vx * nx + b.vy * ny;
          if (dot < 0) {
            b.vx = b.vx - 1.72 * dot * nx;
            b.vy = b.vy - 1.72 * dot * ny;
            bar.glow = 1.0;
            this.eventsCount++;
            this.score += 10;
            soundEngine.playImpact(0.75, bar.noteIndex * 2, (b.x / W) * 2 - 1);
          }
        }
      }

      if (b.y > H * 0.9) {
        const zone = b.x > W * 0.35 && b.x < W * 0.65 ? 50 : 20;
        this.score += zone;
        b.x = W * 0.46;
        b.y = H * 0.08;
        b.vx = 0.6;
        b.vy = 0.5;
        b.trail = [];
      }
    }
    this.activeObjects = this.toneBars.length + this.xyloBalls.length;
    this.statusLabel = `Notes: ${this.eventsCount} · ${this.score} pts`;
  }

  private stepFlipWall(dt: number): void {
    this.waveTime += dt;
    if (this.waveTime >= 3.2) {
      this.waveTime = 0;
      const r = Math.floor(Math.random() * this.gridRows);
      const c = Math.floor(Math.random() * this.gridCols);
      this.triggerTileChain(r, c);
    }

    let flippedTotal = 0;
    for (const tile of this.tiles) {
      if (tile.pendingDelay > 0) {
        tile.pendingDelay -= dt;
        if (tile.pendingDelay <= 0) {
          tile.flipped = !tile.flipped;
          tile.pendingDelay = -1;
          this.score += 5;
        }
      }
      const target = tile.flipped ? 1 : 0;
      tile.progress += (target - tile.progress) * Math.min(1, dt * 9);
      if (tile.flipped) flippedTotal++;
    }
    this.statusLabel = `Chain Captured ${flippedTotal}/${this.tiles.length}`;
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);
    const minDim = Math.min(W, H);
    const colors = this.getPalette();
    const variant = this.params.variant || "newton-polyrhythm";

    if (variant === "xylophone-loop") {
      // Score multiplier catch buckets along floor
      const bucketLabels = ["2x", "5x BONUS", "2x"];
      const bxStarts = [0.08, 0.35, 0.65];
      const bWidths = [0.27, 0.3, 0.27];
      ctx.save();
      ctx.font = `700 ${Math.max(12, Math.round(minDim * 0.022))}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "rgba(196, 255, 46, 0.1)";
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(W * bxStarts[i], H * 0.88, W * bWidths[i] - 4, H * 0.06, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#F5F5F5";
        ctx.fillText(bucketLabels[i], W * (bxStarts[i] + bWidths[i] * 0.5), H * 0.916);
      }
      ctx.restore();

      for (const bar of this.toneBars) {
        ctx.save();
        ctx.lineCap = "round";
        if (bar.glow > 0.05) {
          ctx.strokeStyle = bar.color;
          ctx.globalAlpha = bar.glow * 0.45;
          ctx.lineWidth = 18;
          ctx.beginPath();
          ctx.moveTo(bar.x1, bar.y1);
          ctx.lineTo(bar.x2, bar.y2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = bar.glow > 0.25 ? "#FFFFFF" : bar.color;
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(bar.x1, bar.y1);
        ctx.lineTo(bar.x2, bar.y2);
        ctx.stroke();
        ctx.restore();
      }

      for (const b of this.xyloBalls) {
        if (b.trail.length > 1) {
          ctx.save();
          ctx.strokeStyle = b.color;
          ctx.lineWidth = b.radius * 0.8;
          ctx.lineCap = "round";
          ctx.globalAlpha = 0.28;
          ctx.beginPath();
          ctx.moveTo(b.trail[0].x, b.trail[0].y);
          for (let k = 1; k < b.trail.length; k++) ctx.lineTo(b.trail[k].x, b.trail[k].y);
          ctx.stroke();
          ctx.restore();
        }
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.arc(b.x - b.radius * 0.28, b.y - b.radius * 0.28, b.radius * 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return;
    }

    if (variant === "flip-wall") {
      const padX = W * 0.08;
      const padY = H * 0.14;
      const cellW = (W - padX * 2) / this.gridCols;
      const cellH = (H - padY * 2) / this.gridRows;
      ctx.save();
      for (let r = 0; r < this.gridRows; r++) {
        for (let c = 0; c < this.gridCols; c++) {
          const tile = this.tiles[r * this.gridCols + c];
          if (!tile) continue;
          const p = tile.progress;
          const scaleX = Math.max(0.15, Math.abs(Math.cos(p * Math.PI)));
          const cx = padX + (c + 0.5) * cellW;
          const cy = padY + (r + 0.5) * cellH;
          const w = (cellW - 6) * scaleX;
          const h = cellH - 6;
          ctx.fillStyle = p >= 0.5 ? colors[(c + r) % colors.length] : "#1B1B22";
          ctx.strokeStyle = p >= 0.5 ? "#FFFFFF" : "rgba(255,255,255,0.16)";
          ctx.lineWidth = p >= 0.5 ? 1.5 : 1;
          ctx.beginPath();
          ctx.roundRect(cx - w * 0.5, cy - h * 0.5, w, h, 4);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
      return;
    }

    // newton-polyrhythm with target bumper pads
    const rBob = clamp(minDim * 0.025 * this.params.objectSize, 10, 28);
    for (const tg of this.cradleTargets) {
      ctx.save();
      ctx.fillStyle = tg.color;
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.arc(tg.x, tg.y, tg.r * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tg.x, tg.y, tg.r * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const row of this.cradleRows) {
      const barW = rBob * 2 * (row.count + 2);
      const startX = W * 0.5 - ((row.count - 1) * rBob * 2.02) * 0.5;
      const amp = 0.72;
      const s = Math.sin(row.phase);
      const leftAngle = s < 0 ? s * amp : 0;
      const rightAngle = s > 0 ? s * amp : 0;

      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(W * 0.5 - barW * 0.5, row.pivotY);
      ctx.lineTo(W * 0.5 + barW * 0.5, row.pivotY);
      ctx.stroke();

      for (let i = 0; i < row.count; i++) {
        const px = startX + i * rBob * 2.02;
        const ang = i === 0 ? leftAngle : i === row.count - 1 ? rightAngle : 0;
        const bx = px + Math.sin(ang) * row.len;
        const by = row.pivotY + Math.cos(ang) * row.len;

        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(px, row.pivotY);
        ctx.lineTo(bx, by);
        ctx.stroke();

        ctx.fillStyle = row.color;
        ctx.beginPath();
        ctx.arc(bx, by, rBob, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.arc(bx - rBob * 0.28, by - rBob * 0.28, rBob * 0.26, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
