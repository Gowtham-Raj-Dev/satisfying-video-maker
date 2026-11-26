import type { Metadata } from "next";
import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GamesCatalog from "@/components/GamesCatalog";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "52 Physics & Satisfying Games",
  description:
    "Play 52 interactive browser simulations across Physics, Marble Races, Hydraulic Press Crushing, Kinetic Sand, Liquid Dynamics, Space Gravity, and Chain Reactions.",
  alternates: { canonical: `${SITE.url}/games/` },
};

export default function GamesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0C] text-[#F5F5F5]">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F5F5F5]">
            Simulation Library
          </h1>
          <p className="text-sm text-[#A1A1AA] max-w-2xl">
            52 browser-native simulations powered by modular Canvas 2D, Matter.js rigid-body physics, and Three.js WebGL engines. Every card indicates live status.
          </p>
        </div>
        <GamesCatalog />
      </main>
      <Footer />
    </div>
  );
}
