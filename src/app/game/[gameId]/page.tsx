import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GamePlayerWorkbench from "@/components/GamePlayerWorkbench";
import GameCard from "@/components/GameCard";
import { CATEGORIES } from "@/lib/defaults";
import { GAMES_REGISTRY } from "@/lib/games";
import { SITE } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return GAMES_REGISTRY.map((g) => ({ gameId: g.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gameId: string }>;
}): Promise<Metadata> {
  const { gameId } = await params;
  const game = GAMES_REGISTRY.find((g) => g.id === gameId);
  if (!game) return { title: "Simulation Not Found" };

  return {
    title: `${game.name} — Interactive Physics Simulation`,
    description: `${game.shortDesc} Customize physics, colors, and synthesized ASMR audio, or record watermark-free MP4 clips directly in your browser.`,
    alternates: { canonical: `${SITE.url}/game/${game.id}/` },
    openGraph: {
      title: `${game.name} | ${SITE.name}`,
      description: game.shortDesc,
      url: `${SITE.url}/game/${game.id}/`,
      type: "website",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: `${game.name} | ${SITE.name}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${game.name} | ${SITE.name}`,
      description: game.shortDesc,
      images: ["/og-image.png"],
    },
  };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const game = GAMES_REGISTRY.find((g) => g.id === gameId);
  if (!game) notFound();

  const category = CATEGORIES.find((c) => c.id === game.category);
  const relatedGames = game.relatedIds
    .map((id) => GAMES_REGISTRY.find((g) => g.id === id))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `${game.name} — ${SITE.name}`,
    url: `${SITE.url}/game/${game.id}/`,
    description: game.description,
    applicationCategory: "SimulationApplication",
    operatingSystem: "Any (web browser)",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0C] text-[#F5F5F5]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Breadcrumb & Title Header */}
        <div className="space-y-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
            <Link href="/games/" className="hover:text-[#F5F5F5]">
              Games
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            {category && (
              <>
                <Link href={`/games/?category=${category.id}`} className="hover:text-[#F5F5F5]">
                  {category.label}
                </Link>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
            <span className="text-[#F5F5F5]">{game.name}</span>
          </nav>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F5F5F5]">
                  {game.name}
                </h1>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide border ${
                    game.status === "playable"
                      ? "bg-[#141416] border-[#C4FF2E]/40 text-[#C4FF2E]"
                      : "bg-[#141416] border-amber-500/40 text-amber-300"
                  }`}
                >
                  {game.status}
                </span>
                {game.is3D && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#141416] border border-[#29292D] text-[#A1A1AA]">
                    Three.js 3D WebGL
                  </span>
                )}
              </div>
              <p className="text-sm text-[#A1A1AA]">{game.shortDesc}</p>
            </div>
          </div>
        </div>

        {/* Interactive Player Workbench */}
        <GamePlayerWorkbench game={game} />

        {/* Simulation Notes & Creator Guide */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-[#29292D]">
          <div className="md:col-span-2 bg-[#141416] border border-[#29292D] rounded-lg p-5 space-y-3">
            <h2 className="text-base font-semibold text-[#F5F5F5]">
              How {game.name} Works
            </h2>
            <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
              {game.description}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {game.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded bg-[#1B1B1E] border border-[#29292D] text-[11px] text-[#A1A1AA]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-[#141416] border border-[#29292D] rounded-lg p-5 space-y-3">
            <h2 className="text-base font-semibold text-[#F5F5F5]">Creator Tips</h2>
            <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
              {game.creatorTip}
            </p>
            <div className="pt-2">
              <Link
                href={`/studio/?game=${game.id}`}
                className="inline-flex items-center justify-center w-full py-2 px-3 rounded bg-[#C4FF2E] hover:bg-[#D4FF63] text-[#0B0B0C] text-xs font-semibold transition-colors"
              >
                Customize Overlays &amp; Export in Studio
              </Link>
            </div>
          </div>
        </section>

        {/* Related Simulations */}
        {relatedGames.length > 0 && (
          <section className="space-y-4 pt-6 border-t border-[#29292D]">
            <h2 className="text-lg font-semibold text-[#F5F5F5]">Related Simulations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedGames.map((rel) => (
                <GameCard key={rel.id} game={rel} showPreview={false} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
