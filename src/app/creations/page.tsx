import type { Metadata } from "next";
import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CreationsLibrary from "@/components/CreationsLibrary";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "My Creations & Saved Presets",
  description:
    "View your locally exported MP4 videos and custom simulation presets stored inside your browser IndexedDB.",
  alternates: { canonical: `${SITE.url}/creations/` },
};

export default function CreationsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0C] text-[#F5F5F5]">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F5F5F5]">
            My Creations
          </h1>
          <p className="text-sm text-[#A1A1AA] max-w-2xl">
            Manage recent local video exports and reusable simulation presets saved directly inside your browser.
          </p>
        </div>
        <CreationsLibrary />
      </main>
      <Footer />
    </div>
  );
}
