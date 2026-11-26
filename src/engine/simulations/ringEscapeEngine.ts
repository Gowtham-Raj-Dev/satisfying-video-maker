import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, createRng, drawBackground, getPerfFactor } from "../prng";
import { SimulationParams } from "@/types/simulation";

interface RingSegment {
  start: number;
  end: number;
  intact: boolean;
}

interface Ring {
  radius: number;
  angle: number;
  rotDir: number;
  color: string;
  segments: RingSegment[];
  broken: boolean;
}

interface EscapeBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  trail: { x: number; y: number }[];
}

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

export class RingEscapeEngine extends BaseCanvasSimulation {
  private rings: Ring[] = [];
  private balls: EscapeBall[] = [];
  private shards: Shard[] = [];
  private ringsCleared = 0;

  protected onReset(): void {
    this.shards = [];
    this.ringsCleared = 0;
    this.initScene();
    this.statusLabel = "Active";
  }

  protected onConfigUpdated(prev: SimulationParams, curr: SimulationParams): void {
    if (
      prev.ringCount !== curr.ringCount ||
      prev.gapSize !== curr.gapSize ||
      prev.objectCount !== curr.objectCount ||
      prev.seed !== curr.seed ||
      prev.variant !== curr.variant
    ) {
      this.initScene();
    }
  }

  private initScene(): void {
    const rng = createRng(this.params.seed);
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#00F5FF", "#FF007F"];

    const ballCount = clamp(Math.round(this.params.objectCount), 1, 8);
    const ballRadius = clamp(minDim * 0.017 * this.params.objectSize, 8, 34);
    this.balls = [];
    for (let i = 0; i < ballCount; i++) {
      const a = rng() * Math.PI * 2;
      const spd = minDim * 0.0042;
      this.balls.push({
        x: W / 2 + (rng() - 0.5) * 18,
        y: H / 2 + (rng() - 0.5) * 18,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: ballRadius,
        color: colors[i % colors.length],
        trail: [],
      });
    }

    const ringCount = clamp(Math.round(this.params.ringCount), 3, 14);
    const minR = minDim * 0.11;
    const maxR = minDim * 0.43;
    const stepR = (maxR - minR) / Math.max(1, ringCount - 1);
    const gap = clamp(this.params.gapSize, 0.2, 1.8);
    const isBreakable = this.params.variant === "breakable" || this.params.variant === "hex-grid";

    this.rings = [];
    for (let i = 0; i < ringCount; i++) {
      const radius = minR + i * stepR;
      const color = colors[i % colors.length];
      const segments: RingSegment[] = [];
      if (isBreakable) {
        const segN = this.params.variant === "hex-grid" ? 12 : 18;
        const arc = (Math.PI * 2) / segN;
        for (let s = 0; s < segN; s++) {
          segments.push({ start: s * arc, end: (s + 1) * arc - 0.04, intact: true });
        }
      } else {
        segments.push({ start: gap * 0.5, end: Math.PI * 2 - gap * 0.5, intact: true });
      }
      this.rings.push({
        radius,
        angle: rng() * Math.PI * 2,
        rotDir: i % 2 === 0 ? 1 : -1,
        color,
        segments,
        broken: false,
      });
    }
    this.activeObjects = this.rings.length + this.balls.length;
  }

  public stepFixed(dt: number): void {
    const step = dt * 60;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const cX = W / 2;
    const cY = H / 2;
    const perf = getPerfFactor(this.params.performance);

    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.x += s.vx * step;
      s.y += s.vy * step;
      s.vy += 0.12 * this.params.gravity * step;
      s.alpha -= 0.025 * step;
      if (s.alpha <= 0) this.shards.splice(i, 1);
    }

    for (const ball of this.balls) {
      if (this.params.trailEffects) {
        ball.trail.push({ x: ball.x, y: ball.y });
        while (ball.trail.length > clamp(this.params.trailLength, 4, 30)) ball.trail.shift();
      } else {
        ball.trail = [];
      }
    }

