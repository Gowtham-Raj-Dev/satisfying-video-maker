import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import AdSenseScript from "@/components/AdSenseScript";
import "./globals.css";
import { GAMES_REGISTRY } from "@/lib/games";
import { SITE } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0B0B0C",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.creator, url: SITE.creatorUrl }],
  creator: SITE.creator,
  publisher: SITE.brand,
  category: "multimedia",
  keywords: SITE.keywords,
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
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
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    locale: "en_US",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE.title }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
    images: ["/og-image.png"],
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
      name: SITE.name,
      description: SITE.description,
      inLanguage: "en",
      creator: { "@id": "https://gowtham.codelove.in/#person" },
      publisher: { "@id": "https://codelove.in/#organization" },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE.url}/#app`,
      name: SITE.name,
      url: `${SITE.url}/`,
      description: SITE.description,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any (modern web browser)",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        `${GAMES_REGISTRY.length} Interactive Physics, Multiply, Marble Race, Sand, Liquid, Gravity & Chain Reaction Simulations`,
        "Real-time Web Audio API ASMR Synthesizer",
        "WebCodecs H.264 + mp4-muxer Local Browser MP4 Export",
        "Custom Aspect Ratios (9:16, 16:9, 1:1) and Live Text Overlays",
        "Zero Watermark, No Mandatory Account, Local IndexedDB Creations Library",
      ],
      creator: { "@id": "https://gowtham.codelove.in/#person" },
      publisher: { "@id": "https://codelove.in/#organization" },
      isPartOf: { "@id": `${SITE.url}/#website` },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <meta name="google-adsense-account" content="ca-pub-1282068947061740" />
      </head>
      <body className="bg-[#0B0B0C] text-[#F5F5F5] min-h-screen flex flex-col antialiased selection:bg-[#C4FF2E] selection:text-[#0B0B0C]">
        {children}
        <AdSenseScript client="ca-pub-1282068947061740" />
        <Script src="https://admin.codelove.in/t.js" strategy="afterInteractive" />
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-E7XZ96YCVC" strategy="afterInteractive" />
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-E7XZ96YCVC');`,
          }}
        />
      </body>
    </html>
  );
}
