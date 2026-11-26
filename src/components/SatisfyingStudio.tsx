"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Play, Pause, RotateCcw, Download, Sparkles, Volume2, VolumeX,
  Palette, Sliders, Type, Trophy, Video, Flame, Music, Share2, Check
} from "lucide-react";
import { BouncingBallSimulation, BallConfig } from "@/engine/simulations/bouncingBall";
import { MarbleRaceSimulation, MarbleConfig, DEFAULT_MARBLES, MarbleCompetitor } from "@/engine/simulations/marbleRace";
import { soundEngine } from "@/engine/audio";
import { VideoRecorder, downloadVideo } from "@/engine/recorder";
import { COLOR_PALETTES } from "@/lib/site";

export default function SatisfyingStudio() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballSimRef = useRef<BouncingBallSimulation | null>(null);
  const marbleSimRef = useRef<MarbleRaceSimulation | null>(null);
  const recorderRef = useRef<VideoRecorder>(new VideoRecorder());

  // State
  const [activeTab, setActiveTab] = useState<"ball" | "marble">("ball");
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
  const [topText, setTopText] = useState("Wait for the end 😱");
  const [bottomText, setBottomText] = useState("Relaxing ASMR 🎧");

  // Marble Sim Settings
  const [marbles, setMarbles] = useState<MarbleCompetitor[]>(DEFAULT_MARBLES);

  // Initialize and switch simulations
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Fixed 1080x1920 (9:16 Shorts standard)
    canvas.width = 1080;
    canvas.height = 1920;

    // Cleanup previous
    if (ballSimRef.current) ballSimRef.current.stop();
    if (marbleSimRef.current) marbleSimRef.current.stop();

    if (activeTab === "ball") {
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
    } else {
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
    }

    return () => {
      ballSimRef.current?.stop();
      marbleSimRef.current?.stop();
    };
  }, [activeTab]);

  // Update Ball Config in real-time
  useEffect(() => {
    if (activeTab === "ball" && ballSimRef.current) {
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
    }
  }, [shape, rotationSpeed, gravity, ballCount, selectedPalette, topText, bottomText, speedIncrement, activeTab]);

  // Update Marble Config in real-time
  useEffect(() => {
    if (activeTab === "marble" && marbleSimRef.current) {
      marbleSimRef.current.updateConfig({
        marbles,
        topText,
        bottomText,
      });
    }
  }, [marbles, topText, bottomText, activeTab]);

  // Audio Mode change
  useEffect(() => {
    soundEngine.setSoundMode(soundMode);
  }, [soundMode]);

  // Play / Pause toggle
  const togglePlay = () => {
    if (activeTab === "ball" && ballSimRef.current) {
      if (isPlaying) ballSimRef.current.pause();
      else ballSimRef.current.resume();
    } else if (activeTab === "marble" && marbleSimRef.current) {
      if (isPlaying) marbleSimRef.current.pause();
      else marbleSimRef.current.resume();
    }
    setIsPlaying(!isPlaying);
  };

  // Reset simulation
  const handleReset = () => {
    if (activeTab === "ball" && ballSimRef.current) {
      ballSimRef.current.reset();
    } else if (activeTab === "marble" && marbleSimRef.current) {
      marbleSimRef.current.reset();
    }
    setIsPlaying(true);
  };

  // Start Recording
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
        downloadVideo(blob, `satisfying-${activeTab}-shorts-${Date.now()}.${ext}`);
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
    <section className="relative w-full max-w-7xl mx-auto px-4 py-8">
      {/* Studio Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          100% Free · No Watermark · 1080×1920 (9:16) 60FPS MP4 Export
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white mb-3">
          Satisfying <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 bg-clip-text text-transparent">Video Maker</span>
        </h1>
        <p className="max-w-2xl mx-auto text-slate-300 text-base sm:text-lg">
          Create viral ASMR physics & satisfying simulation videos for YouTube Shorts, Instagram Reels & TikTok. Play, customize colors and export instant 60fps vertical video!
        </p>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left / Center Viewport (Phone Mockup 9:16) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="relative w-[340px] sm:w-[380px] h-[600px] sm:h-[675px] rounded-[42px] p-3.5 bg-gradient-to-b from-slate-800 to-slate-950 border-4 border-slate-700/80 shadow-[0_0_50px_rgba(0,245,255,0.25)] flex flex-col justify-between overflow-hidden">
            
            {/* Phone Speaker Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-800 mr-2" />
              <div className="w-10 h-1 bg-slate-700 rounded-full" />
            </div>

            {/* Live Canvas (1080x1920 inside) */}
            <div className="relative w-full h-full rounded-[30px] overflow-hidden bg-black flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-cover"
              />

              {/* Recording Indicator Overlay */}
              {isRecording && (
                <div className="absolute top-8 left-4 z-20 flex items-center gap-2 bg-red-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                  <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  REC ({recordProgress}%)
                </div>
              )}

              {/* Floating Quick Controls inside Mockup */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
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
                  title="Reset Simulation"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-white/20" />
                <button
                  onClick={() => setSoundMode(soundMode === "off" ? "chimes" : "off")}
                  className="p-2 text-white hover:text-cyan-400 transition"
                  title={soundMode === "off" ? "Unmute ASMR sound" : "Mute ASMR sound"}
                >
                  {soundMode === "off" ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Recording Bar below Mockup */}
          <div className="w-[340px] sm:w-[380px] mt-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5">
              <span className="text-xs font-semibold text-slate-400 pl-2">Clip Length:</span>
              <div className="flex gap-1.5">
                {[15, 30, 60].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setRecordDuration(sec as 15 | 30 | 60)}
                    disabled={isRecording}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                      recordDuration === sec
                        ? "bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,245,255,0.5)]"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* Big Glow Record Button */}
            {!isRecording ? (
              <button
                onClick={handleStartRecord}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-500 via-fuchsia-600 to-cyan-500 text-white font-black text-lg tracking-wide shadow-[0_0_30px_rgba(255,0,127,0.4)] hover:shadow-[0_0_40px_rgba(0,245,255,0.6)] hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-3 cursor-pointer"
              >
                <Video className="w-6 h-6 animate-pulse" />
                RECORD 9:16 SHORTS ({recordDuration}s)
              </button>
            ) : (
              <button
                onClick={handleStopRecord}
                className="w-full py-4 px-6 rounded-2xl bg-red-600 text-white font-black text-lg tracking-wide shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-pulse flex items-center justify-center gap-3 cursor-pointer"
              >
                <div className="w-4 h-4 bg-white rounded-sm animate-ping" />
                STOP & DOWNLOAD NOW ({recordProgress}%)
              </button>
            )}

            {downloadSuccess && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-sm font-semibold text-center flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                Video downloaded successfully! Ready to post on Shorts & Reels!
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Deep Customization & Control Hub */}
        <div className="lg:col-span-7 bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
          
          {/* Top Switcher: Simulation Modes */}
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab("ball")}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${
                activeTab === "ball"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Bouncing Ball (ASMR Chimes)
            </button>
            <button
              onClick={() => setActiveTab("marble")}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${
                activeTab === "marble"
                  ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Trophy className="w-4 h-4" />
              3D Country Marble Race
            </button>
          </div>

          {/* Tab 1: Ball Sim Controls */}
          {activeTab === "ball" && (
            <div className="space-y-6">
              
              {/* Shape Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 block">
                  Rotating Boundary Shape
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(["circle", "hexagon", "octagon", "triangle", "star"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setShape(s)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold capitalize border transition ${
                        shape === s
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,245,255,0.3)]"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Number of Balls */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-300">Ball Count</span>
                    <span className="text-xs font-black text-cyan-400">{ballCount} Ball{ballCount > 1 ? "s" : ""}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={ballCount}
                    onChange={(e) => setBallCount(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Speed increment per bounce */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      Speedup / Bounce
                    </span>
                    <span className="text-xs font-black text-orange-400">+{speedIncrement}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={speedIncrement}
                    onChange={(e) => setSpeedIncrement(Number(e.target.value))}
                    className="w-full accent-orange-400 cursor-pointer"
                  />
                </div>

                {/* Rotation Speed */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-300">Rotation Speed</span>
                    <span className="text-xs font-black text-fuchsia-400">{rotationSpeed}x</span>
                  </div>
                  <input
                    type="range"
                    min="-4"
                    max="4"
                    step="0.2"
                    value={rotationSpeed}
                    onChange={(e) => setRotationSpeed(Number(e.target.value))}
                    className="w-full accent-fuchsia-400 cursor-pointer"
                  />
                </div>

                {/* Gravity */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-300">Gravity Power</span>
                    <span className="text-xs font-black text-emerald-400">{gravity}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.02"
                    value={gravity}
                    onChange={(e) => setGravity(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              </div>

            </div>
          )}

          {/* Tab 2: Marble Race Controls */}
          {activeTab === "marble" && (
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Active Competitor Marbles ({marbles.length})
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                      className={`p-3 rounded-2xl border flex items-center gap-2.5 transition ${
                        isSelected
                          ? "bg-slate-800/90 border-yellow-400/60 text-white shadow-[0_0_12px_rgba(250,204,21,0.2)]"
                          : "bg-slate-950 border-slate-800/50 text-slate-500 opacity-60"
                      }`}
                    >
                      <span className="text-xl">{cm.flag}</span>
                      <span className="text-xs font-bold truncate">{cm.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Color Palettes Picker */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-pink-400" />
              Vibrant Color Themes
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {COLOR_PALETTES.map((pal) => (
                <button
                  key={pal.id}
                  onClick={() => setSelectedPalette(pal)}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-2 transition ${
                    selectedPalette.id === pal.id
                      ? "bg-slate-800 border-cyan-400 shadow-[0_0_15px_rgba(0,245,255,0.2)]"
                      : "bg-slate-950 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xs font-bold text-white">{pal.name}</span>
                  <div className="flex gap-1">
                    {pal.colors.slice(0, 5).map((c, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full border border-black/30 shadow-sm"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sound Effect Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-cyan-400" />
              ASMR Sound FX (Recorded into video)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { id: "chimes", label: "Crystal Bell" },
                { id: "marimba", label: "Wood Marimba" },
                { id: "glass", label: "Wine Glass" },
                { id: "arcade", label: "8-Bit Retro" },
                { id: "off", label: "Mute Sound" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSoundMode(s.id as any);
                    soundEngine.setSoundMode(s.id as any);
                    if (s.id !== "off") soundEngine.playBounce(1, 0);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    soundMode === s.id
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Viral Overlay Text Inputs */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-yellow-400" />
              Shorts / Reels Overlay Text (Captions)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              <input
                type="text"
                placeholder="Top hook (e.g. Wait for the end 😱)"
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-yellow-300 placeholder:text-slate-600 focus:outline-none focus:border-yellow-400"
              />
              <input
                type="text"
                placeholder="Bottom CTA (e.g. Relaxing ASMR 🎧)"
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              />
            </div>
            
            {/* Quick Viral Presets */}
            <div className="flex flex-wrap gap-1.5">
              {[
                ["Wait for the end 😱", "Relaxing ASMR 🎧"],
                ["Which country wins? 🏁", "Comment your flag! 👇"],
                ["Can it reach 100 bounces? 🔥", "Satisfying Loop 🌀"],
                ["Sound on for ASMR 🔊", "Oddly Satisfying ✨"],
              ].map(([t, b], idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTopText(t);
                    setBottomText(b);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[11px] text-slate-300 transition"
                >
                  &quot;{t}&quot;
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
