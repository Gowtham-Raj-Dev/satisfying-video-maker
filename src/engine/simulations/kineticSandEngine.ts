import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, createRng, drawBackground, getPerfFactor } from "../prng";
import { PointerEventData } from "../types";
import { SimulationParams } from "@/types/simulation";

interface SandGrain {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  settled: boolean;
}

interface Peg {
  x: number;
  y: number;
  r: number;
}

interface RollingMarble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
}

interface SlicedCube {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vRot: number;
  color: string;
}

export class KineticSandEngine extends BaseCanvasSimulation {
  private particles: SandGrain[] = [];
  private pegs: Peg[] = [];
  private heightMap: Float32Array = new Float32Array(256);
  private emitterX = 0;
  private emitterDir = 1;
  private colorStep = 0;

  // Cellular grid (also used for Dig & Drop Tunnel Game in zen-rake)
  private gridCols = 96;
  private gridRows = 160;
  private cellGrid: Int16Array = new Int16Array(0);
  private pointerDown = false;
  private pointerNormX = 0.5;
  private pointerNormY = 0.25;

  // Interactive game entities for zen-rake / sand-slice / sand-wheel / sand-sieve
  private marbles: RollingMarble[] = [];
  private slicedCubes: SlicedCube[] = [];
  private wheelAngle = 0;
  private sliceProgress = 0;
  private gemsRevealed = 0;

  protected onReset(): void {
    this.particles = [];
    this.pegs = [];
    this.marbles = [];
    this.slicedCubes = [];
    this.wheelAngle = 0;
    this.sliceProgress = 0;
    this.gemsRevealed = 0;
    this.emitterX = this.canvas.width / 2;
    this.emitterDir = 1;
    this.colorStep = 0;
    this.buildLayout();
    this.statusLabel = "Playing";
  }

  protected onResize(): void {
    this.buildLayout();
  }

  protected onConfigUpdated(prev: SimulationParams, curr: SimulationParams): void {
    if (
      prev.pegLayout !== curr.pegLayout ||
      prev.jarShape !== curr.jarShape ||
      prev.variant !== curr.variant
    ) {
      this.onReset();
    }
  }

