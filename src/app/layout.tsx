import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE } from "@/lib/site";

export const viewport: Viewport = {
  themeColor: "#060813",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Satisfying Video Maker: Free ASMR & Physics Shorts Generator",
    template: `%s | ${SITE.brand}`,
  },
  description: SITE.description,
  applicationName: SITE.fullName,
  authors: [{ name: SITE.creator, url: SITE.creatorUrl }],
  creator: SITE.creator,
  publisher: SITE.brand,
  category: "multimedia",
  keywords: SITE.keywords,
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.fullName,
    title: "Satisfying Video Maker: Free ASMR & Physics Shorts Generator",
    description: SITE.description,
    locale: "en_IN",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Satisfying Video Maker by CodeLove" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Satisfying Video Maker: Free ASMR & Physics Shorts Generator",
    description: SITE.description,
    images: ["/og.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://gowtham.codelove.in/#person",
      name: SITE.creator,
      url: SITE.creatorUrl,
    },
    {
      "@type": "Organization",
      "@id": "https://codelove.in/#organization",
      name: SITE.brand,
      url: "https://codelove.in",
      founder: { "@id": "https://gowtham.codelove.in/#person" },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: `${SITE.url}/`,
      name: "Satisfying Video Maker",
      alternateName: ["Satisfying Video Generator", "Marble Race Maker", "ASMR Shorts Maker"],
      description: SITE.description,
      inLanguage: "en",
      creator: { "@id": "https://gowtham.codelove.in/#person" },
      publisher: { "@id": "https://codelove.in/#organization" },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE.url}/#app`,
      name: "Satisfying Video Maker",
      alternateName: "Free ASMR & Physics Simulation Shorts Generator",
      url: `${SITE.url}/`,
      description: SITE.description,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires modern browser with WebGL and HTML5 Canvas",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "Bouncing Ball inside Rotating Shapes with Musical ASMR Chimes",
        "3D Country Marble Race Course with Live Leaderboard",
        "1080x1920 (9:16) Vertical Video Export for YouTube Shorts, Reels & TikTok",
        "60 FPS High Definition MP4 video recording in browser",
        "100% Free with No Watermark and No Sign-up required",
        "Rich color themes: Cyber Neon, Rainbow Candy, Sunset Gold, Acid Matrix",
      ],
      creator: { "@id": "https://gowtham.codelove.in/#person" },
      publisher: { "@id": "https://codelove.in/#organization" },
      isPartOf: { "@id": `${SITE.url}/#website` },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {/* Google AdSense site verification & script */}
        <meta name="google-adsense-account" content="ca-pub-1282068947061740" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1282068947061740"
          crossOrigin="anonymous"
        />
        {/* CodeLove Analytics (admin.codelove.in) */}
        <script defer src="https://admin.codelove.in/t.js" />
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-E7XZ96YCVC" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-E7XZ96YCVC');`,
          }}
        />
      </head>
      <body className="bg-[#060813] text-white min-h-screen flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
