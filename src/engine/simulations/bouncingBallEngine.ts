import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, createRng, drawBackground, getPerfFactor } from "../prng";
import { SimulationParams } from "@/types/simulation";

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  targetRadius: number;
  color: string;
  colorIndex: number;
  unified: boolean;
  bounces: number;
  splitCooldown: number;
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

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface LayoutPeg {
  x: number;
  y: number;
  r: number;
  isCore?: boolean;
}

interface LayoutBar {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isPortal?: boolean;
}

const PERIMETER_SEGS = 36;

export class BouncingBallEngine extends BaseCanvasSimulation {
  private balls: Ball[] = [];
  private particles: Spark[] = [];
  private ripples: Ripple[] = [];
  private angle = 0;
  private gravitySign = 1;
  private gravityTimer = 0;
  private pulsePhase = 0;
  private wallSegmentsBroken = new Set<number>();
  private wallPainted = new Set<number>();
  private unifiedFinishTimer = 0;
  private spawnGateTimer = 0;

  protected onReset(): void {
    this.particles = [];
    this.ripples = [];
    this.angle = 0;
    this.gravitySign = 1;
    this.gravityTimer = 0;
    this.pulsePhase = 0;
    this.wallSegmentsBroken.clear();
    this.wallPainted.clear();
    this.unifiedFinishTimer = 0;
    this.spawnGateTimer = 0;
    this.initBalls();
    this.statusLabel = "Active";
  }

  protected onConfigUpdated(prev: SimulationParams, curr: SimulationParams): void {
    if (
      prev.objectCount !== curr.objectCount ||
      prev.seed !== curr.seed ||
      prev.variant !== curr.variant ||
      prev.containerShape !== curr.containerShape ||
      prev.multiplyMode !== curr.multiplyMode ||
      prev.arenaLayout !== curr.arenaLayout
    ) {
      this.wallPainted.clear();
      this.unifiedFinishTimer = 0;
      this.spawnGateTimer = 0;
      this.initBalls();
    } else {
      this.rescaleBallRadii(curr);
    }
  }

  private getUnifiedColor(curr: SimulationParams = this.params): string {
    return curr.colors[0] || "#C4FF2E";
  }

  private getMaxFillRadius(minDim: number, shape: SimulationParams["containerShape"]): number {
    const outerR = minDim * 0.41;
    if (shape === "star") return outerR * 0.48;
    if (shape === "triangle") return outerR * 0.44;
    if (shape === "hexagon") return outerR * 0.78;
    if (shape === "octagon") return outerR * 0.84;
    return outerR * 0.91;
  }

  private getTargetMaxBalls(curr: SimulationParams = this.params): number {
    return clamp(curr.maxMultiplyBalls || 64, 16, 120);
  }

  private computeTargetRadius(curr: SimulationParams = this.params): number {
    const minDim = Math.min(this.canvas.width, this.canvas.height);
    const maxAllow = curr.containerShape === "star" ? minDim * 0.042 : minDim * 0.065;
    const baseR = clamp(minDim * 0.028 * curr.objectSize, 9, maxAllow);

    if (curr.multiplyMode !== "none") {
      const count = Math.max(1, this.balls.length);
      const maxChamberR = this.getMaxFillRadius(minDim, curr.containerShape);
      const packR = (maxChamberR * 0.86) / Math.sqrt(Math.max(1, count * 0.78));
      return clamp(Math.min(baseR * Math.pow(count, -0.14), packR), minDim * 0.014, maxAllow * 1.4);
    }

    return baseR;
  }

  private rescaleBallRadii(curr: SimulationParams = this.params) {
    const colors = curr.colors.length ? curr.colors : ["#C4FF2E", "#00F5FF", "#FF007F"];
    const unified = this.getUnifiedColor(curr);
    const r = this.computeTargetRadius(curr);
    for (let i = 0; i < this.balls.length; i++) {
      const b = this.balls[i];
      b.targetRadius = r;
      if (curr.multiplyMode === "none") {
        b.radius = r;
      }
      if (b.unified || (curr.objectCount === 1 && curr.multiplyMode === "none" && i === 0)) {
        b.color = unified;
      } else {
        b.color = colors[b.colorIndex % colors.length] || unified;
      }
    }
  }

  private initBalls(): void {
    this.balls = [];
    const rng = createRng(this.params.seed);
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cX = W / 2;
    const cY = H / 2;
    const minDim = Math.min(W, H);
    const count = clamp(Math.round(this.params.objectCount), 1, 24);
    const baseRadius = this.computeTargetRadius(this.params);
    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#00F5FF", "#FF007F"];
    const unified = this.getUnifiedColor(this.params);

    const safeSpawnSpan = this.params.containerShape === "star" ? minDim * 0.075 : minDim * 0.14;
    const initSpeed = minDim * 0.0095;
    const layoutOffsetX =
      this.params.arenaLayout === "center-bumper" || this.params.arenaLayout === "split-gate"
        ? minDim * 0.11
        : 0;

    for (let i = 0; i < count; i++) {
      const theta = (i / Math.max(1, count)) * Math.PI * 2 + rng() * 0.35;
      const dist = count === 1 ? 0 : Math.min(safeSpawnSpan, (i + 1) * baseRadius * 0.72);
      const colorIndex = i % colors.length;
      const signX = i % 2 === 0 ? 1 : -1;
      const launchAngle = (0.28 + rng() * 0.45) * Math.PI * signX;
      const startsUnified = i === 0 && count === 1 && this.params.multiplyMode === "none";
      this.balls.push({
        x: cX + signX * layoutOffsetX + Math.cos(theta) * dist,
        y: cY + Math.sin(theta) * dist - (count === 1 ? minDim * 0.04 : 0),
        vx: Math.sin(launchAngle) * initSpeed + (rng() - 0.5) * initSpeed * 0.3,
        vy: -Math.abs(Math.cos(launchAngle) * initSpeed) - initSpeed * 0.25,
        radius: baseRadius,
        targetRadius: baseRadius,
        color: startsUnified ? unified : colors[colorIndex],
        colorIndex,
        unified: startsUnified,
        bounces: 0,
        splitCooldown: 0.25,
        trail: [],
      });
    }
    this.activeObjects = this.balls.length;
  }

