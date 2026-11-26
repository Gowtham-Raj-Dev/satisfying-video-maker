import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn how Satisfying Video Maker runs real-time physics, Web Audio synthesis, and local WebCodecs MP4 encoding directly in your browser.",
  alternates: { canonical: `${SITE.url}/about/` },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0C] text-[#F5F5F5]">
      <Navbar />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">About Satisfying Video Maker</h1>
          <p className="text-sm text-[#A1A1AA]">
            A browser-native physics simulation playground and short-form video creation studio by {SITE.brand}.
          </p>
        </header>

        <section className="space-y-3 text-sm text-[#A1A1AA] leading-relaxed">
          <h2 className="text-lg font-semibold text-[#F5F5F5]">How Local Rendering Works</h2>
          <p>
            Unlike cloud render queues that require accounts, credits, or watermarked free tiers, Satisfying Video Maker runs 100% locally in your web browser:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-[#F5F5F5]">Simulation Engines:</strong> Built with HTML5 Canvas 2D, Matter.js rigid-body physics, Three.js WebGL 3D scenes, and Web Workers.
            </li>
            <li>
              <strong className="text-[#F5F5F5]">ASMR Audio Synthesis:</strong> Original procedural chimes, marimbas, water drops, hydraulic noises, and ambient drones synthesized via the Web Audio API.
            </li>
            <li>
              <strong className="text-[#F5F5F5]">Video Encoding:</strong> Uses WebCodecs (H.264 + AAC/Opus) packaged via mp4-muxer directly into standard MP4 files on supported browsers, with automatic MediaRecorder fallback for older browsers.
            </li>
          </ul>
        </section>

        <section className="space-y-3 text-sm text-[#A1A1AA] leading-relaxed">
          <h2 className="text-lg font-semibold text-[#F5F5F5]">Start Creating</h2>
          <p>
            Explore all 52 simulations or open the 3-column Studio directly—no registration required.
          </p>
          <div className="flex gap-3 pt-1">
            <Link
              href="/games/"
              className="px-4 py-2 rounded-md bg-[#C4FF2E] text-[#0B0B0C] text-xs font-semibold"
            >
              Browse 52 Games
            </Link>
            <Link
              href="/studio/"
              className="px-4 py-2 rounded-md bg-[#141416] border border-[#29292D] text-[#F5F5F5] text-xs font-medium"
            >
              Open Video Studio
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
