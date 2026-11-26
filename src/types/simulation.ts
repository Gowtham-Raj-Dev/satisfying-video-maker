export type GameCategoryId =
  | "physics"
  | "marble-races"
  | "crushing"
  | "sand"
  | "liquid"
  | "gravity"
  | "particles"
  | "chain-reactions";

export type SimulationStatus = "playable" | "experimental" | "coming-soon";

export type EngineId =
  | "bouncing-ball"
  | "ring-escape"
  | "marble-race"
  | "hydraulic-press"
  | "kinetic-sand"
  | "fluid-swirl"
  | "orbital-gravity"
  | "three-space"
  | "matter-ball-pit"
  | "domino-chain"
  | "pendulum-wave"
  | "gear-clockwork"
  | "magnetic-attractor"
  | "color-sorter"
  | "geometric-pattern"
  | "bubble-pop"
  | "particle-wonder"
  | "kinetic-art";

export type PerformancePreset = "low" | "balanced" | "high";

export type BackgroundStyle = "solid" | "grid" | "radial" | "dots";

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
  bg: string;
  isCustom?: boolean;
}

export type SoundPresetId =
  | "glass-chime"
  | "crystal-ping"
  | "soft-bell"
  | "soft-piano"
  | "musical-notes"
  | "ambient-piano"
  | "wooden-marimba"
  | "wood-tap"
  | "hollow-knock"
  | "bubble-pop"
  | "soft-click"
  | "squish"
  | "water-drop"
  | "sand-movement"
  | "metal-impact"
  | "hydraulic-compression"
  | "mechanical-tick"
  | "8-bit"
  | "digital-pulse"
  | "synth-pluck"
  | "off";

export type AmbientPresetId = "none" | "space-drone" | "relaxing-pad" | "soft-atmosphere";

export type SoundCategoryId =
  | "crystal"
  | "piano"
  | "wood"
  | "asmr"
  | "mechanical"
  | "electronic"
  | "ambient";

export interface AudioConfig {
  enabled: boolean;
  preset: SoundPresetId;
  volume: number; // 0..1
  pitch: number; // 0.5..2.0
  pitchVariation: number; // 0..0.35
  reverbMix: number; // 0..1
  delayMix: number; // 0..1
  stereoPanDepth: number; // 0..1
  ambientPreset: AmbientPresetId;
  ambientVolume: number; // 0..0.6
  collisionMode: "all" | "major" | "subtle";
}

export type OverlayFont = "Inter" | "Impact" | "Mono" | "Georgia";
export type OverlayAnimation = "none" | "fade" | "slide";
export type OverlayBackground = "none" | "pill" | "bar";

export interface TextOverlayLayer {
  enabled: boolean;
  text: string;
  font: OverlayFont;
  fontSize: number; // px relative to 1080 width
  color: string;
  yOffsetPct: number; // 0..100 from top
  shadow: boolean;
  background: OverlayBackground;
  animation: OverlayAnimation;
}

export interface OverlayConfig {
  top: TextOverlayLayer;
  bottom: TextOverlayLayer;
}

export interface MarbleParticipant {
  id: string;
  name: string;
  flag: string;
  color: string;
  team?: "A" | "B";
}

export interface Camera3DConfig {
  distance: number; // 4..20
  tilt: number; // -1.2..1.2 rad
  fov: number; // 35..85
  autoOrbit: number; // 0..2
}

export interface SimulationParams {
  // General physics & timing
  speed: number; // 0.25..2.5
  objectCount: number; // 1..2000 depending on engine
  objectSize: number; // 0.4..2.2 scale factor
  gravity: number; // 0..2.0 scale
  bounce: number; // 0.2..1.15 restitution
  friction: number; // 0..0.2
  collisionIntensity: number; // 0.2..2.0
  rotationSpeed: number; // -5..5
  particleCount: number; // 0..2000
  trailLength: number; // 0..40
  animationIntensity: number; // 0.2..2.0
  seed: number;

