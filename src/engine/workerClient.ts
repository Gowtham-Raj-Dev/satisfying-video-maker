import type { SpiralPoint } from "@/workers/simCalc.worker";

let workerInstance: Worker | null = null;
let jobCounter = 0;

function getWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL("../workers/simCalc.worker.ts", import.meta.url));
    } catch {
      return null;
    }
  }
  return workerInstance;
}

function generateSyncFallback(
  type: "galaxy-points" | "phyllotaxis",
  count: number,
  radius: number,
  seed: number
): SpiralPoint[] {
  let state = (seed | 0) || 123456;
  const rng = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const points: SpiralPoint[] = [];
  if (type === "galaxy-points") {
    const arms = 4;
    for (let i = 0; i < count; i++) {
      const arm = i % arms;
      const distNorm = Math.pow(rng(), 0.7);
      const r = 18 + distNorm * radius;
      const spread = (rng() - 0.5) * 0.55;
      points.push({
        angle: (arm / arms) * Math.PI * 2 + distNorm * 4.2 + spread,
        radius: r,
        arm,
        size: 1.5 + rng() * 3.2,
        speed: 0.4 + (1 - distNorm) * 1.4,
      });
    }
  } else {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      points.push({
        angle: i * goldenAngle,
        radius: radius * Math.sqrt((i + 1) / count),
        arm: i % 6,
        size: 2.2 + (i / count) * 3.8,
        speed: 0.6,
      });
    }
  }
  return points;
}

export function computeDistributionInWorker(
  type: "galaxy-points" | "phyllotaxis",
  count: number,
  radius: number,
  seed: number
): Promise<SpiralPoint[]> {
  const worker = getWorker();
  if (!worker) {
    return Promise.resolve(generateSyncFallback(type, count, radius, seed));
  }

  return new Promise((resolve) => {
    const id = ++jobCounter;
    const timeout = setTimeout(() => {
      resolve(generateSyncFallback(type, count, radius, seed));
    }, 300);

    const onMessage = (e: MessageEvent<{ id: number; points: SpiralPoint[] }>) => {
      if (e.data.id === id) {
        clearTimeout(timeout);
        worker.removeEventListener("message", onMessage);
        resolve(e.data.points);
      }
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ id, type, count, radius, seed });
  });
}
