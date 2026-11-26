import Matter from "matter-js";
import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, drawBackground } from "../prng";
import { SimulationParams } from "@/types/simulation";

interface DominoMeta {
  body: Matter.Body;
  w: number;
  h: number;
  color: string;
  triggered: boolean;
  index: number;
}

export class DominoChainEngine extends BaseCanvasSimulation {
  private engine: Matter.Engine | null = null;
  private dominoes: DominoMeta[] = [];
  private balls: Matter.Body[] = [];
  private ballRadius = 16;
  private finishTimer = 0;
  private stallTimer = 0;
  private lastFallenCount = 0;

  protected onReset(): void {
    this.cleanupMatter();
    this.dominoes = [];
    this.balls = [];
    this.finishTimer = 0;
    this.stallTimer = 0;
    this.lastFallenCount = 0;
    this.buildDominoWorld();
    this.statusLabel = "Chain Ready";
  }

  protected onResize(): void {
    this.onReset();
  }

  protected onDestroy(): void {
    this.cleanupMatter();
  }

  protected onConfigUpdated(prev: SimulationParams, curr: SimulationParams): void {
    if (prev.objectCount !== curr.objectCount || prev.seed !== curr.seed || prev.gravity !== curr.gravity) {
      this.onReset();
    }
  }

  private cleanupMatter() {
    if (this.engine) {
      Matter.World.clear(this.engine.world, false);
      Matter.Engine.clear(this.engine);
      this.engine = null;
    }
    this.balls = [];
  }

  private buildDominoWorld() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const engine = Matter.Engine.create();
    engine.gravity.y =
      this.params.gravity <= 0.1 ? 0 : 1.15 * clamp(this.params.gravity, 0.25, 2.2);
    this.engine = engine;

    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#F43F5E"];
    const tiers = 3;
    const tierGap = H * 0.24;
    const startY = H * 0.25;
    const staticBodies: Matter.Body[] = [];
    this.ballRadius = clamp(minDim * 0.02, 11, 22);

    for (let t = 0; t < tiers; t++) {
      const y = startY + t * tierGap;
      const platW = W * 0.84;
      const platX = W * 0.5;
      staticBodies.push(
        Matter.Bodies.rectangle(platX, y, platW, 16, {
          isStatic: true,
          friction: 0.7,
          restitution: 0.1,
        })
      );

      const countPerTier = clamp(Math.round(this.params.objectCount * 2.2 + 8), 9, 15);
      const domH = clamp(minDim * 0.08, 34, 72);
      const domW = Math.max(8, domH * 0.2);
      const span = platW * 0.66;
      const dx = Math.min(domH * 0.54, span / Math.max(1, countPerTier - 1));
      const actualSpan = dx * (countPerTier - 1);
      const dir = t % 2 === 0 ? 1 : -1;
      const startX = dir > 0 ? platX - actualSpan * 0.5 : platX + actualSpan * 0.5;

      for (let i = 0; i < countPerTier; i++) {
        const x = startX + dir * i * dx;
        const body = Matter.Bodies.rectangle(x, y - 8 - domH / 2, domW, domH, {
          friction: 0.65,
          restitution: 0.15,
          density: 0.004,
        });
        const meta: DominoMeta = {
          body,
          w: domW,
          h: domH,
          color: colors[(t * countPerTier + i) % colors.length],
          triggered: false,
          index: t * countPerTier + i,
        };
        this.dominoes.push(meta);
        Matter.World.add(engine.world, body);
      }

      // Relay ball + ramp from end of tier t down to start of tier t+1
      if (t < tiers - 1) {
        const lastX = startX + dir * (countPerTier - 1) * dx;
        const relayX = lastX + dir * (domH * 0.56);
        const relayBall = Matter.Bodies.circle(relayX, y - 8 - this.ballRadius, this.ballRadius, {
          density: 0.015,
          restitution: 0.35,
          friction: 0.008,
          frictionAir: 0.001,
        });
        this.balls.push(relayBall);
        Matter.World.add(engine.world, relayBall);

        // Angled connecting guide ramp down to next tier start
        const nextY = startY + (t + 1) * tierGap;
        const nextStartX = relayX - dir * 52;
        const midX = (relayX + dir * 40 + nextStartX) / 2;
        const midY = (y + nextY - 58) / 2;
        const rampAngle = dir > 0 ? -0.62 : 0.62;
        staticBodies.push(
          Matter.Bodies.rectangle(relayX + dir * 56, y - 48, 18, 92, {
            isStatic: true,
          }),
          Matter.Bodies.rectangle(midX, midY, 165, 12, {
            isStatic: true,
            angle: rampAngle,
            friction: 0.008,
          })
        );
      }
    }

