import { soundEngine } from "../audio";

export interface MarbleCompetitor {
  id: string;
  name: string;
  flag: string;
  color: string;
  radius: number;
}

export interface MarbleConfig {
  marbles: MarbleCompetitor[];
  gravity: number;
  elasticity: number;
  trackTheme: "neon" | "cyber" | "candy";
  topText: string;
  bottomText: string;
}

interface MarbleState {
  c: MarbleCompetitor;
  x: number;
  y: number;
  vx: number;
  vy: number;
  finished: boolean;
  finishRank: number;
  trail: { x: number; y: number }[];
}

interface Peg {
  x: number;
  y: number;
  r: number;
}

interface Spinner {
  x: number;
  y: number;
  len: number;
  angle: number;
  speed: number;
}

interface Ramp {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
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

export const DEFAULT_MARBLES: MarbleCompetitor[] = [
  { id: "in", name: "India", flag: "🇮🇳", color: "#FF9933", radius: 18 },
  { id: "us", name: "USA", flag: "🇺🇸", color: "#3B82F6", radius: 18 },
  { id: "br", name: "Brazil", flag: "🇧🇷", color: "#10B981", radius: 18 },
  { id: "jp", name: "Japan", flag: "🇯🇵", color: "#EF4444", radius: 18 },
  { id: "de", name: "Germany", flag: "🇩🇪", color: "#FBBF24", radius: 18 },
  { id: "gb", name: "UK", flag: "🇬🇧", color: "#8B5CF6", radius: 18 },
  { id: "fr", name: "France", flag: "🇫🇷", color: "#06B6D4", radius: 18 },
  { id: "ca", name: "Canada", flag: "🇨🇦", color: "#F43F5E", radius: 18 },
];

export class MarbleRaceSimulation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: MarbleConfig;
  private marbles: MarbleState[] = [];
  private pegs: Peg[] = [];
  private spinners: Spinner[] = [];
  private ramps: Ramp[] = [];
  private confetti: Confetti[] = [];
  private finishLineY: number = 0;
  private finishCounter: number = 0;
  private isRunning: boolean = true;
  private animId: number | null = null;
  private cameraY: number = 0;
  private courseHeight: number = 2800;

  constructor(canvas: HTMLCanvasElement, config: MarbleConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context");
    this.ctx = ctx;
    this.config = config;
    this.reset();
  }

