/**
 * High-definition ASMR Synthesizer using Web Audio API.
 * Connects to both the user speakers and an AudioDestinationNode for video recording.
 */
class AsmrAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private isMuted: boolean = false;
  private soundMode: "chimes" | "marimba" | "arcade" | "glass" | "off" = "chimes";

  // Pentatonic scale frequencies in Hz (A4 = 440Hz base)
  private pentatonic: number[] = [
    261.63, 293.66, 329.63, 392.00, 440.00, // C4, D4, E4, G4, A4
    523.25, 587.33, 659.25, 783.99, 880.00, // C5, D5, E5, G5, A5
    1046.50, 1174.66, 1318.51, 1567.98, 1760.00 // C6, D6, E6, G6, A6
  ];

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.ctx.destination);

      // Create stream destination for recorder
      this.streamDest = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.streamDest);
    } catch {
      // Audio not allowed yet
    }
  }

  public getAudioStream(): MediaStreamTrack | null {
    if (!this.streamDest) this.init();
    return this.streamDest?.stream.getAudioTracks()[0] || null;
  }

  public setSoundMode(mode: "chimes" | "marimba" | "arcade" | "glass" | "off") {
    this.soundMode = mode;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 0.6;
    }
  }

  public playBounce(velocityFactor: number = 1, noteIndex?: number) {
    if (this.soundMode === "off") return;
    if (!this.ctx) this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Select frequency
    const idx = (noteIndex !== undefined)
      ? Math.abs(noteIndex) % this.pentatonic.length
      : Math.floor(Math.random() * this.pentatonic.length);
    const baseFreq = this.pentatonic[idx];

    if (this.soundMode === "chimes") {
      // Shimmering crystal bell with harmonic overtone
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.5 * Math.min(1.5, velocityFactor), t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

      // Overtone
      const overtone = this.ctx.createOscillator();
      const oGain = this.ctx.createGain();
      overtone.type = "sine";
      overtone.frequency.setValueAtTime(baseFreq * 2.76, t);
      oGain.gain.setValueAtTime(0.2, t);
      oGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      overtone.connect(oGain);
      oGain.connect(this.masterGain);
      overtone.start(t);
      overtone.stop(t + 0.35);

    } else if (this.soundMode === "marimba") {
      // Warm woody click
      osc.type = "triangle";
      osc.frequency.setValueAtTime(baseFreq * 0.75, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.7, t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    } else if (this.soundMode === "glass") {
      // High pitch wine glass ping
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq * 1.5, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

    } else if (this.soundMode === "arcade") {
      // Retro 8-bit blip
      osc.type = "square";
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, t + 0.08);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    }

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 1.0);
  }

  public playClack() {
    if (this.soundMode === "off" || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.04);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }
}

export const soundEngine = new AsmrAudioEngine();
