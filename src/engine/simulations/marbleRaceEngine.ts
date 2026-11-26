import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, createRng, drawBackground } from "../prng";
import { DEFAULT_MARBLES } from "@/lib/defaults";
import { MarbleParticipant, SimulationParams } from "@/types/simulation";

interface MarbleState {
  p: MarbleParticipant;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  eliminated: boolean;
  finished: boolean;
  finishRank: number;
  stallTimer: number;
  trail: { x: number; y: number }[];
}

interface Ramp {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  bouncy?: boolean;
}

interface Peg {
  x: number;
  y: number;
  r: number;
  boost?: number;
}

interface SpinnerWheel {
  x: number;
  y: number;
  len: number;
  blades: number; // 2 = bar, 4 = cross wheel
  angle: number;
  speed: number;
}

interface MovingGate {
  baseX: number;
  y: number;
  width: number;
  amp: number;
  phase: number;
  freq: number;
  currX: number;
}

interface Seesaw {
  x: number;
  y: number;
  len: number;
  angle: number;
  omega: number;
}

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rot: number;
  vRot: number;
}

export class MarbleRaceEngine extends BaseCanvasSimulation {
  private marbles: MarbleState[] = [];
  private ramps: Ramp[] = [];
  private pegs: Peg[] = [];
  private wheels: SpinnerWheel[] = [];
  private gates: MovingGate[] = [];
  private seesaws: Seesaw[] = [];
  private confetti: Confetti[] = [];
  private cameraY = 0;
  private courseHeight = 6200;
  private finishLineY = 5950;
  private finishCounter = 0;
  private checkpoint1Y = 2100;
  private checkpoint2Y = 4100;
  private cp1Triggered = false;
  private cp2Triggered = false;
  private winnerName = "";
  private postWinTimer = 0;
  private infiniteCycles = 0;

  protected onReset(): void {
    this.confetti = [];
    this.cameraY = 0;
    this.finishCounter = 0;
    this.cp1Triggered = false;
    this.cp2Triggered = false;
    this.winnerName = "";
    this.postWinTimer = 0;
    this.infiniteCycles = 0;
    this.buildCourse();
    this.initMarbles();
    this.statusLabel = "Racing";
  }

  protected onConfigUpdated(prev: SimulationParams, curr: SimulationParams): void {
    if (
      prev.trackStyle !== curr.trackStyle ||
      prev.trackDifficulty !== curr.trackDifficulty ||
      prev.seed !== curr.seed ||
      prev.marbles !== curr.marbles ||
      prev.objectCount !== curr.objectCount ||
      prev.variant !== curr.variant
    ) {
      this.reset();
    }
  }

  protected onResize(): void {
    this.buildCourse();
    this.initMarbles();
  }

