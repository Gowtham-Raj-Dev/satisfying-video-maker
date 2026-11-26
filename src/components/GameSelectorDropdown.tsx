"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Check, Search, X, Crosshair, ExternalLink, Sparkles } from "lucide-react";
import { CATEGORIES } from "@/lib/defaults";
import { GAMES_REGISTRY } from "@/lib/games";
import { GameCategoryId, GameDefinition } from "@/types/simulation";

interface GameSelectorDropdownProps {
  selectedGame: GameDefinition;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (nextOpen: boolean) => void;
  onSelect: (game: GameDefinition) => void;
}

export default function GameSelectorDropdown({
  selectedGame,
  disabled = false,
  open: controlledOpen,
  onOpenChange,
  onSelect,
}: GameSelectorDropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  };

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<GameCategoryId | "all">("all");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const selectedCardRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    const t1 = setTimeout(() => {
      searchInputRef.current?.focus();
      selectedCardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 40);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(t1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filteredGames = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GAMES_REGISTRY.filter((g) => {
      if (activeCategory !== "all" && g.category !== activeCategory) return false;
      if (!q) return true;
      const catLabel = CATEGORIES.find((c) => c.id === g.category)?.label || "";
      return (
        g.name.toLowerCase().includes(q) ||
        g.shortDesc.toLowerCase().includes(q) ||
        g.tags.some((t) => t.toLowerCase().includes(q)) ||
        catLabel.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory]);

  const currentCatLabel =
    CATEGORIES.find((c) => c.id === selectedGame.category)?.label || selectedGame.category;

  return (
    <div className="relative">
      <button
        type="button"
        id="studio-game-select"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between gap-2.5 min-w-[190px] sm:min-w-[260px] max-w-[320px] px-3 py-1.5 rounded-md bg-[#0B0B0C] border text-left transition-colors ${
          open
            ? "border-[#C4FF2E] text-[#F5F5F5]"
            : "border-[#29292D] hover:border-[#3F3F46] text-[#F5F5F5]"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Crosshair className="w-3.5 h-3.5 text-[#C4FF2E] shrink-0" />
          <span className="text-xs font-medium text-[#F5F5F5] truncate">{selectedGame.name}</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[#1B1B1E] text-[10px] text-[#A1A1AA] shrink-0">
            {currentCatLabel}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#A1A1AA] shrink-0 transition-transform ${
            open ? "rotate-180 text-[#C4FF2E]" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choose simulation"
            className="w-full max-w-5xl h-[82vh] max-h-[760px] bg-[#141416] border border-[#29292D] rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Modal Header + Active Target Banner */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-[#29292D] bg-[#1B1B1E] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-semibold text-[#F5F5F5]">
                      Choose Simulation
                    </h2>
                    <span className="px-2 py-0.5 rounded bg-[#0B0B0C] border border-[#29292D] text-[11px] font-mono-tabular text-[#A1A1AA]">
                      {GAMES_REGISTRY.length} Games
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] mt-0.5 flex items-center gap-1.5">
                    <Crosshair className="w-3 h-3 text-[#C4FF2E]" />
                    <span>Currently Targeted:</span>
                    <span className="text-[#C4FF2E] font-medium">{selectedGame.name}</span>
                    <span className="text-[#52525B]">·</span>
                    <span>{currentCatLabel}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/games/"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#0B0B0C] border border-[#29292D] hover:border-[#C4FF2E] text-[11px] font-medium text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors"
                >
                  <span>Full Library Page</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close game picker"
                  className="p-1.5 rounded bg-[#0B0B0C] border border-[#29292D] hover:border-[#F5F5F5] text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search & Category Filter Bar */}
            <div className="px-4 sm:px-5 py-3 border-b border-[#29292D] bg-[#141416] space-y-2.5 shrink-0">
              <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${GAMES_REGISTRY.length} simulations (doubler, hexagon, star, marble, sand, domino...)`}
                    className="w-full bg-[#0B0B0C] border border-[#29292D] rounded-md pl-9 pr-3 py-2 text-xs text-[#F5F5F5] focus:border-[#C4FF2E] focus:outline-none focus-visible:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory(selectedGame.category);
                    setQuery("");
                    setTimeout(() => selectedCardRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 30);
                  }}
                  className="px-3 py-2 rounded-md bg-[#1B1B1E] border border-[#C4FF2E]/40 hover:border-[#C4FF2E] text-xs font-medium text-[#C4FF2E] inline-flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Locate Current Target</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                    activeCategory === "all"
                      ? "bg-[#C4FF2E] text-[#0B0B0C] border-[#C4FF2E] font-semibold"
                      : "bg-[#1B1B1E] border-[#29292D] text-[#A1A1AA] hover:text-[#F5F5F5]"
                  }`}
                >
                  All ({GAMES_REGISTRY.length})
                </button>
                {CATEGORIES.map((cat) => {
                  const count = GAMES_REGISTRY.filter((g) => g.category === cat.id).length;
                  const active = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                        active
                          ? "bg-[#C4FF2E] text-[#0B0B0C] border-[#C4FF2E] font-semibold"
                          : "bg-[#1B1B1E] border-[#29292D] text-[#A1A1AA] hover:text-[#F5F5F5]"
                      }`}
                    >
                      {cat.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cards Grid */}
            <div role="listbox" aria-label="Simulations list" className="flex-1 min-h-0 overflow-y-auto panel-scroll p-4 sm:p-5">
              {filteredGames.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <p className="text-sm text-[#F5F5F5] font-medium">No simulations match &ldquo;{query}&rdquo;</p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setActiveCategory("all");
                    }}
                    className="px-3 py-1.5 rounded bg-[#1B1B1E] border border-[#29292D] text-xs text-[#C4FF2E]"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredGames.map((g) => {
                    const isSelected = g.id === selectedGame.id;
                    const catLabel = CATEGORIES.find((c) => c.id === g.category)?.label || g.category;
                    const isMultiply =
                      g.defaultParams.multiplyMode && g.defaultParams.multiplyMode !== "none";
                    return (
                      <button
                        key={g.id}
                        ref={isSelected ? selectedCardRef : undefined}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          onSelect(g);
                          setOpen(false);
                          setQuery("");
                        }}
                        className={`group relative rounded-lg p-3.5 text-left border transition-all flex flex-col justify-between gap-2.5 focus-visible:outline-none ${
                          isSelected
                            ? "bg-[#1B1B1E] border-[#C4FF2E]"
                            : "bg-[#0B0B0C] border-[#29292D] hover:border-[#52525B] hover:bg-[#18181B]"
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                              {catLabel}
                            </span>
                            <div className="flex items-center gap-1">
                              {isMultiply && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#C4FF2E]/15 border border-[#C4FF2E]/35 text-[9px] font-semibold text-[#C4FF2E]">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  2X SPLIT
                                </span>
                              )}
                              {g.is3D && (
                                <span className="px-1.5 py-0.5 rounded bg-[#141416] border border-[#29292D] text-[9px] text-[#38BDF8] font-mono-tabular">
                                  3D
                                </span>
                              )}
                              {isSelected && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#C4FF2E] text-[#0B0B0C] text-[9px] font-bold uppercase tracking-wide">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  Targeted
                                </span>
                              )}
                            </div>
                          </div>

                          <div
                            className={`text-sm font-semibold leading-snug ${
                              isSelected ? "text-[#C4FF2E]" : "text-[#F5F5F5] group-hover:text-white"
                            }`}
                          >
                            {g.name}
                          </div>
                          <p className="text-[11px] text-[#A1A1AA] line-clamp-2 leading-relaxed">
                            {g.shortDesc}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#29292D]/70 text-[10px] font-mono-tabular text-[#A1A1AA]">
                          <span>Sound: {g.recommendedSound}</span>
                          <span className={isSelected ? "text-[#C4FF2E] font-semibold" : "group-hover:text-[#F5F5F5]"}>
                            {isSelected ? "Active in Studio" : "Load Simulation →"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
