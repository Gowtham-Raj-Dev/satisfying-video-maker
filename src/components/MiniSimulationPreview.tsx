"use client";

import React, { useEffect, useRef, useState } from "react";
import { DEFAULT_SIM_PARAMS } from "@/lib/defaults";
import { createSimulationEngine } from "@/engine/loader";
import { SimulationEngine } from "@/engine/types";
import { GameDefinition } from "@/types/simulation";

interface MiniSimulationPreviewProps {
  game: GameDefinition;
  width?: number;
  height?: number;
  className?: string;
}

export default function MiniSimulationPreview({
  game,
  width = 360,
  height = 240,
  className = "",
}: MiniSimulationPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        setIsVisible(Boolean(entries[0]?.isIntersecting));
      },
      { rootMargin: "120px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let engine: SimulationEngine | null = null;

    canvas.width = width;
    canvas.height = height;

    const mergedParams = {
      ...DEFAULT_SIM_PARAMS,
      ...game.defaultParams,
      performance: "low" as const,
    };

    createSimulationEngine(game.engineId, canvas, mergedParams)
      .then((inst) => {
        if (cancelled) {
          inst.stop();
          return;
        }
        engine = inst;
        engine.start();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      engine?.stop();
    };
  }, [isVisible, game.id, game.engineId, game.defaultParams, width, height]);

  return (
    <div ref={containerRef} className={`relative w-full h-full bg-[#0B0B0C] overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full object-cover block" />
      {!isVisible && (
        <div className="absolute inset-0 bg-[#141416] flex items-center justify-center text-[11px] text-[#A1A1AA]">
          Preview
        </div>
      )}
    </div>
  );
}
