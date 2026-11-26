"use client";

import React, { useEffect, useRef, useState } from "react";
import { createSimulationEngine } from "@/engine/loader";
import { SimulationEngine, SimulationMetrics } from "@/engine/types";
import { GameDefinition, OverlayConfig, SimulationParams } from "@/types/simulation";

interface SimulationViewportProps {
  game: GameDefinition;
  params: SimulationParams;
  overlays: OverlayConfig;
  width: number;
  height: number;
  isPlaying: boolean;
  onEngineReady?: (engine: SimulationEngine | null) => void;
  onMetrics?: (metrics: SimulationMetrics) => void;
  className?: string;
}

export default function SimulationViewport({
  game,
  params,
  overlays,
  width,
  height,
  isPlaying,
  onEngineReady,
  onMetrics,
  className = "",
}: SimulationViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SimulationEngine | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const paramsRef = useRef(params);
  paramsRef.current = params;
  const overlaysRef = useRef(overlays);
  overlaysRef.current = overlays;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setLoading(true);
    setErrorMsg(null);

    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
      onEngineReady?.(null);
    }

    canvas.width = width;
    canvas.height = height;

    createSimulationEngine(game.engineId, canvas, paramsRef.current, overlaysRef.current)
      .then((engine) => {
        if (cancelled) {
          engine.stop();
          return;
        }
        // Always sync latest React state after async import resolves so stale prev-game overlays never stick!
        const engWithOverlay = engine as SimulationEngine & {
          setOverlays?: (o: OverlayConfig | null) => void;
        };
        engine.updateConfig(paramsRef.current);
        engWithOverlay.setOverlays?.(overlaysRef.current);

        engineRef.current = engine;
        onEngineReady?.(engine);
        engine.start();
        if (!isPlayingRef.current) {
          engine.pause();
        } else {
          engine.resume();
        }
        engine.render();
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Failed to initialize simulation");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
        onEngineReady?.(null);
      }
    };
    // Re-create engine only when game or engine type changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id, game.engineId]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.resize(width, height);
  }, [width, height]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.updateConfig(params);
  }, [params]);

  useEffect(() => {
    const engine = engineRef.current as (SimulationEngine & { setOverlays?: (o: OverlayConfig | null) => void }) | null;
    if (!engine) return;
    engine.setOverlays?.(overlays);
  }, [overlays]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (isPlaying) {
      engine.start();
      engine.resume();
    } else {
      engine.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!onMetrics) return;
    const id = setInterval(() => {
      if (engineRef.current) {
        onMetrics(engineRef.current.getMetrics());
      }
    }, 200);
    return () => clearInterval(id);
  }, [onMetrics]);

  const sendPointer = (e: React.PointerEvent<HTMLCanvasElement>, type: "down" | "move" | "up") => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine?.handlePointer || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / Math.max(1, rect.width);
    const y = (e.clientY - rect.top) / Math.max(1, rect.height);
    engine.handlePointer({ x, y, type });
  };

  return (
    <div className={`relative w-full h-full flex items-center justify-center bg-[#0B0B0C] overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => sendPointer(e, "down")}
        onPointerMove={(e) => sendPointer(e, "move")}
        onPointerUp={(e) => sendPointer(e, "up")}
        className="w-full h-full object-contain touch-none cursor-crosshair block"
        aria-label={`${game.name} interactive simulation canvas`}
      />

      {loading && (
        <div className="absolute inset-0 bg-[#0B0B0C]/85 flex items-center justify-center">
          <div className="text-xs font-medium text-[#A1A1AA]">Initializing {game.name}...</div>
        </div>
      )}

      {errorMsg && (
        <div className="absolute inset-0 bg-[#0B0B0C]/90 flex items-center justify-center p-4 text-center">
          <div className="max-w-xs text-xs text-red-400">Simulation error: {errorMsg}</div>
        </div>
      )}
    </div>
  );
}
