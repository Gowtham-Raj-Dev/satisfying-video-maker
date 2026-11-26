import { DEFAULT_SIM_PARAMS } from "@/lib/defaults";
import { OverlayConfig, SimulationParams } from "@/types/simulation";
import { renderOverlays } from "./overlayRenderer";
import { PointerEventData, SimulationCompletion, SimulationEngine, SimulationMetrics } from "./types";

export abstract class BaseCanvasSimulation implements SimulationEngine {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected params: SimulationParams;
  protected overlays: OverlayConfig | null = null;

  protected isRunning = false;
  protected isPaused = false;
  private initialized = false;
  protected animId: number | null = null;
  protected lastTs = 0;
  protected accumulator = 0;
  private smoothRawDt = 1 / 60;
  protected elapsedSeconds = 0;
  protected eventsCount = 0;
  protected activeObjects = 0;
  protected progressPct = 0;
  protected statusLabel = "Running";
  protected completion: SimulationCompletion | null = null;
  protected isExportingMode = false;
  private exportCelebrateTimer = 0;

  private fps = 60;
  private fpsFrames = 0;
  private fpsLastTime = 0;
  private visibilityHandler: (() => void) | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    initialParams: Partial<SimulationParams> = {},
    overlays?: OverlayConfig
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Unable to acquire 2D canvas context");
    this.ctx = ctx;
    this.params = {
      ...DEFAULT_SIM_PARAMS,
      ...initialParams,
      camera3D: {
        ...DEFAULT_SIM_PARAMS.camera3D,
        ...(initialParams.camera3D || {}),
      },
    };
    this.overlays = overlays || null;

    this.visibilityHandler = () => {
      if (!document.hidden) {
        this.lastTs = performance.now();
        this.accumulator = 0;
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }
  }

  public setExportingMode(flag: boolean): void {
    this.isExportingMode = flag;
    this.exportCelebrateTimer = 0;
  }

  protected markCompleted(title: string, subtitle: string, winnerName?: string): void {
    if (this.completion) return;
    this.completion = { title, subtitle, winnerName };
    this.progressPct = 100;
    this.statusLabel = "Completed";
    this.exportCelebrateTimer = 0;
    if (!this.isExportingMode) {
      // Freeze cleanly on the celebratory frame so the player presents Start Again
      this.isPaused = true;
      this.render();
    }
  }

  public setOverlays(overlays: OverlayConfig | null) {
    this.overlays = overlays;
    if (this.initialized && this.isPaused) {
      this.render();
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
      activeObjects: this.activeObjects,
      eventsCount: this.eventsCount,
      progressPct: this.progressPct,
      statusLabel: this.completion ? "Completed" : this.isPaused ? "Ready" : this.statusLabel,
      completed: this.completion,
    };
  }

  public start(): void {
    if (!this.initialized) {
      this.initialized = true;
      this.completion = null;
      this.progressPct = 0;
      this.onReset();
      this.render();
    }
    this.isPaused = false;
    this.lastTs = performance.now();
    this.accumulator = 0;
    if (this.isRunning) return;
    this.isRunning = true;
    this.fpsLastTime = this.lastTs;

    const tick = (now: number) => {
      if (!this.isRunning) return;

      let rawDt = Math.min(0.04, Math.max(0, (now - this.lastTs) / 1000));
      this.lastTs = now;

      this.fpsFrames++;
      if (now - this.fpsLastTime >= 500) {
        this.fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLastTime));
        this.fpsFrames = 0;
        this.fpsLastTime = now;
      }

      if (!this.isPaused && !this.completion) {
        // Snap VSync micro-jitter (60/120/144Hz) and filter residual RAF timestamp drift smoothly
        if (Math.abs(rawDt - 1 / 60) < 0.0028) rawDt = 1 / 60;
        else if (Math.abs(rawDt - 1 / 120) < 0.0018) rawDt = 1 / 120;
        else if (Math.abs(rawDt - 1 / 144) < 0.0015) rawDt = 1 / 144;
        if (rawDt > 0 && rawDt < 0.035) {
          this.smoothRawDt = this.smoothRawDt * 0.7 + rawDt * 0.3;
        }

        const speedScale = Math.max(0.2, Math.min(3, this.params.speed || 1));
        const clampedDt = this.smoothRawDt > 0 ? this.smoothRawDt : 1 / 60;
        const simDt = clampedDt * speedScale;
        const steps = Math.max(1, Math.min(4, Math.ceil(simDt / (1 / 90))));
        const stepDt = simDt / steps;
        for (let i = 0; i < steps; i++) {
          this.stepFixed(stepDt);
          if (this.completion && !this.isExportingMode) break;
        }
        this.elapsedSeconds += clampedDt;
        this.render();
      }

      this.animId = requestAnimationFrame(tick);
    };

    this.animId = requestAnimationFrame(tick);
  }

  public stepExportFrame(dtSeconds: number): void {
    if (this.completion) {
      this.exportCelebrateTimer += dtSeconds;
      if (this.exportCelebrateTimer >= 2.2) {
        this.reset();
      }
      return;
    }
    const fixedDt = 1 / 60;
    const speedScale = Math.max(0.2, Math.min(3, this.params.speed || 1));
    const totalSimDt = dtSeconds * speedScale;
    const steps = Math.max(1, Math.round(totalSimDt / fixedDt));
    const stepDt = totalSimDt / steps;
    for (let i = 0; i < steps; i++) {
      this.stepFixed(stepDt);
      if (this.completion) break;
    }
    this.elapsedSeconds += dtSeconds;
  }

  public pause(): void {
    this.isPaused = true;
    if (this.initialized) {
      this.render();
    }
  }

  public resume(): void {
    if (!this.initialized) {
      this.initialized = true;
      this.onReset();
    }
    this.isPaused = false;
    this.lastTs = performance.now();
    this.accumulator = 0;
    if (!this.isRunning) {
      this.start();
    }
    this.render();
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = true;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.visibilityHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }
    this.onDestroy();
  }

  protected onDestroy(): void {}

  public resize(width: number, height: number): void {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      if (this.initialized) {
        this.onResize(width, height);
        this.render();
      }
    }
  }

  protected onResize(_width: number, _height: number): void {}

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
    if (this.initialized) {
      this.onConfigUpdated(prev, this.params);
      if (this.isPaused) this.render();
    }
  }

  protected onConfigUpdated(_prev: SimulationParams, _curr: SimulationParams): void {}

  public reset(seed?: number): void {
    if (seed !== undefined) {
      this.params.seed = seed;
    }
    this.initialized = true;
    this.completion = null;
    this.exportCelebrateTimer = 0;
    this.progressPct = 0;
    this.elapsedSeconds = 0;
    this.eventsCount = 0;
    this.accumulator = 0;
    this.onReset();
    this.render();
  }

  public render(targetCtx?: CanvasRenderingContext2D): void {
    if (!this.initialized) {
      this.initialized = true;
      this.onReset();
    }
    const ctx = targetCtx || this.ctx;
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    this.drawScene(ctx, W, H);
    if (this.overlays) {
      const overlayT =
        this.isPaused && !this.isExportingMode && this.elapsedSeconds === 0
          ? 1
          : this.elapsedSeconds;
      renderOverlays(ctx, W, H, this.overlays, overlayT);
    }
  }

  public handlePointer(_ev: PointerEventData): void {}

  public abstract stepFixed(dtSeconds: number): void;
  protected abstract onReset(): void;
  protected abstract drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void;
}
