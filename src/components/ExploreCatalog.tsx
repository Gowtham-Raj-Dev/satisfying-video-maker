"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Sliders, Sparkles } from "lucide-react";
import { CATEGORIES } from "@/lib/defaults";
import { GAMES_REGISTRY } from "@/lib/games";
import GameCard from "./GameCard";

export default function ExploreCatalog() {
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");

  const featured = useMemo(() => GAMES_REGISTRY.filter((g) => g.featured), []);
  const threeD = useMemo(() => GAMES_REGISTRY.filter((g) => g.is3D), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GAMES_REGISTRY.filter((g) => {
      const matchesQ =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.shortDesc.toLowerCase().includes(q) ||
        g.tags.some((t) => t.toLowerCase().includes(q));
      const matchesTag = selectedTag === "all" || g.category === selectedTag;
      return matchesQ && matchesTag;
    });
  }, [query, selectedTag]);

  return (
    <div className="space-y-12">
      {/* Search & Quick Filter */}
      <div className="bg-[#141416] border border-[#29292D] rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search simulations, mechanics, or ASMR styles..."
              className="w-full bg-[#0B0B0C] border border-[#29292D] rounded-md pl-9 pr-3 py-2 text-sm text-[#F5F5F5]"
              aria-label="Search simulations"
            />
          </div>
          <Link
            href="/studio/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#C4FF2E] text-[#0B0B0C] text-xs font-semibold shrink-0"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Open Studio</span>
          </Link>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedTag("all")}
            className={`px-3 py-1 rounded text-xs font-medium border ${
              selectedTag === "all"
                ? "bg-[#C4FF2E] text-[#0B0B0C] border-[#C4FF2E]"
                : "bg-[#1B1B1E] border-[#29292D] text-[#A1A1AA] hover:text-[#F5F5F5]"
            }`}
          >
            All ({GAMES_REGISTRY.length})
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedTag(c.id)}
              className={`px-3 py-1 rounded text-xs font-medium border ${
                selectedTag === c.id
                  ? "bg-[#C4FF2E] text-[#0B0B0C] border-[#C4FF2E]"
                  : "bg-[#1B1B1E] border-[#29292D] text-[#A1A1AA] hover:text-[#F5F5F5]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Curated Spotlight when no search filter active */}
      {!query && selectedTag === "all" && (
        <>
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C4FF2E]" />
              <h2 className="text-lg font-semibold text-[#F5F5F5]">Featured Creator Picks</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map((g) => (
                <GameCard key={g.id} game={g} showPreview={true} />
              ))}
            </div>
          </section>

          <section className="space-y-4 pt-6 border-t border-[#29292D]">
            <div>
              <h2 className="text-lg font-semibold text-[#F5F5F5]">3D WebGL Simulations</h2>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Three.js real-time 3D spaces with adjustable camera distance, tilt, and field of view.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {threeD.map((g) => (
                <GameCard key={g.id} game={g} showPreview={true} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Filtered Results */}
      <section className="space-y-4 pt-6 border-t border-[#29292D]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#F5F5F5]">
            {query || selectedTag !== "all" ? `Matching Simulations (${filtered.length})` : "All Simulations"}
          </h2>
          <Link href="/games/" className="text-xs text-[#C4FF2E] hover:underline">
            Browse full table →
          </Link>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 rounded-lg bg-[#141416] border border-dashed border-[#29292D] text-center space-y-2">
            <div className="text-sm font-medium text-[#F5F5F5]">No simulations match &ldquo;{query}&rdquo;</div>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedTag("all");
              }}
              className="text-xs text-[#C4FF2E] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((g, idx) => (
              <GameCard key={g.id} game={g} showPreview={idx < 12} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
