import { DEFAULT_AUDIO_CONFIG } from "@/lib/defaults";
import { AmbientPresetId, AudioConfig, SoundCategoryId, SoundPresetId } from "@/types/simulation";

export interface SoundPresetInfo {
  id: SoundPresetId;
  label: string;
  category: Exclude<SoundCategoryId, "ambient">;
}

export const SOUND_CATEGORIES: { id: SoundCategoryId; label: string }[] = [
  { id: "crystal", label: "Crystal" },
  { id: "piano", label: "Piano" },
  { id: "wood", label: "Wood" },
  { id: "asmr", label: "ASMR" },
  { id: "mechanical", label: "Mechanical" },
  { id: "electronic", label: "Electronic" },
  { id: "ambient", label: "Ambient" },
];

export const SOUND_PRESETS: SoundPresetInfo[] = [
  { id: "glass-chime", label: "Glass Chime", category: "crystal" },
  { id: "crystal-ping", label: "Crystal Ping", category: "crystal" },
  { id: "soft-bell", label: "Soft Bell", category: "crystal" },

  { id: "soft-piano", label: "Soft Piano Notes", category: "piano" },
  { id: "musical-notes", label: "Musical Scale", category: "piano" },
  { id: "ambient-piano", label: "Ambient Piano", category: "piano" },

  { id: "wooden-marimba", label: "Wooden Marimba", category: "wood" },
  { id: "wood-tap", label: "Wood Tap", category: "wood" },
  { id: "hollow-knock", label: "Hollow Wooden Knock", category: "wood" },

  { id: "bubble-pop", label: "Bubble Pop", category: "asmr" },
  { id: "soft-click", label: "Soft Click", category: "asmr" },
  { id: "squish", label: "Squish", category: "asmr" },
  { id: "water-drop", label: "Water Drop", category: "asmr" },
  { id: "sand-movement", label: "Sand Movement", category: "asmr" },

  { id: "metal-impact", label: "Metal Impact", category: "mechanical" },
  { id: "hydraulic-compression", label: "Hydraulic Compression", category: "mechanical" },
  { id: "mechanical-tick", label: "Mechanical Movement", category: "mechanical" },

  { id: "8-bit", label: "8-Bit Blip", category: "electronic" },
  { id: "digital-pulse", label: "Digital Pulse", category: "electronic" },
  { id: "synth-pluck", label: "Synth Pluck", category: "electronic" },
];

export const AMBIENT_PRESETS: { id: AmbientPresetId; label: string }[] = [
  { id: "none", label: "Off" },
  { id: "space-drone", label: "Space Drone" },
  { id: "relaxing-pad", label: "Relaxing Pad" },
  { id: "soft-atmosphere", label: "Soft Atmosphere" },
];

export interface RecordedAudioEvent {
  timeSec: number;
  velocity: number;
  noteIndex?: number;
  panX: number;
  isClack?: boolean;
}

export type AudioPcmListener = (left: Float32Array, right: Float32Array, sampleRate: number) => void;

// Sweet, warm C-major & F-major consonant pentatonic register (avoids harsh ear-fatiguing shrill highs)
const SWEET_PENTATONIC = [
  196.0, 220.0, 261.63, 293.66, 329.63,
  392.0, 440.0, 523.25, 587.33, 659.25,
  783.99, 880.0, 783.99, 659.25, 523.25,
];

const WARM_MAJOR = [
  220.0, 246.94, 261.63, 293.66, 329.63,
  392.0, 440.0, 493.88, 523.25, 587.33,
  659.25, 783.99, 659.25, 523.25, 440.0,
];

interface SynthGraph {
  masterGain: GainNode;
  warmFilter: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  dryGain: GainNode;
  convolver: ConvolverNode;
  wetReverbGain: GainNode;
  delayNode: DelayNode;
  delayFeedback: GainNode;
  wetDelayGain: GainNode;
  noiseBuffer: AudioBuffer;
}

function createImpulseResponse(ctx: BaseAudioContext, duration: number, decay: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      // Smooth pink-tinted stereo tail so reverb sounds velvety instead of fizzing
      const white = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      lp = lp * 0.72 + white * 0.28;
      data[i] = lp;
    }
  }
  return impulse;
}

function createSoftNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const length = Math.max(1, ctx.sampleRate);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Pink/brownian smoothing eliminates harsh white-noise crackle
  let b0 = 0;
  let b1 = 0;
  for (let i = 0; i < length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.94 * b0 + 0.06 * w;
    b1 = 0.78 * b1 + 0.22 * b0;
    data[i] = b1 * 2.2;
  }
  return buffer;
}

