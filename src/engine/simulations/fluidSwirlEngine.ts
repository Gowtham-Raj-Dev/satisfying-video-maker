import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, createRng, drawBackground, getPerfFactor } from "../prng";
import { PointerEventData } from "../types";
import { SimulationParams } from "@/types/simulation";

interface FluidDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

interface Shelf {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface MovingGate {
  y: number;
  gapX: number;
  gapW: number;
  phase: number;
}

export class FluidSwirlEngine extends BaseCanvasSimulation {
  private drops: FluidDrop[] = [];
  private shelves: Shelf[] = [];
  private gates: MovingGate[] = [];
  private bucketFills: number[] = [0, 0, 0];
  private phase = 0;
  private rng = createRng(4219);
  private pointerDown = false;
  private pointerNormX = 0.5;
  private pointerNormY = 0.5;

  protected onReset(): void {
    this.rng = createRng(this.params.seed);
    this.drops = [];
    this.gates = [];
    this.bucketFills = [0, 0, 0];
    this.phase = 0;
    this.buildShelves();
    this.initFluid();
    this.statusLabel = "Playing";
  }

  protected onResize(): void {
    this.onReset();
  }

  protected onConfigUpdated(prev: SimulationParams, curr: SimulationParams): void {
    if (prev.variant !== curr.variant || prev.seed !== curr.seed || prev.colors !== curr.colors) {
      this.onReset();
    }
  }

  public handlePointer(ev: PointerEventData): void {
    this.pointerNormX = clamp(ev.x, 0.05, 0.95);
    this.pointerNormY = clamp(ev.y, 0.05, 0.95);
    if (ev.type === "down") {
      this.pointerDown = true;
      soundEngine.playImpact(0.45, this.eventsCount % 12, ev.x * 2 - 1);
    } else if (ev.type === "up") {
      this.pointerDown = false;
    }
  }

  private buildShelves(): void {
    const W = this.canvas.width;
    const H = this.canvas.height;
    this.shelves = [];
    this.gates = [];
    const variant = this.params.variant || "mixer";
    if (variant === "maze") {
      this.shelves.push(
        { x1: W * 0.1, y1: H * 0.25, x2: W * 0.72, y2: H * 0.33 },
        { x1: W * 0.9, y1: H * 0.41, x2: W * 0.28, y2: H * 0.49 },
        { x1: W * 0.1, y1: H * 0.57, x2: W * 0.72, y2: H * 0.65 },
        { x1: W * 0.9, y1: H * 0.72, x2: W * 0.28, y2: H * 0.8 }
      );
    } else if (variant === "lava-lamp") {
      for (let g = 0; g < 4; g++) {
        this.gates.push({
          y: H * (0.24 + g * 0.16),
          gapX: W * 0.5,
          gapW: W * 0.22,
          phase: g * 1.4,
        });
      }
    } else if (variant === "pond-ripples") {
      // Diverter paddles directing colored streams toward 3 beakers
      this.shelves.push(
        { x1: W * 0.16, y1: H * 0.34, x2: W * 0.44, y2: H * 0.42 },
        { x1: W * 0.84, y1: H * 0.34, x2: W * 0.56, y2: H * 0.42 },
        { x1: W * 0.32, y1: H * 0.56, x2: W * 0.68, y2: H * 0.62 }
      );
    }
  }