  // Visuals
  bgColor: string;
  bgStyle: BackgroundStyle;
  colors: string[];
  paletteId: string;
  neonEffects: boolean;
  glowIntensity: number; // 0..1
  particleEffects: boolean;
  trailEffects: boolean;
  shadows: boolean;
  lighting: number; // 0.3..1.6
  performance: PerformancePreset;
  camera3D: Camera3DConfig;

  // Game-specific variants and controls
  variant: string;
  containerShape: "circle" | "hexagon" | "octagon" | "triangle" | "star";
  multiplyMode: "none" | "wall" | "ball" | "both";
  arenaLayout: "clean" | "split-gate" | "peg-field" | "center-bumper" | "dual-chamber";
  maxMultiplyBalls: number;
  speedIncrement: number; // % per bounce
  ringCount: number;
  ringThickness: number;
  gapSize: number; // radians 0.2..1.8
  pressMaterial: "gel" | "clay" | "metal" | "glass" | "foam" | "layered";
  pressShape: "cube" | "sphere" | "can" | "pyramid" | "stack";
  pressSpeed: number;
  fractureEffects: boolean;
  sandFlowSpeed: number;
  sandNozzleWidth: number;
  jarShape: "rectangle" | "hourglass" | "flask" | "open";
  sandLayerPattern: "rainbow" | "bands" | "gradient" | "dual";
  pegLayout: "grid" | "staggered" | "funnel" | "none";
  gravityStrength: number;
  spiralSpeed: number;
  orbitRadius: number;
  eventHorizonSize: number;
  marbles: MarbleParticipant[];
  trackStyle:
    | "mixed"
    | "spiral"
    | "plinko"
    | "obstacle"
    | "elimination"
    | "team"
    | "infinite"
    | "duel"
    | "funnel"
    | "pinball"
    | "pyramid";
  trackDifficulty: "chill" | "balanced" | "chaotic";
  showLeaderboard: boolean;
  confettiEnabled: boolean;
}

export type ControlSection =
  | "general"
  | "physics"
  | "visuals"
  | "marble"
  | "ring"
  | "press"
  | "sand"
  | "space"
  | "camera3d";

export interface GameDefinition {
  id: string;
  name: string;
  shortDesc: string;
  description: string;
  creatorTip: string;
  category: GameCategoryId;
  engineId: EngineId;
  status: SimulationStatus;
  is3D?: boolean;
  featured?: boolean;
  trending?: boolean;
  tags: string[];
  sections: ControlSection[];
  recommendedSound: SoundPresetId;
  recommendedAmbient?: AmbientPresetId;
  defaultAudio?: Partial<AudioConfig>;
  defaultParams: Partial<SimulationParams>;
  defaultOverlays?: {
    topText?: string;
    bottomText?: string;
    topFont?: OverlayFont;
    bottomFont?: OverlayFont;
    topBg?: OverlayBackground;
    bottomBg?: OverlayBackground;
    topAnim?: OverlayAnimation;
    bottomAnim?: OverlayAnimation;
    topY?: number;
    bottomY?: number;
    topColor?: string;
    bottomColor?: string;
    bottomEnabled?: boolean;
  };
  relatedIds: string[];
}

export type AspectRatioId = "9:16" | "16:9" | "1:1";

export interface VideoResolutionOption {
  id: string;
  label: string;
  width: number;
  height: number;
  aspect: AspectRatioId;
  tag: string;
}

export interface ExportSettings {
  resolutionId: string;
  width: number;
  height: number;
  fps: 30 | 60;
  durationSeconds: number;
  bitrateMbps: number;
  includeAudio: boolean;
}

export interface CreationRecord {
  id: string;
  title: string;
  gameId: string;
  gameName: string;
  createdAt: number;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  fileSizeBytes: number;
  mimeType: string;
  ext: string;
  encoderUsed: string;
  thumbnailDataUrl: string;
  hasVideoBlob: boolean;
  videoBlob?: Blob;
}

export interface SavedPresetRecord {
  id: string;
  name: string;
  gameId: string;
  gameName: string;
  createdAt: number;
  params: SimulationParams;
  audio: AudioConfig;
  overlays: OverlayConfig;
}