function buildSynthGraph(ctx: BaseAudioContext, config: AudioConfig): SynthGraph {
  const masterGain = ctx.createGain();
  masterGain.gain.value = config.enabled && config.preset !== "off" ? config.volume * 0.85 : 0;

  // Soft-knee bus compressor prevents digital clipping distortion during dense rapid hits
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 18;
  compressor.ratio.value = 6;
  compressor.attack.value = 0.008;
  compressor.release.value = 0.22;

  // Master warmth filter tames harsh ultra-high aliasing
  const warmFilter = ctx.createBiquadFilter();
  warmFilter.type = "lowpass";
  warmFilter.frequency.value = 6800;
  warmFilter.Q.value = 0.5;

  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.92;

  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, 1.9, 2.8);
  const wetReverbGain = ctx.createGain();
  wetReverbGain.gain.value = Math.max(0.12, config.reverbMix) * 0.6;

  const delayNode = ctx.createDelay(1.0);
  delayNode.delayTime.value = 0.24;
  const delayLP = ctx.createBiquadFilter();
  delayLP.type = "lowpass";
  delayLP.frequency.value = 2600;
  const delayFeedback = ctx.createGain();
  delayFeedback.gain.value = 0.28;
  const wetDelayGain = ctx.createGain();
  wetDelayGain.gain.value = config.delayMix * 0.4;

  dryGain.connect(warmFilter);
  convolver.connect(wetReverbGain);
  wetReverbGain.connect(warmFilter);

  delayNode.connect(delayLP);
  delayLP.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayLP.connect(wetDelayGain);
  wetDelayGain.connect(warmFilter);

  warmFilter.connect(compressor);
  compressor.connect(masterGain);

  return {
    masterGain,
    warmFilter,
    compressor,
    dryGain,
    convolver,
    wetReverbGain,
    delayNode,
    delayFeedback,
    wetDelayGain,
    noiseBuffer: createSoftNoiseBuffer(ctx),
  };
}

function routeToGraph(ctx: BaseAudioContext, graph: SynthGraph, node: AudioNode, panX: number, panDepth: number) {
  if (typeof ctx.createStereoPanner === "function" && panDepth > 0) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-0.85, Math.min(0.85, panX * panDepth));
    node.connect(panner);
    panner.connect(graph.dryGain);
    panner.connect(graph.convolver);
    panner.connect(graph.delayNode);
  } else {
    node.connect(graph.dryGain);
    node.connect(graph.convolver);
    node.connect(graph.delayNode);
  }
}

function scheduleAmbientOnGraph(
  ctx: BaseAudioContext,
  graph: SynthGraph,
  preset: AmbientPresetId,
  ambientVolume: number,
  durationSec?: number
): { gain: GainNode; oscs: OscillatorNode[] } | null {
  if (preset === "none") return null;
  const ambGain = ctx.createGain();
  ambGain.gain.value = ambientVolume * 0.34;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = preset === "space-drone" ? 320 : preset === "relaxing-pad" ? 540 : 720;
  ambGain.connect(filter);
  filter.connect(graph.dryGain);
  filter.connect(graph.convolver);

  const freqs =
    preset === "space-drone"
      ? [65.41, 98.0, 130.81]
      : preset === "relaxing-pad"
        ? [130.81, 164.81, 196.0, 261.63]
        : [174.61, 220.0, 261.63];

  const oscs: OscillatorNode[] = [];
  for (const f of freqs) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = 1 / freqs.length;
    osc.connect(g);
    g.connect(ambGain);
    osc.start(0);
    if (durationSec !== undefined) osc.stop(durationSec);
    oscs.push(osc);
  }
  return { gain: ambGain, oscs };
}