  private buildCourse(): void {
    const W = this.canvas.width;
    const rng = createRng(this.params.seed);
    this.ramps = [];
    this.pegs = [];
    this.wheels = [];
    this.gates = [];
    this.seesaws = [];

    const style = this.params.trackStyle;
    const diffMult =
      this.params.trackDifficulty === "chaotic" ? 1.35 : this.params.trackDifficulty === "chill" ? 0.72 : 1.0;

    this.courseHeight = style === "infinite" ? 3200 : 6200;
    this.finishLineY = this.courseHeight - 260;
    this.checkpoint1Y = 2150;
    this.checkpoint2Y = 4250;

    if (style === "plinko") {
      // Multi-stage Plinko + Moving Gates + Boosters (far harder & longer)
      const rows = 30;
      const cols = 10;
      const marginX = W * 0.08;
      const spacingX = (W - marginX * 2) / cols;
      for (let r = 0; r < rows; r++) {
        const y = 260 + r * 155;
        const offset = r % 2 === 0 ? 0 : spacingX * 0.5;
        for (let c = 0; c <= cols; c++) {
          const x = marginX + c * spacingX + offset;
          if (x > 46 && x < W - 46) {
            const isBooster = r % 6 === 3 && c % 3 === 1;
            this.pegs.push({ x, y, r: isBooster ? 13 : 9, boost: isBooster ? 1.55 : 1 });
          }
        }
        if (r === 10 || r === 22) {
          this.gates.push({
            baseX: W * 0.5,
            y: y + 75,
            width: W * 0.34,
            amp: W * 0.25,
            phase: r,
            freq: 1.4 * diffMult,
            currX: W * 0.5,
          });
        }
      }
      this.wheels.push(
        { x: W * 0.33, y: 5050, len: W * 0.13, blades: 4, angle: 0, speed: 0.036 * diffMult },
        { x: W * 0.67, y: 5050, len: W * 0.13, blades: 4, angle: 0.5, speed: -0.036 * diffMult }
      );
      this.ramps.push(
        { x1: 30, y1: this.finishLineY - 260, x2: W * 0.38, y2: this.finishLineY - 40 },
        { x1: W - 30, y1: this.finishLineY - 260, x2: W * 0.62, y2: this.finishLineY - 40 }
      );
    } else if (style === "spiral") {
      // 14 steep switchbacks interrupted by wheels and moving gates
      for (let i = 0; i < 14; i++) {
        const yTop = 260 + i * 365;
        if (i % 2 === 0) {
          this.ramps.push({ x1: 34, y1: yTop, x2: W * 0.8, y2: yTop + 190 });
          this.pegs.push({ x: W * 0.87, y: yTop + 180, r: 12, boost: 1.35 });
        } else {
          this.ramps.push({ x1: W - 34, y1: yTop, x2: W * 0.2, y2: yTop + 190 });
          this.pegs.push({ x: W * 0.13, y: yTop + 180, r: 12, boost: 1.35 });
        }
        if (i % 3 === 1) {
          this.wheels.push({
            x: W * 0.5,
            y: yTop + 190,
            len: W * 0.11,
            blades: 4,
            angle: i * 0.7,
            speed: (i % 2 === 0 ? 0.034 : -0.034) * diffMult,
          });
        }
      }
      this.gates.push({
        baseX: W * 0.5,
        y: 5450,
        width: W * 0.32,
        amp: W * 0.24,
        phase: 0,
        freq: 1.8 * diffMult,
        currX: W * 0.5,
      });
    } else if (style === "infinite") {
      // Compact high-replayability looping track
      this.ramps.push(
        { x1: 34, y1: 280, x2: W * 0.78, y2: 450 },
        { x1: W - 34, y1: 580, x2: W * 0.22, y2: 750 }
      );
      this.wheels.push(
        { x: W * 0.32, y: 1020, len: W * 0.12, blades: 4, angle: 0, speed: 0.035 * diffMult },
        { x: W * 0.68, y: 1020, len: W * 0.12, blades: 4, angle: 0.4, speed: -0.035 * diffMult }
      );
      this.seesaws.push({ x: W * 0.5, y: 1420, len: W * 0.36, angle: 0.12, omega: 0 });
      this.gates.push({
        baseX: W * 0.5,
        y: 1780,
        width: W * 0.3,
        amp: W * 0.24,
        phase: 1,
        freq: 1.5 * diffMult,
        currX: W * 0.5,
      });
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
          const x = 95 + c * ((W - 190) / 6) + (r % 2 ? 32 : 0);
          if (x < W - 65) this.pegs.push({ x, y: 2050 + r * 115, r: 9 });
        }
      }
    } else if (style === "duel") {
      // Symmetrical twin-lane mirror duel obstacle track (6,200 px)
      for (let i = 0; i < 10; i++) {
        const y = 320 + i * 510;
        this.ramps.push(
          { x1: 36, y1: y, x2: W * 0.42, y2: y + 170 },
          { x1: W - 36, y1: y, x2: W * 0.58, y2: y + 170 },
          { x1: W * 0.5, y1: y + 190, x2: W * 0.24, y2: y + 340, bouncy: i % 2 === 0 },
          { x1: W * 0.5, y1: y + 190, x2: W * 0.76, y2: y + 340, bouncy: i % 2 === 0 }
        );
        this.wheels.push({
          x: W * 0.5,
          y: y + 110,
          len: W * 0.11,
          blades: 4,
          angle: i * 0.4,
          speed: (i % 2 === 0 ? 0.038 : -0.038) * diffMult,
        });
      }
      this.gates.push({
        baseX: W * 0.5,
        y: 5450,
        width: W * 0.28,
        amp: W * 0.22,
        phase: 0,
        freq: 2.0 * diffMult,
        currX: W * 0.5,
      });
    } else if (style === "funnel") {
      // Stacked converging cyclone funnels with spinner wheels at exit throats
      for (let f = 0; f < 6; f++) {
        const yTop = 280 + f * 880;
        this.ramps.push(
          { x1: 32, y1: yTop, x2: W * 0.42, y2: yTop + 310 },
          { x1: W - 32, y1: yTop, x2: W * 0.58, y2: yTop + 310 },
          { x1: W * 0.36, y1: yTop + 470, x2: 52, y2: yTop + 650, bouncy: true },
          { x1: W * 0.64, y1: yTop + 470, x2: W - 52, y2: yTop + 650, bouncy: true }
        );
        this.wheels.push({
          x: W * 0.5,
          y: yTop + 370,
          len: W * 0.14,
          blades: 4,
          angle: f * 0.6,
          speed: (f % 2 === 0 ? 0.042 : -0.042) * diffMult,
        });
      }
    } else if (style === "pinball") {
      // High-bounce pinball bumper arena with seesaws & side kickers
      const rows = 20;
      for (let r = 0; r < rows; r++) {
        const y = 320 + r * 265;
        const count = r % 2 === 0 ? 5 : 4;
        for (let c = 0; c < count; c++) {
          const frac = (c + 1) / (count + 1);
          const isMega = (r + c) % 3 === 0;
          this.pegs.push({
            x: W * (0.1 + frac * 0.8),
            y,
            r: isMega ? 18 : 11,
            boost: isMega ? 1.85 : 1.35,
          });
        }
        if (r % 4 === 2) {
          this.seesaws.push({ x: W * 0.5, y: y + 125, len: W * 0.38, angle: 0.14, omega: 0 });
        }
      }
    } else if (style === "pyramid") {
      // Twin stacked geometric pyramid splitters leading to final chute
      for (let p = 0; p < 7; p++) {
        const apexY = 300 + p * 760;
        const baseY = apexY + 290;
        this.ramps.push(
          { x1: W * 0.5, y1: apexY, x2: W * 0.16, y2: baseY, bouncy: true },
          { x1: W * 0.5, y1: apexY, x2: W * 0.84, y2: baseY, bouncy: true },
          { x1: 36, y1: baseY + 120, x2: W * 0.42, y2: baseY + 340 },
          { x1: W - 36, y1: baseY + 120, x2: W * 0.58, y2: baseY + 340 }
        );
        this.pegs.push(
          { x: W * 0.25, y: baseY + 55, r: 14, boost: 1.5 },
          { x: W * 0.75, y: baseY + 55, r: 14, boost: 1.5 }
        );
      }
    } else {
      // EPIC 7-STAGE COUNTRY / OBSTACLE / ELIMINATION / TEAM MARBLE GAUNTLET (6,200 px)

      // Stage 1 (260 - 1100): Alternating Ramps + Bouncy Bumpers
      this.ramps.push(
        { x1: 34, y1: 270, x2: W * 0.76, y2: 430 },
        { x1: W - 34, y1: 530, x2: W * 0.24, y2: 690 },
        { x1: 34, y1: 790, x2: W * 0.72, y2: 950 }
      );
      this.pegs.push(
        { x: W * 0.46, y: 310, r: 14, boost: 1.5 },
        { x: W * 0.54, y: 570, r: 14, boost: 1.5 },
        { x: W * 0.42, y: 830, r: 14, boost: 1.5 }
      );

      // Stage 2 (1150 - 1750): Twin Oscillating Horizontal Sliding Gates + Bottlenecks
      this.ramps.push(
        { x1: 34, y1: 1120, x2: W * 0.36, y2: 1260 },
        { x1: W - 34, y1: 1120, x2: W * 0.64, y2: 1260 }
      );
      this.gates.push(
        { baseX: W * 0.5, y: 1290, width: W * 0.34, amp: W * 0.25, phase: 0, freq: 1.5 * diffMult, currX: W * 0.5 },
        { baseX: W * 0.5, y: 1560, width: W * 0.36, amp: W * 0.26, phase: 2.1, freq: 1.9 * diffMult, currX: W * 0.5 }
      );

      // Stage 3 (1820 - 2550): 4-Blade Counter-Rotating Propeller Wheels
      this.wheels.push(
        { x: W * 0.3, y: 1920, len: W * 0.13, blades: 4, angle: 0, speed: 0.036 * diffMult },
        { x: W * 0.7, y: 1920, len: W * 0.13, blades: 4, angle: 0.5, speed: -0.036 * diffMult },
        { x: W * 0.5, y: 2240, len: W * 0.15, blades: 4, angle: 0.25, speed: 0.044 * diffMult },
        { x: W * 0.28, y: 2480, len: W * 0.11, blades: 2, angle: 1.1, speed: -0.048 * diffMult },
        { x: W * 0.72, y: 2480, len: W * 0.11, blades: 2, angle: 0.3, speed: 0.048 * diffMult }
      );

      // Stage 4 (2680 - 3400): Dynamic Tilting Seesaws + Side Catchers
      this.seesaws.push(
        { x: W * 0.36, y: 2820, len: W * 0.32, angle: 0.15, omega: 0 },
        { x: W * 0.64, y: 3120, len: W * 0.32, angle: -0.15, omega: 0 }
      );
      this.ramps.push(
        { x1: W * 0.85, y1: 2740, x2: W * 0.96, y2: 2920, bouncy: true },
        { x1: W * 0.15, y1: 3040, x2: W * 0.04, y2: 3220, bouncy: true }
      );

      // Stage 5 (3460 - 4550): Dense Plinko Labyrinth with High-Bounce Bumper Pads
      const rows = 9;
      const cols = 8;
      const gap = (W - 120) / cols;
      for (let r = 0; r < rows; r++) {
        const y = 3480 + r * 115;
        const offset = r % 2 === 0 ? 0 : gap * 0.5;
        for (let c = 0; c <= cols; c++) {
          const x = 60 + c * gap + offset;
          if (x > 48 && x < W - 48) {
            const isBumper = (r === 2 || r === 6) && (c === 2 || c === 6);
            this.pegs.push({ x, y, r: isBumper ? 16 : 9, boost: isBumper ? 1.65 : 1 });
          }
        }
      }

      // Stage 6 (4680 - 5420): Narrow Choke Funnel + Moving Gate + Upward Launch Wheels
      this.ramps.push(
        { x1: 34, y1: 4680, x2: W * 0.39, y2: 4920 },
        { x1: W - 34, y1: 4680, x2: W * 0.61, y2: 4920 },
        { x1: W * 0.32, y1: 5160, x2: 40, y2: 5360, bouncy: true },
        { x1: W * 0.68, y1: 5160, x2: W - 40, y2: 5360, bouncy: true }
      );
      this.gates.push({
        baseX: W * 0.5,
        y: 4960,
        width: W * 0.26,
        amp: W * 0.2,
        phase: 1.2,
        freq: 2.1 * diffMult,
        currX: W * 0.5,
      });

      // Stage 7 (5480 - 5950): Final Twin Spinner Photo-Finish Sprint
      this.wheels.push(
        { x: W * 0.36, y: 5560, len: W * 0.12, blades: 4, angle: 0.4, speed: 0.042 * diffMult },
        { x: W * 0.64, y: 5560, len: W * 0.12, blades: 4, angle: 0.9, speed: -0.042 * diffMult }
      );
      this.ramps.push(
        { x1: 34, y1: 5720, x2: W * 0.41, y2: this.finishLineY - 20 },
        { x1: W - 34, y1: 5720, x2: W * 0.59, y2: this.finishLineY - 20 }
      );

      // Small randomness variation from seed
      if (style === "obstacle") {
        for (let p = 0; p < 10; p++) {
          this.pegs.push({
            x: 80 + rng() * (W - 160),
            y: 1380 + rng() * 3800,
            r: 12,
            boost: 1.45,
          });
        }
      }
    }
  }

  private initMarbles(): void {
    const rng = createRng(this.params.seed + 7);
    const W = this.canvas.width;
    const baseList = this.params.marbles.length ? this.params.marbles : DEFAULT_MARBLES;

    const list = [...baseList];
    if (this.params.variant === "random-winner") {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }

    const r = clamp(W * 0.0165 * this.params.objectSize, 10, 26);
    const spacing = (W - 100) / (list.length + 1);
    this.marbles = list.map((p, idx) => ({
      p:
        this.params.trackStyle === "team"
          ? { ...p, color: idx % 2 === 0 ? "#38BDF8" : "#F43F5E", team: idx % 2 === 0 ? "A" : "B" }
          : p,
      x: 50 + (idx + 1) * spacing,
      y: 105 + rng() * 28,
      vx: (rng() - 0.5) * 3.0,
      vy: rng() * 1.8,
      radius: r,
      eliminated: false,
      finished: false,
      finishRank: 0,
      stallTimer: 0,
      trail: [],
    }));
    this.activeObjects = this.marbles.length;
  }

  private collideSegment(
    m: MarbleState,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    boostFactor: number,
    slidePush: number,
    W: number
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy || 1;
    const t = clamp(((m.x - x1) * dx + (m.y - y1) * dy) / lenSq, 0, 1);
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    const dist = Math.hypot(m.x - cx, m.y - cy);
    if (dist < m.radius + thickness) {
      const nx = (m.x - cx) / (dist || 1);
      const ny = (m.y - cy) / (dist || 1);
      m.x = cx + nx * (m.radius + thickness);
      m.y = cy + ny * (m.radius + thickness);
      const dot = m.vx * nx + m.vy * ny;
      if (dot < 0) {
        m.vx = m.vx - (1 + 0.55 * this.params.bounce * boostFactor) * dot * nx;
        m.vy = m.vy - (1 + 0.55 * this.params.bounce * boostFactor) * dot * ny;
      }
      if (slidePush !== 0) {
        const len = Math.sqrt(lenSq);
        m.vx += (dx / len) * slidePush;
        m.vy += (dy / len) * slidePush;
      }
      soundEngine.playImpact(0.5, undefined, (m.x / W) * 2 - 1);
      return true;
    }
    return false;
  }

  public stepFixed(dt: number): void {
    const step = dt * 60;
    const W = this.canvas.width;

    // Spin wheels
    for (const wh of this.wheels) {
      wh.angle += wh.speed * step;
    }

    // Oscillate moving gates
    for (const g of this.gates) {
      g.currX = g.baseX + Math.sin(this.elapsedSeconds * g.freq + g.phase) * g.amp;
    }

    // Relax seesaws gently back toward equilibrium with damping
    for (const sw of this.seesaws) {
      sw.angle += sw.omega * step;
      sw.omega *= 0.94;
      sw.omega += -sw.angle * 0.008 * step;
      sw.angle = clamp(sw.angle, -0.58, 0.58);
    }

    // Update confetti
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.x += c.vx * step;
      c.y += c.vy * step;
      c.vy += 0.22 * step;
      c.rot += c.vRot * step;
      if (c.y > this.courseHeight) this.confetti.splice(i, 1);
    }

    const grav = 0.34 * this.params.gravity * step;

    for (const m of this.marbles) {
      if (m.eliminated) continue;

      if (this.params.trailEffects) {
        m.trail.push({ x: m.x, y: m.y });
        while (m.trail.length > 14) m.trail.shift();
      } else {
        m.trail = [];
      }

      m.vy += grav;
      m.vx *= 0.992;
      m.x += m.vx * step;
      m.y += m.vy * step;

      // Anti-stall nudge
      if (!m.finished && Math.hypot(m.vx, m.vy) < 0.28) {
        m.stallTimer += dt;
        if (m.stallTimer > 0.28) {
          m.vx += m.x < W / 2 ? 1.4 : -1.4;
          m.vy += 0.6;
          m.stallTimer = 0;
        }
      } else {
        m.stallTimer = 0;
      }

      if (this.params.trackStyle === "infinite" && m.y > this.courseHeight - 80) {
        m.y = 80;
        m.vy = 2;
        m.trail = [];
        this.infiniteCycles++;
        if (this.infiniteCycles >= this.marbles.length * 3) {
          this.markCompleted("Infinite Drop Complete!", "3 full loop cycles completed.");
          return;
        }
      }

      if (m.x - m.radius < 28) {
        m.x = 28 + m.radius;
        m.vx = Math.abs(m.vx) * 0.72;
        soundEngine.playClack(-0.8);
      } else if (m.x + m.radius > W - 28) {
        m.x = W - 28 - m.radius;
        m.vx = -Math.abs(m.vx) * 0.72;
        soundEngine.playClack(0.8);
      }

      for (const ramp of this.ramps) {
        this.collideSegment(
          m,
          ramp.x1,
          ramp.y1,
          ramp.x2,
          ramp.y2,
          5,
          ramp.bouncy ? 1.45 : 1,
          ramp.bouncy ? 0 : 0.42 * step,
          W
        );
      }

      for (const g of this.gates) {
        this.collideSegment(m, g.currX - g.width * 0.5, g.y, g.currX + g.width * 0.5, g.y, 7, 1.15, 0, W);
      }

      for (const sw of this.seesaws) {
        const p1x = sw.x - Math.cos(sw.angle) * sw.len;
        const p1y = sw.y - Math.sin(sw.angle) * sw.len;
        const p2x = sw.x + Math.cos(sw.angle) * sw.len;
        const p2y = sw.y + Math.sin(sw.angle) * sw.len;
        if (this.collideSegment(m, p1x, p1y, p2x, p2y, 6, 1.0, 0, W)) {
          const offset = (m.x - sw.x) / Math.max(1, sw.len);
          sw.omega += offset * 0.015;
        }
      }

      for (const wh of this.wheels) {
        const bladeStep = Math.PI / (wh.blades / 2);
        for (let b = 0; b < wh.blades / 2; b++) {
          const ang = wh.angle + b * bladeStep;
          const p1x = wh.x - Math.cos(ang) * wh.len;
          const p1y = wh.y - Math.sin(ang) * wh.len;
          const p2x = wh.x + Math.cos(ang) * wh.len;
          const p2y = wh.y + Math.sin(ang) * wh.len;
          const dx = p2x - p1x;
          const dy = p2y - p1y;
          const lenSq = dx * dx + dy * dy || 1;
          const t = clamp(((m.x - p1x) * dx + (m.y - p1y) * dy) / lenSq, 0, 1);
          const cx = p1x + t * dx;
          const cy = p1y + t * dy;
          const dist = Math.hypot(m.x - cx, m.y - cy);
          if (dist < m.radius + 6) {
            const nx = (m.x - cx) / (dist || 1);
            const ny = (m.y - cy) / (dist || 1);
            m.x = cx + nx * (m.radius + 7);
            m.y = cy + ny * (m.radius + 7);
            m.vx = -Math.sin(ang) * wh.speed * 68 + nx * 4.5;
            m.vy = Math.cos(ang) * wh.speed * 68 + ny * 4.5;
            soundEngine.playImpact(0.9, undefined, (m.x / W) * 2 - 1);
          }
        }
      }

      for (const peg of this.pegs) {
        const dx = m.x - peg.x;
        const dy = m.y - peg.y;
        const dist = Math.hypot(dx, dy);
        const minDist = m.radius + peg.r;
        if (dist < minDist) {
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          m.x = peg.x + nx * (minDist + 1);
          m.y = peg.y + ny * (minDist + 1);
          const dot = m.vx * nx + m.vy * ny;
          if (dot < 0) {
            const b = peg.boost || 1;
            m.vx = (m.vx - 1.75 * dot * nx) * 0.96 * b;
            m.vy = (m.vy - 1.75 * dot * ny) * 0.96 * b;
          }
          soundEngine.playImpact(0.5, undefined, (m.x / W) * 2 - 1);
        }
      }

      if (this.params.trackStyle !== "infinite" && !m.finished && m.y >= this.finishLineY) {
        m.finished = true;
        this.finishCounter++;
        m.finishRank = this.finishCounter;
        this.eventsCount++;
        if (this.finishCounter === 1) {
          this.winnerName = `${m.p.flag ? m.p.flag + " " : ""}${m.p.name}`;
          this.postWinTimer = 0;
        }
        soundEngine.playImpact(1.4, this.finishCounter + 3, (m.x / W) * 2 - 1);
        if (this.params.confettiEnabled) {
          for (let k = 0; k < 34; k++) {
            this.confetti.push({
              x: m.x,
              y: m.y,
              vx: (Math.random() - 0.5) * 14,
              vy: -Math.random() * 13 - 2,
              color: m.p.color,
              size: 6 + Math.random() * 6,
              rot: Math.random() * Math.PI,
              vRot: (Math.random() - 0.5) * 0.2,
            });
          }
        }
      }
    }

    // Marble-to-marble collisions
    for (let i = 0; i < this.marbles.length; i++) {
      for (let j = i + 1; j < this.marbles.length; j++) {
        const a = this.marbles[i];
        const b = this.marbles[j];
        if (a.eliminated || b.eliminated) continue;
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
          const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rel > 0) {
            a.vx -= rel * 0.85 * nx;
            a.vy -= rel * 0.85 * ny;
            b.vx += rel * 0.85 * nx;
            b.vy += rel * 0.85 * ny;
          }
        }
      }
    }

    // Two-stage Elimination gates in elimination track mode
    if (this.params.trackStyle === "elimination") {
      const alive = this.marbles.filter((m) => !m.eliminated);
      if (!this.cp1Triggered && alive.length > 3 && alive.filter((m) => m.y >= this.checkpoint1Y).length >= alive.length - 1) {
        this.cp1Triggered = true;
        const trailing = [...alive].sort((a, b) => a.y - b.y)[0];
        if (trailing) {
          trailing.eliminated = true;
          soundEngine.playClack(0);
        }
      }
      const alive2 = this.marbles.filter((m) => !m.eliminated);
      if (!this.cp2Triggered && alive2.length > 2 && alive2.filter((m) => m.y >= this.checkpoint2Y).length >= alive2.length - 1) {
        this.cp2Triggered = true;
        const trailing = [...alive2].sort((a, b) => a.y - b.y)[0];
        if (trailing) {
          trailing.eliminated = true;
          soundEngine.playClack(0);
        }
      }
    }

    const active = this.marbles.filter((m) => !m.eliminated);
    const lead = [...active].sort((a, b) => b.y - a.y)[0];
    if (lead) {
      this.progressPct = clamp(Math.round((lead.y / this.finishLineY) * 100), 0, 100);
      const targetY = clamp(
        lead.y - this.canvas.height * 0.42,
        0,
        Math.max(0, this.courseHeight - this.canvas.height)
      );
      this.cameraY += (targetY - this.cameraY) * 0.1 * step;
    }

    // Let top 3 finish (or 1.6s after winner) then trigger Win / Start Again
    if (this.winnerName) {
      this.postWinTimer += dt;
      const topFinished = this.finishCounter >= Math.min(3, active.length);
      if (topFinished || this.postWinTimer > 1.8) {
        this.markCompleted(`${this.winnerName} Wins!`, "Race finished through all 7 obstacle stages.", this.winnerName);
      }
    }
    this.activeObjects = active.length;
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);
    const camY = this.cameraY;

    ctx.save();
    ctx.translate(0, -camY);

    // Side rails
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(28, this.courseHeight);
    ctx.moveTo(W - 28, 0);
    ctx.lineTo(W - 28, this.courseHeight);
    ctx.stroke();

    // Elimination zones
    if (this.params.trackStyle === "elimination") {
      for (const cy of [this.checkpoint1Y, this.checkpoint2Y]) {
        ctx.save();
        ctx.strokeStyle = "rgba(239, 68, 68, 0.55)";
        ctx.setLineDash([12, 8]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(30, cy);
        ctx.lineTo(W - 30, cy);
        ctx.stroke();
        ctx.fillStyle = "#EF4444";
        ctx.font = "700 18px Inter, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("ELIMINATION GATE", W - 44, cy - 10);
        ctx.restore();
      }
    }

    // Ramps
    for (const r of this.ramps) {
      ctx.save();
      ctx.strokeStyle = r.bouncy ? "#F43F5E" : this.params.colors[0] || "#C4FF2E";
      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(r.x1, r.y1);
      ctx.lineTo(r.x2, r.y2);
      ctx.stroke();
      ctx.restore();
    }

    // Moving Sliding Gates
    for (const g of this.gates) {
      ctx.save();
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(g.currX - g.width * 0.5, g.y);
      ctx.lineTo(g.currX + g.width * 0.5, g.y);
      ctx.stroke();
      ctx.restore();
    }

    // Dynamic Seesaws
    for (const sw of this.seesaws) {
      ctx.save();
      ctx.strokeStyle = "#A855F7";
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sw.x - Math.cos(sw.angle) * sw.len, sw.y - Math.sin(sw.angle) * sw.len);
      ctx.lineTo(sw.x + Math.cos(sw.angle) * sw.len, sw.y + Math.sin(sw.angle) * sw.len);
      ctx.stroke();
      ctx.fillStyle = "#F5F5F5";
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Wheels (2 or 4 blades)
    for (const wh of this.wheels) {
      ctx.save();
      ctx.strokeStyle = this.params.colors[1] || "#38BDF8";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      const bladeStep = Math.PI / (wh.blades / 2);
      for (let b = 0; b < wh.blades / 2; b++) {
        const ang = wh.angle + b * bladeStep;
        ctx.beginPath();
        ctx.moveTo(wh.x - Math.cos(ang) * wh.len, wh.y - Math.sin(ang) * wh.len);
        ctx.lineTo(wh.x + Math.cos(ang) * wh.len, wh.y + Math.sin(ang) * wh.len);
        ctx.stroke();
      }
      ctx.fillStyle = "#F5F5F5";
      ctx.beginPath();
      ctx.arc(wh.x, wh.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Pegs & Boosters
    for (const peg of this.pegs) {
      ctx.save();
      ctx.fillStyle = peg.boost && peg.boost > 1 ? "#F43F5E" : this.params.colors[2] || "#FACC15";
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
      ctx.fill();
      if (peg.boost && peg.boost > 1) {
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Finish line
    if (this.params.trackStyle !== "infinite") {
      const tileW = 24;
      for (let x = 28; x < W - 28; x += tileW) {
        ctx.fillStyle = Math.floor(x / tileW) % 2 === 0 ? "#F5F5F5" : "#141416";
        ctx.fillRect(x, this.finishLineY, Math.min(tileW, W - 28 - x), 18);
      }
    }

    // Marbles
    for (const m of this.marbles) {
      if (m.eliminated) continue;
      if (m.trail.length > 1) {
        ctx.save();
        for (let i = 0; i < m.trail.length - 1; i++) {
          ctx.beginPath();
          ctx.moveTo(m.trail[i].x, m.trail[i].y);
          ctx.lineTo(m.trail[i + 1].x, m.trail[i + 1].y);
          ctx.strokeStyle = m.p.color;
          ctx.lineWidth = m.radius * ((i + 1) / m.trail.length);
          ctx.globalAlpha = 0.35 * ((i + 1) / m.trail.length);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = m.p.color;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (m.p.flag) {
        ctx.font = `${Math.round(m.radius * 1.05)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(m.p.flag, m.x, m.y + 1);
      }

      ctx.font = `700 ${Math.max(11, Math.round(m.radius * 0.68))}px Inter, sans-serif`;
      ctx.fillStyle = "#F5F5F5";
      ctx.textAlign = "center";
      ctx.fillText(m.p.name, m.x, m.y - m.radius - 10);
      ctx.restore();
    }

    // Confetti
    for (const c of this.confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
      ctx.restore();
    }

    ctx.restore();

    // Screen HUD: Live Leaderboard & Course Progress Bar
    if (this.params.showLeaderboard) {
      const sorted = [...this.marbles]
        .filter((m) => !m.eliminated)
        .sort((a, b) => {
          if (a.finished && b.finished) return a.finishRank - b.finishRank;
          if (a.finished) return -1;
          if (b.finished) return 1;
          return b.y - a.y;
        });

      const hudScale = Math.max(0.72, Math.min(W, H) / 1080);
      const badgeW = Math.round(168 * hudScale);
      const badgeH = Math.round(38 * hudScale);
      const gap = Math.round(10 * hudScale);
      const totalW = badgeW * 3 + gap * 2;
      const startX =
        W > H * 1.1 && !this.isExportingMode
          ? Math.max(180, W - totalW - Math.round(24 * hudScale))
          : (W - totalW) / 2;
      const topY = Math.round(14 * hudScale);

      sorted.slice(0, 3).forEach((m, idx) => {
        const bx = startX + idx * (badgeW + gap);
        ctx.save();
        ctx.fillStyle = "rgba(20, 20, 22, 0.88)";
        ctx.strokeStyle = idx === 0 ? "#C4FF2E" : "#29292D";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bx, topY, badgeW, badgeH, 8);
        ctx.fill();
        ctx.stroke();
        ctx.font = `700 ${Math.max(11, Math.round(14 * hudScale))}px Inter, sans-serif`;
        ctx.fillStyle = "#F5F5F5";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const displayName = m.p.name.length > 9 ? `${m.p.name.slice(0, 8)}…` : m.p.name;
        ctx.fillText(
          `#${idx + 1} ${m.p.flag} ${displayName}`,
          bx + badgeW / 2,
          topY + badgeH / 2,
          badgeW - 14
        );
        ctx.restore();
      });

      // Right-edge course progress bar
      if (this.params.trackStyle !== "infinite") {
        const barH = H * 0.4;
        const barTop = H * 0.3;
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(W - 14, barTop, 5, barH);
        ctx.fillStyle = "#C4FF2E";
        ctx.fillRect(W - 14, barTop, 5, (barH * this.progressPct) / 100);
        ctx.restore();
      }
    }

    if (this.winnerName) {
      ctx.save();
      const boxW = Math.min(W * 0.8, 520);
      ctx.fillStyle = "rgba(20, 20, 22, 0.92)";
      ctx.strokeStyle = "#C4FF2E";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(W / 2 - boxW / 2, H * 0.44, boxW, 96, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#C4FF2E";
      ctx.font = "800 32px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`WINNER: ${this.winnerName}`, W / 2, H * 0.44 + 48);
      ctx.restore();
    }
  }
}
