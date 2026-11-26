import Matter from "matter-js";
import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, createRng, drawBackground, getPerfFactor } from "../prng";
import { SimulationParams } from "@/types/simulation";

interface BallMeta {
  body: Matter.Body;
  color: string;
  radius: number;
}

export class MatterBallPitEngine extends BaseCanvasSimulation {
  private engine: Matter.Engine | null = null;
  private balls: BallMeta[] = [];
  private paddleA: Matter.Body | null = null;
  private paddleB: Matter.Body | null = null;
  private spawnAccum = 0;
  private colorCursor = 0;
  private rng = createRng(4219);

  protected onReset(): void {
    this.cleanupMatter();
    this.rng = createRng(this.params.seed);
    this.balls = [];
    this.spawnAccum = 0;
    this.colorCursor = 0;
    this.setupWorld();
    this.statusLabel = "Matter.js 2D";
  }

  protected onResize(): void {
    this.onReset();
  }

  protected onDestroy(): void {
    this.cleanupMatter();
  }

  protected onConfigUpdated(prev: SimulationParams, curr: SimulationParams): void {
    if (prev.seed !== curr.seed || prev.gravity !== curr.gravity) {
      if (this.engine) {
        this.engine.gravity.y = 1.15 * curr.gravity;
      }
    }
  }

  private cleanupMatter() {
    if (this.engine) {
      Matter.World.clear(this.engine.world, false);
      Matter.Engine.clear(this.engine);
      this.engine = null;
    }
    this.paddleA = null;
    this.paddleB = null;
  }

  private setupWorld() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const engine = Matter.Engine.create();
    engine.gravity.y = 1.15 * this.params.gravity;
    this.engine = engine;

    const wallOpts: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      restitution: 0.9,
      friction: 0.05,
    };

    const thickness = 60;
    const left = Matter.Bodies.rectangle(16 - thickness / 2, H / 2, thickness, H * 2, wallOpts);
    const right = Matter.Bodies.rectangle(W - 16 + thickness / 2, H / 2, thickness, H * 2, wallOpts);
    const floor = Matter.Bodies.rectangle(W / 2, H - 30 + thickness / 2, W, thickness, wallOpts);

    // Two rotating churning paddles
    const paddleW = Math.min(W, H) * 0.28;
    const pA = Matter.Bodies.rectangle(W * 0.34, H * 0.56, paddleW, 18, {
      isStatic: true,
      restitution: 0.95,
    });
    const pB = Matter.Bodies.rectangle(W * 0.66, H * 0.72, paddleW, 18, {
      isStatic: true,
      restitution: 0.95,
    });
    this.paddleA = pA;
    this.paddleB = pB;

    Matter.World.add(engine.world, [left, right, floor, pA, pB]);

    // Pre-populate a small cluster
    for (let i = 0; i < 18; i++) {
      this.spawnBall(W * (0.25 + this.rng() * 0.5), H * (0.14 + this.rng() * 0.15));
    }
  }

  private spawnBall(x: number, y: number) {
    if (!this.engine) return;
    const minDim = Math.min(this.canvas.width, this.canvas.height);
    const r = clamp(minDim * (0.018 + this.rng() * 0.012) * this.params.objectSize, 9, 44);
    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#F43F5E"];
    const color = colors[this.colorCursor++ % colors.length];

    const body = Matter.Bodies.circle(x, y, r, {
      restitution: clamp(this.params.bounce, 0.3, 0.98),
      friction: clamp(this.params.friction, 0.001, 0.15),
      frictionAir: 0.004,
    });
    Matter.World.add(this.engine.world, body);
    this.balls.push({ body, color, radius: r });
    this.eventsCount++;
    if (this.eventsCount % 3 === 0) {
      soundEngine.playImpact(0.45, this.eventsCount, (x / this.canvas.width) * 2 - 1);
    }
  }

  public stepFixed(dt: number): void {
    if (!this.engine) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const perf = getPerfFactor(this.params.performance);
    const maxBalls = Math.round(clamp(this.params.objectCount * 22, 40, 220) * perf);

    const rot = dt * (this.params.rotationSpeed || 1.2) * 1.4;
    if (this.paddleA) {
      Matter.Body.setAngle(this.paddleA, this.paddleA.angle + rot);
    }
    if (this.paddleB) {
      Matter.Body.setAngle(this.paddleB, this.paddleB.angle - rot * 1.15);
    }

    this.spawnAccum += dt * (4 + this.params.speed * 4);
    if (this.spawnAccum >= 1) {
      this.spawnAccum = 0;
      if (this.balls.length >= maxBalls) {
        const oldest = this.balls.shift();
        if (oldest) Matter.World.remove(this.engine.world, oldest.body);
      }
      const dropX = W * 0.5 + Math.sin(this.elapsedSeconds * 2.1) * W * 0.25;
      this.spawnBall(dropX, H * 0.1);
    }

    Matter.Engine.update(this.engine, dt * 1000);
    this.activeObjects = this.balls.length;
    const minEvents = Math.max(80, maxBalls);
    this.progressPct = clamp(
      Math.round(Math.min(this.eventsCount / minEvents, this.elapsedSeconds / 32) * 100),
      0,
      100
    );
    if (this.eventsCount >= minEvents && this.elapsedSeconds >= 32) {
      this.markCompleted("Ball Pit Filled!", `Spawned and churned ${this.eventsCount} elastic spheres over 32s.`);
    }
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);

    // Container outline
    ctx.save();
    ctx.strokeStyle = "#29292D";
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, W - 32, H - 46);
    ctx.restore();

    // Paddles
    for (const paddle of [this.paddleA, this.paddleB]) {
      if (!paddle) continue;
      ctx.save();
      ctx.translate(paddle.position.x, paddle.position.y);
      ctx.rotate(paddle.angle);
      const pw = Math.min(W, H) * 0.28;
      ctx.fillStyle = "#F5F5F5";
      ctx.beginPath();
      ctx.roundRect(-pw / 2, -9, pw, 18, 9);
      ctx.fill();
      ctx.restore();
    }

    // Balls
    for (const b of this.balls) {
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.body.position.x, b.body.position.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
}