  private buildLayout(): void {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    this.heightMap = new Float32Array(260);
    const floorY = H * 0.85;
    this.heightMap.fill(floorY);

    this.pegs = [];
    const variant = this.params.variant || "waterfall";
    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#F43F5E"];
    const aspect = H / Math.max(1, W);
    this.gridCols = 92;
    this.gridRows = clamp(Math.round(this.gridCols * aspect), 72, 180);
    this.cellGrid = new Int16Array(this.gridCols * this.gridRows).fill(-1);

    if (variant === "zen-rake") {
      // Sand Dig & Marble Drop Game: Solid stratified sand block filling middle band
      const rStart = Math.floor(this.gridRows * 0.28);
      const rEnd = Math.floor(this.gridRows * 0.82);
      for (let r = rStart; r < rEnd; r++) {
        const band = Math.floor((r - rStart) / 6) % colors.length;
        for (let c = 8; c < this.gridCols - 8; c++) {
          this.cellGrid[r * this.gridCols + c] = band;
        }
      }
      // 4 glowing spheres drop from top into dug channels!
      for (let m = 0; m < 4; m++) {
        this.marbles.push({
          x: W * (0.28 + m * 0.15),
          y: H * 0.16,
          vx: 0,
          vy: 1,
          r: clamp(minDim * 0.022 * this.params.objectSize, 10, 24),
          color: colors[m % colors.length],
        });
      }
      this.activeObjects = this.marbles.length;
      return;
    }

    if (variant === "sand-sieve") {
      for (let r = 0; r < 3; r++) {
        const y = H * (0.28 + r * 0.14);
        for (let c = 0; c < 9; c++) {
          this.pegs.push({
            x: W * 0.2 + c * ((W * 0.6) / 8),
            y,
            r: Math.max(5, minDim * 0.009),
          });
        }
      }
      return;
    }

    if (variant === "sand-slice") {
      // Seed initial tumbling rainbow cubes on anvil so Frame 0 looks dynamic
      this.slicedCubes.push({
        x: W * 0.56,
        y: H * 0.64,
        vx: 1.8,
        vy: -1.2,
        w: minDim * 0.09,
        h: minDim * 0.055,
        rot: 0.2,
        vRot: 0.05,
        color: colors[0],
      });
      return;
    }

    if (variant !== "cellular" && variant !== "sand-wheel" && this.params.pegLayout !== "none") {
      const rows = this.params.pegLayout === "funnel" ? 4 : 6;
      const cols = 7;
      const startX = W * 0.18;
      const spanX = W * 0.64;
      const dx = spanX / Math.max(1, cols - 1);
      for (let r = 0; r < rows; r++) {
        const y = H * 0.26 + r * (H * 0.065);
        const offset = this.params.pegLayout === "staggered" && r % 2 === 1 ? dx * 0.5 : 0;
        for (let c = 0; c < cols; c++) {
          const x = startX + c * dx + offset;
          if (x > W * 0.14 && x < W * 0.86) {
            this.pegs.push({ x, y, r: Math.max(6, minDim * 0.01) });
          }
        }
      }
    }

    if (variant === "cellular") {
      for (let c = 18; c < this.gridCols - 18; c++) {
        const hill = Math.round(6 + Math.sin((c / this.gridCols) * Math.PI) * 10);
        for (let h = 0; h < hill; h++) {
          const r = this.gridRows - 1 - h;
          if (r >= 0) this.cellGrid[r * this.gridCols + c] = Math.floor(h / 4) % 5;
        }
      }
    }
  }

  public handlePointer(ev: PointerEventData): void {
    if (ev.type === "down") this.pointerDown = true;
    else if (ev.type === "up") this.pointerDown = false;
    this.pointerNormX = clamp(ev.x, 0.05, 0.95);
    this.pointerNormY = clamp(ev.y, 0.05, 0.85);
  }

  private pickGrainColor(): string {
    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#F43F5E"];
    this.colorStep += 0.012;
    if (this.params.sandLayerPattern === "bands") {
      const idx = Math.floor(this.colorStep * 0.4) % colors.length;
      return colors[idx];
    }
    if (this.params.sandLayerPattern === "dual") {
      return this.emitterDir > 0 ? colors[0] : colors[1 % colors.length];
    }
    const idx = Math.floor(this.colorStep) % colors.length;
    return colors[idx];
  }

