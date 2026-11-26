"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import {
  Play, Pause, RotateCcw, Maximize2, Volume2, VolumeX, Shuffle,
  Video, Square, Sliders, ChevronDown, ChevronUp, ArrowUpRight, CheckCircle2
} from "lucide-react";
import { useSimulationSession } from "@/hooks/useSimulationSession";
import { GameDefinition } from "@/types/simulation";
import SimulationViewport from "./SimulationViewport";
import InspectorPanels from "./InspectorPanels";
import StartGateOverlay from "./StartGateOverlay";
import LiveMetricsText from "./LiveMetricsText";

interface GamePlayerWorkbenchProps {
  game: GameDefinition;
}

export default function GamePlayerWorkbench({ game }: GamePlayerWorkbenchProps) {
  const session = useSimulationSession(game, false);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const [mobileCustomizeOpen, setMobileCustomizeOpen] = useState(true);

  const toggleFullscreen = () => {
    const el = stageContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Simulation Stage */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          <div
            ref={stageContainerRef}
            className="relative w-full aspect-[4/3] sm:aspect-[16/11] bg-[#0B0B0C] border border-[#29292D] rounded-lg overflow-hidden"
          >
            <SimulationViewport
              game={game}
              params={session.params}
              overlays={session.overlays}
              width={960}
              height={660}
              isPlaying={session.isPlaying}
              onEngineReady={(eng) => {
                session.engineRef.current = eng;
              }}
              onMetrics={session.setMetrics}
            />

            {(!session.hasStarted || session.completion) && !session.isRecording && (
              <StartGateOverlay
                title={game.name}
                subtitle="Click Start to initialize ASMR audio and begin simulation."
                completion={session.completion}
                onStartWithAudio={() => session.startSimulation(session.completion ? !session.audio.enabled : false)}
                onStartMuted={!session.completion ? () => session.startSimulation(true) : undefined}
                onRandomizeAndStart={() => {
                  session.randomize();
                  session.startSimulation(!session.audio.enabled);
                }}
              />
            )}

            <LiveMetricsText
              engineRef={session.engineRef}
              variant="player"
              isPlaying={session.isPlaying}
              is3D={Boolean(game.is3D)}
            />

            {session.isRecording && (
              <div className="absolute top-3 right-3 z-10 flex items-center gap-2 px-3 py-1 rounded bg-red-600 text-white text-xs font-mono-tabular font-semibold">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>
                  {session.exportPhase === "encoding"
                    ? "Muxing Audio + MP4..."
                    : `REC ${session.recordElapsed.toFixed(1)}s / 15s`}
                </span>
              </div>
            )}
          </div>

          {/* Transport Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#141416] border border-[#29292D] rounded-lg">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => (session.hasStarted ? session.togglePlay() : session.startSimulation(false))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#C4FF2E] hover:bg-[#D4FF63] text-[#0B0B0C] text-xs font-semibold transition-colors"
              >
                {session.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{!session.hasStarted ? "Start" : session.isPlaying ? "Pause" : "Resume"}</span>
              </button>

              <button
                type="button"
                onClick={session.restartSimulation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1B1B1E] border border-[#29292D] hover:border-[#3F3F46] text-xs font-medium text-[#F5F5F5]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={session.randomize}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1B1B1E] border border-[#29292D] hover:border-[#3F3F46] text-xs font-medium text-[#F5F5F5]"
              >
                <Shuffle className="w-3.5 h-3.5 text-[#C4FF2E]" />
                <span>Randomize</span>
              </button>

              <button
                type="button"
                onClick={() => session.updateAudio({ enabled: !session.audio.enabled })}
                className="p-2 rounded bg-[#1B1B1E] border border-[#29292D] hover:border-[#3F3F46] text-[#F5F5F5]"
                aria-label={session.audio.enabled ? "Mute sound" : "Enable sound"}
                title={session.audio.enabled ? "Mute sound" : "Enable sound"}
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
                className="p-2 rounded bg-[#1B1B1E] border border-[#29292D] hover:border-[#3F3F46] text-[#F5F5F5]"
                aria-label="Toggle Fullscreen"
                title="Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {!session.isRecording ? (
                <button
                  type="button"
                  onClick={() =>
                    session.startRecording({
                      width: 1080,
                      height: 1920,
                      fps: 60,
                      durationSeconds: 15,
                      bitrateMbps: 10,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1B1B1E] border border-[#29292D] hover:border-[#C4FF2E] text-xs font-medium text-[#F5F5F5]"
                >
                  <Video className="w-3.5 h-3.5 text-red-400" />
                  <span>Quick Export 15s MP4</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={session.stopRecording}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-600 text-white text-xs font-semibold"
                >
                  <Square className="w-3 h-3 fill-white" />
                  <span>Stop &amp; Export</span>
                </button>
              )}

              <Link
                href={`/studio/?game=${game.id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#1B1B1E] border border-[#29292D] hover:border-[#C4FF2E] text-xs font-medium text-[#C4FF2E]"
              >
                <span>Open in Studio</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {session.lastExportMeta && (
            <div className="p-3 rounded-lg bg-[#141416] border border-[#C4FF2E]/40 text-xs text-[#F5F5F5] flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#C4FF2E]" />
                <span>
                  Exported <strong>{session.lastExportMeta.filename}</strong> (
                  {(session.lastExportMeta.sizeBytes / (1024 * 1024)).toFixed(2)} MB ·{" "}
                  {session.lastExportMeta.actualDurationSeconds.toFixed(1)}s)
                </span>
              </div>
              <Link href="/creations/" className="text-[#C4FF2E] hover:underline shrink-0">
                View in Creations
              </Link>
            </div>
          )}
        </div>

        {/* Right: Collapsible Mobile / Desktop Customization Panel */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-2">
          <button
            type="button"
            onClick={() => setMobileCustomizeOpen(!mobileCustomizeOpen)}
            className="lg:hidden w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#141416] border border-[#29292D] text-xs font-semibold text-[#F5F5F5]"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-[#C4FF2E]" />
              Customize Physics, Visuals &amp; Audio
            </span>
            {mobileCustomizeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <div className={mobileCustomizeOpen ? "block" : "hidden lg:block"}>
            <InspectorPanels
              game={game}
              params={session.params}
              audio={session.audio}
              overlays={session.overlays}
              savedPresets={session.savedPresets}
              canUndo={session.canUndo}
              canRedo={session.canRedo}
              showOverlaysTab={false}
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
        </div>
      </div>
    </div>
  );
}
