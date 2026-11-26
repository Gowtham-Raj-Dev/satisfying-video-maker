"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { soundEngine } from "@/engine/audio";
import {
  detectExportCapabilities,
  downloadVideo,
  ExportCapabilities,
  ExportMode,
  VideoRecorder,
} from "@/engine/recorder";
import { SimulationEngine, SimulationMetrics } from "@/engine/types";
import {
  DEFAULT_AUDIO_CONFIG,
  DEFAULT_EXPORT_SETTINGS,
  DEFAULT_OVERLAY_CONFIG,
  DEFAULT_SIM_PARAMS,
} from "@/lib/defaults";
import { COLOR_PALETTES } from "@/lib/palettes";
import { deletePreset, getPresetById, listPresets, saveCreation, savePreset } from "@/lib/storage";
import {
  AudioConfig,
  ExportSettings,
  GameDefinition,
  OverlayConfig,
  SavedPresetRecord,
  SimulationParams,
} from "@/types/simulation";

function buildInitialParams(game: GameDefinition): SimulationParams {
  return {
    ...DEFAULT_SIM_PARAMS,
    ...game.defaultParams,
    camera3D: {
      ...DEFAULT_SIM_PARAMS.camera3D,
      ...(game.defaultParams.camera3D || {}),
    },
  };
}

function buildInitialAudio(game: GameDefinition): AudioConfig {
  return {
    ...DEFAULT_AUDIO_CONFIG,
    preset: game.recommendedSound,
    ambientPreset: game.recommendedAmbient || "none",
    ...(game.defaultAudio || {}),
  };
}

function buildInitialOverlays(game: GameDefinition, enabledByDefault = true): OverlayConfig {
  const o = game.defaultOverlays;
  return {
    top: {
      ...DEFAULT_OVERLAY_CONFIG.top,
      enabled: enabledByDefault,
      text: o?.topText || DEFAULT_OVERLAY_CONFIG.top.text,
      font: o?.topFont || DEFAULT_OVERLAY_CONFIG.top.font,
      background: o?.topBg || DEFAULT_OVERLAY_CONFIG.top.background,
      animation: o?.topAnim || DEFAULT_OVERLAY_CONFIG.top.animation,
      yOffsetPct: o?.topY ?? DEFAULT_OVERLAY_CONFIG.top.yOffsetPct,
      color: o?.topColor || DEFAULT_OVERLAY_CONFIG.top.color,
    },
    bottom: {
      ...DEFAULT_OVERLAY_CONFIG.bottom,
      enabled: enabledByDefault && (o?.bottomEnabled !== false),
      text: o?.bottomText || DEFAULT_OVERLAY_CONFIG.bottom.text,
      font: o?.bottomFont || DEFAULT_OVERLAY_CONFIG.bottom.font,
      background: o?.bottomBg || DEFAULT_OVERLAY_CONFIG.bottom.background,
      animation: o?.bottomAnim || DEFAULT_OVERLAY_CONFIG.bottom.animation,
      yOffsetPct: o?.bottomY ?? DEFAULT_OVERLAY_CONFIG.bottom.yOffsetPct,
      color: o?.bottomColor || DEFAULT_OVERLAY_CONFIG.bottom.color,
    },
  };
}