  public stepFixed(dt: number): void {
    const step = dt * 60;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const perf = getPerfFactor(this.params.performance);
    const variant = this.params.variant || "waterfall";
    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#F43F5E"];

    if (variant === "cellular") {
      this.stepCellular(perf);
      return;
    }

    if (variant === "zen-rake") {
      // Sand Dig & Marble Drop Game!
      const cols = this.gridCols;
      const rows = this.gridRows;
      // Carve circular tunnel either where pointer drags OR smoothly along an S-auger path
      const digNormX = this.pointerDown
        ? this.pointerNormX
        : 0.5 + Math.sin(this.elapsedSeconds * 1.45) * 0.25;
      const digNormY = this.pointerDown
        ? this.pointerNormY
        : 0.28 + ((this.elapsedSeconds * 0.14) % 0.56);
      const cCenter = Math.floor(digNormX * cols);
      const rCenter = Math.floor(digNormY * rows);
      for (let dr = -3; dr <= 3; dr++) {
        for (let dc = -3; dc <= 3; dc++) {
          if (dr * dr + dc * dc <= 11) {
            const rr = rCenter + dr;
            const cc = cCenter + dc;
            if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
              this.cellGrid[rr * cols + cc] = -1;
            }
          }
        }
      }

      // Drop & roll marbles cleanly through dug sand tunnels!
      for (const m of this.marbles) {
        m.vy += 0.22 * step;
        const nextX = clamp(m.x + m.vx * step, 24, W - 24);
        const nextY = m.y + m.vy * step;
        const gc = clamp(Math.floor((nextX / W) * cols), 0, cols - 1);
        const gr = clamp(Math.floor(((nextY + m.r * 0.6) / H) * rows), 0, rows - 1);
        if (this.cellGrid[gr * cols + gc] !== -1) {
          // Carve slightly ahead as heavy marble settles and rolls along tunnel gradient
          this.cellGrid[gr * cols + gc] = -1;
          m.vy *= 0.25;
          m.vx += (digNormX * W - m.x) * 0.008;
        }
        m.vx *= 0.96;
        m.x = nextX;
        m.y = nextY;
        if (m.y > H * 0.87) {
          this.eventsCount++;
          soundEngine.playImpact(0.75, this.eventsCount % 12, (m.x / W) * 2 - 1);
          m.y = H * 0.15;
          m.x = W * (0.25 + Math.random() * 0.5);
          m.vy = 1;
        }
      }
      this.activeObjects = this.marbles.length;
      this.statusLabel = `Drops Scored: ${this.eventsCount}`;
      this.progressPct = clamp(Math.round((this.elapsedSeconds / 32) * 100), 0, 100);
      if (this.elapsedSeconds >= 32) {
        this.markCompleted(`Sand Tunnel · ${this.eventsCount} Scored!`, "Completed 32s sand digging game.");
      }
      return;
    }

    if (variant === "sand-slice") {
      // Interactive / Auto Sand Block Guillotine Chopper
      this.sliceProgress += dt * (this.pointerDown ? 1.8 : 0.95) * clamp(this.params.speed, 0.4, 2);
      if (this.sliceProgress >= 1) {
        this.sliceProgress -= 1;
        const cubeW = minDim * 0.11;
        const cubeH = minDim * 0.065;
        this.eventsCount++;
        const col = colors[this.eventsCount % colors.length];
        this.slicedCubes.push({
          x: W * 0.5,
          y: H * 0.48,
          vx: (this.eventsCount % 2 === 0 ? 1 : -1) * (1.8 + Math.random() * 1.6),
          vy: -2.4,
          w: cubeW,
          h: cubeH,
          rot: 0,
          vRot: (Math.random() - 0.5) * 0.14,
          color: col,
        });
        soundEngine.playImpact(0.65, this.eventsCount % 10, (Math.random() - 0.5) * 0.8);
      }

      for (let i = this.slicedCubes.length - 1; i >= 0; i--) {
        const sc = this.slicedCubes[i];
        sc.vy += 0.28 * step;
        sc.x += sc.vx * step;
        sc.y += sc.vy * step;
        sc.rot += sc.vRot * step;
        if (sc.y > H * 0.78) {
          // Cube explodes into colorful kinetic sand particles on floor
          for (let g = 0; g < Math.round(14 * perf); g++) {
            if (this.particles.length < 1400 * perf) {
              this.particles.push({
                x: sc.x + (Math.random() - 0.5) * sc.w,
                y: H * 0.78 - 6,
                vx: sc.vx + (Math.random() - 0.5) * 4.5,
                vy: -Math.random() * 4.5,
                color: sc.color,
                size: clamp(3.5 * this.params.objectSize * (minDim / 1080), 2, 7.5),
                settled: false,
              });
            }
          }
          this.slicedCubes.splice(i, 1);
        }
      }
      this.statusLabel = `Bricks Chopped: ${this.eventsCount}`;
    }

