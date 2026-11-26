"use client";

import { useEffect } from "react";

/**
 * Loads the AdSense tag after hydration to avoid React hydration mismatches.
 */
export default function AdSenseScript({ client }: { client: string }) {
  useEffect(() => {
    const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, [client]);

  return null;
}