    // Initial trigger ball positioned on angled chute aiming cleanly at the upper half of domino #0
    const firstDom = this.dominoes[0];
    const chuteAngle = 0.46;
    const chuteCenterX = firstDom.body.position.x - 84;
    const chuteCenterY = startY - firstDom.h * 0.72 - 42;
    const chute = Matter.Bodies.rectangle(chuteCenterX, chuteCenterY, 160, 12, {
      isStatic: true,
      angle: chuteAngle,
      friction: 0.004,
      restitution: 0.15,
    });
    staticBodies.push(chute);

    const ball = Matter.Bodies.circle(chuteCenterX - 52, chuteCenterY - 40, this.ballRadius, {
      density: 0.018,
      restitution: 0.25,
      friction: 0.004,
      frictionAir: 0.001,
    });
    // Deterministic rolling nudge if gravity is low; still respects very low/paused physics so stall detector can intervene if stopped
    if (this.params.gravity >= 0.45) {
      Matter.Body.setVelocity(ball, { x: 3.8 * clamp(this.params.gravity, 0.5, 1.8), y: 1.2 });
    }
    this.balls.push(ball);

    Matter.World.add(engine.world, [...staticBodies, ball]);
    this.activeObjects = this.dominoes.length + this.balls.length;
  }

  public stepFixed(dt: number): void {
    if (!this.engine) return;
    Matter.Engine.update(this.engine, dt * 1000);

    let fallenCount = 0;
    for (const d of this.dominoes) {
      if (!d.triggered && Math.abs(d.body.angle) > 0.24) {
        d.triggered = true;
        this.eventsCount++;
        const pan = (d.body.position.x / Math.max(1, this.canvas.width)) * 2 - 1;
        soundEngine.playImpact(0.85, d.index, pan);
      }
      if (d.triggered) fallenCount++;
    }

    this.progressPct = clamp(Math.round((fallenCount / Math.max(1, this.dominoes.length)) * 100), 0, 100);
    if (fallenCount >= Math.max(1, this.dominoes.length - 1)) {
      this.stallTimer = 0;
      this.finishTimer += dt;
      if (this.finishTimer > 1.1) {
        this.markCompleted(
          "Domino Cascade Complete!",
          `Toppled ${fallenCount} of ${this.dominoes.length} dominoes across all 3 tiers.`
        );
      }
      return;
    }

    // Stall detection: if the trigger ball or relay stops without advancing the cascade, show countdown and prompt Start Again
    const anyActiveMovement = this.balls.some((b) => Math.hypot(b.velocity.x, b.velocity.y) > 0.85);
    const progressed = fallenCount > this.lastFallenCount;
    this.lastFallenCount = fallenCount;

    if (progressed || anyActiveMovement) {
      this.stallTimer = 0;
      this.statusLabel = fallenCount > 0 ? "Cascading" : "Rolling";
    } else {
      this.stallTimer += dt;
      if (this.stallTimer >= 1.0) {
        const rem = Math.max(0, 3.6 - this.stallTimer);
        this.statusLabel = `Stalled · Restart in ${rem.toFixed(1)}s`;
      }
      if (this.stallTimer >= 3.6) {
        this.stallTimer = 0;
        if (this.isExportingMode) {
          this.reset();
        } else {
          this.markCompleted(
            "Chain Stalled — Try Again!",
            `The ball stopped at ${fallenCount}/${this.dominoes.length} dominoes. Hit Start Again or tweak Gravity.`
          );
        }
      }
    }
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);
    if (!this.engine) return;

    ctx.save();
    ctx.fillStyle = "#29292D";
    for (const body of this.engine.world.bodies) {
      if (!body.isStatic) continue;
      ctx.beginPath();
      const verts = body.vertices;
      ctx.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    for (const d of this.dominoes) {
      ctx.save();
      ctx.translate(d.body.position.x, d.body.position.y);
      ctx.rotate(d.body.angle);
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.roundRect(-d.w / 2, -d.h / 2, d.w, d.h, 3);
      ctx.fill();
      ctx.restore();
    }

    for (const b of this.balls) {
      ctx.save();
      ctx.fillStyle = "#F5F5F5";
      ctx.beginPath();
      ctx.arc(b.position.x, b.position.y, this.ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Live stall countdown banner when ball stalls before cascade completes
    if (this.stallTimer >= 1.0 && !this.completion) {
      const rem = Math.max(0, 3.6 - this.stallTimer);
      ctx.save();
      const label = `BALL STALLED — RESTART PROMPT IN ${rem.toFixed(1)}s`;
      ctx.font = `700 ${Math.max(12, Math.round(W * 0.02))}px "JetBrains Mono", monospace`;
      const bw = Math.min(W * 0.85, ctx.measureText(label).width + 32);
      ctx.fillStyle = "rgba(245, 158, 11, 0.16)";
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(W * 0.5 - bw * 0.5, H * 0.17, bw, 36, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#FBBF24";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, W * 0.5, H * 0.17 + 18);
      ctx.restore();
    }
  }
}