export function useSimulationSession(game: GameDefinition, overlaysEnabledDefault = true) {
  const [params, setParams] = useState<SimulationParams>(() => buildInitialParams(game));
  const [audio, setAudio] = useState<AudioConfig>(() => buildInitialAudio(game));
  const [overlays, setOverlays] = useState<OverlayConfig>(() =>
    buildInitialOverlays(game, overlaysEnabledDefault)
  );
  const [exportSettings, setExportSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);
  const [exportMode, setExportMode] = useState<ExportMode>("fast");

  const [history, setHistory] = useState<{ past: SimulationParams[]; future: SimulationParams[] }>({
    past: [],
    future: [],
  });
  const [savedPresets, setSavedPresets] = useState<SavedPresetRecord[]>([]);
  // Wait for explicit user Start click before playing each simulation
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [metrics, setMetrics] = useState<SimulationMetrics>({
    fps: 60,
    activeObjects: 0,
    eventsCount: 0,
    statusLabel: "Ready",
  });

  // Recording state
  const recorderRef = useRef<VideoRecorder>(new VideoRecorder());
  const engineRef = useRef<SimulationEngine | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordPaused, setIsRecordPaused] = useState(false);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const [exportPhase, setExportPhase] = useState<"idle" | "recording" | "encoding" | "done" | "error">("idle");
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastExportMeta, setLastExportMeta] = useState<{
    filename: string;
    sizeBytes: number;
    ext: string;
    encoderUsed: string;
    actualDurationSeconds: number;
    savedToLibrary: boolean;
    previewUrl: string;
    blob: Blob;
  } | null>(null);
  const [capabilities, setCapabilities] = useState<ExportCapabilities | null>(null);

  // Sync defaults and ask for Start whenever switching games
  useEffect(() => {
    setParams(buildInitialParams(game));
    setAudio(buildInitialAudio(game));
    setOverlays(buildInitialOverlays(game, overlaysEnabledDefault));
    setHistory({ past: [], future: [] });
    setHasStarted(false);
    setIsPlaying(false);
    lastCompletedRef.current = false;
    setMetrics({
      fps: 60,
      activeObjects: 0,
      eventsCount: 0,
      progressPct: 0,
      statusLabel: "Ready",
      completed: null,
    });
    setExportPhase("idle");
    setExportError(null);
  }, [game.id, overlaysEnabledDefault]);

  useEffect(() => {
    soundEngine.updateConfig(audio);
  }, [audio]);

  // Revoke previous export object URL when replaced or unmounted
  useEffect(() => {
    const url = lastExportMeta?.previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [lastExportMeta]);

  const refreshPresets = useCallback(async () => {
    const items = await listPresets();
    setSavedPresets(items);
  }, []);

  useEffect(() => {
    refreshPresets();
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const presetId = urlParams.get("preset");
      if (presetId) {
        getPresetById(presetId).then((p) => {
          if (p) {
            setParams(p.params);
            setAudio(p.audio);
            setOverlays(p.overlays);
          }
        });
      }
    }
  }, [refreshPresets]);

  useEffect(() => {
    let active = true;
    detectExportCapabilities(
      exportSettings.width,
      exportSettings.height,
      exportSettings.fps,
      exportSettings.bitrateMbps
    ).then((caps) => {
      if (active) setCapabilities(caps);
    });
    return () => {
      active = false;
    };
  }, [exportSettings.width, exportSettings.height, exportSettings.fps, exportSettings.bitrateMbps]);

  useEffect(() => {
    const rec = recorderRef.current;
    return () => {
      rec.forceCleanup();
    };
  }, []);

  const updateParams = useCallback((patch: Partial<SimulationParams>) => {
    const requiresRestartGate =
      patch.containerShape !== undefined ||
      patch.multiplyMode !== undefined ||
      patch.arenaLayout !== undefined ||
      patch.trackStyle !== undefined ||
      patch.ringCount !== undefined ||
      patch.pressShape !== undefined ||
      patch.jarShape !== undefined ||
      patch.pegLayout !== undefined ||
      patch.variant !== undefined;

    setParams((curr) => {
      const next: SimulationParams = {
        ...curr,
        ...patch,
        camera3D: {
          ...curr.camera3D,
          ...(patch.camera3D || {}),
        },
      };
      setHistory((h) => ({
        past: [...h.past.slice(-24), curr],
        future: [],
      }));
      return next;
    });

    if (requiresRestartGate) {
      setTimeout(() => {
        engineRef.current?.reset();
      }, 0);
      setHasStarted(false);
      setIsPlaying(false);
    }
  }, []);

  const updateAudio = useCallback((patch: Partial<AudioConfig>) => {
    soundEngine.init();
    setAudio((curr) => ({ ...curr, ...patch }));
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      setParams((curr) => {
        setHistory({ past: h.past.slice(0, -1), future: [curr, ...h.future.slice(0, 24)] });
        return previous;
      });
      return h;
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const next = h.future[0];
      setParams((curr) => {
        setHistory({ past: [...h.past.slice(-24), curr], future: h.future.slice(1) });
        return next;
      });
      return h;
    });
  }, []);

  const resetDefaults = useCallback(() => {
    setParams((curr) => {
      setHistory((h) => ({ past: [...h.past.slice(-24), curr], future: [] }));
      return buildInitialParams(game);
    });
    setAudio(buildInitialAudio(game));
    setOverlays(buildInitialOverlays(game, overlaysEnabledDefault));
    engineRef.current?.reset();
    setHasStarted(false);
    setIsPlaying(false);
  }, [game, overlaysEnabledDefault]);

  const randomize = useCallback(() => {
    const pal = COLOR_PALETTES[Math.floor(Math.random() * (COLOR_PALETTES.length - 1))];
    const nextSeed = Math.floor(Math.random() * 99999) + 1;
    updateParams({
      seed: nextSeed,
      paletteId: pal.id,
      colors: [...pal.colors],
      bgColor: pal.bg,
      rotationSpeed: Number(((Math.random() * 2 - 1) * 2.4).toFixed(2)),
      speedIncrement: Number((Math.random() * 1.1).toFixed(2)),
    });
    engineRef.current?.reset(nextSeed);
  }, [updateParams]);

  const startSimulation = useCallback((muted = false) => {
    soundEngine.init();
    setAudio((curr) => {
      const next = { ...curr, enabled: !muted };
      soundEngine.updateConfig(next);
      return next;
    });
    const eng = engineRef.current;
    if (eng) {
      eng.reset();
      eng.start();
      eng.resume();
    }
    lastCompletedRef.current = false;
    setMetrics((m) => ({ ...m, completed: null, progressPct: 0 }));
    setHasStarted(true);
    setIsPlaying(true);
  }, []);

  const restartSimulation = useCallback(() => {
    engineRef.current?.reset();
    lastCompletedRef.current = false;
    setMetrics((m) => ({ ...m, completed: null, progressPct: 0 }));
    setHasStarted(false);
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    soundEngine.init();
    if (!hasStarted || metrics.completed) {
      startSimulation(!audio.enabled);
      return;
    }
    setIsPlaying((p) => {
      const next = !p;
      if (next) {
        engineRef.current?.start();
        engineRef.current?.resume();
      } else {
        engineRef.current?.pause();
      }
      return next;
    });
  }, [hasStarted, metrics.completed, audio.enabled, startSimulation]);

  const handleSavePreset = useCallback(
    async (name: string) => {
      const record: SavedPresetRecord = {
        id: `preset-${Date.now()}`,
        name,
        gameId: game.id,
        gameName: game.name,
        createdAt: Date.now(),
        params,
        audio,
        overlays,
      };
      await savePreset(record);
      await refreshPresets();
    },
    [game.id, game.name, params, audio, overlays, refreshPresets]
  );

  const handleLoadPreset = useCallback((preset: SavedPresetRecord) => {
    setParams(preset.params);
    setAudio(preset.audio);
    setOverlays(preset.overlays);
    engineRef.current?.reset(preset.params.seed);
  }, []);

  const handleDeletePreset = useCallback(
    async (id: string) => {
      await deletePreset(id);
      await refreshPresets();
    },
    [refreshPresets]
  );

  const startRecording = useCallback(
    (overrideSettings?: Partial<ExportSettings>) => {
      const engine = engineRef.current;
      if (!engine || isRecording) return;

      const cfg: ExportSettings = { ...exportSettings, ...(overrideSettings || {}) };
      soundEngine.init();
      setHasStarted(true);
      setIsPlaying(exportMode === "live");
      setIsRecording(true);
      setIsRecordPaused(false);
      setRecordElapsed(0);
      setExportPhase("recording");
      setExportError(null);
      setLastExportMeta(null);

      recorderRef.current.start(engine, {
        mode: exportMode,
        width: cfg.width,
        height: cfg.height,
        fps: cfg.fps,
        durationSeconds: cfg.durationSeconds,
        bitrateMbps: cfg.bitrateMbps,
        includeAudio: cfg.includeAudio && audio.enabled && audio.preset !== "off",
        onProgress: (elapsed, _total, phase) => {
          setRecordElapsed(elapsed);
          setExportPhase(phase);
        },
        onComplete: async (result) => {
          setIsRecording(false);
          setIsRecordPaused(false);
          setIsPlaying(true);
          setExportPhase("done");
          const filename = `${game.id}-${cfg.width}x${cfg.height}-${Date.now()}.${result.ext}`;
          downloadVideo(result.blob, filename);

          const saved = await saveCreation({
            id: `creation-${Date.now()}`,
            title: `${game.name} (${cfg.width}×${cfg.height})`,
            gameId: game.id,
            gameName: game.name,
            createdAt: Date.now(),
            width: cfg.width,
            height: cfg.height,
            fps: cfg.fps,
            durationSeconds: Math.max(1, Math.round(result.actualDurationSeconds)),
            fileSizeBytes: result.blob.size,
            mimeType: result.mimeType,
            ext: result.ext,
            encoderUsed: result.encoderUsed,
            thumbnailDataUrl: result.thumbnailDataUrl,
            hasVideoBlob: true,
            videoBlob: result.blob,
          });

          const previewUrl = URL.createObjectURL(result.blob);
          setLastExportMeta({
            filename,
            sizeBytes: result.blob.size,
            ext: result.ext,
            encoderUsed: result.encoderUsed,
            actualDurationSeconds: result.actualDurationSeconds,
            savedToLibrary: saved.savedBlob,
            previewUrl,
            blob: result.blob,
          });
        },
        onError: (err) => {
          setIsRecording(false);
          setIsRecordPaused(false);
          setExportPhase("error");
          setExportError(err.message || "Recording failed");
        },
      });
    },
    [exportSettings, exportMode, isRecording, audio.enabled, audio.preset, game.id, game.name]
  );

  const pauseRecording = useCallback(() => {
    if (!isRecording) return;
    if (isRecordPaused) {
      recorderRef.current.resume();
      setIsRecordPaused(false);
      if (exportMode === "live") setIsPlaying(true);
    } else {
      recorderRef.current.pause();
      setIsRecordPaused(true);
      if (exportMode === "live") setIsPlaying(false);
    }
  }, [isRecording, isRecordPaused, exportMode]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    setExportPhase("encoding");
    recorderRef.current.stop();
  }, [isRecording]);

  const completion = !isRecording && metrics.completed ? metrics.completed : null;
  const lastCompletedRef = useRef<boolean>(false);

  const handleMetrics = useCallback((m: SimulationMetrics) => {
    const nowDone = Boolean(m.completed);
    // Avoid React parent re-renders during live animation; only trigger state updates on completion transitions!
    if (nowDone !== lastCompletedRef.current || nowDone) {
      lastCompletedRef.current = nowDone;
      setMetrics(m);
      if (nowDone) {
        setIsPlaying(false);
      }
    }
  }, []);

  return {
    params,
    audio,
    overlays,
    exportSettings,
    exportMode,
    savedPresets,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    hasStarted,
    isPlaying,
    completion,
    metrics,
    engineRef,
    isRecording,
    isRecordPaused,
    recordElapsed,
    exportPhase,
    exportError,
    lastExportMeta,
    capabilities,
    setOverlays,
    setExportSettings,
    setExportMode,
    setMetrics: handleMetrics,
    updateParams,
    updateAudio,
    undo,
    redo,
    resetDefaults,
    randomize,
    startSimulation,
    restartSimulation,
    togglePlay,
    handleSavePreset,
    handleLoadPreset,
    handleDeletePreset,
    startRecording,
    pauseRecording,
    stopRecording,
  };
}