function triggerSynthVoice(
  ctx: BaseAudioContext,
  graph: SynthGraph,
  config: AudioConfig,
  t: number,
  velocityFactor: number,
  noteIndex: number | undefined,
  panX: number,
  isClack = false
) {
  if (!config.enabled || config.preset === "off") return;

  // Soft velvet marimba clack (gentle damped pulse instead of harsh mid spike)
  if (isClack) {
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(620 * config.pitch, t);
    const gain = ctx.createGain();
    osc.type = "sine";
    const clackPitch = SWEET_PENTATONIC[Math.abs(noteIndex || 0) % 6] * 0.85 * config.pitch;
    osc.frequency.setValueAtTime(clackPitch, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(55, clackPitch * 0.55), t + 0.06);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.16, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
    osc.connect(lp);
    lp.connect(gain);
    routeToGraph(ctx, graph, gain, panX, config.stereoPanDepth);
    osc.start(t);
    osc.stop(t + 0.095);
    return;
  }

  const vel =
    Math.max(0.25, Math.min(1.15, velocityFactor)) * (config.collisionMode === "subtle" ? 0.65 : 0.9);
  const scale = config.preset === "musical-notes" || config.preset === "8-bit" ? WARM_MAJOR : SWEET_PENTATONIC;
  const idx =
    noteIndex !== undefined
      ? Math.abs(noteIndex) % scale.length
      : Math.floor(Math.random() * scale.length);
  const variation = 1 + (Math.random() - 0.5) * 1.2 * config.pitchVariation;
  const baseFreq = scale[idx] * config.pitch * variation;
  const preset = config.preset;

  const voiceGain = ctx.createGain();
  routeToGraph(ctx, graph, voiceGain, panX, config.stereoPanDepth);

  if (preset === "glass-chime" || preset === "crystal-ping" || preset === "soft-bell") {
    // Sweet warm celesta / kalimba-bell: fundamental + pure consonant octave + gentle fifth shimmer
    const mult = preset === "crystal-ping" ? 1.25 : preset === "soft-bell" ? 0.82 : 1.0;
    const dur = preset === "soft-bell" ? 1.15 : preset === "crystal-ping" ? 0.65 : 0.85;
    const f0 = Math.min(920, baseFreq * mult);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f0, t);

    const over = ctx.createOscillator();
    const overGain = ctx.createGain();
    over.type = "sine";
    over.frequency.setValueAtTime(f0 * 2.0, t);
    overGain.gain.setValueAtTime(0.0001, t);
    overGain.gain.linearRampToValueAtTime(0.14 * vel, t + 0.01);
    overGain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.55);

    voiceGain.gain.setValueAtTime(0.0001, t);
    voiceGain.gain.linearRampToValueAtTime(0.3 * vel, t + 0.011);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    over.connect(overGain);
    overGain.connect(voiceGain);
    osc.connect(voiceGain);
    osc.start(t);
    over.start(t);
    osc.stop(t + dur + 0.04);
    over.stop(t + dur + 0.04);
  } else if (preset === "soft-piano" || preset === "musical-notes" || preset === "ambient-piano") {
    // Felt piano / warm harp chords: smooth attack, lowpassed triangle + sine octave
    const dur = preset === "ambient-piano" ? 1.35 : preset === "musical-notes" ? 0.72 : 0.92;
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(baseFreq * 2.6, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(180, baseFreq * 0.9), t + dur);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(baseFreq * 0.75, t);
    sub.type = "sine";
    sub.frequency.setValueAtTime(baseFreq * 1.5, t);

    const subG = ctx.createGain();
    subG.gain.value = 0.25;
    sub.connect(subG);

    voiceGain.gain.setValueAtTime(0.0001, t);
    voiceGain.gain.linearRampToValueAtTime(0.32 * vel, t + 0.014);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(filter);
    subG.connect(filter);
    filter.connect(voiceGain);
    osc.start(t);
    sub.start(t);
    osc.stop(t + dur + 0.04);
    sub.stop(t + dur + 0.04);
  } else if (preset === "wooden-marimba" || preset === "wood-tap" || preset === "hollow-knock") {
    // Smooth warm rosewood marimba / kalimba pluck
    const dur = preset === "wooden-marimba" ? 0.34 : preset === "hollow-knock" ? 0.18 : 0.14;
    const mult = preset === "hollow-knock" ? 0.48 : preset === "wood-tap" ? 0.95 : 0.76;
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(baseFreq * 2.4, t);
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq * mult, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(70, baseFreq * mult * 0.78), t + dur);

    voiceGain.gain.setValueAtTime(0.0001, t);
    voiceGain.gain.linearRampToValueAtTime(0.38 * vel, t + 0.007);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(lp);
    lp.connect(voiceGain);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  } else if (preset === "bubble-pop" || preset === "water-drop") {
    // Pure sweet water-droplet / glass bubble pitch sweep
    const dur = preset === "water-drop" ? 0.18 : 0.11;
    const startF = preset === "water-drop" ? Math.min(600, baseFreq * 0.8) : baseFreq * 0.65;
    const endF = Math.min(1150, startF * 1.9);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(startF, t);
    osc.frequency.exponentialRampToValueAtTime(endF, t + dur);
    voiceGain.gain.setValueAtTime(0.0001, t);
    voiceGain.gain.linearRampToValueAtTime(0.32 * vel, t + 0.007);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(voiceGain);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  } else if (preset === "soft-click" || preset === "mechanical-tick") {
    // Clean tactile mechanical pebble click (no harsh square fuzz)
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1400, t);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(preset === "mechanical-tick" ? 680 * config.pitch : 420 * config.pitch, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.045);
    voiceGain.gain.setValueAtTime(0.0001, t);
    voiceGain.gain.linearRampToValueAtTime(0.24 * vel, t + 0.005);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
    osc.connect(lp);
    lp.connect(voiceGain);
    osc.start(t);
    osc.stop(t + 0.065);
  } else if (preset === "squish" || preset === "sand-movement" || preset === "hydraulic-compression") {
    // Velvety pink-filtered sand whisper / smooth hydraulic thump (zero high static hiss)
    const src = ctx.createBufferSource();
    src.buffer = graph.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    const dur = preset === "hydraulic-compression" ? 0.3 : preset === "squish" ? 0.18 : 0.11;
    const fStart = preset === "sand-movement" ? 1150 : preset === "squish" ? 520 : 210;
    filter.frequency.setValueAtTime(fStart * config.pitch, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, fStart * 0.48), t + dur);
    filter.Q.value = preset === "squish" ? 3.2 : 1.4;

    if (preset === "hydraulic-compression") {
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(88 * config.pitch, t);
      subOsc.frequency.exponentialRampToValueAtTime(42, t + dur);
      subGain.gain.setValueAtTime(0.0001, t);
      subGain.gain.linearRampToValueAtTime(0.22 * vel, t + 0.015);
      subGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      subOsc.connect(subGain);
      subGain.connect(voiceGain);
      subOsc.start(t);
      subOsc.stop(t + dur + 0.02);
    }

    voiceGain.gain.setValueAtTime(0.0001, t);
    voiceGain.gain.linearRampToValueAtTime(0.26 * vel, t + 0.014);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(voiceGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  } else if (preset === "metal-impact") {
    // Singing titanium bowl chime (smooth harmonic partials)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = "sine";
    osc2.type = "triangle";
    const g2 = ctx.createGain();
    g2.gain.value = 0.28;
    osc1.frequency.setValueAtTime(baseFreq * 0.9, t);
    osc2.frequency.setValueAtTime(baseFreq * 1.5, t);
    voiceGain.gain.setValueAtTime(0.0001, t);
    voiceGain.gain.linearRampToValueAtTime(0.28 * vel, t + 0.009);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
    osc1.connect(voiceGain);
    osc2.connect(g2);
    g2.connect(voiceGain);
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.5);
    osc2.stop(t + 0.5);
  } else {
    // Rounded synth pluck / melodic arpeggio (lowpassed smooth triangle, no harsh square buzzing)
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(2600, baseFreq * 3.0), t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(200, baseFreq * 0.95), t + 0.25);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(baseFreq, t);
    if (preset === "8-bit") osc.frequency.setValueAtTime(baseFreq * 1.25, t + 0.05);
    if (preset === "digital-pulse") osc.frequency.exponentialRampToValueAtTime(Math.max(120, baseFreq * 0.75), t + 0.14);
    const dur = preset === "synth-pluck" ? 0.38 : 0.22;
    voiceGain.gain.setValueAtTime(0.0001, t);
    voiceGain.gain.linearRampToValueAtTime(0.26 * vel, t + 0.01);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filter);
    filter.connect(voiceGain);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }
}

