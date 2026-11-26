import { soundEngine } from "../audio";

export interface SandConfig {
  streamColor: string;
  particleSize: number;
  flowRate: number; // particles per frame
  gravity: number;
  pegCount: number;
  topText: string;
  bottomText: string;
}

interface SandParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

interface Peg {
  x: number;
  y: number;
  r: number;
}

export class SandPourSimulation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: SandConfig;
  private particles: SandParticle[] = [];
  private pegs: Peg[] = [];
  private isRunning: boolean = true;
  private animId: number | null = null;
  private emitterX: number = 0;
  private emitterDir: number = 1;
  private colors: string[] = ["#00F5FF", "#FF007F", "#FFE600", "#7928CA", "#00FF66"];

  constructor(canvas: HTMLCanvasElement, config: SandConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context");
    this.ctx = ctx;
    this.config = config;
    this.reset();
  }

  public updateConfig(newConfig: Partial<SandConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public reset() {
    this.particles = [];
    this.pegs = [];
    this.emitterX = this.canvas.width / 2;

    const W = this.canvas.width;
    // Generate peg grid in center
    const rows = 6;
    const cols = 7;
    for (let r = 0; r < rows; r++) {
      const y = 500 + r * 110;
      const offset = (r % 2 === 0) ? 0 : 50;
      for (let c = 0; c < cols; c++) {
        const x = 160 + c * 110 + offset;
        if (x > 100 && x < W - 100) {
          this.pegs.push({ x, y, r: 12 });
        }
      }
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

    // Move emitter back and forth
    this.emitterX += 2.5 * this.emitterDir;
    if (this.emitterX > W * 0.75) this.emitterDir = -1;
    if (this.emitterX < W * 0.25) this.emitterDir = 1;

    // Spawn new sand particles
    const spawnCount = this.config.flowRate || 4;
    for (let i = 0; i < spawnCount; i++) {
      const color = this.colors[Math.floor(Math.random() * this.colors.length)];
      this.particles.push({
        x: this.emitterX + (Math.random() - 0.5) * 20,
        y: 180,
        vx: (Math.random() - 0.5) * 1.5,
        vy: Math.random() * 2 + 1,
        color,
        size: Math.random() * 3 + 4,
      });
    }

    // Limit maximum particles for smooth 60fps
    if (this.particles.length > 2200) {
      this.particles.splice(0, 10);
    }

    // Physics step
    const floorY = H - 180;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.vy += this.config.gravity || 0.35;
      p.x += p.vx;
      p.y += p.vy;

      // Peg collisions
      for (const peg of this.pegs) {
        const dx = p.x - peg.x;
        const dy = p.y - peg.y;
        const dist = Math.hypot(dx, dy);
        const minDist = peg.r + p.size;
        if (dist < minDist) {
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          p.x = peg.x + nx * minDist;
          p.y = peg.y + ny * minDist;
          p.vx = (p.vx * 0.4 + nx * 3);
          p.vy = (p.vy * 0.4 + ny * 2);
          if (Math.random() < 0.1) soundEngine.playBounce(0.3);
        }
      }

      // Funnel bounds
      if (p.x < 100) {
        p.x = 100;
        p.vx = Math.abs(p.vx) * 0.5;
      } else if (p.x > W - 100) {
        p.x = W - 100;
        p.vx = -Math.abs(p.vx) * 0.5;
      }

      // Floor collection
      if (p.y > floorY) {
        p.y = floorY - Math.random() * 3;
        p.vy = 0;
        p.vx = (Math.random() - 0.5) * 0.4;
      }
    }
  }

  public render() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Dark background
    ctx.fillStyle = "#070914";
    ctx.fillRect(0, 0, W, H);

    // Funnel & Collector outline
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 4;
    ctx.strokeRect(90, 150, W - 180, H - 320);

    // Emitter nozzle
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#00F5FF";
    ctx.fillRect(this.emitterX - 25, 140, 50, 16);
    ctx.restore();

    // Draw pegs
    ctx.save();
    for (const peg of this.pegs) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#00F5FF";
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Draw particles
    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }

    // Top text
    if (this.config.topText) {
      ctx.save();
      ctx.font = "900 34px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFE600";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 8;
      ctx.fillText(this.config.topText, W / 2, 85);
      ctx.restore();
    }

    // Bottom text
    if (this.config.bottomText) {
      ctx.save();
      ctx.font = "800 30px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 8;
      ctx.fillText(this.config.bottomText, W / 2, H - 60);
      ctx.restore();
    }
  }
}
