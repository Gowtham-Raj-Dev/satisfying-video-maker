import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, drawBackground, getPerfFactor } from "../prng";
import { computeDistributionInWorker } from "../workerClient";
import { SimulationParams } from "@/types/simulation";

interface PatternNode {
  angle: number;
  radius: number;
  size: number;
  arm: number;
}

export class GeometricPatternEngine extends BaseCanvasSimulation {
  private phylloPoints: PatternNode[] = [];
  private trailPoints: { x: number; y: number; color: string }[] = [];
  private t = 0;
  private noteTimer = 0;
  private workerSeq = 0;

  protected onReset(): void {
    this.t = 0;
    this.noteTimer = 0;
    this.trailPoints = [];
    this.initPattern();
    this.statusLabel = "Generating";
  }

  protected onResize(): void {
    this.initPattern();
  }

  protected onConfigUpdated(prev: SimulationParams, curr: SimulationParams): void {
    if (prev.variant !== curr.variant || prev.particleCount !== curr.particleCount || prev.seed !== curr.seed) {
      this.onReset();
    }
  }

  private initPattern() {
    const minDim = Math.min(this.canvas.width, this.canvas.height);
    const perf = getPerfFactor(this.params.performance);
    const count = Math.round(clamp(this.params.particleCount, 120, 700) * perf);
    if (this.params.variant !== "infinite-spiral") {
      const seq = ++this.workerSeq;
      computeDistributionInWorker("phyllotaxis", count, minDim * 0.42, this.params.seed).then((pts) => {
        if (seq !== this.workerSeq) return;
        this.phylloPoints = pts;
        this.activeObjects = pts.length;
        if (this.isPaused) this.render();
      });
    }
  }

  public stepFixed(dt: number): void {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const cX = W / 2;
    const cY = H / 2;
    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#A855F7"];

    this.t += dt * (this.params.rotationSpeed || 1.2) * 0.85;
    this.noteTimer += dt;

    if (this.noteTimer >= 0.45) {
      this.noteTimer = 0;
      this.eventsCount++;
      soundEngine.playImpact(0.38, this.eventsCount, 0);
    }

    if (this.params.variant !== "infinite-spiral") {
      // Harmonograph / Spirograph curve trace
      const R = minDim * 0.36;
      const k1 = 3.0;
      const k2 = 5.0;
      const x = cX + Math.sin(this.t * k1) * R * 0.65 + Math.cos(this.t * k2) * R * 0.35;
      const y = cY + Math.cos(this.t * k1) * R * 0.65 + Math.sin(this.t * (k2 - 1)) * R * 0.35;
      const color = colors[Math.floor(this.t * 2) % colors.length];
      this.trailPoints.push({ x, y, color });
      const maxPts = 360;
      while (this.trailPoints.length > maxPts) this.trailPoints.shift();
      this.activeObjects = this.phylloPoints.length + this.trailPoints.length;
    } else {
      this.activeObjects = 40;
    }
    this.progressPct = clamp(Math.round((this.elapsedSeconds / 32) * 100), 0, 100);
    if (this.elapsedSeconds >= 32) {
      this.markCompleted("Pattern Complete!", "Finished 32-second geometric symmetry cycle.");
    }
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);
    const minDim = Math.min(W, H);
    const cX = W / 2;
    const cY = H / 2;
    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#A855F7"];

    if (this.params.variant === "infinite-spiral") {
      const rings = 34;
      const maxR = minDim * 0.65;
      for (let i = 0; i < rings; i++) {
        const phase = ((i / rings + (this.t * 0.14) % 1) % 1);
        const r = Math.pow(phase, 1.55) * maxR;
        const rot = this.t * 0.45 + i * 0.16;
        const color = colors[i % colors.length];
        ctx.save();
        ctx.translate(cX, cY);
        ctx.rotate(rot);
        ctx.globalAlpha = clamp(phase * 1.1, 0.08, 0.95);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, phase * 5);
        ctx.beginPath();
        const sides = 6;
        for (let s = 0; s <= sides; s++) {
          const a = (s / sides) * Math.PI * 2;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    // Phyllotaxis breathing background nodes
    ctx.save();
    for (let i = 0; i < this.phylloPoints.length; i++) {
      const pt = this.phylloPoints[i];
      const wave = 1 + Math.sin(this.t * 2 - pt.radius * 0.025) * 0.08;
      const a = pt.angle + this.t * 0.25;
      const x = cX + Math.cos(a) * pt.radius * wave;
      const y = cY + Math.sin(a) * pt.radius * wave;
      ctx.fillStyle = colors[pt.arm % colors.length];
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(x, y, pt.size * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Crisp harmonograph curve
    if (this.trailPoints.length > 2) {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      for (let i = 1; i < this.trailPoints.length; i++) {
        const p0 = this.trailPoints[i - 1];
        const p1 = this.trailPoints[i];
        ctx.strokeStyle = p1.color;
        ctx.globalAlpha = i / this.trailPoints.length;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
