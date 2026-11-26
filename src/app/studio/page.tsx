import React, { Suspense } from "react";
import SatisfyingStudio from "@/components/SatisfyingStudio";
import { Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StudioPage() {
  return (
    <div className="w-full min-h-screen bg-[#060813] text-white flex flex-col">
      {/* Studio Header Bar */}
      <header className="w-full bg-[#080b18]/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2 text-white font-black text-base tracking-tight">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-400 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-black" />
            </div>
            <span>Satisfying <span className="text-cyan-400">Studio</span></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-semibold">
            60FPS 9:16 Shorts Mode
          </span>
        </div>
      </header>

      {/* Main Studio Workbench */}
      <main className="w-full max-w-7xl mx-auto px-4 py-6 flex-grow">
        <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading Studio...</div>}>
          <SatisfyingStudio />
        </Suspense>
      </main>
    </div>
  );
}
