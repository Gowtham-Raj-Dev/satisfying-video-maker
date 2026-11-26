"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, Video, Square,
  CheckCircle2, AlertCircle, Maximize2, Home, FolderHeart,
  Download, X
} from "lucide-react";
import { downloadVideo } from "@/engine/recorder";
import { useSimulationSession } from "@/hooks/useSimulationSession";
import { estimateVideoSizeMb, VIDEO_RESOLUTIONS } from "@/lib/defaults";
import { getGameById } from "@/lib/games";
import { AspectRatioId, GameDefinition } from "@/types/simulation";
import SimulationViewport from "./SimulationViewport";
import InspectorPanels from "./InspectorPanels";
import StartGateOverlay from "./StartGateOverlay";
import GameSelectorDropdown from "./GameSelectorDropdown";
import CustomSelect from "./CustomSelect";
import LiveMetricsText from "./LiveMetricsText";

interface StudioWorkbenchProps {
  initialGameId?: string;
}

const ASPECT_QUICK_BUTTONS: { aspect: AspectRatioId; defaultResId: string }[] = [
  { aspect: "9:16", defaultResId: "1080x1920" },
  { aspect: "16:9", defaultResId: "1920x1080" },
  { aspect: "1:1", defaultResId: "1080x1080" },
];

export default function StudioWorkbench({ initialGameId }: StudioWorkbenchProps) {
  const [selectedGame, setSelectedGame] = useState<GameDefinition>(() => getGameById(initialGameId));
  const session = useSimulationSession(selectedGame, true);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [customDurationMode, setCustomDurationMode] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("game");
      if (p) setSelectedGame(getGameById(p));
    }
  }, []);

  const currentRes =
    VIDEO_RESOLUTIONS.find((r) => r.id === session.exportSettings.resolutionId) || VIDEO_RESOLUTIONS[0];

  const aspectBoxStyle: React.CSSProperties =
    currentRes.aspect === "9:16"
      ? { aspectRatio: "9 / 16", height: "100%", maxHeight: "100%", maxWidth: "100%", width: "auto" }
      : currentRes.aspect === "1:1"
        ? { aspectRatio: "1 / 1", height: "100%", maxHeight: "100%", maxWidth: "100%", width: "auto" }
        : { aspectRatio: "16 / 9", width: "100%", maxWidth: "100%", maxHeight: "100%", height: "auto" };

  const progressPct = Math.min(
    100,
    Math.round((session.recordElapsed / Math.max(1, session.exportSettings.durationSeconds)) * 100)
  );

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };

  return (
    <div className="w-full min-h-screen lg:h-[100dvh] lg:max-h-[100dvh] flex flex-col bg-[#0B0B0C] text-[#F5F5F5] lg:overflow-hidden">
      {/* Compact Full-App Studio Toolbar (no website header/footer, explicit Home link + 100vh lock) */}
      <header className="h-12 shrink-0 px-3 sm:px-4 bg-[#141416] border-b border-[#29292D] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1B1B1E] border border-[#29292D] hover:border-[#C4FF2E] text-xs font-medium text-[#F5F5F5] shrink-0 transition-colors"
            title="Back to Homepage"
          >
            <Home className="w-3.5 h-3.5 text-[#C4FF2E]" />
            <span>Home</span>
          </Link>

          <span className="hidden sm:inline text-[#29292D]">|</span>

          <GameSelectorDropdown
            selectedGame={selectedGame}
            disabled={session.isRecording}
            onSelect={(game) => setSelectedGame(game)}
          />

          <span className="hidden xl:inline-block px-2 py-0.5 rounded bg-[#1B1B1E] border border-[#29292D] text-[10px] uppercase tracking-wide text-[#A1A1AA]">
            {selectedGame.status}
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="hidden lg:inline text-[11px] font-mono-tabular text-[#A1A1AA]">
            {currentRes.width}×{currentRes.height} · {session.exportSettings.fps} FPS · No Watermark
          </span>
          <Link
            href="/creations/"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1B1B1E] border border-[#29292D] hover:border-[#C4FF2E] text-xs font-medium text-[#F5F5F5]"
          >
            <FolderHeart className="w-3.5 h-3.5 text-[#C4FF2E]" />
            <span className="hidden sm:inline">My Creations</span>
          </Link>
        </div>
      </header>

      {/* Main 3-Column 100dvh Studio Workspace */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 lg:overflow-hidden">
        {/* LEFT COLUMN: Physics / Visuals / Audio / Text / Presets */}
        <div className="lg:col-span-4 order-2 lg:order-1 min-h-0 lg:h-full flex flex-col lg:overflow-hidden">
          <InspectorPanels
            game={selectedGame}
            params={session.params}
            audio={session.audio}
            overlays={session.overlays}
            savedPresets={session.savedPresets}
            canUndo={session.canUndo}
            canRedo={session.canRedo}
            showOverlaysTab={true}
            compactStudio={true}
            onChangeParams={session.updateParams}
            onChangeAudio={session.updateAudio}
            onChangeOverlays={session.setOverlays}
            onResetDefaults={session.resetDefaults}
            onRandomize={session.randomize}
            onUndo={session.undo}
            onRedo={session.redo}
            onSavePreset={session.handleSavePreset}
            onLoadPreset={session.handleLoadPreset}
            onDeletePreset={session.handleDeletePreset}
          />
        </div>

        {/* CENTER COLUMN: Live Video Preview & Transport */}
        <div className="lg:col-span-5 order-1 lg:order-2 min-h-0 lg:h-full flex flex-col justify-between gap-2.5 bg-[#141416] border border-[#29292D] rounded-lg p-3 lg:overflow-hidden">
          {/* Top Canvas Bar — 3 clean unique aspect ratio buttons */}
          <div className="w-full flex items-center justify-between gap-2 pb-2 border-b border-[#29292D] shrink-0">
            <div className="flex items-center gap-1.5">
              {ASPECT_QUICK_BUTTONS.map((item) => {
                const active = currentRes.aspect === item.aspect;
                return (
                  <button
                    key={item.aspect}
                    type="button"
                    disabled={session.isRecording}
                    onClick={() => {
                      const target = VIDEO_RESOLUTIONS.find((r) => r.id === item.defaultResId);
                      if (!target) return;
                      session.setExportSettings((prev) => ({
                        ...prev,
                        resolutionId: target.id,
                        width: target.width,
                        height: target.height,
                      }));
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                      active
                        ? "bg-[#C4FF2E] text-[#0B0B0C] border-[#C4FF2E] font-semibold"
                        : "bg-[#1B1B1E] border-[#29292D] text-[#A1A1AA] hover:text-[#F5F5F5]"
                    }`}
                  >
                    {item.aspect}
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] font-mono-tabular text-[#A1A1AA] hidden sm:block">
              {currentRes.width} × {currentRes.height} Canvas
            </div>
          </div>

          {/* Preview Canvas Box */}
          <div className="flex-1 min-h-[280px] lg:min-h-0 w-full flex items-center justify-center overflow-hidden">
            <div
              ref={stageRef}
              style={aspectBoxStyle}
              className="relative bg-[#0B0B0C] border border-[#29292D] rounded-md overflow-hidden flex items-center justify-center"
            >
              <SimulationViewport
                game={selectedGame}
                params={session.params}
                overlays={session.overlays}
                width={currentRes.width}
                height={currentRes.height}
                isPlaying={session.isPlaying}
                onEngineReady={(eng) => {
                  session.engineRef.current = eng;
                }}
                onMetrics={session.setMetrics}
              />

              {(!session.hasStarted || session.completion) && !session.isRecording && (
                <StartGateOverlay
                  title={selectedGame.name}
                  subtitle="Click Start to unlock audio and preview live physics."
                  completion={session.completion}
                  onStartWithAudio={() =>
                    session.startSimulation(session.completion ? !session.audio.enabled : false)
                  }
                  onStartMuted={!session.completion ? () => session.startSimulation(true) : undefined}
                  onRandomizeAndStart={() => {
                    session.randomize();
                    session.startSimulation(!session.audio.enabled);
                  }}
                />
              )}

              {session.isRecording && (
                <div className="absolute top-3 left-3 z-30 flex items-center gap-2 px-2.5 py-1 rounded bg-red-600 text-white text-xs font-mono-tabular font-semibold">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>
                    {session.exportPhase === "encoding"
                      ? "MUXING AUDIO + MP4..."
                      : session.isRecordPaused
                        ? `PAUSED ${session.recordElapsed.toFixed(1)}s`
                        : `${session.exportMode === "fast" ? "RENDERING" : "REC"} ${session.recordElapsed.toFixed(1)}s`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Transport Bar */}
          <div className="w-full flex items-center justify-between gap-2 pt-2 border-t border-[#29292D] shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => (session.hasStarted ? session.togglePlay() : session.startSimulation(false))}
                disabled={session.isRecording}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#C4FF2E] hover:bg-[#D4FF63] text-[#0B0B0C] text-xs font-semibold disabled:opacity-50"
              >
                {session.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{!session.hasStarted ? "Start" : session.isPlaying ? "Pause" : "Resume"}</span>
              </button>
              <button
                type="button"
                onClick={session.restartSimulation}
                disabled={session.isRecording}
                className="p-2 rounded bg-[#1B1B1E] border border-[#29292D] text-[#F5F5F5] disabled:opacity-40"
                aria-label="Reset simulation"
                title="Reset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => session.updateAudio({ enabled: !session.audio.enabled })}
                className="p-2 rounded bg-[#1B1B1E] border border-[#29292D] text-[#F5F5F5]"
                aria-label="Toggle Audio"
                title={session.audio.enabled ? "Mute Audio" : "Unmute Audio"}
              >
                {session.audio.enabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-[#C4FF2E]" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-[#A1A1AA]" />
                )}
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 rounded bg-[#1B1B1E] border border-[#29292D] text-[#F5F5F5]"
                aria-label="Fullscreen preview"
                title="Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <LiveMetricsText engineRef={session.engineRef} variant="studio" />
          </div>
        </div>

        {/* RIGHT COLUMN: Compact Zero-Scroll Export & Render Panel with Dropdowns */}
        <div className="lg:col-span-3 order-3 min-h-0 lg:h-full overflow-y-auto panel-scroll bg-[#141416] border border-[#29292D] rounded-lg p-3.5 flex flex-col justify-between gap-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#29292D] pb-2">
              <h2 className="text-sm font-semibold text-[#F5F5F5]">Export &amp; Render</h2>
              <span className="text-[11px] font-mono-tabular text-[#C4FF2E]">MP4</span>
            </div>

            {/* Render Pipeline */}
            <div className="space-y-1">
              <span className="text-[11px] text-[#A1A1AA] block">Render Pipeline</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={session.isRecording}
                  onClick={() => session.setExportMode("fast")}
                  className={`py-1.5 px-2 rounded text-xs border text-left ${
                    session.exportMode === "fast"
                      ? "bg-[#1B1B1E] border-[#C4FF2E] text-[#F5F5F5]"
                      : "bg-[#0B0B0C] border-[#29292D] text-[#A1A1AA]"
                  }`}
                >
                  <div className="font-semibold text-[11px]">Fast Render</div>
                  <div className="text-[10px] text-[#A1A1AA]">Synced Audio</div>
                </button>
                <button
                  type="button"
                  disabled={session.isRecording}
                  onClick={() => session.setExportMode("live")}
                  className={`py-1.5 px-2 rounded text-xs border text-left ${
                    session.exportMode === "live"
                      ? "bg-[#1B1B1E] border-[#C4FF2E] text-[#F5F5F5]"
                      : "bg-[#0B0B0C] border-[#29292D] text-[#A1A1AA]"
                  }`}
                >
                  <div className="font-semibold text-[11px]">Live Capture</div>
                  <div className="text-[10px] text-[#A1A1AA]">Interactive</div>
                </button>
              </div>
            </div>

            {/* Resolution Dropdown (replaces 4 stacked boxes to eliminate vertical scroll!) */}
            <div className="space-y-1">
              <span className="text-[11px] text-[#A1A1AA] block">Resolution</span>
              <CustomSelect
                ariaLabel="Export Resolution"
                disabled={session.isRecording}
                value={session.exportSettings.resolutionId}
                options={VIDEO_RESOLUTIONS.map((r) => ({
                  value: r.id,
                  label: `${r.label} (${r.aspect})`,
                  sublabel: r.tag,
                }))}
                onChange={(val) => {
                  const target = VIDEO_RESOLUTIONS.find((r) => r.id === val);
                  if (!target) return;
                  session.setExportSettings((prev) => ({
                    ...prev,
                    resolutionId: target.id,
                    width: target.width,
                    height: target.height,
                  }));
                }}
              />
            </div>

            {/* Frame Rate + Duration in compact stacked rows */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[11px] text-[#A1A1AA] block">Frame Rate</span>
                <CustomSelect
                  ariaLabel="Frame Rate"
                  disabled={session.isRecording}
                  value={String(session.exportSettings.fps)}
                  options={[
                    { value: "60", label: "60 FPS" },
                    { value: "30", label: "30 FPS" },
                  ]}
                  onChange={(val) =>
                    session.setExportSettings((prev) => ({ ...prev, fps: Number(val) as 30 | 60 }))
                  }
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#A1A1AA] block">Duration</span>
                <CustomSelect
                  ariaLabel="Video Duration"
                  disabled={session.isRecording}
                  value={customDurationMode ? "custom" : String(session.exportSettings.durationSeconds)}
                  options={[
                    { value: "15", label: "15 sec" },
                    { value: "30", label: "30 sec" },
                    { value: "60", label: "60 sec" },
                    { value: "custom", label: "Custom" },
                  ]}
                  onChange={(val) => {
                    if (val === "custom") {
                      setCustomDurationMode(true);
                    } else {
                      setCustomDurationMode(false);
                      session.setExportSettings((prev) => ({
                        ...prev,
                        durationSeconds: Number(val),
                      }));
                    }
                  }}
                />
              </div>
            </div>

            {customDurationMode && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#A1A1AA]">Custom Seconds (5–180)</span>
                <input
                  type="number"
                  min={5}
                  max={180}
                  disabled={session.isRecording}
                  value={session.exportSettings.durationSeconds}
                  onChange={(e) =>
                    session.setExportSettings((prev) => ({
                      ...prev,
                      durationSeconds: Math.max(5, Math.min(180, Number(e.target.value) || 15)),
                    }))
                  }
                  className="w-20 bg-[#0B0B0C] border border-[#29292D] rounded px-2 py-1 text-xs font-mono-tabular text-[#F5F5F5]"
                />
              </div>
            )}

            {/* Bitrate */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#A1A1AA]">Video Bitrate</span>
                <span className="font-mono-tabular text-[#F5F5F5]">
                  {session.exportSettings.bitrateMbps} Mbps
                </span>
              </div>
              <input
                type="range"
                min={4}
                max={20}
                step={1}
                disabled={session.isRecording}
                value={session.exportSettings.bitrateMbps}
                onChange={(e) =>
                  session.setExportSettings((prev) => ({ ...prev, bitrateMbps: Number(e.target.value) }))
                }
                className="w-full"
              />
            </div>

            {/* Include Audio */}
            <label className="flex items-center justify-between text-xs cursor-pointer">
              <span className="text-[#A1A1AA]">Include Synthesized ASMR Audio</span>
              <input
                type="checkbox"
                disabled={session.isRecording}
                checked={session.exportSettings.includeAudio}
                onChange={(e) =>
                  session.setExportSettings((prev) => ({ ...prev, includeAudio: e.target.checked }))
                }
                className="accent-[#C4FF2E]"
              />
            </label>

            {/* Estimate & Encoder Info */}
            <div className="p-2.5 rounded bg-[#0B0B0C] border border-[#29292D] space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">Estimated File Size</span>
                <span className="font-mono-tabular text-[#F5F5F5]">
                  {estimateVideoSizeMb(session.exportSettings)}
                </span>
              </div>
              <div className="pt-1 border-t border-[#29292D] text-[#A1A1AA]">
                <span className="block text-[10px] uppercase tracking-wider mb-0.5">Browser Encoder</span>
                <span className="text-[#F5F5F5] break-words">
                  {session.capabilities?.pipelineLabel || "Probing browser codecs..."}
                </span>
              </div>
            </div>
          </div>

          {/* Export Action pinned cleanly at bottom of card */}
          <div className="space-y-2 pt-1 shrink-0">
            {!session.isRecording ? (
              <button
                type="button"
                onClick={() => session.startRecording()}
                className="w-full py-2.5 px-4 rounded-md bg-[#C4FF2E] hover:bg-[#D4FF63] text-[#0B0B0C] font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Video className="w-4 h-4" />
                <span>
                  {session.exportMode === "fast"
                    ? `Export ${session.exportSettings.durationSeconds}s MP4`
                    : `Record ${session.exportSettings.durationSeconds}s Live`}
                </span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="w-full h-2 rounded-full bg-[#0B0B0C] border border-[#29292D] overflow-hidden">
                  <div
                    className="h-full bg-[#C4FF2E] transition-all duration-150"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono-tabular text-[#A1A1AA]">
                  <span>
                    {session.exportPhase === "encoding"
                      ? "Synthesizing audio & muxing..."
                      : session.isRecordPaused
                        ? "Paused"
                        : "Rendering frames..."}
                  </span>
                  <span>
                    {session.recordElapsed.toFixed(1)}s / {session.exportSettings.durationSeconds}s ({progressPct}%)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={session.pauseRecording}
                    className="py-2 rounded bg-[#1B1B1E] border border-[#29292D] text-xs font-medium text-[#F5F5F5]"
                  >
                    {session.isRecordPaused ? "Resume" : "Pause"}
                  </button>
                  <button
                    type="button"
                    onClick={session.stopRecording}
                    className="py-2 rounded bg-red-600 hover:bg-red-500 text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Stop &amp; Save</span>
                  </button>
                </div>
              </div>
            )}

            {session.exportError && (
              <div className="p-2 rounded bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{session.exportError}</span>
              </div>
            )}

            {session.lastExportMeta && (
              <div className="p-2.5 rounded bg-[#1B1B1E] border border-[#C4FF2E]/40 text-xs space-y-2">
                <div className="flex items-start gap-2 text-[#F5F5F5]">
                  <CheckCircle2 className="w-4 h-4 text-[#C4FF2E] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">Export complete</div>
                    <div className="text-[11px] font-mono-tabular text-[#A1A1AA]">
                      {(session.lastExportMeta.sizeBytes / (1024 * 1024)).toFixed(2)} MB ·{" "}
                      {session.lastExportMeta.actualDurationSeconds.toFixed(1)}s ·{" "}
                      {session.lastExportMeta.ext.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewModalOpen(true)}
                    className="flex-1 py-1.5 px-2.5 rounded bg-[#141416] border border-[#29292D] hover:border-[#C4FF2E] text-xs font-medium text-[#F5F5F5] inline-flex items-center justify-center gap-1"
                  >
                    <Play className="w-3 h-3 text-[#C4FF2E]" />
                    <span>Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      session.lastExportMeta &&
                      downloadVideo(session.lastExportMeta.blob, session.lastExportMeta.filename)
                    }
                    className="py-1.5 px-2.5 rounded bg-[#C4FF2E] text-[#0B0B0C] text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-Studio Video Preview Modal */}
      {previewModalOpen && session.lastExportMeta && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Exported video preview"
        >
          <div className="bg-[#141416] border border-[#29292D] rounded-lg max-w-xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#29292D]">
              <span className="text-xs font-semibold text-[#F5F5F5]">
                {session.lastExportMeta.filename}
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="p-1 text-[#A1A1AA] hover:text-[#F5F5F5]"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-[#0B0B0C] flex items-center justify-center max-h-[75vh]">
              <video
                src={session.lastExportMeta.previewUrl}
                controls
                autoPlay
                className="max-h-[72vh] w-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
