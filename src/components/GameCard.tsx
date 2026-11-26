"use client";

import React from "react";
import Link from "next/link";
import { Play, Sliders } from "lucide-react";
import { CATEGORIES } from "@/lib/defaults";
import { GameDefinition } from "@/types/simulation";
import MiniSimulationPreview from "./MiniSimulationPreview";

interface GameCardProps {
  game: GameDefinition;
  showPreview?: boolean;
}

export default function GameCard({ game, showPreview = true }: GameCardProps) {
  const catLabel = CATEGORIES.find((c) => c.id === game.category)?.label || game.category;

  return (
    <article className="bg-[#141416] border border-[#29292D] rounded-lg overflow-hidden flex flex-col hover:border-[#3F3F46] transition-colors">
      {/* Preview Viewport */}
      <Link href={`/game/${game.id}/`} className="block relative aspect-[16/10] bg-[#0B0B0C] border-b border-[#29292D]">
        {showPreview ? (
          <MiniSimulationPreview game={game} width={360} height={225} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-[#A1A1AA]">
            {game.name}
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${
              game.status === "playable"
                ? "bg-[#141416]/90 border-[#C4FF2E]/40 text-[#C4FF2E]"
                : game.status === "experimental"
                  ? "bg-[#141416]/90 border-amber-500/40 text-amber-300"
                  : "bg-[#141416]/90 border-[#29292D] text-[#A1A1AA]"
            }`}
          >
            {game.status === "playable"
              ? "Playable"
              : game.status === "experimental"
                ? "Experimental"
                : "Coming Soon"}
          </span>
          {game.is3D && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-[#141416]/90 border border-[#29292D] text-[#F5F5F5]">
              3D WebGL
            </span>
          )}
        </div>
      </Link>

      {/* Details */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-[#A1A1AA]">{catLabel}</div>
          <h3 className="text-sm font-semibold text-[#F5F5F5] leading-snug">
            <Link href={`/game/${game.id}/`} className="hover:text-[#C4FF2E] transition-colors">
              {game.name}
            </Link>
          </h3>
          <p className="text-xs text-[#A1A1AA] leading-relaxed line-clamp-2">{game.shortDesc}</p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Link
            href={`/game/${game.id}/`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-[#1B1B1E] hover:bg-[#C4FF2E] hover:text-[#0B0B0C] border border-[#29292D] text-xs font-medium text-[#F5F5F5] transition-colors"
          >
            <Play className="w-3 h-3" />
            <span>Play</span>
          </Link>
          <Link
            href={`/studio/?game=${game.id}`}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-[#0B0B0C] hover:border-[#C4FF2E] border border-[#29292D] text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors"
            title={`Open ${game.name} in Video Studio`}
          >
            <Sliders className="w-3 h-3" />
            <span>Studio</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
