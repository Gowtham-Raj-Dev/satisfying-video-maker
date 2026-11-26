"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Sliders, Compass, Grid3X3, FolderHeart } from "lucide-react";

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
          <svg
            viewBox="0 0 64 64"
            className="w-7 h-7 rounded-md shrink-0"
            aria-hidden="true"
            fill="none"
          >
            <rect width="64" height="64" rx="14" fill="#141416" />
            <rect x="1.5" y="1.5" width="61" height="61" rx="12.5" stroke="#29292D" strokeWidth="2" />
            <circle cx="32" cy="32" r="21" stroke="#38BDF8" strokeWidth="3" strokeOpacity="0.35" />
            <path d="M16 18.5A21 21 0 0 1 51.5 24" stroke="#C4FF2E" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="51.5" cy="24" r="3.5" fill="#38BDF8" />
            <rect x="19" y="19" width="26" height="26" rx="7" fill="#C4FF2E" />
            <path d="M27.5 24.5L39.5 32L27.5 39.5V24.5Z" fill="#0B0B0C" />
          </svg>
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
