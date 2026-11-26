import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, createRng, drawBackground, getPerfFactor } from "../prng";
import { PointerEventData } from "../types";
import { SimulationParams } from "@/types/simulation";

interface EnergyOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  collected: boolean;
}

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  hp: number;
}

interface BreakerBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  trail: { x: number; y: number }[];
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

interface BlastHalo {
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: string;
  alpha: number;
}

interface BoidAgent {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alive: boolean;
}

interface TargetNode {
  x: number;
  y: number;
  radius: number;
  color: string;
  hp: number;
  angle: number;
}

export class ParticleWonderEngine extends BaseCanvasSimulation {
  private orbs: EnergyOrb[] = [];
  private bricks: Brick[] = [];
  private balls: BreakerBall[] = [];
  private sparks: Spark[] = [];
  private halos: BlastHalo[] = [];
  private boids: BoidAgent[] = [];
  private targets: TargetNode[] = [];

  private rng = createRng(4219);
  private phase = 0;
  private score = 0;
  private combo = 0;
  private paddleX = 0;
  private bladeAngle = 0;
  private seekerX = 0;
  private seekerY = 0;
  private seekerVx = 3.2;
  private seekerVy = 2.6;
  private autoPulseTimer = 0;
  private pointerActive = false;
  private pointerNormX = 0.5;
  private pointerNormY = 0.5;

  protected onReset(): void {
    this.rng = createRng(this.params.seed);
    this.orbs = [];
    this.bricks = [];
    this.balls = [];
    this.sparks = [];
    this.halos = [];
    this.boids = [];
    this.targets = [];
    this.phase = 0;
    this.score = 0;
    this.combo = 0;
    this.paddleX = this.canvas.width * 0.5;
    this.bladeAngle = 0;
    this.seekerX = this.canvas.width * 0.5;
    this.seekerY = this.canvas.height * 0.5;
    this.autoPulseTimer = 0;
    this.initVariant();
    this.statusLabel = "Playing";
  }

  protected onResize(): void {
    this.onReset();
  }

  protected onConfigUpdated(prev: SimulationParams, curr: SimulationParams): void {
    if (
      prev.variant !== curr.variant ||
      prev.particleCount !== curr.particleCount ||
      prev.objectCount !== curr.objectCount ||
      prev.seed !== curr.seed ||
      prev.colors !== curr.colors
    ) {
      this.onReset();
    }
  }

  public handlePointer(ev: PointerEventData): void {
    this.pointerNormX = clamp(ev.x, 0.04, 0.96);
    this.pointerNormY = clamp(ev.y, 0.04, 0.96);
    if (ev.type === "down") {
      this.pointerActive = true;
      const W = this.canvas.width;
      const H = this.canvas.height;
      const minDim = Math.min(W, H);
      const colors = this.getPalette();
      const variant = this.params.variant || "curl-flow";
      if (variant === "firefly-sync" || variant === "chladni-plate") {
        this.halos.push({
          x: this.pointerNormX * W,
          y: this.pointerNormY * H,
          r: 8,
          maxR: minDim * 0.19,
          color: colors[this.eventsCount % colors.length],
          alpha: 1,
        });
        soundEngine.playImpact(0.7, this.eventsCount % 12, this.pointerNormX * 2 - 1);
      } else if (variant === "aurora-curtain" && this.balls.length < 14) {
        this.paddleX = this.pointerNormX * W;
      }
    } else if (ev.type === "up") {
      this.pointerActive = false;
    }
  }

  private getPalette(): string[] {
    return this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#A855F7", "#F43F5E"];
  }