export async function renderOfflineAudioBuffer(
  events: RecordedAudioEvent[],
  durationSec: number,
  sampleRate: number,
  config: AudioConfig
): Promise<AudioBuffer> {
  const totalSamples = Math.max(sampleRate, Math.ceil(durationSec * sampleRate));
  const OfflineCtx =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const offline = new OfflineCtx(2, totalSamples, sampleRate);
  const graph = buildSynthGraph(offline, config);
  graph.masterGain.connect(offline.destination);

  if (config.enabled && config.ambientPreset !== "none") {
    scheduleAmbientOnGraph(offline, graph, config.ambientPreset, config.ambientVolume, durationSec);
  }

  for (const ev of events) {
    if (ev.timeSec < 0 || ev.timeSec >= durationSec - 0.02) continue;
    triggerSynthVoice(offline, graph, config, ev.timeSec, ev.velocity, ev.noteIndex, ev.panX, ev.isClack);
  }

  return offline.startRendering();
}

class AsmrAudioEngine {
  private ctx: AudioContext | null = null;
  private graph: SynthGraph | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOscs: OscillatorNode[] = [];
  private currentAmbient: AmbientPresetId = "none";

  private pcmTapNode: ScriptProcessorNode | null = null;
  private pcmListeners = new Set<AudioPcmListener>();

