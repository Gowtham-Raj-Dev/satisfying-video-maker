import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, createRng, drawBackground, getPerfFactor } from "../prng";
import { PointerEventData } from "../types";
import { SimulationParams } from "@/types/simulation";

interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  wobble: number;
  life: number;
  maxLife: number;
}

interface PopRing {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
}

interface Mist {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

export class BubblePopEngine extends BaseCanvasSimulation {
  private bubbles: Bubble[] = [];
  private rings: PopRing[] = [];
  private mist: Mist[] = [];
  private spawnTimer = 0;
  private rng = createRng(4219);

  protected onReset(): void {
    this.rng = createRng(this.params.seed);
    this.bubbles = [];
    this.rings = [];
    this.mist = [];
    this.spawnTimer = 0;
    const initial = clamp(Math.round(this.params.objectCount * 4), 10, 42);
    for (let i = 0; i < initial; i++) {
      this.spawnBubble(true);
    }
    this.statusLabel = "Floating";
  }

  protected onConfigUpdated(prev: SimulationParams, curr: SimulationParams): void {
    if (prev.seed !== curr.seed) this.onReset();
  }

  private spawnBubble(randomY = false) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#F43F5E"];
    const r = clamp(minDim * (0.025 + this.rng() * 0.035) * this.params.objectSize, 14, 90);
    this.bubbles.push({
      x: r + this.rng() * (W - r * 2),
      y: randomY ? r + this.rng() * (H - r * 2) : H + r,
      vx: (this.rng() - 0.5) * 1.1,
      vy: -(0.85 + this.rng() * 1.45),
      radius: r,
      color: colors[Math.floor(this.rng() * colors.length)],
      wobble: this.rng() * Math.PI * 2,
      life: 0,
      maxLife: 2.2 + this.rng() * 3.5,
    });
  }

  private popBubbleAt(index: number) {
    const b = this.bubbles[index];
    if (!b) return;
    this.bubbles.splice(index, 1);
    this.eventsCount++;
    soundEngine.playImpact(0.85, this.eventsCount, (b.x / Math.max(1, this.canvas.width)) * 2 - 1);

    this.rings.push({
      x: b.x,
      y: b.y,
      radius: b.radius,
      color: b.color,
      alpha: 0.9,
    });

    if (this.params.particleEffects) {
      const perf = getPerfFactor(this.params.performance);
      const count = Math.round(14 * perf);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
        const spd = 2 + Math.random() * 5;
        this.mist.push({
          x: b.x + Math.cos(a) * b.radius * 0.6,
          y: b.y + Math.sin(a) * b.radius * 0.6,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          color: b.color,
          size: 2.5 + Math.random() * 3,
          alpha: 1,
        });
      }
    }
  }

  public handlePointer(ev: PointerEventData): void {
    if (ev.type !== "down") return;
    const px = ev.x * this.canvas.width;
    const py = ev.y * this.canvas.height;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (Math.hypot(px - b.x, py - b.y) <= b.radius * 1.15) {
        this.popBubbleAt(i);
        break;
      }
    }
  }

  public stepFixed(dt: number): void {
    const step = dt * 60;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const targetCount = clamp(Math.round(this.params.objectCount * 5), 12, 48);

    this.spawnTimer += dt;
    if (this.bubbles.length < targetCount && this.spawnTimer >= 0.12) {
      this.spawnTimer = 0;
      this.spawnBubble(false);
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.life += dt;
      b.wobble += dt * 4;
      b.x += (b.vx + Math.sin(b.wobble) * 0.5) * step;
      b.y += b.vy * clamp(this.params.gravity, 0.4, 2) * step;

      if (b.x < b.radius + 12 || b.x > W - b.radius - 12) {
        b.x = clamp(b.x, b.radius + 12, W - b.radius - 12);
        b.vx *= -1;
      }

      if (b.life >= b.maxLife || b.y < H * 0.12) {
        this.popBubbleAt(i);
      }
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.radius += 2.5 * step;
      r.alpha -= 0.045 * step;
      if (r.alpha <= 0) this.rings.splice(i, 1);
    }

    for (let i = this.mist.length - 1; i >= 0; i--) {
      const m = this.mist[i];
      m.x += m.vx * step;
      m.y += m.vy * step;
      m.alpha -= 0.035 * step;
      if (m.alpha <= 0) this.mist.splice(i, 1);
    }

    this.activeObjects = this.bubbles.length + this.mist.length;
    const goalPops = 85;
    this.progressPct = clamp(
      Math.round(Math.min(this.eventsCount / goalPops, this.elapsedSeconds / 32) * 100),
      0,
      100
    );
    if (this.eventsCount >= goalPops && this.elapsedSeconds >= 32) {
      this.markCompleted(`${this.eventsCount} Bubbles Popped!`, "Completed 32s+ bubble pop ASMR session.");
    }
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);

    for (const r of this.rings) {
      ctx.save();
      ctx.globalAlpha = r.alpha;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const m of this.mist) {
      ctx.save();
      ctx.globalAlpha = m.alpha;
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const b of this.bubbles) {
      ctx.save();
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Specular highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.beginPath();
      ctx.ellipse(
        b.x - b.radius * 0.34,
        b.y - b.radius * 0.34,
        b.radius * 0.22,
        b.radius * 0.12,
        -Math.PI / 4,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  }
}
