import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { renderOfflineAudioBuffer, soundEngine } from "./audio";
import { SimulationEngine } from "./types";

export type ExportMode = "fast" | "live";

export interface ExportCapabilities {
  webCodecsVideo: boolean;
  h264Profile: string | null;
  webCodecsAudio: boolean;
  audioCodec: "aac" | "opus" | null;
  audioCodecString: string | null;
  mediaRecorderMime: string | null;
  pipelineLabel: string;
  supportsPause: boolean;
}

export interface RecordingOptions {
  mode?: ExportMode;
  width: number;
  height: number;
  fps: 30 | 60;
  durationSeconds: number;
  bitrateMbps: number;
  includeAudio: boolean;
  onProgress?: (secondsElapsed: number, totalSeconds: number, phase: "recording" | "encoding") => void;
  onComplete?: (result: {
    blob: Blob;
    ext: string;
    mimeType: string;
    encoderUsed: string;
    thumbnailDataUrl: string;
    actualDurationSeconds: number;
  }) => void;
  onError?: (err: Error) => void;
}

export async function detectExportCapabilities(
  width: number,
  height: number,
  fps: number,
  bitrateMbps: number
): Promise<ExportCapabilities> {
  let h264Profile: string | null = null;
  let audioCodec: "aac" | "opus" | null = null;
  let audioCodecString: string | null = null;

  if (typeof VideoEncoder !== "undefined" && typeof VideoEncoder.isConfigSupported === "function") {
    const candidates = ["avc1.64002a", "avc1.4d002a", "avc1.420028", "avc1.42001f"];
    for (const codec of candidates) {
      try {
        const res = await VideoEncoder.isConfigSupported({
          codec,
          width,
          height,
          bitrate: bitrateMbps * 1_000_000,
          framerate: fps,
        });
        if (res.supported) {
          h264Profile = codec;
          break;
        }
      } catch {
        // try next profile
      }
    }
  }

  if (
    h264Profile &&
    typeof AudioEncoder !== "undefined" &&
    typeof AudioEncoder.isConfigSupported === "function"
  ) {
    const sampleRate = soundEngine.getSampleRate();
    try {
      const aacCheck = await AudioEncoder.isConfigSupported({
        codec: "mp4a.40.2",
        sampleRate,
        numberOfChannels: 2,
        bitrate: 128_000,
      });
      if (aacCheck.supported) {
        audioCodec = "aac";
        audioCodecString = "mp4a.40.2";
      }
    } catch {
      // check opus
    }

    if (!audioCodec) {
      try {
        const opusCheck = await AudioEncoder.isConfigSupported({
          codec: "opus",
          sampleRate: 48000,
          numberOfChannels: 2,
          bitrate: 128_000,
        });
        if (opusCheck.supported) {
          audioCodec = "opus";
          audioCodecString = "opus";
        }
      } catch {
        // video-only
      }
    }
  }

  let mediaRecorderMime: string | null = null;
  if (typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function") {
    const mimes = [
      "video/mp4;codecs=avc1.4d002a,mp4a.40.2",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const m of mimes) {
      if (MediaRecorder.isTypeSupported(m)) {
        mediaRecorderMime = m;
        break;
      }
    }
  }

  const webCodecsVideo = Boolean(h264Profile);
  const pipelineLabel = webCodecsVideo
    ? `WebCodecs H.264 (${h264Profile})${audioCodec ? ` + ${audioCodec.toUpperCase()}` : ""} → MP4`
    : mediaRecorderMime
      ? `MediaRecorder Fallback (${mediaRecorderMime})`
      : "Unsupported in this browser";

  return {
    webCodecsVideo,
    h264Profile,
    webCodecsAudio: Boolean(audioCodec),
    audioCodec,
    audioCodecString,
    mediaRecorderMime,
    pipelineLabel,
    supportsPause: true,
  };
}

export class VideoRecorder {
  private isRecording = false;
  private isPaused = false;
  private stopRequested = false;
  private activeCleanup: (() => void) | null = null;
  private mediaRecorder: MediaRecorder | null = null;

  public get recording(): boolean {
    return this.isRecording;
  }

  public get paused(): boolean {
    return this.isPaused;
  }