  private initFluid(): void {
    const rng = this.rng;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const perf = getPerfFactor(this.params.performance);
    const colors = this.params.colors.length ? this.params.colors : ["#00F5FF", "#FF007F", "#C4FF2E"];
    const variant = this.params.variant || "mixer";

    if (variant === "lava-lamp") {
      // Rising Buoyant Orbs dodging shifting neon laser gates
      const count = 24;
      for (let i = 0; i < count; i++) {
        this.drops.push({
          x: W * (0.14 + rng() * 0.72),
          y: H * (0.18 + rng() * 0.72),
          vx: (rng() - 0.5) * 1.4,
          vy: -(1.4 + rng() * 1.5),
          color: colors[i % colors.length],
          size: clamp(minDim * (0.016 + rng() * 0.014) * this.params.objectSize, 8, 28),
          alpha: 0.94,
        });
      }
      this.activeObjects = this.drops.length;
      return;
    }

    if (variant === "mercury-beads") {
      // Merging & Boss-Popping Mercury Spheres
      const count = clamp(Math.round(24 * perf), 14, 34);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const dist = minDim * (0.08 + (i % 4) * 0.065);
        this.drops.push({
          x: W * 0.5 + Math.cos(a) * dist,
          y: H * 0.5 + Math.sin(a) * dist,
          vx: -Math.sin(a) * 2.2 + (rng() - 0.5) * 1.5,
          vy: Math.cos(a) * 2.2 + (rng() - 0.5) * 1.5,
          color: colors[i % colors.length],
          size: clamp(minDim * 0.018 * this.params.objectSize, 9, 22),
          alpha: 0.96,
        });
      }
      this.activeObjects = this.drops.length;
      return;
    }

    if (variant === "pond-ripples") {
      // Stream starts flowing immediately into diverters & 3 beakers
      const initialDrops = clamp(Math.round(120 * perf), 60, 180);
      for (let i = 0; i < initialDrops; i++) {
        this.drops.push({
          x: W * (0.2 + rng() * 0.6),
          y: H * (0.14 + rng() * 0.55),
          vx: (rng() - 0.5) * 2.2,
          vy: 2 + rng() * 2,
          color: colors[i % 3],
          size: clamp(minDim * 0.008 * this.params.objectSize, 4, 11),
          alpha: 0.9,
        });
      }
      this.activeObjects = this.drops.length;
      return;
    }

    if (variant === "ferrofluid") {
      // Magnetic Striker & Ferrofluid Goal Droplets
      const count = clamp(Math.round(40 * perf), 20, 64);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const r = minDim * (0.09 + rng() * 0.25);
        this.drops.push({
          x: W * 0.5 + Math.cos(a) * r,
          y: H * 0.5 + Math.sin(a) * r,
          vx: -Math.sin(a) * 1.8,
          vy: Math.cos(a) * 1.8,
          color: colors[i % colors.length],
          size: clamp(minDim * (0.011 + rng() * 0.006) * this.params.objectSize, 6, 16),
          alpha: 0.92,
        });
      }
      this.activeObjects = this.drops.length;
      return;
    }