    if (variant === "sand-wheel") {
      this.wheelAngle += dt * 1.45 * clamp(this.params.speed, 0.4, 2);
      const discR = minDim * 0.36;
      for (let i = 0; i < Math.round(5 * perf); i++) {
        if (this.particles.length >= Math.round(1200 * perf)) this.particles.shift();
        this.particles.push({
          x: W * 0.5 + (Math.random() - 0.5) * (discR * 0.4),
          y: H * 0.16,
          vx: Math.cos(this.wheelAngle) * 2.2 + (Math.random() - 0.5) * 1.2,
          vy: 1.5,
          color: this.pickGrainColor(),
          size: clamp(3.5 * this.params.objectSize * (minDim / 1080), 2, 7.5),
          settled: false,
        });
      }
    }

    if (variant === "sand-sieve") {
      const shift = Math.sin(this.elapsedSeconds * 5.2) * (W * 0.03);
      for (let idx = 0; idx < this.pegs.length; idx++) {
        const col = idx % 9;
        this.pegs[idx].x = W * 0.2 + col * ((W * 0.6) / 8) + shift;
      }
      this.gemsRevealed = Math.min(8, Math.floor(this.elapsedSeconds / 3.8));
      this.statusLabel = `Gems Found: ${this.gemsRevealed}/8`;
    }

    const leftWall = W * 0.1;
    const rightWall = W * 0.9;
    this.emitterX += 1.6 * this.emitterDir * step;
    if (this.emitterX > W * 0.78) this.emitterDir = -1;
    if (this.emitterX < W * 0.22) this.emitterDir = 1;

    if (variant !== "sand-slice" && variant !== "sand-wheel") {
      const spawnX = this.pointerDown ? this.pointerNormX * W : this.emitterX;
      const spawnY = this.pointerDown ? this.pointerNormY * H : H * 0.14;
      const maxParticles = Math.round(clamp(this.params.particleCount * 3, 400, 3200) * perf);
      const spawnCount = Math.max(1, Math.round(this.params.sandFlowSpeed * perf));
      const grainR = clamp(3.5 * this.params.objectSize * (minDim / 1080), 2, 9);
      const nozzle = clamp(this.params.sandNozzleWidth, 6, 80) * (W / 1080);

      for (let i = 0; i < spawnCount; i++) {
        if (this.particles.length < maxParticles) {
          this.particles.push({
            x: spawnX + (Math.random() - 0.5) * nozzle,
            y: spawnY,
            vx: (Math.random() - 0.5) * 1.4,
            vy: 1 + Math.random() * 1.5,
            color: this.pickGrainColor(),
            size: grainR,
            settled: false,
          });
        }
      }
    }

    const grav = 0.32 * this.params.gravity * (H / 1920 + 0.35) * step;
    const bins = this.heightMap.length;

