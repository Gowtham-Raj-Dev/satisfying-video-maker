import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, createRng, drawBackground, getPerfFactor } from "../prng";
import { computeDistributionInWorker } from "../workerClient";
import { SimulationParams } from "@/types/simulation";

interface SpaceParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  speed: number;
  color: string;
  size: number;
}

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  radius: number;
  color: string;
  trail: { x: number; y: number }[];
}

export class OrbitalGravityEngine extends BaseCanvasSimulation {
  private particles: SpaceParticle[] = [];
  private bodies: Body[] = [];
  private wellX = 0;
  private wellY = 0;
  private cycleTimer = 0;
  private workerRequestSeq = 0;

  protected onReset(): void {
    this.particles = [];
    this.bodies = [];
    this.cycleTimer = 0;
    this.wellX = this.canvas.width / 2;
    this.wellY = this.canvas.height / 2;
    this.initScene();
    this.statusLabel = "Orbiting";
  }

  protected onResize(): void {
    this.onReset();
  }

  protected onConfigUpdated(prev: SimulationParams, curr: SimulationParams): void {
    if (
      prev.variant !== curr.variant ||
      prev.particleCount !== curr.particleCount ||
      prev.seed !== curr.seed
    ) {
      this.onReset();
    }
  }

  private initScene(): void {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const cX = W / 2;
    const cY = H / 2;
    const colors = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#A855F7"];
    const perf = getPerfFactor(this.params.performance);
    const count = Math.round(clamp(this.params.particleCount, 120, 1200) * perf);
    const rng = createRng(this.params.seed);

    const variant = this.params.variant;

    if (variant === "planet-collision") {
      this.bodies = [
        {
          x: cX - minDim * 0.25,
          y: cY - minDim * 0.08,
          vx: minDim * 0.0022,
          vy: minDim * 0.0014,
          mass: 220,
          radius: minDim * 0.055 * this.params.objectSize,
          color: colors[0],
          trail: [],
        },
        {
          x: cX + minDim * 0.25,
          y: cY + minDim * 0.08,
          vx: -minDim * 0.0022,
          vy: -minDim * 0.0014,
          mass: 200,
          radius: minDim * 0.048 * this.params.objectSize,
          color: colors[1 % colors.length],
          trail: [],
        },
      ];
      for (let i = 0; i < Math.round(count * 0.45); i++) {
        const a = rng() * Math.PI * 2;
        const r = minDim * (0.1 + rng() * 0.34);
        const speed = Math.sqrt(12 / Math.max(20, r)) * 2.2;
        this.particles.push({
          x: cX + Math.cos(a) * r,
          y: cY + Math.sin(a) * r,
          vx: -Math.sin(a) * speed,
          vy: Math.cos(a) * speed,
          angle: a,
          radius: r,
          speed: 0.01,
          color: colors[i % colors.length],
          size: 1.8 + rng() * 2.4,
        });
      }
    } else if (variant === "orbital-dance") {
      const starCount = clamp(Math.round(this.params.objectCount), 2, 6);
      for (let i = 0; i < starCount; i++) {
        const a = (i / starCount) * Math.PI * 2;
        const r = minDim * 0.22 * this.params.orbitRadius;
        const tangential = minDim * 0.0042;
        this.bodies.push({
          x: cX + Math.cos(a) * r,
          y: cY + Math.sin(a) * r,
          vx: -Math.sin(a) * tangential,
          vy: Math.cos(a) * tangential,
          mass: 160,
          radius: minDim * 0.025 * this.params.objectSize,
          color: colors[i % colors.length],
          trail: [],
        });
      }
      for (let i = 0; i < Math.round(count * 0.35); i++) {
        const a = rng() * Math.PI * 2;
        const r = minDim * (0.05 + rng() * 0.4);
        this.particles.push({
          x: cX + Math.cos(a) * r,
          y: cY + Math.sin(a) * r,
          vx: 0,
          vy: 0,
          angle: a,
          radius: r,
          speed: 0.015,
          color: colors[i % colors.length],
          size: 1.5 + rng() * 2,
        });
      }
    } else if (variant === "galaxy-spiral") {
      const seq = ++this.workerRequestSeq;
      computeDistributionInWorker("galaxy-points", count, minDim * 0.45 * this.params.orbitRadius, this.params.seed).then(
        (points) => {
          if (seq !== this.workerRequestSeq) return;
          this.particles = points.map((pt, idx) => ({
            x: cX + Math.cos(pt.angle) * pt.radius,
            y: cY + Math.sin(pt.angle) * pt.radius,
            vx: 0,
            vy: 0,
            angle: pt.angle,
            radius: pt.radius,
            speed: pt.speed * 0.018,
            color: colors[pt.arm % colors.length] || colors[idx % colors.length],
            size: pt.size * this.params.objectSize,
          }));
          if (this.isPaused) this.render();
        }
      );
    } else if (variant === "star-explosion") {
      this.spawnSupernova(cX, cY, count, minDim, colors, rng);
    } else if (variant === "binary-pulsar") {
      // Twin neutron stars orbiting inward over 32s emitting relativistic ring wakes
      for (let b = 0; b < 2; b++) {
        const a = b * Math.PI;
        const r = minDim * 0.24;
        this.bodies.push({
          x: cX + Math.cos(a) * r,
          y: cY + Math.sin(a) * r,
          vx: 0,
          vy: 0,
          mass: 200,
          radius: minDim * 0.026 * this.params.objectSize,
          color: colors[b % colors.length],
          trail: [],
        });
      }
      for (let i = 0; i < Math.round(count * 0.65); i++) {
        const a = rng() * Math.PI * 2;
        const r = minDim * (0.08 + rng() * 0.36);
        this.particles.push({
          x: cX + Math.cos(a) * r,
          y: cY + Math.sin(a) * r,
          vx: 0,
          vy: 0,
          angle: a,
          radius: r,
          speed: 0.014 + rng() * 0.018,
          color: colors[i % colors.length],
          size: (1.5 + rng() * 2.4) * this.params.objectSize,
        });
      }
    } else if (variant === "saturn-rings") {
      // Two shepherd moons carving concentric ring lanes around central planet
      const ringBands = [0.22, 0.33];
      for (let m = 0; m < 2; m++) {
        const a = m * Math.PI;
        const r = minDim * ringBands[m];
        this.bodies.push({
          x: cX + Math.cos(a) * r,
          y: cY + Math.sin(a) * r,
          vx: 0,
          vy: 0,
          mass: 100,
          radius: minDim * 0.016 * this.params.objectSize,
          color: "#F5F5F5",
          trail: [],
        });
      }
      for (let i = 0; i < count; i++) {
        const band = i % 3;
        const baseR = minDim * (0.14 + band * 0.095 + (rng() - 0.5) * 0.048);
        const a = rng() * Math.PI * 2;
        this.particles.push({
          x: cX + Math.cos(a) * baseR,
          y: cY + Math.sin(a) * baseR,
          vx: 0,
          vy: 0,
          angle: a,
          radius: baseR,
          speed: (0.022 - band * 0.004) * (0.85 + rng() * 0.3),
          color: colors[band % colors.length],
          size: (1.5 + rng() * 2.1) * this.params.objectSize,
        });
      }
    } else {
      // Vortex / Black Hole / Gravity Well
      const maxR = minDim * 0.46 * clamp(this.params.orbitRadius, 0.5, 1.3);
      for (let i = 0; i < count; i++) {
        const a = rng() * Math.PI * 2;
        const r = 20 + rng() * maxR;
        this.particles.push({
          x: cX + Math.cos(a) * r,
          y: cY + Math.sin(a) * r,
          vx: 0,
          vy: 0,
          angle: a,
          radius: r,
          speed: 0.012 + rng() * 0.025,
          color: colors[i % colors.length],
          size: (1.8 + rng() * 3.0) * this.params.objectSize,
        });
      }
    }
    this.activeObjects = this.particles.length + this.bodies.length;
  }

