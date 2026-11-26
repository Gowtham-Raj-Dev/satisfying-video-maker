import * as THREE from "three";
import { soundEngine } from "../audio";
import { renderOverlays } from "../overlayRenderer";
import { clamp, createRng, drawBackground } from "../prng";
import { SimulationCompletion, SimulationEngine, SimulationMetrics } from "../types";
import { DEFAULT_SIM_PARAMS } from "@/lib/defaults";
import { OverlayConfig, SimulationParams } from "@/types/simulation";

interface SoftStar3D {
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
}

export class ThreeSpaceEngine implements SimulationEngine {
  public isWebGL = false;
  private canvas: HTMLCanvasElement;
  private displayCtx: CanvasRenderingContext2D | null = null;
  private glCanvas: HTMLCanvasElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private points: THREE.Points | null = null;
  private ringMesh: THREE.Mesh | null = null;
  private coreMesh: THREE.Mesh | null = null;
  private softwareStars: SoftStar3D[] = [];
  private spinZ = 0;
  private spinY = 0;
  private params: SimulationParams;
  private overlays: OverlayConfig | null = null;

  private isRunning = false;
  private isPaused = false;
  private animId: number | null = null;
  private lastTs = 0;
  private elapsedSeconds = 0;
  private eventsCount = 0;
  private fps = 60;
  private fpsFrames = 0;
  private fpsLastTime = 0;
  private orbitTheta = 0;
  private completion: SimulationCompletion | null = null;
  private isExportingMode = false;
  private exportCelebrateTimer = 0;

  constructor(
    canvas: HTMLCanvasElement,
    initialParams: Partial<SimulationParams> = {},
    overlays?: OverlayConfig
  ) {
    this.canvas = canvas;
    this.displayCtx = canvas.getContext("2d");
    this.params = {
      ...DEFAULT_SIM_PARAMS,
      ...initialParams,
      camera3D: {
        ...DEFAULT_SIM_PARAMS.camera3D,
        ...(initialParams.camera3D || {}),
      },
    };
    this.overlays = overlays || null;

    // Use WebGL on an offscreen canvas with automatic Software 3D Canvas 2D fallback so it never throws context errors
    if (typeof document !== "undefined" && this.params.performance !== "low") {
      try {
        const offscreen = document.createElement("canvas");
        const renderer = new THREE.WebGLRenderer({
          canvas: offscreen,
          antialias: true,
          preserveDrawingBuffer: true,
          powerPreference: "default",
          failIfMajorPerformanceCaveat: false,
        });
        renderer.setSize(canvas.width || 1080, canvas.height || 1920, false);
        this.glCanvas = offscreen;
        this.renderer = renderer;
        this.isWebGL = true;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.params.bgColor || "#080914");
        this.camera = new THREE.PerspectiveCamera(
          this.params.camera3D.fov,
          (canvas.width || 1080) / Math.max(1, canvas.height || 1920),
          0.1,
          200
        );
      } catch {
        this.renderer = null;
        this.glCanvas = null;
        this.scene = null;
        this.camera = null;
        this.isWebGL = false;
      }
    }

