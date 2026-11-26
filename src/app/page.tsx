import React from "react";
import SatisfyingStudio from "@/components/SatisfyingStudio";
import { SITE } from "@/lib/site";
import { Sparkles, Video, Flame, Music, Trophy, ShieldCheck, Zap, HelpCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div className="w-full flex flex-col flex-grow">
      {/* Top Header / Navigation */}
      <header className="sticky top-0 z-50 w-full bg-[#060813]/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 text-white font-black text-lg tracking-tight">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-fuchsia-500 flex items-center justify-center shadow-[0_0_15px_rgba(0,245,255,0.4)]">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <span>CodeLove <span className="text-cyan-400">Satisfying</span></span>
        </a>

        <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-300">
          <a href="#studio" className="hover:text-cyan-400 transition">Video Studio</a>
          <a href="#features" className="hover:text-cyan-400 transition">Features</a>
          <a href="#viral-tips" className="hover:text-cyan-400 transition">Viral Tips</a>
          <a href="#faq" className="hover:text-cyan-400 transition">FAQ</a>
          <a href="https://videomaker.codelove.in" target="_blank" rel="noopener" className="hover:text-fuchsia-400 transition flex items-center gap-1">
            AI Video Maker <span className="text-xs">↗</span>
          </a>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#studio"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-xs font-black tracking-wide shadow-md hover:shadow-cyan-500/20 hover:scale-105 transition"
          >
            CREATE VIDEO ✦
          </a>
        </div>
      </header>

      {/* Main Interactive Studio */}
      <main id="studio" className="w-full flex-grow">
        <SatisfyingStudio />
      </main>

      {/* Feature Showcase Grid */}
      <section id="features" className="w-full max-w-7xl mx-auto px-4 py-16 border-t border-slate-800/60">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
            Why Creators Choose <span className="text-cyan-400">CodeLove Satisfying</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-base">
            The free modern alternative to Vidirexa & Vireel with no watermarks, unlimited recording, and ultra-smooth 60FPS video export.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition flex flex-col gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">1080×1920 (9:16) 60FPS MP4</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Tailor-made for YouTube Shorts, Instagram Reels, and TikTok. High-bitrate 60 frames per second recording runs right in your browser with no quality drop.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-fuchsia-500/40 transition flex flex-col gap-3">
            <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
              <Music className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">ASMR Audio Synthesizer</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every bounce and collision plays harmonious pentatonic crystal chimes, wooden marimbas, or retro 8-bit sounds, mixed directly into your MP4 download.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-yellow-500/40 transition flex flex-col gap-3">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Country Marble Races</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Pick your favorite country flags, add names, and let simulated physics determine the champion through ramps, spinners, pegs, and a podium finish line!
            </p>
          </div>
        </div>
      </section>

      {/* Viral Shorts Creator Guide */}
      <section id="viral-tips" className="w-full max-w-5xl mx-auto px-4 py-14">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40 border border-slate-800">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-400 text-xs font-bold mb-4">
            <Flame className="w-3.5 h-3.5" />
            Viral Content Strategy
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
            How to Get Millions of Views with Satisfying Gameplay Videos
          </h2>
          <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
            <p>
              Short-form platforms like YouTube Shorts, Instagram Reels, and TikTok prioritize <strong>high watch time and retention</strong>. 
              Satisfying simulation videos consistently achieve <strong>120%+ average view duration</strong> because viewers get hooked waiting for the ball to escape or cheering for their country marble to win.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div className="p-4 rounded-2xl bg-black/40 border border-slate-800">
                <span className="font-bold text-cyan-400 block mb-1">1. Background for Reddit Stories</span>
                <span className="text-xs text-slate-400">Place satisfying bouncing ball or marble race videos underneath text-to-speech Reddit threads, trivia, or podcast quotes.</span>
              </div>
              <div className="p-4 rounded-2xl bg-black/40 border border-slate-800">
                <span className="font-bold text-yellow-400 block mb-1">2. Country Battle Tournaments</span>
                <span className="text-xs text-slate-400">Marbles with country flags trigger massive comments (&quot;Comment your country flag!&quot;) which signals the algorithm to push your Short viral.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section with Schema */}
      <section id="faq" className="w-full max-w-4xl mx-auto px-4 py-14 border-t border-slate-800/60">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">Frequently Asked Questions</h2>
          <p className="text-slate-400 text-sm">Everything you need to know about Satisfying Video Maker</p>
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-base font-bold text-white mb-2">Is Satisfying Video Maker completely free?</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Yes, 100% free with no hidden charges, no watermark, and no login required. You can record and download unlimited 60fps videos directly to your device.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-base font-bold text-white mb-2">Can I monetize the videos on YouTube and TikTok?</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Yes. All physics simulations and audio synths generated by our tool are free for commercial use. You can monetize them on YouTube Shorts, Instagram Reels, and TikTok.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-base font-bold text-white mb-2">How does it compare to Vidirexa or Vireel?</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Vidirexa charges \$15 to \$30 per month and puts a watermark on free downloads. CodeLove Satisfying is completely free, runs fully in your browser with zero server lag, and includes instant 1080×1920 vertical export with ASMR audio.
            </p>
          </div>
        </div>
      </section>

      {/* CodeLove Network Footer (SEO Link Graph) */}
      <footer className="w-full bg-[#04060d] border-t border-slate-800/80 px-4 sm:px-8 py-12 mt-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h3 className="text-base font-black text-white uppercase tracking-wider mb-2">CodeLove Network</h3>
            <p className="text-xs text-slate-400 max-w-2xl">
              Explore free web tools, 3D engines, AI video creators and games by CodeLove. All tools run directly in the browser with zero installation:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-10">
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
              </a>. All rights reserved.
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