  private config: AudioConfig = { ...DEFAULT_AUDIO_CONFIG };
  private lastEventTime = 0;
  private lastClackTime = 0;

  private offlineCapturing = false;
  private offlineTimeSec = 0;
  private offlineEvents: RecordedAudioEvent[] = [];
  private lastOfflineEventSec = -1;
  private lastOfflineClackSec = -1;
  private unlockListenerAttached = false;

  public init() {
    if (typeof window === "undefined") return;

    if (!this.unlockListenerAttached) {
      this.unlockListenerAttached = true;
      const unlock = () => {
        if (this.ctx && this.ctx.state === "suspended") {
          this.ctx.resume().catch(() => {});
        }
      };
      window.addEventListener("pointerdown", unlock, { passive: true });
      window.addEventListener("keydown", unlock, { passive: true });
    }

    if (!this.ctx) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
        this.graph = buildSynthGraph(this.ctx, this.config);
        this.graph.masterGain.connect(this.ctx.destination);

        this.streamDest = this.ctx.createMediaStreamDestination();
        this.graph.masterGain.connect(this.streamDest);
        this.setupPcmTap();
        this.syncAmbient();
      } catch {
        // Audio blocked
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public beginOfflineCapture() {
    this.offlineCapturing = true;
    this.offlineTimeSec = 0;
    this.offlineEvents = [];
    this.lastOfflineEventSec = -1;
    this.lastOfflineClackSec = -1;
  }

  public setOfflineTime(timeSec: number) {
    this.offlineTimeSec = timeSec;
  }

  public endOfflineCapture(): RecordedAudioEvent[] {
    this.offlineCapturing = false;
    const out = this.offlineEvents;
    this.offlineEvents = [];
    return out;
  }

  private setupPcmTap() {
    if (!this.ctx || !this.graph || this.pcmTapNode) return;
    try {
      const tap = this.ctx.createScriptProcessor(2048, 2, 2);
      const silentSink = this.ctx.createGain();
      silentSink.gain.value = 0;

      tap.onaudioprocess = (e) => {
        if (this.pcmListeners.size === 0) return;
        const left = e.inputBuffer.getChannelData(0);
        const right = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : left;
        const lCopy = new Float32Array(left);
        const rCopy = new Float32Array(right);
        const sr = e.inputBuffer.sampleRate;
        for (const cb of this.pcmListeners) {
          cb(lCopy, rCopy, sr);
        }
      };

      this.graph.masterGain.connect(tap);
      tap.connect(silentSink);
      silentSink.connect(this.ctx.destination);
      this.pcmTapNode = tap;
    } catch {
      // Fallback
    }
  }

  public addPcmListener(cb: AudioPcmListener): () => void {
    this.init();
    this.pcmListeners.add(cb);
    return () => {
      this.pcmListeners.delete(cb);
    };
  }

  public getSampleRate(): number {
    return this.ctx?.sampleRate || 48000;
  }

  public getAudioStream(): MediaStreamTrack | null {
    if (!this.streamDest) this.init();
    return this.streamDest?.stream.getAudioTracks()[0] || null;
  }

  public getConfig(): AudioConfig {
    return { ...this.config };
  }

  public updateConfig(next: Partial<AudioConfig>) {
    this.config = { ...this.config, ...next };
    if (this.graph && this.ctx) {
      const target = this.config.enabled && this.config.preset !== "off" ? this.config.volume * 0.85 : 0;
      this.graph.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.025);
      this.graph.wetReverbGain.gain.setTargetAtTime(Math.max(0.12, this.config.reverbMix) * 0.6, this.ctx.currentTime, 0.04);
      this.graph.wetDelayGain.gain.setTargetAtTime(this.config.delayMix * 0.4, this.ctx.currentTime, 0.04);
    }
    this.syncAmbient();
  }

