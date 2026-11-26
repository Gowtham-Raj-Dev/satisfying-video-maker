import { soundEngine } from "../audio";

export interface BarrierConfig {
  ringCount: number;
  rotationSpeed: number;
  ballSpeed: number;
  topText: string;
  bottomText: string;
}

interface RingSegment {
  angleStart: number;
  angleEnd: number;
  health: number;
  color: string;
}

interface Ring {
  radius: number;
  segments: RingSegment[];
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

export class BarrierBreakerSimulation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: BarrierConfig;
  private isRunning: boolean = true;
  private animId: number | null = null;

  // Ball
  private ballX: number = 0;
  private ballY: number = 0;
  private ballVx: number = 6;
  private ballVy: number = 5;
  private ballRadius: number = 18;
  private ballTrail: { x: number; y: number }[] = [];

  // Concentric Rings
  private rings: Ring[] = [];
  private particles: Particle[] = [];
  private ringAngle: number = 0;
  private escapes: number = 0;

  private ringColors = ["#00F5FF", "#FF007F", "#FFE600", "#7928CA", "#39FF14", "#FF5E36"];

  constructor(canvas: HTMLCanvasElement, config: BarrierConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context");
    this.ctx = ctx;
    this.config = config;
    this.reset();
  }

  public updateConfig(newConfig: Partial<BarrierConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public reset() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    this.ballX = W / 2;
    this.ballY = H / 2;
    this.ballVx = 6.5;
    this.ballVy = 5.5;
    this.ballTrail = [];
    this.particles = [];
    this.ringAngle = 0;
    this.escapes = 0;

    // Build concentric rings
    this.rings = [];
    const count = this.config.ringCount || 5;
    const baseR = 120;
    const stepR = 60;

    for (let i = 0; i < count; i++) {
      const radius = baseR + i * stepR;
      const color = this.ringColors[i % this.ringColors.length];
      const segments: RingSegment[] = [];
      const segmentCount = 18;
      const segAngle = (Math.PI * 2) / segmentCount;

      for (let s = 0; s < segmentCount; s++) {
        segments.push({
          angleStart: s * segAngle,
          angleEnd: (s + 1) * segAngle - 0.05,
          health: 1, // 1 = intact, 0 = broken
          color,
        });
      }
      this.rings.push({ radius, segments, color });
    }
  }

  public start() {
    this.isRunning = true;
    const loop = () => {
      if (this.isRunning) {
        this.step();
        this.render();
      }
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  public pause() {
    this.isRunning = false;
  }

  public resume() {
    this.isRunning = true;
  }

  public stop() {
    this.isRunning = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  public step() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cX = W / 2;
    const cY = H / 2;

    this.ringAngle += (this.config.rotationSpeed || 0.8) * 0.015;

    // Trail
    this.ballTrail.push({ x: this.ballX, y: this.ballY });
    if (this.ballTrail.length > 18) this.ballTrail.shift();

    // Move ball
    this.ballX += this.ballVx;
    this.ballY += this.ballVy;

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      p.size = Math.max(0, p.size - 0.1);
      if (p.alpha <= 0 || p.size <= 0) this.particles.splice(i, 1);
    }

    const dx = this.ballX - cX;
    const dy = this.ballY - cY;
    const dist = Math.hypot(dx, dy);
    let ballAngle = Math.atan2(dy, dx) - this.ringAngle;
    while (ballAngle < 0) ballAngle += Math.PI * 2;
    while (ballAngle >= Math.PI * 2) ballAngle -= Math.PI * 2;

    // Check collision against each ring
    for (let rIdx = 0; rIdx < this.rings.length; rIdx++) {
      const ring = this.rings[rIdx];
      const thickness = 14;

      if (Math.abs(dist - ring.radius) < this.ballRadius + thickness / 2) {
        // Find hit segment
        for (const seg of ring.segments) {
          if (seg.health > 0 && ballAngle >= seg.angleStart && ballAngle <= seg.angleEnd) {
            // Hit! Break segment
            seg.health = 0;
            this.escapes++;

            // Normal reflection
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);
            const dot = this.ballVx * nx + this.ballVy * ny;
            this.ballVx = (this.ballVx - 2 * dot * nx) * 1.02;
            this.ballVy = (this.ballVy - 2 * dot * ny) * 1.02;

            soundEngine.playBounce(1.2, this.escapes);

            // Shards
            for (let k = 0; k < 15; k++) {
              const a = Math.random() * Math.PI * 2;
              const spd = Math.random() * 8 + 3;
              this.particles.push({
                x: this.ballX,
                y: this.ballY,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
                color: seg.color,
                size: Math.random() * 6 + 3,
                alpha: 1,
              });
            }
            break;
          }
        }
      }
    }

    // Outer bounce if all rings broken
    const maxR = Math.min(W, H) * 0.44;
    if (dist >= maxR) {
      const nx = -dx / dist;
      const ny = -dy / dist;
      this.ballX = cX - nx * (maxR - 2);
      this.ballY = cY - ny * (maxR - 2);
      const dot = this.ballVx * nx + this.ballVy * ny;
      this.ballVx = this.ballVx - 2 * dot * nx;
      this.ballVy = this.ballVy - 2 * dot * ny;
      soundEngine.playBounce(0.8);
    }
  }

  public render() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cX = W / 2;
    const cY = H / 2;

    ctx.fillStyle = "#070814";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(cX, cY);
    ctx.rotate(this.ringAngle);

    // Draw Rings
    for (const ring of this.rings) {
      for (const seg of ring.segments) {
        if (seg.health <= 0) continue;
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = seg.color;
        ctx.strokeStyle = seg.color;
        ctx.lineWidth = 12;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, 0, ring.radius, seg.angleStart, seg.angleEnd);
        ctx.stroke();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();

    // Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.restore();
    }

    // Ball trail
    if (this.ballTrail.length > 1) {
      ctx.save();
      for (let i = 0; i < this.ballTrail.length - 1; i++) {
        const p1 = this.ballTrail[i];
        const p2 = this.ballTrail[i + 1];
        const ratio = (i + 1) / this.ballTrail.length;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = "#00F5FF";
        ctx.lineWidth = this.ballRadius * 1.2 * ratio;
        ctx.lineCap = "round";
        ctx.globalAlpha = ratio * 0.4;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Ball
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.ballX, this.ballY, this.ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    // HUD: Blocks Broken
    ctx.save();
    ctx.font = "900 64px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.textAlign = "center";
    ctx.fillText(`${this.escapes}`, cX, cY + 24);

    // Top text
    if (this.config.topText) {
      ctx.font = "900 34px sans-serif";
      ctx.fillStyle = "#FFE600";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 8;
      ctx.fillText(this.config.topText, W / 2, 85);
    }

    // Bottom text
    if (this.config.bottomText) {
      ctx.font = "800 30px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 8;
      ctx.fillText(this.config.bottomText, W / 2, H - 60);
    }
    ctx.restore();
  }
}