    for (const p of this.particles) {
      if (p.settled) continue;

      p.vy += grav;
      p.x += p.vx * step;
      p.y += p.vy * step;

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
          p.vx = p.vx * 0.35 + nx * 2.4;
          p.vy = p.vy * 0.35 + ny * 1.5;
          if (Math.random() < 0.03) soundEngine.playImpact(0.25, undefined, (p.x / W) * 2 - 1);
        }
      }

      if (variant === "sand-wheel") {
        // Spinning wheel paddles knock pouring grains into lower sorting chutes
        const wheelDx = p.x - W * 0.5;
        const wheelDy = p.y - H * 0.45;
        const wd = Math.hypot(wheelDx, wheelDy);
        if (wd < minDim * 0.16 && wd > 1) {
          p.vx += Math.cos(this.wheelAngle) * 1.8;
          p.vy -= 0.4;
        }
      }

      let minX = leftWall + p.size;
      let maxX = rightWall - p.size;
      if (this.params.jarShape === "hourglass" || this.params.jarShape === "flask") {
        const normY = clamp(p.y / H, 0, 1);
        const pinch = this.params.jarShape === "hourglass" ? Math.sin(normY * Math.PI) * W * 0.24 : (1 - normY) * W * 0.16;
        minX = leftWall + pinch + p.size;
        maxX = rightWall - pinch - p.size;
      }

      if (p.x < minX) {
        p.x = minX;
        p.vx = Math.abs(p.vx) * 0.4;
      } else if (p.x > maxX) {
        p.x = maxX;
        p.vx = -Math.abs(p.vx) * 0.4;
      }

      const bin = clamp(Math.floor((p.x / W) * bins), 0, bins - 1);
      const surfaceY = this.heightMap[bin];
      if (p.y + p.size >= surfaceY) {
        p.y = surfaceY - p.size;
        p.vx = 0;
        p.vy = 0;
        p.settled = true;
        this.heightMap[bin] = Math.max(H * 0.25, surfaceY - p.size * 0.9);
        if (bin > 0 && this.heightMap[bin - 1] > this.heightMap[bin] + p.size * 2) {
          this.heightMap[bin - 1] -= p.size * 0.45;
        }
        if (bin < bins - 1 && this.heightMap[bin + 1] > this.heightMap[bin] + p.size * 2) {
          this.heightMap[bin + 1] -= p.size * 0.45;
        }
        this.eventsCount++;
      }
    }

    const midCol = Math.floor(bins / 2);
    const fillRatio = clamp((H * 0.85 - this.heightMap[midCol]) / (H * 0.55), 0, 1);
    const timePct = this.elapsedSeconds / 32;
    this.progressPct = clamp(
      Math.round((variant === "sand-slice" || variant === "sand-wheel" ? timePct : Math.min(fillRatio, timePct)) * 100),
      0,
      100
    );
    if (
      (variant === "sand-slice" || variant === "sand-wheel" || variant === "sand-sieve" || this.heightMap[midCol] <= H * 0.3) &&
      this.elapsedSeconds >= 32
    ) {
      this.markCompleted("Sand Challenge Complete!", "Completed 32-second sand simulation game.");
      return;
    }
    this.activeObjects = this.particles.length + this.slicedCubes.length;
  }

  private stepCellular(perf: number): void {
    const rng = createRng(this.params.seed + Math.floor(this.elapsedSeconds * 60));
    const cols = this.gridCols;
    const rows = this.gridRows;

    const nozzleCol = this.pointerDown
      ? Math.floor(this.pointerNormX * cols)
      : Math.floor((0.5 + Math.sin(this.elapsedSeconds * 1.3) * 0.32) * cols);
    const spawnRow = this.pointerDown ? Math.floor(this.pointerNormY * rows) : 6;

    const colorsLen = Math.max(1, this.params.colors.length);
    const colorIdx = Math.floor(this.elapsedSeconds * 0.9) % colorsLen;
    const width = clamp(Math.round(this.params.sandFlowSpeed * 0.6 * perf), 1, 5);

    for (let dx = -width; dx <= width; dx++) {
      const c = clamp(nozzleCol + dx, 2, cols - 3);
      const r = clamp(spawnRow, 1, rows - 3);
      if (this.cellGrid[r * cols + c] === -1 && rng() > 0.2) {
        this.cellGrid[r * cols + c] = colorIdx;
      }
    }

    let filled = 0;
    for (let r = rows - 2; r >= 0; r--) {
      const dir = r % 2 === 0 ? 1 : -1;
      for (let i = 0; i < cols; i++) {
        const c = dir > 0 ? i : cols - 1 - i;
        const idx = r * cols + c;
        const val = this.cellGrid[idx];
        if (val === -1) continue;
        filled++;

        const below = (r + 1) * cols + c;
        if (this.cellGrid[below] === -1) {
          this.cellGrid[below] = val;
          this.cellGrid[idx] = -1;
        } else {
          const goLeft = rng() > 0.5;
          const c1 = clamp(c + (goLeft ? -1 : 1), 1, cols - 2);
          const c2 = clamp(c + (goLeft ? 1 : -1), 1, cols - 2);
          if (this.cellGrid[(r + 1) * cols + c1] === -1) {
            this.cellGrid[(r + 1) * cols + c1] = val;
            this.cellGrid[idx] = -1;
          } else if (this.cellGrid[(r + 1) * cols + c2] === -1) {
            this.cellGrid[(r + 1) * cols + c2] = val;
            this.cellGrid[idx] = -1;
          }
        }
      }
    }

    this.progressPct = clamp(
      Math.round(Math.min(filled / (cols * rows * 0.58), this.elapsedSeconds / 30) * 100),
      0,
      100
    );
    if (filled > cols * rows * 0.58 && this.elapsedSeconds >= 30) {
      this.markCompleted("Sand Canvas Filled!", "Cellular sand grid filled cleanly.");
      return;
    }
    this.activeObjects = filled;
    this.eventsCount = filled;
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);
    const minDim = Math.min(W, H);
    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#F43F5E"];
    const variant = this.params.variant || "waterfall";

    if (variant === "zen-rake" || variant === "cellular") {
      const cellW = W / this.gridCols;
      const cellH = H / this.gridRows;
      for (let r = 0; r < this.gridRows; r++) {
        for (let c = 0; c < this.gridCols; c++) {
          const v = this.cellGrid[r * this.gridCols + c];
          if (v >= 0) {
            ctx.fillStyle = colors[v % colors.length];
            ctx.fillRect(c * cellW, r * cellH, Math.ceil(cellW), Math.ceil(cellH));
          }
        }
      }
      if (variant === "zen-rake") {
        // Prize Cups + Dropping Marbles
        for (const m of this.marbles) {
          ctx.save();
          ctx.fillStyle = m.color;
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
      return;
    }

    if (variant === "sand-slice") {
      const loafX = W * 0.36;
      const loafW = W * 0.28;
      const loafY = H * 0.2;
      const loafH = H * 0.28;
      ctx.save();
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(loafX, loafY + i * (loafH / 6), loafW, loafH / 6 - 1);
      }
      // Animated guillotine razor blade
      const bladeY = loafY + this.sliceProgress * (loafH + 22);
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(loafX - 24, bladeY);
      ctx.lineTo(loafX + loafW + 24, bladeY);
      ctx.stroke();

      for (const sc of this.slicedCubes) {
        ctx.save();
        ctx.translate(sc.x, sc.y);
        ctx.rotate(sc.rot);
        ctx.fillStyle = sc.color;
        ctx.fillRect(-sc.w * 0.5, -sc.h * 0.5, sc.w, sc.h);
        ctx.restore();
      }
      ctx.restore();
    }

    if (variant === "sand-wheel") {
      const wheelR = minDim * 0.16;
      ctx.save();
      ctx.translate(W * 0.5, H * 0.45);
      ctx.rotate(this.wheelAngle);
      ctx.strokeStyle = "#C4FF2E";
      ctx.lineWidth = 4;
      for (let b = 0; b < 6; b++) {
        const a = (b / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * wheelR, Math.sin(a) * wheelR);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (variant === "sand-sieve") {
      // Crystal gems buried along bottom edge lighting up as sand sifts!
      ctx.save();
      for (let i = 0; i < 8; i++) {
        const gx = W * (0.16 + i * 0.095);
        const gy = H * 0.81;
        const lit = i < this.gemsRevealed;
        ctx.fillStyle = lit ? "#FACC15" : "rgba(255,255,255,0.16)";
        ctx.beginPath();
        ctx.moveTo(gx, gy - 14);
        ctx.lineTo(gx + 11, gy);
        ctx.lineTo(gx, gy + 14);
        ctx.lineTo(gx - 11, gy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    if (variant !== "sand-slice") {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = 3;
      ctx.strokeRect(W * 0.1, H * 0.14, W * 0.8, H * 0.71);
      ctx.fillStyle = "#F5F5F5";
      ctx.fillRect(this.emitterX - 18, H * 0.12, 36, 12);
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = "#E4E4E7";
    for (const peg of this.pegs) {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
