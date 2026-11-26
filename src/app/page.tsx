import React from "react";
import Link from "next/link";
import {
  Sparkles, Video, Trophy, Hourglass, Hammer, ShieldAlert,
  Orbit, ArrowRight, Play, Flame, Music, CheckCircle2, ShieldCheck,
  Zap, Share2
} from "lucide-react";
import { SITE } from "@/lib/site";
import { GAMES_LIST } from "@/lib/games";

export default function HomePage() {
  return (
    <div className="w-full min-h-screen bg-[#060813] text-white flex flex-col selection:bg-cyan-500 selection:text-black">
      
      {/* Top Header / Navigation */}
      <header className="sticky top-0 z-50 w-full bg-[#060813]/85 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-white font-black text-lg tracking-tight">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-fuchsia-500 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <span>CodeLove <span className="text-cyan-400">Satisfying</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-300">
          <a href="#games" className="hover:text-cyan-400 transition">Game Modes</a>
          <a href="#workflow" className="hover:text-cyan-400 transition">How It Works</a>
          <a href="#viral" className="hover:text-cyan-400 transition">Viral Tips</a>
          <a href="#faq" className="hover:text-cyan-400 transition">FAQ</a>
          <a href="https://videomaker.codelove.in" target="_blank" rel="noopener" className="hover:text-fuchsia-400 transition flex items-center gap-1">
            AI Video Maker <span className="text-xs">↗</span>
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/studio/"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-xs font-black tracking-wide shadow-md hover:shadow-cyan-500/25 hover:scale-105 active:scale-95 transition flex items-center gap-1.5"
          >
            LAUNCH STUDIO <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full max-w-6xl mx-auto px-4 pt-16 pb-20 text-center flex flex-col items-center">
        
        {/* Subtle Background Radial Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-500/10 via-fuchsia-500/10 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          100% Free · No Watermark · Instant 1080×1920 60FPS MP4 Export
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          Satisfying <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 bg-clip-text text-transparent">Video Maker</span>
        </h1>

        <p className="max-w-2xl text-slate-300 text-base sm:text-xl leading-relaxed mb-8">
          The ultimate browser studio for viral ASMR physics simulations, country marble races, and bouncing ball loops. Recorded in 60FPS vertical 9:16 format for YouTube Shorts, Reels & TikTok.
        </p>

        {/* Hero Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 mb-14">
          <Link
            href="/studio/"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-fuchsia-600 text-black font-black text-base shadow-xl shadow-cyan-500/20 hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2.5"
          >
            <Play className="w-5 h-5 fill-black" />
            OPEN VIDEO STUDIO (FREE)
          </Link>
          <a
            href="#games"
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-base hover:bg-slate-800 hover:text-white transition flex items-center justify-center gap-2"
          >
            Explore 6 Games ↓
          </a>
        </div>

        {/* Feature Highlights Pills */}
        <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "1080×1920 (9:16)", sub: "Shorts & Reels Ready" },
            { label: "60 FPS Video", sub: "Silky Smooth Render" },
            { label: "ASMR Synthesizer", sub: "Crystal Chimes & FX" },
            { label: "Zero Server Wait", sub: "Runs in Your Browser" },
          ].map((stat, i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-center">
              <div className="text-sm font-black text-white">{stat.label}</div>
              <div className="text-xs text-slate-400">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Game Catalog Section */}
      <section id="games" className="w-full max-w-7xl mx-auto px-4 py-16 border-t border-slate-800/80">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold mb-3">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            Interactive Simulation Library
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-3">
            Choose Your <span className="text-cyan-400">Satisfying Game</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            Click on any simulation to launch the dedicated studio, customize colors and motion, and record unlimited 60FPS vertical clips.
          </p>
        </div>

        {/* 6 Game Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES_LIST.map((game) => {
            const Icon = game.icon;
            return (
              <div
                key={game.id}
                className="group relative p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 flex flex-col justify-between hover:shadow-xl hover:shadow-cyan-500/10"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:text-white transition">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      {game.tag}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white mb-2 group-hover:text-cyan-300 transition">
                    {game.label}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                    {game.desc}
                  </p>
                </div>

                <Link
                  href={`/studio/?game=${game.id}`}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 hover:text-black font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  PLAY &amp; RECORD <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works (3 Steps) */}
      <section id="workflow" className="w-full max-w-6xl mx-auto px-4 py-16 border-t border-slate-800/80">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-2">How It Works</h2>
          <p className="text-slate-400 text-sm">Three easy steps to your next viral Short or Reel</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 font-black text-base flex items-center justify-center">
              01
            </div>
            <h3 className="text-base font-bold text-white">Select a Simulation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pick from Bouncing Ball with Chimes, Country Marble Races, Ring Barrier Breakers, or Hydraulic Crushers.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 font-black text-base flex items-center justify-center">
              02
            </div>
            <h3 className="text-base font-bold text-white">Customize Colors &amp; Hook</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tweak neon palettes, gravity, rotation speeds, and type in viral hook captions like &quot;Wait for the end 😱&quot;.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-400 font-black text-base flex items-center justify-center">
              03
            </div>
            <h3 className="text-base font-bold text-white">Record &amp; Download MP4</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Click record (15s, 30s, or 60s). Browser renders and downloads a 1080×1920 60FPS video with ASMR audio ready to upload.
            </p>
          </div>
        </div>
      </section>

      {/* Viral Strategy Banner */}
      <section id="viral" className="w-full max-w-5xl mx-auto px-4 py-12">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950/60 border border-slate-800">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-400 text-xs font-bold mb-3">
            <Flame className="w-3.5 h-3.5" />
            Viral Content Playbook
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
            Why Satisfying Videos Dominate the Algorithm
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
            TikTok and YouTube Shorts algorithms heavily favor videos with over <strong>100% average view duration</strong>. 
            Because satisfying loops and country races build suspense, viewers watch until the very last second, triggering viral reach.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-black/50 border border-slate-800 text-xs">
              <span className="font-bold text-cyan-400 block mb-1">Reddit Stories &amp; Podcasts</span>
              <span className="text-slate-400">Layer satisfying gameplay underneath narration to prevent viewers from swiping away.</span>
            </div>
            <div className="p-4 rounded-2xl bg-black/50 border border-slate-800 text-xs">
              <span className="font-bold text-yellow-400 block mb-1">Country Flags Competition</span>
              <span className="text-slate-400">Country battles drive thousands of comments (&quot;Comment your flag!&quot;), boosting algorithmic distribution.</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="w-full max-w-4xl mx-auto px-4 py-14 border-t border-slate-800/80">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">Frequently Asked Questions</h2>
          <p className="text-slate-400 text-xs sm:text-sm">Everything you need to know about Satisfying Video Maker</p>
        </div>

        <div className="space-y-3.5">
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-1.5">Is Satisfying Video Maker really free?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Yes, 100% free with no subscription, no watermark, and no login required. You can generate and download unlimited 60FPS vertical clips.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-1.5">Can I monetize these videos on YouTube Shorts &amp; TikTok?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Yes! All physics animations and ASMR audio generated by our browser tools are free for commercial use.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-1.5">How is this different from Vidirexa / Vireel?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vidirexa limits free accounts to 2 watermarked videos and charges up to $30/month. CodeLove Satisfying is completely free, runs natively in your browser with no GPU cloud lag, and exports high-definition 60FPS MP4 files instantly.
            </p>
          </div>
        </div>
      </section>

      {/* CodeLove Sister Network Footer */}
      <footer className="w-full bg-[#04060d] border-t border-slate-800/80 px-4 sm:px-8 py-12 mt-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1.5">CodeLove Network</h3>
            <p className="text-xs text-slate-400 max-w-2xl">
              Explore free web tools, 3D engines, AI video creators and games by CodeLove. Free forever, no install needed:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 mb-10">
            {SITE.network.map((net) => (
              <a
                key={net.name}
                href={net.url}
                className="p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 hover:border-cyan-500/40 transition group"
              >
                <div className="font-bold text-xs text-white group-hover:text-cyan-400 truncate">{net.name}</div>
                <div className="text-[11px] text-slate-400 line-clamp-1">{net.desc}</div>
              </a>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800/60 text-xs text-slate-500">
            <div>
              &copy; {new Date().getFullYear()} CodeLove. Created by{" "}
              <a href={SITE.creatorUrl} className="text-slate-400 hover:text-white underline">
                {SITE.creator}
              </a>.
            </div>
            <div className="flex gap-4">
              <a href="https://codelove.in/about" className="hover:text-white transition">About</a>
              <a href="https://codelove.in/contact" className="hover:text-white transition">Contact</a>
              <a href="https://webly.codelove.in/privacy.html" className="hover:text-white transition">Privacy Policy</a>
              <a href="https://webly.codelove.in/terms.html" className="hover:text-white transition">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
