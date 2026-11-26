import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, createRng, drawBackground, getPerfFactor } from "../prng";
import { PointerEventData } from "../types";

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

export class HydraulicPressEngine extends BaseCanvasSimulation {
  private pistonY = 0;
  private phase: "down" | "hold" | "up" = "down";
  private holdTimer = 0;
  private objHeight = 240;
  private objWidth = 200;
  private baseHeight = 240;
  private baseWidth = 200;
  private crushed = false;
  private pressureTons = 0;
  private objColor = "#C4FF2E";
  private shards: Shard[] = [];
  private shake = 0;
  private cycleIdx = 0;
  private soapSlicedCount = 0;
  private soapBladeX = 0;

  protected onReset(): void {
    this.shards = [];
    this.cycleIdx = 0;
    this.soapSlicedCount = 0;
    this.soapBladeX = 0;
    this.initObject();
    this.statusLabel = "Pressing";
  }

  public handlePointer(ev: PointerEventData): void {
    if (ev.type === "down" && this.params.variant === "soap-carve") {
      // Clicking accelerates blade slice cleanly
      this.carveNextSoapCube();
    }
  }

  private carveNextSoapCube(): void {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const anvilY = H * 0.78;
    const colors = this.params.colors.length ? this.params.colors : ["#F9A8D4", "#C4B5FD", "#7DD3FC"];
    const total = 20;
    const idx = this.soapSlicedCount % total;
    const row = Math.floor(idx / 5);
    const col = idx % 5;
    const cw = this.baseWidth / 5;
    const ch = this.baseHeight / 4;
    const x = W * 0.5 - this.baseWidth * 0.5 + (col + 0.5) * cw;
    const y = anvilY - this.baseHeight + (row + 0.5) * ch;

    this.shards.push({
      x,
      y,
      vx: (col - 2) * 3.4 + (Math.random() - 0.5) * 4,
      vy: -4.2 - Math.random() * 4,
      color: colors[(row + col) % colors.length],
      size: Math.min(cw, ch) * 0.86,
      rot: 0,
      vRot: (Math.random() - 0.5) * 0.22,
    });
    this.soapSlicedCount++;
    this.eventsCount++;
    soundEngine.playImpact(0.7, this.soapSlicedCount % 12, (x / W) * 2 - 1);
  }

  private initObject(): void {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const rng = createRng(this.params.seed + this.cycleIdx * 13);
    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#F43F5E"];

    this.baseHeight = minDim * 0.24 * clamp(this.params.objectSize, 0.6, 1.4);
    this.baseWidth = minDim * 0.22 * clamp(this.params.objectSize, 0.6, 1.4);
    this.objHeight = this.baseHeight;
    this.objWidth = this.baseWidth;
    this.pistonY = H * 0.16;
    this.phase = "down";
    this.holdTimer = 0;
    this.crushed = false;
    this.pressureTons = 0;
    this.shake = 0;
    this.objColor = colors[this.cycleIdx % colors.length];
    this.cycleIdx++;
    this.activeObjects = 1 + Math.floor(rng() * 0);
  }

  public stepFixed(dt: number): void {
    const step = dt * 60;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const anvilY = H * 0.78;
    const perf = getPerfFactor(this.params.performance);

    this.shake = Math.max(0, this.shake - 0.5 * step);

    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.x += s.vx * step;
      s.y += s.vy * step;
      s.vy += 0.45 * this.params.gravity * step;
      s.rot += s.vRot * step;
      if (s.y > H + 60) this.shards.splice(i, 1);
    }

    if (this.params.variant === "soap-carve") {
      // Articulated razor knife sweeps cube-by-cube across scored grid block
      const speed = clamp(this.params.pressSpeed, 0.4, 2.4);
      this.holdTimer += dt * speed;
      this.soapBladeX = W * 0.5 - this.baseWidth * 0.55 + ((this.holdTimer * 165) % (this.baseWidth * 1.1));
      if (this.holdTimer >= 0.42) {
        this.holdTimer = 0;
        this.carveNextSoapCube();
      }
      this.progressPct = clamp(Math.round((this.elapsedSeconds / 32) * 100), 0, 100);
      if (this.elapsedSeconds >= 32) {
        this.markCompleted(`Carved ${this.eventsCount} Soap Cubes!`, "Completed 32-second ASMR soap carving challenge.");
      }
      this.activeObjects = Math.max(1, 20 - (this.soapSlicedCount % 20)) + this.shards.length;
      this.statusLabel = `Carved: ${this.eventsCount}`;
      return;
    }

    const downSpeed = (H * 0.0032) * clamp(this.params.pressSpeed, 0.4, 2.5) * step;