    const substeps = 4;
    const subStep = step / substeps;
    const rotBase = (this.params.rotationSpeed || 0.75) * 0.014 * subStep;
    const grav = 0.125 * this.params.gravity * (minDim / 1080) * subStep;
    const thick = clamp(this.params.ringThickness, 4, 24) * (minDim / 1080);
    const maxBallSpeed = minDim * 0.017;

    for (let s = 0; s < substeps; s++) {
      for (const r of this.rings) {
        if (!r.broken) r.angle = (r.angle + rotBase * r.rotDir + Math.PI * 4) % (Math.PI * 2);
      }

      for (const ball of this.balls) {
        ball.vy += grav;
        ball.x += ball.vx * subStep;
        ball.y += ball.vy * subStep;

        const curSpd = Math.hypot(ball.vx, ball.vy);
        if (curSpd > maxBallSpeed) {
          ball.vx = (ball.vx / curSpd) * maxBallSpeed;
          ball.vy = (ball.vy / curSpd) * maxBallSpeed;
        }

        const dx = ball.x - cX;
        const dy = ball.y - cY;
        const dist = Math.hypot(dx, dy);

        for (const ring of this.rings) {
          if (ring.broken) continue;

          if (this.params.variant !== "breakable" && this.params.variant !== "hex-grid" && dist > ring.radius + ball.radius + thick) {
            ring.broken = true;
            this.ringsCleared++;
            this.eventsCount++;
            soundEngine.playImpact(1.2, this.ringsCleared + 4, (ball.x / W) * 2 - 1);
            this.spawnRingBurst(cX, cY, ring, perf);
            continue;
          }

          if (Math.abs(dist - ring.radius) < ball.radius + thick * 0.5) {
            const rawAngle = Math.atan2(dy, dx);
            const relAngle = ((rawAngle - ring.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

            for (const seg of ring.segments) {
              if (!seg.intact) continue;
              if (relAngle >= seg.start && relAngle <= seg.end) {
                const nx = (dist < ring.radius ? -dx : dx) / (dist || 1);
                const ny = (dist < ring.radius ? -dy : dy) / (dist || 1);
                const targetR =
                  dist < ring.radius
                    ? ring.radius - (ball.radius + thick * 0.5 + 1)
                    : ring.radius + (ball.radius + thick * 0.5 + 1);
                ball.x = cX + (dx / (dist || 1)) * targetR;
                ball.y = cY + (dy / (dist || 1)) * targetR;

                const dot = ball.vx * nx + ball.vy * ny;
                if (dot < 0) {
                  const el = clamp(this.params.bounce * (1 + this.params.speedIncrement / 250), 0.75, 1.04);
                  ball.vx = (ball.vx - 2 * dot * nx) * el;
                  ball.vy = (ball.vy - 2 * dot * ny) * el;
                }

                if (this.params.variant === "breakable" || this.params.variant === "hex-grid") {
                  seg.intact = false;
                  this.eventsCount++;
                  this.spawnPointShards(ball.x, ball.y, ring.color, perf);
                  if (ring.segments.every((sg) => !sg.intact)) {
                    ring.broken = true;
                    this.ringsCleared++;
                  }
                }

                soundEngine.playImpact(0.85, this.eventsCount, (ball.x / W) * 2 - 1);
                break;
              }
            }
          }
        }

        const margin = ball.radius + 16;
        if (ball.x < margin || ball.x > W - margin) {
          ball.x = clamp(ball.x, margin, W - margin);
          ball.vx *= -0.96;
          soundEngine.playClack((ball.x / W) * 2 - 1);
        }
        if (ball.y < margin) {
          ball.y = margin;
          ball.vy = Math.abs(ball.vy) * 0.94;
          soundEngine.playClack((ball.x / W) * 2 - 1);
        } else if (ball.y > H - margin) {
          ball.y = H - margin;
          // Ensure bottom floor rebounds strong enough to climb back into the concentric ring stack
          const minClimbVy = Math.min(maxBallSpeed * 0.96, Math.sqrt(2 * Math.max(0.04, 0.125 * this.params.gravity * (minDim / 1080)) * H * 0.82));
          ball.vy = -Math.max(Math.abs(ball.vy) * 1.04, minClimbVy);
          ball.vx += ((cX - ball.x) / Math.max(1, W)) * minDim * 0.0025;
          soundEngine.playClack((ball.x / W) * 2 - 1);
        }
      }
    }

    const cleared = this.rings.filter((r) => r.broken).length;
    this.progressPct = clamp(Math.round((cleared / Math.max(1, this.rings.length)) * 100), 0, 100);
    if (this.rings.every((r) => r.broken)) {
      this.markCompleted(
        "Escaped All Rings!",
        `Cleared all ${this.rings.length} concentric rings.`
      );
      return;
    }

    this.activeObjects = this.rings.filter((r) => !r.broken).length + this.shards.length;
  }

  private spawnRingBurst(cX: number, cY: number, ring: Ring, perf: number) {
    if (!this.params.particleEffects) return;
    const count = Math.round(28 * perf);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const spd = 2.5 + Math.random() * 5.5;
      this.shards.push({
        x: cX + Math.cos(a) * ring.radius,
        y: cY + Math.sin(a) * ring.radius,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: ring.color,
        size: 4 + Math.random() * 4,
        alpha: 1,
      });
    }
  }

