import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Satisfying Video Maker (CodeLove) for bug reports, simulation requests, or licensing questions.",
  alternates: { canonical: `${SITE.url}/contact/` },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0C] text-[#F5F5F5]">
      <Navbar />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Contact Satisfying Video Maker</h1>
          <p className="text-sm text-[#A1A1AA]">
            Questions, bug reports, or new physics simulation ideas for {SITE.brand}? Reach out directly.
          </p>
        </header>

        <section className="rounded-lg bg-[#141416] border border-[#29292D] p-6 space-y-4 text-sm text-[#A1A1AA] leading-relaxed">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#A1A1AA] mb-1">Direct Support Email</div>
            <a
              href="mailto:support@codelove.in?subject=Satisfying%20Video%20Maker%20Feedback"
              className="text-base font-semibold text-[#C4FF2E] hover:underline"
            >
              support@codelove.in
            </a>
          </div>
          <p>
            You can also connect via{" "}
            <a
              href={SITE.creatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F5F5F5] underline underline-offset-4"
            >
              Gowtham Portfolio
            </a>{" "}
            or explore all creator utilities across CodeLove.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/studio/"
              className="px-4 py-2 rounded-md bg-[#C4FF2E] text-[#0B0B0C] text-xs font-semibold"
            >
              Open Video Studio
            </Link>
            <Link
              href="/about/"
              className="px-4 py-2 rounded-md bg-[#0B0B0C] border border-[#29292D] text-[#F5F5F5] text-xs font-medium"
            >
              About Satisfying Studio
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
