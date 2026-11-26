import { soundEngine } from "../audio";
import { BaseCanvasSimulation } from "../base";
import { clamp, createRng, drawBackground } from "../prng";
import { SimulationParams } from "@/types/simulation";

interface SortItem {
  value: number;
  hue: number;
  color: string;
}

export class ColorSorterEngine extends BaseCanvasSimulation {
  private items: SortItem[] = [];
  private cursorI = 0;
  private cursorJ = 0;
  private activeA = -1;
  private activeB = -1;
  private stepAccum = 0;
  private sortedDone = false;
  private resetDelay = 0;
  private passSwapped = false;

  protected onReset(): void {
    this.initArray();
    this.statusLabel = "Sorting";
  }

  protected onConfigUpdated(prev: SimulationParams, curr: SimulationParams): void {
    if (prev.objectCount !== curr.objectCount || prev.seed !== curr.seed) {
      this.initArray();
    }
  }

  private initArray() {
    const count = clamp(Math.round(this.params.objectCount * 8), 24, 96);
    const rng = createRng(this.params.seed);
    this.items = [];
    for (let i = 0; i < count; i++) {
      const ratio = i / Math.max(1, count - 1);
      const hue = Math.round(ratio * 320);
      this.items.push({
        value: i,
        hue,
        color: `hsl(${hue}, 88%, 58%)`,
      });
    }
    // Fisher-Yates shuffle
    for (let i = this.items.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
    }
    this.cursorI = 0;
    this.cursorJ = 0;
    this.activeA = -1;
    this.activeB = -1;
    this.stepAccum = 0;
    this.sortedDone = false;
    this.resetDelay = 0;
    this.passSwapped = false;
    this.activeObjects = this.items.length;
  }

  public stepFixed(dt: number): void {
    if (this.sortedDone) {
      this.progressPct = 100;
      this.resetDelay += dt;
      if (this.resetDelay > 0.7) {
        this.markCompleted("100% Spectrum Sorted!", `Sorted ${this.items.length} color bars in ${this.eventsCount} swaps.`);
      }
      return;
    }

    const swapsPerSec = 42 * clamp(this.params.speed, 0.3, 3);
    this.stepAccum += dt * swapsPerSec;
    const steps = Math.floor(this.stepAccum);
    this.stepAccum -= steps;

    const n = this.items.length;
    this.progressPct = clamp(Math.round((this.cursorI / Math.max(1, n - 1)) * 100), 0, 99);
    for (let s = 0; s < steps; s++) {
      if (this.cursorI >= n - 1) {
        this.sortedDone = true;
        this.activeA = -1;
        this.activeB = -1;
        soundEngine.playImpact(1.1, 10, 0);
        break;
      }

      this.activeA = this.cursorJ;
      this.activeB = this.cursorJ + 1;

      if (this.items[this.cursorJ].value > this.items[this.cursorJ + 1].value) {
        const tmp = this.items[this.cursorJ];
        this.items[this.cursorJ] = this.items[this.cursorJ + 1];
        this.items[this.cursorJ + 1] = tmp;
        this.passSwapped = true;
        this.eventsCount++;
        const note = Math.floor((this.items[this.cursorJ].value / n) * 14);
        soundEngine.playImpact(0.45, note, (this.cursorJ / n) * 2 - 1);
      }

      this.cursorJ++;
      if (this.cursorJ >= n - 1 - this.cursorI) {
        if (!this.passSwapped) {
          this.sortedDone = true;
          this.activeA = -1;
          this.activeB = -1;
          soundEngine.playImpact(1.1, 10, 0);
          break;
        }
        this.passSwapped = false;
        this.cursorJ = 0;
        this.cursorI++;
      }
    }
  }

  protected drawScene(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    drawBackground(ctx, W, H, this.params);
    const n = this.items.length;
    const padX = W * 0.08;
    const usableW = W - padX * 2;
    const barW = usableW / Math.max(1, n);
    const baseY = H * 0.8;
    const maxH = H * 0.56;

    for (let i = 0; i < n; i++) {
      const item = this.items[i];
      const h = ((item.value + 1) / n) * maxH;
      const x = padX + i * barW;
      const y = baseY - h;
      const isActive = i === this.activeA || i === this.activeB;
      ctx.fillStyle = isActive ? "#FFFFFF" : item.color;
      ctx.fillRect(x + 1, y, Math.max(2, barW - 2), h);
    }

    // Spectrum progress caption
    ctx.save();
    ctx.fillStyle = "rgba(245,245,245,0.65)";
    ctx.font = `600 ${Math.max(14, Math.round(W * 0.024))}px "JetBrains Mono", monospace`;
    ctx.textAlign = "center";
    ctx.fillText(this.sortedDone ? "SORT COMPLETE" : `SWAPS: ${this.eventsCount}`, W / 2, H * 0.87);
    ctx.restore();
  }
}
