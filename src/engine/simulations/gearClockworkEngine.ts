import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, drawBackground } from "../prng";

interface Gear {
  x: number;
  y: number;
  radius: number;
  teeth: number;
  angle: number;
  ratio: number;
  color: string;
}

export class GearClockworkEngine extends BaseCanvasSimulation {
  private gears: Gear[] = [];
  private tickAccum = 0;
  private gearBalls: { x: number; y: number; vx: number; vy: number; color: string; r: number }[] = [];

  protected onReset(): void {
    this.tickAccum = 0;
    this.gearBalls = [];
    this.buildGears();
    this.statusLabel = "Meshed";
  }

  protected onResize(): void {
    this.buildGears();
  }

  private buildGears() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const cX = W / 2;
    const cY = H / 2;
    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#F43F5E"];
    const toothPitch = (minDim * 0.042) * clamp(this.params.objectSize, 0.7, 1.4);

    const buildFromTeeth = (teeth: number) => (teeth * toothPitch) / (Math.PI * 2);

    const g1R = buildFromTeeth(18);
    const g2R = buildFromTeeth(12);
    const g3R = buildFromTeeth(16);
    const g4R = buildFromTeeth(10);
    const g5R = buildFromTeeth(14);

    const d12 = g1R + g2R + 4;
    const a12 = -Math.PI * 0.32;
    const g2X = cX + Math.cos(a12) * d12;
    const g2Y = cY + Math.sin(a12) * d12;

    const d13 = g1R + g3R + 4;
    const a13 = Math.PI * 0.65;
    const g3X = cX + Math.cos(a13) * d13;
    const g3Y = cY + Math.sin(a13) * d13;

    const d24 = g2R + g4R + 4;
    const a24 = -Math.PI * 0.75;
    const g4X = g2X + Math.cos(a24) * d24;
    const g4Y = g2Y + Math.sin(a24) * d24;

    const d35 = g3R + g5R + 4;
    const a35 = Math.PI * 0.15;
    const g5X = g3X + Math.cos(a35) * d35;
    const g5Y = g3Y + Math.sin(a35) * d35;

    this.gears = [
      { x: cX, y: cY, radius: g1R, teeth: 18, angle: 0, ratio: 1, color: colors[0] },
      { x: g2X, y: g2Y, radius: g2R, teeth: 12, angle: Math.PI / 12, ratio: -(18 / 12), color: colors[1 % colors.length] },
      { x: g3X, y: g3Y, radius: g3R, teeth: 16, angle: Math.PI / 16, ratio: -(18 / 16), color: colors[2 % colors.length] },
      { x: g4X, y: g4Y, radius: g4R, teeth: 10, angle: 0, ratio: (18 / 12) * (12 / 10), color: colors[3 % colors.length] },
      { x: g5X, y: g5Y, radius: g5R, teeth: 14, angle: 0, ratio: (18 / 16) * (16 / 14), color: colors[4 % colors.length] },
    ];
    this.activeObjects = this.gears.length;
  }

  public stepFixed(dt: number): void {
    const step = dt * 60;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const baseOmega = dt * (this.params.rotationSpeed || 1.2) * 0.9;
    for (const g of this.gears) {
      g.angle += baseOmega * g.ratio;
    }

    if (this.params.variant === "spiro-gears" && this.gears.length >= 2) {
      const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#F43F5E"];
      if (this.gearBalls.length < 8 && Math.random() < dt * 1.4) {
        this.gearBalls.push({
          x: W * (0.25 + Math.random() * 0.5),
          y: H * 0.08,
          vx: (Math.random() - 0.5) * 2,
          vy: 1,
          color: colors[this.eventsCount % colors.length],
          r: Math.max(8, Math.min(W, H) * 0.018),
        });
      }
      for (let i = this.gearBalls.length - 1; i >= 0; i--) {
        const b = this.gearBalls[i];
        b.vy += 0.22 * step;
        b.x += b.vx * step;
        b.y += b.vy * step;
        for (const g of this.gears) {
          const dx = b.x - g.x;
          const dy = b.y - g.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minD = g.radius + b.r + 6;
          if (dist < minD) {
            const nx = dx / dist;
            const ny = dy / dist;
            b.x = g.x + nx * (minD + 1);
            b.y = g.y + ny * (minD + 1);
            const dot = b.vx * nx + b.vy * ny;
            if (dot < 0) {
              b.vx = (b.vx - 1.75 * dot * nx) + -ny * baseOmega * g.ratio * g.radius * 0.12;
              b.vy = (b.vy - 1.75 * dot * ny) + nx * baseOmega * g.ratio * g.radius * 0.12;
              this.eventsCount++;
              soundEngine.playImpact(0.55, this.eventsCount % 12, (b.x / W) * 2 - 1);
            }
          }
        }
        if (b.x < b.r + 12 || b.x > W - b.r - 12) b.vx *= -0.85;
        if (b.y > H + 30) {
          b.x = W * (0.25 + Math.random() * 0.5);
          b.y = H * 0.08;
          b.vx = (Math.random() - 0.5) * 2;
          b.vy = 1;
        }
      }
    }

    this.tickAccum += Math.abs(baseOmega) * 18;
    if (this.tickAccum >= Math.PI * 2) {
      this.tickAccum -= Math.PI * 2;
      this.eventsCount++;
      soundEngine.playImpact(0.4, this.eventsCount, 0);
    }

    const targetRev = 12;
    this.progressPct = clamp(
      Math.round(Math.min(this.eventsCount / targetRev, this.elapsedSeconds / 32) * 100),
      0,
      100
    );
    if (this.eventsCount >= targetRev && this.elapsedSeconds >= 32) {
      this.markCompleted("Clockwork Cycle Complete!", `Completed ${this.eventsCount} synchronized gear revolutions.`);
    }
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);
    for (const g of this.gears) {
      this.drawGear(ctx, g);
    }
    for (const b of this.gearBalls) {
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawGear(ctx: CanvasRenderingContext2D, g: Gear) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.angle);

    const outerR = g.radius + 10;
    const innerR = g.radius - 8;
    const step = (Math.PI * 2) / g.teeth;

    ctx.beginPath();
    for (let i = 0; i < g.teeth; i++) {
      const a0 = i * step;
      const a1 = a0 + step * 0.2;
      const a2 = a0 + step * 0.48;
      const a3 = a0 + step * 0.68;
      if (i === 0) ctx.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
      else ctx.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
      ctx.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
      ctx.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
      ctx.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
    }
    ctx.closePath();

    ctx.fillStyle = "#1B1B1E";
    ctx.fill();
    ctx.strokeStyle = g.color;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Inner spokes
    ctx.beginPath();
    ctx.arc(0, 0, g.radius * 0.62, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let s = 0; s < 4; s++) {
      const sa = (s * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(sa) * g.radius * 0.62, Math.sin(sa) * g.radius * 0.62);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(0, 0, g.radius * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = g.color;
    ctx.fill();
    ctx.restore();
  }
}
