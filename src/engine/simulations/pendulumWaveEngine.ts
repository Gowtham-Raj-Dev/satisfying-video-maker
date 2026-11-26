import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, drawBackground } from "../prng";
import { SimulationParams } from "@/types/simulation";

interface PendulumNode {
  index: number;
  length: number;
  freq: number;
  angle: number;
  prevAngle: number;
  color: string;
  trail: { x: number; y: number }[];
}

export class PendulumWaveEngine extends BaseCanvasSimulation {
  private nodes: PendulumNode[] = [];

  protected onReset(): void {
    this.initNodes();
    this.statusLabel = "Harmonic Sync";
  }

  protected onResize(): void {
    this.initNodes();
  }

  protected onConfigUpdated(prev: SimulationParams, curr: SimulationParams): void {
    if (prev.objectCount !== curr.objectCount || prev.colors !== curr.colors) {
      this.initNodes();
    }
  }

  private initNodes() {
    const count = clamp(Math.round(this.params.objectCount * 3), 10, 30);
    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#A855F7"];
    const H = this.canvas.height;
    const maxLen = H * 0.62;
    const minLen = H * 0.22;

    this.nodes = [];
    const baseOscillations = 18;
    const cycleSeconds = 36;
    for (let i = 0; i < count; i++) {
      const ratio = i / Math.max(1, count - 1);
      const oscCount = baseOscillations + i;
      const freq = (oscCount * Math.PI * 2) / cycleSeconds;
      this.nodes.push({
        index: i,
        length: maxLen - ratio * (maxLen - minLen),
        freq,
        angle: 0.72,
        prevAngle: 0.72,
        color: colors[i % colors.length],
        trail: [],
      });
    }
    this.activeObjects = this.nodes.length;
  }

  public stepFixed(dt: number): void {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const pivotY = H * 0.14;
    const cX = W / 2;
    const amp = 0.68 * clamp(this.params.animationIntensity, 0.4, 1.3);
    const t = this.elapsedSeconds + dt;

    for (const n of this.nodes) {
      n.prevAngle = n.angle;
      n.angle = amp * Math.cos(n.freq * t * clamp(this.params.gravity, 0.4, 2));

      // Zero crossing triggers harmonic chime
      if ((n.prevAngle < 0 && n.angle >= 0) || (n.prevAngle > 0 && n.angle <= 0)) {
        this.eventsCount++;
        const x = cX + Math.sin(n.angle) * n.length;
        soundEngine.playImpact(0.55, n.index, (x / W) * 2 - 1);
      }

      if (this.params.trailEffects) {
        const bx = cX + Math.sin(n.angle) * n.length;
        const by = pivotY + Math.cos(n.angle) * n.length;
        n.trail.push({ x: bx, y: by });
        while (n.trail.length > clamp(this.params.trailLength, 4, 24)) n.trail.shift();
      } else {
        n.trail = [];
      }
    }
    this.progressPct = clamp(Math.round((t / 36) * 100), 0, 100);
    if (t >= 36) {
      this.markCompleted("Harmonic Cycle Complete!", "All pendulums returned into unison.");
    }
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);
    const pivotY = H * 0.14;
    const cX = W / 2;
    const minDim = Math.min(W, H);
    const bobR = clamp(minDim * 0.017 * this.params.objectSize, 6, 28);

    // Pivot bar
    ctx.save();
    ctx.fillStyle = "#29292D";
    ctx.beginPath();
    ctx.arc(cX, pivotY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw rods & trails
    for (const n of this.nodes) {
      const bx = cX + Math.sin(n.angle) * n.length;
      const by = pivotY + Math.cos(n.angle) * n.length;

      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cX, pivotY);
      ctx.lineTo(bx, by);
      ctx.stroke();

      if (n.trail.length > 1) {
        ctx.strokeStyle = n.color;
        ctx.lineWidth = bobR * 0.5;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.moveTo(n.trail[0].x, n.trail[0].y);
        for (let i = 1; i < n.trail.length; i++) {
          ctx.lineTo(n.trail[i].x, n.trail[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.fillStyle = n.color;
      ctx.beginPath();
      ctx.arc(bx, by, bobR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#F5F5F5";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }
}
