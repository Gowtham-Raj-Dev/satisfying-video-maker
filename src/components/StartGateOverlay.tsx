"use client";

import React from "react";
import { Play, Volume2, VolumeX, Trophy, RotateCcw, Shuffle } from "lucide-react";
import { SimulationCompletion } from "@/engine/types";

interface StartGateOverlayProps {
  title: string;
  subtitle?: string;
  completion?: SimulationCompletion | null;
  onStartWithAudio: () => void;
  onStartMuted?: () => void;
  onRandomizeAndStart?: () => void;
}

export default function StartGateOverlay({
  title,
  subtitle = "Click Start to unlock ASMR audio and begin physics",
  completion = null,
  onStartWithAudio,
  onStartMuted,
  onRandomizeAndStart,
}: StartGateOverlayProps) {
  if (completion) {
    return (
      <div className="absolute inset-0 z-20 bg-[#0B0B0C]/75 backdrop-blur-[2px] flex items-center justify-center p-4">
        <div className="bg-[#141416] border border-[#C4FF2E]/50 rounded-lg p-5 max-w-xs w-full text-center space-y-4">
          <div className="flex flex-col items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-[#C4FF2E]/15 border border-[#C4FF2E]/40 flex items-center justify-center text-[#C4FF2E]">
              <Trophy className="w-4 h-4" />
            </span>
            <div className="text-sm font-semibold text-[#F5F5F5]">{completion.title}</div>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">{completion.subtitle}</p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={onStartWithAudio}
              className="w-full py-2.5 px-4 rounded-md bg-[#C4FF2E] hover:bg-[#D4FF63] text-[#0B0B0C] text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start Again</span>
            </button>

            {onRandomizeAndStart && (
              <button
                type="button"
                onClick={onRandomizeAndStart}
                className="w-full py-1.5 px-3 rounded bg-[#1B1B1E] hover:border-[#3F3F46] border border-[#29292D] text-[11px] font-medium text-[#F5F5F5] inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Shuffle className="w-3 h-3 text-[#C4FF2E]" />
                <span>Randomize &amp; Play Again</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 bg-[#0B0B0C]/65 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-[#141416] border border-[#29292D] rounded-lg p-5 max-w-xs w-full text-center space-y-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-[#F5F5F5]">{title}</div>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">{subtitle}</p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onStartWithAudio}
            className="w-full py-2.5 px-4 rounded-md bg-[#C4FF2E] hover:bg-[#D4FF63] text-[#0B0B0C] text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-[#0B0B0C]" />
            <span>Start Simulation</span>
            <Volume2 className="w-3.5 h-3.5" />
          </button>

          {onStartMuted && (
            <button
              type="button"
              onClick={onStartMuted}
              className="w-full py-1.5 px-3 rounded bg-[#1B1B1E] hover:border-[#3F3F46] border border-[#29292D] text-[11px] font-medium text-[#A1A1AA] hover:text-[#F5F5F5] inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <VolumeX className="w-3 h-3" />
              <span>Start Muted</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
