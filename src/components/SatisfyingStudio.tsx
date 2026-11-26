"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Play, Pause, RotateCcw, Sparkles, Volume2, VolumeX,
  Palette, Type, Trophy, Video, Flame, Music, Check,
  Hourglass, Hammer, ShieldAlert, Orbit
} from "lucide-react";
import { BouncingBallSimulation, BallConfig } from "@/engine/simulations/bouncingBall";
import { MarbleRaceSimulation, MarbleConfig, DEFAULT_MARBLES, MarbleCompetitor } from "@/engine/simulations/marbleRace";
import { SandPourSimulation, SandConfig } from "@/engine/simulations/sandPour";
import { CrusherSimulation, CrusherConfig } from "@/engine/simulations/crusher";
import { BarrierBreakerSimulation, BarrierConfig } from "@/engine/simulations/barrierBreaker";
import { SpiralVortexSimulation, VortexConfig } from "@/engine/simulations/spiralVortex";
import { soundEngine } from "@/engine/audio";
import { VideoRecorder, downloadVideo } from "@/engine/recorder";
import { COLOR_PALETTES } from "@/lib/site";
import { GAMES_LIST } from "@/lib/games";

export type SimulationType = "ball" | "marble" | "breaker" | "crusher" | "sand" | "vortex";

interface SatisfyingStudioProps {
  initialSim?: SimulationType;
}

