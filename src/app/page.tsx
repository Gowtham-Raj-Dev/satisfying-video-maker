import React from "react";
import Link from "next/link";
import { ArrowRight, Play, ShieldCheck, Sliders, Video, Cpu, Ban, UserX } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeInteractiveHero from "@/components/HomeInteractiveHero";
import GameCard from "@/components/GameCard";
import MiniSimulationPreview from "@/components/MiniSimulationPreview";
import { CATEGORIES } from "@/lib/defaults";
import { GAMES_REGISTRY, getGameById } from "@/lib/games";

export default function HomePage() {
  const trendingGames = GAMES_REGISTRY.filter((g) => g.trending).slice(0, 6);
  const videoExamples = [
    {
      game: getGameById("ring-escape"),
      format: "1080×1920 · 60 FPS",
      caption: "Can the ball escape all 7 rings?",
      sub: "Crystal Ping · Cyber Neon",
    },
    {
      game: getGameById("country-marble-race"),
      format: "1080×1920 · 60 FPS",
      caption: "Which country wins?",
      sub: "Wood Tap · Live Leaderboard",
    },
    {
      game: getGameById("hydraulic-press"),
      format: "1080×1920 · 60 FPS",
      caption: "100-Ton Hydraulic Press",
      sub: "Hydraulic Compression · Shards",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0C] text-[#F5F5F5]">
      <Navbar />

      <main className="flex-1">
        {/* Hero + Live Interactive Simulation */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-14 lg:pt-14 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#141416] border border-[#29292D] text-[11px] font-medium text-[#A1A1AA]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C4FF2E]" />
                Browser Physics Playground &amp; MP4 Studio
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#F5F5F5] leading-[1.12]">
                Make Something Satisfying.
              </h1>

              <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed max-w-lg">
                Play with physics. Create mesmerizing simulations. Export beautiful videos.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/games/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#C4FF2E] hover:bg-[#D4FF63] text-[#0B0B0C] text-sm font-semibold transition-colors"
                >
                  <Play className="w-4 h-4 fill-[#0B0B0C]" />
                  <span>Explore Games</span>
                </Link>
                <Link
                  href="/studio/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#141416] hover:bg-[#1B1B1E] border border-[#29292D] text-[#F5F5F5] text-sm font-medium transition-colors"
                >
                  <Sliders className="w-4 h-4 text-[#C4FF2E]" />
                  <span>Open Studio</span>
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#29292D]">
                <div>
                  <div className="text-lg font-semibold font-mono-tabular text-[#F5F5F5]">
                    {GAMES_REGISTRY.length}
                  </div>
                  <div className="text-[11px] text-[#A1A1AA]">Playable Sims</div>
                </div>
                <div>
                  <div className="text-lg font-semibold font-mono-tabular text-[#F5F5F5]">1080p</div>
                  <div className="text-[11px] text-[#A1A1AA]">60 FPS MP4</div>
                </div>
                <div>
                  <div className="text-lg font-semibold font-mono-tabular text-[#C4FF2E]">0</div>
                  <div className="text-[11px] text-[#A1A1AA]">Watermarks</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <HomeInteractiveHero />
            </div>
          </div>
        </section>

        {/* Trending Simulations */}
        <section className="border-t border-[#29292D] bg-[#0B0B0C]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-[#F5F5F5]">
                  Trending Simulations
                </h2>
                <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1">
                  Live interactive previews running directly in your browser. Click any card to customize or record.
                </p>
              </div>
              <Link
                href="/games/"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#C4FF2E] hover:underline shrink-0"
              >
                <span>View all {GAMES_REGISTRY.length}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {trendingGames.map((game) => (
                <GameCard key={game.id} game={game} showPreview={true} />
              ))}
            </div>
          </div>
        </section>

        {/* Browse by Category */}
        <section className="border-t border-[#29292D] bg-[#141416]/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-[#F5F5F5]">
                Browse by Category
              </h2>
              <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1">
                Eight distinct simulation families built on Canvas 2D, Matter.js, and Three.js WebGL.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {CATEGORIES.map((cat) => {
                const count = GAMES_REGISTRY.filter((g) => g.category === cat.id).length;
                return (
                  <Link
                    key={cat.id}
                    href={`/games/?category=${cat.id}`}
                    className="p-4 rounded-lg bg-[#141416] border border-[#29292D] hover:border-[#C4FF2E]/60 transition-colors flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#F5F5F5]">{cat.label}</span>
                        <span className="text-[11px] font-mono-tabular text-[#A1A1AA]">{count}</span>
                      </div>
                      <p className="text-xs text-[#A1A1AA] leading-relaxed">{cat.shortDesc}</p>
                    </div>
                    <span className="text-[11px] font-medium text-[#C4FF2E]">Browse category →</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Featured Vertical Video Examples (Real Live Loops) */}
        <section className="border-t border-[#29292D]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-[#F5F5F5]">
                  Vertical Studio Formats
                </h2>
                <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1">
                  Real-time 9:16 portrait canvases ready to record locally for Shorts, Reels, and TikTok.
                </p>
              </div>
              <Link
                href="/studio/"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C4FF2E] hover:underline"
              >
                <span>Launch Video Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {videoExamples.map((ex) => (
                <div
                  key={ex.game.id}
                  className="bg-[#141416] border border-[#29292D] rounded-lg overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-[9/12] bg-[#0B0B0C] border-b border-[#29292D]">
                    <MiniSimulationPreview game={ex.game} width={360} height={480} />
                    <div className="pointer-events-none absolute top-3 inset-x-3 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-[#0B0B0C]/80 border border-white/10 text-[11px] font-semibold text-[#F5F5F5]">
                        {ex.caption}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#F5F5F5]">{ex.game.name}</div>
                      <div className="text-[11px] text-[#A1A1AA] mt-0.5">
                        {ex.format} · {ex.sub}
                      </div>
                    </div>
                    <Link
                      href={`/studio/?game=${ex.game.id}`}
                      className="px-3 py-1.5 rounded bg-[#1B1B1E] hover:bg-[#C4FF2E] hover:text-[#0B0B0C] border border-[#29292D] text-xs font-medium text-[#F5F5F5] transition-colors shrink-0"
                    >
                      Load in Studio
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="border-t border-[#29292D] bg-[#141416]/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-[#F5F5F5]">How It Works</h2>
              <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1">
                From live physics simulation to finished MP4 file in four straightforward steps.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  step: "01",
                  title: "Choose",
                  desc: `Pick any of the ${GAMES_REGISTRY.length} simulations across Physics, Ball Doublers, Marble Races, Crushing, Sand, Liquid, and Space.`,
                },
                {
                  step: "02",
                  title: "Customize",
                  desc: "Adjust gravity, object counts, color themes, 3D camera angles, and synthesized ASMR sound.",
                },
                {
                  step: "03",
                  title: "Create",
                  desc: "Set your canvas to 9:16, 16:9, or 1:1 and position live hook and CTA text overlays.",
                },
                {
                  step: "04",
                  title: "Export",
                  desc: "Record in real time and encode locally via WebCodecs + mp4-muxer directly to your device.",
                },
              ].map((item) => (
                <div key={item.step} className="p-5 rounded-lg bg-[#141416] border border-[#29292D] space-y-2">
                  <div className="text-xs font-mono-tabular font-semibold text-[#C4FF2E]">{item.step}</div>
                  <h3 className="text-base font-semibold text-[#F5F5F5]">{item.title}</h3>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product Benefits */}
        <section className="border-t border-[#29292D]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: ShieldCheck,
                  title: "100% Free",
                  desc: "No paywalled resolution locks, export limits, or subscription tiers.",
                },
                {
                  icon: Ban,
                  title: "No Watermark",
                  desc: "Clean full-frame recordings without brand logos stamped over your clips.",
                },
                {
                  icon: UserX,
                  title: "No Login Required",
                  desc: "Open any simulation or studio tool immediately without creating an account.",
                },
                {
                  icon: Cpu,
                  title: "Browser-Based",
                  desc: "Physics, Web Audio, and MP4 encoding run locally—nothing is uploaded to a server.",
                },
              ].map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.title} className="p-5 rounded-lg bg-[#141416] border border-[#29292D] space-y-2">
                    <Icon className="w-4 h-4 text-[#C4FF2E]" />
                    <h3 className="text-sm font-semibold text-[#F5F5F5]">{b.title}</h3>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">{b.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
