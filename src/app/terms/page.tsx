import type { Metadata } from "next";
import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of service and commercial content usage terms for Satisfying Video Maker.",
  alternates: { canonical: `${SITE.url}/terms/` },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0C] text-[#F5F5F5]">
      <Navbar />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 space-y-6 text-sm text-[#A1A1AA] leading-relaxed">
        <h1 className="text-3xl font-semibold tracking-tight text-[#F5F5F5]">Terms of Service</h1>
        <p className="text-xs">Last updated: November 26, 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#F5F5F5]">1. Free Creative Usage</h2>
          <p>
            Satisfying Video Maker is provided free of charge with no login requirement and no watermarks. You may use the procedural animations and synthesized Web Audio outputs you create for personal or commercial content across YouTube Shorts, Instagram Reels, TikTok, and similar platforms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#F5F5F5]">2. Browser Capabilities &amp; Availability</h2>
          <p>
            Because video encoding relies on your device&apos;s browser APIs (WebCodecs or MediaRecorder), output format (MP4 vs. WebM) and export speed depend on your browser and hardware capabilities. The service is provided &ldquo;as is&rdquo; without warranty of uninterrupted availability or persistent browser storage.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#F5F5F5]">3. User Responsibility</h2>
          <p>
            You are solely responsible for custom text overlays, participant names, and exported content that you create and publish.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
