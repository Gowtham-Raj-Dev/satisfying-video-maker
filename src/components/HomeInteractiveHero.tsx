"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Play, Pause, RotateCcw, Sliders, Volume2, VolumeX, ArrowRight } from "lucide-react";
import { useSimulationSession } from "@/hooks/useSimulationSession";
import { getGameById } from "@/lib/games";
import { COLOR_PALETTES } from "@/lib/palettes";
import SimulationViewport from "./SimulationViewport";
import StartGateOverlay from "./StartGateOverlay";
import LiveMetricsText from "./LiveMetricsText";

export default function HomeInteractiveHero() {
  const featuredGame = getGameById("bouncing-ball-circle");
  const session = useSimulationSession(featuredGame, false);
  const [showQuickCustomize, setShowQuickCustomize] = useState(false);

  return (
    <div className="bg-[#141416] border border-[#29292D] rounded-lg overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1B1B1E] border-b border-[#29292D]">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${session.isPlaying ? "bg-[#C4FF2E]" : "bg-[#A1A1AA]"}`} />
          <span className="font-medium text-[#F5F5F5]">Interactive Simulation</span>
          <span className="text-[#A1A1AA] hidden sm:inline">· Bouncing Ball Circle</span>
        </div>
        <LiveMetricsText engineRef={session.engineRef} variant="hero" />
      </div>

      {/* Live Canvas + Start Gate */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] bg-[#0B0B0C]">
        <SimulationViewport
          game={featuredGame}
          params={session.params}
          overlays={session.overlays}
          width={960}
          height={540}
          isPlaying={session.isPlaying}
          onEngineReady={(eng) => {
            session.engineRef.current = eng;
          }}
          onMetrics={session.setMetrics}
        />

        {(!session.hasStarted || session.completion) && (
          <StartGateOverlay
            title={featuredGame.name}
            subtitle="Click Start to unlock Web Audio chimes and launch physics."
            completion={session.completion}
            onStartWithAudio={() => session.startSimulation(!session.audio.enabled)}
            onStartMuted={!session.completion ? () => session.startSimulation(true) : undefined}
            onRandomizeAndStart={() => {
              session.randomize();
              session.startSimulation(!session.audio.enabled);
            }}
          />
        )}
      </div>

      {/* Controls Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#141416] border-t border-[#29292D]">
        <div className="flex items-center gap-2">
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
            onClick={() => session.updateAudio({ enabled: !session.audio.enabled })}
            className="p-2 rounded bg-[#1B1B1E] border border-[#29292D] text-[#F5F5F5]"
            aria-label={session.audio.enabled ? "Mute chimes" : "Unmute chimes"}
          >
            {session.audio.enabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#C4FF2E]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-[#A1A1AA]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowQuickCustomize(!showQuickCustomize)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
              showQuickCustomize
                ? "bg-[#1B1B1E] border-[#C4FF2E] text-[#C4FF2E]"
                : "bg-[#1B1B1E] border-[#29292D] text-[#F5F5F5] hover:border-[#3F3F46]"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize</span>
          </button>
        </div>

        <Link
          href={`/studio/?game=${featuredGame.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C4FF2E] hover:underline"
        >
          <span>Record in Studio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Expandable Inline Quick Customizer */}
      {showQuickCustomize && (
        <div className="px-4 py-3 bg-[#1B1B1E] border-t border-[#29292D] grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-[#A1A1AA] block">Container Shape</span>
            <div className="grid grid-cols-5 gap-1">
              {(["circle", "hexagon", "octagon", "triangle", "star"] as const).map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => session.updateParams({ containerShape: shape })}
                  className={`py-1 rounded text-[11px] capitalize border ${
                    session.params.containerShape === shape
                      ? "bg-[#C4FF2E] text-[#0B0B0C] border-[#C4FF2E] font-semibold"
                      : "bg-[#141416] border-[#29292D] text-[#A1A1AA]"
                  }`}
                >
                  {shape.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#A1A1AA]">Ball Count</span>
              <span className="font-mono-tabular text-[#F5F5F5]">{session.params.objectCount}</span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={session.params.objectCount}
              onChange={(e) => session.updateParams({ objectCount: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-[#A1A1AA] block">Color Theme</span>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PALETTES.slice(0, 6).map((pal) => (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() =>
                    session.updateParams({
                      paletteId: pal.id,
                      colors: [...pal.colors],
                      bgColor: pal.bg,
                    })
                  }
                  className={`px-2 py-1 rounded text-[11px] border ${
                    session.params.paletteId === pal.id
                      ? "border-[#C4FF2E] bg-[#141416] text-[#F5F5F5]"
                      : "border-[#29292D] bg-[#141416] text-[#A1A1AA]"
                  }`}
                >
                  {pal.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