  private emitSparks(x: number, y: number, color: string, count = 8, spdScale = 1): void {
    if (!this.params.particleEffects) return;
    const perf = getPerfFactor(this.params.performance);
    const n = Math.max(3, Math.round(count * perf));
    if (this.sparks.length > 280 * perf) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (1.5 + Math.random() * 4.2) * spdScale;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color,
        size: 2 + Math.random() * 2.5,
        alpha: 1,
      });
    }
  }

  private initVariant(): void {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const colors = this.getPalette();
    const perf = getPerfFactor(this.params.performance);
    const variant = this.params.variant || "curl-flow";

    if (variant === "aurora-curtain") {
      // Neon Particle Brick Breaker Game
      this.spawnBrickGrid(W, H, colors);
      const ballCount = clamp(Math.round(this.params.objectCount), 1, 5);
      for (let i = 0; i < ballCount; i++) {
        const angle = -Math.PI * 0.5 + (i - (ballCount - 1) * 0.5) * 0.35 + (this.rng() - 0.5) * 0.2;
        const spd = minDim * 0.0088;
        this.balls.push({
          x: W * 0.5 + (i - 0.5) * 18,
          y: H * 0.78,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          radius: clamp(minDim * 0.015 * this.params.objectSize, 7, 20),
          color: colors[i % colors.length],
          trail: [],
        });
      }
      this.activeObjects = this.bricks.length + this.balls.length;
    } else if (variant === "chladni-plate") {
      // Wave Shockwave Crystal Shatter Game
      const orbN = clamp(Math.round(this.params.particleCount * 0.25), 40, 120);
      for (let i = 0; i < orbN; i++) {
        const a = this.rng() * Math.PI * 2;
        const spd = minDim * 0.0036;
        this.orbs.push({
          x: W * (0.14 + this.rng() * 0.72),
          y: H * (0.14 + this.rng() * 0.72),
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          radius: clamp(minDim * 0.007 * this.params.objectSize, 3.5, 9),
          color: colors[i % colors.length],
          collected: false,
        });
      }
      this.spawnTargetRing(W, H, minDim, colors, 14);
      this.activeObjects = this.targets.length + this.orbs.length;
    } else if (variant === "boids-flock") {
      // Swarm Dodge vs Hunter Seekers
      const n = Math.round(clamp(this.params.particleCount * 0.35, 65, 190) * perf);
      for (let i = 0; i < n; i++) {
        const a = this.rng() * Math.PI * 2;
        const spd = minDim * 0.0046;
        this.boids.push({
          x: W * (0.15 + this.rng() * 0.7),
          y: H * (0.15 + this.rng() * 0.7),
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          color: colors[i % colors.length],
          size: clamp(minDim * 0.0075 * this.params.objectSize, 3.5, 11),
          alive: true,
        });
      }
      const seekerN = clamp(Math.round(this.params.objectCount) + 1, 2, 5);
      for (let s = 0; s < seekerN; s++) {
        const a = (s / seekerN) * Math.PI * 2;
        this.targets.push({
          x: W * 0.5 + Math.cos(a) * minDim * 0.25,
          y: H * 0.5 + Math.sin(a) * minDim * 0.25,
          radius: clamp(minDim * 0.024, 12, 30),
          color: "#F43F5E",
          hp: 99,
          angle: a,
        });
      }
      this.activeObjects = this.boids.length + this.targets.length;
    } else if (variant === "firefly-sync") {
      // Chain Reaction Halo Bomb Pop Game
      this.spawnFireflyWave(W, H, minDim, colors, perf);
      this.halos.push({
        x: W * 0.5,
        y: H * 0.5,
        r: 12,
        maxR: minDim * 0.2,
        color: colors[0],
        alpha: 0.95,
      });
      this.activeObjects = this.orbs.length;
    } else if (variant === "prism-kaleidoscope") {
      // Prism Core Slicer Game
      this.spawnTargetRing(W, H, minDim, colors, 12);
      const bladeBalls = clamp(Math.round(this.params.objectCount), 1, 4);
      for (let i = 0; i < bladeBalls; i++) {
        const a = (i / bladeBalls) * Math.PI * 2 + 0.4;
        const spd = minDim * 0.0085;
        this.balls.push({
          x: W * 0.5,
          y: H * 0.5,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          radius: clamp(minDim * 0.017 * this.params.objectSize, 8, 22),
          color: "#FFFFFF",
          trail: [],
        });
      }
      this.activeObjects = this.targets.length + this.balls.length;
    } else {
      // curl-flow: Vortex Black-Hole Particle Collector Game
      const n = Math.round(clamp(this.params.particleCount * 0.45, 75, 220) * perf);
      for (let i = 0; i < n; i++) {
        const a = this.rng() * Math.PI * 2;
        const r = minDim * (0.08 + this.rng() * 0.36);
        this.orbs.push({
          x: W * 0.5 + Math.cos(a) * r,
          y: H * 0.5 + Math.sin(a) * r,
          vx: -Math.sin(a) * 1.4,
          vy: Math.cos(a) * 1.4,
          radius: clamp(minDim * (0.007 + this.rng() * 0.006) * this.params.objectSize, 4, 13),
          color: colors[i % colors.length],
          collected: false,
        });
      }
      this.seekerX = W * 0.5;
      this.seekerY = H * 0.5;
      this.activeObjects = this.orbs.length;
    }
  }

  private spawnBrickGrid(W: number, H: number, colors: string[]): void {
    this.bricks = [];
    const cols = W > H ? 9 : 7;
    const rows = W > H ? 5 : 6;
    const padX = W * 0.08;
    const gap = 8;
    const bw = (W - padX * 2 - gap * (cols - 1)) / cols;
    const bh = clamp(H * 0.032, 18, 34);
    const startY = H * 0.14;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.bricks.push({
          x: padX + c * (bw + gap),
          y: startY + r * (bh + gap),
          w: bw,
          h: bh,
          color: colors[(r + c) % colors.length],
          hp: r === 0 ? 2 : 1,
        });
      }
    }
  }

  private spawnTargetRing(W: number, H: number, minDim: number, colors: string[], count: number): void {
    this.targets = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const ring = i % 2 === 0 ? 0.3 : 0.19;
      this.targets.push({
        x: W * 0.5 + Math.cos(a) * minDim * ring,
        y: H * 0.5 + Math.sin(a) * minDim * ring,
        radius: clamp(minDim * 0.032 * this.params.objectSize, 14, 42),
        color: colors[i % colors.length],
        hp: 2,
        angle: a,
      });
    }
  }

  private spawnFireflyWave(W: number, H: number, minDim: number, colors: string[], perf: number): void {
    this.orbs = [];
    const n = Math.round(clamp(this.params.particleCount * 0.16, 28, 76) * perf);
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const spd = minDim * 0.0028 * (0.7 + this.rng() * 0.7);
      this.orbs.push({
        x: W * (0.1 + this.rng() * 0.8),
        y: H * (0.12 + this.rng() * 0.76),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: clamp(minDim * 0.015 * this.params.objectSize, 7, 22),
        color: colors[i % colors.length],
        collected: false,
      });
    }
  }

  public stepFixed(dt: number): void {
    const step = dt * 60;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const perf = getPerfFactor(this.params.performance);
    const colors = this.getPalette();
    const variant = this.params.variant || "curl-flow";

    this.phase += dt * clamp(this.params.speed, 0.4, 2.2);

    // Update shared sparks & expanding blast halos
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.vx * step;
      sp.y += sp.vy * step;
      sp.vx *= 0.96;
      sp.vy *= 0.96;
      sp.alpha -= 0.028 * step;
      if (sp.alpha <= 0) this.sparks.splice(i, 1);
    }

    for (let i = this.halos.length - 1; i >= 0; i--) {
      const h = this.halos[i];
      h.r += (h.maxR - h.r) * 0.11 * step + 1.2 * step;
      h.alpha -= 0.017 * step;
      if (h.alpha <= 0) this.halos.splice(i, 1);
    }

    if (variant === "aurora-curtain") {
      this.stepBrickBreaker(step, W, H, minDim, colors);
    } else if (variant === "chladni-plate") {
      this.stepCrystalShockwave(dt, step, W, H, minDim, colors);
    } else if (variant === "boids-flock") {
      this.stepSwarmDodge(step, W, H, minDim, colors);
    } else if (variant === "firefly-sync") {
      this.stepChainPop(dt, step, W, H, minDim, colors, perf);
    } else if (variant === "prism-kaleidoscope") {
      this.stepPrismSlicer(step, W, H, minDim, colors);
    } else {
      this.stepVortexHarvest(step, W, H, minDim, colors);
    }

    this.progressPct = clamp(Math.round((this.elapsedSeconds / 34) * 100), 0, 100);
    if (this.elapsedSeconds >= 34) {
      this.markCompleted(`Score ${this.score} · Game Complete!`, "Completed 34-second playable particle challenge.");
    }
  }

  private stepVortexHarvest(step: number, W: number, H: number, minDim: number, colors: string[]): void {
    // Steer vortex toward user pointer or smoothly hunt densest cluster
    let targetX = W * 0.5 + Math.cos(this.phase * 1.45) * (W * 0.28);
    let targetY = H * 0.5 + Math.sin(this.phase * 2.15) * (H * 0.26);
    if (this.pointerActive) {
      targetX = this.pointerNormX * W;
      targetY = this.pointerNormY * H;
    } else if (this.orbs.length > 0) {
      const targetOrb = this.orbs[0];
      targetX = targetX * 0.4 + targetOrb.x * 0.6;
      targetY = targetY * 0.4 + targetOrb.y * 0.6;
    }
    this.seekerX += (targetX - this.seekerX) * Math.min(1, 0.1 * step);
    this.seekerY += (targetY - this.seekerY) * Math.min(1, 0.1 * step);

    const pullR = minDim * 0.25;
    const eatR = minDim * 0.044 * clamp(this.params.objectSize, 0.7, 1.5);

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      const dx = this.seekerX - o.x;
      const dy = this.seekerY - o.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < pullR) {
        // Orbit + pull strongly into collector vortex
        const pull = (1 - d / pullR) * 0.42;
        o.vx += ((dx / d) * pull - (dy / d) * pull * 0.45) * step;
        o.vy += ((dy / d) * pull + (dx / d) * pull * 0.45) * step;
      } else {
        o.vx += Math.sin(this.phase + o.y * 0.01) * 0.04 * step;
        o.vy += Math.cos(this.phase + o.x * 0.01) * 0.04 * step;
      }
      o.vx *= 0.96;
      o.vy *= 0.96;
      o.x += o.vx * step;
      o.y += o.vy * step;

      if (o.x < 24 || o.x > W - 24) o.vx *= -0.85;
      if (o.y < 24 || o.y > H - 24) o.vy *= -0.85;

      if (d < eatR) {
        this.score += 10;
        this.eventsCount++;
        this.emitSparks(o.x, o.y, o.color, 6, 0.9);
        soundEngine.playImpact(0.5, this.eventsCount % 14, (o.x / W) * 2 - 1);
        // Respawn outward to keep gameplay flowing
        const a = Math.random() * Math.PI * 2;
        const r = minDim * 0.36;
        o.x = clamp(W * 0.5 + Math.cos(a) * r, 32, W - 32);
        o.y = clamp(H * 0.5 + Math.sin(a) * r, 32, H - 32);
        o.vx = -Math.sin(a) * 1.5;
        o.vy = Math.cos(a) * 1.5;
        o.color = colors[this.eventsCount % colors.length];
      }
    }
    this.activeObjects = this.orbs.length;
    this.statusLabel = `Collected: ${this.eventsCount}`;
  }

  private stepBrickBreaker(step: number, W: number, H: number, minDim: number, colors: string[]): void {
    const padW = clamp(minDim * 0.22 * this.params.objectSize, 74, 210);
    const padY = H * 0.86;
    const padH = 14;

    if (this.pointerActive) {
      this.paddleX += (this.pointerNormX * W - this.paddleX) * Math.min(1, 0.35 * step);
    } else if (this.balls.length > 0) {
      // Smart AI tracks lowest falling ball smoothly so it never loses loop momentum
      let lowest = this.balls[0];
      for (const b of this.balls) {
        if (b.y > lowest.y) lowest = b;
      }
      this.paddleX += (lowest.x - this.paddleX) * Math.min(1, 0.16 * step);
    }
    this.paddleX = clamp(this.paddleX, padW * 0.5 + 16, W - padW * 0.5 - 16);

    const maxSpd = minDim * 0.0145 * clamp(this.params.speed, 0.5, 2.2);
    for (const ball of this.balls) {
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 12) ball.trail.shift();

      ball.x += ball.vx * step;
      ball.y += ball.vy * step;

      if (ball.x < ball.radius + 14) {
        ball.x = ball.radius + 14;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x > W - ball.radius - 14) {
        ball.x = W - ball.radius - 14;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y < ball.radius + 14) {
        ball.y = ball.radius + 14;
        ball.vy = Math.abs(ball.vy);
        soundEngine.playClack((ball.x / W) * 2 - 1);
      }

      // Paddle collision
      if (
        ball.vy > 0 &&
        ball.y + ball.radius >= padY - padH * 0.5 &&
        ball.y - ball.radius <= padY + padH * 0.5 &&
        Math.abs(ball.x - this.paddleX) <= padW * 0.5 + ball.radius
      ) {
        const hitRatio = clamp((ball.x - this.paddleX) / (padW * 0.5), -0.92, 0.92);
        const curS = Math.min(maxSpd, Math.max(minDim * 0.008, Math.hypot(ball.vx, ball.vy) * 1.015));
        const ang = -Math.PI * 0.5 + hitRatio * 1.05;
        ball.vx = Math.cos(ang) * curS;
        ball.vy = Math.sin(ang) * curS;
        ball.y = padY - padH * 0.5 - ball.radius - 1;
        this.combo = 0;
        soundEngine.playImpact(0.6, 2, hitRatio);
      }

      // Bottom safety rebound so rallies never stall
      if (ball.y > H - ball.radius - 12) {
        ball.y = padY - padH * 0.5 - ball.radius - 2;
        ball.vy = -Math.abs(ball.vy);
      }

      // Bricks collision
      for (let bi = this.bricks.length - 1; bi >= 0; bi--) {
        const br = this.bricks[bi];
        const nearX = clamp(ball.x, br.x, br.x + br.w);
        const nearY = clamp(ball.y, br.y, br.y + br.h);
        const dx = ball.x - nearX;
        const dy = ball.y - nearY;
        if (dx * dx + dy * dy <= ball.radius * ball.radius) {
          if (Math.abs(dx) > Math.abs(dy)) ball.vx *= -1;
          else ball.vy *= -1;
          br.hp--;
          this.combo++;
          this.score += 25;
          this.eventsCount++;
          this.emitSparks(nearX, nearY, br.color, 9, 1.15);
          soundEngine.playImpact(0.75, this.combo % 14, (nearX / W) * 2 - 1);
          if (br.hp <= 0) {
            this.bricks.splice(bi, 1);
            if (this.bricks.length % 10 === 0 && this.balls.length < 6) {
              this.balls.push({
                x: nearX,
                y: nearY,
                vx: (Math.random() - 0.5) * minDim * 0.012,
                vy: -minDim * 0.009,
                radius: ball.radius,
                color: br.color,
                trail: [],
              });
            }
          }
          break;
        }
      }
    }

    if (this.bricks.length === 0) {
      this.spawnBrickGrid(W, H, colors);
      this.score += 200;
      soundEngine.playImpact(1.2, 10, 0);
    }
    this.activeObjects = this.bricks.length + this.balls.length;
    this.statusLabel = `Bricks: ${this.bricks.length} · Pts: ${this.score}`;
  }

  private stepCrystalShockwave(dt: number, step: number, W: number, H: number, minDim: number, colors: string[]): void {
    this.autoPulseTimer += dt;
    if (this.autoPulseTimer >= 1.8) {
      this.autoPulseTimer = 0;
      const t = this.targets[this.eventsCount % Math.max(1, this.targets.length)];
      if (t) {
        this.halos.push({
          x: W * 0.5 + (Math.random() - 0.5) * minDim * 0.25,
          y: H * 0.5 + (Math.random() - 0.5) * minDim * 0.25,
          r: 10,
          maxR: minDim * 0.24,
          color: colors[this.eventsCount % colors.length],
          alpha: 0.9,
        });
      }
    }

    // Rotate crystal ring smoothly
    for (let i = 0; i < this.targets.length; i++) {
      const t = this.targets[i];
      t.angle += 0.008 * step * (i % 2 === 0 ? 1 : -1);
      const ring = i % 2 === 0 ? 0.3 : 0.19;
      t.x = W * 0.5 + Math.cos(t.angle) * minDim * ring;
      t.y = H * 0.5 + Math.sin(t.angle) * minDim * ring;
    }

    for (const o of this.orbs) {
      for (const h of this.halos) {
        const dx = o.x - h.x;
        const dy = o.y - h.y;
        const d = Math.hypot(dx, dy) || 1;
        if (Math.abs(d - h.r) < 28) {
          o.vx += (dx / d) * 0.9 * step;
          o.vy += (dy / d) * 0.9 * step;
        }
      }
      o.x += o.vx * step;
      o.y += o.vy * step;
      const maxS = minDim * 0.011;
      const sp = Math.hypot(o.vx, o.vy);
      if (sp > maxS) {
        o.vx = (o.vx / sp) * maxS;
        o.vy = (o.vy / sp) * maxS;
      }
      if (o.x < 20 || o.x > W - 20) o.vx *= -0.92;
      if (o.y < 20 || o.y > H - 20) o.vy *= -0.92;
      o.x = clamp(o.x, 20, W - 20);
      o.y = clamp(o.y, 20, H - 20);

      for (let ti = this.targets.length - 1; ti >= 0; ti--) {
        const t = this.targets[ti];
        const dx = o.x - t.x;
        const dy = o.y - t.y;
        const dist = Math.hypot(dx, dy);
        if (dist < o.radius + t.radius) {
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          o.vx = nx * minDim * 0.006;
          o.vy = ny * minDim * 0.006;
          t.hp--;
          this.score += 15;
          this.eventsCount++;
          this.emitSparks(t.x, t.y, t.color, 6, 1.0);
          soundEngine.playImpact(0.65, this.eventsCount % 14, (t.x / W) * 2 - 1);
          if (t.hp <= 0) {
            this.halos.push({ x: t.x, y: t.y, r: t.radius, maxR: minDim * 0.16, color: t.color, alpha: 0.85 });
            this.targets.splice(ti, 1);
          }
          break;
        }
      }
    }

    if (this.targets.length === 0) {
      this.spawnTargetRing(W, H, minDim, colors, 14);
      this.score += 200;
    }
    this.activeObjects = this.targets.length + this.orbs.length;
    this.statusLabel = `Crystals: ${this.targets.length} · Pts: ${this.score}`;
  }

  private stepSwarmDodge(step: number, W: number, H: number, minDim: number, colors: string[]): void {
    const safeX = this.pointerActive ? this.pointerNormX * W : W * 0.5 + Math.sin(this.phase * 1.1) * W * 0.22;
    const safeY = this.pointerActive ? this.pointerNormY * H : H * 0.5 + Math.cos(this.phase * 1.4) * H * 0.22;

    // Move hunter seekers smoothly across arena
    for (let s = 0; s < this.targets.length; s++) {
      const sk = this.targets[s];
      sk.angle += 0.025 * step;
      const nearest = this.boids[s % Math.max(1, this.boids.length)];
      if (nearest) {
        const dx = nearest.x - sk.x;
        const dy = nearest.y - sk.y;
        const d = Math.hypot(dx, dy) || 1;
        sk.x += (dx / d) * minDim * 0.0046 * step;
        sk.y += (dy / d) * minDim * 0.0046 * step;
      }
      // Bounce hunters away from user's Repulsor Shield
      const sdx = sk.x - safeX;
      const sdy = sk.y - safeY;
      const sd = Math.hypot(sdx, sdy) || 1;
      if (sd < minDim * 0.11) {
        sk.x = safeX + (sdx / sd) * minDim * 0.11;
        sk.y = safeY + (sdy / sd) * minDim * 0.11;
      }
    }

    const maxSpd = minDim * 0.0072 * clamp(this.params.speed, 0.4, 2);
    for (const b of this.boids) {
      // Seek safe shield lightly & dodge hunters strongly
      b.vx += ((safeX - b.x) * 0.00055) * step;
      b.vy += ((safeY - b.y) * 0.00055) * step;
      for (const sk of this.targets) {
        const dx = b.x - sk.x;
        const dy = b.y - sk.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < sk.radius + b.size) {
          this.eventsCount++;
          this.emitSparks(b.x, b.y, b.color, 6, 1.0);
          soundEngine.playImpact(0.45, this.eventsCount % 12, (b.x / W) * 2 - 1);
          b.x = clamp(safeX + (Math.random() - 0.5) * 60, 30, W - 30);
          b.y = clamp(safeY + (Math.random() - 0.5) * 60, 30, H - 30);
          b.color = colors[this.eventsCount % colors.length];
        } else if (d < minDim * 0.16) {
          b.vx += (dx / d) * 0.45 * step;
          b.vy += (dy / d) * 0.45 * step;
        }
      }
      const sp = Math.hypot(b.vx, b.vy) || 1;
      b.vx = (b.vx / sp) * clamp(sp, maxSpd * 0.45, maxSpd);
      b.vy = (b.vy / sp) * clamp(sp, maxSpd * 0.45, maxSpd);
      b.x += b.vx * step;
      b.y += b.vy * step;
      if (b.x < 20 || b.x > W - 20) b.vx *= -1;
      if (b.y < 20 || b.y > H - 20) b.vy *= -1;
    }
    this.score = Math.floor(this.elapsedSeconds * 25);
    this.activeObjects = this.boids.length + this.targets.length;
    this.statusLabel = `Catches: ${this.eventsCount}`;
  }

  private stepChainPop(dt: number, step: number, W: number, H: number, minDim: number, colors: string[], perf: number): void {
    this.autoPulseTimer += dt;
    if (this.halos.length === 0 && this.autoPulseTimer >= 0.7) {
      this.autoPulseTimer = 0;
      const target = this.orbs[0];
      const tx = target ? target.x : W * 0.5;
      const ty = target ? target.y : H * 0.5;
      this.halos.push({
        x: tx,
        y: ty,
        r: 10,
        maxR: minDim * 0.21,
        color: colors[this.eventsCount % colors.length],
        alpha: 1,
      });
      this.combo = 0;
    }

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.x += o.vx * step;
      o.y += o.vy * step;
      if (o.x < o.radius + 16 || o.x > W - o.radius - 16) o.vx *= -1;
      if (o.y < o.radius + 16 || o.y > H - o.radius - 16) o.vy *= -1;

      for (const h of this.halos) {
        if (Math.hypot(o.x - h.x, o.y - h.y) <= h.r + o.radius) {
          this.combo++;
          this.score += 10 * Math.min(8, this.combo);
          this.eventsCount++;
          this.emitSparks(o.x, o.y, o.color, 7, 1.0);
          if (this.halos.length < 36) {
            this.halos.push({
              x: o.x,
              y: o.y,
              r: o.radius,
              maxR: minDim * 0.16,
              color: o.color,
              alpha: 0.92,
            });
          }
          soundEngine.playImpact(0.65, this.combo % 15, (o.x / W) * 2 - 1);
          this.orbs.splice(i, 1);
          break;
        }
      }
    }

    if (this.orbs.length === 0 && this.halos.length === 0) {
      this.spawnFireflyWave(W, H, minDim, colors, perf);
    }
    this.activeObjects = this.orbs.length + this.halos.length;
    this.statusLabel = `Chain Pop · ${this.score} pts`;
  }

  private stepPrismSlicer(step: number, W: number, H: number, minDim: number, colors: string[]): void {
    this.bladeAngle += 0.045 * step * clamp(this.params.rotationSpeed || 1, -2.5, 2.5);
    const bladeLen = minDim * 0.34;
    const bx1 = W * 0.5 + Math.cos(this.bladeAngle) * bladeLen;
    const by1 = H * 0.5 + Math.sin(this.bladeAngle) * bladeLen;
    const bx2 = W * 0.5 - Math.cos(this.bladeAngle) * bladeLen;
    const by2 = H * 0.5 - Math.sin(this.bladeAngle) * bladeLen;

    for (const b of this.balls) {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 10) b.trail.shift();
      b.x += b.vx * step;
      b.y += b.vy * step;
      const dxC = b.x - W * 0.5;
      const dyC = b.y - H * 0.5;
      const dist = Math.hypot(dxC, dyC) || 1;
      const maxR = minDim * 0.41;
      if (dist + b.radius >= maxR) {
        const nx = -dxC / dist;
        const ny = -dyC / dist;
        b.x = W * 0.5 - nx * (maxR - b.radius - 1);
        b.y = H * 0.5 - ny * (maxR - b.radius - 1);
        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
          b.vx -= 2 * dot * nx;
          b.vy -= 2 * dot * ny;
        }
      }

      for (let ti = this.targets.length - 1; ti >= 0; ti--) {
        const t = this.targets[ti];
        if (Math.hypot(b.x - t.x, b.y - t.y) < b.radius + t.radius) {
          this.score += 20;
          this.eventsCount++;
          this.emitSparks(t.x, t.y, t.color, 10, 1.15);
          soundEngine.playImpact(0.75, this.eventsCount % 14, (t.x / W) * 2 - 1);
          this.targets.splice(ti, 1);
        }
      }
    }

    // Rotating center blade also slices prisms on contact
    for (let ti = this.targets.length - 1; ti >= 0; ti--) {
      const t = this.targets[ti];
      t.angle += 0.015 * step;
      const dx = bx2 - bx1;
      const dy = by2 - by1;
      const lenSq = dx * dx + dy * dy || 1;
      const u = clamp(((t.x - bx1) * dx + (t.y - by1) * dy) / lenSq, 0, 1);
      const cx = bx1 + u * dx;
      const cy = by1 + u * dy;
      if (Math.hypot(t.x - cx, t.y - cy) < t.radius + 5) {
        this.score += 15;
        this.eventsCount++;
        this.emitSparks(t.x, t.y, t.color, 8, 1.0);
        soundEngine.playImpact(0.6, this.eventsCount % 12, (t.x / W) * 2 - 1);
        this.targets.splice(ti, 1);
      }
    }

    if (this.targets.length < 4) {
      this.spawnTargetRing(W, H, minDim, colors, 12);
    }
    this.activeObjects = this.targets.length + this.balls.length;
    this.statusLabel = `Sliced: ${this.eventsCount}`;
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);
    const minDim = Math.min(W, H);
    const variant = this.params.variant || "curl-flow";

    // Draw expanding halos
    for (const h of this.halos) {
      ctx.save();
      ctx.globalAlpha = h.alpha;
      ctx.strokeStyle = h.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = h.color;
      ctx.globalAlpha = h.alpha * 0.14;
      ctx.fill();
      ctx.restore();
    }

    if (variant === "aurora-curtain") {
      // Bricks + Paddle
      for (const br of this.bricks) {
        ctx.save();
        ctx.fillStyle = br.color;
        ctx.beginPath();
        ctx.roundRect(br.x, br.y, br.w, br.h, 5);
        ctx.fill();
        if (br.hp > 1) {
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      }
      const padW = clamp(minDim * 0.22 * this.params.objectSize, 74, 210);
      ctx.save();
      ctx.fillStyle = "#C4FF2E";
      ctx.beginPath();
      ctx.roundRect(this.paddleX - padW * 0.5, H * 0.86 - 7, padW, 14, 7);
      ctx.fill();
      ctx.restore();
    }

    if (variant === "prism-kaleidoscope") {
      const bladeLen = minDim * 0.34;
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(W * 0.5, H * 0.5, minDim * 0.41, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "#C4FF2E";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(W * 0.5 + Math.cos(this.bladeAngle) * bladeLen, H * 0.5 + Math.sin(this.bladeAngle) * bladeLen);
      ctx.lineTo(W * 0.5 - Math.cos(this.bladeAngle) * bladeLen, H * 0.5 - Math.sin(this.bladeAngle) * bladeLen);
      ctx.stroke();
      ctx.restore();
    }

    if (variant === "curl-flow") {
      // Black hole vortex collector
      const eatR = minDim * 0.044 * clamp(this.params.objectSize, 0.7, 1.5);
      ctx.save();
      ctx.strokeStyle = "#C4FF2E";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.seekerX, this.seekerY, eatR, 0, Math.PI * 2);
      ctx.fillStyle = "#0B0B0C";
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(this.seekerX, this.seekerY, minDim * 0.14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Orbs
    for (const o of this.orbs) {
      ctx.save();
      ctx.fillStyle = o.color;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Boids (swarm dodge)
    if (variant === "boids-flock") {
      const safeX = this.pointerActive ? this.pointerNormX * W : W * 0.5 + Math.sin(this.phase * 1.1) * W * 0.22;
      const safeY = this.pointerActive ? this.pointerNormY * H : H * 0.5 + Math.cos(this.phase * 1.4) * H * 0.22;
      ctx.save();
      ctx.strokeStyle = "#38BDF8";
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(safeX, safeY, minDim * 0.11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      for (const b of this.boids) {
        const angle = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.translate(b.x, b.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(b.size * 1.35, 0);
        ctx.lineTo(-b.size, -b.size * 0.65);
        ctx.lineTo(-b.size, b.size * 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Targets / Hunters
    for (const t of this.targets) {
      ctx.save();
      ctx.fillStyle = t.color;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Breaker/Slicer Balls + trails
    for (const ball of this.balls) {
      if (ball.trail.length > 1) {
        ctx.save();
        ctx.strokeStyle = ball.color;
        ctx.lineWidth = ball.radius * 0.7;
        ctx.lineCap = "round";
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(ball.trail[0].x, ball.trail[0].y);
        for (let k = 1; k < ball.trail.length; k++) ctx.lineTo(ball.trail[k].x, ball.trail[k].y);
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Sparks
    for (const sp of this.sparks) {
      ctx.save();
      ctx.globalAlpha = sp.alpha;
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
