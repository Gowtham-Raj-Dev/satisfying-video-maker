"use client";

import React, { useEffect, useState } from "react";
import { SimulationEngine, SimulationMetrics } from "@/engine/types";

interface LiveMetricsTextProps {
  engineRef: React.RefObject<SimulationEngine | null>;
  variant?: "studio" | "player" | "hero";
  isPlaying?: boolean;
  is3D?: boolean;
}

export default function LiveMetricsText({
  engineRef,
  variant = "studio",
  isPlaying = false,
  is3D = false,
}: LiveMetricsTextProps) {
  const [snap, setSnap] = useState<Pick<SimulationMetrics, "fps" | "activeObjects" | "eventsCount">>({
    fps: 60,
    activeObjects: 0,
    eventsCount: 0,
  });

  useEffect(() => {
    const id = setInterval(() => {
      const m = engineRef.current?.getMetrics();
      if (m) {
        setSnap((prev) =>
          prev.fps === m.fps &&
          prev.activeObjects === m.activeObjects &&
          prev.eventsCount === m.eventsCount
            ? prev
            : { fps: m.fps, activeObjects: m.activeObjects, eventsCount: m.eventsCount }
        );
      }
    }, 450);
    return () => clearInterval(id);
  }, [engineRef]);

  if (variant === "hero") {
    return (
      <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-[#A1A1AA]">
        <span>{snap.fps} FPS</span>
        <span>·</span>
        <span>{snap.eventsCount} bounces</span>
      </div>
    );
  }

  if (variant === "player") {
    return (
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-2.5 py-1 rounded bg-[#141416]/90 border border-[#29292D] text-[11px] font-mono-tabular text-[#A1A1AA]">
        <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? "bg-[#C4FF2E]" : "bg-[#A1A1AA]"}`} />
        <span>{snap.fps} FPS</span>
        <span>·</span>
        <span>{snap.activeObjects} objects</span>
        {is3D && (
          <>
            <span>·</span>
            <span className="text-[#C4FF2E]">3D</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="text-[11px] font-mono-tabular text-[#A1A1AA]">
      {snap.fps} FPS · {snap.activeObjects} obj
    </div>
  );
}