  public updateConfig(newConfig: Partial<MarbleConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.marbles) {
      this.initMarbles();
    }
  }

  public reset() {
    this.finishCounter = 0;
    this.confetti = [];
    this.cameraY = 0;
    this.buildCourse();
    this.initMarbles();
  }

  private buildCourse() {
    const W = this.canvas.width;
    this.courseHeight = 2800;
    this.finishLineY = this.courseHeight - 200;

    this.pegs = [];
    this.spinners = [];
    this.ramps = [];

    // Section 1: Alternating ramps (Y: 200 - 900)
    this.ramps.push(
      { x1: 40, y1: 280, x2: W - 120, y2: 440 },
      { x1: W - 40, y1: 520, x2: 120, y2: 680 },
      { x1: 40, y1: 760, x2: W - 120, y2: 920 }
    );

    // Section 2: Spinners (Y: 1000 - 1350)
    this.spinners.push(
      { x: W * 0.28, y: 1100, len: 110, angle: 0, speed: 0.05 },
      { x: W * 0.72, y: 1100, len: 110, angle: Math.PI / 2, speed: -0.05 },
      { x: W * 0.5, y: 1300, len: 130, angle: Math.PI / 4, speed: 0.06 }
    );

    // Section 3: Plinko Peg Grid (Y: 1450 - 2100)
    const rows = 9;
    const cols = 9;
    for (let r = 0; r < rows; r++) {
      const y = 1480 + r * 70;
      const offset = (r % 2 === 0) ? 0 : 35;
      for (let c = 0; c < cols; c++) {
        const x = 70 + c * 70 + offset;
        if (x > 50 && x < W - 50) {
          this.pegs.push({ x, y, r: 8 });
        }
      }
    }

    // Section 4: Funnel ramps into finish (Y: 2200 - 2500)
    this.ramps.push(
      { x1: 40, y1: 2250, x2: W / 2 - 60, y2: 2450 },
      { x1: W - 40, y1: 2250, x2: W / 2 + 60, y2: 2450 },
      { x1: W / 2 - 60, y1: 2450, x2: W / 2 - 60, y2: 2580 },
      { x1: W / 2 + 60, y1: 2450, x2: W / 2 + 60, y2: 2580 }
    );
  }

  private initMarbles() {
    this.marbles = [];
    const competitors = this.config.marbles.length ? this.config.marbles : DEFAULT_MARBLES;
    const W = this.canvas.width;
    const spacing = (W - 100) / (competitors.length + 1);

    competitors.forEach((c, idx) => {
      this.marbles.push({
        c,
        x: 60 + (idx + 1) * spacing,
        y: 80 + Math.random() * 30,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 2,
        finished: false,
        finishRank: 0,
        trail: [],
      });
    });
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

    // Spinners rotation
    for (const sp of this.spinners) {
      sp.angle += sp.speed;
    }

    // Update confetti
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.2;
      c.rot += c.vRot;
      if (c.y > this.courseHeight) {
        this.confetti.splice(i, 1);
      }
    }

    // Step marbles
    for (const m of this.marbles) {
      // Trail
      m.trail.push({ x: m.x, y: m.y });
      if (m.trail.length > 15) m.trail.shift();

      m.vy += this.config.gravity || 0.45;
      m.vx *= 0.99; // slight air friction
      m.x += m.vx;
      m.y += m.vy;

      // Track side boundaries
      if (m.x - m.c.radius < 30) {
        m.x = 30 + m.c.radius;
        m.vx = Math.abs(m.vx) * 0.7;
        soundEngine.playClack();
      } else if (m.x + m.c.radius > W - 30) {
        m.x = W - 30 - m.c.radius;
        m.vx = -Math.abs(m.vx) * 0.7;
        soundEngine.playClack();
      }

      // Collide with ramps
      for (const ramp of this.ramps) {
        const dx = ramp.x2 - ramp.x1;
        const dy = ramp.y2 - ramp.y1;
        const lenSq = dx * dx + dy * dy;
        let t = ((m.x - ramp.x1) * dx + (m.y - ramp.y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));

        const closestX = ramp.x1 + t * dx;
        const closestY = ramp.y1 + t * dy;
        const dist = Math.hypot(m.x - closestX, m.y - closestY);

        if (dist < m.c.radius + 4) {
          const nx = (m.x - closestX) / (dist || 1);
          const ny = (m.y - closestY) / (dist || 1);

          m.x = closestX + nx * (m.c.radius + 4);
          m.y = closestY + ny * (m.c.radius + 4);

          // Dot product reflection
          const dot = m.vx * nx + m.vy * ny;
          m.vx = (m.vx - 1.6 * dot * nx);
          m.vy = (m.vy - 1.6 * dot * ny);

          // Downward roll force along ramp
          const rampDirX = dx / Math.sqrt(lenSq);
          const rampDirY = dy / Math.sqrt(lenSq);
          m.vx += rampDirX * 0.6;
          m.vy += rampDirY * 0.6;

          soundEngine.playBounce(0.6);
        }
      }

      // Collide with spinners
      for (const sp of this.spinners) {
        const p1x = sp.x - Math.cos(sp.angle) * sp.len;
        const p1y = sp.y - Math.sin(sp.angle) * sp.len;
        const p2x = sp.x + Math.cos(sp.angle) * sp.len;
        const p2y = sp.y + Math.sin(sp.angle) * sp.len;

        const sdx = p2x - p1x;
        const sdy = p2y - p1y;
        const slenSq = sdx * sdx + sdy * sdy;
        let st = ((m.x - p1x) * sdx + (m.y - p1y) * sdy) / slenSq;
        st = Math.max(0, Math.min(1, st));

        const scX = p1x + st * sdx;
        const scY = p1y + st * sdy;
        const sdist = Math.hypot(m.x - scX, m.y - scY);

        if (sdist < m.c.radius + 6) {
          const snx = (m.x - scX) / (sdist || 1);
          const sny = (m.y - scY) / (sdist || 1);

          m.x = scX + snx * (m.c.radius + 8);
          m.y = scY + sny * (m.c.radius + 8);

          // Give dynamic spinner kick
          const kickX = -Math.sin(sp.angle) * sp.speed * 80;
          const kickY = Math.cos(sp.angle) * sp.speed * 80;
          m.vx = kickX + snx * 5;
          m.vy = kickY + sny * 5;

          soundEngine.playBounce(1.2);
        }
      }

      // Collide with pegs
      for (const peg of this.pegs) {
        const pdx = m.x - peg.x;
        const pdy = m.y - peg.y;
        const pdist = Math.hypot(pdx, pdy);
        const minDist = m.c.radius + peg.r;

        if (pdist < minDist) {
          const pnx = pdx / (pdist || 1);
          const pny = pdy / (pdist || 1);

          m.x = peg.x + pnx * (minDist + 1);
          m.y = peg.y + pny * (minDist + 1);

          const dot = m.vx * pnx + m.vy * pny;
          m.vx = (m.vx - 1.8 * dot * pnx);
          m.vy = (m.vy - 1.8 * dot * pny);

          soundEngine.playBounce(0.8);
        }
      }

      // Check finish line
      if (!m.finished && m.y >= this.finishLineY) {
        m.finished = true;
        this.finishCounter++;
        m.finishRank = this.finishCounter;

        // Sound & confetti for podium
        soundEngine.playBounce(1.5, this.finishCounter);

        for (let k = 0; k < 35; k++) {
          this.confetti.push({
            x: m.x,
            y: m.y,
            vx: (Math.random() - 0.5) * 16,
            vy: (Math.random() - 0.8) * 16,
            color: m.c.color,
            size: Math.random() * 8 + 4,
            rot: Math.random() * Math.PI,
            vRot: (Math.random() - 0.5) * 0.2,
          });
        }
      }
    }

    // Camera follow the lead marble
    const leadMarble = [...this.marbles].sort((a, b) => b.y - a.y)[0];
    if (leadMarble) {
      const targetCamY = Math.max(0, Math.min(this.courseHeight - this.canvas.height, leadMarble.y - this.canvas.height * 0.45));
      this.cameraY += (targetCamY - this.cameraY) * 0.1;
    }
  }

  public render() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const camY = this.cameraY;

    // Background
    ctx.fillStyle = "#0c0d18";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(0, -camY);

    // Track outer borders
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(30, this.courseHeight);
    ctx.moveTo(W - 30, 0);
    ctx.lineTo(W - 30, this.courseHeight);
    ctx.stroke();

    // Draw ramps with neon glow
    for (const r of this.ramps) {
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#00F5FF";
      ctx.strokeStyle = "#00F5FF";
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(r.x1, r.y1);
      ctx.lineTo(r.x2, r.y2);
      ctx.stroke();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    // Draw spinners
    for (const sp of this.spinners) {
      ctx.save();
      ctx.shadowBlur = 16;
      ctx.shadowColor = "#FF007F";
      ctx.strokeStyle = "#FF007F";
      ctx.lineWidth = 8;
      ctx.beginPath();
      const p1x = sp.x - Math.cos(sp.angle) * sp.len;
      const p1y = sp.y - Math.sin(sp.angle) * sp.len;
      const p2x = sp.x + Math.cos(sp.angle) * sp.len;
      const p2y = sp.y + Math.sin(sp.angle) * sp.len;
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw pegs
    ctx.save();
    for (const peg of this.pegs) {
      ctx.fillStyle = "#FFE600";
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#FFE600";
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Finish Line
    ctx.save();
    const flY = this.finishLineY;
    const tileW = 24;
    for (let tx = 30; tx < W - 30; tx += tileW) {
      ctx.fillStyle = (Math.floor(tx / tileW) % 2 === 0) ? "#ffffff" : "#000000";
      ctx.fillRect(tx, flY, tileW, 20);
    }
    ctx.font = "bold 32px sans-serif";
    ctx.fillStyle = "#FFE600";
    ctx.textAlign = "center";
    ctx.fillText("🏁 FINISH LINE 🏁", W / 2, flY - 18);
    ctx.restore();

    // Draw Marbles
    for (const m of this.marbles) {
      // Trail
      if (m.trail.length > 1) {
        ctx.save();
        for (let i = 0; i < m.trail.length - 1; i++) {
          const pt1 = m.trail[i];
          const pt2 = m.trail[i + 1];
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.strokeStyle = m.c.color;
          ctx.lineWidth = m.c.radius * (i / m.trail.length);
          ctx.globalAlpha = 0.4 * (i / m.trail.length);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Marble sphere
      ctx.save();
      ctx.shadowBlur = 14;
      ctx.shadowColor = m.c.color;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.c.radius, 0, Math.PI * 2);
      ctx.fillStyle = m.c.color;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Flag / Name
      ctx.font = "18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(m.c.flag, m.x, m.y);

      // Name tag above
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 4;
      ctx.fillText(m.c.name, m.x, m.y - m.c.radius - 8);

      if (m.finished) {
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#FFE600";
        ctx.fillText(`#${m.finishRank}`, m.x, m.y + m.c.radius + 16);
      }
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

    ctx.restore(); // restore camera

    // Screen HUD: Top Overlay Leaderboard (Live rankings)
    ctx.save();
    const sorted = [...this.marbles].sort((a, b) => {
      if (a.finished && b.finished) return a.finishRank - b.finishRank;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.y - a.y; // leading by Y distance
    });

    // Draw Top 3 Badges
    const badgeW = 110;
    const startX = (W - (badgeW * 3 + 24)) / 2;
    sorted.slice(0, 3).forEach((m, idx) => {
      const bx = startX + idx * (badgeW + 12);
      ctx.fillStyle = "rgba(10, 10, 20, 0.85)";
      ctx.strokeStyle = idx === 0 ? "#FFE600" : idx === 1 ? "#C0C0C0" : "#CD7F32";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, 18, badgeW, 44, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(`${idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"} ${m.c.flag} ${m.c.name.slice(0, 5)}`, bx + badgeW / 2, 45);
    });

    // Custom Top Text overlay
    if (this.config.topText) {
      ctx.font = "900 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFE600";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 8;
      ctx.fillText(this.config.topText, W / 2, 95);
    }

    // Custom Bottom Text overlay
    if (this.config.bottomText) {
      ctx.font = "800 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 8;
      ctx.fillText(this.config.bottomText, W / 2, H - 40);
    }
    ctx.restore();
  }
}
