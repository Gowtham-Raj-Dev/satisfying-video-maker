import type { Metadata } from "next";
import React, { Suspense } from "react";
import StudioWorkbench from "@/components/StudioWorkbench";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Video Creation Studio",
  description:
    "Full-screen browser studio for physics customization, synthesized ASMR audio, text overlays, and local 60 FPS MP4 video export without watermarks.",
  alternates: { canonical: `${SITE.url}/studio/` },
};

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0B0C] text-[#A1A1AA] flex items-center justify-center text-sm">
          Loading Video Studio...
        </div>
      }
    >
      <StudioWorkbench />
    </Suspense>
  );
}