    if (this.phase === "down") {
      this.pistonY += downSpeed;
      const objTop = anvilY - this.objHeight;

      if (this.pistonY >= objTop) {
        const minThick = this.params.variant === "flatten" ? 12 : 28;
        this.objHeight = Math.max(minThick, anvilY - this.pistonY);
        const squashRatio = 1 - this.objHeight / Math.max(1, this.baseHeight);
        this.pressureTons = clamp(squashRatio * 105, 0, 100);

        const spreadFactor = this.params.pressMaterial === "metal" ? 0.55 : 1.35;
        this.objWidth = Math.min(W * 0.66, this.baseWidth * (1 + squashRatio * spreadFactor));
        this.shake = squashRatio * 3.5;

        if (Math.random() < 0.18) {
          soundEngine.playImpact(0.45 + squashRatio * 0.5, Math.round(squashRatio * 8), 0);
        }

        if (this.objHeight <= minThick + 2 && !this.crushed) {
          this.crushed = this.params.variant !== "flatten" && this.params.variant !== "squeeze" && this.params.variant !== "wax-seal";
          this.phase = "hold";
          this.holdTimer = 0;
          this.eventsCount++;
          soundEngine.playImpact(1.4, 2, 0);

          if ((this.crushed || this.params.variant === "wax-seal") && this.params.fractureEffects && this.params.particleEffects) {
            const count = Math.round((this.params.variant === "foam-crumble" ? 75 : 55) * perf);
            for (let k = 0; k < count; k++) {
              this.shards.push({
                x: W / 2 + (Math.random() - 0.5) * this.objWidth,
                y: anvilY - 12,
                vx: (Math.random() - 0.5) * 20,
                vy: -Math.random() * 14 - 3,
                color:
                  this.params.variant === "glass-beads"
                    ? this.params.colors[k % this.params.colors.length] || this.objColor
                    : this.objColor,
                size: 6 + Math.random() * 12,
                rot: Math.random() * Math.PI,
                vRot: (Math.random() - 0.5) * 0.28,
              });
            }
          }
        }
      }
    } else if (this.phase === "hold") {
      this.holdTimer += dt;
      if (this.holdTimer > 0.45) {
        this.phase = "up";
      }
    } else {
      this.pistonY -= downSpeed * 1.8;
      if (this.params.variant === "squeeze" && !this.crushed) {
        this.objHeight = Math.min(this.baseHeight, this.objHeight + downSpeed * 1.4);
        const squashRatio = 1 - this.objHeight / Math.max(1, this.baseHeight);
        this.objWidth = this.baseWidth * (1 + squashRatio * 1.2);
      }
      if (this.pistonY <= H * 0.16) {
        if (this.cycleIdx >= 5 && this.elapsedSeconds >= 30) {
          this.markCompleted("Crush Cycle Complete!", `Crushed ${this.cycleIdx} objects at 100 tons of pressure.`);
          return;
        }
        this.initObject();
      }
    }
    this.progressPct = clamp(
      Math.round(Math.min((this.cycleIdx - 1 + (this.crushed ? 1 : 0)) / 5, this.elapsedSeconds / 30) * 100),
      0,
      100
    );
    this.activeObjects = 1 + this.shards.length;
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);
    const cX = W / 2 + (Math.random() - 0.5) * this.shake;
    const anvilY = H * 0.78;
    const minDim = Math.min(W, H);

    // Anvil
    ctx.save();
    ctx.fillStyle = "#1B1B1E";
    ctx.strokeStyle = "#3F3F46";
    ctx.lineWidth = 3;
    const anvilW = minDim * 0.62;
    ctx.fillRect(cX - anvilW / 2, anvilY, anvilW, H * 0.14);
    ctx.strokeRect(cX - anvilW / 2, anvilY, anvilW, H * 0.14);
    ctx.restore();

    if (this.params.variant === "soap-carve") {
      // Draw uncarved remaining soap cubes + moving razor knife
      const total = 20;
      const doneMod = this.soapSlicedCount % total;
      const cw = this.baseWidth / 5;
      const ch = this.baseHeight / 4;
      const startX = cX - this.baseWidth * 0.5;
      const startY = anvilY - this.baseHeight;
      const colors = this.params.colors.length ? this.params.colors : ["#F9A8D4", "#C4B5FD", "#7DD3FC"];

      for (let i = doneMod; i < total; i++) {
        const row = Math.floor(i / 5);
        const col = i % 5;
        ctx.fillStyle = colors[(row + col) % colors.length];
        ctx.beginPath();
        ctx.roundRect(startX + col * cw + 2, startY + row * ch + 2, cw - 4, ch - 4, 4);
        ctx.fill();
      }

      const activeRow = Math.floor(doneMod / 5);
      const bladeY = startY + (activeRow + 0.5) * ch;
      ctx.save();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(this.soapBladeX - 18, bladeY);
      ctx.lineTo(this.soapBladeX + 18, bladeY - 12);
      ctx.stroke();
      ctx.restore();

      for (const s of this.shards) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.fillStyle = s.color;
        ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
        ctx.restore();
      }
      return;
    }

    if (!this.crushed) {
      ctx.save();
      const x = cX - this.objWidth / 2;
      const y = anvilY - this.objHeight;

      if (this.params.variant === "glass-beads") {
        const rows = 3;
        for (let r = 0; r < rows; r++) {
          const count = 4 - r;
          const orbR = Math.max(5, Math.min(this.objWidth / 9, this.objHeight / 6));
          const span = (count - 1) * orbR * 2.1;
          for (let c = 0; c < count; c++) {
            const ox = cX - span * 0.5 + c * orbR * 2.1;
            const oy = anvilY - orbR * (1 + r * 1.75) * (this.objHeight / Math.max(1, this.baseHeight));
            ctx.fillStyle = this.params.colors[(r * 3 + c) % this.params.colors.length] || this.objColor;
            ctx.beginPath();
            ctx.arc(ox, oy, orbR, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (this.params.variant === "wax-seal") {
        const rx = this.objWidth * 0.56;
        const ry = Math.max(10, this.objHeight * 0.48);
        ctx.fillStyle = this.objColor;
        ctx.beginPath();
        ctx.ellipse(cX, anvilY - ry * 0.72, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        if (this.pressureTons > 30) {
          ctx.strokeStyle = "rgba(255,255,255,0.5)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(cX, anvilY - ry * 0.72, rx * 0.58, ry * 0.58, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (this.params.pressShape === "stack" || this.params.pressMaterial === "layered") {
        const layers = 5;
        const layerH = this.objHeight / layers;
        for (let i = 0; i < layers; i++) {
          ctx.fillStyle = this.params.colors[i % this.params.colors.length] || this.objColor;
          ctx.beginPath();
          ctx.roundRect(x, y + i * layerH, this.objWidth, layerH - 2, 6);
          ctx.fill();
        }
      } else if (this.params.pressShape === "sphere") {
        ctx.fillStyle = this.objColor;
        ctx.beginPath();
        ctx.ellipse(cX, anvilY - this.objHeight / 2, this.objWidth / 2, this.objHeight / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.params.pressShape === "pyramid") {
        ctx.fillStyle = this.objColor;
        ctx.beginPath();
        ctx.moveTo(cX, y);
        ctx.lineTo(x + this.objWidth, anvilY);
        ctx.lineTo(x, anvilY);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = this.objColor;
        ctx.beginPath();
        ctx.roundRect(x, y, this.objWidth, this.objHeight, this.params.pressShape === "can" ? 8 : 14);
        ctx.fill();
        if (this.params.variant === "foam-crumble") {
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          for (let px = x + 12; px < x + this.objWidth - 10; px += 18) {
            for (let py = y + 10; py < anvilY - 8; py += 16) {
              ctx.beginPath();
              ctx.arc(px, py, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        if (this.params.pressShape === "can") {
          ctx.fillStyle = "rgba(255,255,255,0.22)";
          ctx.fillRect(x + 6, y + 6, this.objWidth - 12, Math.min(12, this.objHeight * 0.2));
        }
      }

      if (this.params.fractureEffects && this.pressureTons > 35) {
        ctx.strokeStyle = "rgba(11, 11, 12, 0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cX - this.objWidth * 0.2, y + this.objHeight * 0.2);
        ctx.lineTo(cX, y + this.objHeight * 0.55);
        ctx.lineTo(cX + this.objWidth * 0.18, y + this.objHeight * 0.85);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const s of this.shards) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = s.color;
      ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
      ctx.restore();
    }

    // Hydraulic Rod & Plate
    ctx.save();
    ctx.fillStyle = "#29292D";
    ctx.fillRect(cX - minDim * 0.045, 0, minDim * 0.09, Math.max(0, this.pistonY - 36));
    const plateW = minDim * 0.56;
    ctx.fillStyle = "#1B1B1E";
    ctx.strokeStyle = "#C4FF2E";
    ctx.lineWidth = 3;
    ctx.fillRect(cX - plateW / 2, this.pistonY - 40, plateW, 40);
    ctx.strokeRect(cX - plateW / 2, this.pistonY - 40, plateW, 40);

    ctx.fillStyle = "#F5F5F5";
    ctx.font = `700 ${Math.max(12, Math.round(minDim * 0.024))}px "JetBrains Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`PRESSURE ${this.pressureTons.toFixed(1)} T`, cX, this.pistonY - 20);
    ctx.restore();
  }
}