    const targetCount = Math.round(clamp(this.params.particleCount, 120, 900) * perf);
    for (let i = 0; i < targetCount; i++) {
      this.drops.push({
        x: W * (0.15 + rng() * 0.7),
        y: H * (0.15 + rng() * 0.7),
        vx: (rng() - 0.5) * 2,
        vy: (rng() - 0.5) * 2,
        color: colors[i % colors.length],
        size: clamp((4 + rng() * 5) * this.params.objectSize, 2, 16),
        alpha: 0.85,
      });
    }
    this.activeObjects = this.drops.length;
  }

  public stepFixed(dt: number): void {
    const step = dt * 60;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const cX = W / 2;
    const cY = H / 2;
    const perf = getPerfFactor(this.params.performance);
    const colors = this.params.colors.length ? this.params.colors : ["#00F5FF", "#FF007F", "#C4FF2E"];
    this.phase += dt * 1.4 * this.params.animationIntensity;
    const variant = this.params.variant || "mixer";

    if (variant === "ferrofluid") {
      // Orbiting Mag-Core pulls & bats spiky ferrofluid blobs into 4 glowing corner goals
      const dishR = minDim * 0.41;
      const magX = this.pointerDown ? this.pointerNormX * W : cX + Math.cos(this.phase * 1.35) * dishR * 0.42;
      const magY = this.pointerDown ? this.pointerNormY * H : cY + Math.sin(this.phase * 1.85) * dishR * 0.42;
      for (const b of this.drops) {
        const dx = magX - b.x;
        const dy = magY - b.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < minDim * 0.25) {
          b.vx += (dx / d) * 0.35 * step;
          b.vy += (dy / d) * 0.35 * step;
        }
        b.vx *= 0.975;
        b.vy *= 0.975;
        b.x += b.vx * step;
        b.y += b.vy * step;
        const dc = Math.hypot(b.x - cX, b.y - cY);
        if (dc > dishR - b.size) {
          const nx = (cX - b.x) / (dc || 1);
          const ny = (cY - b.y) / (dc || 1);
          b.x = cX - nx * (dishR - b.size);
          b.y = cY - ny * (dishR - b.size);
          const dot = b.vx * nx + b.vy * ny;
          if (dot < 0) {
            b.vx -= 1.8 * dot * nx;
            b.vy -= 1.8 * dot * ny;
            this.eventsCount++;
            soundEngine.playImpact(0.45, this.eventsCount % 12, (b.x / W) * 2 - 1);
          }
        }
      }
      this.activeObjects = this.drops.length;
      this.statusLabel = `Mag Strikes: ${this.eventsCount}`;
    } else if (variant === "lava-lamp") {
      // Rising Bubble Dodge Maze through oscillating laser gates
      for (const g of this.gates) {
        g.gapX = W * (0.5 + Math.sin(this.phase * 1.1 + g.phase) * 0.27);
      }
      for (const b of this.drops) {
        b.vy -= 0.04 * clamp(this.params.speed, 0.4, 2) * step;
        b.vy = clamp(b.vy, -minDim * 0.0085, 3);
        if (this.pointerDown) {
          b.vx += ((this.pointerNormX * W - b.x) * 0.001) * step;
        }
        b.x += b.vx * step;
        b.y += b.vy * step;
        if (b.x < b.size + 18 || b.x > W - b.size - 18) {
          b.x = clamp(b.x, b.size + 18, W - b.size - 18);
          b.vx *= -0.9;
        }
        for (const g of this.gates) {
          if (Math.abs(b.y - g.y) < b.size + 6) {
            const insideGap = Math.abs(b.x - g.gapX) < g.gapW * 0.5 - b.size * 0.5;
            if (!insideGap) {
              b.y = b.y < g.y ? g.y - b.size - 7 : g.y + b.size + 7;
              b.vy *= -0.78;
              b.vx += (b.x < g.gapX ? 0.5 : -0.5);
              soundEngine.playClack((b.x / W) * 2 - 1);
            }
          }
        }
        if (b.y < H * 0.12) {
          b.y = H * 0.88;
          b.vy = -1.6;
          this.eventsCount++;
          soundEngine.playImpact(0.55, this.eventsCount % 14, (b.x / W) * 2 - 1);
        }
      }
      this.activeObjects = this.drops.length;
      this.statusLabel = `Gates Cleared: ${this.eventsCount}`;
    } else if (variant === "pond-ripples") {
      // Liquid Fill Buckets Game! Drag/sweep diverter or watch nozzle fill 3 beakers!
      const nozzleX = this.pointerDown
        ? this.pointerNormX * W
        : W * (0.5 + Math.sin(this.phase * 1.1) * 0.33);
      if (this.shelves.length >= 3) {
        const s = this.shelves[2];
        const midX = this.pointerDown ? this.pointerNormX * W : W * (0.5 + Math.cos(this.phase * 0.9) * 0.14);
        s.x1 = midX - W * 0.16;
        s.x2 = midX + W * 0.16;
      }

      const spawnN = Math.max(2, Math.round(5 * perf));
      for (let i = 0; i < spawnN; i++) {
        if (this.drops.length >= 320 * perf) break;
        const cIdx = Math.floor((this.elapsedSeconds * 0.8 + i * 0.1) % 3);
        this.drops.push({
          x: nozzleX + (Math.random() - 0.5) * 22,
          y: H * 0.12,
          vx: (Math.random() - 0.5) * 1.6,
          vy: 2.2,
          color: colors[cIdx % colors.length],
          size: clamp(minDim * 0.008 * this.params.objectSize, 4, 11),
          alpha: 0.92,
        });
      }

      const grav = 0.28 * this.params.gravity * step;
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i];
        d.vy += grav;
        d.x += d.vx * step;
        d.y += d.vy * step;
        for (const s of this.shelves) {
          const sx = s.x2 - s.x1;
          const sy = s.y2 - s.y1;
          const lenSq = sx * sx + sy * sy || 1;
          const t = clamp(((d.x - s.x1) * sx + (d.y - s.y1) * sy) / lenSq, 0, 1);
          const cx = s.x1 + t * sx;
          const cy = s.y1 + t * sy;
          const dist = Math.hypot(d.x - cx, d.y - cy);
          if (dist < d.size + 5) {
            const nx = (d.x - cx) / (dist || 1);
            const ny = (d.y - cy) / (dist || 1);
            d.x = cx + nx * (d.size + 5);
            d.y = cy + ny * (d.size + 5);
            const dot = d.vx * nx + d.vy * ny;
            if (dot < 0) {
              d.vx -= 1.55 * dot * nx;
              d.vy -= 1.55 * dot * ny;
            }
          }
        }
        if (d.x < 24 || d.x > W - 24) {
          d.x = clamp(d.x, 24, W - 24);
          d.vx *= -0.8;
        }
        if (d.y > H * 0.84) {
          const bucket = d.x < W * 0.37 ? 0 : d.x > W * 0.63 ? 2 : 1;
          this.bucketFills[bucket] = Math.min(100, this.bucketFills[bucket] + 0.55);
          this.eventsCount++;
          if (Math.random() < 0.08) soundEngine.playImpact(0.4, bucket * 3, (bucket - 1) * 0.6);
          this.drops.splice(i, 1);
        }
      }
      const avgFill = Math.round((this.bucketFills[0] + this.bucketFills[1] + this.bucketFills[2]) / 3);
      this.activeObjects = this.drops.length;
      this.statusLabel = `Beakers Filled ${avgFill}%`;
    } else if (variant === "mercury-beads") {
      // Merge colliding beads until Giant Boss Drop hits threshold & bursts!
      const dishR = minDim * 0.4;
      const bossMax = clamp(minDim * 0.085, 36, 78);
      for (let i = 0; i < this.drops.length; i++) {
        const a = this.drops[i];
        a.vx += Math.cos(this.phase * 0.7) * 0.04 * step;
        a.vy += Math.sin(this.phase * 0.9) * 0.04 * step;
        a.x += a.vx * step;
        a.y += a.vy * step;
        const dc = Math.hypot(a.x - cX, a.y - cY);
        if (dc > dishR - a.size) {
          const nx = (cX - a.x) / (dc || 1);
          const ny = (cY - a.y) / (dc || 1);
          a.x = cX - nx * (dishR - a.size);
          a.y = cY - ny * (dishR - a.size);
          const dot = a.vx * nx + a.vy * ny;
          if (dot < 0) {
            a.vx -= 1.85 * dot * nx;
            a.vy -= 1.85 * dot * ny;
          }
        }
      }

      // Merge pairwise when colliding closely
      for (let i = this.drops.length - 1; i >= 0; i--) {
        for (let j = i - 1; j >= 0; j--) {
          const a = this.drops[i];
          const b = this.drops[j];
          if (!a || !b) continue;
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < (a.size + b.size) * 0.88) {
            const newSize = Math.min(bossMax * 1.15, Math.hypot(a.size, b.size));
            b.x = (b.x * b.size + a.x * a.size) / (b.size + a.size);
            b.y = (b.y * b.size + a.y * a.size) / (b.size + a.size);
            b.vx = (b.vx + a.vx) * 0.55;
            b.vy = (b.vy + a.vy) * 0.55;
            b.size = newSize;
            this.drops.splice(i, 1);
            this.eventsCount++;
            soundEngine.playImpact(0.65, this.eventsCount % 12, (b.x / W) * 2 - 1);
            if (b.size >= bossMax) {
              // Boss Mercury Sphere explodes back into crispy fast droplets!
              this.drops.splice(j, 1);
              for (let k = 0; k < 12; k++) {
                const ang = (k / 12) * Math.PI * 2;
                this.drops.push({
                  x: b.x + Math.cos(ang) * 14,
                  y: b.y + Math.sin(ang) * 14,
                  vx: Math.cos(ang) * 3.8,
                  vy: Math.sin(ang) * 3.8,
                  color: colors[k % colors.length],
                  size: clamp(minDim * 0.016 * this.params.objectSize, 8, 18),
                  alpha: 0.96,
                });
              }
              soundEngine.playImpact(1.2, 8, 0);
            }
            break;
          }
        }
      }
      this.activeObjects = this.drops.length;
      this.statusLabel = `Merges: ${this.eventsCount}`;
    } else {
      if (variant === "fountain" || variant === "waterfall" || variant === "maze") {
        const spawnN = Math.max(2, Math.round(6 * perf));
        for (let i = 0; i < spawnN; i++) {
          if (this.drops.length > 900 * perf) this.drops.shift();
          if (variant === "fountain") {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.55;
            const spd = (H * 0.014) * (0.8 + Math.random() * 0.35);
            this.drops.push({
              x: cX + (Math.random() - 0.5) * 16,
              y: H * 0.84,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              color: colors[Math.floor((this.phase * 2 + i) % colors.length)],
              size: clamp(5 * this.params.objectSize, 2.5, 14),
              alpha: 0.9,
            });
          } else if (variant === "waterfall") {
            this.drops.push({
              x: cX + (Math.random() - 0.5) * (W * 0.38),
              y: H * 0.12,
              vx: (Math.random() - 0.5) * 1.2,
              vy: 3 + Math.random() * 3,
              color: colors[Math.floor((Math.random() * 2 + this.phase) % colors.length)],
              size: clamp(5.5 * this.params.objectSize, 3, 14),
              alpha: 0.88,
            });
          } else {
            this.drops.push({
              x: W * 0.18 + (Math.random() - 0.5) * 28,
              y: H * 0.14,
              vx: 1.5,
              vy: 1,
              color: colors[Math.floor(this.phase % colors.length)],
              size: clamp(6 * this.params.objectSize, 3, 14),
              alpha: 0.9,
            });
          }
        }
      }

      const grav = 0.25 * this.params.gravity * step;
      for (const d of this.drops) {
        if (variant === "mixer" || variant === "rotating-patterns") {
          const dx = d.x - cX;
          const dy = d.y - cY;
          const dist = Math.hypot(dx, dy) + 1;
          const angle = Math.atan2(dy, dx);
          const swirl = this.params.rotationSpeed * 1.6;
          const wave = Math.sin(dist * 0.018 - this.phase * 2.2) * 1.8;
          d.vx = d.vx * 0.9 + (-Math.sin(angle) * swirl + Math.cos(angle) * wave) * 0.25;
          d.vy = d.vy * 0.9 + (Math.cos(angle) * swirl + Math.sin(angle) * wave) * 0.25;
          d.x += d.vx * step;
          d.y += d.vy * step;

          const maxR = Math.min(W, H) * 0.44;
          if (dist > maxR) {
            d.x = cX + (dx / dist) * (maxR - 2);
            d.y = cY + (dy / dist) * (maxR - 2);
          }
        } else {
          d.vy += grav;
          d.x += d.vx * step;
          d.y += d.vy * step;

          for (const s of this.shelves) {
            const sx = s.x2 - s.x1;
            const sy = s.y2 - s.y1;
            const lenSq = sx * sx + sy * sy || 1;
            const t = clamp(((d.x - s.x1) * sx + (d.y - s.y1) * sy) / lenSq, 0, 1);
            const cx = s.x1 + t * sx;
            const cy = s.y1 + t * sy;
            const dist = Math.hypot(d.x - cx, d.y - cy);
            if (dist < d.size + 4) {
              const nx = (d.x - cx) / (dist || 1);
              const ny = (d.y - cy) / (dist || 1);
              d.x = cx + nx * (d.size + 4);
              d.y = cy + ny * (d.size + 4);
              const dot = d.vx * nx + d.vy * ny;
              if (dot < 0) {
                d.vx -= 1.4 * dot * nx;
                d.vy -= 1.4 * dot * ny;
              }
            }
          }

          if (d.y > H * 0.88) {
            d.y = H * 0.88;
            d.vy = -Math.abs(d.vy) * 0.45 * this.params.bounce;
            d.vx += (Math.random() - 0.5) * 2.5;
            if (Math.random() < 0.015) {
              this.eventsCount++;
              soundEngine.playImpact(0.35, undefined, (d.x / W) * 2 - 1);
            }
          }
          if (d.x < 24 || d.x > W - 24) {
            d.x = clamp(d.x, 24, W - 24);
            d.vx *= -0.7;
          }
        }
      }
      this.activeObjects = this.drops.length;
    }

    this.progressPct = clamp(Math.round((this.elapsedSeconds / 32) * 100), 0, 100);
    if (this.elapsedSeconds >= 32) {
      this.markCompleted("Liquid Challenge Complete!", "Completed 32-second interactive fluid game.");
    }
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);
    const minDim = Math.min(W, H);
    const cX = W * 0.5;
    const cY = H * 0.5;
    const colors = this.params.colors.length ? this.params.colors : ["#00F5FF", "#FF007F", "#C4FF2E"];
    const variant = this.params.variant || "mixer";

    if (variant === "ferrofluid") {
      const dishR = minDim * 0.41;
      const magX = this.pointerDown ? this.pointerNormX * W : cX + Math.cos(this.phase * 1.35) * dishR * 0.42;
      const magY = this.pointerDown ? this.pointerNormY * H : cY + Math.sin(this.phase * 1.85) * dishR * 0.42;
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cX, cY, dishR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "#C4FF2E";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(magX, magY, minDim * 0.045, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(196, 255, 46, 0.16)";
      ctx.fill();
      ctx.restore();
    }

    if (variant === "lava-lamp") {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = 7;
      for (const g of this.gates) {
        ctx.strokeStyle = "#F43F5E";
        ctx.beginPath();
        ctx.moveTo(20, g.y);
        ctx.lineTo(Math.max(20, g.gapX - g.gapW * 0.5), g.y);
        ctx.moveTo(Math.min(W - 20, g.gapX + g.gapW * 0.5), g.y);
        ctx.lineTo(W - 20, g.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (variant === "pond-ripples") {
      // Draw 3 color fill beakers along bottom
      const bCenters = [0.22, 0.5, 0.78];
      const bw = W * 0.22;
      const bh = H * 0.12;
      const by = H * 0.78;
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const bx = W * bCenters[i] - bw * 0.5;
        const fillH = (this.bucketFills[i] / 100) * (bh - 6);
        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha = 0.72;
        ctx.fillRect(bx + 3, by + bh - 3 - fillH, bw - 6, fillH);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(bx, by, bw, bh);
      }
      ctx.restore();
    }

    if (variant === "mercury-beads") {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cX, cY, minDim * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.shelves.length) {
      ctx.save();
      ctx.strokeStyle = "#F5F5F5";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      for (const s of this.shelves) {
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    if (this.params.neonEffects && variant !== "mercury-beads") {
      ctx.globalCompositeOperation = "lighter";
    }
    for (const d of this.drops) {
      ctx.globalAlpha = d.alpha * (this.params.neonEffects && variant !== "mercury-beads" ? 0.65 : 0.92);
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
      if (variant === "mercury-beads" || variant === "lava-lamp") {
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.beginPath();
        ctx.arc(d.x - d.size * 0.28, d.y - d.size * 0.28, d.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
