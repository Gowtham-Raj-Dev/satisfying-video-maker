"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CATEGORIES } from "@/lib/defaults";
import { GAMES_REGISTRY } from "@/lib/games";
import { SimulationStatus } from "@/types/simulation";
import GameCard from "./GameCard";
import CustomSelect from "./CustomSelect";

export default function GamesCatalog() {
  const [category, setCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | SimulationStatus>("all");
  const [search, setSearch] = useState("");
  const [livePreviews, setLivePreviews] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const c = new URLSearchParams(window.location.search).get("category");
      if (c && CATEGORIES.some((item) => item.id === c)) {
        setCategory(c);
      }
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GAMES_REGISTRY.filter((g) => {
      const catOk = category === "all" || g.category === category;
      const statusOk = statusFilter === "all" || g.status === statusFilter;
      const qOk =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.shortDesc.toLowerCase().includes(q) ||
        g.tags.some((t) => t.toLowerCase().includes(q));
      return catOk && statusOk && qOk;
    });
  }, [category, statusFilter, search]);

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="bg-[#141416] border border-[#29292D] rounded-lg p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Filter ${GAMES_REGISTRY.length} simulations by name or tag...`}
              className="w-full bg-[#0B0B0C] border border-[#29292D] rounded-md pl-9 pr-3 py-2 text-sm text-[#F5F5F5]"
              aria-label="Filter simulations"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <CustomSelect
              ariaLabel="Filter by status"
              value={statusFilter}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "playable", label: "Playable Only" },
                { value: "experimental", label: "Experimental Only" },
              ]}
              onChange={(val) => setStatusFilter(val as "all" | SimulationStatus)}
              className="w-44"
            />

            <label className="flex items-center gap-2 text-xs text-[#A1A1AA] cursor-pointer">
              <input
                type="checkbox"
                checked={livePreviews}
                onChange={(e) => setLivePreviews(e.target.checked)}
                className="accent-[#C4FF2E]"
              />
              <span>Live Card Previews</span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`px-3 py-1.5 rounded text-xs font-medium border ${
              category === "all"
                ? "bg-[#C4FF2E] text-[#0B0B0C] border-[#C4FF2E] font-semibold"
                : "bg-[#1B1B1E] border-[#29292D] text-[#A1A1AA] hover:text-[#F5F5F5]"
            }`}
          >
            All ({GAMES_REGISTRY.length})
          </button>
          {CATEGORIES.map((c) => {
            const count = GAMES_REGISTRY.filter((g) => g.category === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium border ${
                  category === c.id
                    ? "bg-[#C4FF2E] text-[#0B0B0C] border-[#C4FF2E] font-semibold"
                    : "bg-[#1B1B1E] border-[#29292D] text-[#A1A1AA] hover:text-[#F5F5F5]"
                }`}
              >
                {c.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Grid */}
      <div className="text-xs text-[#A1A1AA]">
        Showing <span className="font-mono-tabular text-[#F5F5F5]">{filtered.length}</span> of{" "}
        <span className="font-mono-tabular text-[#F5F5F5]">{GAMES_REGISTRY.length}</span> simulations
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 rounded-lg bg-[#141416] border border-dashed border-[#29292D] text-center space-y-2">
          <div className="text-sm font-medium text-[#F5F5F5]">No matching simulations</div>
          <button
            type="button"
            onClick={() => {
              setCategory("all");
              setStatusFilter("all");
              setSearch("");
            }}
            className="text-xs text-[#C4FF2E] hover:underline"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} showPreview={livePreviews} />
          ))}
        </div>
      )}
    </div>
  );
}