  private spawnPointShards(x: number, y: number, color: string, perf: number) {
    if (!this.params.particleEffects) return;
    const count = Math.round(12 * perf);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 6;
      this.shards.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color,
        size: 3 + Math.random() * 4,
        alpha: 1,
      });
    }
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);
    const minDim = Math.min(W, H);
    const cX = W / 2;
    const cY = H / 2;
    const thick = clamp(this.params.ringThickness, 4, 24) * (minDim / 1080);

    // Center Rings Escaped Counter
    ctx.save();
    ctx.fillStyle = "rgba(245, 245, 245, 0.08)";
    ctx.font = `800 ${Math.round(minDim * 0.1)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${this.ringsCleared}/${this.rings.length}`, cX, cY);
    ctx.restore();

    // Draw Rings (fast double-pass neon halo)
    for (const ring of this.rings) {
      if (ring.broken) continue;
      ctx.save();
      ctx.translate(cX, cY);
      ctx.rotate(ring.angle);
      ctx.lineCap = "round";
      if (this.params.neonEffects && this.params.glowIntensity > 0.05) {
        ctx.strokeStyle = ring.color;
        ctx.globalAlpha = 0.24 * this.params.glowIntensity;
        ctx.lineWidth = thick * 1.9;
        for (const seg of ring.segments) {
          if (!seg.intact) continue;
          ctx.beginPath();
          ctx.arc(0, 0, ring.radius, seg.start, seg.end);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = thick;
      for (const seg of ring.segments) {
        if (!seg.intact) continue;
        ctx.beginPath();
        ctx.arc(0, 0, ring.radius, seg.start, seg.end);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw Shards
    for (const s of this.shards) {
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Balls
    for (const ball of this.balls) {
      if (ball.trail.length > 1) {
        ctx.save();
        for (let i = 0; i < ball.trail.length - 1; i++) {
          const p1 = ball.trail[i];
          const p2 = ball.trail[i + 1];
          const r = (i + 1) / ball.trail.length;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = ball.color;
          ctx.lineWidth = ball.radius * 1.1 * r;
          ctx.lineCap = "round";
          ctx.globalAlpha = r * 0.4;
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      if (this.params.neonEffects && this.params.glowIntensity > 0.05) {
        ctx.globalAlpha = 0.25 * this.params.glowIntensity;
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = ball.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}
