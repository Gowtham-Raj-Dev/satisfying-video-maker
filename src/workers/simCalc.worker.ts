/// <reference lib="webworker" />

export interface SpiralJobRequest {
  id: number;
  type: "galaxy-points" | "phyllotaxis";
  count: number;
  radius: number;
  seed: number;
}

export interface SpiralPoint {
  angle: number;
  radius: number;
  arm: number;
  size: number;
  speed: number;
}

function mulberry32(seed: number) {
  let state = (seed | 0) || 123456;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

self.onmessage = (event: MessageEvent<SpiralJobRequest>) => {
  const { id, type, count, radius, seed } = event.data;
  const rng = mulberry32(seed);
  const points: SpiralPoint[] = [];

  if (type === "galaxy-points") {
    const arms = 4;
    for (let i = 0; i < count; i++) {
      const arm = i % arms;
      const distNorm = Math.pow(rng(), 0.7);
      const r = 18 + distNorm * radius;
      const spread = (rng() - 0.5) * 0.55;
      const angle = (arm / arms) * Math.PI * 2 + distNorm * 4.2 + spread;
      points.push({
        angle,
        radius: r,
        arm,
        size: 1.5 + rng() * 3.2,
        speed: 0.4 + (1 - distNorm) * 1.4,
      });
    }
  } else {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const r = radius * Math.sqrt((i + 1) / count);
      const angle = i * goldenAngle;
      points.push({
        angle,
        radius: r,
        arm: i % 6,
        size: 2.2 + (i / count) * 3.8,
        speed: 0.6,
      });
    }
  }

  self.postMessage({ id, points });
};
