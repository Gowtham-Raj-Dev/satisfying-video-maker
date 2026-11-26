"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Sliders, Compass, Grid3X3, FolderHeart, Play } from "lucide-react";

const NAV_ITEMS = [
  { href: "/explore/", label: "Explore", icon: Compass },
  { href: "/games/", label: "Games", icon: Grid3X3 },
  { href: "/studio/", label: "Studio", icon: Sliders },
  { href: "/creations/", label: "My Creations", icon: FolderHeart },
];

export default function Navbar() {
  const pathname = usePathname() || "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    const cleanHref = href.replace(/\/$/, "");
    const cleanPath = pathname.replace(/\/$/, "") || "/";
    if (cleanHref === "/games" && cleanPath.startsWith("/game/")) return true;
    return cleanPath === cleanHref || cleanPath.startsWith(`${cleanHref}/`);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0B0B0C]/95 backdrop-blur-sm border-b border-[#29292D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[#F5F5F5] font-semibold text-sm sm:text-base tracking-tight shrink-0"
        >
          <span className="w-7 h-7 rounded-md bg-[#C4FF2E] text-[#0B0B0C] flex items-center justify-center">
            <Play className="w-3.5 h-3.5 fill-[#0B0B0C] translate-x-[1px]" />
          </span>
          <span className="font-semibold">Satisfying Video Maker</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#1B1B1E] text-[#F5F5F5] border border-[#29292D]"
                    : "text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#141416]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action + Mobile Toggle */}
        <div className="flex items-center gap-2">
          <Link
            href="/studio/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#C4FF2E] hover:bg-[#D4FF63] text-[#0B0B0C] text-xs font-semibold transition-colors"
          >
            Open Studio
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-md bg-[#141416] border border-[#29292D] text-[#F5F5F5]"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#29292D] bg-[#141416] px-4 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium ${
                  active
                    ? "bg-[#1B1B1E] text-[#C4FF2E] border border-[#29292D]"
                    : "text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1B1B1E]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
