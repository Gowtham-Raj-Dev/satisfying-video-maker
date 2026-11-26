import React from "react";
import Link from "next/link";
import { GAMES_REGISTRY } from "@/lib/games";
import { SITE } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="w-full bg-[#0B0B0C] border-t border-[#29292D] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#29292D]">
          <div className="md:col-span-5 space-y-3">
            <div className="text-sm font-semibold text-[#F5F5F5]">
              Satisfying Video Maker <span className="text-[#A1A1AA] font-normal">by {SITE.brand}</span>
            </div>
            <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-md">
              A browser-native physics playground and local MP4 video creation studio. Every frame and audio tone is rendered directly on your device—no account, no cloud rendering queue, and no watermarks.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-[#A1A1AA] pt-1">
              <Link href="/explore/" className="hover:text-[#F5F5F5] transition-colors">Explore</Link>
              <Link href="/games/" className="hover:text-[#F5F5F5] transition-colors">All {GAMES_REGISTRY.length} Games</Link>
              <Link href="/studio/" className="hover:text-[#F5F5F5] transition-colors">Video Studio</Link>
              <Link href="/creations/" className="hover:text-[#F5F5F5] transition-colors">My Creations</Link>
              <Link href="/about/" className="hover:text-[#F5F5F5] transition-colors">About</Link>
              <Link href="/privacy/" className="hover:text-[#F5F5F5] transition-colors">Privacy</Link>
              <Link href="/terms/" className="hover:text-[#F5F5F5] transition-colors">Terms</Link>
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-3">
              CodeLove Creator Tools
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SITE.network.slice(0, 9).map((net) => (
                <a
                  key={net.name}
                  href={net.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-md bg-[#141416] border border-[#29292D] hover:border-[#3F3F46] transition-colors"
                >
                  <div className="text-xs font-medium text-[#F5F5F5] truncate">{net.name}</div>
                  <div className="text-[11px] text-[#A1A1AA] truncate">{net.desc}</div>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#A1A1AA]">
          <div>
            &copy; {new Date().getFullYear()} {SITE.brand}. Built by{" "}
            <a href={SITE.creatorUrl} target="_blank" rel="noopener noreferrer" className="text-[#F5F5F5] hover:underline">
              {SITE.creator}
            </a>
            .
          </div>
          <div className="flex items-center gap-4">
            <span>100% Client-Side Processing</span>
            <span>·</span>
            <span>No Watermark</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
