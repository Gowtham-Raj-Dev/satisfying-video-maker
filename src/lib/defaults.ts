import {
  AudioConfig,
  ExportSettings,
  GameCategoryId,
  MarbleParticipant,
  OverlayConfig,
  SimulationParams,
  VideoResolutionOption,
} from "@/types/simulation";
import { COLOR_PALETTES } from "./palettes";

export const CATEGORIES: { id: GameCategoryId; label: string; shortDesc: string }[] = [
  { id: "physics", label: "Physics", shortDesc: "Shrinking cages, laser doublers, ring escapes & rigid-body collisions" },
  { id: "marble-races", label: "Marble Races", shortDesc: "1v1 duels, cyclone funnels, pinball gauntlets & team tracks" },
  { id: "crushing", label: "Crushing", shortDesc: "100T press, razor soap cube carving, floral foam & marble shatters" },
  { id: "sand", label: "Sand", shortDesc: "Dig-tunnel marble puzzles, sand choppers, treasure sieves & waterfalls" },
  { id: "liquid", label: "Liquid", shortDesc: "Ferrofluid arena, rising gate dodge, beaker fill & mercury merge" },
  { id: "gravity", label: "Gravity & Space", shortDesc: "Binary pulsar slingshots, Saturn moon wake, black holes & 3D runners" },
  { id: "particles", label: "Particles", shortDesc: "Vortex harvest, brick breaker, chain blast pop, cymatics & blade slicer" },
  { id: "chain-reactions", label: "Chain Reactions", shortDesc: "Domino waves, xylophone pinball drops, cradle smash & gear elevators" },
];

export const DEFAULT_MARBLES: MarbleParticipant[] = [
  { id: "in", name: "India", flag: "🇮🇳", color: "#FF9933", team: "A" },
  { id: "us", name: "USA", flag: "🇺🇸", color: "#3B82F6", team: "B" },
  { id: "br", name: "Brazil", flag: "🇧🇷", color: "#10B981", team: "A" },
  { id: "jp", name: "Japan", flag: "🇯🇵", color: "#EF4444", team: "B" },
  { id: "de", name: "Germany", flag: "🇩🇪", color: "#FBBF24", team: "A" },
  { id: "gb", name: "UK", flag: "🇬🇧", color: "#8B5CF6", team: "B" },
  { id: "fr", name: "France", flag: "🇫🇷", color: "#06B6D4", team: "A" },
  { id: "ca", name: "Canada", flag: "🇨🇦", color: "#F43F5E", team: "B" },
];

export const EXTRA_COUNTRY_MARBLES: MarbleParticipant[] = [
  { id: "kr", name: "Korea", flag: "🇰🇷", color: "#60A5FA", team: "A" },
  { id: "au", name: "Australia", flag: "🇦🇺", color: "#34D399", team: "B" },
  { id: "mx", name: "Mexico", flag: "🇲🇽", color: "#22C55E", team: "A" },
  { id: "es", name: "Spain", flag: "🇪🇸", color: "#F97316", team: "B" },
  { id: "it", name: "Italy", flag: "🇮🇹", color: "#14B8A6", team: "A" },
  { id: "ar", name: "Argentina", flag: "🇦🇷", color: "#38BDF8", team: "B" },
  { id: "nl", name: "Netherlands", flag: "🇳🇱", color: "#FB923C", team: "A" },
  { id: "se", name: "Sweden", flag: "🇸🇪", color: "#FACC15", team: "B" },
];

export const DEFAULT_SIM_PARAMS: SimulationParams = {
  speed: 1,
  objectCount: 1,
  objectSize: 1,
  gravity: 0.72,
  bounce: 0.97,
  friction: 0.01,
  collisionIntensity: 1,
  rotationSpeed: 0.7,
  particleCount: 420,
  trailLength: 16,
  animationIntensity: 0.9,
  seed: 4219,

  bgColor: COLOR_PALETTES[0].bg,
  bgStyle: "radial",
  colors: [...COLOR_PALETTES[0].colors],
  paletteId: COLOR_PALETTES[0].id,
  neonEffects: true,
  glowIntensity: 0.65,
  particleEffects: true,
  trailEffects: true,
  shadows: true,
  lighting: 1,
  performance: "balanced",
  camera3D: {
    distance: 10,
    tilt: 0.35,
    fov: 52,
    autoOrbit: 0.35,
  },

  variant: "default",
  containerShape: "circle",
  multiplyMode: "none",
  arenaLayout: "clean",
  maxMultiplyBalls: 96,
  speedIncrement: 0.15,
  ringCount: 6,
  ringThickness: 12,
  gapSize: 0.58,
  pressMaterial: "gel",
  pressShape: "cube",
  pressSpeed: 0.85,
  fractureEffects: true,
  sandFlowSpeed: 5,
  sandNozzleWidth: 26,
  jarShape: "rectangle",
  sandLayerPattern: "rainbow",
  pegLayout: "staggered",
  gravityStrength: 0.9,
  spiralSpeed: 0.8,
  orbitRadius: 1,
  eventHorizonSize: 1,
  marbles: DEFAULT_MARBLES,
  trackStyle: "mixed",
  trackDifficulty: "balanced",
  showLeaderboard: true,
  confettiEnabled: true,
};

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  enabled: true,
  preset: "glass-chime",
  volume: 0.65,
  pitch: 1,
  pitchVariation: 0.04,
  reverbMix: 0.25,
  delayMix: 0.1,
  stereoPanDepth: 0.6,
  ambientPreset: "none",
  ambientVolume: 0.18,
  collisionMode: "all",
};

export const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
  top: {
    enabled: true,
    text: "Wait for the end 😱",
    font: "Inter",
    fontSize: 40,
    color: "#F5F5F5",
    yOffsetPct: 9,
    shadow: true,
    background: "pill",
    animation: "fade",
  },
  bottom: {
    enabled: true,
    text: "Relaxing ASMR 🎧",
    font: "Inter",
    fontSize: 32,
    color: "#C4FF2E",
    yOffsetPct: 91,
    shadow: true,
    background: "pill",
    animation: "slide",
  },
};

export const VIDEO_RESOLUTIONS: VideoResolutionOption[] = [
  { id: "1080x1920", label: "1080 × 1920", width: 1080, height: 1920, aspect: "9:16", tag: "Shorts / Reels / TikTok" },
  { id: "720x1280", label: "720 × 1280", width: 720, height: 1280, aspect: "9:16", tag: "Fast Vertical HD" },
  { id: "1920x1080", label: "1920 × 1080", width: 1920, height: 1080, aspect: "16:9", tag: "YouTube Landscape" },
  { id: "1080x1080", label: "1080 × 1080", width: 1080, height: 1080, aspect: "1:1", tag: "Square Feed" },
];

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  resolutionId: "1080x1920",
  width: 1080,
  height: 1920,
  fps: 60,
  durationSeconds: 30,
  bitrateMbps: 10,
  includeAudio: true,
};

export function estimateVideoSizeMb(settings: ExportSettings): string {
  const videoBps = settings.bitrateMbps * 1_000_000;
  const audioBps = settings.includeAudio ? 128_000 : 0;
  const totalBytes = ((videoBps + audioBps) * settings.durationSeconds) / 8;
  const mb = totalBytes / (1024 * 1024);
  return mb < 1 ? `${(mb * 1024).toFixed(0)} KB` : `~${mb.toFixed(1)} MB`;
}