    this.buildSceneObjects();
    this.updateCameraPosition();
  }

  public setOverlays(overlays: OverlayConfig | null) {
    this.overlays = overlays;
  }

  private disposeObjects() {
    if (this.points && this.scene) {
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
      this.scene.remove(this.points);
      this.points = null;
    }
    if (this.ringMesh && this.scene) {
      this.ringMesh.geometry.dispose();
      (this.ringMesh.material as THREE.Material).dispose();
      this.scene.remove(this.ringMesh);
      this.ringMesh = null;
    }
    if (this.coreMesh && this.scene) {
      this.coreMesh.geometry.dispose();
      (this.coreMesh.material as THREE.Material).dispose();
      this.scene.remove(this.coreMesh);
      this.coreMesh = null;
    }
  }

  private buildSceneObjects() {
    this.disposeObjects();
    if (this.scene) {
      this.scene.background = new THREE.Color(this.params.bgColor || "#080914");
    }

    const rng = createRng(this.params.seed);
    const maxStars = this.renderer ? 2600 : 850;
    const count = clamp(Math.round(this.params.particleCount * (this.renderer ? 2 : 1)), 180, maxStars);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = this.params.colors.length ? this.params.colors : ["#C4FF2E", "#38BDF8", "#A855F7"];
    const threeColors = palette.map((hex) => new THREE.Color(hex));
    const maxR = 6.5 * clamp(this.params.orbitRadius, 0.5, 1.5);
    const variant = this.params.variant || "3d-black-hole";
    const isTunnel = variant === "3d-spiral";
    const isLorenz = variant === "3d-lorenz";
    const isHelix = variant === "3d-helix";
    const isDyson = variant === "3d-dyson";

    // Pre-integrate Lorenz butterfly trajectory
    let lx = 0.1;
    let ly = 0;
    let lz = 0;
    const lorenzDt = 0.008;

    this.softwareStars = [];
    for (let i = 0; i < count; i++) {
      const idx3 = i * 3;
      let px = 0;
      let py = 0;
      let pz = 0;
      if (isTunnel) {
        pz = -((i / count) * 28) + 4;
        const a = i * 0.28 + rng() * 0.25;
        const r = 1.6 + (i % 5) * 0.45;
        px = Math.cos(a) * r;
        py = Math.sin(a) * r;
      } else if (isLorenz) {
        for (let s = 0; s < 2; s++) {
          const dx = 10 * (ly - lx);
          const dy = lx * (28 - lz) - ly;
          const dz = lx * ly - (8 / 3) * lz;
          lx += dx * lorenzDt;
          ly += dy * lorenzDt;
          lz += dz * lorenzDt;
        }
        px = lx * 0.19;
        py = (lz - 25) * 0.19;
        pz = ly * 0.19;
      } else if (isHelix) {
        const strand = i % 3;
        const tNorm = i / Math.max(1, count - 1);
        const turns = tNorm * Math.PI * 7;
        const hSpan = (tNorm - 0.5) * 9.5;
        if (strand < 2) {
          const offset = strand === 0 ? 0 : Math.PI;
          const r = 2.1 * clamp(this.params.orbitRadius, 0.6, 1.4);
          px = Math.cos(turns + offset) * r + (rng() - 0.5) * 0.16;
          py = hSpan;
          pz = Math.sin(turns + offset) * r + (rng() - 0.5) * 0.16;
        } else {
          // Cross-rung base pair particles connecting the two helical strands
          const lerpBridge = (i % 12) / 11;
          const bx1 = Math.cos(turns) * 2.1;
          const bz1 = Math.sin(turns) * 2.1;
          const bx2 = Math.cos(turns + Math.PI) * 2.1;
          const bz2 = Math.sin(turns + Math.PI) * 2.1;
          px = bx1 + (bx2 - bx1) * lerpBridge;
          py = hSpan;
          pz = bz1 + (bz2 - bz1) * lerpBridge;
        }
      } else if (isDyson) {
        const ringIdx = i % 4;
        const a = (i / count) * Math.PI * 16 + rng() * 0.15;
        const r = 1.9 + ringIdx * 1.1;
        const tiltA = (ringIdx - 1.5) * 0.52;
        const flatX = Math.cos(a) * r;
        const flatZ = Math.sin(a) * r;
        px = flatX;
        py = flatZ * Math.sin(tiltA) + (rng() - 0.5) * 0.18;
        pz = flatZ * Math.cos(tiltA);
      } else {
        const arm = i % 4;
        const distNorm = Math.pow(rng(), 0.72);
        const r = 0.8 + distNorm * maxR;
        const angle = (arm / 4) * Math.PI * 2 + distNorm * 4.5 + (rng() - 0.5) * 0.55;
        px = Math.cos(angle) * r;
        py = (rng() - 0.5) * 0.55 * (1 - distNorm * 0.5);
        pz = Math.sin(angle) * r;
      }

      positions[idx3] = px;
      positions[idx3 + 1] = py;
      positions[idx3 + 2] = pz;

      const hex = palette[i % palette.length];
      this.softwareStars.push({
        x: px,
        y: py,
        z: pz,
        color: hex,
        size: isLorenz ? 1.8 + (i % 3) * 0.6 : 1.5 + rng() * 2.2,
      });

      const c = threeColors[i % threeColors.length];
      colors[idx3] = c.r;
      colors[idx3 + 1] = c.g;
      colors[idx3 + 2] = c.b;
    }

    if (this.scene && this.renderer) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: (isLorenz || isHelix ? 0.11 : 0.085) * clamp(this.params.objectSize, 0.5, 2.2),
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.points = new THREE.Points(geom, mat);
      this.scene.add(this.points);

      if (!isTunnel && !isLorenz && !isHelix) {
        const coreR = 0.68 * clamp(this.params.eventHorizonSize, 0.4, 2);
        const coreGeom = new THREE.SphereGeometry(coreR, 32, 32);
        const coreMat = new THREE.MeshBasicMaterial({
          color: isDyson ? threeColors[0] : 0x050507,
        });
        this.coreMesh = new THREE.Mesh(coreGeom, coreMat);
        this.scene.add(this.coreMesh);

        const ringGeom = new THREE.TorusGeometry(coreR * 1.45, 0.055, 16, 80);
        const ringMat = new THREE.MeshBasicMaterial({
          color: threeColors[0],
          transparent: true,
          opacity: 0.85,
        });
        this.ringMesh = new THREE.Mesh(ringGeom, ringMat);
        this.ringMesh.rotation.x = Math.PI / 2;
        this.scene.add(this.ringMesh);
      }
    }
  }

  private updateCameraPosition() {
    if (!this.camera) return;
    const cam = this.params.camera3D;
    this.camera.fov = clamp(cam.fov, 35, 85);
    this.camera.updateProjectionMatrix();

    const dist = clamp(cam.distance, 4, 22);
    const tilt = clamp(cam.tilt, -1.2, 1.2);
    this.camera.position.set(
      Math.sin(this.orbitTheta) * dist * Math.cos(tilt),
      Math.sin(tilt) * dist,
      Math.cos(this.orbitTheta) * dist * Math.cos(tilt)
    );
    this.camera.lookAt(0, 0, 0);
  }

  public start(): void {
    this.isPaused = false;
    this.lastTs = performance.now();
    if (this.isRunning) return;
    this.isRunning = true;
    this.fpsLastTime = this.lastTs;
    this.render();

    const loop = (now: number) => {
      if (!this.isRunning) return;
      const dt = Math.min(0.05, Math.max(0, (now - this.lastTs) / 1000));
      this.lastTs = now;

      this.fpsFrames++;
      if (now - this.fpsLastTime >= 500) {
        this.fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLastTime));
        this.fpsFrames = 0;
        this.fpsLastTime = now;
      }

      if (!this.isPaused && !this.completion) {
        this.stepFixed(dt * (this.params.speed || 1));
        this.elapsedSeconds += dt;
        this.render();
      }
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  public pause(): void {
    this.isPaused = true;
    this.render();
  }

  public resume(): void {
    this.isPaused = false;
    this.lastTs = performance.now();
    if (!this.isRunning) {
      this.start();
    }
    this.render();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.disposeObjects();
    if (this.renderer) {
      try {
        const gl = this.renderer.getContext();
        this.renderer.dispose();
        gl?.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {}
      this.renderer = null;
    }
    this.glCanvas = null;
  }

  public setExportingMode(flag: boolean): void {
    this.isExportingMode = flag;
    this.exportCelebrateTimer = 0;
  }

  public reset(seed?: number): void {
    if (seed !== undefined) this.params.seed = seed;
    this.elapsedSeconds = 0;
    this.eventsCount = 0;
    this.orbitTheta = 0;
    this.spinY = 0;
    this.spinZ = 0;
    this.completion = null;
    this.exportCelebrateTimer = 0;
    this.buildSceneObjects();
    this.render();
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    if (this.renderer && this.camera) {
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / Math.max(1, height);
      this.camera.updateProjectionMatrix();
    }
    this.render();
  }

  public updateConfig(next: Partial<SimulationParams>): void {
    const prev = this.params;
    this.params = {
      ...this.params,
      ...next,
      camera3D: {
        ...this.params.camera3D,
        ...(next.camera3D || {}),
      },
    };
    if (
      prev.particleCount !== this.params.particleCount ||
      prev.seed !== this.params.seed ||
      prev.colors !== this.params.colors ||
      prev.bgColor !== this.params.bgColor ||
      prev.objectSize !== this.params.objectSize ||
      prev.eventHorizonSize !== this.params.eventHorizonSize ||
      prev.orbitRadius !== this.params.orbitRadius ||
      prev.variant !== this.params.variant
    ) {
      this.buildSceneObjects();
    }
    if (this.isPaused) {
      this.render();
    }
  }

  public stepFixed(dt: number): void {
    this.orbitTheta += dt * (this.params.camera3D.autoOrbit || 0.4) * 0.5;
    this.spinZ += dt * 0.7 * this.params.spiralSpeed;
    this.spinY += dt * 0.55 * this.params.spiralSpeed;
    this.updateCameraPosition();

    if (this.points) {
      const variant = this.params.variant || "3d-black-hole";
      if (variant === "3d-spiral") {
        this.points.rotation.z = this.spinZ;
      } else if (variant === "3d-lorenz" || variant === "3d-helix" || variant === "3d-dyson") {
        this.points.rotation.y = this.spinY;
        this.points.rotation.x = Math.sin(this.spinZ * 0.4) * 0.35;
        // Fly forward along Z axis continuously for warp-gate arcade motion
        const pos = this.points.geometry.getAttribute("position") as THREE.BufferAttribute;
        if (pos && variant === "3d-helix") {
          const dz = dt * 3.8 * this.params.spiralSpeed;
          for (let i = 0; i < pos.count; i++) {
            let z = pos.getZ(i) + dz;
            if (z > 6) z -= 14;
            pos.setZ(i, z);
          }
          pos.needsUpdate = true;
        }
      } else {
        this.points.rotation.y = this.spinY;
      }
    }
    if (this.ringMesh) {
      this.ringMesh.rotation.z += dt * 1.4;
    }
    if (Math.random() < dt * 0.8) {
      this.eventsCount++;
      soundEngine.playImpact(0.25, this.eventsCount, 0);
    }
    if (!this.completion && this.elapsedSeconds >= 32) {
      this.completion = {
        title: "3D Space Cycle Complete!",
        subtitle: "Completed 32-second 3D orbit.",
      };
      if (!this.isExportingMode) {
        this.isPaused = true;
      }
    }
  }

  public stepExportFrame(dtSeconds: number): void {
    if (this.completion) {
      this.exportCelebrateTimer += dtSeconds;
      if (this.exportCelebrateTimer >= 2.2) {
        this.reset();
      }
      return;
    }
    this.stepFixed(dtSeconds * (this.params.speed || 1));
    this.elapsedSeconds += dtSeconds;
  }

  private renderSoftware3D(ctx: CanvasRenderingContext2D, W: number, H: number) {
    drawBackground(ctx, W, H, this.params);
    const camDist = clamp(this.params.camera3D.distance, 4, 22);
    const tilt = clamp(this.params.camera3D.tilt, -1.2, 1.2);
    const fovRad = (clamp(this.params.camera3D.fov, 35, 85) * Math.PI) / 180;
    const fovScale = H / (2 * Math.tan(fovRad * 0.5));
    const isTunnel = this.params.variant === "3d-spiral";

    const cosY = Math.cos(isTunnel ? 0 : this.spinY + this.orbitTheta);
    const sinY = Math.sin(isTunnel ? 0 : this.spinY + this.orbitTheta);
    const cosZ = Math.cos(isTunnel ? this.spinZ : 0);
    const sinZ = Math.sin(isTunnel ? this.spinZ : 0);
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    const projected: { sx: number; sy: number; zCam: number; size: number; color: string }[] = [];
    for (const st of this.softwareStars) {
      let x = st.x;
      let y = st.y;
      let z = st.z;
      if (isTunnel) {
        const rx = x * cosZ - y * sinZ;
        const ry = x * sinZ + y * cosZ;
        x = rx;
        y = ry;
      } else {
        const rx = x * cosY - z * sinY;
        const rz = x * sinY + z * cosY;
        x = rx;
        z = rz;
      }

      // Tilt camera pitch around X
      const ty = y * cosT - z * sinT;
      const tz = y * sinT + z * cosT + camDist;
      if (tz <= 0.35) continue;

      const sx = W * 0.5 + (x * fovScale) / tz;
      const sy = H * 0.5 - (ty * fovScale) / tz;
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
      projected.push({
        sx,
        sy,
        zCam: tz,
        size: clamp((st.size * fovScale * 0.015 * this.params.objectSize) / tz, 1, 9),
        color: st.color,
      });
    }

    projected.sort((a, b) => b.zCam - a.zCam);
    ctx.save();
    for (const p of projected) {
      ctx.globalAlpha = clamp(1.15 - p.zCam / 26, 0.25, 0.95);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (!isTunnel && this.params.variant !== "3d-lorenz" && this.params.variant !== "3d-helix") {
      const isDyson = this.params.variant === "3d-dyson";
      const coreR = ((0.68 * clamp(this.params.eventHorizonSize, 0.4, 2) * fovScale) / camDist);
      const ringColor = this.params.colors[0] || "#C4FF2E";
      ctx.save();
      ctx.strokeStyle = ringColor;
      ctx.globalAlpha = 0.78;
      ctx.lineWidth = Math.max(2, coreR * 0.14);
      ctx.beginPath();
      ctx.ellipse(
        W * 0.5,
        H * 0.5,
        coreR * 1.55,
        Math.max(4, Math.abs(Math.sin(tilt)) * coreR * 1.55),
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.fillStyle = isDyson ? ringColor : "#050507";
      ctx.beginPath();
      ctx.arc(W * 0.5, H * 0.5, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  public render(targetCtx?: CanvasRenderingContext2D): void {
    const ctx = targetCtx || this.displayCtx;
    if (!ctx) return;
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    let renderedViaWebGL = false;
    if (this.renderer && this.glCanvas && this.scene && this.camera) {
      try {
        const gl = this.renderer.getContext();
        if (!gl.isContextLost()) {
          this.renderer.render(this.scene, this.camera);
          ctx.clearRect(0, 0, W, H);
          ctx.drawImage(this.glCanvas, 0, 0, W, H);
          renderedViaWebGL = true;
        }
      } catch {
        renderedViaWebGL = false;
      }
    }

    if (!renderedViaWebGL) {
      this.renderSoftware3D(ctx, W, H);
    }

    if (this.overlays) {
      const overlayT =
        this.isPaused && !this.isExportingMode && this.elapsedSeconds === 0
          ? 1
          : this.elapsedSeconds;
      renderOverlays(ctx, W, H, this.overlays, overlayT);
    }
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getElapsedSeconds(): number {
    return this.elapsedSeconds;
  }

  public getMetrics(): SimulationMetrics {
    return {
      fps: this.fps,
      activeObjects: Math.round(this.params.particleCount),
      eventsCount: this.eventsCount,
      progressPct: clamp(Math.round((this.elapsedSeconds / 32) * 100), 0, 100),
      statusLabel: this.completion ? "Completed" : this.isPaused ? "Ready" : this.isWebGL ? "WebGL 3D" : "3D Space",
      completed: this.completion,
    };
  }
}