  private getArenaObstacles(cX: number, cY: number, shapeRadius: number, minDim: number): {
    pegs: LayoutPeg[];
    bars: LayoutBar[];
  } {
    const pegs: LayoutPeg[] = [];
    const bars: LayoutBar[] = [];
    const layout = this.params.arenaLayout || "clean";

    if (layout === "center-bumper") {
      const coreR = minDim * (0.072 + Math.sin(this.pulsePhase * 1.2) * 0.01);
      pegs.push({ x: cX, y: cY, r: coreR, isCore: true });
    } else if (layout === "peg-field") {
      const ringR = shapeRadius * 0.48;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        pegs.push({
          x: cX + Math.cos(a) * ringR,
          y: cY + Math.sin(a) * ringR,
          r: minDim * 0.021,
        });
      }
      pegs.push({ x: cX, y: cY, r: minDim * 0.03, isCore: true });
    } else if (layout === "split-gate") {
      bars.push(
        { x1: cX, y1: cY - shapeRadius * 0.66, x2: cX, y2: cY - shapeRadius * 0.2 },
        { x1: cX, y1: cY + shapeRadius * 0.2, x2: cX, y2: cY + shapeRadius * 0.66 },
        { x1: cX, y1: cY - shapeRadius * 0.2, x2: cX, y2: cY + shapeRadius * 0.2, isPortal: true }
      );
    } else if (layout === "dual-chamber") {
      bars.push(
        { x1: cX - shapeRadius * 0.42, y1: cY - shapeRadius * 0.16, x2: cX - shapeRadius * 0.14, y2: cY + shapeRadius * 0.18 },
        { x1: cX + shapeRadius * 0.42, y1: cY - shapeRadius * 0.16, x2: cX + shapeRadius * 0.14, y2: cY + shapeRadius * 0.18 }
      );
      pegs.push({ x: cX, y: cY + shapeRadius * 0.28, r: minDim * 0.024, isCore: true });
    }