  public setSoundMode(mode: "chimes" | "marimba" | "arcade" | "glass" | "off") {
    const map: Record<string, SoundPresetId> = {
      chimes: "glass-chime",
      marimba: "wooden-marimba",
      arcade: "8-bit",
      glass: "crystal-ping",
      off: "off",
    };
    this.updateConfig({ preset: map[mode] || "glass-chime", enabled: mode !== "off" });
  }

  public setMuted(muted: boolean) {
    this.updateConfig({ enabled: !muted });
  }

  private syncAmbient() {
    if (!this.ctx || !this.graph) return;
    const want = this.config.enabled ? this.config.ambientPreset : "none";
    if (want !== this.currentAmbient) {
      this.stopAmbientOscs();
      this.currentAmbient = want;
      if (want !== "none") {
        const res = scheduleAmbientOnGraph(this.ctx, this.graph, want, this.config.ambientVolume);
        if (res) {
          this.ambientGain = res.gain;
          this.ambientOscs = res.oscs;
        }
      }
    }
    if (this.ambientGain && this.ctx) {
      const gainVal = want === "none" ? 0 : this.config.ambientVolume * 0.34;
      this.ambientGain.gain.setTargetAtTime(gainVal, this.ctx.currentTime, 0.15);
    }
  }

  private stopAmbientOscs() {
    for (const osc of this.ambientOscs) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    }
    this.ambientOscs = [];
    if (this.ambientGain) {
      this.ambientGain.disconnect();
      this.ambientGain = null;
    }
  }

  public previewPreset(preset: SoundPresetId, noteIndex = 4) {
    this.init();
    if (!this.ctx || !this.graph) return;
    const prev = { ...this.config };
    this.config.preset = preset;
    this.config.enabled = true;
    this.graph.masterGain.gain.value = this.config.volume * 0.85;
    triggerSynthVoice(this.ctx, this.graph, this.config, this.ctx.currentTime, 0.9, noteIndex, 0, false);
    this.config = prev;
    this.updateConfig({});
  }

  public playBounce(velocityFactor = 1, noteIndex?: number, panX = 0) {
    this.playImpact(velocityFactor, noteIndex, panX, false);
  }

  public playImpact(velocityFactor = 1, noteIndex?: number, panX = 0, bypassThrottle = false) {
    if (!this.config.enabled || this.config.preset === "off") return;

    const minIntervalSec =
      this.config.collisionMode === "subtle" ? 0.11 : this.config.collisionMode === "major" ? 0.072 : 0.046;

    if (this.offlineCapturing) {
      if (bypassThrottle || this.offlineTimeSec - this.lastOfflineEventSec >= minIntervalSec) {
        this.lastOfflineEventSec = this.offlineTimeSec;
        this.offlineEvents.push({
          timeSec: this.offlineTimeSec,
          velocity: velocityFactor,
          noteIndex,
          panX,
          isClack: false,
        });
      }
      return;
    }

    if (!this.ctx || !this.graph) return;
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
      return;
    }

    const nowMs = performance.now();
    if (!bypassThrottle && nowMs - this.lastEventTime < minIntervalSec * 1000) return;
    this.lastEventTime = nowMs;

    triggerSynthVoice(this.ctx, this.graph, this.config, this.ctx.currentTime, velocityFactor, noteIndex, panX, false);
  }

  public playClack(panX = 0) {
    if (!this.config.enabled || this.config.preset === "off") return;

    if (this.offlineCapturing) {
      if (this.offlineTimeSec - this.lastOfflineClackSec >= 0.06) {
        this.lastOfflineClackSec = this.offlineTimeSec;
        this.offlineEvents.push({
          timeSec: this.offlineTimeSec,
          velocity: 0.55,
          noteIndex: Math.floor(this.offlineTimeSec * 10) % 8,
          panX,
          isClack: true,
        });
      }
      return;
    }

    if (!this.ctx || !this.graph || this.ctx.state !== "running") return;
    const nowMs = performance.now();
    if (nowMs - this.lastClackTime < 62) return;
    this.lastClackTime = nowMs;
    triggerSynthVoice(
      this.ctx,
      this.graph,
      this.config,
      this.ctx.currentTime,
      0.55,
      Math.floor(nowMs / 80) % 8,
      panX,
      true
    );
  }
}

export const soundEngine = new AsmrAudioEngine();
