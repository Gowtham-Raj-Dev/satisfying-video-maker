import type { Metadata } from "next";
import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy for Satisfying Video Maker: all video rendering, audio synthesis, and creation history stay local to your browser.",
  alternates: { canonical: `${SITE.url}/privacy/` },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0C] text-[#F5F5F5]">
      <Navbar />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 space-y-6 text-sm text-[#A1A1AA] leading-relaxed">
        <h1 className="text-3xl font-semibold tracking-tight text-[#F5F5F5]">Privacy Policy</h1>
        <p className="text-xs">Last updated: November 26, 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#F5F5F5]">1. Local-Only Video Processing</h2>
          <p>
            All simulations, audio synthesis, text overlays, and video encodings execute strictly inside your web browser. We do not upload, store, or process your generated videos or custom preset settings on any remote server.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#F5F5F5]">2. Local Browser Storage (IndexedDB)</h2>
          <p>
            When you export a video or save a configuration preset, the metadata and locally generated video file (if within your browser&apos;s storage limit) are saved locally in IndexedDB so you can access them under My Creations. Clearing your browser site data permanently removes these items.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#F5F5F5]">3. Analytics &amp; Advertising</h2>
          <p>
            This static site uses Google Analytics and Google AdSense to measure aggregate traffic and keep the creative tool free without subscriptions or paywalls. Third-party services may use cookies according to their respective privacy policies.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
