import { soundEngine } from "../audio";

export interface CrusherConfig {
  crushSpeed: number;
  topText: string;
  bottomText: string;
}

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rot: number;
  vRot: number;
}

export class CrusherSimulation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: CrusherConfig;
  private isRunning: boolean = true;
  private animId: number | null = null;

  // Crusher state
  private pistonY: number = 200;
  private pistonVy: number = 3;
  private crushing: boolean = true;
  private objectHeight: number = 240;
  private objectWidth: number = 200;
  private originalHeight: number = 240;
  private crushed: boolean = false;
  private shards: Shard[] = [];
  private objectColor: string = "#FF007F";
  private objectType: number = 0; // 0: can, 1: cube, 2: duck

  private colors = ["#FF007F", "#00F5FF", "#FFE600", "#7928CA", "#39FF14"];

  constructor(canvas: HTMLCanvasElement, config: CrusherConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context");
    this.ctx = ctx;
    this.config = config;
    this.reset();
  }

  public updateConfig(newConfig: Partial<CrusherConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public reset() {
    this.pistonY = 220;
    this.pistonVy = 3.5;
    this.crushing = true;
    this.objectHeight = this.originalHeight;
    this.objectWidth = 200;
    this.crushed = false;
    this.shards = [];
    this.objectColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    this.objectType = (this.objectType + 1) % 3;
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
    const H = this.canvas.height;
    const anvilY = H - 360;

    // Shards update
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.4;
      s.rot += s.vRot;
      if (s.y > H + 50) this.shards.splice(i, 1);
    }

    if (this.crushing) {
      this.pistonY += this.pistonVy;
      const objectTop = anvilY - this.objectHeight;

      // Contact with object
      if (this.pistonY >= objectTop) {
        this.objectHeight = Math.max(30, anvilY - this.pistonY);
        this.objectWidth = Math.min(450, 200 + (this.originalHeight - this.objectHeight) * 1.5);

        // Sound on compression
        if (Math.random() < 0.2) soundEngine.playBounce(0.5);

        // Max crush reached -> explode into pieces!
        if (this.objectHeight <= 35 && !this.crushed) {
          this.crushed = true;
          soundEngine.playBounce(1.5);

          const W = this.canvas.width;
          for (let k = 0; k < 60; k++) {
            this.shards.push({
              x: W / 2 + (Math.random() - 0.5) * this.objectWidth,
              y: anvilY - 15,
              vx: (Math.random() - 0.5) * 24,
              vy: -Math.random() * 14 - 4,
              color: this.objectColor,
              size: Math.random() * 16 + 6,
              rot: Math.random() * Math.PI,
              vRot: (Math.random() - 0.5) * 0.3,
            });
          }

          // Switch to lifting piston
          setTimeout(() => {
            this.crushing = false;
          }, 400);
        }
      }
    } else {
      // Piston lifting up
      this.pistonY -= 5;
      if (this.pistonY <= 220) {
        this.reset();
      }
    }
  }

  public render() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cX = W / 2;
    const anvilY = H - 360;

    // Dark sleek background
    ctx.fillStyle = "#090a16";
    ctx.fillRect(0, 0, W, H);

    // Steel Anvil base
    ctx.save();
    ctx.fillStyle = "#1e2438";
    ctx.strokeStyle = "#384260";
    ctx.lineWidth = 4;
    ctx.fillRect(cX - 280, anvilY, 560, 160);
    ctx.strokeRect(cX - 280, anvilY, 560, 160);
    ctx.restore();

    // Object being crushed
    if (!this.crushed) {
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = this.objectColor;
      ctx.fillStyle = this.objectColor;

      const objX = cX - this.objectWidth / 2;
      const objY = anvilY - this.objectHeight;

      ctx.beginPath();
      ctx.roundRect(objX, objY, this.objectWidth, this.objectHeight, 16);
      ctx.fill();

      // Shiny highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.roundRect(objX + 15, objY + 10, this.objectWidth - 30, Math.min(20, this.objectHeight / 4), 8);
      ctx.fill();
      ctx.restore();
    }

    // Shards
    for (const s of this.shards) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = s.color;
      ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
      ctx.restore();
    }

    // Hydraulic Piston Head & Rod
    ctx.save();
    // Steel rod
    ctx.fillStyle = "#2d354d";
    ctx.fillRect(cX - 45, 0, 90, this.pistonY);

    // Heavy Pressing Plate
    ctx.shadowBlur = 20;
    ctx.shadowColor = "rgba(0, 245, 255, 0.4)";
    ctx.fillStyle = "#4a5578";
    ctx.strokeStyle = "#00F5FF";
    ctx.lineWidth = 4;
    ctx.fillRect(cX - 260, this.pistonY - 40, 520, 45);
    ctx.strokeRect(cX - 260, this.pistonY - 40, 520, 45);

    // Pressure Gauge HUD
    ctx.font = "bold 22px sans-serif";
    ctx.fillStyle = "#FFE600";
    ctx.textAlign = "center";
    ctx.fillText("HYDRAULIC PRESS 100T", cX, this.pistonY - 12);
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