  private spawnSupernova(
    cX: number,
    cY: number,
    count: number,
    minDim: number,
    colors: string[],
    rng: () => number
  ) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2;
      const spd = (1.5 + Math.pow(rng(), 0.7) * 9) * (minDim / 1080);
      this.particles.push({
        x: cX,
        y: cY,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        angle: a,
        radius: 0,
        speed: 0,
        color: colors[i % colors.length],
        size: (1.6 + rng() * 3.2) * this.params.objectSize,
      });
    }
    soundEngine.playImpact(1.3, 4, 0);
  }

  public stepFixed(dt: number): void {
    const step = dt * 60;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const minDim = Math.min(W, H);
    const cX = W / 2;
    const cY = H / 2;
    const variant = this.params.variant;
    this.cycleTimer += dt;

    if (variant === "planet-collision") {
      // Mutual N-body gravity
      const G = 4.2 * this.params.gravityStrength * (minDim / 1080);
      for (let i = 0; i < this.bodies.length; i++) {
        for (let j = i + 1; j < this.bodies.length; j++) {
          const a = this.bodies[i];
          const b = this.bodies[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy + 900;
          const dist = Math.sqrt(distSq);
          const force = (G * a.mass * b.mass) / distSq;
          const fx = (force * dx) / dist;
          const fy = (force * dy) / dist;
          a.vx += (fx / a.mass) * step;
          a.vy += (fy / a.mass) * step;
          b.vx -= (fx / b.mass) * step;
          b.vy -= (fy / b.mass) * step;

          if (dist < a.radius + b.radius) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (a.radius + b.radius - dist) * 0.5;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;
            const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            if (rel > 0) {
              a.vx -= rel * 0.9 * nx;
              a.vy -= rel * 0.9 * ny;
              b.vx += rel * 0.9 * nx;
              b.vy += rel * 0.9 * ny;
              this.eventsCount++;
              soundEngine.playImpact(1.2, this.eventsCount, ((a.x + b.x) / 2 / W) * 2 - 1);
            }
          }
        }
      }

      for (const body of this.bodies) {
        body.trail.push({ x: body.x, y: body.y });
        if (body.trail.length > 35) body.trail.shift();
        body.x += body.vx * step;
        body.y += body.vy * step;
        // Soft arena containment so colliding planets stay visible on screen
        const margin = body.radius + 20;
        if (body.x < margin || body.x > W - margin) {
          body.x = clamp(body.x, margin, W - margin);
          body.vx *= -0.75;
        }
        if (body.y < margin || body.y > H - margin) {
          body.y = clamp(body.y, margin, H - margin);
          body.vy *= -0.75;
        }
      }

      for (const p of this.particles) {
        for (const body of this.bodies) {
          const dx = body.x - p.x;
          const dy = body.y - p.y;
          const d2 = dx * dx + dy * dy + 600;
          const d = Math.sqrt(d2);
          const f = (G * body.mass) / d2;
          p.vx += ((f * dx) / d) * step;
          p.vy += ((f * dy) / d) * step;
        }
        p.x += p.vx * step;
        p.y += p.vy * step;
      }
    } else if (variant === "orbital-dance") {
      const G = 4.6 * this.params.gravityStrength * (minDim / 1080);
      for (const b of this.bodies) {
        const dx = cX - b.x;
        const dy = cY - b.y;
        const d2 = dx * dx + dy * dy + 1200;
        const d = Math.sqrt(d2);
        const f = (G * 340) / d2;
        b.vx += ((f * dx) / d) * step;
        b.vy += ((f * dy) / d) * step;
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 32) b.trail.shift();
        b.x += b.vx * step;
        b.y += b.vy * step;
      }
      for (const p of this.particles) {
        p.angle += p.speed * this.params.spiralSpeed * step;
        p.x = cX + Math.cos(p.angle) * p.radius;
        p.y = cY + Math.sin(p.angle) * p.radius;
      }
    } else if (variant === "binary-pulsar") {
      const progress = clamp(this.elapsedSeconds / 32, 0, 1);
      const decayR = minDim * (0.26 - 0.15 * Math.sin(progress * Math.PI * 0.5));
      const omega = 2.0 + progress * 4.5 * clamp(this.params.spiralSpeed, 0.4, 2);
      const baseTheta = this.cycleTimer * omega;
      for (let b = 0; b < this.bodies.length; b++) {
        const ang = baseTheta + b * Math.PI;
        const body = this.bodies[b];
        body.x = cX + Math.cos(ang) * decayR;
        body.y = cY + Math.sin(ang) * decayR;
        body.trail.push({ x: body.x, y: body.y });
        if (body.trail.length > 36) body.trail.shift();
      }
      // Binary pulsars gravitationally sling outer asteroids into star bursts!
      for (const p of this.particles) {
        p.angle += (p.speed + progress * 0.015) * this.params.spiralSpeed * step;
        const waveR = p.radius + Math.sin(p.angle * 2 - this.cycleTimer * 4) * minDim * 0.025;
        p.x = cX + Math.cos(p.angle) * waveR;
        p.y = cY + Math.sin(p.angle) * waveR;
        for (const body of this.bodies) {
          if (Math.hypot(p.x - body.x, p.y - body.y) < body.radius + p.size + 6) {
            p.radius = minDim * (0.14 + Math.random() * 0.28);
            p.angle += 0.9;
            this.eventsCount++;
            if (Math.random() < 0.15) soundEngine.playImpact(0.45, this.eventsCount % 12, (p.x / W) * 2 - 1);
          }
        }
      }
    } else if (variant === "saturn-rings") {
      const tiltY = 0.56;
      const ringBands = [0.22, 0.33];
      for (let m = 0; m < this.bodies.length; m++) {
        const ang = this.cycleTimer * (m === 0 ? 1.25 : -0.82) * clamp(this.params.spiralSpeed, 0.4, 2) + m * 2.1;
        const r = minDim * ringBands[m];
        const b = this.bodies[m];
        b.x = cX + Math.cos(ang) * r;
        b.y = cY + Math.sin(ang) * r * tiltY;
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 26) b.trail.shift();
      }
      for (const p of this.particles) {
        p.angle += p.speed * this.params.spiralSpeed * step;
        let wx = cX + Math.cos(p.angle) * p.radius;
        let wy = cY + Math.sin(p.angle) * p.radius * tiltY;
        for (const m of this.bodies) {
          const dx = wx - m.x;
          const dy = wy - m.y;
          const dist = Math.hypot(dx, dy);
          if (dist < minDim * 0.07 && dist > 1) {
            const push = (1 - dist / (minDim * 0.07)) * minDim * 0.032;
            wx += (dx / dist) * push;
            wy += (dy / dist) * push;
            if (dist < m.radius + 6) {
              this.eventsCount++;
              if (Math.random() < 0.1) soundEngine.playImpact(0.38, this.eventsCount % 10, (wx / W) * 2 - 1);
            }
          }
        }
        p.x = wx;
        p.y = wy;
      }
    } else if (variant === "star-explosion") {
      const cycle = this.cycleTimer % 4.5;
      const pull = cycle > 2.8 ? -0.14 : 0;
      for (const p of this.particles) {
        if (pull !== 0) {
          const dx = cX - p.x;
          const dy = cY - p.y;
          p.vx += dx * 0.002 * step;
          p.vy += dy * 0.002 * step;
        }
        p.vx *= 0.992;
        p.vy *= 0.992;
        p.x += p.vx * step;
        p.y += p.vy * step;
      }
      if (cycle < 0.04 && this.cycleTimer > 28 && this.elapsedSeconds >= 30) {
        this.markCompleted("Supernova Cycle Complete!", "Completed 30s+ expansion and gravitational collapse.");
        return;
      }
    } else {
      // Vortex / Black Hole / Galaxy Spiral / Gravity Well
      const horizonR = minDim * 0.026 * clamp(this.params.eventHorizonSize, 0.4, 2.4);
      const maxR = minDim * 0.46 * clamp(this.params.orbitRadius, 0.5, 1.3);
      if (variant === "gravity-well") {
        this.wellX = cX + Math.cos(this.cycleTimer * 0.9) * minDim * 0.14;
        this.wellY = cY + Math.sin(this.cycleTimer * 1.1) * minDim * 0.14;
      } else {
        this.wellX = cX;
        this.wellY = cY;
      }

      const spiralFactor = clamp(this.params.spiralSpeed, 0.2, 3);
      const pullFactor = variant === "galaxy-spiral" ? 0 : 0.65 * this.params.gravityStrength;

      for (const p of this.particles) {
        const kepler = clamp((maxR / (p.radius + 35)) * 0.011 * spiralFactor, 0, 0.08);
        p.angle += (p.speed * spiralFactor + kepler) * step;
        p.radius -= pullFactor * step;
        if (p.radius <= horizonR) {
          p.radius = maxR;
          p.angle = Math.random() * Math.PI * 2;
          this.eventsCount++;
          if (Math.random() < 0.04) soundEngine.playImpact(0.35, this.eventsCount, 0);
        }
        p.x = this.wellX + Math.cos(p.angle) * p.radius;
        p.y = this.wellY + Math.sin(p.angle) * p.radius;
      }
    }
    this.progressPct = clamp(Math.round((this.elapsedSeconds / 32) * 100), 0, 100);
    if (this.elapsedSeconds >= 32) {
      this.markCompleted("Orbital Cycle Complete!", "Completed 32-second gravity simulation.");
    }
    this.activeObjects = this.particles.length + this.bodies.length;
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);
    const minDim = Math.min(W, H);
    const cX = this.wellX || W / 2;
    const cY = this.wellY || H / 2;

    if (this.params.variant === "gravity-well") {
      // Distorted gravity grid lines
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      const rings = 9;
      for (let i = 1; i <= rings; i++) {
        ctx.beginPath();
        ctx.arc(cX, cY, (minDim * 0.46 * i) / rings, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Event horizon / planetary core / pulsar wave rings
    if (this.params.variant === "binary-pulsar") {
      ctx.save();
      for (let w = 0; w < 5; w++) {
        const phase = ((this.cycleTimer * 0.45 + w / 5) % 1);
        ctx.strokeStyle = this.params.colors[w % this.params.colors.length] || "#38BDF8";
        ctx.globalAlpha = (1 - phase) * 0.28;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cX, cY, minDim * (0.08 + phase * 0.4), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    } else if (this.params.variant === "saturn-rings") {
      const planetR = minDim * 0.085;
      ctx.save();
      const grad = ctx.createRadialGradient(
        cX - planetR * 0.3,
        cY - planetR * 0.3,
        planetR * 0.1,
        cX,
        cY,
        planetR
      );
      grad.addColorStop(0, "#FFFFFF");
      grad.addColorStop(0.35, this.params.colors[0] || "#FACC15");
      grad.addColorStop(1, this.params.colors[1 % this.params.colors.length] || "#38BDF8");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cX, cY, planetR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (
      this.params.variant !== "star-explosion" &&
      this.params.variant !== "planet-collision"
    ) {
      const horizonR = minDim * 0.026 * clamp(this.params.eventHorizonSize, 0.4, 2.4);
      ctx.save();
      const grad = ctx.createRadialGradient(cX, cY, horizonR * 0.5, cX, cY, minDim * 0.28);
      const glowColor = this.params.colors[0] || "#C4FF2E";
      grad.addColorStop(0, "rgba(255, 255, 255, 0.22)");
      grad.addColorStop(0.35, "rgba(139, 92, 246, 0.14)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cX, cY, minDim * 0.28, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cX, cY, horizonR, 0, Math.PI * 2);
      ctx.fillStyle = "#0B0B0C";
      ctx.fill();
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    // Particles
    ctx.save();
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Bodies (planets / stars)
    for (const b of this.bodies) {
      if (b.trail.length > 1) {
        ctx.save();
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(b.trail[0].x, b.trail[0].y);
        for (let i = 1; i < b.trail.length; i++) {
          ctx.lineTo(b.trail[i].x, b.trail[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
}
