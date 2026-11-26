import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, createRng, drawBackground, getPerfFactor } from "../prng";
import { SimulationParams } from "@/types/simulation";

interface MagBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  charge: 1 | -1;
  color: string;
}

interface Pole {
  x: number;
  y: number;
  polarity: 1 | -1;
}

export class MagneticAttractorEngine extends BaseCanvasSimulation {
  private balls: MagBall[] = [];
  private poles: Pole[] = [];
  private flipTimer = 0;

  protected onReset(): void {
    this.flipTimer = 0;
    this.initField();
    this.statusLabel = "Magnetic Field";
  }

  protected onResize(): void {
    this.initField();
  }

  protected onConfigUpdated(prev: SimulationParams, curr: SimulationParams): void {
    if (prev.objectCount !== curr.objectCount || prev.seed !== curr.seed) {
      this.initField();
    }
  }

  private initField() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const rng = createRng(this.params.seed);
    const perf = getPerfFactor(this.params.performance);
    const count = Math.round(clamp(this.params.objectCount * 20, 24, 160) * perf);
    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#F43F5E"];

    this.poles = [
      { x: W * 0.35, y: H * 0.45, polarity: 1 },
      { x: W * 0.65, y: H * 0.55, polarity: -1 },
    ];

    this.balls = [];
    for (let i = 0; i < count; i++) {
      const charge: 1 | -1 = i % 2 === 0 ? 1 : -1;
      this.balls.push({
        x: W * (0.15 + rng() * 0.7),
        y: H * (0.15 + rng() * 0.7),
        vx: (rng() - 0.5) * 3,
        vy: (rng() - 0.5) * 3,
        radius: clamp(minDim * (0.011 + rng() * 0.008) * this.params.objectSize, 6, 22),
        charge,
        color: colors[i % colors.length],
      });
    }
    this.activeObjects = this.balls.length;
  }

  public stepFixed(dt: number): void {
    if (this.poles.length < 2) return;
    const step = dt * 60;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const cX = W / 2;
    const cY = H / 2;

    this.flipTimer += dt;
    if (this.flipTimer >= 4.0) {
      this.flipTimer = 0;
      this.poles.forEach((p) => (p.polarity = p.polarity === 1 ? -1 : 1));
      this.eventsCount++;
      soundEngine.playImpact(0.7, this.eventsCount, 0);
      if (this.eventsCount >= 8) {
        this.markCompleted("Magnetic Cycle Complete!", "Completed 8 full polarity inversion waves (32s).");
        return;
      }
    }
    this.progressPct = clamp(Math.round(((this.eventsCount + this.flipTimer / 4) / 8) * 100), 0, 100);

    // Orbit poles smoothly
    const orbitR = minDim * 0.2;
    const a = this.elapsedSeconds * 0.85 * this.params.animationIntensity;
    this.poles[0].x = cX + Math.cos(a) * orbitR;
    this.poles[0].y = cY + Math.sin(a) * orbitR;
    this.poles[1].x = cX - Math.cos(a) * orbitR;
    this.poles[1].y = cY - Math.sin(a) * orbitR;

    const strength = 2200 * this.params.gravityStrength * (minDim / 1080);

    for (const b of this.balls) {
      for (const p of this.poles) {
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        const d2 = dx * dx + dy * dy + 1600;
        const d = Math.sqrt(d2);
        const dir = p.polarity === b.charge ? -0.45 : 1.0; // opposite attracts, same gently repels
        const f = (strength * dir) / d2;
        b.vx += ((f * dx) / d) * step;
        b.vy += ((f * dy) / d) * step;
      }
      b.vx *= 0.965;
      b.vy *= 0.965;
      b.x += b.vx * step;
      b.y += b.vy * step;

      if (b.x < b.radius + 20 || b.x > W - b.radius - 20) {
        b.x = clamp(b.x, b.radius + 20, W - b.radius - 20);
        b.vx *= -0.8;
      }
      if (b.y < b.radius + 20 || b.y > H - b.radius - 20) {
        b.y = clamp(b.y, b.radius + 20, H - b.radius - 20);
        b.vy *= -0.8;
      }
    }

    // Collide balls
    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const a = this.balls[i];
        const b = this.balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const minD = a.radius + b.radius;
        if (d < minD && d > 0.001) {
          const nx = dx / d;
          const ny = dy / d;
          const overlap = (minD - d) * 0.5;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
          const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rel > 0) {
            a.vx -= rel * 0.65 * nx;
            a.vy -= rel * 0.65 * ny;
            b.vx += rel * 0.65 * nx;
            b.vy += rel * 0.65 * ny;
          }
        }
      }
    }
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);

    // Draw poles
    for (const p of this.poles) {
      ctx.save();
      ctx.strokeStyle = p.polarity > 0 ? "#C4FF2E" : "#38BDF8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = p.polarity > 0 ? "#C4FF2E" : "#38BDF8";
      ctx.font = "700 22px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.polarity > 0 ? "+" : "−", p.x, p.y + 1);
      ctx.restore();
    }

    // Metallic balls
    for (const b of this.balls) {
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
