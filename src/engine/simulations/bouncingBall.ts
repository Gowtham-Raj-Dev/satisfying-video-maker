import { soundEngine } from "../audio";

export interface BallConfig {
  shape: "circle" | "hexagon" | "octagon" | "triangle" | "star";
  rotationSpeed: number; // degrees per frame
  gravity: number;
  elasticity: number; // 0.8 - 1.05 (speed multiplier)
  ballCount: number;
  ballRadius: number;
  trailLength: number;
  colors: string[];
  bgColor: string;
  topText: string;
  bottomText: string;
  speedIncrement: number; // percentage speedup per bounce
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  bounces: number;
  trail: { x: number; y: number }[];
}

export class BouncingBallSimulation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: BallConfig;
  private balls: Ball[] = [];
  private particles: Particle[] = [];
  private ripples: Ripple[] = [];
  private angle: number = 0;
  private totalBounces: number = 0;
  private isRunning: boolean = true;
  private animId: number | null = null;

  constructor(canvas: HTMLCanvasElement, config: BallConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context");
    this.ctx = ctx;
    this.config = config;
    this.reset();
  }

  public updateConfig(newConfig: Partial<BallConfig>) {
    const needBallReinit = newConfig.ballCount !== undefined && newConfig.ballCount !== this.config.ballCount;
    this.config = { ...this.config, ...newConfig };
    if (needBallReinit) {
      this.initBalls();
    }
  }

  public reset() {
    this.balls = [];
    this.particles = [];
    this.ripples = [];
    this.angle = 0;
    this.totalBounces = 0;
    this.initBalls();
  }

  private initBalls() {
    this.balls = [];
    const count = this.config.ballCount || 1;
    const colors = this.config.colors;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    for (let i = 0; i < count; i++) {
      const offsetAngle = (i / count) * Math.PI * 2;
      const dist = 30 + (i * 15);
      const color = colors[i % colors.length];

      this.balls.push({
        x: centerX + Math.cos(offsetAngle) * dist,
        y: centerY + Math.sin(offsetAngle) * dist,
        vx: (Math.random() - 0.5) * 8 + 3,
        vy: (Math.random() - 0.5) * 8 - 4,
        radius: this.config.ballRadius,
        color,
        bounces: 0,
        trail: [],
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
    const H = this.canvas.height;
    const cX = W / 2;
    const cY = H / 2;
    const shapeRadius = Math.min(W, H) * 0.42;

    // Rotate shape
    this.angle += (this.config.rotationSpeed * Math.PI) / 180;

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gentle gravity
      p.alpha -= 0.02;
      p.size = Math.max(0, p.size - 0.05);
      if (p.alpha <= 0 || p.size <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += 4;
      r.alpha -= 0.03;
      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }

    // Get shape vertices
    const vertices = this.getShapeVertices(cX, cY, shapeRadius, this.angle, this.config.shape);

    // Update each ball
    for (const ball of this.balls) {
      // Trail tracking
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > this.config.trailLength) {
        ball.trail.shift();
      }

      // Physics integration
      ball.vy += this.config.gravity;
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Collision detection with shape boundary
      if (this.config.shape === "circle") {
        const dx = ball.x - cX;
        const dy = ball.y - cY;
        const dist = Math.hypot(dx, dy);

        if (dist + ball.radius >= shapeRadius) {
          // Normal vector pointing inward
          const nx = -dx / dist;
          const ny = -dy / dist;

          // Push ball inside boundary
          ball.x = cX - nx * (shapeRadius - ball.radius - 1);
          ball.y = cY - ny * (shapeRadius - ball.radius - 1);

          // Dot product for reflection
          const dot = ball.vx * nx + ball.vy * ny;
          const speedMultiplier = 1 + (this.config.speedIncrement / 100);
          const el = this.config.elasticity * speedMultiplier;

          ball.vx = (ball.vx - 2 * dot * nx) * el;
          ball.vy = (ball.vy - 2 * dot * ny) * el;

          // Tangential rotational friction/boost
          const tangentX = -ny;
          const tangentY = nx;
          const rotSpeed = this.config.rotationSpeed * 0.15;
          ball.vx += tangentX * rotSpeed;
          ball.vy += tangentY * rotSpeed;

          // Trigger bounce events
          this.onBounce(ball, ball.x, ball.y, nx, ny);
        }
      } else {
        // Polygon collision (segments between consecutive vertices)
        for (let j = 0; j < vertices.length; j++) {
          const v1 = vertices[j];
          const v2 = vertices[(j + 1) % vertices.length];

          const lineX = v2.x - v1.x;
          const lineY = v2.y - v1.y;
          const lineLenSq = lineX * lineX + lineY * lineY;

          const toBallX = ball.x - v1.x;
          const toBallY = ball.y - v1.y;

          // Projection parameter t
          let t = (toBallX * lineX + toBallY * lineY) / lineLenSq;
          t = Math.max(0, Math.min(1, t));

          const closestX = v1.x + t * lineX;
          const closestY = v1.y + t * lineY;

          const dist = Math.hypot(ball.x - closestX, ball.y - closestY);

          if (dist < ball.radius) {
            // Collision normal pointing away from segment
            let nx = (ball.x - closestX) / (dist || 1);
            let ny = (ball.y - closestY) / (dist || 1);

            // Move ball outside of segment
            ball.x = closestX + nx * (ball.radius + 1);
            ball.y = closestY + ny * (ball.radius + 1);

            // Reflect velocity
            const dot = ball.vx * nx + ball.vy * ny;
            const speedMultiplier = 1 + (this.config.speedIncrement / 100);
            const el = this.config.elasticity * speedMultiplier;

            ball.vx = (ball.vx - 2 * dot * nx) * el;
            ball.vy = (ball.vy - 2 * dot * ny) * el;

            this.onBounce(ball, closestX, closestY, nx, ny);
            break;
          }
        }
      }

      // Ball to ball collision (if multiple balls)
      for (const other of this.balls) {
        if (other === ball) continue;
        const bdx = other.x - ball.x;
        const bdy = other.y - ball.y;
        const bDist = Math.hypot(bdx, bdy);
        const minDist = ball.radius + other.radius;

        if (bDist < minDist && bDist > 0) {
          const bnx = bdx / bDist;
          const bny = bdy / bDist;

          // Separate balls
          const overlap = (minDist - bDist) / 2;
          ball.x -= bnx * overlap;
          ball.y -= bny * overlap;
          other.x += bnx * overlap;
          other.y += bny * overlap;

          // Swap velocities along normal
          const p = 2 * (ball.vx * bnx + ball.vy * bny - other.vx * bnx - other.vy * bny) / 2;
          ball.vx -= p * bnx;
          ball.vy -= p * bny;
          other.vx += p * bnx;
          other.vy += p * bny;

          soundEngine.playClack();
        }
      }
    }
  }

  private onBounce(ball: Ball, x: number, y: number, nx: number, ny: number) {
    ball.bounces++;
    this.totalBounces++;

    // Play ASMR Chime with pitch based on bounce count
    const speed = Math.hypot(ball.vx, ball.vy);
    soundEngine.playBounce(speed / 10, ball.bounces);

    // Spawn sparks
    for (let k = 0; k < 18; k++) {
      const sparkAngle = Math.atan2(ny, nx) + (Math.random() - 0.5) * Math.PI;
      const sparkSpeed = Math.random() * 8 + 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(sparkAngle) * sparkSpeed,
        vy: Math.sin(sparkAngle) * sparkSpeed,
        color: ball.color,
        size: Math.random() * 4 + 2,
        alpha: 1,
        life: 1,
      });
    }

    // Spawn expanding ripple
    this.ripples.push({
      x,
      y,
      radius: ball.radius,
      maxRadius: ball.radius * 3.5,
      color: ball.color,
      alpha: 0.8,
    });
  }

  private getShapeVertices(cX: number, cY: number, r: number, angle: number, shape: string): { x: number; y: number }[] {
    let sides = 6;
    if (shape === "octagon") sides = 8;
    if (shape === "triangle") sides = 3;
    if (shape === "star") sides = 5;

    const vertices: { x: number; y: number }[] = [];
    if (shape === "star") {
      const step = Math.PI / sides;
      for (let i = 0; i < sides * 2; i++) {
        const rad = i % 2 === 0 ? r : r * 0.5;
        const a = angle + i * step;
        vertices.push({ x: cX + Math.cos(a) * rad, y: cY + Math.sin(a) * rad });
      }
      return vertices;
    }

    const step = (Math.PI * 2) / sides;
    for (let i = 0; i < sides; i++) {
      const a = angle + i * step;
      vertices.push({ x: cX + Math.cos(a) * r, y: cY + Math.sin(a) * r });
    }
    return vertices;
  }

  public render() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cX = W / 2;
    const cY = H / 2;
    const shapeRadius = Math.min(W, H) * 0.42;

    // Dark sleek background
    ctx.fillStyle = this.config.bgColor || "#0a0a14";
    ctx.fillRect(0, 0, W, H);

    // Decorative grid lines / subtle radial glow
    const bgGlow = ctx.createRadialGradient(cX, cY, 10, cX, cY, shapeRadius * 1.3);
    bgGlow.addColorStop(0, "rgba(255, 255, 255, 0.04)");
    bgGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, W, H);

    // Draw ripples
    for (const r of this.ripples) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = r.alpha;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // Draw rotating container shape
    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = this.balls[0]?.color || "#00F5FF";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#ffffff";

    if (this.config.shape === "circle") {
      ctx.beginPath();
      ctx.arc(cX, cY, shapeRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Spinning tick marks on the circle for speed perception
      ctx.save();
      ctx.translate(cX, cY);
      ctx.rotate(this.angle);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (shapeRadius - 12), Math.sin(a) * (shapeRadius - 12));
        ctx.lineTo(Math.cos(a) * shapeRadius, Math.sin(a) * shapeRadius);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      const vertices = this.getShapeVertices(cX, cY, shapeRadius, this.angle, this.config.shape);
      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();

    // Draw particles
    for (const p of this.particles) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.restore();
    }

    // Draw balls and trails
    for (const ball of this.balls) {
      // Trail
      if (ball.trail.length > 1) {
        ctx.save();
        for (let i = 0; i < ball.trail.length - 1; i++) {
          const p1 = ball.trail[i];
          const p2 = ball.trail[i + 1];
          const ratio = (i + 1) / ball.trail.length;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = ball.color;
          ctx.lineWidth = ball.radius * 1.4 * ratio;
          ctx.lineCap = "round";
          ctx.globalAlpha = ratio * 0.45;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Ball glow & body
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = ball.color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);

      const grad = ctx.createRadialGradient(
        ball.x - ball.radius * 0.3,
        ball.y - ball.radius * 0.3,
        ball.radius * 0.1,
        ball.x,
        ball.y,
        ball.radius
      );
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.4, ball.color);
      grad.addColorStop(1, ball.color);

      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Bounce count on ball
      if (ball.radius >= 20) {
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.round(ball.radius * 0.75)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 4;
        ctx.shadowColor = "#000000";
        ctx.fillText(String(ball.bounces), ball.x, ball.y + 1);
      }
      ctx.restore();
    }

    // Draw HUD: Total Bounces in center
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.font = "900 80px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(this.totalBounces), cX, cY);
    ctx.restore();

    // Top & Bottom Viral Text Overlays (built for 9:16 vertical shorts)
    if (this.config.topText) {
      ctx.save();
      ctx.font = "900 36px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#FFE600";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fillText(this.config.topText, cX, 80);
      ctx.restore();
    }

    if (this.config.bottomText) {
      ctx.save();
      ctx.font = "800 30px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.fillText(this.config.bottomText, cX, H - 70);
      ctx.restore();
    }
  }

  public getTotalBounces(): number {
    return this.totalBounces;
  }
}
