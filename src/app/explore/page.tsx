import type { Metadata } from "next";
import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ExploreCatalog from "@/components/ExploreCatalog";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Explore Simulations",
  description:
    "Discover trending physics simulations, 3D WebGL black holes, country marble races, kinetic sand waterfalls, and ASMR creator presets.",
  alternates: { canonical: `${SITE.url}/explore/` },
};

export default function ExplorePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0C] text-[#F5F5F5]">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F5F5F5]">
            Explore Simulations
          </h1>
          <p className="text-sm text-[#A1A1AA] max-w-2xl">
            Browse curated collections, interactive 3D scenes, and viral short-form video formats ready to customize and export.
          </p>
        </div>
        <ExploreCatalog />
      </main>
      <Footer />
    </div>
  );
}