export default function SatisfyingStudio({ initialSim = "ball" }: SatisfyingStudioProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballSimRef = useRef<BouncingBallSimulation | null>(null);
  const marbleSimRef = useRef<MarbleRaceSimulation | null>(null);
  const sandSimRef = useRef<SandPourSimulation | null>(null);
  const crusherSimRef = useRef<CrusherSimulation | null>(null);
  const breakerSimRef = useRef<BarrierBreakerSimulation | null>(null);
  const vortexSimRef = useRef<SpiralVortexSimulation | null>(null);
  const recorderRef = useRef<VideoRecorder>(new VideoRecorder());

  // Simulation Selector
  const [activeSim, setActiveSim] = useState<SimulationType>(initialSim);
  const [isPlaying, setIsPlaying] = useState(true);
  const [soundMode, setSoundMode] = useState<"chimes" | "marimba" | "arcade" | "glass" | "off">("chimes");
  const [selectedPalette, setSelectedPalette] = useState(COLOR_PALETTES[0]);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [recordDuration, setRecordDuration] = useState<15 | 30 | 60>(30);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Ball Sim Settings
  const [shape, setShape] = useState<"circle" | "hexagon" | "octagon" | "triangle" | "star">("circle");
  const [rotationSpeed, setRotationSpeed] = useState(1.2);
  const [gravity, setGravity] = useState(0.28);
  const [ballCount, setBallCount] = useState(1);
  const [speedIncrement, setSpeedIncrement] = useState(0.5);

  // Marble Sim Settings
  const [marbles, setMarbles] = useState<MarbleCompetitor[]>(DEFAULT_MARBLES);

  // Common Viral Text Hooks
  const [topText, setTopText] = useState("Wait for the end 😱");
  const [bottomText, setBottomText] = useState("Relaxing ASMR 🎧");

  // Inspector Tab
  const [inspectorTab, setInspectorTab] = useState<"game" | "colors" | "text" | "sound">("game");

  // Check URL query on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const simParam = urlParams.get("game") as SimulationType;
      if (simParam && GAMES_LIST.some((s) => s.id === simParam)) {
        setActiveSim(simParam);
      }
    }
  }, []);

  // Initialize and switch simulations
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 1080;
    canvas.height = 1920;

    // Cleanup previous simulations
    ballSimRef.current?.stop();
    marbleSimRef.current?.stop();
    sandSimRef.current?.stop();
    crusherSimRef.current?.stop();
    breakerSimRef.current?.stop();
    vortexSimRef.current?.stop();

    if (activeSim === "ball") {
      const config: BallConfig = {
        shape,
        rotationSpeed,
        gravity,
        elasticity: 0.98,
        ballCount,
        ballRadius: 36,
        trailLength: 20,
        colors: selectedPalette.colors,
        bgColor: selectedPalette.bg,
        topText,
        bottomText,
        speedIncrement,
      };
      const sim = new BouncingBallSimulation(canvas, config);
      ballSimRef.current = sim;
      sim.start();
    } else if (activeSim === "marble") {
      const config: MarbleConfig = {
        marbles,
        gravity: 0.45,
        elasticity: 0.85,
        trackTheme: "neon",
        topText: topText || "Which country will win? 🏁",
        bottomText: bottomText || "Comment your flag! 👇",
      };
      const sim = new MarbleRaceSimulation(canvas, config);
      marbleSimRef.current = sim;
      sim.start();
    } else if (activeSim === "breaker") {
      const config: BarrierConfig = {
        ringCount: 5,
        rotationSpeed: 1,
        ballSpeed: 6.5,
        topText: topText || "Can the ball escape? 😱",
        bottomText: bottomText || "Sound on for ASMR 🎧",
      };
      const sim = new BarrierBreakerSimulation(canvas, config);
      breakerSimRef.current = sim;
      sim.start();
    } else if (activeSim === "crusher") {
      const config: CrusherConfig = {
        crushSpeed: 3.5,
        topText,
        bottomText,
      };
      const sim = new CrusherSimulation(canvas, config);
      crusherSimRef.current = sim;
      sim.start();
    } else if (activeSim === "sand") {
      const config: SandConfig = {
        streamColor: selectedPalette.colors[0],
        particleSize: 5,
        flowRate: 5,
        gravity: 0.35,
        pegCount: 42,
        topText,
        bottomText,
      };
      const sim = new SandPourSimulation(canvas, config);
      sandSimRef.current = sim;
      sim.start();
    } else if (activeSim === "vortex") {
      const config: VortexConfig = {
        particleCount: 450,
        swirlSpeed: 1.2,
        topText: topText || "Hypnotic Cosmic Vortex 🌀",
        bottomText: bottomText || "Oddly Satisfying ✨",
      };
      const sim = new SpiralVortexSimulation(canvas, config);
      vortexSimRef.current = sim;
      sim.start();
    }

    return () => {
      ballSimRef.current?.stop();
      marbleSimRef.current?.stop();
      sandSimRef.current?.stop();
      crusherSimRef.current?.stop();
      breakerSimRef.current?.stop();
      vortexSimRef.current?.stop();
    };
  }, [activeSim]);

  // Real-time updates for active sim
  useEffect(() => {
    if (activeSim === "ball" && ballSimRef.current) {
      ballSimRef.current.updateConfig({
        shape,
        rotationSpeed,
        gravity,
        ballCount,
        colors: selectedPalette.colors,
        bgColor: selectedPalette.bg,
        topText,
        bottomText,
        speedIncrement,
      });
    } else if (activeSim === "marble" && marbleSimRef.current) {
      marbleSimRef.current.updateConfig({ marbles, topText, bottomText });
    } else if (activeSim === "breaker" && breakerSimRef.current) {
      breakerSimRef.current.updateConfig({ topText, bottomText });
    } else if (activeSim === "sand" && sandSimRef.current) {
      sandSimRef.current.updateConfig({ topText, bottomText });
    } else if (activeSim === "crusher" && crusherSimRef.current) {
      crusherSimRef.current.updateConfig({ topText, bottomText });
    } else if (activeSim === "vortex" && vortexSimRef.current) {
      vortexSimRef.current.updateConfig({ topText, bottomText });
    }
  }, [shape, rotationSpeed, gravity, ballCount, selectedPalette, topText, bottomText, speedIncrement, marbles, activeSim]);

  // Sound Engine sync
  useEffect(() => {
    soundEngine.setSoundMode(soundMode);
  }, [soundMode]);

  // Play / Pause
  const togglePlay = () => {
    if (activeSim === "ball") {
      if (isPlaying) ballSimRef.current?.pause(); else ballSimRef.current?.resume();
    } else if (activeSim === "marble") {
      if (isPlaying) marbleSimRef.current?.pause(); else marbleSimRef.current?.resume();
    } else if (activeSim === "breaker") {
      if (isPlaying) breakerSimRef.current?.pause(); else breakerSimRef.current?.resume();
    } else if (activeSim === "sand") {
      if (isPlaying) sandSimRef.current?.pause(); else sandSimRef.current?.resume();
    } else if (activeSim === "crusher") {
      if (isPlaying) crusherSimRef.current?.pause(); else crusherSimRef.current?.resume();
    } else if (activeSim === "vortex") {
      if (isPlaying) vortexSimRef.current?.pause(); else vortexSimRef.current?.resume();
    }
    setIsPlaying(!isPlaying);
  };

  // Reset
  const handleReset = () => {
    if (activeSim === "ball") ballSimRef.current?.reset();
    else if (activeSim === "marble") marbleSimRef.current?.reset();
    else if (activeSim === "breaker") breakerSimRef.current?.reset();
    else if (activeSim === "sand") sandSimRef.current?.reset();
    else if (activeSim === "crusher") crusherSimRef.current?.reset();
    else if (activeSim === "vortex") vortexSimRef.current?.reset();
    setIsPlaying(true);
  };

  // Recording
  const handleStartRecord = () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;

    handleReset();
    soundEngine.init();

    setIsRecording(true);
    setRecordProgress(0);
    setDownloadSuccess(false);

    recorderRef.current.start(canvas, {
      durationSeconds: recordDuration,
      onProgress: (passed, total) => {
        setRecordProgress(Math.round((passed / total) * 100));
      },
      onComplete: (blob, ext) => {
        setIsRecording(false);
        setRecordProgress(100);
        downloadVideo(blob, `satisfying-${activeSim}-shorts-${Date.now()}.${ext}`);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 6000);
      },
      onError: (err) => {
        console.error("Recording error:", err);
        setIsRecording(false);
      },
    });
  };

  const handleStopRecord = () => {
    if (isRecording) {
      recorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Simulation Selector Bar */}
      <div className="w-full flex items-center justify-between flex-wrap gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {GAMES_LIST.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeSim === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSim(item.id as SimulationType);
                  setIsPlaying(true);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                  isCurrent
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-md shadow-cyan-500/20"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  isCurrent ? "bg-black/20 text-black" : "bg-slate-800 text-slate-400"
                }`}>
                  {item.tag}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 pr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>1080×1920 (9:16 Shorts)</span>
        </div>
      </div>

      {/* Main Studio Viewport & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Phone Canvas Mockup */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="relative w-[340px] sm:w-[380px] h-[600px] sm:h-[675px] rounded-[44px] p-3.5 bg-gradient-to-b from-slate-800 via-slate-900 to-black border-4 border-slate-700 shadow-2xl flex flex-col justify-between overflow-hidden">
            
            {/* Phone Notch */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-20 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800 mr-2" />
              <div className="w-10 h-1 bg-slate-800 rounded-full" />
            </div>

            {/* Canvas Container */}
            <div className="relative w-full h-full rounded-[32px] overflow-hidden bg-black flex items-center justify-center">
              <canvas ref={canvasRef} className="w-full h-full object-cover" />

              {/* Recording Overlay */}
              {isRecording && (
                <div className="absolute top-8 left-4 z-20 flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                  REC ({recordProgress}%)
                </div>
              )}

              {/* Floating Bottom Bar */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 shadow-lg">
                <button
                  onClick={togglePlay}
                  className="p-2 text-white hover:text-cyan-400 transition"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleReset}
                  className="p-2 text-white hover:text-cyan-400 transition"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-white/20" />
                <button
                  onClick={() => setSoundMode(soundMode === "off" ? "chimes" : "off")}
                  className="p-2 text-white hover:text-cyan-400 transition"
                  title={soundMode === "off" ? "Unmute sound" : "Mute sound"}
                >
                  {soundMode === "off" ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Record Bar */}
          <div className="w-[340px] sm:w-[380px] mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-2 px-3">
              <span className="text-xs font-semibold text-slate-400">Duration:</span>
              <div className="flex gap-1.5">
                {[15, 30, 60].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setRecordDuration(sec as 15 | 30 | 60)}
                    disabled={isRecording}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                      recordDuration === sec
                        ? "bg-cyan-500 text-black font-black"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {!isRecording ? (
              <button
                onClick={handleStartRecord}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-500 via-fuchsia-600 to-cyan-500 text-white font-black text-base tracking-wide shadow-lg shadow-pink-500/25 hover:shadow-cyan-500/30 hover:scale-[1.01] active:scale-[0.99] transition flex items-center justify-center gap-3 cursor-pointer"
              >
                <Video className="w-5 h-5 animate-pulse" />
                RECORD 9:16 VIDEO ({recordDuration}s)
              </button>
            ) : (
              <button
                onClick={handleStopRecord}
                className="w-full py-4 px-6 rounded-2xl bg-red-600 text-white font-black text-base tracking-wide shadow-lg shadow-red-500/30 animate-pulse flex items-center justify-center gap-3 cursor-pointer"
              >
                <div className="w-3.5 h-3.5 bg-white rounded-sm animate-ping" />
                STOP & DOWNLOAD NOW ({recordProgress}%)
              </button>
            )}

            {downloadSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold text-center flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                60FPS MP4 video downloaded! Ready to post on Shorts & Reels!
              </div>
            )}
          </div>
        </div>

        {/* Right: Modern Inspector Workbench */}
        <div className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 flex flex-col gap-6">
          
          {/* Inspector Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: "game", label: "Controls", icon: Sparkles },
              { id: "colors", label: "Palettes", icon: Palette },
              { id: "text", label: "Captions", icon: Type },
              { id: "sound", label: "Audio FX", icon: Music },
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setInspectorTab(tab.id as any)}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    inspectorTab === tab.id
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Game Specific Settings */}
          {inspectorTab === "game" && (
            <div className="space-y-5">
              {activeSim === "ball" && (
                <>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                      Rotating Shape
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {(["circle", "hexagon", "octagon", "triangle", "star"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setShape(s)}
                          className={`py-2 px-1.5 rounded-xl text-xs font-bold capitalize border transition ${
                            shape === s
                              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-semibold text-slate-300">Ball Count</span>
                        <span className="text-xs font-bold text-cyan-400">{ballCount}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="8"
                        step="1"
                        value={ballCount}
                        onChange={(e) => setBallCount(Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-semibold text-slate-300">Speedup / Bounce</span>
                        <span className="text-xs font-bold text-orange-400">+{speedIncrement}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={speedIncrement}
                        onChange={(e) => setSpeedIncrement(Number(e.target.value))}
                        className="w-full accent-orange-400"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeSim === "breaker" && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-white mb-1">Barrier Breaker (Ring Escape)</p>
                  <p className="text-slate-400 leading-relaxed">
                    A bouncing ball chips away pieces of concentric neon rings on every bounce until it finally bursts out into space. One of the highest retention formats on TikTok!
                  </p>
                </div>
              )}

              {activeSim === "marble" && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                    Competitor Marbles
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {DEFAULT_MARBLES.map((cm) => {
                      const isSelected = marbles.some((m) => m.id === cm.id);
                      return (
                        <button
                          key={cm.id}
                          onClick={() => {
                            if (isSelected && marbles.length > 2) {
                              setMarbles(marbles.filter((m) => m.id !== cm.id));
                            } else if (!isSelected) {
                              setMarbles([...marbles, cm]);
                            }
                          }}
                          className={`p-2 rounded-xl border text-center transition ${
                            isSelected
                              ? "bg-slate-800 border-yellow-400 text-white"
                              : "bg-slate-950 border-slate-800 text-slate-500 opacity-60"
                          }`}
                        >
                          <div className="text-xl">{cm.flag}</div>
                          <div className="text-[11px] font-bold truncate">{cm.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeSim === "sand" && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-white mb-1">Kinetic Sand Waterfall Mode</p>
                  <p className="text-slate-400 leading-relaxed">
                    Thousands of colorful sand particles cascade smoothly through an oscillating peg maze, creating hypnotic layered patterns.
                  </p>
                </div>
              )}

              {activeSim === "crusher" && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-white mb-1">100-Ton Hydraulic Press Mode</p>
                  <p className="text-slate-400 leading-relaxed">
                    Watch shapes deform and squish under massive steel pressure before bursting into satisfying shards with crunchy ASMR sound effects.
                  </p>
                </div>
              )}

              {activeSim === "vortex" && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-white mb-1">Cosmic Gravity Vortex Mode</p>
                  <p className="text-slate-400 leading-relaxed">
                    A celestial black hole pulls hundreds of neon star particles in mathematical logarithmic spirals with glowing event horizons.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Colors */}
          {inspectorTab === "colors" && (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Select Color Palette
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {COLOR_PALETTES.map((pal) => (
                  <button
                    key={pal.id}
                    onClick={() => setSelectedPalette(pal)}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition ${
                      selectedPalette.id === pal.id
                        ? "bg-slate-800 border-cyan-400"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-xs font-bold text-white">{pal.name}</span>
                    <div className="flex gap-1">
                      {pal.colors.slice(0, 5).map((c, i) => (
                        <div key={i} className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Text Captions */}
          {inspectorTab === "text" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Top Hook Text
                </label>
                <input
                  type="text"
                  value={topText}
                  onChange={(e) => setTopText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-yellow-300 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Bottom Call-to-Action
                </label>
                <input
                  type="text"
                  value={bottomText}
                  onChange={(e) => setBottomText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 mb-2 block">Quick Viral Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ["Wait for the end 😱", "Relaxing ASMR 🎧"],
                    ["Which country wins? 🏁", "Comment your flag! 👇"],
                    ["Can it escape? 🔥", "Satisfying Loop 🌀"],
                    ["Sound on for ASMR 🔊", "Oddly Satisfying ✨"],
                  ].map(([t, b], idx) => (
                    <button
                      key={idx}
                      onClick={() => { setTopText(t); setBottomText(b); }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-300 hover:text-white"
                    >
                      &quot;{t}&quot;
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Audio */}
          {inspectorTab === "sound" && (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                ASMR Audio Tone (Recorded into MP4)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "chimes", label: "Crystal Bell Chimes" },
                  { id: "marimba", label: "Wooden Marimba" },
                  { id: "glass", label: "Wine Glass Ping" },
                  { id: "arcade", label: "8-Bit Retro Blips" },
                  { id: "off", label: "Mute Audio" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSoundMode(s.id as any);
                      soundEngine.setSoundMode(s.id as any);
                      if (s.id !== "off") soundEngine.playBounce(1, 0);
                    }}
                    className={`p-3 rounded-xl text-xs font-bold border text-left transition ${
                      soundMode === s.id
                        ? "bg-cyan-500/10 border-cyan-400 text-cyan-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
