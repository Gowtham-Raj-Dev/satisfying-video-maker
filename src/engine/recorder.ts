import { soundEngine } from "./audio";

export interface RecordingOptions {
  durationSeconds?: number;
  onProgress?: (secondsPassed: number, totalSeconds: number) => void;
  onComplete?: (blob: Blob, ext: string) => void;
  onError?: (err: Error) => void;
}

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording: boolean = false;
  private timerId: NodeJS.Timeout | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private startTime: number = 0;

  public get recording(): boolean {
    return this.isRecording;
  }

  public start(canvas: HTMLCanvasElement, options: RecordingOptions = {}) {
    if (this.isRecording) return;
    this.recordedChunks = [];
    this.isRecording = true;
    this.startTime = Date.now();

    try {
      // Capture 60fps stream from canvas
      const canvasStream = canvas.captureStream(60);
      const audioTrack = soundEngine.getAudioStream();

      // Combined stream with video + ASMR audio
      const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
      if (audioTrack) {
        tracks.push(audioTrack);
      }
      const combinedStream = new MediaStream(tracks);

      // Best codec determination (MP4 first, then WebM)
      let mimeType = "video/mp4;codecs=avc1.4d002a";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/mp4";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm;codecs=vp9,opus";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm";
      }

      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 10_000_000, // 10 Mbps crisp quality
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        if (this.intervalId) clearInterval(this.intervalId);
        if (this.timerId) clearTimeout(this.timerId);

        const isMp4 = mimeType.includes("mp4");
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        if (options.onComplete) {
          options.onComplete(blob, isMp4 ? "mp4" : "webm");
        }
      };

      this.mediaRecorder.start(250); // Record in 250ms chunks

      const targetDuration = options.durationSeconds || 30;

      // Progress tracker
      this.intervalId = setInterval(() => {
        if (!this.isRecording) return;
        const elapsed = (Date.now() - this.startTime) / 1000;
        if (options.onProgress) {
          options.onProgress(Math.min(elapsed, targetDuration), targetDuration);
        }
      }, 200);

      // Auto stop after duration
      if (options.durationSeconds && options.durationSeconds > 0) {
        this.timerId = setTimeout(() => {
          this.stop();
        }, options.durationSeconds * 1000);
      }
    } catch (err) {
      this.isRecording = false;
      if (options.onError) {
        options.onError(err as Error);
      }
    }
  }

  public stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.timerId) clearTimeout(this.timerId);
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
  }, 1000);
}