  public pause(): void {
    if (!this.isRecording || this.isPaused) return;
    this.isPaused = true;
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      try {
        this.mediaRecorder.pause();
      } catch {}
    }
  }

  public resume(): void {
    if (!this.isRecording || !this.isPaused) return;
    this.isPaused = false;
    if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
      try {
        this.mediaRecorder.resume();
      } catch {}
    }
  }

  public stop(): void {
    if (!this.isRecording) return;
    this.stopRequested = true;
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
  }

  public forceCleanup(): void {
    this.isRecording = false;
    this.isPaused = false;
    this.stopRequested = true;
    if (this.activeCleanup) {
      this.activeCleanup();
      this.activeCleanup = null;
    }
  }

  public async start(engine: SimulationEngine, options: RecordingOptions): Promise<void> {
    if (this.isRecording) return;
    this.isRecording = true;
    this.isPaused = false;
    this.stopRequested = false;

    try {
      soundEngine.init();
      const caps = await detectExportCapabilities(
        options.width,
        options.height,
        options.fps,
        options.bitrateMbps
      );

      if (caps.webCodecsVideo && caps.h264Profile) {
        if ((options.mode || "fast") === "fast") {
          await this.renderDeterministicWebCodecs(engine, options, caps);
        } else {
          await this.recordLiveWebCodecs(engine, options, caps);
        }
      } else if (caps.mediaRecorderMime) {
        await this.recordWithMediaRecorder(engine, options, caps.mediaRecorderMime);
      } else {
        throw new Error("Neither WebCodecs VideoEncoder nor MediaRecorder is supported in this browser.");
      }
    } catch (err) {
      this.isRecording = false;
      this.isPaused = false;
      soundEngine.endOfflineCapture();
      if (this.activeCleanup) {
        this.activeCleanup();
        this.activeCleanup = null;
      }
      options.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Deterministic offline frame-by-frame render + OfflineAudioContext synthesis.
   * Produces exact duration, zero dropped frames, and sample-accurate synced ASMR audio,
   * often finishing 2x-4x faster than real-time.
   */
  private async renderDeterministicWebCodecs(
    engine: SimulationEngine,
    options: RecordingOptions,
    caps: ExportCapabilities
  ) {
    const { width, height, fps, durationSeconds, bitrateMbps, includeAudio } = options;
    const sourceCanvas = engine.getCanvas();
    const prevW = sourceCanvas.width;
    const prevH = sourceCanvas.height;

    // Pause live RAF loop so we never double-render frames during deterministic export
    engine.setExportingMode?.(true);
    engine.pause();
    engine.reset();
    if (prevW !== width || prevH !== height) {
      engine.resize(width, height);
    }

    const useAudio = Boolean(includeAudio && caps.webCodecsAudio && caps.audioCodecString && caps.audioCodec);
    const sampleRate = caps.audioCodec === "opus" ? 48000 : soundEngine.getSampleRate();

    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target,
      video: { codec: "avc", width, height, frameRate: fps },
      audio: useAudio && caps.audioCodec
        ? { codec: caps.audioCodec, numberOfChannels: 2, sampleRate }
        : undefined,
      fastStart: "in-memory",
    });

    let videoEncoderError: Error | null = null;
    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (err) => {
        videoEncoderError = err;
      },
    });

    videoEncoder.configure({
      codec: caps.h264Profile!,
      width,
      height,
      bitrate: bitrateMbps * 1_000_000,
      framerate: fps,
      avc: { format: "avc" },
    });

    soundEngine.beginOfflineCapture();

    const totalFrames = Math.max(1, Math.round(durationSeconds * fps));
    const dt = 1 / fps;
    const frameDurUs = Math.round(1_000_000 / fps);
    let renderedFrames = 0;
    let thumbnailDataUrl = "";
    let cancelled = false;

    this.activeCleanup = () => {
      cancelled = true;
      soundEngine.endOfflineCapture();
      if (sourceCanvas.width !== prevW || sourceCanvas.height !== prevH) {
        engine.resize(prevW, prevH);
      }
    };

    const yieldFrame = () =>
      new Promise<void>((resolve) => {
        if (typeof MessageChannel !== "undefined") {
          const ch = new MessageChannel();
          ch.port1.onmessage = () => resolve();
          ch.port2.postMessage(null);
        } else {
          setTimeout(resolve, 0);
        }
      });

    try {
      for (let f = 0; f < totalFrames; f++) {
        if (!this.isRecording || this.stopRequested || cancelled) break;
        while (this.isPaused && this.isRecording && !this.stopRequested) {
          await new Promise((r) => setTimeout(r, 60));
        }
        if (!this.isRecording || this.stopRequested || cancelled) break;

        if (videoEncoder.encodeQueueSize > 10) {
          await new Promise<void>((resolve) => {
            const onDeq = () => {
              videoEncoder.removeEventListener("dequeue", onDeq);
              resolve();
            };
            videoEncoder.addEventListener("dequeue", onDeq);
            setTimeout(onDeq, 16);
          });
        }

        const simTimeSec = f * dt;
        soundEngine.setOfflineTime(simTimeSec);
        engine.stepExportFrame(dt);
        engine.render();

        if (!thumbnailDataUrl && (f === Math.min(12, Math.floor(totalFrames / 4)) || f === 0)) {
          try {
            thumbnailDataUrl = sourceCanvas.toDataURL("image/jpeg", 0.78);
          } catch {}
        }

        const timestampUs = Math.round((f * 1_000_000) / fps);
        const frame = new VideoFrame(sourceCanvas, {
          timestamp: timestampUs,
          duration: frameDurUs,
        });
        videoEncoder.encode(frame, { keyFrame: f % (fps * 2) === 0 });
        frame.close();
        renderedFrames++;

        // Yield periodically via MessageChannel so UI updates smoothly without 15ms timer clamping
        if (f % 12 === 0 || f === totalFrames - 1) {
          options.onProgress?.((renderedFrames / totalFrames) * durationSeconds, durationSeconds, "recording");
          await yieldFrame();
        }
      }

      const audioEvents = soundEngine.endOfflineCapture();
      const actualDur = Math.max(dt, renderedFrames / fps);
      options.onProgress?.(actualDur, durationSeconds, "encoding");

      if (useAudio && caps.audioCodecString && renderedFrames > 0) {
        const audioBuffer = await renderOfflineAudioBuffer(
          audioEvents,
          actualDur,
          sampleRate,
          soundEngine.getConfig()
        );

        let audioEncoderError: Error | null = null;
        const audioEncoder = new AudioEncoder({
          output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
          error: (err) => {
            audioEncoderError = err;
          },
        });
        audioEncoder.configure({
          codec: caps.audioCodecString,
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: 2,
          bitrate: 128_000,
        });

        const ch0 = audioBuffer.getChannelData(0);
        const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;
        const chunkFrames = 2048;
        for (let offset = 0; offset < audioBuffer.length; offset += chunkFrames) {
          const count = Math.min(chunkFrames, audioBuffer.length - offset);
          const planar = new Float32Array(count * 2);
          planar.set(ch0.subarray(offset, offset + count), 0);
          planar.set(ch1.subarray(offset, offset + count), count);
          const tsUs = Math.round((offset / audioBuffer.sampleRate) * 1_000_000);
          const ad = new AudioData({
            format: "f32-planar",
            sampleRate: audioBuffer.sampleRate,
            numberOfChannels: 2,
            numberOfFrames: count,
            timestamp: tsUs,
            data: planar,
          });
          audioEncoder.encode(ad);
          ad.close();
          if (audioEncoder.encodeQueueSize > 12) {
            await new Promise((r) => setTimeout(r, 2));
          }
        }
        await audioEncoder.flush();
        audioEncoder.close();
        if (audioEncoderError) throw audioEncoderError;
      }

      if (videoEncoder.state === "configured") {
        await videoEncoder.flush();
        videoEncoder.close();
      }
      if (videoEncoderError) throw videoEncoderError;

      muxer.finalize();
      const blob = new Blob([target.buffer], { type: "video/mp4" });

      if (sourceCanvas.width !== prevW || sourceCanvas.height !== prevH) {
        engine.resize(prevW, prevH);
      }
      this.isRecording = false;
      this.isPaused = false;
      this.activeCleanup = null;
      engine.setExportingMode?.(false);
      engine.resume();

      options.onComplete?.({
        blob,
        ext: "mp4",
        mimeType: "video/mp4",
        encoderUsed: `${caps.pipelineLabel} (Deterministic)`,
        thumbnailDataUrl,
        actualDurationSeconds: actualDur,
      });
    } catch (err) {
      soundEngine.endOfflineCapture();
      if (sourceCanvas.width !== prevW || sourceCanvas.height !== prevH) {
        engine.resize(prevW, prevH);
      }
      this.isRecording = false;
      this.isPaused = false;
      this.activeCleanup = null;
      engine.setExportingMode?.(false);
      engine.resume();
      throw err;
    }
  }

  /**
   * Real-time live capture mode (exact wall-clock duration, captures mouse pointer interactions).
   */
  private async recordLiveWebCodecs(
    engine: SimulationEngine,
    options: RecordingOptions,
    caps: ExportCapabilities
  ) {
    const { width, height, fps, durationSeconds, bitrateMbps, includeAudio } = options;
    const sourceCanvas = engine.getCanvas();
    const prevW = sourceCanvas.width;
    const prevH = sourceCanvas.height;
    if (prevW !== width || prevH !== height) {
      engine.resize(width, height);
    }

    const useAudio = Boolean(includeAudio && caps.webCodecsAudio && caps.audioCodecString && caps.audioCodec);
    const sampleRate = caps.audioCodec === "opus" ? 48000 : soundEngine.getSampleRate();

    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target,
      video: { codec: "avc", width, height, frameRate: fps },
      audio: useAudio && caps.audioCodec
        ? { codec: caps.audioCodec, numberOfChannels: 2, sampleRate }
        : undefined,
      fastStart: "in-memory",
    });

    let videoEncoderError: Error | null = null;
    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (err) => {
        videoEncoderError = err;
      },
    });
    videoEncoder.configure({
      codec: caps.h264Profile!,
      width,
      height,
      bitrate: bitrateMbps * 1_000_000,
      framerate: fps,
      avc: { format: "avc" },
    });

    let audioEncoder: AudioEncoder | null = null;
    let removePcmListener: (() => void) | null = null;
    let audioSamplesWritten = 0;

    if (useAudio && caps.audioCodecString) {
      audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: () => {},
      });
      audioEncoder.configure({
        codec: caps.audioCodecString,
        sampleRate,
        numberOfChannels: 2,
        bitrate: 128_000,
      });

      removePcmListener = soundEngine.addPcmListener((left, right, srcRate) => {
        if (!this.isRecording || this.isPaused || this.stopRequested || !audioEncoder) return;
        if (audioEncoder.state !== "configured") return;
        try {
          const frames = left.length;
          const planar = new Float32Array(frames * 2);
          planar.set(left, 0);
          planar.set(right, frames);
          const timestampUs = Math.round((audioSamplesWritten / srcRate) * 1_000_000);
          const audioData = new AudioData({
            format: "f32-planar",
            sampleRate: srcRate,
            numberOfChannels: 2,
            numberOfFrames: frames,
            timestamp: timestampUs,
            data: planar,
          });
          audioSamplesWritten += frames;
          audioEncoder.encode(audioData);
          audioData.close();
        } catch {}
      });
    }

    const frameDurUs = Math.round(1_000_000 / fps);
    let activeMs = 0;
    let lastTickMs = performance.now();
    let lastEncodedMs = -1000;
    let frameCount = 0;
    let thumbnailDataUrl = "";
    let finished = false;
    let rafId: number | null = null;

    const cleanup = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (removePcmListener) {
        removePcmListener();
        removePcmListener = null;
      }
      if (sourceCanvas.width !== prevW || sourceCanvas.height !== prevH) {
        engine.resize(prevW, prevH);
      }
    };
    this.activeCleanup = cleanup;

    const finalize = async () => {
      if (finished) return;
      finished = true;
      cleanup();
      const elapsedSec = activeMs / 1000;
      options.onProgress?.(elapsedSec, durationSeconds, "encoding");

      try {
        if (videoEncoder.state === "configured") {
          await videoEncoder.flush();
          videoEncoder.close();
        }
        if (audioEncoder && audioEncoder.state === "configured") {
          await audioEncoder.flush();
          audioEncoder.close();
        }
        muxer.finalize();
        if (videoEncoderError) throw videoEncoderError;

        const blob = new Blob([target.buffer], { type: "video/mp4" });
        this.isRecording = false;
        this.isPaused = false;
        this.activeCleanup = null;

        options.onComplete?.({
          blob,
          ext: "mp4",
          mimeType: "video/mp4",
          encoderUsed: `${caps.pipelineLabel} (Live)`,
          thumbnailDataUrl,
          actualDurationSeconds: elapsedSec,
        });
      } catch (err) {
        this.isRecording = false;
        this.isPaused = false;
        this.activeCleanup = null;
        options.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    const tick = (now: number) => {
      if (!this.isRecording) {
        cleanup();
        return;
      }
      const delta = Math.min(100, Math.max(0, now - lastTickMs));
      lastTickMs = now;

      if (this.stopRequested || activeMs >= durationSeconds * 1000) {
        finalize();
        return;
      }

      if (!this.isPaused) {
        activeMs += delta;
        const minGapMs = 1000 / fps;
        if (activeMs - lastEncodedMs >= minGapMs * 0.85 && videoEncoder.encodeQueueSize <= 6) {
          lastEncodedMs = activeMs;
          const vFrame = new VideoFrame(sourceCanvas, {
            timestamp: Math.round(activeMs * 1000),
            duration: frameDurUs,
          });
          videoEncoder.encode(vFrame, { keyFrame: frameCount % (fps * 2) === 0 });
          vFrame.close();
          frameCount++;

          if (!thumbnailDataUrl && activeMs > 250) {
            try {
              thumbnailDataUrl = sourceCanvas.toDataURL("image/jpeg", 0.78);
            } catch {}
          }
          options.onProgress?.(Math.min(durationSeconds, activeMs / 1000), durationSeconds, "recording");
        }
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  private async recordWithMediaRecorder(
    engine: SimulationEngine,
    options: RecordingOptions,
    mimeType: string
  ) {
    const { width, height, fps, durationSeconds, bitrateMbps, includeAudio } = options;
    const sourceCanvas = engine.getCanvas();
    const prevW = sourceCanvas.width;
    const prevH = sourceCanvas.height;
    if (prevW !== width || prevH !== height) {
      engine.resize(width, height);
    }

    let thumbnailDataUrl = "";
    let activeMs = 0;
    let lastTick = performance.now();
    const chunks: Blob[] = [];

    const stream = sourceCanvas.captureStream(fps);
    const tracks: MediaStreamTrack[] = [...stream.getVideoTracks()];
    if (includeAudio) {
      const audioTrack = soundEngine.getAudioStream();
      if (audioTrack) tracks.push(audioTrack);
    }
    const combined = new MediaStream(tracks);

    const recorder = new MediaRecorder(combined, {
      mimeType,
      videoBitsPerSecond: bitrateMbps * 1_000_000,
    });
    this.mediaRecorder = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const drawLoop = setInterval(() => {
      if (!this.isRecording) return;
      const now = performance.now();
      const dt = now - lastTick;
      lastTick = now;

      if (!this.isPaused) {
        activeMs += dt;
        if (!thumbnailDataUrl && activeMs > 250) {
          try {
            thumbnailDataUrl = sourceCanvas.toDataURL("image/jpeg", 0.75);
          } catch {}
        }
        options.onProgress?.(Math.min(durationSeconds, activeMs / 1000), durationSeconds, "recording");
        if (activeMs >= durationSeconds * 1000 || this.stopRequested) {
          if (recorder.state !== "inactive") recorder.stop();
        }
      }
    }, 50);

    const cleanup = () => {
      clearInterval(drawLoop);
      stream.getTracks().forEach((t) => t.stop());
      this.mediaRecorder = null;
      if (sourceCanvas.width !== prevW || sourceCanvas.height !== prevH) {
        engine.resize(prevW, prevH);
      }
    };
    this.activeCleanup = cleanup;

    recorder.onstop = () => {
      cleanup();
      this.isRecording = false;
      this.isPaused = false;
      this.activeCleanup = null;

      const isMp4 = mimeType.includes("mp4");
      const ext = isMp4 ? "mp4" : "webm";
      const blob = new Blob(chunks, { type: mimeType });
      options.onComplete?.({
        blob,
        ext,
        mimeType,
        encoderUsed: `MediaRecorder Fallback (${mimeType})`,
        thumbnailDataUrl,
        actualDurationSeconds: Math.min(durationSeconds, activeMs / 1000),
      });
    };

    recorder.start(250);
  }
}

export function downloadVideo(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
}