    return { pegs, bars };
  }

  private spawnMultiplyClone(source: Ball, nx: number, ny: number, perf: number, minDim: number) {
    const mode = this.params.multiplyMode;
    if (mode === "none") return;
    const targetMax = this.getTargetMaxBalls();
    if (this.balls.length >= targetMax || source.splitCooldown > 0 || this.spawnGateTimer > 0) return;

    source.splitCooldown = 0.65;
    this.spawnGateTimer = clamp(28 / Math.max(16, targetMax), 0.3, 0.75);
    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#00F5FF", "#FF007F"];
    const nextColorIdx = (source.colorIndex + 1 + this.balls.length) % colors.length;

    const tangentX = -ny;
    const tangentY = nx;
    const kick = minDim * 0.0024;
    const spd = Math.hypot(source.vx, source.vy) || minDim * 0.008;

    const clone: Ball = {
      x: source.x + tangentX * (source.radius * 0.72),
      y: source.y + tangentY * (source.radius * 0.72),
      vx: source.vx * 0.95 + tangentX * kick + nx * spd * 0.14,
      vy: source.vy * 0.95 + tangentY * kick + ny * spd * 0.14,
      radius: source.radius * 0.95,
      targetRadius: source.targetRadius,
      color: colors[nextColorIdx],
      colorIndex: nextColorIdx,
      unified: false,
      bounces: source.bounces,
      splitCooldown: 0.72,
      trail: [],
    };
    source.vx -= tangentX * kick * 0.6;
    source.vy -= tangentY * kick * 0.6;

    this.balls.push(clone);
    this.rescaleBallRadii();

    this.ripples.push({
      x: source.x,
      y: source.y,
      radius: source.radius,
      maxRadius: source.radius * 3.8,
      color: clone.color,
      alpha: 0.72,
    });
    if (this.params.particleEffects && this.particles.length < 240 * perf) {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        this.particles.push({
          x: source.x,
          y: source.y,
          vx: Math.cos(a) * minDim * 0.0036,
          vy: Math.sin(a) * minDim * 0.0036,
          color: clone.color,
          size: 2.8,
          alpha: 0.95,
        });
      }
    }
  }

  private paintPerimeterAtPoint(hitX: number, hitY: number, cX: number, cY: number, ball: Ball) {
    const hitAngle = ((Math.atan2(hitY - cY, hitX - cX) - this.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const segIdx = Math.floor((hitAngle / (Math.PI * 2)) * PERIMETER_SEGS) % PERIMETER_SEGS;

    if (!this.wallPainted.has(segIdx)) {
      this.wallPainted.add(segIdx);
    } else if (this.elapsedSeconds >= 14) {
      // Spread smoothly along adjacent perimeter rim arcs so final 360° gaps complete naturally
      const maxSpan = this.elapsedSeconds >= 28 ? Math.floor(PERIMETER_SEGS / 2) : 2;
      for (let d = 1; d <= maxSpan; d++) {
        const right = (segIdx + d) % PERIMETER_SEGS;
        const left = (segIdx - d + PERIMETER_SEGS) % PERIMETER_SEGS;
        if (!this.wallPainted.has(right)) {
          this.wallPainted.add(right);
          break;
        }
        if (!this.wallPainted.has(left)) {
          this.wallPainted.add(left);
          break;
        }
      }
    }

    const paintedRatio = this.wallPainted.size / PERIMETER_SEGS;
    if (paintedRatio >= 0.88 && this.elapsedSeconds >= 26 && this.params.variant !== "color-match") {
      ball.unified = true;
      ball.color = this.getUnifiedColor();
    }
  }

  private reflectWithCeilingReach(ball: Ball, nx: number, ny: number, minDim: number, maxSpeed: number) {
    const dot = ball.vx * nx + ball.vy * ny;
    if (dot >= 0) return false;

    const boost = 1 + this.params.speedIncrement / 100;
    const el = clamp(this.params.bounce * boost, 0.9, 1.03);
    ball.vx = (ball.vx - 2 * dot * nx) * el;
    ball.vy = (ball.vy - 2 * dot * ny) * el;

    const tangentX = -ny;
    const tangentY = nx;
    const rotPush = this.params.rotationSpeed * 0.08;
    ball.vx += tangentX * rotPush;
    ball.vy += tangentY * rotPush;

    // Pure isotropic scalar energy preservation (keeps true specular reflection angles with zero vertical snap)
    const curSpd = Math.hypot(ball.vx, ball.vy);
    const targetMinSpd = minDim * 0.0108;
    if (curSpd > 0.0001) {
      const targetSpd =
        curSpd < targetMinSpd
          ? curSpd + (targetMinSpd - curSpd) * 0.6
          : Math.min(maxSpeed, curSpd);
      const scale = targetSpd / curSpd;
      ball.vx *= scale;
      ball.vy *= scale;
    }
    if (Math.abs(ball.vx) < minDim * 0.0018) {
      ball.vx += (ball.x >= this.canvas.width * 0.5 ? -1 : 1) * minDim * 0.0018;
    }
    return true;
  }

  private isInsidePolygon(x: number, y: number, verts: { x: number; y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const xi = verts[i].x;
      const yi = verts[i].y;
      const xj = verts[j].x;
      const yj = verts[j].y;
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private getSignedArea(verts: { x: number; y: number }[]): number {
    let area = 0;
    for (let i = 0; i < verts.length; i++) {
      const v1 = verts[i];
      const v2 = verts[(i + 1) % verts.length];
      area += v1.x * v2.y - v2.x * v1.y;
    }
    return area * 0.5;
  }

  private enforcePolygonContainment(
    ball: Ball,
    vertices: { x: number; y: number }[],
    signedAreaSign: number,
    perf: number,
    allowSound: boolean,
    minDim: number,
    cX: number,
    cY: number
  ) {
    const inside = this.isInsidePolygon(ball.x, ball.y, vertices);
    let bestDistSq = Infinity;
    let bestCx = ball.x;
    let bestCy = ball.y;
    let bestNx = 0;
    let bestNy = -1;
    let hitAnyEdge = false;

    for (let j = 0; j < vertices.length; j++) {
      const v1 = vertices[j];
      const v2 = vertices[(j + 1) % vertices.length];
      const lx = v2.x - v1.x;
      const ly = v2.y - v1.y;
      const lenSq = lx * lx + ly * ly || 1;
      const len = Math.sqrt(lenSq);
      const t = clamp(((ball.x - v1.x) * lx + (ball.y - v1.y) * ly) / lenSq, 0, 1);
      const cx = v1.x + t * lx;
      const cy = v1.y + t * ly;
      const dx = ball.x - cx;
      const dy = ball.y - cy;
      const distSq = dx * dx + dy * dy;

      const inwardNx = (-ly / len) * signedAreaSign;
      const inwardNy = (lx / len) * signedAreaSign;

      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestCx = cx;
        bestCy = cy;
        bestNx = inwardNx;
        bestNy = inwardNy;
      }

      const dist = Math.sqrt(distSq);
      if (dist < ball.radius) {
        hitAnyEdge = true;
        let nx = inwardNx;
        let ny = inwardNy;
        if (inside && dist > 0.001) {
          const toBallX = dx / dist;
          const toBallY = dy / dist;
          if (toBallX * inwardNx + toBallY * inwardNy > 0.25) {
            nx = toBallX;
            ny = toBallY;
          }
        }
        ball.x = cx + nx * (ball.radius + 1.2);
        ball.y = cy + ny * (ball.radius + 1.2);

        const maxSpeedLocal = minDim * (0.0175 + Math.max(0, this.params.speed - 1) * 0.007);
        if (this.reflectWithCeilingReach(ball, nx, ny, minDim, maxSpeedLocal)) {
          if (allowSound) {
            this.paintPerimeterAtPoint(cx, cy, cX, cY, ball);
            this.triggerBounce(ball, cx, cy, nx, ny, perf);
            if (this.params.multiplyMode === "wall" || this.params.multiplyMode === "both") {
              this.spawnMultiplyClone(ball, nx, ny, perf, minDim);
            }
          }
        }
      }
    }

    if (!this.isInsidePolygon(ball.x, ball.y, vertices) || (!hitAnyEdge && !inside)) {
      ball.x = bestCx + bestNx * (ball.radius + 2.5);
      ball.y = bestCy + bestNy * (ball.radius + 2.5);
      const dot = ball.vx * bestNx + ball.vy * bestNy;
      if (dot < 0) {
        ball.vx = (ball.vx - 2 * dot * bestNx) * this.params.bounce;
        ball.vy = (ball.vy - 2 * dot * bestNy) * this.params.bounce;
        if (allowSound) {
          this.paintPerimeterAtPoint(bestCx, bestCy, cX, cY, ball);
          this.triggerBounce(ball, bestCx, bestCy, bestNx, bestNy, perf);
        }
      }
    }
  }

  public stepFixed(dt: number): void {
    const step = dt * 60;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const cX = W / 2;
    const cY = H / 2;

    this.pulsePhase += dt * 1.6 * this.params.animationIntensity;

    let shapeRadius = minDim * 0.41;
    if (this.params.variant === "moving-walls") {
      shapeRadius = minDim * (0.37 + Math.sin(this.pulsePhase) * 0.05);
    } else if (this.params.variant === "shrinking-cage") {
      const shrinkProg = clamp(this.elapsedSeconds / 32, 0, 1);
      shapeRadius = minDim * (0.42 - 0.16 * shrinkProg + Math.sin(this.pulsePhase * 1.4) * 0.018);
    }

    if (this.params.variant === "gravity-switch") {
      this.gravityTimer += dt;
      if (this.gravityTimer >= 3.4) {
        this.gravityTimer = 0;
        this.gravitySign *= -1;
        soundEngine.playClack(0);
      }
    } else {
      this.gravitySign = 1;
    }

    const perf = getPerfFactor(this.params.performance);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.vy += 0.08 * this.gravitySign * step;
      p.alpha -= 0.025 * step;
      p.size = Math.max(0, p.size - 0.04 * step);
      if (p.alpha <= 0 || p.size <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += minDim * 0.0042 * step;
      r.alpha -= 0.03 * step;
      if (r.alpha <= 0 || r.radius >= r.maxRadius) this.ripples.splice(i, 1);
    }

    const maxTrail = this.params.trailEffects ? clamp(Math.round(this.params.trailLength) * 2, 0, 48) : 0;
    const radiusEase = Math.min(1, dt * 7);
    this.spawnGateTimer = Math.max(0, this.spawnGateTimer - dt);
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i];
      ball.splitCooldown = Math.max(0, ball.splitCooldown - dt);
      ball.radius += (ball.targetRadius - ball.radius) * radiusEase;
      if (maxTrail === 0 && ball.trail.length > 0) {
        ball.trail = [];
      }
    }

    const { pegs, bars } = this.getArenaObstacles(cX, cY, shapeRadius, minDim);
    const substeps = 4;
    const subStep = step / substeps;
    const grav = 0.09 * this.params.gravity * this.gravitySign * (minDim / 1080) * subStep;
    const friction = 1 - clamp(this.params.friction, 0, 0.2) * 0.025 * subStep;
    const maxSpeed = minDim * (0.0175 + Math.max(0, this.params.speed - 1) * 0.007);

    for (let s = 0; s < substeps; s++) {
      this.angle += ((this.params.rotationSpeed * Math.PI) / 180) * subStep;
      const vertices =
        this.params.containerShape === "circle"
          ? []
          : this.getShapeVertices(cX, cY, shapeRadius, this.angle, this.params.containerShape);
      const areaSign = vertices.length ? (this.getSignedArea(vertices) >= 0 ? 1 : -1) : 1;

      const ballCountNow = this.balls.length;
      for (let bIdx = 0; bIdx < ballCountNow; bIdx++) {
        const ball = this.balls[bIdx];
        if (maxTrail > 0 && (s === 0 || s === 2)) {
          ball.trail.push({ x: ball.x, y: ball.y });
          if (ball.trail.length > maxTrail) ball.trail.shift();
        }
        ball.vy += grav;
        ball.vx *= friction;
        ball.vy *= friction;
        ball.x += ball.vx * subStep;
        ball.y += ball.vy * subStep;

        const curSpd = Math.hypot(ball.vx, ball.vy);
        if (curSpd > maxSpeed) {
          ball.vx = (ball.vx / curSpd) * maxSpeed;
          ball.vy = (ball.vy / curSpd) * maxSpeed;
        }

        if (this.params.containerShape === "circle") {
          const dx = ball.x - cX;
          const dy = ball.y - cY;
          const dist = Math.hypot(dx, dy);

          if (dist + ball.radius >= shapeRadius && dist > 0.0001) {
            const nx = -dx / dist;
            const ny = -dy / dist;
            const clampR = Math.max(4, shapeRadius - ball.radius - 1);
            ball.x = cX - nx * clampR;
            ball.y = cY - ny * clampR;

            if (this.reflectWithCeilingReach(ball, nx, ny, minDim, maxSpeed)) {
              const hitX = cX - nx * shapeRadius;
              const hitY = cY - ny * shapeRadius;
              if (this.params.variant === "color-match") {
                const hitAngle = ((Math.atan2(dy, dx) - this.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
                const segCount = Math.max(4, this.params.colors.length);
                const segIdx = Math.floor((hitAngle / (Math.PI * 2)) * segCount) % segCount;
                if (segIdx === ball.colorIndex % segCount) {
                  this.wallSegmentsBroken.add(segIdx);
                  if (this.wallSegmentsBroken.size >= segCount) {
                    this.markCompleted("All Colors Matched!", `Cleared all ${segCount} color segments in one match.`);
                    return;
                  }
                }
                ball.colorIndex = (ball.colorIndex + 1) % this.params.colors.length;
                ball.color = this.params.colors[ball.colorIndex];
              } else {
                this.paintPerimeterAtPoint(hitX, hitY, cX, cY, ball);
              }

              this.triggerBounce(ball, hitX, hitY, nx, ny, perf);
              if (this.params.multiplyMode === "wall" || this.params.multiplyMode === "both") {
                this.spawnMultiplyClone(ball, nx, ny, perf, minDim);
              }
            }
          }
        } else {
          this.enforcePolygonContainment(ball, vertices, areaSign, perf, true, minDim, cX, cY);
        }

        // Interior Pegs & Core Bumper
        for (const peg of pegs) {
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const dist = Math.hypot(dx, dy);
          const minD = ball.radius + peg.r;
          if (dist < minD && dist > 0.0001) {
            const nx = dx / dist;
            const ny = dy / dist;
            ball.x = peg.x + nx * (minD + 1);
            ball.y = peg.y + ny * (minD + 1);
            const dot = ball.vx * nx + ball.vy * ny;
            if (dot < 0) {
              const kick = peg.isCore ? 1.04 : 0.98;
              ball.vx = (ball.vx - 2 * dot * nx) * kick;
              ball.vy = (ball.vy - 2 * dot * ny) * kick;
              this.triggerBounce(ball, peg.x + nx * peg.r, peg.y + ny * peg.r, nx, ny, perf);
              if (peg.isCore && (this.params.multiplyMode === "wall" || this.params.multiplyMode === "both")) {
                this.spawnMultiplyClone(ball, nx, ny, perf, minDim);
              }
            }
          }
        }

        if (this.params.variant === "laser-sweep") {
          // Rotating glowing laser chord across arena center slices/clones spheres
          const lx1 = cX + Math.cos(this.angle * 2) * shapeRadius * 0.92;
          const ly1 = cY + Math.sin(this.angle * 2) * shapeRadius * 0.92;
          const lx2 = cX - Math.cos(this.angle * 2) * shapeRadius * 0.92;
          const ly2 = cY - Math.sin(this.angle * 2) * shapeRadius * 0.92;
          const ldx = lx2 - lx1;
          const ldy = ly2 - ly1;
          const lLenSq = ldx * ldx + ldy * ldy || 1;
          const lt = clamp(((ball.x - lx1) * ldx + (ball.y - ly1) * ldy) / lLenSq, 0, 1);
          const lcx = lx1 + lt * ldx;
          const lcy = ly1 + lt * ldy;
          const ldist = Math.hypot(ball.x - lcx, ball.y - lcy);
          if (ldist < ball.radius + 3 && ball.splitCooldown <= 0) {
            const nx = (ball.x - lcx) / (ldist || 1);
            const ny = (ball.y - lcy) / (ldist || 1);
            this.triggerBounce(ball, lcx, lcy, nx, ny, perf);
            if (this.params.multiplyMode !== "none") {
              this.spawnMultiplyClone(ball, nx, ny, perf, minDim);
            } else {
              ball.splitCooldown = 0.4;
              ball.vx *= 1.06;
              ball.vy *= 1.06;
            }
          }
        }

        // Interior Bars & Portals
        for (const bar of bars) {
          const lx = bar.x2 - bar.x1;
          const ly = bar.y2 - bar.y1;
          const lenSq = lx * lx + ly * ly || 1;
          const t = clamp(((ball.x - bar.x1) * lx + (ball.y - bar.y1) * ly) / lenSq, 0, 1);
          const cx = bar.x1 + t * lx;
          const cy = bar.y1 + t * ly;
          const dx = ball.x - cx;
          const dy = ball.y - cy;
          const d = Math.hypot(dx, dy);
          if (bar.isPortal) {
            if (d < ball.radius + 4 && this.params.multiplyMode !== "none") {
              this.spawnMultiplyClone(ball, 0, -1, perf, minDim);
            }
          } else if (d < ball.radius + 6 && d > 0.0001) {
            const nx = dx / d;
            const ny = dy / d;
            ball.x = cx + nx * (ball.radius + 7);
            ball.y = cy + ny * (ball.radius + 7);
            const dot = ball.vx * nx + ball.vy * ny;
            if (dot < 0) {
              ball.vx = (ball.vx - 2 * dot * nx) * this.params.bounce;
              ball.vy = (ball.vy - 2 * dot * ny) * this.params.bounce;
              this.triggerBounce(ball, cx, cy, nx, ny, perf);
            }
          }
        }

        // Moving inner obstacle bar
        if (this.params.variant === "moving-walls") {
          const barW = shapeRadius * 0.52;
          const barX = cX + Math.sin(this.pulsePhase * 1.2) * (shapeRadius * 0.32);
          const barY = cY + Math.cos(this.pulsePhase * 0.85) * (shapeRadius * 0.22);
          const p1x = barX - barW * 0.5;
          const p2x = barX + barW * 0.5;
          const t = clamp((ball.x - p1x) / (p2x - p1x || 1), 0, 1);
          const cx = p1x + t * (p2x - p1x);
          const dy = ball.y - barY;
          const d = Math.hypot(ball.x - cx, dy);
          if (d < ball.radius + 7) {
            const nx = (ball.x - cx) / (d || 1);
            const ny = dy / (d || 1);
            ball.x = cx + nx * (ball.radius + 8);
            ball.y = barY + ny * (ball.radius + 8);
            const dot = ball.vx * nx + ball.vy * ny;
            if (dot < 0) {
              ball.vx = (ball.vx - 2 * dot * nx) * this.params.bounce;
              ball.vy = (ball.vy - 2 * dot * ny) * this.params.bounce;
              this.triggerBounce(ball, cx, barY, nx, ny, perf);
            }
          }
        }
      }

      // Ball-to-ball elastic collisions + Color Unification + 2x Doubling
      const pairCount = this.balls.length;
      for (let i = 0; i < pairCount; i++) {
        for (let j = i + 1; j < pairCount; j++) {
          const a = this.balls[i];
          const b = this.balls[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const minDist = a.radius + b.radius;
          if (dist < minDist && dist > 0.001) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minDist - dist) * 0.5;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;

            const dvx = a.vx - b.vx;
            const dvy = a.vy - b.vy;
            const relVel = dvx * nx + dvy * ny;
            if (relVel > 0) {
              const impulse = relVel * clamp(this.params.collisionIntensity, 0.5, 1.2);
              a.vx -= impulse * nx;
              a.vy -= impulse * ny;
              b.vx += impulse * nx;
              b.vy += impulse * ny;
              soundEngine.playClack((a.x / W) * 2 - 1);

              // Unify color if either ball is already unified
              if (a.unified || b.unified) {
                const uc = this.getUnifiedColor();
                a.unified = true;
                b.unified = true;
                a.color = uc;
                b.color = uc;
              }

              if (
                (this.params.multiplyMode === "ball" || this.params.multiplyMode === "both") &&
                a.splitCooldown <= 0 &&
                b.splitCooldown <= 0
              ) {
                this.spawnMultiplyClone(a, -ny, nx, perf, minDim);
                a.splitCooldown = 0.42;
                b.splitCooldown = 0.42;
                soundEngine.playImpact(0.75, this.balls.length, (a.x / W) * 2 - 1);
              }
            }
          }
        }
      }

      // Final post-ball-collision containment
      if (this.params.containerShape !== "circle") {
        for (const ball of this.balls) {
          this.enforcePolygonContainment(ball, vertices, areaSign, perf, false, minDim, cX, cY);
        }
      } else {
        for (const ball of this.balls) {
          const dx = ball.x - cX;
          const dy = ball.y - cY;
          const dist = Math.hypot(dx, dy);
          if (dist + ball.radius > shapeRadius && dist > 0.0001) {
            const clampR = Math.max(4, shapeRadius - ball.radius - 0.5);
            ball.x = cX + (dx / dist) * clampR;
            ball.y = cY + (dy / dist) * clampR;
          }
        }
      }
    }

    this.activeObjects = this.balls.length;
    const maxContainerFill = this.getMaxFillRadius(minDim, this.params.containerShape);
    const rimPct = this.wallPainted.size / PERIMETER_SEGS;

    if (this.params.variant === "color-match") {
      const segCount = Math.max(4, this.params.colors.length);
      this.progressPct = clamp(Math.round((this.wallSegmentsBroken.size / segCount) * 100), 0, 100);
      return;
    }

    if (this.params.multiplyMode !== "none") {
      const targetMax = this.getTargetMaxBalls();
      const totalBallArea = this.balls.reduce((acc, b) => acc + Math.PI * b.radius * b.radius, 0);
      const chamberArea = Math.PI * maxContainerFill * maxContainerFill;
      const areaFillRatio = totalBallArea / Math.max(1, chamberArea);
      const reachedCapacity = this.balls.length >= targetMax || areaFillRatio >= 0.72;
      const canComplete = reachedCapacity && this.elapsedSeconds >= 30;

      // Gradually unify toward colors[0] only late in the run (>= 26s) and finish only after >= 30s
      if (this.elapsedSeconds >= 26 && rimPct >= 0.85) {
        const uc = this.getUnifiedColor();
        for (const b of this.balls) {
          if (b.bounces % 2 === 0 || canComplete) {
            b.unified = true;
            b.color = uc;
          }
        }
      }

      if (canComplete && this.balls.every((b) => b.unified)) {
        const uc = this.getUnifiedColor();
        for (let i = 0; i < PERIMETER_SEGS; i++) this.wallPainted.add(i);
        for (const b of this.balls) {
          b.unified = true;
          b.color = uc;
        }
        this.unifiedFinishTimer += dt;
        this.progressPct = 100;
        this.statusLabel = "Unified";
        if (this.unifiedFinishTimer >= 0.8) {
          this.markCompleted(
            "Chamber Filled & Unified!",
            `${this.balls.length} spheres filled the ${this.params.containerShape} in one unified glow.`
          );
        }
      } else {
        const fillProgress = Math.max(this.balls.length / targetMax, areaFillRatio / 0.72);
        this.progressPct = clamp(
          Math.round(Math.min(fillProgress, this.elapsedSeconds / 30) * 100),
          0,
          99
        );
        this.statusLabel = `${this.balls.length} Balls`;
      }
      return;
    }

    // Classic 360-degree All-Side Rim Fill & Unified Color completion (constant clean ball size)
    const uc = this.getUnifiedColor();
    if (rimPct >= 0.85) {
      for (const b of this.balls) {
        b.unified = true;
        b.color = uc;
      }
    }
    const allUnified = this.balls.every((b) => b.unified);
    const progressFrac = Math.min(rimPct, this.elapsedSeconds / 30);
    this.progressPct = clamp(Math.round(progressFrac * 100), 0, 100);

    if (rimPct >= 1 && allUnified && this.elapsedSeconds >= 30) {
      this.unifiedFinishTimer += dt;
      this.statusLabel = "100% Unified";
      if (this.unifiedFinishTimer >= 0.65) {
        this.markCompleted(
          "All Sides Filled & Unified!",
          `Painted 100% of the ${this.params.containerShape} perimeter in one unified color.`
        );
      }
    } else {
      this.statusLabel = `${Math.round(rimPct * 100)}% Rim Filled`;
    }
  }

  private triggerBounce(
    ball: Ball,
    x: number,
    y: number,
    nx: number,
    ny: number,
    perf: number
  ) {
    ball.bounces++;
    this.eventsCount++;

    const speed = Math.hypot(ball.vx, ball.vy);
    const panX = (x / Math.max(1, this.canvas.width)) * 2 - 1;
    soundEngine.playImpact(clamp(speed / 12, 0.35, 1.05), ball.bounces, panX);

    if (this.params.particleEffects && this.particles.length < 220 * perf) {
      const sparkCount = Math.round(7 * this.params.collisionIntensity * perf);
      for (let k = 0; k < sparkCount; k++) {
        const a = Math.atan2(ny, nx) + (Math.random() - 0.5) * 1.9;
        const spd = (Math.random() * 4 + 1.5) * (Math.min(this.canvas.width, this.canvas.height) / 1080);
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          color: ball.color,
          size: Math.random() * 2.8 + 1.4,
          alpha: 0.9,
        });
      }
    }

    this.ripples.push({
      x,
      y,
      radius: ball.radius,
      maxRadius: ball.radius * 2.6,
      color: ball.color,
      alpha: 0.55,
    });
  }

  private getShapeVertices(
    cX: number,
    cY: number,
    r: number,
    angle: number,
    shape: SimulationParams["containerShape"]
  ): { x: number; y: number }[] {
    if (shape === "star") {
      const points = 5;
      const step = Math.PI / points;
      const verts: { x: number; y: number }[] = [];
      for (let i = 0; i < points * 2; i++) {
        const rad = i % 2 === 0 ? r : r * 0.56;
        const a = angle + i * step;
        verts.push({ x: cX + Math.cos(a) * rad, y: cY + Math.sin(a) * rad });
      }
      return verts;
    }

    const sides = shape === "triangle" ? 3 : shape === "octagon" ? 8 : 6;
    const step = (Math.PI * 2) / sides;
    const verts: { x: number; y: number }[] = [];
    for (let i = 0; i < sides; i++) {
      const a = angle + i * step;
      verts.push({ x: cX + Math.cos(a) * r, y: cY + Math.sin(a) * r });
    }
    return verts;
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);
    const minDim = Math.min(W, H);
    const cX = W / 2;
    const cY = H / 2;
    let shapeRadius = minDim * 0.41;
    if (this.params.variant === "moving-walls") {
      shapeRadius = minDim * (0.37 + Math.sin(this.pulsePhase) * 0.05);
    } else if (this.params.variant === "shrinking-cage") {
      const shrinkProg = clamp(this.elapsedSeconds / 32, 0, 1);
      shapeRadius = minDim * (0.42 - 0.16 * shrinkProg + Math.sin(this.pulsePhase * 1.4) * 0.018);
    }

    const unifiedColor = this.getUnifiedColor();

    // Subtle soft ambient container fill tint as ring finishes unifying
    const rimFrac = this.wallPainted.size / PERIMETER_SEGS;
    if (rimFrac > 0.05 && this.params.variant !== "color-match") {
      ctx.save();
      ctx.globalAlpha = 0.045 + rimFrac * 0.09;
      ctx.fillStyle = unifiedColor;
      ctx.beginPath();
      if (this.params.containerShape === "circle") {
        ctx.arc(cX, cY, shapeRadius, 0, Math.PI * 2);
      } else {
        const verts = this.getShapeVertices(cX, cY, shapeRadius, this.angle, this.params.containerShape);
        ctx.moveTo(verts[0].x, verts[0].y);
        for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
        ctx.closePath();
      }
      ctx.fill();
      ctx.restore();
    }

    // Ripples
    for (const r of this.ripples) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = r.alpha;
      ctx.lineWidth = Math.max(1.5, minDim * 0.003);
      ctx.stroke();
      ctx.restore();
    }

    // Subtle understated watermark without any distracting "TARGET: X" clutter
    ctx.save();
    ctx.fillStyle = "rgba(245, 245, 245, 0.065)";
    ctx.font = `700 ${Math.round(minDim * 0.085)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const subtleStat =
      this.params.multiplyMode !== "none" ? `${this.balls.length}` : `${this.progressPct}%`;
    ctx.fillText(subtleStat, cX, cY);
    if (this.params.variant === "gravity-switch") {
      ctx.font = `600 ${Math.round(minDim * 0.022)}px Inter, sans-serif`;
      ctx.fillStyle = "rgba(196, 255, 46, 0.68)";
      ctx.fillText(this.gravitySign > 0 ? "GRAVITY DOWN ↓" : "GRAVITY UP ↑", cX, cY + minDim * 0.075);
    }
    ctx.restore();

    // Painted & unpainted container boundary segments
    ctx.save();
    const borderW = Math.max(3.5, minDim * 0.0075);
    ctx.lineCap = "round";

    if (this.params.containerShape === "circle") {
      if (this.params.variant === "color-match") {
        const segCount = Math.max(4, this.params.colors.length);
        const arc = (Math.PI * 2) / segCount;
        for (let i = 0; i < segCount; i++) {
          ctx.beginPath();
          ctx.lineWidth = borderW;
          ctx.strokeStyle = this.wallSegmentsBroken.has(i)
            ? "rgba(255,255,255,0.18)"
            : this.params.colors[i % this.params.colors.length];
          ctx.arc(cX, cY, shapeRadius, this.angle + i * arc, this.angle + (i + 1) * arc - 0.04);
          ctx.stroke();
        }
      } else {
        // Base subtle rim
        ctx.beginPath();
        ctx.lineWidth = borderW;
        ctx.strokeStyle = "rgba(245, 245, 245, 0.2)";
        ctx.arc(cX, cY, shapeRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Painted glowing unified arcs
        const segArc = (Math.PI * 2) / PERIMETER_SEGS;
        for (const idx of this.wallPainted) {
          const a0 = this.angle + idx * segArc;
          const a1 = a0 + segArc + 0.015;
          if (this.params.neonEffects && this.params.glowIntensity > 0.05) {
            ctx.beginPath();
            ctx.strokeStyle = unifiedColor;
            ctx.globalAlpha = 0.24 * this.params.glowIntensity;
            ctx.lineWidth = borderW * 2.4;
            ctx.arc(cX, cY, shapeRadius, a0, a1);
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = unifiedColor;
          ctx.lineWidth = borderW;
          ctx.arc(cX, cY, shapeRadius, a0, a1);
          ctx.stroke();
        }
      }
    } else {
      const verts = this.getShapeVertices(cX, cY, shapeRadius, this.angle, this.params.containerShape);
      ctx.beginPath();
      ctx.lineWidth = borderW;
      ctx.strokeStyle = rimFrac >= 0.99 ? unifiedColor : "rgba(245, 245, 245, 0.78)";
      ctx.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
      ctx.closePath();
      ctx.stroke();

      // Highlight painted polygon sub-segments smoothly around perimeter
      if (this.wallPainted.size > 0) {
        const subDivs = 4;
        for (let j = 0; j < verts.length; j++) {
          const v1 = verts[j];
          const v2 = verts[(j + 1) % verts.length];
          for (let k = 0; k < subDivs; k++) {
            const t0 = k / subDivs;
            const t1 = (k + 1) / subDivs;
            const p0x = v1.x + (v2.x - v1.x) * t0;
            const p0y = v1.y + (v2.y - v1.y) * t0;
            const p1x = v1.x + (v2.x - v1.x) * t1;
            const p1y = v1.y + (v2.y - v1.y) * t1;
            const midX = (p0x + p1x) * 0.5;
            const midY = (p0y + p1y) * 0.5;
            const segAngle = ((Math.atan2(midY - cY, midX - cX) - this.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
            const idx = Math.floor((segAngle / (Math.PI * 2)) * PERIMETER_SEGS) % PERIMETER_SEGS;
            if (this.wallPainted.has(idx) || rimFrac >= 0.99) {
              ctx.beginPath();
              ctx.strokeStyle = unifiedColor;
              ctx.lineWidth = borderW * 1.15;
              ctx.moveTo(p0x, p0y);
              ctx.lineTo(p1x, p1y);
              ctx.stroke();
            }
          }
        }
      }
    }
    ctx.restore();

    // Interior Arena Obstacles
    const { pegs, bars } = this.getArenaObstacles(cX, cY, shapeRadius, minDim);
    for (const bar of bars) {
      ctx.save();
      ctx.lineCap = "round";
      if (bar.isPortal) {
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = "#C4FF2E";
        ctx.lineWidth = Math.max(3, minDim * 0.005);
      } else {
        ctx.strokeStyle = "#38BDF8";
        ctx.lineWidth = Math.max(6, minDim * 0.011);
      }
      ctx.beginPath();
      ctx.moveTo(bar.x1, bar.y1);
      ctx.lineTo(bar.x2, bar.y2);
      ctx.stroke();
      ctx.restore();
    }
    for (const peg of pegs) {
      ctx.save();
      ctx.fillStyle = peg.isCore ? unifiedColor : this.params.colors[1] || "#38BDF8";
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#FFFFFF";
      ctx.stroke();
      ctx.restore();
    }

    if (this.params.variant === "moving-walls") {
      const barW = shapeRadius * 0.52;
      const barX = cX + Math.sin(this.pulsePhase * 1.2) * (shapeRadius * 0.32);
      const barY = cY + Math.cos(this.pulsePhase * 0.85) * (shapeRadius * 0.22);
      ctx.save();
      ctx.strokeStyle = unifiedColor;
      ctx.lineWidth = Math.max(5, minDim * 0.011);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(barX - barW * 0.5, barY);
      ctx.lineTo(barX + barW * 0.5, barY);
      ctx.stroke();
      ctx.restore();
    } else if (this.params.variant === "laser-sweep") {
      const lx1 = cX + Math.cos(this.angle * 2) * shapeRadius * 0.92;
      const ly1 = cY + Math.sin(this.angle * 2) * shapeRadius * 0.92;
      const lx2 = cX - Math.cos(this.angle * 2) * shapeRadius * 0.92;
      const ly2 = cY - Math.sin(this.angle * 2) * shapeRadius * 0.92;
      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = unifiedColor;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = Math.max(10, minDim * 0.018);
      ctx.beginPath();
      ctx.moveTo(lx1, ly1);
      ctx.lineTo(lx2, ly2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = Math.max(3, minDim * 0.005);
      ctx.beginPath();
      ctx.moveTo(lx1, ly1);
      ctx.lineTo(lx2, ly2);
      ctx.stroke();
      ctx.restore();
    }

    // Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Silky tapered comet trails + zero-allocation specular spheres
    for (let bi = 0; bi < this.balls.length; bi++) {
      const ball = this.balls[bi];
      const tLen = ball.trail.length;
      if (tLen > 2) {
        ctx.save();
        ctx.strokeStyle = ball.color;
        ctx.lineCap = "round";
        for (let i = 1; i < tLen; i += 2) {
          const p0 = ball.trail[Math.max(0, i - 2)];
          const p1 = ball.trail[i];
          const frac = i / tLen;
          ctx.globalAlpha = frac * frac * 0.34;
          ctx.lineWidth = Math.max(1.5, ball.radius * 1.15 * frac);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (this.params.neonEffects && this.params.glowIntensity > 0.05 && this.balls.length <= 42) {
        ctx.globalAlpha = 0.18 * this.params.glowIntensity;
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius * 1.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
      ctx.lineWidth = this.balls.length > 36 ? 1.2 : 2;
      ctx.strokeStyle = "#FFFFFF";
      ctx.stroke();

      // Zero-allocation inner specular gleam
      if (ball.radius >= 8) {
        ctx.globalAlpha = 0.38;
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(ball.x - ball.radius * 0.28, ball.y - ball.radius * 0.28, ball.radius * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
}
