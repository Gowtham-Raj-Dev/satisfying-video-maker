import { SimulationParams } from "@/types/simulation";

export interface SimulationCompletion {
  title: string;
  subtitle: string;
  winnerName?: string;
}

export interface SimulationMetrics {
  fps: number;
  activeObjects: number;
  eventsCount: number;
  statusLabel: string;
  progressPct?: number;
  completed?: SimulationCompletion | null;
}

export interface PointerEventData {
  x: number; // normalized 0..1 relative to canvas width
  y: number; // normalized 0..1 relative to canvas height
  type: "down" | "move" | "up";
}

export interface SimulationEngine {
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  reset(seed?: number): void;
  resize(width: number, height: number): void;
  updateConfig(params: Partial<SimulationParams>): void;
  stepFixed(dtSeconds: number): void;
  stepExportFrame(dtSeconds: number): void;
  setExportingMode?(flag: boolean): void;
  render(targetCtx?: CanvasRenderingContext2D): void;
  getCanvas(): HTMLCanvasElement;
  getElapsedSeconds(): number;
  getMetrics(): SimulationMetrics;
  handlePointer?(ev: PointerEventData): void;
  isWebGL?: boolean;
}
