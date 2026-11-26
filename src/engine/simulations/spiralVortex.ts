import { soundEngine } from "../audio";

export interface VortexConfig {
  particleCount: number;
  swirlSpeed: number;
  topText: string;
  bottomText: string;
}

interface VortexParticle {
  angle: number;
  radius: number;
  speed: number;
  radialSpeed: number;
  color: string;
  size: number;
}

export class SpiralVortexSimulation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: VortexConfig;
  private particles: VortexParticle[] = [];
  private isRunning: boolean = true;
  private animId: number | null = null;
  private globalRot: number = 0;

  private colors = ["#00F5FF", "#FF007F", "#7928CA", "#FFE600", "#39FF14", "#00FFCC"];

  constructor(canvas: HTMLCanvasElement, config: VortexConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context");
    this.ctx = ctx;
    this.config = config;
    this.reset();
  }

  public updateConfig(newConfig: Partial<VortexConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public reset() {
    this.particles = [];
    this.globalRot = 0;
    const W = this.canvas.width;
    const maxR = W * 0.46;
    const count = this.config.particleCount || 450;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * maxR + 20,
        speed: (Math.random() * 0.03 + 0.015),
        radialSpeed: (Math.random() * 0.8 + 0.4),
        color: this.colors[i % this.colors.length],
        size: Math.random() * 3 + 2,
      });
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
    const maxR = W * 0.46;

    this.globalRot += 0.01;

    for (const p of this.particles) {
      // Swirl faster as it approaches center (Kepler's Law)
      const angularBoost = (maxR / (p.radius + 30)) * 0.015;
      p.angle += p.speed + angularBoost;
      p.radius -= p.radialSpeed;

      // Re-spawn at outer edge when sucked into black hole center
      if (p.radius <= 12) {
        p.radius = maxR;
        p.angle = Math.random() * Math.PI * 2;
        if (Math.random() < 0.05) soundEngine.playBounce(0.3);
      }
    }
  }

  public render() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cX = W / 2;
    const cY = H / 2;

    // Cosmic background
    ctx.fillStyle = "#050612";
    ctx.fillRect(0, 0, W, H);

    // Center Black Hole Glow
    ctx.save();
    const grad = ctx.createRadialGradient(cX, cY, 10, cX, cY, 320);
    grad.addColorStop(0, "rgba(121, 40, 202, 0.4)");
    grad.addColorStop(0.5, "rgba(0, 245, 255, 0.15)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Black Hole Event Horizon
    ctx.beginPath();
    ctx.arc(cX, cY, 26, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#00F5FF";
    ctx.stroke();
    ctx.restore();

    // Draw swirling cosmic particles
    ctx.save();
    for (const p of this.particles) {
      const px = cX + Math.cos(p.angle) * p.radius;
      const py = cY + Math.sin(p.angle) * p.radius;

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      ctx.fill();
    }
    ctx.restore();

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
